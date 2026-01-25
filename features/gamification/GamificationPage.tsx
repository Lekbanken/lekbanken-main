"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitleHeader } from "@/components/app/PageTitleHeader";
import { appNavItems } from "@/components/app/nav-items";
import { fetchGamificationSnapshot, type GamificationPayload } from "./api";
import { ProgressOverview } from "./components/ProgressOverview";
import { AchievementsSection } from "./components/AchievementsSection";
import { CoinsSection } from "./components/CoinsSection";
import { StreakSection } from "./components/StreakSection";
import { CallToActionSection } from "./components/CallToActionSection";

type GamificationPageProps = {
  fetcher?: () => Promise<GamificationPayload>;
};

export function GamificationPage({ fetcher = fetchGamificationSnapshot }: GamificationPageProps) {
  const t = useTranslations("gamification");
  const [data, setData] = useState<GamificationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dicecoinIcon = appNavItems.find((item) => item.href === "/app/gamification")?.icon;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const result = await fetcher();
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch {
        if (isMounted) setError("Kunde inte ladda gamification just nu.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [fetcher]);

  if (error) {
    return (
      <ErrorState
        title={t("errorTitle")}
        description={error}
        onRetry={() => {
          setIsLoading(true);
          setError(null);
          setData(null);
          fetcher()
            .then((result) => {
              setData(result);
              setError(null);
            })
            .catch(() => setError("Kunde inte ladda gamification just nu."))
            .finally(() => setIsLoading(false));
        }}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 pb-32">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-40" />
        </div>
        {/* Progress overview skeleton */}
        <Skeleton className="h-48 w-full rounded-3xl" />
        {/* Achievements skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
        {/* Coins skeleton */}
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Page Header */}
      <PageTitleHeader
        icon={dicecoinIcon}
        title="DICECOIN"
        subtitle="Din progress"
      />


      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href="/app/learning"
          className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40"
        >
          {t("nav.courses")}
          <p className="mt-1 text-xs font-normal text-muted-foreground">{t("nav.coursesDesc")}</p>
        </Link>
        <Link
          href="/app/gamification/achievements"
          className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40"
        >
          {t("nav.achievements")}
          <p className="mt-1 text-xs font-normal text-muted-foreground">{t("nav.achievementsDesc")}</p>
        </Link>
        <Link
          href="/app/gamification/coins"
          className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40"
        >
          {t("nav.dicecoin")}
          <p className="mt-1 text-xs font-normal text-muted-foreground">{t("nav.dicecoinDesc")}</p>
        </Link>
        <Link
          href="/app/shop"
          className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40"
        >
          {t("nav.shop")}
          <p className="mt-1 text-xs font-normal text-muted-foreground">{t("nav.shopDesc")}</p>
        </Link>
        <Link
          href="/app/gamification/events"
          className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40"
        >
          {t("nav.eventlog")}
          <p className="mt-1 text-xs font-normal text-muted-foreground">{t("nav.eventlogDesc")}</p>
        </Link>
      </div>

      <ProgressOverview progress={data.progress} />
      <AchievementsSection achievements={data.achievements} />
      <CoinsSection summary={data.coins} />
      <StreakSection streak={data.streak} />
      <CallToActionSection />
    </div>
  );
}
