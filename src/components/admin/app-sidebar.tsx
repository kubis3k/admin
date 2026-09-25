"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  FileText,
  Images,
  LogOut,
  Plus,
  Settings,
  Store,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { UserSite } from "@/lib/admin-sites";

const MODULE_ITEMS: {
  key: keyof UserSite["modules"];
  label: string;
  icon: typeof BookOpen;
}[] = [
  { key: "menu", label: "Menu", icon: BookOpen },
  { key: "hours", label: "Otevírací doba", icon: Clock },
  { key: "events", label: "Eventy", icon: CalendarDays },
  { key: "content", label: "Obsah stránek", icon: FileText },
  { key: "gallery", label: "Galerie", icon: Images },
];

export function AppSidebar({
  sites,
  superadmin,
  userEmail,
  signOutAction,
}: {
  sites: UserSite[];
  superadmin: boolean;
  userEmail: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const match = pathname.match(/^\/admin\/([^/]+)/);
  const currentSlug = match && match[1] !== "new-site" ? match[1] : undefined;
  const currentSite = sites.find((s) => s.slug === currentSlug);

  return (
    <Sidebar>
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Store className="size-4" />
              <span className="truncate">
                {currentSite?.name ?? "Vyberte web"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {sites.map((site) => {
              const firstModule = MODULE_ITEMS.find(
                (m) => site.modules[m.key]
              )?.key;
              return (
                <DropdownMenuItem key={site.slug} asChild>
                  <Link href={`/admin/${site.slug}/${firstModule ?? ""}`}>
                    {site.slug === currentSlug && <Check className="size-4" />}
                    {site.name}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        {currentSite && (
          <SidebarGroup>
            <SidebarGroupLabel>Moduly</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MODULE_ITEMS.filter((m) => currentSite.modules[m.key]).map(
                  (m) => {
                    const href = `/admin/${currentSite.slug}/${m.key}`;
                    const Icon = m.icon;
                    return (
                      <SidebarMenuItem key={m.key}>
                        <SidebarMenuButton asChild isActive={pathname.startsWith(href)}>
                          <Link href={href}>
                            <Icon />
                            <span>{m.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                )}
                {superadmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(
                        `/admin/${currentSite.slug}/settings`
                      )}
                    >
                      <Link href={`/admin/${currentSite.slug}/settings`}>
                        <Settings />
                        <span>Nastavení</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {superadmin && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/admin/new-site"}>
                <Link href="/admin/new-site">
                  <Plus />
                  <span>Nový web</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <span className="truncate text-xs text-muted-foreground">
            {userEmail}
          </span>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="icon" title="Odhlásit">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
