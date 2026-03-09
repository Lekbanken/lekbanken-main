/**
 * C2 — Formatter Unit Tests
 *
 * Tests all 14 public formatters from lib/game-display/formatters.ts
 * Each formatter tested for: valid input, null input, edge cases, i18n labels override.
 */

import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatDurationShort,
  formatPlayers,
  formatPlayersShort,
  formatAge,
  formatAgeShort,
  formatEnergyLevel,
  formatPlayMode,
  formatEnvironment,
  formatDifficulty,
  formatRating,
  formatRatingWithCount,
  formatPlayCount,
  formatStatus,
} from '@/lib/game-display';

// =============================================================================
// formatDuration
// =============================================================================

describe('formatDuration', () => {
  it('returns range string for min and max', () => {
    expect(formatDuration(15, 30)).toBe('15-30 min');
  });

  it('returns single value when min equals max', () => {
    expect(formatDuration(15, 15)).toBe('15 min');
  });

  it('returns single value when only min provided', () => {
    expect(formatDuration(15, null)).toBe('15 min');
  });

  it('returns single value when only max provided', () => {
    expect(formatDuration(null, 30)).toBe('30 min');
  });

  it('returns null when both null', () => {
    expect(formatDuration(null, null)).toBeNull();
  });

  it('returns null when both undefined', () => {
    expect(formatDuration()).toBeNull();
  });

  it('respects i18n labels override', () => {
    expect(formatDuration(15, 30, { unit: 'minutes' })).toBe('15-30 minutes');
  });
});

// =============================================================================
// formatDurationShort
// =============================================================================

describe('formatDurationShort', () => {
  it('returns range without unit', () => {
    expect(formatDurationShort(15, 30)).toBe('15-30');
  });

  it('returns single value when equal', () => {
    expect(formatDurationShort(15, 15)).toBe('15');
  });

  it('returns null when both null', () => {
    expect(formatDurationShort(null, null)).toBeNull();
  });
});

// =============================================================================
// formatPlayers
// =============================================================================

describe('formatPlayers', () => {
  it('returns range string', () => {
    expect(formatPlayers(4, 12)).toBe('4-12 deltagare');
  });

  it('returns single value when equal', () => {
    expect(formatPlayers(6, 6)).toBe('6 deltagare');
  });

  it('returns min+ when only min', () => {
    expect(formatPlayers(4, null)).toBe('4+ deltagare');
  });

  it('returns "Upp till" when only max', () => {
    expect(formatPlayers(null, 12)).toBe('Upp till 12 deltagare');
  });

  it('returns null when both null', () => {
    expect(formatPlayers(null, null)).toBeNull();
  });

  it('respects i18n labels override', () => {
    expect(formatPlayers(4, 12, { unit: 'participants' })).toBe('4-12 participants');
  });

  it('respects upTo template', () => {
    expect(formatPlayers(null, 20, { unit: 'players', upTo: 'Up to {max} players' }))
      .toBe('Up to 20 players');
  });
});

// =============================================================================
// formatPlayersShort
// =============================================================================

describe('formatPlayersShort', () => {
  it('returns range', () => {
    expect(formatPlayersShort(4, 12)).toBe('4-12');
  });

  it('returns min+', () => {
    expect(formatPlayersShort(4, null)).toBe('4+');
  });

  it('returns ≤max when only max', () => {
    expect(formatPlayersShort(null, 12)).toBe('≤12');
  });

  it('returns null when both null', () => {
    expect(formatPlayersShort(null, null)).toBeNull();
  });
});

// =============================================================================
// formatAge
// =============================================================================

