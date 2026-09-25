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

// Nastavení webu je vyhrazené superadminovi (owner 403) — viz F6/F7 v
// flow-state a src/lib/auth.ts (requireSiteAccess vrací isSuperadmin).

export type UpdateSiteSettingsState = { error?: string; ok?: true };
export type UpdateWebhookUrlState = {
  error?: string;
  ok?: true;
  newSecret?: string;
};
export type RotateWebhookSecretState = {
  error?: string;
  ok?: true;
  newSecret?: string;
};
export type SendTestWebhookState = {
  error?: string;
  ok?: true;
  status?: number;
};

export async function updateSiteSettings(
  _prev: UpdateSiteSettingsState,
  formData: FormData
): Promise<UpdateSiteSettingsState> {
  const siteSlug = String(formData.get("siteSlug") ?? "");
  const { site, isSuperadmin } = await requireSiteAccess(siteSlug);
  if (!isSuperadmin) forbidden();

  const nameResult = validateSiteName(String(formData.get("name") ?? ""));
  if (!nameResult.ok) return { error: nameResult.error };

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

  return { ok: true };
}

export async function updateWebhookUrl(
  _prev: UpdateWebhookUrlState,
  formData: FormData
): Promise<UpdateWebhookUrlState> {
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
    return { ok: true };
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (!isValidWebhookUrl(rawUrl, isProduction)) {
    return { error: "Neplatná webhook URL (v produkci musí být https)" };
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

  return { ok: true, newSecret };
}

export async function rotateWebhookSecret(
  _prev: RotateWebhookSecretState,
  formData: FormData
): Promise<RotateWebhookSecretState> {
  const siteSlug = String(formData.get("siteSlug") ?? "");
  const { site, isSuperadmin } = await requireSiteAccess(siteSlug);
  if (!isSuperadmin) forbidden();

  if (!site.webhookUrl) {
    return { error: "Nejdřív nastavte webhook URL" };
  }

  const newSecret = randomBytes(32).toString("hex");

  await db
    .update(sites)
    .set({ webhookSecret: newSecret })
    .where(eq(sites.id, site.id));

  revalidatePath(`/admin/${siteSlug}/settings`);

  return { ok: true, newSecret };
}

export async function sendTestWebhook(
  _prev: SendTestWebhookState,
  formData: FormData
): Promise<SendTestWebhookState> {
  const siteSlug = String(formData.get("siteSlug") ?? "");
  const { site, isSuperadmin } = await requireSiteAccess(siteSlug);
  if (!isSuperadmin) forbidden();

  if (!site.webhookUrl || !site.webhookSecret) {
    return { error: "Webhook není nastavený" };
  }

  const result = await deliverWebhook(site, {
    site: site.slug,
    module: "test",
    tags: [],
    pageKey: null,
    ts: Math.floor(Date.now() / 1000),
    test: true,
  });

  if (!result.ok) return { error: result.error ?? "Odeslání selhalo" };
  return { ok: true, status: result.status };
}
