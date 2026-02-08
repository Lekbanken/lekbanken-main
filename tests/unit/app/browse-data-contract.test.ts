/**
 * Browse Data Contract Tests (Sprint 4.7)
 *
 * Verifies that the Browse page's data pipeline produces correct GameSummary objects.
 * Tests the actual mapper functions used by BrowsePage.tsx.
 *
 * @module tests/unit/app/browse-data-contract.test.ts
 */

import { describe, it, expect } from 'vitest';
import { mapDbGameToSummary } from '@/lib/game-display/mappers';
import { 
  formatDuration, 
  formatPlayers, 
  formatAge, 
  formatEnergyLevel, 
  formatPlayMode 
} from '@/lib/game-display';
import type { GameSummary } from '@/lib/game-display/types';

// =============================================================================
// GOLDEN FIXTURES - Match the shape returned by /api/games/search
// =============================================================================

/**
 * Creates a minimal valid DbGame matching GAME_SUMMARY_SELECT shape.
 * This is the exact structure returned by the search API.
 */
function createGoldenDbGame(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    game_key: 'test-game-key',
    name: 'Test Game',
    description: 'A test game description',
    short_description: 'Short description',
    time_estimate_min: 15,
    time_estimate_max: 30,
    min_players: 4,
    max_players: 12,
    age_min: 8,
    age_max: 14,
    energy_level: 'medium',
    location_type: 'indoor',
    play_mode: 'basic',
    difficulty: 'easy',
    status: 'published',
    popularity_score: 100,
    rating_average: 4.5,
    rating_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    is_demo_content: false,
    product_id: 'prod-uuid',
    main_purpose_id: 'purpose-uuid',
    media: [
      {
        kind: 'cover',
        media: { url: 'https://example.com/cover.jpg' },
      },
    ],
    product: { id: 'prod-uuid', name: 'Test Product', product_key: 'test-prod' },
    main_purpose: { id: 'purpose-uuid', name: 'Teambuilding' },
    translations: [
      {
        locale: 'sv',
        title: 'Testspel',
        short_description: 'Kort beskrivning på svenska',
      },
      {
        locale: 'en',
        title: 'Test Game',
        short_description: 'Short description in English',
      },
    ],
    // Pre-computed translation fields (added by applyTranslation in API)
    _translatedTitle: 'Testspel',
    _translatedShortDescription: 'Kort beskrivning på svenska',
    ...overrides,
  };
}

// =============================================================================
// CONTRACT TESTS
// =============================================================================

