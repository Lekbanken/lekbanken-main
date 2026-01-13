"use client"

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { ProfileMenu } from "@/components/navigation/ProfileMenu";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/supabase/auth";
import { appNavItems } from "@/components/app/nav-items";

// Map pathname to page info for mobile header
function getPageInfo(pathname: string): { title: string; subtitle: string; icon: React.ReactNode } | null {
  // Find matching nav item
  const navItem = appNavItems.find(item => 
    pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  
  if (!navItem) return null;
  
  // Map nav items to page titles
  const pageMap: Record<string, { title: string; subtitle: string }> = {
    '/app/gamification': { title: 'POÄNG', subtitle: 'Lekvaluta' },
    '/app/browse': { title: 'UPPTÄCK', subtitle: 'Hitta rätt aktivitet' },
    '/app/play': { title: 'SPELA', subtitle: 'Lekledarcentralen' },
    '/app/planner': { title: 'PLANERA', subtitle: 'Schemaläggaren' },
    '/app/profile': { title: 'PROFIL', subtitle: 'Min profil' },
  };
  
  const pageInfo = pageMap[navItem.href];
  if (!pageInfo) return null;
  
  return {
    ...pageInfo,
    icon: navItem.icon,
  };
}

export function AppTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("app.nav");
  const { effectiveGlobalRole } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const isAdmin = effectiveGlobalRole === "system_admin";
  const isDashboard = pathname === "/app" || pathname === "/app/";
  const pageInfo = getPageInfo(pathname || '');

  if (!mounted) {
    return (
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="h-8 w-8 rounded-xl bg-muted sm:h-9 sm:w-9" />
          <div className="hidden space-y-1 sm:block">
            <div className="h-2 w-16 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-3 w-20 rounded bg-muted sm:hidden" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 rounded-full bg-muted" />
          <div className="h-9 w-9 rounded-full bg-muted" />
        </div>
      </header>
    );
  }

  return (
    <header className="relative flex items-center justify-between">
      {/* Logo/Page section */}
      <div className={`flex items-center gap-2.5 sm:gap-3 ${isDashboard ? "flex-1 justify-center lg:flex-none lg:justify-start" : ""}`}>
        {/* Mobile: Show page icon and title for sub-pages, dice for dashboard */}
        {isDashboard || !pageInfo ? (
          // Dashboard: centered dice on mobile
          <button
            type="button"
            onClick={() => router.push("/app")}
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={t("goToDashboard")}
          >
            <Image
              src="/lekbanken-icon.png"
              alt={t("logoAlt")}
              width={36}
              height={36}
              className="h-10 w-10 rounded-xl lg:h-9 lg:w-9"
            />
            {/* Desktop only: show App + Lekbanken text */}
            <div className="hidden lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">App</p>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Lekbanken</h1>
            </div>
          </button>
        ) : (
          // Sub-pages: Show page icon and title on mobile, Lekbanken branding on desktop
          <>
            {/* Mobile: Page icon and title */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {pageInfo.icon}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{pageInfo.title}</p>
                <h1 className="text-lg font-bold tracking-tight text-foreground">{pageInfo.subtitle}</h1>
              </div>
            </div>
            {/* Desktop: Lekbanken branding */}
            <button
              type="button"
              onClick={() => router.push("/app")}
              className="hidden lg:flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={t("goToDashboard")}
            >
              <Image
                src="/lekbanken-icon.png"
                alt={t("logoAlt")}
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl"
              />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">App</p>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Lekbanken</h1>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Right side controls - hidden on mobile (profile in BottomNav) */}
      <div className="hidden lg:flex items-center gap-3">
        {isAdmin && (
          <Badge
            variant="accent"
            size="sm"
            className="cursor-pointer transition-opacity hover:opacity-80"
            onClick={() => router.push("/admin")}
          >
            Admin
          </Badge>
        )}
        <LanguageSwitcher />
        <ThemeToggle />
        <ProfileMenu context="app" />
      </div>
    </header>
  );
}
