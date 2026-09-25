import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserSites, type UserSite } from "@/lib/admin-sites";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MODULE_LINKS: { key: keyof UserSite["modules"]; label: string }[] = [
  { key: "menu", label: "Menu" },
  { key: "hours", label: "Otevírací doba" },
  { key: "events", label: "Eventy" },
  { key: "content", label: "Obsah stránek" },
  { key: "gallery", label: "Galerie" },
];

// Rozcestník po přihlášení — weby, na které má uživatel membership
// (superadmin vidí navíc úplně všechny weby, viz F6).
export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const { superadmin, sites } = await getUserSites(session.user.id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Přehled"
        description="Weby, ke kterým máte přístup, a jejich moduly."
        actions={
          superadmin && (
            <Button asChild>
              <Link href="/admin/new-site">+ Nový web</Link>
            </Button>
          )
        }
      />

      {sites.length === 0 ? (
        <p className="text-muted-foreground">Nemáte přístup k žádnému webu.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sites.map((site) => (
            <Card key={site.slug}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{site.name}</CardTitle>
                  <Badge variant="secondary">{site.role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {MODULE_LINKS.filter((m) => site.modules[m.key]).map((m) => (
                  <Link
                    key={m.key}
                    href={`/admin/${site.slug}/${m.key}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {m.label}
                  </Link>
                ))}
                {superadmin && (
                  <Link
                    href={`/admin/${site.slug}/settings`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Nastavení
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
