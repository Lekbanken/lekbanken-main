'use client';

/**
 * LikeButton Component
 *
 * Canonical button for toggling game likes.
 * Uses optimistic updates via useGameReaction hook.
 *
 * @example
 * ```tsx
 * <LikeButton gameId="abc-123" initialLiked={false} />
 * <LikeButton gameId="abc-123" initialLiked={true} size="md" />
 * ```
 */

import { cn } from '@/lib/utils';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { useGameReaction } from '@/hooks/useGameReaction';
import type { ReactionType } from '@/types/game-reaction';

// =============================================================================
// TYPES
// =============================================================================

export type LikeButtonSize = 'sm' | 'md';
export type LikeButtonContext = 'card' | 'details' | 'standalone';

export interface LikeButtonProps {
  /** Game ID to like/unlike */
  gameId: string;
  /** Initial liked state (from server) */
  initialLiked?: boolean;
  /** Initial reaction (alternative to initialLiked) */
  initialReaction?: ReactionType | null;
  /** Button size */
  size?: LikeButtonSize;
  /** Usage context (affects styling) */
  context?: LikeButtonContext;
  /** Additional CSS classes */
  className?: string;
  /** Callback when like changes */
  onLikeChange?: (isLiked: boolean) => void;
}

// =============================================================================
// SIZE VARIANTS
// =============================================================================

const sizeClasses: Record<LikeButtonSize, { button: string; icon: string }> = {
  sm: {
    button: 'p-1.5',
    icon: 'h-4 w-4',
  },
  md: {
    button: 'p-2',
    icon: 'h-5 w-5',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function LikeButton({
  gameId,
  initialLiked = false,
  initialReaction,
  size = 'sm',
  context = 'standalone',
  className,
  onLikeChange,
}: LikeButtonProps) {
  // Determine initial reaction from props
  const computedInitialReaction = initialReaction ?? (initialLiked ? 'like' : null);

  const { isLiked, isLoading, toggleLike } = useGameReaction({
    gameId,
    initialReaction: computedInitialReaction,
    onReactionChange: (reaction) => {
      onLikeChange?.(reaction === 'like');
    },
  });

  const { button: buttonSize, icon: iconSize } = sizeClasses[size];

  // Context-specific styling
  const contextClasses: Record<LikeButtonContext, string> = {
    card: 'rounded-full bg-background/80 backdrop-blur hover:bg-background',
    details: 'rounded-md bg-muted hover:bg-muted/80',
    standalone: 'rounded-full bg-background hover:bg-muted',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        contextClasses[context],
        buttonSize,
        className
      )}
      aria-label={isLiked ? 'Ta bort gillad' : 'Gilla'}
      aria-pressed={isLiked}
    >
      <HeartIcon
        filled={isLiked}
        className={cn(
          iconSize,
          isLiked ? 'text-destructive' : 'text-muted-foreground',
          isLoading && 'animate-pulse'
        )}
      />
    </button>
  );
}
