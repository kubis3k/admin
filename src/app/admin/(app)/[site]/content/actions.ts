"use server";

import { db } from "@/db";
import { pageContent } from "@/db/schema";
import { requireSiteAccess, requireModule } from "@/lib/auth";
import { isValidPageKey, validateContent } from "@/lib/content";
import { notifySiteChange } from "@/lib/revalidate";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult, type ActionState } from "@/lib/action-result";

// Owner zakládá/maže stránky, staff edituje obsah (viz F5 v flow-state).

export async function createPage(
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "owner");
  requireModule(site, "content");

  const pageKey = String(formData.get("pageKey") || "");
  if (!isValidPageKey(pageKey)) {
    return fail({ fieldErrors: { pageKey: "Neplatný klíč stránky" } });
  }

  // ON CONFLICT DO NOTHING místo check-then-insert — ani souběžné založení
  // stejného klíče nespadne na unique constraint (500).
  const inserted = await db
    .insert(pageContent)
    .values({ siteId: site.id, pageKey, content: "" })
    .onConflictDoNothing({ target: [pageContent.siteId, pageContent.pageKey] })
    .returning({ id: pageContent.id });
  if (inserted.length === 0) {
    return fail({
      fieldErrors: { pageKey: `Stránka "${pageKey}" už existuje` },
    });
  }
  revalidatePath(`/admin/${siteSlug}/content`);
  await notifySiteChange(site, "content", { pageKey });
  return ok("Stránka založena");
}

export async function deletePage(
  pageId: string,
  siteSlug: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "owner");
  requireModule(site, "content");

  const deleted = await db
    .delete(pageContent)
    .where(and(eq(pageContent.id, pageId), eq(pageContent.siteId, site.id)))
    .returning({ pageKey: pageContent.pageKey });
  revalidatePath(`/admin/${siteSlug}/content`);
  if (deleted[0]) {
    await notifySiteChange(site, "content", { pageKey: deleted[0].pageKey });
  }
  return ok("Smazáno");
}

export async function savePageContent(
  pageId: string,
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "content");

  const result = validateContent(String(formData.get("content") || ""));
  if (!result.ok) return fail({ fieldErrors: { content: result.error } });

  const updated = await db
    .update(pageContent)
    .set({ content: result.value, updatedAt: new Date() })
    .where(and(eq(pageContent.id, pageId), eq(pageContent.siteId, site.id)))
    .returning({ pageKey: pageContent.pageKey });
  revalidatePath(`/admin/${siteSlug}/content`);
  if (updated[0]) {
    await notifySiteChange(site, "content", { pageKey: updated[0].pageKey });
  }
  return ok("Uloženo");
}
