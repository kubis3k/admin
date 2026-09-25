"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireSiteAccess } from "@/lib/auth";
import { forbidden } from "next/navigation";
import { validateSiteName, parseModules, MODULE_KEYS } from "@/lib/sites";
import { isValidWebhookUrl, revalidateTag as siteModuleTag } from "@/lib/webhook";
import { notifySiteChange, deliverWebhook } from "@/lib/revalidate";
import { ok, fail, type ActionResult, type ActionState } from "@/lib/action-result";

// Nastavení webu je vyhrazené superadminovi (owner 403) — viz F6/F7 v
// flow-state a src/lib/auth.ts (requireSiteAccess vrací isSuperadmin).

export async function updateSiteSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const siteSlug = String(formData.get("siteSlug") ?? "");
  const { site, isSuperadmin } = await requireSiteAccess(siteSlug);
  if (!isSuperadmin) forbidden();

  const nameResult = validateSiteName(String(formData.get("name") ?? ""));
  if (!nameResult.ok) return fail({ fieldErrors: { name: nameResult.error } });

  const modules = parseModules(formData);
  const name = nameResult.value;

  const changedModules = MODULE_KEYS.filter(
    (key) => site.modules[key] !== modules[key]
  );

  const [updated] = await db
    .update(sites)
    .set({ name, modules })
    .where(eq(sites.id, site.id))
    .returning();

  for (const key of MODULE_KEYS) {
    revalidateTag(siteModuleTag(site.slug, key));
  }
  for (const key of changedModules) {
    await notifySiteChange(updated, key);
  }

  revalidatePath(`/admin/${siteSlug}/settings`);
  revalidatePath("/admin");

  return ok("Uloženo");
}

export async function updateWebhookUrl(
  _prev: ActionState<{ secret?: string }>,
  formData: FormData
): Promise<ActionResult<{ secret?: string }>> {
  const siteSlug = String(formData.get("siteSlug") ?? "");
  const { site, isSuperadmin } = await requireSiteAccess(siteSlug);
  if (!isSuperadmin) forbidden();

  const rawUrl = String(formData.get("webhookUrl") ?? "").trim();

  if (rawUrl.length === 0) {
    await db
      .update(sites)
      .set({ webhookUrl: null, webhookSecret: null })
      .where(eq(sites.id, site.id));
    revalidatePath(`/admin/${siteSlug}/settings`);
    return ok("Webhook vypnut", {});
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (!isValidWebhookUrl(rawUrl, isProduction)) {
    return fail({ fieldErrors: { webhookUrl: "Neplatná webhook URL (v produkci musí být https)" } });
  }

  let newSecret: string | undefined;
  if (!site.webhookSecret) {
    newSecret = randomBytes(32).toString("hex");
  }

  await db
    .update(sites)
    .set({
      webhookUrl: rawUrl,
      ...(newSecret ? { webhookSecret: newSecret } : {}),
    })
    .where(eq(sites.id, site.id));

  revalidatePath(`/admin/${siteSlug}/settings`);

  return ok("Uloženo", { secret: newSecret });
}

export async function rotateWebhookSecret(
  _prev: ActionState<{ secret: string }>,
  formData: FormData
): Promise<ActionResult<{ secret: string }>> {
  const siteSlug = String(formData.get("siteSlug") ?? "");
  const { site, isSuperadmin } = await requireSiteAccess(siteSlug);
  if (!isSuperadmin) forbidden();

  if (!site.webhookUrl) {
    return fail({ error: "Nejdřív nastavte webhook URL" });
  }

  const newSecret = randomBytes(32).toString("hex");

  await db
    .update(sites)
    .set({ webhookSecret: newSecret })
    .where(eq(sites.id, site.id));

  revalidatePath(`/admin/${siteSlug}/settings`);

  return ok("Nový secret vygenerován", { secret: newSecret });
}

export async function sendTestWebhook(
  _prev: ActionState<{ status: number }>,
  formData: FormData
): Promise<ActionResult<{ status: number }>> {
  const siteSlug = String(formData.get("siteSlug") ?? "");
  const { site, isSuperadmin } = await requireSiteAccess(siteSlug);
  if (!isSuperadmin) forbidden();

  if (!site.webhookUrl || !site.webhookSecret) {
    return fail({ error: "Webhook není nastavený" });
  }

  const result = await deliverWebhook(site, {
    site: site.slug,
    module: "test",
    tags: [],
    pageKey: null,
    ts: Math.floor(Date.now() / 1000),
    test: true,
  });

  if (!result.ok) return fail({ error: result.error ?? "Odeslání selhalo" });
  const status = result.status ?? 0;
  return ok(`OK — odpověď HTTP ${status}`, { status });
}