describe('formatAge', () => {
  it('returns range string', () => {
    expect(formatAge(8, 12)).toBe('8-12 år');
  });

  it('returns single value when equal', () => {
    expect(formatAge(10, 10)).toBe('10 år');
  });

  it('returns min+ when only min', () => {
    expect(formatAge(8, null)).toBe('8+ år');
  });

  it('treats 99 as no upper limit', () => {
    expect(formatAge(8, 99)).toBe('8+ år');
  });

  it('treats 100 as no upper limit', () => {
    expect(formatAge(8, 100)).toBe('8+ år');
  });

  it('returns "Upp till" when only max', () => {
    expect(formatAge(null, 12)).toBe('Upp till 12 år');
  });

  it('returns null when both null', () => {
    expect(formatAge(null, null)).toBeNull();
  });

  it('respects i18n labels override', () => {
    expect(formatAge(8, 12, { unit: 'years' })).toBe('8-12 years');
  });
});

// =============================================================================
// formatAgeShort
// =============================================================================

describe('formatAgeShort', () => {
  it('returns range', () => {
    expect(formatAgeShort(8, 12)).toBe('8-12');
  });

  it('returns min+ for 99 max', () => {
    expect(formatAgeShort(8, 99)).toBe('8+');
  });

  it('returns null when both null', () => {
    expect(formatAgeShort(null, null)).toBeNull();
  });
});

// =============================================================================
// formatEnergyLevel
// =============================================================================

