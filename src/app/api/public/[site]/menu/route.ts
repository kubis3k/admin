import { NextRequest, NextResponse } from "next/server";
import { getPublicMenu } from "@/lib/public-data";

// Cache je v src/lib/public-data.ts (unstable_cache + revalidateTag).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ site: string }> }
) {
  const { site: siteSlug } = await params;

  const result = await getPublicMenu(siteSlug);

  if (result.status === "no-site") {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (result.status === "disabled") {
    return NextResponse.json(
      { error: "Menu module not enabled for this site" },
      { status: 404 }
    );
  }

  return NextResponse.json(result.data);
}
