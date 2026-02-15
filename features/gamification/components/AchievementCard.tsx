'use client';

import { useState } from 'react';
import { CheckIcon, LockClosedIcon } from "@heroicons/react/24/solid";
import type { Achievement } from "../types";
import { BadgeIcon } from "./BadgeIcon";
import { AchievementDetailModal } from "./AchievementDetailModal";

type AchievementCardProps = {
  achievement: Achievement;
  variant?: "standard" | "journey";
};

export function AchievementCard({ achievement, variant = "standard" }: AchievementCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const progress = Math.min(100, Math.max(0, achievement.progress ?? 0));
  const isUnlocked = achievement.status === "unlocked";
  const isInProgress = achievement.status === "in_progress";
  const isLocked = achievement.status === "locked";

  const displayName = isLocked ? "???" : achievement.name;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        aria-label={isLocked ? "Locked achievement" : achievement.name}
        className={`relative flex flex-col items-center rounded-2xl p-4 text-center transition-all min-h-[140px] w-full hover:scale-105 active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--journey-accent,#8661ff)]/60 ${
          variant === "journey"
            ? isUnlocked
              ? "bg-white/10 border border-white/20 shadow-sm hover:shadow-md backdrop-blur-sm"
              : isInProgress
              ? "bg-white/5 border-2 border-[var(--journey-accent)]/30 hover:border-[var(--journey-accent)]/50 backdrop-blur-sm"
              : "bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] backdrop-blur-sm"
            : isUnlocked
              ? "bg-card border border-border/50 shadow-sm hover:shadow-md"
              : isInProgress
              ? "bg-card border-2 border-primary/30 hover:border-primary/50"
              : "bg-muted/30 border border-border/30 hover:bg-muted/50"
        }`}
      >
        {/* Status Badge - Top Right */}
        {isUnlocked && (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
            <CheckIcon className="h-3 w-3" />
          </div>
        )}

        {/* Badge Area - Using proper BadgeIcon */}
        <div className="mb-2">
          <BadgeIcon 
            iconConfig={achievement.icon_config}
            size="sm"
            showGlow={isUnlocked}
            isLocked={isLocked}
          />
        </div>

        {/* Name */}
        <p
          className={`text-xs font-semibold line-clamp-2 ${
            variant === "journey"
              ? isLocked ? "text-white/30" : "text-white/90"
              : isLocked ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {displayName}
        </p>

        {/* Status Indicator */}
        {isInProgress && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className={`h-1.5 w-16 overflow-hidden rounded-full ${variant === "journey" ? "bg-white/10" : "bg-muted"}`}>
              <div
                className={`h-full rounded-full ${variant === "journey" ? "bg-[var(--journey-accent)]" : "bg-primary"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium tabular-nums ${variant === "journey" ? "text-[var(--journey-accent)]" : "text-primary"}`}>
              {progress}%
            </span>
          </div>
        )}

        {isLocked && (
          <div className="mt-2">
            <LockClosedIcon className={`h-4 w-4 ${variant === "journey" ? "text-white/20" : "text-muted-foreground/50"}`} />
          </div>
        )}
      </button>

      {/* Detail Modal */}
      <AchievementDetailModal 
        achievement={achievement}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
