"use server";

import { db } from "@/db";
import { menuCategories, menuItems } from "@/db/schema";
import { requireSiteAccess, requireModule } from "@/lib/auth";
import { uploadImage, deleteImageIfOurs } from "@/lib/blob";
import { notifySiteChange } from "@/lib/revalidate";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { ok, fail, type ActionResult, type ActionState } from "@/lib/action-result";

// IDs kategorií/položek přicházejí z klienta (formData/.bind) — nikdy jim
// nevěřit bez ověření, že patří do site z requireSiteAccess (oprava IDOR).
function categoryIdsOfSite(siteId: string) {
  return db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(eq(menuCategories.siteId, siteId));
}

function validateItem(data: {
  name: string;
  priceCents: number;
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (!data.name.trim()) fieldErrors.name = "Název položky nesmí být prázdný";
  if (!Number.isInteger(data.priceCents) || data.priceCents < 0) {
    fieldErrors.price = "Neplatná cena";
  }
  return fieldErrors;
}

export async function createCategory(
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "owner");
  requireModule(site, "menu");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail({ fieldErrors: { name: "Název kategorie nesmí být prázdný" } });

  await db.insert(menuCategories).values({ siteId: site.id, name });
  revalidatePath(`/admin/${siteSlug}/menu`);
  await notifySiteChange(site, "menu");
  return ok("Kategorie vytvořena");
}

export async function deleteCategory(
  categoryId: string,
  siteSlug: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "owner");
  requireModule(site, "menu");

  await db
    .delete(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/menu`);
  await notifySiteChange(site, "menu");
  return ok("Kategorie smazána");
}

export async function createItem(
  categoryId: string,
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "menu");

  const data = {
    name: String(formData.get("name") ?? ""),
    priceCents: Math.round(Number(formData.get("price")) * 100),
    description: String(formData.get("description") ?? "") || undefined,
  };
  const fieldErrors = validateItem(data);
  if (Object.keys(fieldErrors).length > 0) return fail({ fieldErrors });

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
  await notifySiteChange(site, "menu");
  return ok("Položka přidána");
}

export async function updateItem(
  itemId: string,
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "menu");

  const data = {
    name: String(formData.get("name") ?? ""),
    priceCents: Math.round(Number(formData.get("price")) * 100),
  };
  const fieldErrors = validateItem(data);
  if (Object.keys(fieldErrors).length > 0) return fail({ fieldErrors });
  const name = data.name.trim();

  await db
    .update(menuItems)
    .set({ name, priceCents: data.priceCents, updatedAt: new Date() })
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))));
  revalidatePath(`/admin/${siteSlug}/menu`);
  await notifySiteChange(site, "menu");
  return ok("Uloženo");
}

export async function toggleAvailability(
  itemId: string,
  siteSlug: string,
  isAvailable: boolean,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "menu");

  await db
    .update(menuItems)
    .set({ isAvailable, updatedAt: new Date() })
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))));
  revalidatePath(`/admin/${siteSlug}/menu`);
  await notifySiteChange(site, "menu");
  return ok(isAvailable ? "Položka zapnuta" : "Položka vypnuta");
}

export async function deleteItem(
  itemId: string,
  siteSlug: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "menu");

  await db
    .delete(menuItems)
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))));
  revalidatePath(`/admin/${siteSlug}/menu`);
  await notifySiteChange(site, "menu");
  return ok("Položka smazána");
}

export async function setItemImage(
  itemId: string,
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "menu");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail({ error: "Nebyl vybrán žádný soubor" });
  }

  const item = await db.query.menuItems.findFirst({
    where: and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))),
  });
  if (!item) forbidden();

  const { url } = await uploadImage(file, `${site.slug}/menu`);
  const oldImageUrl = item.imageUrl;

  await db
    .update(menuItems)
    .set({ imageUrl: url, updatedAt: new Date() })
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))));

  await deleteImageIfOurs(oldImageUrl);
  revalidatePath(`/admin/${siteSlug}/menu`);
  await notifySiteChange(site, "menu");
  return ok("Obrázek nahrán");
}

export async function removeItemImage(
  itemId: string,
  siteSlug: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "menu");

  const item = await db.query.menuItems.findFirst({
    where: and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))),
  });
  if (!item) forbidden();

  await db
    .update(menuItems)
    .set({ imageUrl: null, updatedAt: new Date() })
    .where(and(eq(menuItems.id, itemId), inArray(menuItems.categoryId, categoryIdsOfSite(site.id))));

  await deleteImageIfOurs(item.imageUrl);
  revalidatePath(`/admin/${siteSlug}/menu`);
  await notifySiteChange(site, "menu");
  return ok("Obrázek odebrán");
}
