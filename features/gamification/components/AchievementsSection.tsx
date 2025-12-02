import Link from "next/link";
import { TrophyIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { AchievementCard } from "./AchievementCard";
import type { Achievement } from "../types";

type AchievementsSectionProps = {
  achievements: Achievement[];
};

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  const unlocked = achievements.filter((a) => a.status === "unlocked").length;

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrophyIcon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Achievements</h2>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {unlocked}/{achievements.length}
        </span>
      </div>

      {/* Achievement Grid */}
      {achievements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center">
          <TrophyIcon className="mb-2 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Inga achievements ännu</p>
          <p className="text-xs text-muted-foreground/70">
            Spela och planera för att börja tjäna badges.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {achievements.slice(0, 6).map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}

      {/* View All Link */}
      {achievements.length > 6 && (
        <Link
          href="/app/profile/achievements"
          className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Visa alla achievements
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}
