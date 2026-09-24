import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  time,
  date,
  primaryKey,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// SITES — jeden řádek = jeden klientský web (tenant).
// `modules` říká, které moduly jsou pro daný web zapnuté.
// Příklad: { menu: true, hours: false, events: false, gallery: false, content: false }
// U ADMI/Strikeland by menu bylo `false`, protože drží ChoiceQR.
// ---------------------------------------------------------------------------
export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // např. "admi", "strikeland"
  name: text("name").notNull(),
  modules: jsonb("modules")
    .$type<{
      menu: boolean;
      hours: boolean;
      events: boolean;
      gallery: boolean;
      content: boolean;
    }>()
    .notNull()
    .default({
      menu: false,
      hours: false,
      events: false,
      gallery: false,
      content: false,
    }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// MENU KATEGORIE — např. "Předkrmy", "Hlavní jídla", "Poledni menu"
// ---------------------------------------------------------------------------
export const menuCategories = pgTable("menu_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// MENU POLOŽKY
// Cena se drží v halířích (integer), ne ve float — vyhneš se
// zaokrouhlovacím chybám. 129900 = 1299,00 Kč.
// ---------------------------------------------------------------------------
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => menuCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  imageUrl: text("image_url"),
  allergens: jsonb("allergens").$type<string[]>().notNull().default([]),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// USERS — účet přihlašovaný přes Auth.js (magic link, žádné heslo).
// emailVerified + image drží DrizzleAdapter (vyžaduje je i když je nepoužíváme).
// Žádná self-registrace: účet vzniká jen ručním insertem (viz README).
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  // Auth.js normalizuje e-mail na lowercase — jinak by se ručně vložený
  // "Jan@Example.cz" nikdy nepřihlásil.
  emailLowercase: check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
}));

// ---------------------------------------------------------------------------
// ACCOUNTS / SESSIONS / VERIFICATION_TOKENS — tabulky vyžadované
// @auth/drizzle-adapter (DrizzleAdapter) pro Postgres, database sessions.
// Přesně podle DefaultPostgres*Table typů z node_modules/@auth/drizzle-adapter,
// jen s userId jako uuid FK na users.id (onDelete cascade).
// ---------------------------------------------------------------------------
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ---------------------------------------------------------------------------
// SITE_MEMBERSHIPS — role uživatele na konkrétním webu.
// owner = může nastavovat web (moduly, kategorie), staff = jen položky menu.
// ---------------------------------------------------------------------------
export const siteRole = pgEnum("site_role", ["owner", "staff"]);
export type SiteRole = (typeof siteRole.enumValues)[number];

export const siteMemberships = pgTable(
  "site_memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    role: siteRole("role").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (membership) => ({
    compositePk: primaryKey({
      columns: [membership.userId, membership.siteId],
    }),
    siteIdIdx: index("site_memberships_site_id_idx").on(membership.siteId),
  })
);

// ---------------------------------------------------------------------------
// OPENING_HOURS — týdenní rozvrh, max 1 okno na den.
// weekday: 0 = pondělí … 6 = neděle (český týden, ne JS getDay()).
// closesAt < opensAt znamená otevírací dobu přes půlnoc (bary apod.).
// ---------------------------------------------------------------------------
export const openingHours = pgTable(
  "opening_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(), // 0 = pondělí … 6 = neděle
    opensAt: time("opens_at").notNull(),
    closesAt: time("closes_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    siteWeekdayUnique: unique("opening_hours_site_id_weekday_unique").on(
      t.siteId,
      t.weekday
    ),
    weekdayRange: check(
      "opening_hours_weekday_range",
      sql`${t.weekday} between 0 and 6`
    ),
    timesDiffer: check(
      "opening_hours_times_differ",
      sql`${t.opensAt} <> ${t.closesAt}`
    ),
  })
);

