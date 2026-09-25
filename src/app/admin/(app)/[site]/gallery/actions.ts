"use server";

import { db } from "@/db";
import { galleryImages } from "@/db/schema";
import { requireSiteAccess, requireModule } from "@/lib/auth";
import { uploadImage, deleteImageIfOurs } from "@/lib/blob";
import { validateAlt, validateImageFile } from "@/lib/upload";
import { notifySiteChange } from "@/lib/revalidate";
import { eq, and, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult, type ActionState } from "@/lib/action-result";

// Galerie = staff (jako menu/eventy/obsah).

export async function uploadGalleryImage(
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "gallery");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail({ fieldErrors: { file: "Nebyl vybrán žádný soubor" } });
  }

  // Validace typu/velikosti PŘED voláním uploadImage, aby se dala jistě
  // rozlišit od chyb chybějícího tokenu nebo skutečného selhání put().
  const validation = validateImageFile({ type: file.type, size: file.size });
  if (!validation.ok) {
    return fail({ fieldErrors: { file: validation.error } });
  }

  const alt = validateAlt(String(formData.get("alt") ?? ""));

  let uploaded: { url: string; pathname: string };
  try {
    uploaded = await uploadImage(file, `${site.slug}/gallery`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nahrání se nezdařilo";
    if (message.includes("BLOB_READ_WRITE_TOKEN")) {
      return fail({ error: "Upload obrázků není nakonfigurovaný" });
    }
    console.error("[gallery] upload selhal", err);
    return fail({ error: "Nahrání se nezdařilo, zkuste to znovu" });
  }

  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${galleryImages.sortOrder}), -1)` })
    .from(galleryImages)
    .where(eq(galleryImages.siteId, site.id))
    .then((rows) => rows[0]?.max ?? -1);

  await db.insert(galleryImages).values({
    siteId: site.id,
    url: uploaded.url,
    pathname: uploaded.pathname,
    alt,
    sortOrder: maxRow + 1,
  });
  revalidatePath(`/admin/${siteSlug}/gallery`);
  await notifySiteChange(site, "gallery");

  return ok("Obrázek nahrán");
}

export async function updateAlt(
  imageId: string,
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "gallery");

  const alt = validateAlt(String(formData.get("alt") ?? ""));

  await db
    .update(galleryImages)
    .set({ alt })
    .where(and(eq(galleryImages.id, imageId), eq(galleryImages.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/gallery`);
  await notifySiteChange(site, "gallery");

  return ok("Popisek uložen");
}

export async function moveImage(
  imageId: string,
  siteSlug: string,
  direction: "up" | "down",
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "gallery");

  const images = await db.query.galleryImages.findMany({
    where: eq(galleryImages.siteId, site.id),
    orderBy: asc(galleryImages.sortOrder),
  });

  const index = images.findIndex((img) => img.id === imageId);
  if (index === -1) return fail({ error: "Obrázek nenalezen" });

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= images.length) return ok();

  const current = images[index];
  const neighbor = images[neighborIndex];

  // Atomická výměna sort_order — neon-http nemá interaktivní transakce,
  // db.batch pošle oba UPDATE v jednom requestu.
  await db.batch([
    db
      .update(galleryImages)
      .set({ sortOrder: neighbor.sortOrder })
      .where(and(eq(galleryImages.id, current.id), eq(galleryImages.siteId, site.id))),
    db
      .update(galleryImages)
      .set({ sortOrder: current.sortOrder })
      .where(and(eq(galleryImages.id, neighbor.id), eq(galleryImages.siteId, site.id))),
  ]);
  revalidatePath(`/admin/${siteSlug}/gallery`);
  await notifySiteChange(site, "gallery");

  return ok();
}

export async function deleteGalleryImage(
  imageId: string,
  siteSlug: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "gallery");

  const deleted = await db
    .delete(galleryImages)
    .where(and(eq(galleryImages.id, imageId), eq(galleryImages.siteId, site.id)))
    .returning();

  if (deleted[0]) {
    await deleteImageIfOurs(deleted[0].url);
  }
  revalidatePath(`/admin/${siteSlug}/gallery`);
  await notifySiteChange(site, "gallery");

  return ok("Obrázek smazán");
}
