"use server";

import { db } from "@/db";
import { pageContent } from "@/db/schema";
import { requireSiteAccess, requireModule } from "@/lib/auth";
import { isValidPageKey, validateContent } from "@/lib/content";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Owner zakládá/maže stránky, staff edituje obsah (viz F5 v flow-state).

export async function createPage(siteSlug: string, pageKey: string) {
  const { site } = await requireSiteAccess(siteSlug, "owner");
  requireModule(site, "content");

  if (!isValidPageKey(pageKey)) {
    throw new Error("Neplatný klíč stránky");
  }

  // ON CONFLICT DO NOTHING místo check-then-insert — ani souběžné založení
  // stejného klíče nespadne na unique constraint (500).
  const inserted = await db
    .insert(pageContent)
    .values({ siteId: site.id, pageKey, content: "" })
    .onConflictDoNothing({ target: [pageContent.siteId, pageContent.pageKey] })
    .returning({ id: pageContent.id });
  if (inserted.length === 0) {
    throw new Error(`Stránka "${pageKey}" už existuje`);
  }
  revalidatePath(`/admin/${siteSlug}/content`);
}

export async function deletePage(pageId: string, siteSlug: string) {
  const { site } = await requireSiteAccess(siteSlug, "owner");
  requireModule(site, "content");

  await db
    .delete(pageContent)
    .where(and(eq(pageContent.id, pageId), eq(pageContent.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/content`);
}

export async function savePageContent(
  pageId: string,
  siteSlug: string,
  content: string
) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "content");

  const result = validateContent(content);
  if (!result.ok) throw new Error(result.error);

  await db
    .update(pageContent)
    .set({ content: result.value, updatedAt: new Date() })
    .where(and(eq(pageContent.id, pageId), eq(pageContent.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/content`);
}
