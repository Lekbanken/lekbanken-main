/**
 * Game Reactions Server Service
 *
 * Server-side read functions for game reactions.
 * Uses RLS-aware client for user-scoped queries.
 *
 * @see types/game-reaction.ts for types
 * @see supabase/migrations/20260130000000_game_reactions.sql for schema
 */

import 'server-only';

import { createServerRlsClient } from '@/lib/supabase/server';
import type { ReactionType, GameReactionMap } from '@/types/game-reaction';

// =============================================================================
// READ FUNCTIONS
// =============================================================================

/**
 * Get reaction for a single game (GameDetails page)
 *
 * @param gameId - The game to check
 * @returns The reaction type or null if none
 */
export async function getUserReactionForGame(
  gameId: string
): Promise<ReactionType | null> {
  const supabase = await createServerRlsClient();

  // Use RPC (granted to anon) so unauthenticated requests return empty instead
  // of surfacing permission errors when selecting directly from the table.
  const { data, error } = await supabase.rpc('get_game_reactions_batch', {
    p_game_ids: [gameId],
  });

  if (error) {
    console.error('[getUserReactionForGame] Error:', error.message);
    return null;
  }

  const first = Array.isArray(data) ? data[0] : null;
  return (first?.reaction as ReactionType) ?? null;
}

/**
 * Batch fetch reactions for multiple games (Browse list)
 * Uses RPC for performance.
 *
 * @param gameIds - Array of game IDs to check
 * @returns Map of gameId -> reaction (null for no reaction)
 */
export async function getUserReactionsForGames(
  gameIds: string[]
): Promise<GameReactionMap> {
  if (gameIds.length === 0) {
    return {};
  }

  const supabase = await createServerRlsClient();

  const { data, error } = await supabase.rpc('get_game_reactions_batch', {
    p_game_ids: gameIds,
  });

  if (error) {
    console.error('[getUserReactionsForGames] Error:', error.message);
    return {};
  }

  // Build map from results
  const map: GameReactionMap = {};

  // Initialize all requested IDs to null
  for (const id of gameIds) {
    map[id] = null;
  }

  // Fill in actual reactions
  if (data && Array.isArray(data)) {
    for (const row of data) {
      if (row && row.game_id && row.reaction) {
        map[row.game_id] = row.reaction as ReactionType;
      }
    }
  }

  return map;
}

/**
 * Get all liked game IDs for the current user
 * Used for "Show liked" filter in Browse.
 *
 * @returns Array of game IDs that user has liked
 */
export async function getLikedGameIds(): Promise<string[]> {
  const supabase = await createServerRlsClient();

  const { data, error } = await supabase.rpc('get_liked_game_ids');

  if (error) {
    console.error('[getLikedGameIds] Error:', error.message);
    return [];
  }

  return (data as string[]) ?? [];
}

/**
 * Check if user has liked a specific game
 * Convenience wrapper for single-game check.
 *
 * @param gameId - The game to check
 * @returns True if liked, false otherwise
 */
export async function isGameLiked(gameId: string): Promise<boolean> {
  const reaction = await getUserReactionForGame(gameId);
  return reaction === 'like';
}
