import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites, menuCategories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

// Cache na 60s — klientský web nemusí bušit do DB na každý request.
// Až bude hotový admin, přidáme on-demand revalidateTag() při uložení
// změny místo čekání na vypršení cache.
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

  if (!site.modules.menu) {
    return NextResponse.json(
      { error: "Menu module not enabled for this site" },
      { status: 404 }
    );
  }

  const categories = await db.query.menuCategories.findMany({
    where: eq(menuCategories.siteId, site.id),
    orderBy: asc(menuCategories.sortOrder),
    with: {
      items: {
        orderBy: (items, { asc }) => asc(items.sortOrder),
      },
    },
  });

  return NextResponse.json({ site: site.slug, categories });
}
