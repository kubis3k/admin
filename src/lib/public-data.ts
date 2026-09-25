import { unstable_cache } from "next/cache";
import { db } from "@/db";
import {
  sites,
  menuCategories,
  openingHours,
  openingHourExceptions,
  events,
  pageContent,
  galleryImages,
} from "@/db/schema";
import { eq, asc, and, gte } from "drizzle-orm";
import { revalidateTag as tagFor, type SiteModule } from "@/lib/webhook";
import { normalizeTime, addDays, todayInPrague } from "@/lib/hours";

// ---------------------------------------------------------------------------
// Skutečná serverová cache veřejného API (F7 eskalace) — neon-http dělá
// fetch bez cache, takže `export const revalidate = 60` na route handlerech
// nic necachovalo (route byla ƒ Dynamic). unstable_cache() cachuje výsledek
// na serveru (na 60s, nebo dokud nepřijde revalidateTag z notifySiteChange).
//
// 1 cache záznam na modul (ne zvlášť "site" záznam) — site řádek (jen
// slug+modules, BEZ webhookUrl/webhookSecret) se načítá uvnitř každé
// cachované funkce. Diskriminovaný výsledek ať volající (route) ví, jestli
// jde o 404 site / 404 modul / OK.
// ---------------------------------------------------------------------------

export type PublicDataResult<T> =
  | { status: "no-site" }
  | { status: "disabled" }
  | { status: "ok"; data: T };

async function loadSiteForModule(slug: string, module: SiteModule) {
  const site = await db.query.sites.findFirst({
    where: eq(sites.slug, slug),
    columns: { id: true, slug: true, modules: true },
  });

  if (!site) {
    return { ok: false as const, result: { status: "no-site" as const } };
  }

  if (!site.modules[module]) {
    return { ok: false as const, result: { status: "disabled" as const } };
  }

  return { ok: true as const, site };
}

// ---------------------------------------------------------------------------
// MENU
// ---------------------------------------------------------------------------
export type PublicMenuData = {
  site: string;
  categories: Awaited<ReturnType<typeof loadMenuCategories>>;
};

async function loadMenuCategories(siteId: string) {
  return db.query.menuCategories.findMany({
    where: eq(menuCategories.siteId, siteId),
    orderBy: asc(menuCategories.sortOrder),
    with: {
      items: {
        orderBy: (items, { asc }) => asc(items.sortOrder),
      },
    },
  });
}

export async function getPublicMenu(
  slug: string
): Promise<PublicDataResult<PublicMenuData>> {
  return unstable_cache(
    async (): Promise<PublicDataResult<PublicMenuData>> => {
      const loaded = await loadSiteForModule(slug, "menu");
      if (!loaded.ok) return loaded.result;

      const categories = await loadMenuCategories(loaded.site.id);

      return { status: "ok", data: { site: loaded.site.slug, categories } };
    },
    ["public", slug, "menu"],
    { tags: [tagFor(slug, "menu")], revalidate: 60 }
  )();
}

// ---------------------------------------------------------------------------
// HOURS — cache vrací jen raw data (týdenní rozvrh + výjimky od včerejška,
// ať cache přes půlnoc nevynechá "dnešek"). "Dnes" a computeEffectiveSchedule
// se počítají AŽ v route, mimo cache.
// ---------------------------------------------------------------------------
export type PublicHoursRawData = {
  site: string;
  weekly: { weekday: number; opensAt: string; closesAt: string }[];
  exceptions: {
    date: string;
    isClosed: boolean;
    customOpensAt: string | null;
    customClosesAt: string | null;
    reason: string | null;
  }[];
};

export async function getPublicHoursRaw(
  slug: string
): Promise<PublicDataResult<PublicHoursRawData>> {
  return unstable_cache(
    async (): Promise<PublicDataResult<PublicHoursRawData>> => {
      const loaded = await loadSiteForModule(slug, "hours");
      if (!loaded.ok) return loaded.result;

      const since = addDays(todayInPrague(), -1);

      const weekly = await db.query.openingHours.findMany({
        where: eq(openingHours.siteId, loaded.site.id),
        orderBy: asc(openingHours.weekday),
      });

      const exceptions = await db.query.openingHourExceptions.findMany({
        where: and(
          eq(openingHourExceptions.siteId, loaded.site.id),
          gte(openingHourExceptions.date, since)
        ),
        orderBy: asc(openingHourExceptions.date),
      });

      return {
        status: "ok",
        data: {
          site: loaded.site.slug,
          weekly: weekly.map((w) => ({
            weekday: w.weekday,
            opensAt: normalizeTime(w.opensAt),
            closesAt: normalizeTime(w.closesAt),
          })),
          exceptions: exceptions.map((e) => ({
            date: e.date,
            isClosed: e.isClosed,
            customOpensAt: e.customOpensAt ? normalizeTime(e.customOpensAt) : null,
            customClosesAt: e.customClosesAt
              ? normalizeTime(e.customClosesAt)
              : null,
            reason: e.reason,
          })),
        },
      };
    },
    ["public", slug, "hours"],
    { tags: [tagFor(slug, "hours")], revalidate: 60 }
  )();
}

