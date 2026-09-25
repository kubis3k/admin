import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { sites, siteMemberships } from "@/db/schema";

// Rozcestník po přihlášení — jen weby, na které má uživatel membership.
export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const memberships = await db
    .select({
      slug: sites.slug,
      name: sites.name,
      role: siteMemberships.role,
      modules: sites.modules,
    })
    .from(siteMemberships)
    .innerJoin(sites, eq(siteMemberships.siteId, sites.id))
    .where(eq(siteMemberships.userId, session.user.id))
    .orderBy(asc(sites.name));

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Administrace</h1>
      {memberships.length === 0 ? (
        <p>Nemáte přístup k žádnému webu.</p>
      ) : (
        <ul>
          {memberships.map((m) => (
            <li key={m.slug}>
              {m.name} ({m.role}):{" "}
              {m.modules.menu && (
                <Link href={`/admin/${m.slug}/menu`}>Menu</Link>
              )}
              {m.modules.menu && m.modules.hours && " · "}
              {m.modules.hours && (
                <Link href={`/admin/${m.slug}/hours`}>Otevírací doba</Link>
              )}
              {(m.modules.menu || m.modules.hours) && m.modules.events && " · "}
              {m.modules.events && (
                <Link href={`/admin/${m.slug}/events`}>Eventy</Link>
              )}
              {(m.modules.menu || m.modules.hours || m.modules.events) &&
                m.modules.content &&
                " · "}
              {m.modules.content && (
                <Link href={`/admin/${m.slug}/content`}>Obsah stránek</Link>
              )}
              {(m.modules.menu || m.modules.hours || m.modules.events || m.modules.content) &&
                m.modules.gallery &&
                " · "}
              {m.modules.gallery && (
                <Link href={`/admin/${m.slug}/gallery`}>Galerie</Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link href="/admin/login">Účet / odhlášení</Link>
      </p>
    </main>
  );
}
