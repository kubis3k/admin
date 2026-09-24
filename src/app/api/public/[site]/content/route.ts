import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites, pageContent } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

// Cache na 60s — stejně jako /api/public/[site]/menu, /hours a /events.
export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ site: string }> }
) {
  const { site: siteSlug } = await params;

  const site = await db.query.sites.findFirst({
    where: eq(sites.slug, siteSlug),
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (!site.modules.content) {
    return NextResponse.json(
      { error: "Content module not enabled for this site" },
      { status: 404 }
    );
  }

  const rows = await db.query.pageContent.findMany({
    where: eq(pageContent.siteId, site.id),
    orderBy: [asc(pageContent.pageKey)],
  });

  return NextResponse.json({
    site: site.slug,
    pages: rows.map((p) => ({
      pageKey: p.pageKey,
      updatedAt: p.updatedAt,
    })),
  });
}
