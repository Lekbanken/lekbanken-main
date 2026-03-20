"use client"

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/app/NotificationBell";

interface AppTopbarProps {
  canGoBack?: boolean;
  onBack?: () => void;
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

      <div className="flex w-20 items-center justify-end">
        <NotificationBell />
      </div>
    </header>
  );
}

export function useAppNavigation() {
  return {
    canGoBack: false,
    backLabel: undefined as string | undefined,
  };
}