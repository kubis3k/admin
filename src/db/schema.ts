import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// SITES — jeden řádek = jeden klientský web (tenant).
// `modules` říká, které moduly jsou pro daný web zapnuté.
// Příklad: { menu: true, hours: false, events: false, gallery: false }
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
    }>()
    .notNull()
    .default({ menu: false, hours: false, events: false, gallery: false }),
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
// Relace — usnadní nested query (site -> categories -> items)
// ---------------------------------------------------------------------------
export const sitesRelations = relations(sites, ({ many }) => ({
  menuCategories: many(menuCategories),
  memberships: many(siteMemberships),
}));

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