describe('Browse Data Contract', () => {
  describe('mapDbGameToSummary', () => {
    it('maps all required fields correctly', () => {
      const dbGame = createGoldenDbGame();
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      // Required fields
      expect(summary.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(summary.title).toBe('Testspel'); // Uses pre-computed translation

      // Verify types
      expect(typeof summary.id).toBe('string');
      expect(typeof summary.title).toBe('string');
    });

    it('maps optional metadata fields', () => {
      const dbGame = createGoldenDbGame();
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      expect(summary.durationMin).toBe(15);
      expect(summary.durationMax).toBe(30);
      expect(summary.minPlayers).toBe(4);
      expect(summary.maxPlayers).toBe(12);
      expect(summary.ageMin).toBe(8);
      expect(summary.ageMax).toBe(14);
    });

    it('maps enum fields to canonical values', () => {
      const dbGame = createGoldenDbGame();
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      // energyLevel must be one of the allowed values
      expect(['low', 'medium', 'high', null, undefined]).toContain(summary.energyLevel);
      expect(summary.energyLevel).toBe('medium');

      // playMode must be one of the allowed values
      expect(['basic', 'facilitated', 'participants', null, undefined]).toContain(summary.playMode);
      expect(summary.playMode).toBe('basic');

      // environment (location_type) must be valid
      expect(['indoor', 'outdoor', 'both', null, undefined]).toContain(summary.environment);
      expect(summary.environment).toBe('indoor');
    });

    it('maps cover URL from media relation', () => {
      const dbGame = createGoldenDbGame();
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      expect(summary.coverUrl).toBe('https://example.com/cover.jpg');
    });

    it('handles missing cover gracefully', () => {
      const dbGame = createGoldenDbGame({ media: [] });
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      // findCoverUrl returns null when no cover found
      expect(summary.coverUrl).toBeNull();
    });

    it('maps purpose and product labels', () => {
      const dbGame = createGoldenDbGame();
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      expect(summary.purpose).toBe('Teambuilding');
      expect(summary.product).toBe('Test Product');
    });

    it('handles null purpose/product gracefully', () => {
      const dbGame = createGoldenDbGame({
        main_purpose: null,
        product: null,
      });
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      expect(summary.purpose).toBeNull();
      expect(summary.product).toBeNull();
    });

    it('uses pre-computed translations when available', () => {
      const dbGame = createGoldenDbGame({
        _translatedTitle: 'Pre-computed Title',
        _translatedShortDescription: 'Pre-computed Description',
      });
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      expect(summary.title).toBe('Pre-computed Title');
      expect(summary.shortDescription).toBe('Pre-computed Description');
    });

    it('falls back to base fields when translations missing', () => {
      const dbGame = createGoldenDbGame({
        _translatedTitle: undefined,
        _translatedShortDescription: undefined,
        translations: [],
      });
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      expect(summary.title).toBe('Test Game'); // Falls back to name
      expect(summary.shortDescription).toBe('Short description'); // Falls back to short_description
    });

    it('maps status correctly', () => {
      const published = createGoldenDbGame({ status: 'published' });
      const draft = createGoldenDbGame({ status: 'draft' });
      const archived = createGoldenDbGame({ status: 'archived' });

      expect(mapDbGameToSummary(published as Parameters<typeof mapDbGameToSummary>[0]).status).toBe('published');
      expect(mapDbGameToSummary(draft as Parameters<typeof mapDbGameToSummary>[0]).status).toBe('draft');
      expect(mapDbGameToSummary(archived as Parameters<typeof mapDbGameToSummary>[0]).status).toBe('archived');
    });

    it('maps slug from game_key with fallback', () => {
      const withGameKey = createGoldenDbGame({ game_key: 'my-game-key', slug: 'old-slug' });
      const withSlugOnly = createGoldenDbGame({ game_key: null, slug: 'fallback-slug' });
      const withNeither = createGoldenDbGame({ game_key: null, slug: null });

      expect(mapDbGameToSummary(withGameKey as Parameters<typeof mapDbGameToSummary>[0]).slug).toBe('my-game-key');
      expect(mapDbGameToSummary(withSlugOnly as Parameters<typeof mapDbGameToSummary>[0]).slug).toBe('fallback-slug');
      expect(mapDbGameToSummary(withNeither as Parameters<typeof mapDbGameToSummary>[0]).slug).toBeUndefined();
    });
  });

  describe('GameSummary type contract', () => {
    it('id and title are always strings (never null/undefined)', () => {
      const dbGame = createGoldenDbGame();
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      // These must always be present
      expect(summary.id).toBeDefined();
      expect(summary.title).toBeDefined();
      expect(typeof summary.id).toBe('string');
      expect(typeof summary.title).toBe('string');
    });

    it('optional fields can be null or undefined', () => {
      const minimalDbGame = createGoldenDbGame({
        time_estimate_min: null,
        time_estimate_max: null,
        min_players: null,
        max_players: null,
        age_min: null,
        age_max: null,
        energy_level: null,
        location_type: null,
        play_mode: null,
        rating_average: null,
        media: [],
        main_purpose: null,
        product: null,
      });
      const summary = mapDbGameToSummary(minimalDbGame as Parameters<typeof mapDbGameToSummary>[0]);

      // All these should handle null gracefully
      expect([null, undefined]).toContain(summary.durationMin);
      expect([null, undefined]).toContain(summary.durationMax);
      expect([null, undefined]).toContain(summary.minPlayers);
      expect([null, undefined]).toContain(summary.maxPlayers);
      expect([null, undefined]).toContain(summary.ageMin);
      expect([null, undefined]).toContain(summary.ageMax);
      expect([null, undefined]).toContain(summary.energyLevel);
      expect([null, undefined]).toContain(summary.environment);
      expect([null, undefined]).toContain(summary.playMode);
    });
  });

  describe('PlayMode-specific behavior', () => {
    it.each([
      ['basic', 'basic'],
      ['facilitated', 'facilitated'],
      ['participants', 'participants'],
    ])('maps play_mode "%s" to playMode "%s"', (dbValue, expected) => {
      const dbGame = createGoldenDbGame({ play_mode: dbValue });
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      expect(summary.playMode).toBe(expected);
    });

    it('handles unknown play_mode gracefully', () => {
      const dbGame = createGoldenDbGame({ play_mode: 'unknown_mode' });
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      // Should not throw, returns null or the value depending on mapper logic
      expect(() => summary.playMode).not.toThrow();
    });
  });

  describe('UUID format', () => {
    it('id is a valid UUID format', () => {
      const dbGame = createGoldenDbGame();
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(summary.id).toMatch(uuidRegex);
    });

    it('id has no prefix (not "game-uuid")', () => {
      const dbGame = createGoldenDbGame();
      const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

      expect(summary.id).not.toMatch(/^game-/);
      expect(summary.id).not.toMatch(/^step-/);
    });
  });
});

// =============================================================================
// RENDERING FIELD COMPLETENESS
// =============================================================================

describe('GameCard rendering field availability', () => {
  /**
   * These are the fields that GameCard.tsx actually reads.
   * If any are missing, the card may render incorrectly.
   */
  // These fields are always set by mapDbGameToSummary (may be null but property exists)
  const REQUIRED_FOR_GRID_VARIANT: (keyof GameSummary)[] = [
    'id',
    'title',
    'coverUrl',
    'playMode',
    'energyLevel',
    'durationMin',
    'durationMax',
    'minPlayers',
    'maxPlayers',
    'ageMin',
    'ageMax',
    'shortDescription',
    'purpose',
    // Note: 'rating' is NOT mapped by mapDbGameToSummary - UI fetches reactions separately
  ];

  it('all GameCard grid variant fields are mapped', () => {
    const dbGame = createGoldenDbGame();
    const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

    for (const field of REQUIRED_FOR_GRID_VARIANT) {
      expect(summary).toHaveProperty(field);
    }
  });

  it('formatters do not throw on valid summary', () => {
    const dbGame = createGoldenDbGame();
    const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);

    expect(() => formatDuration(summary.durationMin, summary.durationMax)).not.toThrow();
    expect(() => formatPlayers(summary.minPlayers, summary.maxPlayers)).not.toThrow();
    expect(() => formatAge(summary.ageMin, summary.ageMax)).not.toThrow();
    expect(() => formatEnergyLevel(summary.energyLevel)).not.toThrow();
    expect(() => formatPlayMode(summary.playMode)).not.toThrow();
  });

  it('formatters handle null values gracefully', () => {
    expect(() => formatDuration(null, null)).not.toThrow();
    expect(() => formatPlayers(null, null)).not.toThrow();
    expect(() => formatAge(null, null)).not.toThrow();
    expect(() => formatEnergyLevel(null)).not.toThrow();
    expect(() => formatPlayMode(null)).not.toThrow();
  });
});
