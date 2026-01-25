import { useTranslations } from "next-intl";
import type { StreakSummary } from "../types";

type StreakSectionProps = {
  streak: StreakSummary;
};

const weekDays = ["M", "T", "O", "T", "F", "L", "S"];

export function StreakSection({ streak }: StreakSectionProps) {
  const t = useTranslations("gamification");
  // Simple calculation: assume today is last active day and count back
  const today = new Date().getDay(); // 0 = Sunday
  const adjustedToday = today === 0 ? 6 : today - 1; // 0 = Monday
  
  // Mark days as active based on current streak
  const activeDays = weekDays.map((_, index) => {
    const daysAgo = adjustedToday - index;
    return daysAgo >= 0 && daysAgo < streak.currentStreakDays;
  });

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl animate-bounce">🔥</span>
        <h2 className="text-sm font-semibold text-foreground">{t("streak.yourStreak")}</h2>
      </div>

      {/* Streak Cards Row */}
      <div className="flex gap-3">
        {/* Current Streak - Hero */}
        <div className="flex-1 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 p-5 text-center">
          <span className="text-3xl mb-1 block">🔥</span>
          <p className="text-4xl font-bold text-foreground">{streak.currentStreakDays}</p>
          <p className="text-sm text-muted-foreground">{t("streak.daysInARow")}</p>
        </div>

        {/* Side Stats */}
        <div className="flex-1 rounded-2xl bg-card border border-border/50 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("streak.best")}:</span>
            <span className="font-semibold text-foreground">{streak.bestStreakDays} {t("streak.days")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("streak.lastActive")}:</span>
            <span className="font-semibold text-foreground">{streak.lastActiveDate}</span>
          </div>
        </div>
      </div>

      {/* Week Visualization */}
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("streak.thisWeek")}
        </p>
        <div className="flex justify-between px-2">
          {weekDays.map((day, index) => {
            const isActive = activeDays[index];
            const isToday = index === adjustedToday;
            
            return (
              <div key={`${day}-${index}`} className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground mb-1">{day}</span>
                <div
                  className={`h-4 w-4 rounded-full transition-all ${
                    isActive
                      ? "bg-emerald-500"
                      : "bg-muted"
                  } ${
                    isToday && !isActive ? "ring-2 ring-primary" : ""
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
