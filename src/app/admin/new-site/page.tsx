import { requireSuperadmin } from "@/lib/auth";
import { NewSiteForm } from "./form";

export default async function NewSitePage() {
  await requireSuperadmin();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Nový web</h1>
      <NewSiteForm />
    </main>
  );
}
