/**
 * Tests for translation helpers in search API
 */

import { describe, it, expect } from 'vitest';
import { 
  pickTranslationForLocale, 
  applyTranslation,
  defaultLocale,
  type GameTranslationRow,
} from '@/app/api/games/search/helpers';

describe('Translation Helpers', () => {
  describe('pickTranslationForLocale', () => {
    const translations: GameTranslationRow[] = [
      { locale: 'sv', title: 'Swedish Title', short_description: 'Swedish Desc' },
      { locale: 'en', title: 'English Title', short_description: 'English Desc' },
      { locale: 'no', title: 'Norwegian Title', short_description: 'Norwegian Desc' },
    ];

    it('should return exact locale match', () => {
      const result = pickTranslationForLocale(translations, 'en');
      expect(result?.title).toBe('English Title');
    });

    it('should fallback to Swedish when locale not found', () => {
      const partialTranslations: GameTranslationRow[] = [
        { locale: 'sv', title: 'Swedish Title', short_description: 'Swedish Desc' },
      ];
      const result = pickTranslationForLocale(partialTranslations, 'no');
      expect(result?.title).toBe('Swedish Title');
    });

    it('should return first available if no Swedish fallback', () => {
      const noSwedish: GameTranslationRow[] = [
        { locale: 'en', title: 'English Title', short_description: 'English Desc' },
      ];
      const result = pickTranslationForLocale(noSwedish, 'no');
      expect(result?.title).toBe('English Title');
    });

    it('should return null for empty translations', () => {
      expect(pickTranslationForLocale([], 'sv')).toBeNull();
      expect(pickTranslationForLocale(null, 'sv')).toBeNull();
      expect(pickTranslationForLocale(undefined, 'sv')).toBeNull();
    });

    it('should default to sv locale', () => {
      const result = pickTranslationForLocale(translations);
      expect(result?.title).toBe('Swedish Title');
    });
  });

  describe('applyTranslation', () => {
    it('should add _translatedTitle and _translatedShortDescription from translation', () => {
      const game = {
        name: 'Base Name',
        description: 'Base Description',
        short_description: 'Base Short',
        translations: [
          { locale: 'sv', title: 'Swedish Title', short_description: 'Swedish Desc' },
        ],
      };

      const result = applyTranslation(game, 'sv');

      expect(result._translatedTitle).toBe('Swedish Title');
      expect(result._translatedShortDescription).toBe('Swedish Desc');
    });

    it('should fall back to base fields when no translation', () => {
      const game = {
        name: 'Base Name',
        description: 'Base Description',
        short_description: 'Base Short',
        translations: [],
      };

      const result = applyTranslation(game, 'sv');

      expect(result._translatedTitle).toBe('Base Name');
      expect(result._translatedShortDescription).toBe('Base Short');
    });

    it('should fall back to description if short_description missing', () => {
      const game = {
        name: 'Base Name',
        description: 'Base Description',
        translations: [],
      };

      const result = applyTranslation(game, 'sv');

      expect(result._translatedShortDescription).toBe('Base Description');
    });

    it('should preserve original game properties', () => {
      const game = {
        id: 'game-123',
        name: 'Base Name',
        description: 'Base Description',
        energy_level: 'high',
        translations: [],
      };

      const result = applyTranslation(game, 'sv');

      expect(result.id).toBe('game-123');
      expect(result.energy_level).toBe('high');
    });

    it('should use default locale when not specified', () => {
      const game = {
        name: 'Base Name',
        translations: [
          { locale: 'sv', title: 'Swedish Title', short_description: 'Swedish Desc' },
          { locale: 'en', title: 'English Title', short_description: 'English Desc' },
        ],
      };

      const result = applyTranslation(game);

      // Default is 'sv'
      expect(result._translatedTitle).toBe('Swedish Title');
    });
  });

  describe('defaultLocale', () => {
    it('should be sv', () => {
      expect(defaultLocale).toBe('sv');
    });
  });
});
