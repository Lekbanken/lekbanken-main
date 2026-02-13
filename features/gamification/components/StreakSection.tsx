import Image from "next/image";
import { useTranslations } from "next-intl";
import type { StreakSummary } from "../types";
import { useCountUp } from "../hooks/useCountUp";

type StreakSectionProps = {
  streak: StreakSummary;
};

const weekDays = ["M", "T", "O", "T", "F", "L", "S"];

export function StreakSection({ streak }: StreakSectionProps) {
  const t = useTranslations("gamification");
  const today = new Date().getDay();
  const adjustedToday = today === 0 ? 6 : today - 1;
  const animatedStreak = useCountUp(streak.currentStreakDays, 600);

  const activeDays = weekDays.map((_, index) => {
    const daysAgo = adjustedToday - index;
    return daysAgo >= 0 && daysAgo < streak.currentStreakDays;
  });

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Image src="/icons/journey/streak_webp.webp" alt="" width={22} height={22} />
        <h2 className="text-sm font-semibold text-white">{t("streak.yourStreak")}</h2>
      </div>

      {/* Streak Cards Row */}
      <div className="flex gap-3">
        {/* Current Streak - Hero */}
        <div className="relative flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm overflow-hidden">
          {/* Warm ambient glow (static, no keyframe) */}
          <div
            className="absolute left-1/2 top-6 -translate-x-1/2 w-24 h-24 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, #f5962335 0%, #f5962318 40%, transparent 70%)",
            }}
          />
          <Image src="/icons/journey/streak_webp.webp" alt="Streak" width={48} height={48} className="relative mx-auto mb-1 drop-shadow-[0_0_12px_rgba(245,150,35,0.5)]" />
          <p className="relative text-4xl font-bold text-white">{animatedStreak}</p>
          <p className="relative text-sm text-white/50">{t("streak.daysInARow")}</p>
        </div>

        {/* Side Stats */}
        <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 backdrop-blur-sm">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">{t("streak.best")}:</span>
            <span className="font-semibold text-white">{streak.bestStreakDays} {t("streak.days")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">{t("streak.lastActive")}:</span>
            <span className="font-semibold text-white">{streak.lastActiveDate}</span>
          </div>
        </div>
      </div>

      {/* Week Visualization */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-3">
          {t("streak.thisWeek")}
        </p>
        <div className="flex justify-between px-2">
          {weekDays.map((day, index) => {
            const isActive = activeDays[index];
            const isToday = index === adjustedToday;

            return (
              <div key={`${day}-${index}`} className="flex flex-col items-center">
                <span className="text-[10px] text-white/40 mb-1">{day}</span>
                <div
                  className={`h-4 w-4 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)] scale-110"
                      : "bg-white/10"
                  } ${
                    isToday
                      ? isActive
                        ? "ring-2 ring-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.6)] scale-125"
                        : "ring-2 ring-[var(--journey-accent)] shadow-[0_0_8px_var(--journey-glow)]"
                      : ""
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
