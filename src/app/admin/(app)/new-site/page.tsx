import { requireSuperadmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { NewSiteForm } from "./form";

export default async function NewSitePage() {
  await requireSuperadmin();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title="Nový web" description="Založení nového webu a jeho vlastníka." />
      <NewSiteForm />
    </div>
  );
}
