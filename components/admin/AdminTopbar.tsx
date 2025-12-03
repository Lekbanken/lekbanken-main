'use client';

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/supabase/auth";
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
  ChevronRightIcon,
  HomeIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
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
  
  // Build breadcrumb items
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
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const userEmail = user?.email || "admin@lekbanken.se";

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
        {/* Add user button (desktop) */}
        <Button variant="outline" size="sm" className="hidden gap-2 xl:inline-flex">
          <UserIcon className="h-4 w-4" />
          Ny användare
        </Button>

        {/* Notifications */}
        <button 
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" 
          aria-label="Notiser"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 transition-colors hover:bg-muted lg:px-3">
              <Avatar name={userEmail} size="sm" />
              <div className="hidden text-left lg:block">
                <p className="text-sm font-medium text-foreground">Admin</p>
                <p className="text-[11px] text-muted-foreground">Superadmin</p>
              </div>
              <ChevronRightIcon className="hidden h-4 w-4 rotate-90 text-muted-foreground lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Inloggad som</DropdownMenuLabel>
            <div className="px-3 py-2 text-sm text-foreground">{userEmail}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin/settings")} className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Min profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/settings")} className="flex items-center gap-2">
              <Cog6ToothIcon className="h-4 w-4" />
              Inställningar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/app")} className="flex items-center gap-2">
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              Gå till appen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={handleSignOut} className="flex items-center gap-2">
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              Logga ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
