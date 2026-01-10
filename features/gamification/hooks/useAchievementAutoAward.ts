'use client';

import { useCallback, useRef } from 'react';
import { useAchievementNotifications } from './useAchievementNotifications';
import type { AchievementNotificationData } from '../components/AchievementNotification';

type AchievementCheckTrigger =
  | 'game_completed'
  | 'streak_updated'
  | 'coins_earned'
  | 'level_up'
  | 'first_login'
  | 'profile_completed'
  | 'custom';

interface UserStats {
  totalGames?: number;
  totalScore?: number;
  bestScore?: number;
  sessionCount?: number;
}

interface AchievementCheckResponse {
  success: boolean;
  trigger: string;
  unlockedCount: number;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    iconUrl: string | null;
    points: number;
    unlockedAt: string;
  }>;
}

interface UseAchievementAutoAwardOptions {
  /** User ID for notification namespace */
  userId?: string | null;
  /** Tenant ID for notification namespace */
  tenantId?: string | null;
  /** Callback when achievements are unlocked */
  onUnlock?: (achievements: AchievementNotificationData[]) => void;
  /** Whether to show notifications (default: true) */
  showNotifications?: boolean;
}

/**
 * Hook for automatically checking and awarding achievements.
 * Integrates with the achievement notification system.
 * 
 * @example
 * ```tsx
 * const { checkAchievements, current, dismiss, isChecking } = useAchievementAutoAward({
 *   userId: user?.id,
 *   tenantId: activeTenantId,
 * });
 * 
 * // After game completion:
 * await checkAchievements('game_completed', { totalGames: 10, bestScore: 500 });
 * ```
 */
export function useAchievementAutoAward(options: UseAchievementAutoAwardOptions = {}) {
  const { userId, tenantId, onUnlock, showNotifications = true } = options;
  const isCheckingRef = useRef(false);

  const notifications = useAchievementNotifications({ userId, tenantId });

  /**
   * Check for achievements based on trigger and stats.
   * Automatically queues notifications for any newly unlocked achievements.
   */
  const checkAchievements = useCallback(
    async (trigger: AchievementCheckTrigger, stats?: UserStats): Promise<AchievementNotificationData[]> => {
      if (isCheckingRef.current) {
        console.warn('[useAchievementAutoAward] Check already in progress, skipping');
        return [];
      }

      isCheckingRef.current = true;

      try {
        const response = await fetch('/api/gamification/achievements/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger, stats }),
        });

        if (!response.ok) {
          console.error('[useAchievementAutoAward] Check failed:', response.status);
          return [];
        }

        const data: AchievementCheckResponse = await response.json();

        if (data.unlockedCount > 0) {
          const notificationData: AchievementNotificationData[] = data.achievements.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            iconUrl: a.iconUrl,
            points: a.points,
          }));

          // Queue notifications if enabled
          if (showNotifications) {
            notifications.queueAchievements(notificationData);
          }

          // Call optional callback
          onUnlock?.(notificationData);

          return notificationData;
        }

        return [];
      } catch (error) {
        console.error('[useAchievementAutoAward] Error checking achievements:', error);
        return [];
      } finally {
        isCheckingRef.current = false;
      }
    },
    [notifications, onUnlock, showNotifications]
  );

  /**
   * Directly unlock a specific achievement by ID.
   */
  const unlockAchievement = useCallback(
    async (
      achievementId: string,
      context?: { gameId?: string; sessionId?: string; metadata?: Record<string, unknown> }
    ): Promise<AchievementNotificationData | null> => {
      try {
        const response = await fetch('/api/gamification/achievements/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievementId, context }),
        });

        if (!response.ok) {
          console.error('[useAchievementAutoAward] Unlock failed:', response.status);
          return null;
        }

        const data = await response.json();

        if (data.success && !data.alreadyUnlocked) {
          const notificationData: AchievementNotificationData = {
            id: data.achievement.id,
            name: data.achievement.name,
            description: data.achievement.description,
            iconUrl: data.achievement.iconUrl,
            points: data.achievement.points,
          };

          // Queue notification if enabled
          if (showNotifications) {
            notifications.queueAchievement(notificationData);
          }

          onUnlock?.([notificationData]);

          return notificationData;
        }

        return null;
      } catch (error) {
        console.error('[useAchievementAutoAward] Error unlocking achievement:', error);
        return null;
      }
    },
    [notifications, onUnlock, showNotifications]
  );

  return {
    // Methods
    checkAchievements,
    unlockAchievement,
    // Notification state (passthrough)
    current: notifications.current,
    dismiss: notifications.dismiss,
    clearQueue: notifications.clearQueue,
    pendingCount: notifications.pendingCount,
    // Status
    isChecking: isCheckingRef.current,
  };
}

export default useAchievementAutoAward;
