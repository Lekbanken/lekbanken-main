"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/supabase/auth";
import { appNavItems } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const { user, userProfile, effectiveGlobalRole } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email || "Profil";
  const avatarUrl = userProfile?.avatar_url;
  const isAdmin = effectiveGlobalRole === "system_admin";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-card/98 backdrop-blur-xl lg:hidden"
      role="navigation"
      aria-label="Huvudnavigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {appNavItems.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const isPlayTab = tab.href === "/app/play";
          const isProfileTab = tab.href === "/app/profile";
          const iconNode = isProfileTab ? (
            <Avatar src={avatarUrl || undefined} name={displayName} size="sm" className="h-8 w-8" />
          ) : active ? (
            tab.iconActive
          ) : (
            tab.icon
          );

          const buttonClasses =
            "group flex flex-col items-center justify-center gap-0.5 py-2 active:scale-95 transition-transform duration-100";
          const iconClasses = `flex items-center justify-center rounded-2xl transition-all duration-200 ${
            isPlayTab ? "h-12 w-12" : "h-11 w-11"
          } ${
            active
              ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
              : "text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
          }`;
          const labelClasses = `text-[11px] font-medium tracking-wide transition-colors ${
            active ? "text-primary font-semibold" : "text-muted-foreground"
          }`;

          if (isProfileTab) {
            return (
              <button
                key={tab.href}
                type="button"
                aria-label={t(tab.labelKey)}
                aria-current={active ? "page" : undefined}
                className={buttonClasses}
                onClick={() => setProfileOpen(true)}
              >
                <span className={iconClasses}>{iconNode}</span>
                <span className={labelClasses}>{t(tab.labelKey)}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={t(tab.labelKey)}
              aria-current={active ? "page" : undefined}
              className={buttonClasses}
            >
              <span className={iconClasses}>{iconNode}</span>
              <span className={labelClasses}>{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>

      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 pt-4 sm:hidden">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle className="sr-only">{t('app.nav.profile')}</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="absolute right-4 top-4 h-9 w-9 p-0">
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </SheetClose>
          </SheetHeader>

          {/* Profile Header */}
          <div className="mt-2 flex flex-col items-center text-center">
            <Avatar src={avatarUrl || undefined} name={displayName} size="xl" className="h-20 w-20 ring-4 ring-primary/20" />
            <p className="mt-1 text-xs text-muted-foreground">Du är inloggad som</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{displayName}</h2>
            <SheetClose asChild>
              <Link
                href="/app/profile"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="5" />
                  <path d="M20 21a8 8 0 1 0-16 0" />
                </svg>
                Visa profil
              </Link>
            </SheetClose>
          </div>

          {/* Divider */}
          <div className="my-5 h-px bg-border" />

          {/* Navigation Links */}
          <div className="grid gap-2">
            {isAdmin && (
              <SheetClose asChild>
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-accent/20"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
                    <svg className="h-5 w-5 text-accent-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold">Admin</span>
                    <p className="text-xs text-muted-foreground">Hantera plattformen</p>
                  </div>
                </Link>
              </SheetClose>
            )}
            <SheetClose asChild>
              <Link
                href="/app"
                className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="font-semibold">Dashboard</span>
                  <p className="text-xs text-muted-foreground">Gå till startsidan</p>
                </div>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h18v18H3z" />
                    <path d="M21 12H3M12 3v18" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="font-semibold">Marknadsföring</span>
                  <p className="text-xs text-muted-foreground">Besök hemsidan</p>
                </div>
              </Link>
            </SheetClose>
          </div>

          {/* Divider */}
          <div className="my-4 h-px bg-border" />

          {/* Sign Out Button */}
          <form action="/auth/signout" method="POST">
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-center gap-2 rounded-xl border-destructive/30 py-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logga ut
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
