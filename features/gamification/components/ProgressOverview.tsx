'use client';

import { StarIcon } from "@heroicons/react/24/solid";
import type { ProgressSnapshot, CoinsSummary, StreakSummary } from "../types";

type ProgressOverviewProps = {
  progress: ProgressSnapshot;
  coins: CoinsSummary;
  streak: StreakSummary;
};

export function ProgressOverview({ progress, coins, streak }: ProgressOverviewProps) {
  const xpPercent = Math.min(100, Math.round((progress.currentXp / progress.nextLevelXp) * 100));
  const nearLevelUp = xpPercent >= 80;
  
  // Level names based on level number
  const levelNames: Record<number, string> = {
    1: "Nybörjare",
    2: "Lekentusiast",
    3: "Lekvän",
    4: "Lekare",
    5: "Lekledare",
    6: "Lekmästare",
    7: "Lekexpert",
    8: "Lekguru",
    9: "Leklegend",
    10: "Lekikon",
  };
  const levelName = levelNames[progress.level] || `Level ${progress.level}`;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-border/50 p-5 shadow-lg">
      {/* Level Badge */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1">
          <StarIcon className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold text-primary">LEVEL {progress.level}</span>
        </div>
      </div>
      
      {/* Level Name */}
      <p className="mt-2 text-xl font-bold text-foreground">
        {levelName}
      </p>

      {/* XP Progress Bar */}
      <div className="mt-4">
        <div className={`h-3 w-full overflow-hidden rounded-full bg-muted ${
          nearLevelUp ? "shadow-[0_0_12px_rgba(134,97,255,0.4)]" : ""
        }`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
            aria-hidden
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          {progress.currentXp.toLocaleString()} / {progress.nextLevelXp.toLocaleString()} XP
        </p>
      </div>

      {/* Stats Row */}
      <div className="mt-4 flex gap-3">
        <StatPill icon="🏆" value={progress.completedAchievements} label="Badges" />
        <StatPill icon="🪙" value={coins.balance.toLocaleString()} label="Mynt" />
        <StatPill icon="🔥" value={streak.currentStreakDays} label="Streak" />
      </div>

      {/* Next Reward Hint */}
      {progress.nextReward && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
          <span className="text-sm">✨</span>
          <p className="text-xs text-muted-foreground">
            Nästa: <span className="font-semibold text-foreground">"{progress.nextReward}"</span>
            <span className="ml-1 text-primary font-medium">
              → {progress.nextLevelXp - progress.currentXp} XP kvar
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center rounded-2xl bg-card border border-border/50 py-3 px-2">
      <span className="text-xl mb-1">{icon}</span>
      <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
