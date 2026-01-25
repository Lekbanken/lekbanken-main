'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  getUserAchievementProgress,
  type AchievementProgress,
} from '@/lib/services/achievementService';
import AchievementBadge from '@/components/AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ClockIcon } from '@heroicons/react/24/outline';

interface AchievementHistoryProps {
  /** User ID to fetch achievements for */
  userId: string;
  /** Maximum number of recent achievements to display (default: 5) */
  maxDisplay?: number;
  /** Title for the component (default: "Senaste prestationer") */
  title?: string;
  /** Whether to show as a compact list (default: false) */
  compact?: boolean;
}

/**
 * Achievement history component showing recent unlocks.
 * Can be used in inbox, notifications, or profile sections.
 */
export function AchievementHistory({
  userId,
  maxDisplay = 5,
  title = 'Senaste prestationer',
  compact = false,
}: AchievementHistoryProps) {
  const [recentAchievements, setRecentAchievements] = useState<AchievementProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('profile');

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadRecentAchievements = async () => {
      try {
        setIsLoading(true);
        const progress = await getUserAchievementProgress(userId);
        
        // Filter to unlocked only and sort by unlock date (most recent first)
        const unlocked = progress
          .filter((a) => a.isUnlocked && a.unlockedAt)
          .sort((a, b) => {
            const dateA = new Date(a.unlockedAt!).getTime();
            const dateB = new Date(b.unlockedAt!).getTime();
            return dateB - dateA;
          })
          .slice(0, maxDisplay);

        setRecentAchievements(unlocked);
      } catch (err) {
        console.error('Error loading achievement history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void loadRecentAchievements();
  }, [userId, maxDisplay]);

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just nu';
    if (diffMinutes < 60) return `${diffMinutes} min sedan`;
    if (diffHours < 24) return `${diffHours} tim sedan`;
    if (diffDays === 1) return 'Igår';
    if (diffDays < 7) return `${diffDays} dagar sedan`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} veckor sedan`;
    
    return date.toLocaleDateString('sv-SE', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClockIcon className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentAchievements.length === 0) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClockIcon className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('achievements.noUnlockedYet')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClockIcon className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : undefined}>
        <ul className="space-y-3">
          {recentAchievements.map((item) => (
            <li
              key={item.achievement.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-2"
            >
              <AchievementBadge
                achievement={item.achievement}
                isUnlocked={true}
                size="sm"
                showLabel={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {item.achievement.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.achievement.description}
                </p>
              </div>
              <div className="flex flex-col items-end text-xs text-muted-foreground">
                <span>{formatRelativeTime(item.unlockedAt!)}</span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default AchievementHistory;
