/**
 * C4 — Null-Rendering / Null-Safety Tests
 *
 * Verifies that the data pipeline handles null/undefined/empty inputs
 * without crashing. Tests all mappers with edge-case inputs that would
 * cause component rendering failures if not handled.
 *
 * Note: Actual component rendering tests require jsdom environment
 * and are deferred to backlog item 9.8. These tests verify the data
 * layer null-safety that prevents component crashes.
 */

import { describe, it, expect } from 'vitest';
import {
  mapDbGameToSummary,
  mapDbGameToDetailPreview,
  mapDbGameToDetailFull,
  mapSteps,
  mapPhases,
  mapMaterials,
  mapRoles,
  mapArtifacts,
  mapTriggers,
  mapBoardConfigToWidgets,
  createMinimalSummary,
  validateGameSummary,
  // Formatters — also tested for null safety
  formatDuration,
  formatPlayers,
  formatAge,
  formatEnergyLevel,
  formatPlayMode,
  formatEnvironment,
  formatDifficulty,
  formatRating,
  formatRatingWithCount,
  formatPlayCount,
  formatStatus,
  type DbGame,
} from '@/lib/game-display';

// =============================================================================
// Minimal / empty DbGame
// =============================================================================

const EMPTY_GAME: DbGame = { id: 'empty', name: 'Empty' };

const NULL_FIELDS_GAME: DbGame = {
  id: 'null-fields',
  name: 'Null Fields',
  slug: null as unknown as string,
  description: null as unknown as string,
  status: null as unknown as string,
  play_mode: null as unknown as string,
  energy_level: null as unknown as string,
  location_type: null as unknown as string,
  difficulty: null as unknown as string,
  time_estimate_min: null as unknown as number,
  time_estimate_max: null as unknown as number,
  min_players: null as unknown as number,
  max_players: null as unknown as number,
  age_min: null as unknown as number,
  age_max: null as unknown as number,
  translations: null as unknown as DbGame['translations'],
  media: null as unknown as DbGame['media'],
  steps: null as unknown as DbGame['steps'],
  phases: null as unknown as DbGame['phases'],
  materials: null as unknown as DbGame['materials'],
  roles: null as unknown as DbGame['roles'],
  artifacts: null as unknown as DbGame['artifacts'],
  triggers: null as unknown as DbGame['triggers'],
  board_config: null as unknown as DbGame['board_config'],
};

const EMPTY_ARRAYS_GAME: DbGame = {
  id: 'empty-arrays',
  name: 'Empty Arrays',
  translations: [],
  media: [],
  steps: [],
  phases: [],
  materials: [],
  roles: [],
  artifacts: [],
  triggers: [],
};

// =============================================================================
// Main mapper null-safety
// =============================================================================

describe('Null-safety: mapDbGameToSummary', () => {
  it('handles minimal game (id + name only)', () => {
    const summary = mapDbGameToSummary(EMPTY_GAME);
    expect(summary.id).toBe('empty');
    expect(summary.title).toBe('Empty');
  });

  it('handles all-null fields without throwing', () => {
    expect(() => mapDbGameToSummary(NULL_FIELDS_GAME)).not.toThrow();
  });

  it('handles empty arrays without throwing', () => {
    expect(() => mapDbGameToSummary(EMPTY_ARRAYS_GAME)).not.toThrow();
  });
});

describe('Null-safety: mapDbGameToDetailPreview', () => {
  it('handles minimal game', () => {
    const preview = mapDbGameToDetailPreview(EMPTY_GAME);
    expect(preview.id).toBe('empty');
    expect(preview.steps).toBeUndefined();
    expect(preview.phases).toBeUndefined();
    expect(preview.materials).toBeUndefined();
  });

  it('handles all-null fields without throwing', () => {
    expect(() => mapDbGameToDetailPreview(NULL_FIELDS_GAME)).not.toThrow();
  });

  it('handles empty arrays without throwing', () => {
    const preview = mapDbGameToDetailPreview(EMPTY_ARRAYS_GAME);
    expect(preview.id).toBe('empty-arrays');
  });
});

describe('Null-safety: mapDbGameToDetailFull', () => {
  it('handles minimal game', () => {
    const full = mapDbGameToDetailFull(EMPTY_GAME);
    expect(full.id).toBe('empty');
    expect(full.roles).toBeUndefined();
    expect(full.artifacts).toBeUndefined();
    expect(full.triggers).toBeUndefined();
  });

  it('handles all-null fields without throwing', () => {
    expect(() => mapDbGameToDetailFull(NULL_FIELDS_GAME)).not.toThrow();
  });

  it('handles empty arrays without throwing', () => {
    expect(() => mapDbGameToDetailFull(EMPTY_ARRAYS_GAME)).not.toThrow();
  });
});

// =============================================================================
// Individual mapper null-safety
// =============================================================================

