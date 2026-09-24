import { db } from "@/db";
import { menuCategories } from "@/db/schema";
import { requireSiteAccess, hasRole } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import {
  createCategory,
  deleteCategory,
  createItem,
  updateItem,
  toggleAvailability,
  deleteItem,
} from "./actions";

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("cs-CZ", {
    style: "currency",
    currency: "CZK",
  });
}

export default async function MenuAdminPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug, "staff");
  const isOwner = hasRole(role, "owner");

  if (!site.modules.menu) {
    return <p>Menu modul je pro tento web vypnutý (drží si externí systém).</p>;
  }

  const categories = await db.query.menuCategories.findMany({
    where: eq(menuCategories.siteId, site.id),
    orderBy: asc(menuCategories.sortOrder),
    with: { items: { orderBy: (i, { asc }) => asc(i.sortOrder) } },
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Menu — {site.name}</h1>

      {categories.map((category) => (
        <section key={category.id} style={{ marginBottom: 32 }}>
          <h2>
            {category.name}
            {isOwner && (
              <form
                action={deleteCategory.bind(null, category.id, siteSlug)}
                style={{ display: "inline", marginLeft: 8 }}
              >
                <button type="submit">Smazat kategorii</button>
              </form>
            )}
          </h2>

          <ul>
            {category.items.map((item) => (
              <li key={item.id} style={{ marginBottom: 8 }}>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await updateItem(item.id, siteSlug, {
                      name: String(formData.get("name")),
                      priceCents: Math.round(Number(formData.get("price")) * 100),
                    });
                  }}
                  style={{ display: "inline" }}
                >
                  <input name="name" defaultValue={item.name} required />
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={(item.priceCents / 100).toFixed(2)}
                    required
                  />
                  <button type="submit">Uložit</button>
                </form>
                {" — "}
                {formatPrice(item.priceCents)}
                {!item.isAvailable && " (nedostupné)"}
                <form
                  action={toggleAvailability.bind(
                    null,
                    item.id,
                    siteSlug,
                    !item.isAvailable
                  )}
                  style={{ display: "inline", marginLeft: 8 }}
                >
                  <button type="submit">
                    {item.isAvailable ? "Vypnout" : "Zapnout"}
                  </button>
                </form>
                <form
                  action={deleteItem.bind(null, item.id, siteSlug)}
                  style={{ display: "inline", marginLeft: 4 }}
                >
                  <button type="submit">Smazat</button>
                </form>
              </li>
            ))}
          </ul>

          <form
            action={async (formData: FormData) => {
              "use server";
              await createItem(category.id, siteSlug, {
                name: String(formData.get("name")),
                priceCents: Math.round(Number(formData.get("price")) * 100),
              });
            }}
          >
            <input name="name" placeholder="Název položky" required />
            <input
              name="price"
              type="number"
              step="0.01"
              placeholder="Cena (Kč)"
              required
            />
            <button type="submit">Přidat položku</button>
          </form>
        </section>
      ))}

      {isOwner && (
        <form
          action={async (formData: FormData) => {
            "use server";
            await createCategory(siteSlug, String(formData.get("name")));
          }}
        >
          <input name="name" placeholder="Nová kategorie (např. Předkrmy)" required />
          <button type="submit">Přidat kategorii</button>
        </form>
      )}
    </main>
  );
}
