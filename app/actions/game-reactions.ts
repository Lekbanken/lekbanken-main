'use server';

/**
 * Game Reactions Server Actions
 *
 * Server actions for toggling/setting game reactions (like/dislike).
 * Uses RPC for atomic upsert/delete operations.
 *
 * @see types/game-reaction.ts for types
 * @see lib/services/game-reactions.server.ts for read functions
 */

import { revalidatePath } from 'next/cache';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { ReactionType, SetReactionResult } from '@/types/game-reaction';

// =============================================================================
// TOGGLE LIKE
// =============================================================================

/**
 * Toggle like on a game
 *
 * Semantics:
 * - If not liked → set like
 * - If liked → remove reaction (neutral)
 * - If disliked → switch to like
 *
 * @param gameId - The game to toggle like on
 * @returns Result with new reaction state
 */
export async function toggleLike(gameId: string): Promise<SetReactionResult> {
  if (!gameId) {
    return {
      success: false,
      reaction: null,
      error: 'Game ID is required',
    };
  }

  const supabase = await createServerRlsClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      reaction: null,
      error: 'Not authenticated',
    };
  }

  // Use RPC for atomic toggle
  const { data, error } = await supabase.rpc('upsert_game_reaction', {
    p_game_id: gameId,
    p_reaction: 'like',
  });

  if (error) {
    console.error('[toggleLike] Error:', error.message);
    return {
      success: false,
      reaction: null,
      error: error.message,
    };
  }

  // Parse result
  const result = Array.isArray(data) ? data[0] : data;
  const newReaction = (result?.reaction as ReactionType) ?? null;
  const created = result?.created ?? false;

  // Revalidate relevant paths
  revalidatePath('/app/browse');
  revalidatePath(`/app/games/${gameId}`);

  return {
    success: true,
    reaction: newReaction,
    created,
  };
}

// =============================================================================
// SET REACTION (Generic)
// =============================================================================

/**
 * Set or clear reaction on a game
 *
 * Semantics:
 * - reaction = 'like' | 'dislike' → upsert that reaction
 * - reaction = null → delete reaction (neutral)
 * - Same reaction twice → toggle off (neutral)
 *
 * @param gameId - The game to set reaction on
 * @param reaction - The reaction to set (null to remove)
 * @returns Result with new reaction state
 */
export async function setReaction(
  gameId: string,
  reaction: ReactionType | null
): Promise<SetReactionResult> {
  if (!gameId) {
    return {
      success: false,
      reaction: null,
      error: 'Game ID is required',
    };
  }

  const supabase = await createServerRlsClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      reaction: null,
      error: 'Not authenticated',
    };
  }

  // Use RPC for atomic operation
  const { data, error } = await supabase.rpc('upsert_game_reaction', {
    p_game_id: gameId,
    p_reaction: reaction ?? undefined,
  });

  if (error) {
    console.error('[setReaction] Error:', error.message);
    return {
      success: false,
      reaction: null,
      error: error.message,
    };
  }

  // Parse result
  const result = Array.isArray(data) ? data[0] : data;
  const newReaction = (result?.reaction as ReactionType) ?? null;
  const created = result?.created ?? false;

  // Revalidate relevant paths
  revalidatePath('/app/browse');
  revalidatePath(`/app/games/${gameId}`);

  return {
    success: true,
    reaction: newReaction,
    created,
  };
}

// =============================================================================
// CLEAR REACTION
// =============================================================================

/**
 * Clear/remove reaction from a game (set to neutral)
 * Convenience wrapper for setReaction(gameId, null)
 *
 * @param gameId - The game to clear reaction from
 * @returns Result with reaction = null
 */
export async function clearReaction(gameId: string): Promise<SetReactionResult> {
  return setReaction(gameId, null);
}
