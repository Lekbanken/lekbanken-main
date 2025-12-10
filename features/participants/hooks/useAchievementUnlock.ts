/**
 * useAchievementUnlock Hook
 * 
 * Handles achievement unlocking for participants
 */

import { useState, useCallback } from 'react';

interface UnlockAchievementOptions {
  achievement_id: string;
  game_id?: string;
  unlock_context?: Record<string, unknown>;
}

interface UseAchievementUnlockOptions {
  participantToken: string;
  onSuccess?: (achievement: unknown) => void;
  onError?: (error: string) => void;
}

export function useAchievementUnlock({
  participantToken,
  onSuccess,
  onError,
}: UseAchievementUnlockOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlockAchievement = useCallback(async (options: UnlockAchievementOptions) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/participants/progress/unlock-achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          ...options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Don't treat already unlocked as error
        if (data.already_unlocked) {
          return null;
        }
        throw new Error(data.error || 'Failed to unlock achievement');
      }

      onSuccess?.(data.achievement);
      return data.achievement;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [participantToken, onSuccess, onError]);

  return {
    loading,
    error,
    unlockAchievement,
  };
}
