"use client"

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/app/NotificationBell";

/**
 * AppTopbar - Minimal, stable topbar for the app
 * 
 * Layout:
 * - Left: Back button (only when canGoBack is true)
 * - Center: Dice icon (always → home)
 * - Right: Empty (MVP) - notifications placeholder for future
 * 
 * Same behavior on mobile and desktop.
 */

interface AppTopbarProps {
  /** Whether back navigation is available */
  canGoBack?: boolean;
  /** Custom back handler (default: router.back) */
  onBack?: () => void;
  /** Custom back label for accessibility */
  backLabel?: string;
}

export function AppTopbar({ canGoBack = false, onBack, backLabel }: AppTopbarProps) {
  const router = useRouter();
  const t = useTranslations("app.nav");

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleHome = () => {
    router.push("/app");
  };

  return (
    <header className="relative flex h-12 items-center justify-between">
      {/* Left: Back button (only when canGoBack) */}
      <div className="flex w-20 items-center">
        {canGoBack && (
          <button
            type="button"
            onClick={handleBack}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium",
              "text-muted-foreground transition-colors hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            )}
            aria-label={backLabel || t("back")}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="hidden sm:inline">{backLabel || t("back")}</span>
          </button>
        )}
      </div>

      {/* Center: Dice icon (always → home) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <button
          type="button"
          onClick={handleHome}
          className={cn(
            "rounded-xl transition-transform hover:scale-105",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          )}
          aria-label={t("goToDashboard")}
        >
          <Image
            src="/lekbanken-icon.png"
            alt={t("logoAlt")}
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl"
          />
        </button>
      </div>

      {/* Right: Notification bell */}
      <div className="flex w-20 items-center justify-end">
        <NotificationBell />
      </div>
    </header>
  );
}

/**
 * Hook for pages to determine if they should show back navigation
 * 
 * Usage:
 * ```tsx
 * const { canGoBack, backLabel } = useAppNavigation();
 * return <AppTopbar canGoBack={canGoBack} backLabel={backLabel} />;
 * ```
 */
export function useAppNavigation() {
  // This would need to be enhanced with actual pathname logic
  // For now, return false (root level)
  return {
    canGoBack: false,
    backLabel: undefined as string | undefined,
  };
}
