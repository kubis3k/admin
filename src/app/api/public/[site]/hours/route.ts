import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites, openingHours, openingHourExceptions } from "@/db/schema";
import { eq, asc, gte } from "drizzle-orm";
import {
  TIMEZONE,
  computeEffectiveSchedule,
  normalizeTime,
  todayInPrague,
} from "@/lib/hours";

// Cache na 60s — stejně jako /api/public/[site]/menu.
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

  if (!site.modules.hours) {
    return NextResponse.json(
      { error: "Hours module not enabled for this site" },
      { status: 404 }
    );
  }

  const today = todayInPrague();

  const weekly = await db.query.openingHours.findMany({
    where: eq(openingHours.siteId, site.id),
    orderBy: asc(openingHours.weekday),
  });

  const exceptions = await db.query.openingHourExceptions.findMany({
    where: (e, { and }) => and(eq(e.siteId, site.id), gte(e.date, today)),
    orderBy: asc(openingHourExceptions.date),
  });

  const weeklyNormalized = weekly.map((w) => ({
    weekday: w.weekday,
    opensAt: normalizeTime(w.opensAt),
    closesAt: normalizeTime(w.closesAt),
  }));

  const exceptionsNormalized = exceptions.map((e) => ({
    date: e.date,
    isClosed: e.isClosed,
    customOpensAt: e.customOpensAt ? normalizeTime(e.customOpensAt) : null,
    customClosesAt: e.customClosesAt ? normalizeTime(e.customClosesAt) : null,
    reason: e.reason,
  }));

  const days = computeEffectiveSchedule(
    weeklyNormalized,
    exceptionsNormalized,
    today,
    14
  );

  return NextResponse.json({
    site: site.slug,
    timezone: TIMEZONE,
    today: days[0]?.date ?? today,
    days,
    weekly: weeklyNormalized,
  });
}
