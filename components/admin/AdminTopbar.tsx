'use client';

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ProfileMenu } from "@/components/navigation/ProfileMenu";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { Button } from "@/components/ui/button";
import { AdminNotificationsCenter, useAdminNotifications } from "./AdminNotificationsCenter";
import { useCommandPalette } from "./AdminCommandPalette";
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  HomeIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

type AdminTopbarProps = {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
};

// Route labels for breadcrumbs
const routeLabels: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/users": "Användare",
  "/admin/organisations": "Organisationer",
  "/admin/content": "Planer",
  "/admin/planner": "Planer",
  "/admin/achievements-advanced": "Achievements",
  "/admin/analytics": "Analys",
  "/admin/notifications": "Notifikationer",
  "/admin/moderation": "Moderering",
  "/admin/settings": "Inställningar",
  "/admin/support": "Support",
  "/admin/licenses": "Licenser",
  "/admin/billing": "Fakturering",
};

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const items = segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    const label = routeLabels[path] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === segments.length - 1;

    return { path, label, isLast };
  });

  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      <HomeIcon className="h-4 w-4 text-muted-foreground" />
      {items.map((item) => (
        <span key={item.path} className="flex items-center gap-1">
          <ChevronRightIcon className="h-3 w-3 text-muted-foreground/50" />
          <span className={item.isLast ? "font-medium text-foreground" : "text-muted-foreground"}>
            {item.label}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function AdminTopbar({ onToggleSidebar }: AdminTopbarProps) {
  const t = useTranslations("admin.nav");
  const { setOpen: setCommandPaletteOpen } = useCommandPalette();
  const [baseNow] = useState(() => Date.now());
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    dismiss 
  } = useAdminNotifications([
    // Demo notifications - in real app these would come from a server/subscription
    {
      id: '1',
      title: 'Ny anv?ndare registrerad',
      message: 'John Doe har registrerat sig och v?ntar p? godk?nnande.',
      type: 'info',
      timestamp: new Date(baseNow - 5 * 60 * 1000),
      read: false,
    },
    {
      id: '2',
      title: 'Fakturabetalning f?rfallen',
      message: 'Organisation "Skola ABC" har en f?rfallen faktura.',
      type: 'warning',
      timestamp: new Date(baseNow - 2 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: '3',
      title: 'System uppdaterat',
      message: 'Version 2.4.1 har installerats framg?ngsrikt.',
      type: 'success',
      timestamp: new Date(baseNow - 24 * 60 * 60 * 1000),
      read: true,
    },
  ]);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      {/* Left side: Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label={t("openNavigation")}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <Breadcrumbs />
      </div>

      {/* Center: Search */}
      <div className="hidden flex-1 justify-center md:flex md:max-w-md lg:max-w-lg">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="relative w-full"
        >
          <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <MagnifyingGlassIcon className="h-4 w-4" />
            <span className="flex-1 text-left">{t("topbar.searchPlaceholder")}</span>
            <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-block">
              ⌘K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden gap-2 xl:inline-flex">
          <UserIcon className="h-4 w-4" />
          {t("topbar.newUser")}
        </Button>

        <AdminNotificationsCenter
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDismiss={dismiss}
        />

        <ThemeToggle />
        <ProfileMenu context="admin" />
      </div>
    </header>
  );
}
