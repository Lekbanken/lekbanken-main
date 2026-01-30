"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";
import { appNavItems } from "./nav-items";
import { ProfileModal } from "./ProfileModal";

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
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      role="navigation"
      aria-label="Huvudnavigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Premium glassmorphism background */}
      <div className="absolute inset-0 border-t border-white/10 bg-card/80 backdrop-blur-2xl" />
      
      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative mx-auto grid max-w-lg grid-cols-5 px-2 py-1">
        {appNavItems.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const isHeroTab = tab.isHero;
          const isProfileTab = tab.href === "/app/profile";
          
          // Profile uses avatar, others use icons
          const iconNode = isProfileTab ? (
            <Avatar 
              src={avatarUrl || undefined} 
              name={displayName} 
              size="sm" 
              className={cn(
                "h-9 w-9 transition-all duration-300",
                active && "ring-2 ring-primary ring-offset-2 ring-offset-card"
              )} 
            />
          ) : active ? (
            tab.iconActive
          ) : (
            tab.icon
          );

          // Hero button (Play) - special elevated design
          if (isHeroTab) {
            const heroContent = (
              <>
                {/* Outer glow ring */}
                <span className={cn(
                  "absolute inset-0 rounded-full transition-all duration-300",
                  active 
                    ? "bg-gradient-to-br from-primary via-purple-500 to-pink-500 shadow-xl shadow-primary/40" 
                    : "bg-gradient-to-br from-primary/80 to-purple-600/80 shadow-lg shadow-primary/25"
                )} />
                {/* Inner button with icon */}
                <span className={cn(
                  "relative flex h-full w-full items-center justify-center rounded-full transition-all duration-200",
                  active ? "scale-110" : "hover:scale-105"
                )}>
                  {iconNode}
                </span>
              </>
            );

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={t(tab.labelKey)}
                aria-current={active ? "page" : undefined}
                className="group relative flex flex-col items-center justify-center py-1"
              >
                {/* Hero button container - elevated */}
                <span className="relative -mt-5 flex h-14 w-14 items-center justify-center active:scale-95 transition-transform duration-100">
                  {heroContent}
                </span>
                {/* Label - always visible for hero but styled differently */}
                <span className={cn(
                  "mt-0.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  {t(tab.labelKey)}
                </span>
              </Link>
            );
          }

          // Standard nav items
          const buttonClasses = cn(
            "group relative flex flex-col items-center justify-center py-2 active:scale-95 transition-all duration-200"
          );

          const iconContainerClasses = cn(
            "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300",
            active 
              ? "text-primary" 
              : "text-muted-foreground group-hover:text-foreground"
          );

          // Animated pill label - shows ABOVE the icon on active
          const labelNode = (
            <span className={cn(
              "absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300",
              active 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-1 pointer-events-none"
            )}>
              <span className={cn(
                "inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/30"
              )}>
                {t(tab.labelKey)}
              </span>
            </span>
          );

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
                {labelNode}
                <span className={iconContainerClasses}>{iconNode}</span>
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
              {labelNode}
              <span className={iconContainerClasses}>{iconNode}</span>
            </Link>
          );
        })}
      </div>

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        displayName={displayName}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
      />
    </nav>
  );
}
