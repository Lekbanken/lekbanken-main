/**
 * Tests for badge publish validation
 */
import { describe, it, expect } from 'vitest';
import {
  validateForPublish,
  validateForPublishZod,
  validateForDraft,
  hasVisualAnchor,
  getValidationSummary,
  REWARD_COINS_MIN,
  REWARD_COINS_MAX,
  TITLE_MAX_LENGTH,
  type ValidationError,
} from '@/features/admin/achievements/validation';
import type { AchievementItem } from '@/features/admin/achievements/types';

// Factory for creating test badges
function createTestBadge(overrides: Partial<AchievementItem> = {}): AchievementItem {
  return {
    id: 'test-id',
    title: 'Test Badge',
    description: 'A test badge',
    status: 'draft',
    version: 1,
    rewardCoins: 100,
    icon: {
      themeId: 'purple',
      base: { id: 'shield-solid', color: '#FF0000' },
      symbol: null,
      backgrounds: [],
      foregrounds: [],
    },
    ...overrides,
  };
}

describe('hasVisualAnchor', () => {
  it('returns true when base is present', () => {
    const icon = { themeId: 'purple', base: { id: 'shield', color: '#FFF' }, symbol: null, backgrounds: [], foregrounds: [] };
    expect(hasVisualAnchor(icon)).toBe(true);
  });

  it('returns true when symbol is present', () => {
    const icon = { themeId: 'purple', base: null, symbol: { id: 'star', color: '#FFF' }, backgrounds: [], foregrounds: [] };
    expect(hasVisualAnchor(icon)).toBe(true);
  });

  it('returns true when both base and symbol are present', () => {
    const icon = { 
      themeId: 'purple', 
      base: { id: 'shield', color: '#FFF' }, 
      symbol: { id: 'star', color: '#000' }, 
      backgrounds: [], 
      foregrounds: [] 
    };
    expect(hasVisualAnchor(icon)).toBe(true);
  });

  it('returns false when neither base nor symbol is present', () => {
    const icon = { themeId: 'purple', base: null, symbol: null, backgrounds: [], foregrounds: [] };
    expect(hasVisualAnchor(icon)).toBe(false);
  });

  it('returns false when base and symbol have empty ids', () => {
    const icon = { 
      themeId: 'purple', 
      base: { id: '', color: '#FFF' }, 
      symbol: { id: '', color: '#FFF' }, 
      backgrounds: [], 
      foregrounds: [] 
    };
    expect(hasVisualAnchor(icon)).toBe(false);
  });
});

