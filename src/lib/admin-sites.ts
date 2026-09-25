import { cache } from "react";
import { eq, asc, and } from "drizzle-orm";
import { db } from "@/db";
import { sites, siteMemberships, type SiteRole } from "@/db/schema";
import { isSuperadmin } from "@/lib/auth";

export type UserSite = {
  slug: string;
  name: string;
  role: SiteRole | "superadmin";
  modules: (typeof sites.$inferSelect)["modules"];
};

export type UserSites = {
  superadmin: boolean;
  sites: UserSite[];
};

// Weby dostupné přihlášenému uživateli — superadmin vidí všechny (viz F6),
// ostatní jen weby, kde mají membership. Sdíleno mezi rozcestníkem a sidebarem.
export const getUserSites = cache(
  async (userId: string): Promise<UserSites> => {
    const superadmin = await isSuperadmin(userId);

    const userSites: UserSite[] = superadmin
      ? await db
          .select({
            slug: sites.slug,
            name: sites.name,
            role: siteMemberships.role,
            modules: sites.modules,
          })
          .from(sites)
          .leftJoin(
            siteMemberships,
            and(
              eq(siteMemberships.siteId, sites.id),
              eq(siteMemberships.userId, userId)
            )
          )
          .orderBy(asc(sites.name))
          .then((rows) =>
            rows.map((r) => ({ ...r, role: r.role ?? "superadmin" }))
          )
      : await db
          .select({
            slug: sites.slug,
            name: sites.name,
            role: siteMemberships.role,
            modules: sites.modules,
          })
          .from(siteMemberships)
          .innerJoin(sites, eq(siteMemberships.siteId, sites.id))
          .where(eq(siteMemberships.userId, userId))
          .orderBy(asc(sites.name));

    return { superadmin, sites: userSites };
  }
);
