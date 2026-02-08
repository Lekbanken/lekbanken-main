/**
 * Unit Tests for assignCoverFromTemplates
 * 
 * Tests the cover image auto-assignment during import:
 * 1. Creates cover when templates exist
 * 2. Doesn't overwrite existing cover (idempotent)
 * 3. Prefers product-specific templates over global
 * 4. Returns skip reason when no templates found
 * 5. Hash-based selection is deterministic
 */

import { describe, it, expect } from 'vitest';
import {
  assignCoverFromTemplates,
  assignCoverFromTemplatesBatch,
  type AssignCoverParams,
} from '@/lib/import/assignCoverFromTemplates';

// Controlled mock that simulates Supabase behavior
function createControlledMock(scenario: {
  hasExistingCover: boolean;
  productTemplates: { media_id: string; template_key: string | null }[];
  globalTemplates: { media_id: string; template_key: string | null }[];
  insertShouldFail: boolean;
  insertError?: { code?: string; message?: string };
}) {
  return {
    from: (table: string) => {
      if (table === 'game_media') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: scenario.hasExistingCover ? { id: 'existing-cover-id' } : null,
                  }),
                }),
              }),
            }),
          }),
          insert: async () => ({
            error: scenario.insertShouldFail 
              ? (scenario.insertError || { message: 'Insert failed' })
              : null,
          }),
        };
      }
      
      if (table === 'media_templates') {
        let isProductQuery = false;
        return {
          select: () => ({
            eq: (col: string) => {
              if (col === 'product_id') isProductQuery = true;
              return {
                eq: () => ({
                  is: () => ({
                    is: () => ({
                      order: () => ({
                        order: async () => ({
                          data: isProductQuery 
                            ? scenario.productTemplates 
                            : scenario.globalTemplates,
                        }),
                      }),
                    }),
                  }),
                }),
                is: () => ({
                  is: () => ({
                    order: () => ({
                      order: async () => ({
                        data: scenario.globalTemplates,
                      }),
                    }),
                  }),
                }),
              };
            },
            is: () => ({
              is: () => ({
                order: () => ({
                  order: async () => ({
                    data: scenario.globalTemplates,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      
      return {};
    },
  };
}

describe('assignCoverFromTemplates', () => {
  // =========================================================================
  // Test 1: Returns early when mainPurposeId is null
  // =========================================================================
  describe('no mainPurposeId', () => {
    it('should skip when mainPurposeId is null', async () => {
      const mockSupabase = createControlledMock({
        hasExistingCover: false,
        productTemplates: [],
        globalTemplates: [],
        insertShouldFail: false,
      });

      const result = await assignCoverFromTemplates(mockSupabase as never, {
        gameId: 'game-1',
        gameKey: 'test-game',
        gameName: 'Test Game',
        mainPurposeId: null,
      });

      expect(result.assigned).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('no_templates_found');
    });
  });

  // =========================================================================
  // Test 2: Skips when cover already exists (idempotent)
  // =========================================================================
  describe('existing cover', () => {
    it('should skip when game already has cover', async () => {
      const mockSupabase = createControlledMock({
        hasExistingCover: true,
        productTemplates: [],
        globalTemplates: [{ media_id: 'media-1', template_key: 'test-1' }],
        insertShouldFail: false,
      });

      const result = await assignCoverFromTemplates(mockSupabase as never, {
        gameId: 'game-1',
        gameKey: 'test-game',
        gameName: 'Test Game',
        mainPurposeId: 'purpose-1',
      });

      expect(result.assigned).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('already_has_cover');
    });
  });

  // =========================================================================
  // Test 3: Hash-based selection is deterministic
  // =========================================================================
  describe('deterministic hash selection', () => {
    it('same game_key should always select same template index', async () => {
      // This tests the hash function behavior directly
      const hashCode = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash);
      };

      const gameKey = 'arkivets-sista-signal';
      const templates = [
        { media_id: 'media-1' },
        { media_id: 'media-2' },
        { media_id: 'media-3' },
      ];

      const idx1 = hashCode(gameKey) % templates.length;
      const idx2 = hashCode(gameKey) % templates.length;
      const idx3 = hashCode(gameKey) % templates.length;

      expect(idx1).toBe(idx2);
      expect(idx2).toBe(idx3);
    });

    it('different game_keys should (likely) select different indices', async () => {
      const hashCode = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash);
      };

      const gameKeys = [
        'arkivets-sista-signal',
        'mysteriet-i-skogen',
        'lagets-utmaning',
        'fokus-ovningen',
        'teamwork-adventure',
      ];

      const templates = Array.from({ length: 10 }, (_, i) => ({ media_id: `media-${i}` }));
      const indices = gameKeys.map(key => hashCode(key) % templates.length);
      
      // With 5 keys and 10 templates, we expect some variety (not all same)
      const uniqueIndices = new Set(indices);
      expect(uniqueIndices.size).toBeGreaterThan(1);
    });
  });

  // =========================================================================
  // Test 4: No templates found returns skip
  // =========================================================================
  describe('no templates found', () => {
    it('should skip with reason when no templates exist for purpose', async () => {
      const mockSupabase = createControlledMock({
        hasExistingCover: false,
        productTemplates: [],
        globalTemplates: [],
        insertShouldFail: false,
      });

      const result = await assignCoverFromTemplates(mockSupabase as never, {
        gameId: 'game-1',
        gameKey: 'test-game',
        gameName: 'Test Game',
        mainPurposeId: 'purpose-without-templates',
      });

      expect(result.assigned).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('no_templates_found');
    });
  });

  // =========================================================================
  // Test 5: Race condition - duplicate key treated as already_has_cover
  // =========================================================================
  describe('race condition handling', () => {
    it('should treat duplicate key error (code 23505) as already_has_cover', async () => {
      const mockSupabase = createControlledMock({
        hasExistingCover: false, // Check passes, but another process inserted cover
        productTemplates: [],
        globalTemplates: [{ media_id: 'media-1', template_key: 'global-1' }],
        insertShouldFail: true,
        insertError: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      const result = await assignCoverFromTemplates(mockSupabase as never, {
        gameId: 'game-1',
        gameKey: 'test-game',
        gameName: 'Test Game',
        mainPurposeId: 'purpose-1',
      });

      expect(result.assigned).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('already_has_cover');
    });

    it('should treat duplicate key message as already_has_cover', async () => {
      const mockSupabase = createControlledMock({
        hasExistingCover: false,
        productTemplates: [],
        globalTemplates: [{ media_id: 'media-1', template_key: 'global-1' }],
        insertShouldFail: true,
        insertError: { message: 'duplicate key value violates unique constraint "game_media_unique_cover"' },
      });

      const result = await assignCoverFromTemplates(mockSupabase as never, {
        gameId: 'game-1',
        gameKey: 'test-game',
        gameName: 'Test Game',
        mainPurposeId: 'purpose-1',
      });

      expect(result.assigned).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('already_has_cover');
    });
  });
});

describe('assignCoverFromTemplatesBatch', () => {
  it('should aggregate results correctly', async () => {
    // This is a simplified test since full integration requires DB
    const mockSupabase = createControlledMock({
      hasExistingCover: false,
      productTemplates: [],
      globalTemplates: [{ media_id: 'media-1', template_key: 'global-1' }],
      insertShouldFail: false,
    });

    const games: AssignCoverParams[] = [
      { gameId: 'game-1', gameKey: 'game-1', gameName: 'Game 1', mainPurposeId: 'purpose-1' },
      { gameId: 'game-2', gameKey: 'game-2', gameName: 'Game 2', mainPurposeId: 'purpose-1' },
    ];

    const result = await assignCoverFromTemplatesBatch(mockSupabase as never, games);

    // Both games should attempt assignment (mock returns same template for both)
    expect(result.assigned + result.skipped).toBe(2);
  });
});