// ---------------------------------------------------------------------------
// EVENTS — cache vrací VŠECHNY publikované eventy (bez filtru na datum),
// seřazené. Filtr na "budoucí" (?all=1 vypne) se dělá v route, mimo cache.
// ---------------------------------------------------------------------------
export type PublicEventData = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  imageUrl: string | null;
};

export type PublicEventsData = {
  site: string;
  events: PublicEventData[];
};

export async function getPublicEvents(
  slug: string
): Promise<PublicDataResult<PublicEventsData>> {
  return unstable_cache(
    async (): Promise<PublicDataResult<PublicEventsData>> => {
      const loaded = await loadSiteForModule(slug, "events");
      if (!loaded.ok) return loaded.result;

      const rows = await db.query.events.findMany({
        where: and(
          eq(events.siteId, loaded.site.id),
          eq(events.isPublished, true)
        ),
        orderBy: (e, { asc, sql }) => [
          asc(e.date),
          sql`${e.startTime} asc nulls first`,
        ],
      });

      return {
        status: "ok",
        data: {
          site: loaded.site.slug,
          events: rows.map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            date: e.date,
            startTime: e.startTime ? normalizeTime(e.startTime) : null,
            imageUrl: e.imageUrl,
          })),
        },
      };
    },
    ["public", slug, "events"],
    { tags: [tagFor(slug, "events")], revalidate: 60 }
  )();
}

// ---------------------------------------------------------------------------
// CONTENT — seznam stránek
// ---------------------------------------------------------------------------
export type PublicContentListData = {
  site: string;
  pages: { pageKey: string; updatedAt: Date }[];
};

export async function getPublicContentList(
  slug: string
): Promise<PublicDataResult<PublicContentListData>> {
  return unstable_cache(
    async (): Promise<PublicDataResult<PublicContentListData>> => {
      const loaded = await loadSiteForModule(slug, "content");
      if (!loaded.ok) return loaded.result;

      const rows = await db.query.pageContent.findMany({
        where: eq(pageContent.siteId, loaded.site.id),
        orderBy: [asc(pageContent.pageKey)],
      });

      return {
        status: "ok",
        data: {
          site: loaded.site.slug,
          pages: rows.map((p) => ({
            pageKey: p.pageKey,
            updatedAt: p.updatedAt,
          })),
        },
      };
    },
    ["public", slug, "content"],
    { tags: [tagFor(slug, "content")], revalidate: 60 }
  )();
}

// ---------------------------------------------------------------------------
// CONTENT — jedna stránka (klíč cache obsahuje pageKey). Neplatný formát
// pageKey řeší route bez volání této funkce.
// ---------------------------------------------------------------------------
export type PublicContentPageData = {
  site: string;
  pageKey: string;
  content: string;
  updatedAt: Date;
} | null; // null = stránka s tímto pageKey neexistuje

export async function getPublicContentPage(
  slug: string,
  pageKey: string
): Promise<PublicDataResult<PublicContentPageData>> {
  return unstable_cache(
    async (): Promise<PublicDataResult<PublicContentPageData>> => {
      const loaded = await loadSiteForModule(slug, "content");
      if (!loaded.ok) return loaded.result;

      const page = await db.query.pageContent.findFirst({
        where: and(
          eq(pageContent.siteId, loaded.site.id),
          eq(pageContent.pageKey, pageKey)
        ),
      });

      if (!page) {
        return { status: "ok", data: null };
      }

      return {
        status: "ok",
        data: {
          site: loaded.site.slug,
          pageKey: page.pageKey,
          content: page.content,
          updatedAt: page.updatedAt,
        },
      };
    },
    ["public", slug, "content", pageKey],
    { tags: [tagFor(slug, "content")], revalidate: 60 }
  )();
}

// ---------------------------------------------------------------------------
// GALLERY
// ---------------------------------------------------------------------------
export type PublicGalleryData = {
  site: string;
  images: { id: string; url: string; alt: string }[];
};

export async function getPublicGallery(
  slug: string
): Promise<PublicDataResult<PublicGalleryData>> {
  return unstable_cache(
    async (): Promise<PublicDataResult<PublicGalleryData>> => {
      const loaded = await loadSiteForModule(slug, "gallery");
      if (!loaded.ok) return loaded.result;

      const rows = await db.query.galleryImages.findMany({
        where: and(eq(galleryImages.siteId, loaded.site.id)),
        orderBy: [asc(galleryImages.sortOrder), asc(galleryImages.createdAt)],
      });

      return {
        status: "ok",
        data: {
          site: loaded.site.slug,
          images: rows.map((img) => ({
            id: img.id,
            url: img.url,
            alt: img.alt,
          })),
        },
      };
    },
    ["public", slug, "gallery"],
    { tags: [tagFor(slug, "gallery")], revalidate: 60 }
  )();
}
