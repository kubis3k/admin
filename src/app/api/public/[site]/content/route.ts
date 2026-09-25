import { NextResponse } from "next/server";
import { getPublicContentList } from "@/lib/public-data";

// Cache je v src/lib/public-data.ts (unstable_cache + revalidateTag).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ site: string }> }
) {
  const { site: siteSlug } = await params;

  const result = await getPublicContentList(siteSlug);

  if (result.status === "no-site") {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (result.status === "disabled") {
    return NextResponse.json(
      { error: "Content module not enabled for this site" },
      { status: 404 }
    );
  }

  return NextResponse.json(result.data);
}
