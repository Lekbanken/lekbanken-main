/**
 * useParticipantProgress Hook
 * 
 * Manages game progress updates for participants
 */

import { useState, useCallback } from 'react';

interface ProgressUpdate {
  game_id: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'failed';
  score?: number;
  max_score?: number;
  progress_percentage?: number;
  time_spent_seconds?: number;
  current_level?: number;
  current_checkpoint?: string;
  game_data?: Record<string, unknown>;
}

interface UseParticipantProgressOptions {
  participantToken: string;
  onSuccess?: (progress: unknown) => void;
  onError?: (error: string) => void;
}

export function useParticipantProgress({
  participantToken,
  onSuccess,
  onError,
}: UseParticipantProgressOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProgress = useCallback(async (updates: ProgressUpdate) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/participants/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_token: participantToken,
          ...updates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update progress');
      }

      onSuccess?.(data.progress);
      return data.progress;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [participantToken, onSuccess, onError]);

  const startGame = useCallback(async (gameId: string) => {
    return updateProgress({
      game_id: gameId,
      status: 'in_progress',
      progress_percentage: 0,
      score: 0,
    });
  }, [updateProgress]);

  const updateScore = useCallback(async (gameId: string, score: number, maxScore?: number) => {
    return updateProgress({
      game_id: gameId,
      score,
      max_score: maxScore,
    });
  }, [updateProgress]);

  const updateProgressPercentage = useCallback(async (
    gameId: string,
    percentage: number
  ) => {
    return updateProgress({
      game_id: gameId,
      progress_percentage: Math.min(100, Math.max(0, percentage)),
    });
  }, [updateProgress]);

  const completeGame = useCallback(async (
    gameId: string,
    finalScore?: number,
    timeSpent?: number
  ) => {
    return updateProgress({
      game_id: gameId,
      status: 'completed',
      progress_percentage: 100,
      score: finalScore,
      time_spent_seconds: timeSpent,
    });
  }, [updateProgress]);

  const failGame = useCallback(async (gameId: string) => {
    return updateProgress({
      game_id: gameId,
      status: 'failed',
    });
  }, [updateProgress]);

  return {
    loading,
    error,
    updateProgress,
    startGame,
    updateScore,
    updateProgressPercentage,
    completeGame,
    failGame,
  };
}
