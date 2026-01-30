/**
 * Game Reactions Tests
 *
 * Unit tests for game reaction types and utility functions.
 * Note: Server action tests require a Supabase connection.
 *
 * @see types/game-reaction.ts
 */

import { describe, it, expect } from 'vitest';
import {
  reactionToIsFavorite,
  isFavoriteToReaction,
  type ReactionType,
  type GameReactionMap,
  type SetReactionResult,
} from '@/types/game-reaction';

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe('Game Reaction Types', () => {
  describe('reactionToIsFavorite', () => {
    it('returns true for like reaction', () => {
      expect(reactionToIsFavorite('like')).toBe(true);
    });

    it('returns false for dislike reaction', () => {
      expect(reactionToIsFavorite('dislike')).toBe(false);
    });

    it('returns false for null (neutral)', () => {
      expect(reactionToIsFavorite(null)).toBe(false);
    });
  });

  describe('isFavoriteToReaction', () => {
    it('returns like for true', () => {
      expect(isFavoriteToReaction(true)).toBe('like');
    });

    it('returns null for false', () => {
      expect(isFavoriteToReaction(false)).toBe(null);
    });
  });

  describe('ReactionType', () => {
    it('accepts valid reaction values', () => {
      const like: ReactionType = 'like';
      const dislike: ReactionType = 'dislike';
      expect(like).toBe('like');
      expect(dislike).toBe('dislike');
    });
  });

  describe('GameReactionMap', () => {
    it('maps gameId to reaction or null', () => {
      const map: GameReactionMap = {
        'game-1': 'like',
        'game-2': 'dislike',
        'game-3': null,
      };
      expect(map['game-1']).toBe('like');
      expect(map['game-2']).toBe('dislike');
      expect(map['game-3']).toBe(null);
      expect(map['game-4']).toBeUndefined();
    });
  });

  describe('SetReactionResult', () => {
    it('represents success result', () => {
      const result: SetReactionResult = {
        success: true,
        reaction: 'like',
        created: true,
      };
      expect(result.success).toBe(true);
      expect(result.reaction).toBe('like');
      expect(result.created).toBe(true);
    });

    it('represents error result', () => {
      const result: SetReactionResult = {
        success: false,
        reaction: null,
        error: 'Not authenticated',
      };
      expect(result.success).toBe(false);
      expect(result.reaction).toBe(null);
      expect(result.error).toBe('Not authenticated');
    });

    it('represents toggle off result (neutral)', () => {
      const result: SetReactionResult = {
        success: true,
        reaction: null,
        created: false,
      };
      expect(result.success).toBe(true);
      expect(result.reaction).toBe(null);
    });
  });
});

// =============================================================================
// TOGGLE SEMANTICS TESTS (Logic only, no DB)
// =============================================================================

describe('Toggle Semantics (Logic)', () => {
  /**
   * Helper to simulate toggle logic
   * This mirrors the SQL upsert_game_reaction function logic
   */
  function simulateToggle(
    current: ReactionType | null,
    action: ReactionType
  ): ReactionType | null {
    if (current === null) {
      // No reaction → insert
      return action;
    } else if (current === action) {
      // Same reaction → toggle off (delete)
      return null;
    } else {
      // Different reaction → update
      return action;
    }
  }

  describe('like toggle', () => {
    it('none → like (insert)', () => {
      expect(simulateToggle(null, 'like')).toBe('like');
    });

    it('like → none (toggle off)', () => {
      expect(simulateToggle('like', 'like')).toBe(null);
    });

    it('dislike → like (switch)', () => {
      expect(simulateToggle('dislike', 'like')).toBe('like');
    });
  });

  describe('dislike toggle (future feature)', () => {
    it('none → dislike (insert)', () => {
      expect(simulateToggle(null, 'dislike')).toBe('dislike');
    });

    it('dislike → none (toggle off)', () => {
      expect(simulateToggle('dislike', 'dislike')).toBe(null);
    });

    it('like → dislike (switch)', () => {
      expect(simulateToggle('like', 'dislike')).toBe('dislike');
    });
  });
});
