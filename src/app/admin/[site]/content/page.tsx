import { db } from "@/db";
import { pageContent } from "@/db/schema";
import { requireSiteAccess, hasRole } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { createPage, deletePage, savePageContent } from "./actions";

function PageItem({
  page,
  siteSlug,
  isOwner,
}: {
  page: typeof pageContent.$inferSelect;
  siteSlug: string;
  isOwner: boolean;
}) {
  return (
    <li style={{ marginBottom: 16, borderBottom: "1px solid #ccc", paddingBottom: 12 }}>
      <div>
        <strong>{page.pageKey}</strong> — upraveno{" "}
        {page.updatedAt.toLocaleString("cs-CZ")}
      </div>
      <form
        action={async (formData: FormData) => {
          "use server";
          await savePageContent(
            page.id,
            siteSlug,
            String(formData.get("content") || "")
          );
        }}
      >
        <div>
          <textarea
            name="content"
            defaultValue={page.content}
            rows={12}
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <button type="submit">Uložit</button>
        </div>
      </form>
      {isOwner && (
        <form action={deletePage.bind(null, page.id, siteSlug)}>
          <button type="submit">Smazat stránku</button>
        </form>
      )}
    </li>
  );
}

export default async function ContentAdminPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug, "staff");
  const isOwner = hasRole(role, "owner");

  if (!site.modules.content) {
    return <p>Textový obsah je pro tento web vypnutý.</p>;
  }

  const pages = await db.query.pageContent.findMany({
    where: eq(pageContent.siteId, site.id),
    orderBy: [asc(pageContent.pageKey)],
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Obsah stránek — {site.name}</h1>
      <p>Obsah je v Markdownu.</p>

      {isOwner && (
        <section style={{ marginBottom: 32 }}>
          <h2>Nová stránka</h2>
          <form
            action={async (formData: FormData) => {
              "use server";
              await createPage(siteSlug, String(formData.get("pageKey") || ""));
            }}
          >
            <input
              name="pageKey"
              placeholder="klíč stránky (např. o-nas)"
              pattern="[a-z0-9-]{1,50}"
              title="jen malá písmena, číslice a pomlčka, 1–50 znaků"
              required
            />
            <button type="submit">Založit</button>
          </form>
        </section>
      )}

      <section>
        {pages.length === 0 ? (
          <p>Zatím žádné stránky.</p>
        ) : (
          <ul>
            {pages.map((page) => (
              <PageItem
                key={page.id}
                page={page}
                siteSlug={siteSlug}
                isOwner={isOwner}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
