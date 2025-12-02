"use client";

import { useEffect, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [data, setData] = useState<GamificationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const result = await fetcher();
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError("Kunde inte ladda gamification just nu.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <ErrorState
        title="Något gick fel"
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
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <SparklesIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Gamification</p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Din progress</h1>
          </div>
        </div>
      </header>

      <ProgressOverview progress={data.progress} coins={data.coins} streak={data.streak} />
      <AchievementsSection achievements={data.achievements} />
      <CoinsSection summary={data.coins} />
      <StreakSection streak={data.streak} />
      <CallToActionSection />
    </div>
  );
}
