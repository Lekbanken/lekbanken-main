'use client';

/**
 * useGameReaction Hook
 *
 * Manages game reaction state with optimistic updates.
 * Provides toggle functionality with automatic rollback on error.
 *
 * @example
 * ```tsx
 * const { isLiked, isLoading, toggleLike } = useGameReaction({
 *   gameId: 'abc-123',
 *   initialReaction: 'like',
 * });
 * ```
 */

import { useState, useCallback, useTransition } from 'react';
import { toggleLike as toggleLikeAction, setReaction as setReactionAction } from '@/app/actions/game-reactions';
import type { ReactionType } from '@/types/game-reaction';

// =============================================================================
// TYPES
// =============================================================================

export interface UseGameReactionOptions {
  /** Game ID to manage reaction for */
  gameId: string;
  /** Initial reaction state (from server) */
  initialReaction?: ReactionType | null;
  /** Callback when reaction changes */
  onReactionChange?: (reaction: ReactionType | null) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseGameReactionResult {
  /** Current reaction state */
  reaction: ReactionType | null;
  /** Is the game liked */
  isLiked: boolean;
  /** Is the game disliked */
  isDisliked: boolean;
  /** Is a request in progress */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Toggle like (like ↔ neutral) */
  toggleLike: () => void;
  /** Set specific reaction or clear */
  setReaction: (reaction: ReactionType | null) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useGameReaction({
  gameId,
  initialReaction = null,
  onReactionChange,
  onError,
}: UseGameReactionOptions): UseGameReactionResult {
  // State
  const [reaction, setReactionState] = useState<ReactionType | null>(initialReaction);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Derived state
  const isLiked = reaction === 'like';
  const isDisliked = reaction === 'dislike';

  /**
   * Toggle like with optimistic update
   */
  const toggleLike = useCallback(() => {
    // Store previous state for rollback
    const previousReaction = reaction;

    // Optimistic update
    const newReaction = reaction === 'like' ? null : 'like';
    setReactionState(newReaction);
    setError(null);

    // Server action
    startTransition(async () => {
      const result = await toggleLikeAction(gameId);

      if (!result.success) {
        // Rollback on error
        setReactionState(previousReaction);
        setError(result.error ?? 'Failed to update reaction');
        onError?.(result.error ?? 'Failed to update reaction');
        return;
      }

      // Sync with server result (in case of race conditions)
      setReactionState(result.reaction);
      onReactionChange?.(result.reaction);
    });
  }, [gameId, reaction, onReactionChange, onError]);

  /**
   * Set specific reaction with optimistic update
   */
  const setReaction = useCallback(
    (newReaction: ReactionType | null) => {
      // Store previous state for rollback
      const previousReaction = reaction;

      // Optimistic update
      setReactionState(newReaction);
      setError(null);

      // Server action
      startTransition(async () => {
        const result = await setReactionAction(gameId, newReaction);

        if (!result.success) {
          // Rollback on error
          setReactionState(previousReaction);
          setError(result.error ?? 'Failed to update reaction');
          onError?.(result.error ?? 'Failed to update reaction');
          return;
        }

        // Sync with server result
        setReactionState(result.reaction);
        onReactionChange?.(result.reaction);
      });
    },
    [gameId, reaction, onReactionChange, onError]
  );

  return {
    reaction,
    isLiked,
    isDisliked,
    isLoading: isPending,
    error,
    toggleLike,
    setReaction,
  };
}
