import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites, galleryImages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

// Cache na 60s — stejně jako ostatní veřejná API.
export const revalidate = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ site: string }> }
) {
  const { site: siteSlug } = await params;

  const site = await db.query.sites.findFirst({
    where: eq(sites.slug, siteSlug),
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (!site.modules.gallery) {
    return NextResponse.json(
      { error: "Gallery module not enabled for this site" },
      { status: 404 }
    );
  }

  const rows = await db.query.galleryImages.findMany({
    where: and(eq(galleryImages.siteId, site.id)),
    orderBy: [asc(galleryImages.sortOrder), asc(galleryImages.createdAt)],
  });

  return NextResponse.json({
    site: site.slug,
    images: rows.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
    })),
  });
}
