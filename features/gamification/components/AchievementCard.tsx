import { CheckIcon, LockClosedIcon } from "@heroicons/react/24/solid";
import type { Achievement } from "../types";

type AchievementCardProps = {
  achievement: Achievement;
};

export function AchievementCard({ achievement }: AchievementCardProps) {
  const progress = Math.min(100, Math.max(0, achievement.progress ?? 0));
  const isUnlocked = achievement.status === "unlocked";
  const isInProgress = achievement.status === "in_progress";
  const isLocked = achievement.status === "locked";

  const displayName = isLocked ? "???" : achievement.name;

  // Fallback icon - use emoji or first letter
  const displayIcon = isLocked ? "❓" : achievement.icon || achievement.name.charAt(0).toUpperCase();

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl p-4 text-center transition-all min-h-[130px] ${
        isUnlocked
          ? "bg-card border border-border/50 shadow-sm"
          : isInProgress
          ? "bg-card border-2 border-primary/30"
          : "bg-muted/30 border border-border/30"
      }`}
    >
      {/* Status Badge - Top Right */}
      {isUnlocked && (
        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
          <CheckIcon className="h-3 w-3" />
        </div>
      )}

      {/* Badge Area */}
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl mb-2 ${
          isUnlocked
            ? "bg-gradient-to-br from-primary/20 to-accent/20 ring-2 ring-primary/20"
            : isInProgress
            ? "bg-primary/10 opacity-80"
            : "bg-muted grayscale opacity-40"
        }`}
      >
        <span className="text-2xl">{displayIcon}</span>
      </div>

      {/* Name */}
      <p
        className={`text-xs font-semibold line-clamp-2 ${
          isLocked ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {displayName}
      </p>

      {/* Status Indicator */}
      {isInProgress && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-primary tabular-nums">
            {progress}%
          </span>
        </div>
      )}

      {isLocked && (
        <div className="mt-2">
          <LockClosedIcon className="h-4 w-4 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}
