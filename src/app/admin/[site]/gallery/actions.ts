"use server";

import { db } from "@/db";
import { galleryImages } from "@/db/schema";
import { requireSiteAccess, requireModule } from "@/lib/auth";
import { uploadImage, deleteImageIfOurs } from "@/lib/blob";
import { validateAlt } from "@/lib/upload";
import { notifySiteChange } from "@/lib/revalidate";
import { eq, and, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Galerie = staff (jako menu/eventy/obsah).

export async function uploadGalleryImage(siteSlug: string, formData: FormData) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "gallery");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Nebyl vybrán žádný soubor");
  }
  const alt = validateAlt(String(formData.get("alt") ?? ""));

  const { url, pathname } = await uploadImage(file, `${site.slug}/gallery`);

  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${galleryImages.sortOrder}), -1)` })
    .from(galleryImages)
    .where(eq(galleryImages.siteId, site.id))
    .then((rows) => rows[0]?.max ?? -1);

  await db.insert(galleryImages).values({
    siteId: site.id,
    url,
    pathname,
    alt,
    sortOrder: maxRow + 1,
  });
  revalidatePath(`/admin/${siteSlug}/gallery`);
  await notifySiteChange(site, "gallery");
}

export async function updateAlt(imageId: string, siteSlug: string, alt: string) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "gallery");

  await db
    .update(galleryImages)
    .set({ alt: validateAlt(alt) })
    .where(and(eq(galleryImages.id, imageId), eq(galleryImages.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/gallery`);
  await notifySiteChange(site, "gallery");
}

export async function moveImage(
  imageId: string,
  siteSlug: string,
  direction: "up" | "down"
) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "gallery");

  const images = await db.query.galleryImages.findMany({
    where: eq(galleryImages.siteId, site.id),
    orderBy: asc(galleryImages.sortOrder),
  });

  const index = images.findIndex((img) => img.id === imageId);
  if (index === -1) return;

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= images.length) return;

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
}

export async function deleteGalleryImage(imageId: string, siteSlug: string) {
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
}
