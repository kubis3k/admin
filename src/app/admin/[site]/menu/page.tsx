import { db } from "@/db";
import { sites, menuCategories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { createCategory, createItem, toggleAvailability, deleteItem } from "./actions";

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
  await requireAdmin();
  const { site: siteSlug } = await params;

  const site = await db.query.sites.findFirst({
    where: eq(sites.slug, siteSlug),
  });

  if (!site) {
    return <p>Web &quot;{siteSlug}&quot; nenalezen.</p>;
  }

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
          <h2>{category.name}</h2>

          <ul>
            {category.items.map((item) => (
              <li key={item.id} style={{ marginBottom: 8 }}>
                <strong>{item.name}</strong> — {formatPrice(item.priceCents)}
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

      <form
        action={async (formData: FormData) => {
          "use server";
          await createCategory(siteSlug, String(formData.get("name")));
        }}
      >
        <input name="name" placeholder="Nová kategorie (např. Předkrmy)" required />
        <button type="submit">Přidat kategorii</button>
      </form>
    </main>
  );
}
