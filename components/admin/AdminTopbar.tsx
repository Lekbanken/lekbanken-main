'use client';

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ProfileMenu } from "@/components/navigation/ProfileMenu";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
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
  "/admin/content": "Innehåll",
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
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      {/* Left side: Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Öppna navigering"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <Breadcrumbs />
      </div>

      {/* Center: Search */}
      <div className="hidden flex-1 justify-center md:flex md:max-w-md lg:max-w-lg">
        <div className="relative w-full">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Sök användare, organisationer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg bg-muted/50 pl-9 pr-12 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
          />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-block">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden gap-2 xl:inline-flex">
          <UserIcon className="h-4 w-4" />
          Ny användare
        </Button>

        <button
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notiser"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        <ThemeToggle />
        <ProfileMenu context="admin" />
      </div>
    </header>
  );
}
