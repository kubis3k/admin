import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
// Relace — usnadní nested query (site -> categories -> items)
// ---------------------------------------------------------------------------
export const sitesRelations = relations(sites, ({ many }) => ({
  menuCategories: many(menuCategories),
}));

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
