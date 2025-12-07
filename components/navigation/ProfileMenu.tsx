"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePreferences } from "@/lib/context/PreferencesContext";
import { getUiCopy } from "@/lib/i18n/ui";
import { useAuth } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

type MenuContext = "marketing" | "app" | "admin";

type ProfileMenuProps = {
  context?: MenuContext;
  onNavigate?: () => void;
  className?: string;
};

export function ProfileMenu({ context = "app", onNavigate, className }: ProfileMenuProps) {
  const router = useRouter();
  const { language } = usePreferences();
  const copy = getUiCopy(language).marketing.actions;
  const { user, userProfile, userRole, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!user) return null;
  const displayName = userProfile?.full_name || (user.email ? user.email.split("@")[0] : "Profil");
  const email = user.email || "";
  const avatarUrl = userProfile?.avatar_url;
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  const handleNavigate = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  const handleLogout = async () => {
    await signOut();
    onNavigate?.();
  };

  if (!mounted) {
    return (
      <div className={cn("h-10 w-10 rounded-full border border-border/60 bg-muted", className)} aria-hidden />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-full border border-border/70 bg-card px-2.5 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            className,
          )}
        >
          <Avatar src={avatarUrl || undefined} name={displayName} size="sm" />
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleNavigate("/app/profile")} className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="8" r="4" />
            <path d="M5 20c0-3.3 3-6 7-6s7 2.7 7 6" />
          </svg>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigate("/app")} className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 12s2-4 9-4 9 4 9 4-2 4-9 4-9-4-9-4Z" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          {copy.goToApp}
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => handleNavigate("/admin")} className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3 4 7v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V7l-8-4Z" />
            </svg>
            {copy.goToAdmin}
          </DropdownMenuItem>
        )}
        {context !== "marketing" && (
          <DropdownMenuItem onClick={() => handleNavigate("/")} className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 12l9-9 9 9" />
              <path d="M9 21V9h6v12" />
            </svg>
            {copy.goToMarketing}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={handleLogout} className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