describe('formatEnergyLevel', () => {
  it('returns format object for valid level', () => {
    const result = formatEnergyLevel('high');
    expect(result).not.toBeNull();
    expect(result!.label).toBe('Hög energi');
    expect(result!.labelShort).toBe('Hög');
    expect(result!.variant).toBe('destructive');
  });

  it('returns correct format for each level', () => {
    expect(formatEnergyLevel('low')!.variant).toBe('success');
    expect(formatEnergyLevel('medium')!.variant).toBe('warning');
    expect(formatEnergyLevel('high')!.variant).toBe('destructive');
  });

  it('returns null for null input', () => {
    expect(formatEnergyLevel(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatEnergyLevel()).toBeNull();
  });

  it('respects i18n labels override', () => {
    const result = formatEnergyLevel('high', { high: 'High energy', highShort: 'High' });
    expect(result!.label).toBe('High energy');
    expect(result!.labelShort).toBe('High');
    // Styling should be preserved
    expect(result!.variant).toBe('destructive');
  });

  it('partially overrides labels', () => {
    const result = formatEnergyLevel('low', { low: 'Low energy' });
    expect(result!.label).toBe('Low energy');
    expect(result!.labelShort).toBe('Låg'); // Not overridden
  });
});

// =============================================================================
// formatPlayMode
// =============================================================================

describe('formatPlayMode', () => {
  it('returns format object for valid mode', () => {
    const result = formatPlayMode('facilitated');
    expect(result).not.toBeNull();
    expect(result!.label).toBe('Ledd aktivitet');
    expect(result!.icon).toBe('🎯');
  });

  it('returns correct format for each mode', () => {
    expect(formatPlayMode('basic')!.label).toBe('Enkel lek');
    expect(formatPlayMode('facilitated')!.label).toBe('Ledd aktivitet');
    expect(formatPlayMode('participants')!.label).toBe('Deltagarlek');
  });

  it('returns null for null input', () => {
    expect(formatPlayMode(null)).toBeNull();
  });

  it('respects i18n labels override', () => {
    const result = formatPlayMode('basic', { basicLabel: 'Simple game', basicShort: 'Simple' });
    expect(result!.label).toBe('Simple game');
    expect(result!.labelShort).toBe('Simple');
    expect(result!.icon).toBe('🎮'); // Styling preserved
  });
});

// =============================================================================
// formatEnvironment
// =============================================================================

describe('formatEnvironment', () => {
  it('returns format object for each environment', () => {
    expect(formatEnvironment('indoor')!.label).toBe('Inomhus');
    expect(formatEnvironment('outdoor')!.label).toBe('Utomhus');
    expect(formatEnvironment('both')!.label).toBe('Inne eller ute');
  });

  it('includes icon', () => {
    expect(formatEnvironment('indoor')!.icon).toBe('🏠');
    expect(formatEnvironment('outdoor')!.icon).toBe('🌳');
  });

  it('returns null for null input', () => {
    expect(formatEnvironment(null)).toBeNull();
  });

  it('respects i18n labels override', () => {
    const result = formatEnvironment('indoor', { indoorLabel: 'Indoors', indoorShort: 'In' });
    expect(result!.label).toBe('Indoors');
    expect(result!.labelShort).toBe('In');
  });
});

// =============================================================================
// formatDifficulty
// =============================================================================

describe('formatDifficulty', () => {
  it('returns format object for each difficulty', () => {
    expect(formatDifficulty('easy')!.label).toBe('Lätt');
    expect(formatDifficulty('medium')!.label).toBe('Medel');
    expect(formatDifficulty('hard')!.label).toBe('Svår');
  });

  it('returns null for null input', () => {
    expect(formatDifficulty(null)).toBeNull();
  });

  it('respects i18n labels override', () => {
    const result = formatDifficulty('hard', { hardLabel: 'Difficult', hardShort: 'Hard' });
    expect(result!.label).toBe('Difficult');
    expect(result!.labelShort).toBe('Hard');
  });
});

// =============================================================================
// formatRating
// =============================================================================

describe('formatRating', () => {
  it('returns rating to 1 decimal', () => {
    expect(formatRating(4.567)).toBe('4.6');
  });

  it('returns exact value when already 1 decimal', () => {
    expect(formatRating(4.5)).toBe('4.5');
  });

  it('returns .0 for integer', () => {
    expect(formatRating(4)).toBe('4.0');
  });

  it('returns null for null input', () => {
    expect(formatRating(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatRating()).toBeNull();
  });
});

// =============================================================================
// formatRatingWithCount
// =============================================================================

describe('formatRatingWithCount', () => {
  it('returns rating with count in parens', () => {
    expect(formatRatingWithCount(4.5, 123)).toBe('4.5 (123)');
  });

  it('returns only rating when count is null', () => {
    expect(formatRatingWithCount(4.5, null)).toBe('4.5');
  });

  it('returns null when rating is null', () => {
    expect(formatRatingWithCount(null, 123)).toBeNull();
  });

  it('handles count of 0', () => {
    expect(formatRatingWithCount(4.5, 0)).toBe('4.5 (0)');
  });
});

// =============================================================================
// formatPlayCount
// =============================================================================

describe('formatPlayCount', () => {
  it('returns formatted count with plural', () => {
    const result = formatPlayCount(1234);
    expect(result).toMatch(/1.*234 spelningar/);
  });

  it('returns singular for count of 1', () => {
    expect(formatPlayCount(1)).toBe('1 spelning');
  });

  it('returns null for null input', () => {
    expect(formatPlayCount(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatPlayCount()).toBeNull();
  });

  it('handles zero', () => {
    expect(formatPlayCount(0)).toMatch(/0 spelningar/);
  });

  it('respects i18n labels override', () => {
    expect(formatPlayCount(1, { singular: 'play', plural: 'plays' })).toBe('1 play');
    expect(formatPlayCount(5, { singular: 'play', plural: 'plays' })).toMatch(/5 plays/);
  });
});

// =============================================================================
// formatStatus
// =============================================================================

describe('formatStatus', () => {
  it('returns format object for each status', () => {
    expect(formatStatus('draft')!.label).toBe('Utkast');
    expect(formatStatus('published')!.label).toBe('Publicerad');
    expect(formatStatus('archived')!.label).toBe('Arkiverad');
  });

  it('returns null for null input', () => {
    expect(formatStatus(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatStatus()).toBeNull();
  });

  it('respects i18n labels override', () => {
    const result = formatStatus('draft', { draft: 'Draft' });
    expect(result!.label).toBe('Draft');
  });

  it('returns styling properties', () => {
    const result = formatStatus('published');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('bgColor');
  });
});