describe('validateForPublish', () => {
  describe('title validation', () => {
    it('returns error when title is empty', () => {
      const badge = createTestBadge({ title: '' });
      const result = validateForPublish(badge);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'title', message: expect.stringContaining('required') })
      );
    });

    it('returns error when title is whitespace only', () => {
      const badge = createTestBadge({ title: '   ' });
      const result = validateForPublish(badge);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'title' })
      );
    });

    it('returns error when title exceeds max length', () => {
      const badge = createTestBadge({ title: 'a'.repeat(TITLE_MAX_LENGTH + 1) });
      const result = validateForPublish(badge);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'title', message: expect.stringContaining('at most') })
      );
    });

    it('passes when title is valid', () => {
      const badge = createTestBadge({ title: 'Valid Title' });
      const result = validateForPublish(badge);
      expect(result.errors.filter((e: ValidationError) => e.field === 'title')).toHaveLength(0);
    });
  });

  describe('visual anchor validation', () => {
    it('returns error when no visual anchor', () => {
      const badge = createTestBadge({
        icon: { themeId: 'purple', base: null, symbol: null, backgrounds: [], foregrounds: [] }
      });
      const result = validateForPublish(badge);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'icon', message: expect.stringContaining('base shape or a symbol') })
      );
    });

    it('passes when base is present', () => {
      const badge = createTestBadge({
        icon: { themeId: 'purple', base: { id: 'shield', color: '#FFF' }, symbol: null, backgrounds: [], foregrounds: [] }
      });
      const result = validateForPublish(badge);
      expect(result.errors.filter((e: ValidationError) => e.field === 'icon')).toHaveLength(0);
    });

    it('passes when symbol is present', () => {
      const badge = createTestBadge({
        icon: { themeId: 'purple', base: null, symbol: { id: 'star', color: '#FFF' }, backgrounds: [], foregrounds: [] }
      });
      const result = validateForPublish(badge);
      expect(result.errors.filter((e: ValidationError) => e.field === 'icon')).toHaveLength(0);
    });
  });

  describe('rewardCoins validation', () => {
    it('returns error when rewardCoins is negative', () => {
      const badge = createTestBadge({ rewardCoins: -1 });
      const result = validateForPublish(badge);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'rewardCoins', message: expect.stringContaining('at least') })
      );
    });

    it('returns error when rewardCoins exceeds max', () => {
      const badge = createTestBadge({ rewardCoins: REWARD_COINS_MAX + 1 });
      const result = validateForPublish(badge);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'rewardCoins', message: expect.stringContaining('at most') })
      );
    });

    it('passes when rewardCoins is 0', () => {
      const badge = createTestBadge({ rewardCoins: 0 });
      const result = validateForPublish(badge);
      expect(result.errors.filter((e: ValidationError) => e.field === 'rewardCoins')).toHaveLength(0);
    });

    it('passes when rewardCoins is at max', () => {
      const badge = createTestBadge({ rewardCoins: REWARD_COINS_MAX });
      const result = validateForPublish(badge);
      expect(result.errors.filter((e: ValidationError) => e.field === 'rewardCoins')).toHaveLength(0);
    });

    it('treats undefined rewardCoins as 0', () => {
      const badge = createTestBadge({ rewardCoins: undefined });
      const result = validateForPublish(badge);
      expect(result.errors.filter((e: ValidationError) => e.field === 'rewardCoins')).toHaveLength(0);
    });
  });

  describe('multiple errors', () => {
    it('returns all errors when multiple rules fail', () => {
      const badge = createTestBadge({
        title: '',
        rewardCoins: -100,
        icon: { themeId: 'purple', base: null, symbol: null, backgrounds: [], foregrounds: [] }
      });
      const result = validateForPublish(badge);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('valid badge', () => {
    it('returns valid=true when all rules pass', () => {
      const badge = createTestBadge();
      const result = validateForPublish(badge);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('validateForPublishZod', () => {
  it('validates using Zod schema', () => {
    const badge = createTestBadge({ title: '' });
    const result = validateForPublishZod(badge);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns valid for correct badge', () => {
    const badge = createTestBadge();
    const result = validateForPublishZod(badge);
    expect(result.valid).toBe(true);
  });
});

describe('validateForDraft', () => {
  it('allows empty title for drafts', () => {
    const badge = createTestBadge({ title: '' });
    const result = validateForDraft(badge);
    expect(result.errors.filter((e: ValidationError) => e.field === 'title')).toHaveLength(0);
  });

  it('allows no visual anchor for drafts', () => {
    const badge = createTestBadge({
      icon: { themeId: 'purple', base: null, symbol: null, backgrounds: [], foregrounds: [] }
    });
    const result = validateForDraft(badge);
    expect(result.errors.filter((e: ValidationError) => e.field === 'icon')).toHaveLength(0);
  });

  it('still validates rewardCoins bounds for drafts', () => {
    const badge = createTestBadge({ rewardCoins: -50 });
    const result = validateForDraft(badge);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'rewardCoins' })
    );
  });

  it('returns valid for draft with valid rewardCoins', () => {
    const badge = createTestBadge({ title: '', rewardCoins: 100 });
    const result = validateForDraft(badge);
    expect(result.valid).toBe(true);
  });
});

describe('getValidationSummary', () => {
  it('returns empty string for valid result', () => {
    const result = { valid: true, errors: [] };
    expect(getValidationSummary(result)).toBe('');
  });

  it('returns concatenated messages for errors', () => {
    const result = {
      valid: false,
      errors: [
        { field: 'title', message: 'Title is required' },
        { field: 'icon', message: 'Must have visual anchor' },
      ]
    };
    const summary = getValidationSummary(result);
    expect(summary).toContain('Title is required');
    expect(summary).toContain('Must have visual anchor');
  });
});

describe('constants', () => {
  it('has correct REWARD_COINS_MIN', () => {
    expect(REWARD_COINS_MIN).toBe(0);
  });

  it('has correct REWARD_COINS_MAX', () => {
    expect(REWARD_COINS_MAX).toBe(10000);
  });

  it('has correct TITLE_MAX_LENGTH', () => {
    expect(TITLE_MAX_LENGTH).toBe(100);
  });
});
