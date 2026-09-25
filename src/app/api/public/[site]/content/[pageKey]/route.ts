import { NextResponse } from "next/server";
import { isValidPageKey } from "@/lib/content";
import { getPublicContentPage } from "@/lib/public-data";

// Cache je v src/lib/public-data.ts (unstable_cache + revalidateTag).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ site: string; pageKey: string }> }
) {
  const { site: siteSlug, pageKey } = await params;

  // Neplatný klíč = 404 bez dotazu do DB/cache.
  if (!isValidPageKey(pageKey)) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const result = await getPublicContentPage(siteSlug, pageKey);

  if (result.status === "no-site") {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (result.status === "disabled") {
    return NextResponse.json(
      { error: "Content module not enabled for this site" },
      { status: 404 }
    );
  }

  if (result.data === null) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json(result.data);
}
