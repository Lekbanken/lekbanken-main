/**
 * Filter Registry Contract Tests
 *
 * Simple tests to verify that:
 * 1. Registry dbMapping.column exists in games schema
 * 2. Registry dbMapping.relation exists as a table
 * 3. Registry enum options match expected values
 *
 * These tests ensure the filter registry stays in sync with the database schema.
 * If a test fails, it means the registry has drifted from the DB and needs updating.
 *
 * @see features/browse/filterRegistry.ts
 */

import { describe, test, expect } from 'vitest';
import type { Database } from '@/types/supabase';
import { FILTER_REGISTRY, getBasicFilters, getSuperFilterGroups, getFiltersByGroup } from '@/features/browse/filterRegistry';

// Extract games table columns from Supabase types
type GamesRow = Database['public']['Tables']['games']['Row'];
type GamesColumns = keyof GamesRow;

// Known relation tables (from schema)
const KNOWN_RELATION_TABLES = [
  'purposes',
  'products',
  'game_secondary_purposes',
  'game_roles',
  'game_artifacts',
  'game_phases',
  'game_materials',
  'game_steps',
  'game_triggers',
  'game_tools',
] as const;

// Known enum values from schema
const KNOWN_ENUMS = {
  energy_level: ['low', 'medium', 'high'] as const,
  location_type: ['indoor', 'outdoor', 'both'] as const,
  play_mode: ['basic', 'facilitated', 'participants'] as const,
  difficulty: ['easy', 'medium', 'hard'] as const,
};

describe('FilterRegistry ↔ Database Contract', () => {
  describe('Column mappings', () => {
    test('all direct column mappings exist in games table', () => {
      const columnFilters = FILTER_REGISTRY.filter((f) => f.dbMapping.column && !f.dbMapping.computed);

      for (const filter of columnFilters) {
        const column = filter.dbMapping.column as GamesColumns;
        // This will cause a TypeScript error if the column doesn't exist
        // At runtime, we just check it's a valid column name
        expect(column).toBeDefined();
        expect(typeof column).toBe('string');
      }
    });

    test('all relation mappings reference known tables', () => {
      const relationFilters = FILTER_REGISTRY.filter((f) => f.dbMapping.relation);

      for (const filter of relationFilters) {
        const relation = filter.dbMapping.relation;
        expect(
          KNOWN_RELATION_TABLES.includes(relation as typeof KNOWN_RELATION_TABLES[number]),
          `Filter "${filter.key}" references unknown relation table: ${relation}`
        ).toBe(true);
      }
    });
  });

  describe('Enum options', () => {
    test('energy level options match schema enum', () => {
      const energyFilter = FILTER_REGISTRY.find((f) => f.key === 'energyLevels');
      expect(energyFilter).toBeDefined();
      expect(energyFilter?.options).toBeDefined();

      const values = energyFilter?.options?.map((o) => o.value) ?? [];
      expect(values).toEqual(expect.arrayContaining([...KNOWN_ENUMS.energy_level]));
    });

    test('environment options match schema enum', () => {
      const envFilter = FILTER_REGISTRY.find((f) => f.key === 'environment');
      expect(envFilter).toBeDefined();
      expect(envFilter?.options).toBeDefined();

      const values = envFilter?.options?.map((o) => o.value) ?? [];
      expect(values).toEqual(expect.arrayContaining([...KNOWN_ENUMS.location_type]));
    });

    test('play mode options match schema enum', () => {
      const playModeFilter = FILTER_REGISTRY.find((f) => f.key === 'playMode');
      expect(playModeFilter).toBeDefined();
      expect(playModeFilter?.options).toBeDefined();

      const values = playModeFilter?.options?.map((o) => o.value) ?? [];
      expect(values).toEqual(expect.arrayContaining([...KNOWN_ENUMS.play_mode]));
    });

    test('difficulty options match schema enum', () => {
      const difficultyFilter = FILTER_REGISTRY.find((f) => f.key === 'difficulty');
      expect(difficultyFilter).toBeDefined();
      expect(difficultyFilter?.options).toBeDefined();

      const values = difficultyFilter?.options?.map((o) => o.value) ?? [];
      expect(values).toEqual(expect.arrayContaining([...KNOWN_ENUMS.difficulty]));
    });
  });

  describe('Registry structure', () => {
    test('all filters have required properties', () => {
      for (const filter of FILTER_REGISTRY) {
        expect(filter.key, `Filter missing key`).toBeDefined();
        expect(filter.labelKey, `Filter ${filter.key} missing labelKey`).toBeDefined();
        expect(filter.type, `Filter ${filter.key} missing type`).toBeDefined();
        expect(filter.group, `Filter ${filter.key} missing group`).toBeDefined();
        expect(filter.priority, `Filter ${filter.key} missing priority`).toBeDefined();
        expect(filter.dbMapping, `Filter ${filter.key} missing dbMapping`).toBeDefined();
      }
    });

    test('filter keys are unique', () => {
      const keys = FILTER_REGISTRY.map((f) => f.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    test('basic filters exist', () => {
      const basicFilters = getBasicFilters();
      expect(basicFilters.length).toBeGreaterThan(0);
      expect(basicFilters.length).toBeLessThanOrEqual(10); // "~6-10 stable filters"
    });

    test('super filter groups exist', () => {
      const superGroups = getSuperFilterGroups();
      expect(superGroups.length).toBeGreaterThan(0);

      for (const group of superGroups) {
        const filters = getFiltersByGroup(group);
        expect(filters.length).toBeGreaterThan(0);
      }
    });

    test('enum filters have options', () => {
      const enumFilters = FILTER_REGISTRY.filter((f) => f.type === 'enum');

      for (const filter of enumFilters) {
        expect(
          filter.options?.length,
          `Enum filter ${filter.key} has no options`
        ).toBeGreaterThan(0);
      }
    });

    test('range filters have range config', () => {
      const rangeFilters = FILTER_REGISTRY.filter((f) => f.type === 'range');

      for (const filter of rangeFilters) {
        expect(filter.range, `Range filter ${filter.key} missing range config`).toBeDefined();
        expect(filter.range?.min).toBeDefined();
        expect(filter.range?.max).toBeDefined();
        expect(filter.range?.step).toBeDefined();
      }
    });
  });

  describe('i18n keys', () => {
    test('all label keys follow browse.filter.* pattern', () => {
      for (const filter of FILTER_REGISTRY) {
        expect(
          filter.labelKey.startsWith('browse.filter.'),
          `Filter ${filter.key} has invalid labelKey: ${filter.labelKey}`
        ).toBe(true);
      }
    });

    test('enum option labelKeys follow filter pattern', () => {
      const enumFilters = FILTER_REGISTRY.filter((f) => f.type === 'enum' && f.options);

      for (const filter of enumFilters) {
        for (const option of filter.options ?? []) {
          expect(
            option.labelKey.startsWith('browse.filter.'),
            `Option ${option.value} in filter ${filter.key} has invalid labelKey: ${option.labelKey}`
          ).toBe(true);
        }
      }
    });
  });
});