describe('Null-safety: individual mappers', () => {
  it('mapSteps handles undefined', () => {
    expect(() => mapSteps(undefined)).not.toThrow();
    expect(mapSteps(undefined)).toEqual([]);
  });

  it('mapSteps handles empty array', () => {
    expect(mapSteps([])).toEqual([]);
  });

  it('mapSteps handles items with all-null fields', () => {
    expect(() => mapSteps([{ id: null as unknown as string }])).not.toThrow();
  });

  it('mapPhases handles undefined', () => {
    expect(() => mapPhases(undefined)).not.toThrow();
    expect(mapPhases(undefined)).toEqual([]);
  });

  it('mapPhases handles empty array', () => {
    expect(mapPhases([])).toEqual([]);
  });

  it('mapMaterials handles undefined', () => {
    expect(() => mapMaterials(undefined)).not.toThrow();
    expect(mapMaterials(undefined)).toEqual({ items: [] });
  });

  it('mapMaterials handles empty items', () => {
    expect(() => mapMaterials([{ id: 'm1', items: [], locale: 'sv' }])).not.toThrow();
  });

  it('mapMaterials handles null items array', () => {
    expect(() => mapMaterials([{ id: 'm1', items: null as unknown as string[], locale: 'sv' }])).not.toThrow();
  });

  it('mapRoles handles undefined', () => {
    expect(() => mapRoles(undefined)).not.toThrow();
    expect(mapRoles(undefined)).toEqual([]);
  });

  it('mapRoles handles empty array', () => {
    expect(mapRoles([])).toEqual([]);
  });

  it('mapArtifacts handles undefined', () => {
    expect(() => mapArtifacts(undefined)).not.toThrow();
    expect(mapArtifacts(undefined)).toEqual([]);
  });

  it('mapArtifacts handles artifact with no variants', () => {
    expect(() => mapArtifacts([{ id: 'a1', title: 'Test', artifact_order: 1 }])).not.toThrow();
  });

  it('mapArtifacts handles artifact with empty variants', () => {
    expect(() => mapArtifacts([{ id: 'a1', title: 'Test', artifact_order: 1, variants: [] }])).not.toThrow();
  });

  it('mapTriggers handles undefined', () => {
    expect(() => mapTriggers(undefined)).not.toThrow();
    expect(mapTriggers(undefined)).toEqual([]);
  });

  it('mapTriggers handles empty array', () => {
    expect(mapTriggers([])).toEqual([]);
  });

  it('mapBoardConfigToWidgets handles empty config', () => {
    expect(() => mapBoardConfigToWidgets({})).not.toThrow();
    expect(mapBoardConfigToWidgets({})).toEqual([]);
  });
});

// =============================================================================
// Formatter null-safety (all 14 formatters with null/undefined)
// =============================================================================

describe('Null-safety: all formatters', () => {
  const nullTests = [
    { name: 'formatDuration', fn: () => formatDuration(null, null) },
    { name: 'formatDuration (undefined)', fn: () => formatDuration() },
    { name: 'formatPlayers', fn: () => formatPlayers(null, null) },
    { name: 'formatPlayers (undefined)', fn: () => formatPlayers() },
    { name: 'formatAge', fn: () => formatAge(null, null) },
    { name: 'formatAge (undefined)', fn: () => formatAge() },
    { name: 'formatEnergyLevel', fn: () => formatEnergyLevel(null) },
    { name: 'formatEnergyLevel (undefined)', fn: () => formatEnergyLevel() },
    { name: 'formatPlayMode', fn: () => formatPlayMode(null) },
    { name: 'formatPlayMode (undefined)', fn: () => formatPlayMode() },
    { name: 'formatEnvironment', fn: () => formatEnvironment(null) },
    { name: 'formatEnvironment (undefined)', fn: () => formatEnvironment() },
    { name: 'formatDifficulty', fn: () => formatDifficulty(null) },
    { name: 'formatDifficulty (undefined)', fn: () => formatDifficulty() },
    { name: 'formatRating', fn: () => formatRating(null) },
    { name: 'formatRating (undefined)', fn: () => formatRating() },
    { name: 'formatRatingWithCount', fn: () => formatRatingWithCount(null, null) },
    { name: 'formatPlayCount', fn: () => formatPlayCount(null) },
    { name: 'formatPlayCount (undefined)', fn: () => formatPlayCount() },
    { name: 'formatStatus', fn: () => formatStatus(null) },
    { name: 'formatStatus (undefined)', fn: () => formatStatus() },
  ];

  it.each(nullTests)('$name returns null without throwing', ({ fn }) => {
    expect(() => fn()).not.toThrow();
    expect(fn()).toBeNull();
  });
});

// =============================================================================
// createMinimalSummary edge cases
// =============================================================================

describe('Null-safety: createMinimalSummary', () => {
  it('handles empty strings', () => {
    expect(() => createMinimalSummary('', '')).not.toThrow();
  });

  it('produces valid (if minimal) output', () => {
    const s = createMinimalSummary('id', 'title');
    expect(s.id).toBe('id');
    expect(s.title).toBe('title');
  });
});

// =============================================================================
// validateGameSummary edge cases
// =============================================================================

describe('Null-safety: validateGameSummary', () => {
  const invalidInputs = [
    { name: 'null', input: null },
    { name: 'undefined', input: undefined },
    { name: 'number', input: 42 },
    { name: 'string', input: 'hello' },
    { name: 'empty object', input: {} },
    { name: 'array', input: [] },
    { name: 'missing id', input: { title: 'Game' } },
    { name: 'missing title', input: { id: 'x' } },
    { name: 'empty id', input: { id: '', title: 'Game' } },
    { name: 'empty title', input: { id: 'x', title: '' } },
  ];

  it.each(invalidInputs)('returns false for $name without throwing', ({ input }) => {
    expect(() => validateGameSummary(input)).not.toThrow();
    expect(validateGameSummary(input)).toBe(false);
  });
});
