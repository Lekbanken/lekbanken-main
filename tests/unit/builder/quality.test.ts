/**
 * Quality Validator Tests
 *
 * Tests for lib/builder/validators/quality.ts
 */

import { describe, it, expect } from 'vitest';
import { validateQuality } from '@/lib/builder/validators/quality';

// =============================================================================
// NO COVER IMAGE
// =============================================================================

describe('validateQuality - no cover image', () => {
  it('returns warning when cover image is missing', () => {
    const draft = { cover: { mediaId: null } };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_NO_COVER')).toBe(true);
  });

  it('returns no warning when cover exists', () => {
    const draft = { cover: { mediaId: 'some-media-id' } };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_NO_COVER')).toBe(false);
  });
});

// =============================================================================
// SHORT DESCRIPTION
// =============================================================================

describe('validateQuality - short description', () => {
  it('returns warning for empty description', () => {
    const draft = { core: { description: '' } };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_SHORT_DESCRIPTION')).toBe(true);
  });

  it('returns warning for description under 50 chars', () => {
    const draft = { core: { description: 'Short desc' } };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_SHORT_DESCRIPTION')).toBe(true);
  });

  it('returns no warning for description at 50+ chars', () => {
    const draft = {
      core: {
        description: 'A'.repeat(50),
      },
    };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_SHORT_DESCRIPTION')).toBe(false);
  });

  it('includes current and recommended length in meta', () => {
    const draft = { core: { description: 'Short' } };
    const errors = validateQuality(draft);
    const err = errors.find((e) => e.code === 'B_SHORT_DESCRIPTION');
    expect(err?.meta?.currentLength).toBe(5);
    expect(err?.meta?.recommendedLength).toBe(50);
  });
});

// =============================================================================
// MISSING AGE RANGE
// =============================================================================

describe('validateQuality - missing age range', () => {
  it('returns warning when both age_min and age_max are null', () => {
    const draft = { core: { age_min: null, age_max: null } };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_AGE_RANGE')).toBe(true);
  });

  it('returns no warning when age_min is set', () => {
    const draft = { core: { age_min: 6, age_max: null } };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_AGE_RANGE')).toBe(false);
  });

  it('returns no warning when age_max is set', () => {
    const draft = { core: { age_min: null, age_max: 12 } };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_AGE_RANGE')).toBe(false);
  });
});

// =============================================================================
// MISSING PLAYER COUNT
// =============================================================================

describe('validateQuality - missing player count', () => {
  it('returns warning when both min and max players are null', () => {
    const draft = { core: { min_players: null, max_players: null } };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_PLAYER_COUNT')).toBe(true);
  });

  it('returns no warning when min_players is set', () => {
    const draft = { core: { min_players: 2, max_players: null } };
    const errors = validateQuality(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_PLAYER_COUNT')).toBe(false);
  });
});

// =============================================================================
// ALL WARNINGS
// =============================================================================

describe('validateQuality - warning severity', () => {
  it('all items have severity = warning', () => {
    const draft = {
      core: {
        description: '',
        age_min: null,
        age_max: null,
        min_players: null,
        max_players: null,
      },
      cover: { mediaId: null },
    };
    const errors = validateQuality(draft);
    expect(errors.length).toBe(4); // all 4 warnings
    errors.forEach((e) => {
      expect(e.severity).toBe('warning');
    });
  });

  it('all items have gate = publish', () => {
    const draft = {
      core: { description: '' },
      cover: { mediaId: null },
    };
    const errors = validateQuality(draft);
    errors.forEach((e) => {
      expect(e.gate).toBe('publish');
    });
  });
});

// =============================================================================
// COMPLETE DRAFT
// =============================================================================

describe('validateQuality - complete draft', () => {
  it('returns empty array for quality draft', () => {
    const draft = {
      core: {
        description: 'A'.repeat(100),
        age_min: 6,
        age_max: 12,
        min_players: 2,
        max_players: 10,
      },
      cover: { mediaId: 'cover-123' },
    };
    const errors = validateQuality(draft);
    expect(errors).toHaveLength(0);
  });
});
