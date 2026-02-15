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

      {/* Hero Badge — centered showcase (like Journey sandbox) */}
      {heroBadge && (
        <div
          className="relative flex flex-col items-center pt-10 pb-8 mb-2 rounded-2xl overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.04) 0%, transparent 70%)",
          }}
        >
          {/* Ambient radial glow behind badge */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full ach-hero-glow pointer-events-none"
            style={{
              background: "radial-gradient(circle, var(--journey-accent, #8661ff)35 0%, var(--journey-accent, #8661ff)12 40%, transparent 70%)",
            }}
          />

          {/* Sparkle orbs */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            {[
              { left: "35%", top: "15%", size: 4, delay: 0 },
              { left: "65%", top: "70%", size: 3, delay: 0.6 },
              { left: "25%", top: "55%", size: 3.5, delay: 1.2 },
              { left: "70%", top: "25%", size: 2.5, delay: 1.8 },
            ].map((s, i) => (
              <span
                key={i}
                className={`absolute rounded-full ach-sparkle-${i}`}
                style={{
                  left: s.left,
                  top: s.top,
                  width: s.size,
                  height: s.size,
                  backgroundColor: "var(--journey-accent, #8661ff)",
                  boxShadow: "0 0 4px var(--journey-accent, #8661ff)",
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>

          {/* The badge — big, no box border, center stage */}
          <div className="relative transition-transform duration-300 hover:scale-110">
            <BadgeIcon iconConfig={heroBadge.icon_config} size="lg" showGlow />
          </div>

          {/* Name + description */}
          <div className="mt-4 text-center relative z-10">
            <h4 className="text-base font-bold text-white">{heroBadge.name}</h4>
            <p className="text-xs mt-0.5 text-white/50">{heroBadge.description}</p>
          </div>

          {/* Earned date pill */}
          {heroBadge.unlockedAt && (
            <p className="mt-2 text-[10px] text-[var(--journey-accent)]/70 uppercase tracking-wide relative z-10">
              {t("unlockedDate", { date: new Date(heroBadge.unlockedAt).toLocaleDateString("sv-SE") })}
            </p>
          )}

          <style jsx>{`
            @keyframes ach-hero-glow {
              0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
              50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.8; }
            }
            @keyframes ach-sparkle {
              0%, 100% { opacity: 0; transform: scale(0.5); }
              50% { opacity: 1; transform: scale(1); }
            }
            .ach-hero-glow { animation: ach-hero-glow 3s ease-in-out infinite; }
            .ach-sparkle-0 { animation: ach-sparkle 2.4s ease-in-out infinite; }
            .ach-sparkle-1 { animation: ach-sparkle 2.8s ease-in-out infinite; }
            .ach-sparkle-2 { animation: ach-sparkle 3.2s ease-in-out infinite; }
            .ach-sparkle-3 { animation: ach-sparkle 2.6s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) {
              .ach-hero-glow, .ach-sparkle-0, .ach-sparkle-1, .ach-sparkle-2, .ach-sparkle-3 {
                animation: none !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* Achievement Grid — 3 columns like sandbox */}
      {achievements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
          <TrophyEmptyIcon className="mb-2 h-10 w-10 text-white/20" />
          <p className="text-sm font-medium text-white/60">{t("noAchievementsYet")}</p>
          <p className="text-xs text-white/40">
            {t("playToEarnBadges")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
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
