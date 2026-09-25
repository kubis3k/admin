import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { sites, siteMemberships, users, type SiteRole } from "@/db/schema";

type SiteModules = (typeof sites.$inferSelect)["modules"];

// ---------------------------------------------------------------------------
// Každá nová admin route/action MUSÍ volat requireSiteAccess — nic jiného
// v systému neřeší přístup (žádný middleware, viz Data Access Layer vzor).
// Nastavení webu (site.modules) je zatím vyhrazené pro roli "owner" a
// superadmina (owner moduly zapíná provozovatel/superadmin ručně, viz F6).
// ---------------------------------------------------------------------------
const ROLE_RANK: Record<SiteRole, number> = { staff: 1, owner: 2 };

// cache() dedupuje dotaz v rámci jednoho requestu — na session.user se
// nespoléháme (flag by se v ní musel invalidovat), vždy čteme z DB.
export const isSuperadmin = cache(async (userId: string): Promise<boolean> => {
  const row = await db
    .select({ isSuperadmin: users.isSuperadmin })
    .from(users)
    .where(eq(users.id, userId))
    .then((rows) => rows[0]);
  return row?.isSuperadmin ?? false;
});

export async function requireSuperadmin() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/admin/login?callbackUrl=${encodeURIComponent("/admin/new-site")}`
    );
  }

  if (!(await isSuperadmin(session.user.id))) forbidden();

  return { userId: session.user.id };
}

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

  // Superadmin má přístup na jakýkoli existující web bez membershipu —
  // efektivně jako owner (ale isSuperadmin:true, kdyby volající potřeboval rozlišit).
  if (await isSuperadmin(session.user.id)) {
    const site = await db.query.sites.findFirst({
      where: eq(sites.slug, siteSlug),
    });
    if (!site) forbidden();
    return {
      userId: session.user.id,
      site,
      role: "owner" as const,
      isSuperadmin: true,
    };
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

  return {
    userId: row.userId,
    site: row.site,
    role: row.role,
    isSuperadmin: false,
  };
}

export function hasRole(role: SiteRole, minRole: SiteRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

// ---------------------------------------------------------------------------
// Server actions musí respektovat modulový flag stejně jako stránka/API —
// jinak jde zapisovat podvrženým POSTem do vypnutého modulu (stránka jen
// zobrazí hlášku, ale samotná akce by bez téhle kontroly prošla).
// ---------------------------------------------------------------------------
export function requireModule(
  site: { modules: SiteModules },
  module: keyof SiteModules
): void {
  if (!site.modules[module]) forbidden();
}
