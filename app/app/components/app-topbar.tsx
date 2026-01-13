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
      {/* Logo section - centered on mobile for all pages, left-aligned on desktop */}
      <div className={`flex items-center gap-2.5 sm:gap-3 ${isDashboard ? "flex-1 justify-center lg:flex-none lg:justify-start" : "lg:flex-none"}`}>
        <button
          type="button"
          onClick={() => router.push("/app")}
          className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={t("goToDashboard")}
        >
          {/* Mobile: only dice icon, centered */}
          <Image
            src="/lekbanken-icon.png"
            alt={t("logoAlt")}
            width={36}
            height={36}
            className={`rounded-xl ${isDashboard ? "h-10 w-10 lg:h-9 lg:w-9" : "h-8 w-8"} sm:h-9 sm:w-9`}
          />
          {/* Desktop only: show App + Lekbanken text */}
          <div className="hidden lg:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">App</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Lekbanken</h1>
          </div>
        </button>
      </div>

      {/* Right side controls - hidden on mobile (profile in BottomNav) */}
      <div className={`hidden lg:flex items-center gap-3 ${isDashboard ? "absolute right-0 lg:static" : ""}`}>
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
