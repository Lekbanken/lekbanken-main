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
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-6 pt-4 sm:hidden">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>{t('app.nav.profile')}</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </SheetClose>
          </SheetHeader>

          <div className="mt-4 grid gap-3">
            {isAdmin && (
              <SheetClose asChild>
                <Link
                  href="/admin"
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm font-medium text-foreground"
                >
                  Admin
                  <span className="text-xs text-muted-foreground">/admin</span>
                </Link>
              </SheetClose>
            )}
            <SheetClose asChild>
              <Link
                href="/app"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm font-medium text-foreground"
              >
                App
                <span className="text-xs text-muted-foreground">/app</span>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/app/profile"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm font-medium text-foreground"
              >
                {t('app.nav.profile')}
                <span className="text-xs text-muted-foreground">/app/profile</span>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm font-medium text-foreground"
              >
                Marketing
                <span className="text-xs text-muted-foreground">/</span>
              </Link>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
