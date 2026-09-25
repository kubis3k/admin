import type { ReactNode } from "react";
import { auth } from "@/auth";
import { getUserSites } from "@/lib/admin-sites";
import { AppShell } from "@/components/admin/app-shell";
import { signOutAction } from "./sign-out";

// Bez session vrací jen children — přesměrování na /admin/login řeší
// jednotlivé stránky (requireSiteAccess/requireSuperadmin), layout jen zobrazuje.
export default async function AdminAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) return children;

  const { superadmin, sites } = await getUserSites(session.user.id);

  return (
    <AppShell
      sites={sites}
      superadmin={superadmin}
      userEmail={session.user.email ?? ""}
      signOutAction={signOutAction}
    >
      {children}
    </AppShell>
  );
}
