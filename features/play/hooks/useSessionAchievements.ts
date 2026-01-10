'use client';

import { useEffect, useRef } from 'react';
import { useAchievementAutoAward } from '@/features/gamification/hooks/useAchievementAutoAward';

type SessionStatus = 'active' | 'paused' | 'ended' | 'cancelled' | string;

interface UseSessionAchievementsOptions {
  /** Session ID */
  sessionId: string;
  /** Current session status */
  status: SessionStatus;
  /** User ID (for authenticated users, null for guests) */
  userId?: string | null;
  /** Tenant ID */
  tenantId?: string | null;
  /** Whether achievements are enabled */
  enabled?: boolean;
  /** Session metadata for achievement context */
  context?: {
    gameId?: string;
    gameTitle?: string;
    role?: string;
    participantId?: string;
  };
}

/**
 * Hook that triggers achievement checks when a session ends.
 * 
 * @example
 * ```tsx
 * // In ParticipantPlayView or similar:
 * useSessionAchievements({
 *   sessionId,
 *   status, // from useLiveSession
 *   userId: user?.id,
 *   tenantId,
 *   context: { gameId, gameTitle, role: role?.name },
 * });
 * ```
 */
export function useSessionAchievements({
  sessionId,
  status,
  userId,
  tenantId,
  enabled = true,
  context,
}: UseSessionAchievementsOptions) {
  // Track previous status to detect transition to 'ended'
  const prevStatusRef = useRef<SessionStatus | null>(null);
  const hasTriggeredRef = useRef(false);

  const { checkAchievements, current, dismiss, pendingCount } = useAchievementAutoAward({
    userId,
    tenantId,
    showNotifications: true,
  });

  useEffect(() => {
    // Skip if disabled or no user (guest participants)
    if (!enabled || !userId) {
      prevStatusRef.current = status;
      return;
    }

    // Detect transition to 'ended' (normal completion)
    const isEnding = status === 'ended';
    const wasNotEnded = prevStatusRef.current !== 'ended' && prevStatusRef.current !== 'cancelled';
    const shouldTrigger = isEnding && wasNotEnded && !hasTriggeredRef.current;

    if (shouldTrigger) {
      hasTriggeredRef.current = true;
      
      // Trigger achievement check with game_completed trigger
      void checkAchievements('game_completed', {
        // Stats will be computed server-side in production
        // Client stats are for prototype only
        totalGames: 1, // Placeholder - server should compute
        sessionCount: 1, // Placeholder - server should compute
      });

      console.log('[useSessionAchievements] Session completed, checking achievements', {
        sessionId,
        context,
      });
    }

    prevStatusRef.current = status;
  }, [status, enabled, userId, sessionId, context, checkAchievements]);

  // Reset triggered flag when session changes
  useEffect(() => {
    hasTriggeredRef.current = false;
    prevStatusRef.current = null;
  }, [sessionId]);

  return {
    /** Currently displayed achievement notification */
    currentNotification: current,
    /** Dismiss the current notification */
    dismissNotification: dismiss,
    /** Number of pending notifications */
    pendingCount,
  };
}

export default useSessionAchievements;
