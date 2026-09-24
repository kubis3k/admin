import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites, pageContent } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidPageKey } from "@/lib/content";

// Cache na 60s — stejně jako /api/public/[site]/menu, /hours a /events.
export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ site: string; pageKey: string }> }
) {
  const { site: siteSlug, pageKey } = await params;

  // Neplatný klíč = 404 bez dotazu do DB.
  if (!isValidPageKey(pageKey)) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

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

  const page = await db.query.pageContent.findFirst({
    where: and(
      eq(pageContent.siteId, site.id),
      eq(pageContent.pageKey, pageKey)
    ),
  });

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({
    site: site.slug,
    pageKey: page.pageKey,
    content: page.content,
    updatedAt: page.updatedAt,
  });
}
