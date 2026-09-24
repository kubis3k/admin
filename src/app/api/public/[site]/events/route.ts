import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites, events } from "@/db/schema";
import { eq, and, asc, gte, sql } from "drizzle-orm";
import { TIMEZONE, normalizeTime, todayInPrague } from "@/lib/hours";

// Cache na 60s — stejně jako /api/public/[site]/menu a /hours.
export const revalidate = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ site: string }> }
) {
  const { site: siteSlug } = await params;

  const site = await db.query.sites.findFirst({
    where: eq(sites.slug, siteSlug),
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (!site.modules.events) {
    return NextResponse.json(
      { error: "Events module not enabled for this site" },
      { status: 404 }
    );
  }

  const showAll = req.nextUrl.searchParams.get("all") === "1";
  const today = todayInPrague();

  const rows = await db.query.events.findMany({
    where: showAll
      ? and(eq(events.siteId, site.id), eq(events.isPublished, true))
      : and(
          eq(events.siteId, site.id),
          eq(events.isPublished, true),
          gte(events.date, today)
        ),
    orderBy: [asc(events.date), sql`${events.startTime} asc nulls first`],
  });

  const result = rows.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date,
    startTime: e.startTime ? normalizeTime(e.startTime) : null,
    imageUrl: e.imageUrl,
  }));

  return NextResponse.json({
    site: site.slug,
    timezone: TIMEZONE,
    events: result,
  });
}
