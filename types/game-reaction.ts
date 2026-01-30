/**
 * Game Reaction Types
 *
 * TypeScript types for the game_reactions domain.
 * Personal user reactions (like/dislike) to games.
 *
 * @see supabase/migrations/20260130000000_game_reactions.sql
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Reaction type enum
 * - 'like': User likes the game (heart filled)
 * - 'dislike': User dislikes the game (future, behind feature flag)
 * - null: Neutral (no reaction / row deleted)
 */
export type ReactionType = 'like' | 'dislike';

/**
 * Full reaction record from database
 */
export interface GameReaction {
  id: string;
  userId: string;
  gameId: string;
  reaction: ReactionType;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reaction map for batch lookups
 * Key: gameId, Value: reaction or null (neutral)
 */
export type GameReactionMap = Record<string, ReactionType | null>;

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Response from toggle/set reaction
 */
export interface SetReactionResult {
  success: boolean;
  /** New reaction state (null = neutral/removed) */
  reaction: ReactionType | null;
  /** True if this was a new reaction (insert) */
  created?: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Response from batch fetch
 */
export interface BatchReactionsResult {
  success: boolean;
  /** Map of gameId -> reaction */
  reactions: GameReactionMap;
  error?: string;
}

// =============================================================================
// UI HELPER TYPES
// =============================================================================

/**
 * UI state for a like button
 */
export interface LikeButtonState {
  /** Current reaction */
  reaction: ReactionType | null;
  /** Is currently submitting */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Compatibility layer: Maps reaction to isFavorite for existing UI
 */
export function reactionToIsFavorite(reaction: ReactionType | null): boolean {
  return reaction === 'like';
}

/**
 * Compatibility layer: Maps isFavorite to reaction for existing UI
 */
export function isFavoriteToReaction(isFavorite: boolean): ReactionType | null {
  return isFavorite ? 'like' : null;
}
