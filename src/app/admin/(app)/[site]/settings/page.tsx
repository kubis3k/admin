import { forbidden } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Nastavení — ${site.name}`}
        description="Moduly webu, webhook a další superadmin nastavení."
      />
      <SettingsForm
        slug={site.slug}
        name={site.name}
        modules={site.modules}
        webhookUrl={site.webhookUrl}
        hasSecret={Boolean(site.webhookSecret)}
      />
    </div>
  );
}
