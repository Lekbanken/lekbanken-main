import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { AchievementCard } from "./AchievementCard";
import { BadgeIcon } from "./BadgeIcon";
import type { Achievement } from "../types";

type AchievementsSectionProps = {
  achievements: Achievement[];
};

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  const t = useTranslations("gamification");
  const unlocked = achievements.filter((a) => a.status === "unlocked").length;

  // Hero badge — most recently unlocked achievement
  const heroBadge = useMemo(() => {
    const unlockedList = achievements
      .filter((a) => a.status === "unlocked" && a.unlockedAt)
      .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime());
    return unlockedList[0] ?? null;
  }, [achievements]);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/icons/journey/utmarkelser_v2_webp.webp" alt="" width={22} height={22} />
          <h2 className="text-sm font-semibold text-white">{t("achievements")}</h2>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
          {unlocked}/{achievements.length}
        </span>
      </div>

      {/* Hero Badge (most recently unlocked) */}
      {heroBadge && (
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <BadgeIcon iconConfig={heroBadge.icon_config} size="md" showGlow />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--journey-accent)] uppercase tracking-wide">
              Senast upplåst
            </p>
            <p className="text-sm font-semibold text-white truncate">{heroBadge.name}</p>
            <p className="text-xs text-white/50 truncate">{heroBadge.description}</p>
          </div>
        </div>
      )}

      {/* Achievement Grid */}
      {achievements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
          <TrophyEmptyIcon className="mb-2 h-10 w-10 text-white/20" />
          <p className="text-sm font-medium text-white/60">{t("noAchievementsYet")}</p>
          <p className="text-xs text-white/40">
            {t("playToEarnBadges")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {achievements.slice(0, 6).map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} variant="journey" />
          ))}
        </div>
      )}

      {/* View All Link */}
      <Link
        href="/app/gamification/achievements"
        className="flex items-center justify-center gap-1 text-sm font-medium text-[var(--journey-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--journey-accent,#8661ff)]/60 rounded-lg px-2 py-1"
      >
        {t("viewAllAchievements")}
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </section>
  );
}

/** Simple trophy SVG for empty state */
function TrophyEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 21h8M12 17v4M6 3h12l-1 10a5 5 0 0 1-10 0L6 3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 3H3v3a3 3 0 0 0 3 3M18 3h3v3a3 3 0 0 1-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
