import { redirect, forbidden } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { sites, siteMemberships, type SiteRole } from "@/db/schema";

// ---------------------------------------------------------------------------
// Každá nová admin route/action MUSÍ volat requireSiteAccess — nic jiného
// v systému neřeší přístup (žádný middleware, viz Data Access Layer vzor).
// Nastavení webu (site.modules) je vyhrazené pro roli "owner".
// ---------------------------------------------------------------------------
const ROLE_RANK: Record<SiteRole, number> = { staff: 1, owner: 2 };

export async function requireSiteAccess(
  siteSlug: string,
  minRole: SiteRole = "staff"
) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/admin/login?callbackUrl=${encodeURIComponent(`/admin/${encodeURIComponent(siteSlug)}/menu`)}`
    );
  }

  const row = await db
    .select({
      site: sites,
      role: siteMemberships.role,
      userId: siteMemberships.userId,
    })
    .from(siteMemberships)
    .innerJoin(sites, eq(siteMemberships.siteId, sites.id))
    .where(
      and(eq(sites.slug, siteSlug), eq(siteMemberships.userId, session.user.id))
    )
    .then((rows) => rows[0]);

  // Neexistující site i chybějící membership vypadají navenek stejně (403),
  // aby nešlo enumerovat existenci webů.
  if (!row) forbidden();

  if (ROLE_RANK[row.role] < ROLE_RANK[minRole]) forbidden();

  return { userId: row.userId, site: row.site, role: row.role };
}

export function hasRole(role: SiteRole, minRole: SiteRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
