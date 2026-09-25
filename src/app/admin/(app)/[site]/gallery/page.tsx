import { db } from "@/db";
import { galleryImages } from "@/db/schema";
import { requireSiteAccess } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { PageHeader } from "@/components/admin/page-header";
import { UploadImageCard, GalleryImageCard } from "./gallery-client";

export default async function GalleryAdminPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug, "staff");

  if (!site.modules.gallery) {
    return <p>Galerie je pro tento web vypnutá.</p>;
  }

  const images = await db.query.galleryImages.findMany({
    where: eq(galleryImages.siteId, site.id),
    orderBy: asc(galleryImages.sortOrder),
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Galerie — ${site.name}`}
        description="Obrázky pro veřejnou prezentaci webu."
      />

      <div className="max-w-md">
        <UploadImageCard siteSlug={siteSlug} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium">Obrázky</h2>
        {images.length === 0 ? (
          <p className="text-muted-foreground">Zatím žádné obrázky.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image, index) => (
              <GalleryImageCard
                key={image.id}
                image={{ id: image.id, url: image.url, alt: image.alt }}
                siteSlug={siteSlug}
                index={index}
                total={images.length}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
