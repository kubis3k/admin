import { NextRequest, NextResponse } from "next/server";
import { TIMEZONE, computeEffectiveSchedule, todayInPrague } from "@/lib/hours";
import { getPublicHoursRaw } from "@/lib/public-data";

// Cache je v src/lib/public-data.ts (unstable_cache + revalidateTag).
// "Dnes" a computeEffectiveSchedule se počítají tady, mimo cache.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ site: string }> }
) {
  const { site: siteSlug } = await params;

  const result = await getPublicHoursRaw(siteSlug);

  if (result.status === "no-site") {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (result.status === "disabled") {
    return NextResponse.json(
      { error: "Hours module not enabled for this site" },
      { status: 404 }
    );
  }

  const today = todayInPrague();

  const days = computeEffectiveSchedule(
    result.data.weekly,
    result.data.exceptions,
    today,
    14
  );

  return NextResponse.json({
    site: result.data.site,
    timezone: TIMEZONE,
    today: days[0]?.date ?? today,
    days,
    weekly: result.data.weekly,
  });
}
