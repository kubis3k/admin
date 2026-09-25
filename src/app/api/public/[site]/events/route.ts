import { NextRequest, NextResponse } from "next/server";
import { TIMEZONE, todayInPrague } from "@/lib/hours";
import { getPublicEvents } from "@/lib/public-data";

// Cache je v src/lib/public-data.ts (unstable_cache + revalidateTag).
// Filtr na "budoucí" eventy (?all=1 vypne) se dělá tady, mimo cache — cache
// obsahuje všechny publikované eventy.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ site: string }> }
) {
  const { site: siteSlug } = await params;

  const result = await getPublicEvents(siteSlug);

  if (result.status === "no-site") {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (result.status === "disabled") {
    return NextResponse.json(
      { error: "Events module not enabled for this site" },
      { status: 404 }
    );
  }

  const showAll = req.nextUrl.searchParams.get("all") === "1";
  const today = todayInPrague();

  const filtered = showAll
    ? result.data.events
    : result.data.events.filter((e) => e.date >= today);

  return NextResponse.json({
    site: result.data.site,
    timezone: TIMEZONE,
    events: filtered,
  });
}
