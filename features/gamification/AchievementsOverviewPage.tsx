"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitleHeader } from "@/components/app/PageTitleHeader";
import { appNavItems } from "@/components/app/nav-items";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/context/TenantContext";
import { fetchGamificationSnapshot, fetchPinnedAchievements, savePinnedAchievements, type GamificationPayload } from "./api";
import { AchievementCard } from "./components/AchievementCard";

type AchievementsOverviewPageProps = {
  fetcher?: () => Promise<GamificationPayload>;
};

export function AchievementsOverviewPage({
  fetcher = fetchGamificationSnapshot,
}: AchievementsOverviewPageProps) {
  const t = useTranslations("gamification");
  const { currentTenant } = useTenant();
  const [data, setData] = useState<GamificationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [isSavingPins, setIsSavingPins] = useState(false);

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
        if (isMounted) setError("Kunde inte ladda utmärkelser just nu.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [fetcher]);

  useEffect(() => {
    let isMounted = true;
    const loadPins = async () => {
      if (!currentTenant?.id) return;
      try {
        const pins = await fetchPinnedAchievements(currentTenant.id);
        if (!isMounted) return;
        setPinnedIds(pins.pinnedIds ?? []);
      } catch {
        if (!isMounted) return;
        setPinnedIds([]);
      }
    };

    loadPins();
    return () => {
      isMounted = false;
    };
  }, [currentTenant?.id]);

  const unlockedCount = useMemo(
    () => data?.achievements.filter((a) => a.status === "unlocked").length ?? 0,
    [data]
  );

  const canPinMore = pinnedIds.length < 3;

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
            .catch(() => setError("Kunde inte ladda utmärkelser just nu."))
            .finally(() => setIsLoading(false));
        }}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 pb-32">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-40" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center gap-3">
        <Link
          href="/app/gamification"
          className="rounded-full p-2 hover:bg-muted transition-colors"
          aria-label="Tillbaka"
        >
          <ArrowLeftIcon className="h-5 w-5 text-foreground" />
        </Link>
        <div className="flex-1">
          <PageTitleHeader icon={dicecoinIcon} title={t("achievementsTitle")} subtitle={t("achievementsSubtitle")} />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t("overview")}</h2>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {unlockedCount}/{data.achievements.length}
          </span>
        </div>

        {data.achievements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center">
            <TrophyIcon className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">{t("noAchievementsYet")}</p>
            <p className="text-xs text-muted-foreground/70">
              {t("playToUnlock")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {data.achievements.map((achievement) => (
              <div key={achievement.id} className="space-y-2">
                <AchievementCard achievement={achievement} />

                {achievement.status === "unlocked" && currentTenant?.id ? (
                  <div className="flex items-center justify-center">
                    <Button
                      variant={pinnedIds.includes(achievement.id) ? "primary" : "outline"}
                      size="sm"
                      disabled={isSavingPins || (!pinnedIds.includes(achievement.id) && !canPinMore)}
                      loading={isSavingPins}
                      onClick={async () => {
                        if (!currentTenant?.id) return;
                        const isPinned = pinnedIds.includes(achievement.id);
                        const next = isPinned
                          ? pinnedIds.filter((id) => id !== achievement.id)
                          : [...pinnedIds, achievement.id].slice(0, 3);

                        setIsSavingPins(true);
                        try {
                          const saved = await savePinnedAchievements({
                            tenantId: currentTenant.id,
                            achievementIds: next,
                          });
                          setPinnedIds(saved.pinnedIds);
                        } catch {
                          // keep local state unchanged
                        } finally {
                          setIsSavingPins(false);
                        }
                      }}
                    >
                      {pinnedIds.includes(achievement.id) ? "Visas på dashboard" : "Visa på dashboard"}
                    </Button>
                  </div>
                ) : null}

                {achievement.status === "locked" && !achievement.isEasterEgg && (achievement.hintText ?? achievement.requirement) ? (
                  <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                    {achievement.hintText ?? achievement.requirement}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
