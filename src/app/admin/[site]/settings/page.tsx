import { forbidden } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { SettingsForm } from "./form";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: siteSlug } = await params;
  const { site, isSuperadmin } = await requireSiteAccess(siteSlug);
  if (!isSuperadmin) forbidden();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Nastavení — {site.name}</h1>
      <SettingsForm
        slug={site.slug}
        name={site.name}
        modules={site.modules}
        webhookUrl={site.webhookUrl}
        hasSecret={Boolean(site.webhookSecret)}
      />
    </main>
  );
}
