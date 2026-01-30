/**
 * Contract Test: GAME_SUMMARY_SELECT ↔ DbGame ↔ mapDbGameToSummary
 *
 * Ensures the API payload structure matches what the mapper expects.
 * This prevents "slug vs game_key" type mismatches.
 */

import { describe, it, expect } from 'vitest';
import { GAME_SUMMARY_SELECT } from '@/app/api/games/search/helpers';
import type { DbGame } from '@/lib/game-display/mappers';
import { mapDbGameToSummary } from '@/lib/game-display/mappers';

describe('Browse Summary Payload Contract', () => {
  describe('GAME_SUMMARY_SELECT fields', () => {
    // Extract field names from the select string
    const selectFields = GAME_SUMMARY_SELECT
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//') && !line.startsWith('--'))
      .map(line => line.replace(/,$/, '').split(':')[0].trim())
      .filter(field => field && !field.includes('('));

    it('should include game_key (not slug) as the identifier field', () => {
      expect(selectFields).toContain('game_key');
      // Should NOT have slug in select - that's the mapped output name
      expect(selectFields).not.toContain('slug');
    });

    it('should include all required summary fields', () => {
      const requiredFields = [
        'id',
        'game_key',
        'name',
        'description',
        'time_estimate_min',
        'min_players',
        'max_players',
        'age_min',
        'age_max',
        'energy_level',
        'location_type',
        'play_mode',
        'status',
      ];

      for (const field of requiredFields) {
        expect(selectFields, `Missing required field: ${field}`).toContain(field);
      }
    });

    it('should NOT include heavy relations that bloat payload', () => {
      // Note: 'translations' is now included for locale support (PR2)
      // but only includes (locale, title, short_description) - very lean
      const heavyFields = [
        'owner',
        'secondary_purposes',
        'steps',
        'phases',
        'roles',
        'artifacts',
        'triggers',
        'board_config',
      ];

      for (const field of heavyFields) {
        expect(selectFields, `Should not include heavy field: ${field}`).not.toContain(field);
      }
    });

    it('should include translations for locale support', () => {
      expect(selectFields).toContain('translations');
    });
  });

  describe('mapDbGameToSummary canonicalization', () => {
    it('should map game_key to slug in output', () => {
      const dbGame: DbGame = {
        id: 'test-id',
        name: 'Test Game',
        game_key: 'test-game-key',
        // No slug field - simulating API response
      };

      const summary = mapDbGameToSummary(dbGame);

      expect(summary.slug).toBe('test-game-key');
    });

    it('should fallback to slug if game_key is missing (backward compat)', () => {
      const dbGame: DbGame = {
        id: 'test-id',
        name: 'Test Game',
        slug: 'legacy-slug',
        // No game_key field - simulating old data
      };

      const summary = mapDbGameToSummary(dbGame);

      expect(summary.slug).toBe('legacy-slug');
    });

    it('should prefer game_key over slug when both present', () => {
      const dbGame: DbGame = {
        id: 'test-id',
        name: 'Test Game',
        game_key: 'correct-key',
        slug: 'legacy-slug',
      };

      const summary = mapDbGameToSummary(dbGame);

      expect(summary.slug).toBe('correct-key');
    });

    it('should handle missing key gracefully (undefined slug)', () => {
      const dbGame: DbGame = {
        id: 'test-id',
        name: 'Test Game',
        // Neither game_key nor slug
      };

      const summary = mapDbGameToSummary(dbGame);

      expect(summary.slug).toBeUndefined();
      // ID should still be present for routing
      expect(summary.id).toBe('test-id');
    });
  });

  describe('GameSummary required fields', () => {
    it('should always return id and title', () => {
      const dbGame: DbGame = {
        id: 'minimal-id',
        name: 'Minimal Game',
      };

      const summary = mapDbGameToSummary(dbGame);

      expect(summary.id).toBe('minimal-id');
      expect(summary.title).toBe('Minimal Game');
    });

    it('should map all metadata fields correctly', () => {
      const dbGame: DbGame = {
        id: 'full-id',
        name: 'Full Game',
        game_key: 'full-game',
        description: 'A test description',
        time_estimate_min: 15,
        min_players: 4,
        max_players: 12,
        age_min: 8,
        age_max: 99,
        energy_level: 'medium',
        location_type: 'indoor',
        play_mode: 'facilitated',
        status: 'published',
        product: { name: 'Test Product' },
        main_purpose: { id: 'purpose-1', name: 'Team Building' },
      };

      const summary = mapDbGameToSummary(dbGame);

      expect(summary).toMatchObject({
        id: 'full-id',
        slug: 'full-game',
        title: 'Full Game',
        shortDescription: 'A test description',
        durationMin: 15,
        minPlayers: 4,
        maxPlayers: 12,
        ageMin: 8,
        ageMax: 99,
        energyLevel: 'medium',
        environment: 'indoor',
        playMode: 'facilitated',
        status: 'published',
        product: 'Test Product',
        purpose: 'Team Building',
      });
    });

    it('should prefer _translatedTitle over translations array', () => {
      const dbGame: DbGame = {
        id: 'translated-id',
        name: 'Base Name',
        game_key: 'translated-game',
        _translatedTitle: 'Translated Title',
        _translatedShortDescription: 'Translated Description',
        translations: [
          { locale: 'sv', title: 'Swedish Title', short_description: 'Swedish Desc' }
        ],
      };

      const summary = mapDbGameToSummary(dbGame);

      // Pre-computed fields take priority
      expect(summary.title).toBe('Translated Title');
      expect(summary.shortDescription).toBe('Translated Description');
    });

    it('should fall back to translations array when _translated fields missing', () => {
      const dbGame: DbGame = {
        id: 'array-id',
        name: 'Base Name',
        game_key: 'array-game',
        // No _translatedTitle or _translatedShortDescription
        translations: [
          { locale: 'sv', title: 'Swedish Title', short_description: 'Swedish Desc' }
        ],
      };

      const summary = mapDbGameToSummary(dbGame);

      expect(summary.title).toBe('Swedish Title');
      expect(summary.shortDescription).toBe('Swedish Desc');
    });
  });
});
