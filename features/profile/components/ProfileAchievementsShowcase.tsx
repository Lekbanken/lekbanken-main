'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getUserAchievementProgress,
  type AchievementProgress,
} from '@/lib/services/achievementService';
import AchievementBadge from '@/components/AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { TrophyIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface ProfileAchievementsShowcaseProps {
  /** User ID to fetch achievements for */
  userId: string;
  /** Maximum number of achievements to display (default: 6) */
  maxDisplay?: number;
  /** Whether to show locked achievements in the showcase */
  showLocked?: boolean;
}

/**
 * Achievements showcase component for the profile page.
 * Shows a preview of the user's achievements with a link to the full page.
 */
export function ProfileAchievementsShowcase({
  userId,
  maxDisplay = 6,
  showLocked = false,
}: ProfileAchievementsShowcaseProps) {
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadAchievements = async () => {
      try {
        setIsLoading(true);
        const progress = await getUserAchievementProgress(userId);
        setAchievements(progress);
      } catch (err) {
        console.error('Error loading achievements for showcase:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void loadAchievements();
  }, [userId]);

  // Get the achievements to display:
  // - Prioritize recently unlocked
  // - Then show some locked ones if enabled
  const displayAchievements = (() => {
    const unlocked = achievements
      .filter((a) => a.isUnlocked)
      .sort((a, b) => {
        // Sort by unlocked date, most recent first
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      });

    if (unlocked.length >= maxDisplay || !showLocked) {
      return unlocked.slice(0, maxDisplay);
    }

    // Fill remaining slots with locked achievements
    const locked = achievements.filter((a) => !a.isUnlocked);
    const remaining = maxDisplay - unlocked.length;
    return [...unlocked, ...locked.slice(0, remaining)];
  })();

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-amber-500" />
            Prestationer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-amber-500" />
            Prestationer
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Inga prestationer tillgängliga ännu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-amber-500" />
            Prestationer
          </CardTitle>
          <Link
            href="/app/profile/achievements"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Visa alla
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {unlockedCount} av {totalCount} upplåsta
            </span>
            <span className="font-semibold text-foreground">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Badges grid */}
        <div className="grid grid-cols-6 gap-2">
          {displayAchievements.map((item) => (
            <div key={item.achievement.id} className="flex justify-center">
              <AchievementBadge
                achievement={item.achievement}
                isUnlocked={item.isUnlocked}
                unlockedAt={item.unlockedAt}
                size="md"
                showLabel={false}
              />
            </div>
          ))}
        </div>

        {/* Recent unlock message */}
        {displayAchievements.some((a) => a.isUnlocked) && (
          <div className="text-center text-xs text-muted-foreground">
            Klicka på ett märke för att se detaljer
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProfileAchievementsShowcase;
