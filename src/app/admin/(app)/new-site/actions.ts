"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db";
import { sites, users, siteMemberships } from "@/db/schema";
import { requireSuperadmin } from "@/lib/auth";
import { signIn } from "@/auth";
import {
  validateSiteName,
  validateSlug,
  normalizeEmail,
  parseModules,
  MODULE_KEYS,
} from "@/lib/sites";
import { revalidateTag as siteModuleTag } from "@/lib/webhook";
import { ok, fail, type ActionResult, type ActionState } from "@/lib/action-result";

export type CreateSiteData = {
  slug: string;
  mailSent: boolean;
  firstModule?: string;
};

// Vrátí postgres error code z různých tvarů, jak ho může vrátit
// @neondatabase/serverless přes drizzle (přímo nebo zabalený v .cause).
function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const direct = (err as { code?: unknown }).code;
  if (typeof direct === "string") return direct;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null) {
    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === "string") return causeCode;
  }
  return undefined;
}

function pgErrorConstraint(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const direct = (err as { constraint?: unknown }).constraint;
  if (typeof direct === "string") return direct;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null) {
    const causeConstraint = (cause as { constraint?: unknown }).constraint;
    if (typeof causeConstraint === "string") return causeConstraint;
  }
  return undefined;
}

// Superadmin zakládá nový web + prvního ownera (bez self-registrace,
// viz F6 v flow-state) — jediné místo, kde vzniká nový řádek v `users`.
export async function createSite(
  _prev: ActionState<CreateSiteData>,
  formData: FormData
): Promise<ActionResult<CreateSiteData>> {
  await requireSuperadmin();

  const nameResult = validateSiteName(String(formData.get("name") ?? ""));
  if (!nameResult.ok) return fail({ fieldErrors: { name: nameResult.error } });

  const slugResult = validateSlug(String(formData.get("slug") ?? ""));
  if (!slugResult.ok) return fail({ fieldErrors: { slug: slugResult.error } });

  const emailResult = normalizeEmail(String(formData.get("email") ?? ""));
  if (!emailResult.ok) return fail({ fieldErrors: { email: emailResult.error } });

  const modules = parseModules(formData);

  const name = nameResult.value;
  const slug = slugResult.value;
  const email = emailResult.value;

  const existingSite = await db.query.sites.findFirst({
    where: eq(sites.slug, slug),
  });
  if (existingSite) {
    return fail({ fieldErrors: { slug: "Web s tímto slugem už existuje" } });
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  const siteId = randomUUID();
  const userId = existingUser?.id ?? randomUUID();

  try {
    if (existingUser) {
      await db.batch([
        db.insert(sites).values({ id: siteId, slug, name, modules }),
        db.insert(siteMemberships).values({ userId, siteId, role: "owner" }),
      ]);
    } else {
      await db.batch([
        db.insert(sites).values({ id: siteId, slug, name, modules }),
        db.insert(users).values({ id: userId, email }),
        db.insert(siteMemberships).values({ userId, siteId, role: "owner" }),
      ]);
    }
  } catch (err) {
    const code = pgErrorCode(err);
    if (code === "23505") {
      const constraint = pgErrorConstraint(err);
      if (constraint === "sites_slug_unique" || constraint === undefined) {
        return fail({ fieldErrors: { slug: "Web s tímto slugem už existuje" } });
      }
      return fail({ error: "Konflikt při ukládání, zkuste znovu" });
    }
    throw err;
  }

  let mailSent = false;
  try {
    const url = await signIn("nodemailer", {
      email,
      redirect: false,
      redirectTo: "/admin",
    });
    mailSent = !String(url).includes("error=");
  } catch {
    mailSent = false;
  }

  revalidatePath("/admin");
  // Veřejné API mohlo mít pro tento slug nacachované „site neexistuje" (60 s).
  for (const key of MODULE_KEYS) revalidateTag(siteModuleTag(slug, key));

  const firstModule = (Object.keys(modules) as (keyof typeof modules)[]).find(
    (key) => modules[key]
  );

  return ok("Web vytvořen", { slug, mailSent, firstModule });
}
