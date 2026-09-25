import Image from "next/image";
import { db } from "@/db";
import { galleryImages } from "@/db/schema";
import { requireSiteAccess } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { uploadGalleryImage, updateAlt, moveImage, deleteGalleryImage } from "./actions";

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
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Galerie — {site.name}</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>Nahrát obrázek</h2>
        <form action={uploadGalleryImage.bind(null, siteSlug)}>
          <div>
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              required
            />
          </div>
          <div>
            <input name="alt" placeholder="Popisek (alt text)" maxLength={300} />
          </div>
          <div>
            <button type="submit">Nahrát</button>
          </div>
        </form>
        <p>
          <small>Max 4 MB, formáty JPEG/PNG/WebP/AVIF/GIF.</small>
        </p>
      </section>

      <section>
        <h2>Obrázky</h2>
        {images.length === 0 ? (
          <p>Zatím žádné obrázky.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {images.map((image, index) => (
              <div key={image.id} style={{ border: "1px solid #ccc", padding: 8 }}>
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={200}
                  height={150}
                  style={{ objectFit: "cover", width: "100%", height: 150 }}
                  sizes="200px"
                />
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await updateAlt(image.id, siteSlug, String(formData.get("alt") ?? ""));
                  }}
                >
                  <input name="alt" defaultValue={image.alt} maxLength={300} style={{ width: "100%" }} />
                  <button type="submit">Uložit popisek</button>
                </form>
                <div style={{ marginTop: 4 }}>
                  <form action={moveImage.bind(null, image.id, siteSlug, "up")} style={{ display: "inline" }}>
                    <button type="submit" disabled={index === 0}>
                      ↑
                    </button>
                  </form>
                  <form action={moveImage.bind(null, image.id, siteSlug, "down")} style={{ display: "inline" }}>
                    <button type="submit" disabled={index === images.length - 1}>
                      ↓
                    </button>
                  </form>
                  <form action={deleteGalleryImage.bind(null, image.id, siteSlug)} style={{ display: "inline" }}>
                    <button type="submit">Smazat</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
