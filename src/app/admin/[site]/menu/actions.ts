"use server";

import { db } from "@/db";
import { sites, menuCategories, menuItems } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function getSiteOrThrow(siteSlug: string) {
  const site = await db.query.sites.findFirst({
    where: eq(sites.slug, siteSlug),
  });
  if (!site) throw new Error(`Site "${siteSlug}" neexistuje`);
  return site;
}

export async function createCategory(siteSlug: string, name: string) {
  await requireAdmin();
  const site = await getSiteOrThrow(siteSlug);

  await db.insert(menuCategories).values({ siteId: site.id, name });
  revalidatePath(`/admin/${siteSlug}/menu`);
}

export async function createItem(
  categoryId: string,
  siteSlug: string,
  data: { name: string; priceCents: number; description?: string }
) {
  await requireAdmin();

  await db.insert(menuItems).values({
    categoryId,
    name: data.name,
    priceCents: data.priceCents,
    description: data.description ?? null,
  });
  revalidatePath(`/admin/${siteSlug}/menu`);
}

export async function toggleAvailability(
  itemId: string,
  siteSlug: string,
  isAvailable: boolean
) {
  await requireAdmin();

  await db
    .update(menuItems)
    .set({ isAvailable, updatedAt: new Date() })
    .where(eq(menuItems.id, itemId));
  revalidatePath(`/admin/${siteSlug}/menu`);
}

export async function deleteItem(itemId: string, siteSlug: string) {
  await requireAdmin();

  await db.delete(menuItems).where(eq(menuItems.id, itemId));
  revalidatePath(`/admin/${siteSlug}/menu`);
}
