import type { ReactNode } from "react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { UserSite } from "@/lib/admin-sites";

export function AppShell({
  sites,
  superadmin,
  userEmail,
  signOutAction,
  children,
}: {
  sites: UserSite[];
  superadmin: boolean;
  userEmail: string;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar
        sites={sites}
        superadmin={superadmin}
        userEmail={userEmail}
        signOutAction={signOutAction}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4!" />
          </div>
          <ThemeToggle />
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
