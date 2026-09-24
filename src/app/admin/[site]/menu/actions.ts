"use server";

import { db } from "@/db";
import { menuCategories, menuItems } from "@/db/schema";
import { requireSiteAccess } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";

// IDs kategorií/položek přicházejí z klienta (formData/.bind) — nikdy jim
// nevěřit bez ověření, že patří do site z requireSiteAccess (oprava IDOR).
function categoryIdsOfSite(siteId: string) {
  return db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(eq(menuCategories.siteId, siteId));
}

function assertValidItem(data: { name: string; priceCents: number }) {
  if (!data.name.trim()) throw new Error("Název položky nesmí být prázdný");
  if (!Number.isInteger(data.priceCents) || data.priceCents < 0) {
    throw new Error("Neplatná cena");
  }
}

export async function createCategory(siteSlug: string, name: string) {
  const { site } = await requireSiteAccess(siteSlug, "owner");
  if (!name.trim()) throw new Error("Název kategorie nesmí být prázdný");

  await db.insert(menuCategories).values({ siteId: site.id, name });
  revalidatePath(`/admin/${siteSlug}/menu`);
}

export async function deleteCategory(categoryId: string, siteSlug: string) {
  const { site } = await requireSiteAccess(siteSlug, "owner");

  await db
    .delete(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/menu`);
}

export async function createItem(
  categoryId: string,
  siteSlug: string,
  data: { name: string; priceCents: number; description?: string }
) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  assertValidItem(data);

  const category = await db.query.menuCategories.findFirst({
    where: and(eq(menuCategories.id, categoryId), eq(menuCategories.siteId, site.id)),
  });
  if (!category) forbidden();

  await db.insert(menuItems).values({
    categoryId,
    name: data.name,
    priceCents: data.priceCents,
    description: data.description ?? null,
  });
  revalidatePath(`/admin/${siteSlug}/menu`);
}

export async function updateItem(
  itemId: string,
  siteSlug: string,
  data: { name: string; priceCents: number }
) {
  const { site } = await requireSiteAccess(siteSlug, "staff");

  assertValidItem(data);
  const name = data.name.trim();

  await db
    .update(menuItems)
    .set({ name, priceCents: data.priceCents, updatedAt: new Date() })
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))));
  revalidatePath(`/admin/${siteSlug}/menu`);
}

export async function toggleAvailability(
  itemId: string,
  siteSlug: string,
  isAvailable: boolean
) {
  const { site } = await requireSiteAccess(siteSlug, "staff");

  await db
    .update(menuItems)
    .set({ isAvailable, updatedAt: new Date() })
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))));
  revalidatePath(`/admin/${siteSlug}/menu`);
}

export async function deleteItem(itemId: string, siteSlug: string) {
  const { site } = await requireSiteAccess(siteSlug, "staff");

  await db
    .delete(menuItems)
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))));
  revalidatePath(`/admin/${siteSlug}/menu`);
}