// ---------------------------------------------------------------------------
// OPENING_HOUR_EXCEPTIONS — jednorázová výjimka z týdenního rozvrhu pro
// konkrétní datum (svátek, akce, zavřeno kvůli nemoci…). Výjimka přebíjí
// týdenní rozvrh, viz src/lib/hours.ts (computeEffectiveSchedule).
// ---------------------------------------------------------------------------
export const openingHourExceptions = pgTable(
  "opening_hour_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    isClosed: boolean("is_closed").notNull().default(false),
    customOpensAt: time("custom_opens_at"),
    customClosesAt: time("custom_closes_at"),
    reason: text("reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    siteDateUnique: unique("opening_hour_exceptions_site_id_date_unique").on(
      t.siteId,
      t.date
    ),
    closedOrTimes: check(
      "opening_hour_exceptions_closed_or_times",
      sql`${t.isClosed} OR (${t.customOpensAt} IS NOT NULL AND ${t.customClosesAt} IS NOT NULL)`
    ),
  })
);

// ---------------------------------------------------------------------------
// EVENTS — jednorázové akce (bez RSVP/kapacity/opakování — mimo scope F3).
// date/start_time = místní čas Prahy, žádné TZ převody (stejně jako hours).
// ---------------------------------------------------------------------------
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    date: date("date", { mode: "string" }).notNull(),
    startTime: time("start_time"),
    imageUrl: text("image_url"),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    siteDateIdx: index("events_site_id_date_idx").on(t.siteId, t.date),
    titleLength: check(
      "events_title_length",
      sql`char_length(${t.title}) between 1 and 200`
    ),
  })
);

// ---------------------------------------------------------------------------
// PAGE_CONTENT — textový obsah stránek v Markdownu (F5).
// page_key identifikuje stránku v rámci webu (např. "o-nas", "kontakt").
// Veřejné API vrací surový markdown — žádné HTML se na serveru negeneruje,
// takže tu nehrozí server-side XSS (viz src/lib/content.ts).
// ---------------------------------------------------------------------------
export const pageContent = pgTable(
  "page_content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    pageKey: text("page_key").notNull(),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    siteKeyUnique: unique("page_content_site_id_page_key_unique").on(
      t.siteId,
      t.pageKey
    ),
    pageKeyFormat: check(
      "page_content_page_key_format",
      sql`${t.pageKey} ~ '^[a-z0-9-]{1,50}$'`
    ),
  })
);

// ---------------------------------------------------------------------------
// Relace — usnadní nested query (site -> categories -> items)
// ---------------------------------------------------------------------------
export const sitesRelations = relations(sites, ({ many }) => ({
  menuCategories: many(menuCategories),
  memberships: many(siteMemberships),
  openingHours: many(openingHours),
  openingHourExceptions: many(openingHourExceptions),
  events: many(events),
  pageContent: many(pageContent),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  site: one(sites, {
    fields: [events.siteId],
    references: [sites.id],
  }),
}));

export const pageContentRelations = relations(pageContent, ({ one }) => ({
  site: one(sites, {
    fields: [pageContent.siteId],
    references: [sites.id],
  }),
}));

export const openingHoursRelations = relations(openingHours, ({ one }) => ({
  site: one(sites, {
    fields: [openingHours.siteId],
    references: [sites.id],
  }),
}));

export const openingHourExceptionsRelations = relations(
  openingHourExceptions,
  ({ one }) => ({
    site: one(sites, {
      fields: [openingHourExceptions.siteId],
      references: [sites.id],
    }),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(siteMemberships),
}));

export const siteMembershipsRelations = relations(
  siteMemberships,
  ({ one }) => ({
    user: one(users, {
      fields: [siteMemberships.userId],
      references: [users.id],
    }),
    site: one(sites, {
      fields: [siteMemberships.siteId],
      references: [sites.id],
    }),
  })
);

export const menuCategoriesRelations = relations(
  menuCategories,
  ({ one, many }) => ({
    site: one(sites, {
      fields: [menuCategories.siteId],
      references: [sites.id],
    }),
    items: many(menuItems),
  })
);

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
}));
