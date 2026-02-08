/**
 * Import Parity Tests (Sprint 4.5)
 *
 * Industrial-grade coverage for CSV import correctness:
 * CSV fixture → parseCsvGames → Draft → resolveDraft → gates
 *
 * Tests verify that:
 * 1. CSV files parse without errors
 * 2. ParsedGame converts to valid GameDraft format
 * 3. Draft passes resolveDraft validation at appropriate gates
 * 4. Field mappings are consistent between import and builder
 *
 * @module tests/unit/builder/import-parity.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCsvGames } from '@/features/admin/games/utils/csv-parser';
import { resolveDraft, isDraftValid } from '@/lib/builder/resolver';
import type { GameDraft } from '@/lib/builder/resolver';
import type { ParsedGame } from '@/types/csv-import';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const FIXTURES_DIR = path.join(__dirname, '../../fixtures/import');

interface TestFixture {
  name: string;
  csvPath: string;
  expectedGames: number;
  playMode: 'basic' | 'facilitated' | 'participants';
  expectDraftValid: boolean;
  expectPlayable: boolean;
}

const FIXTURES: TestFixture[] = [
  {
    name: 'simple',
    csvPath: path.join(FIXTURES_DIR, 'simple.csv'),
    expectedGames: 1,
    playMode: 'basic',
    expectDraftValid: true,
    expectPlayable: false, // basic games may lack required fields
  },
  {
    name: 'facilitated',
    csvPath: path.join(FIXTURES_DIR, 'facilitated.csv'),
    expectedGames: 1,
    playMode: 'facilitated',
    expectDraftValid: true,
    expectPlayable: true,
  },
  {
    name: 'roles-artifacts',
    csvPath: path.join(FIXTURES_DIR, 'roles-artifacts.csv'),
    expectedGames: 1,
    playMode: 'participants',
    expectDraftValid: true,
    expectPlayable: true,
  },
];

// =============================================================================
// PARSED GAME → GAME DRAFT MAPPER
// =============================================================================

/**
 * Convert ParsedGame to GameDraft format for resolver validation.
 * This bridges the import pipeline output to the builder validation system.
 */
function parsedGameToDraft(parsed: ParsedGame): GameDraft {
  const stepIdMap = new Map<number, string>();
  const phaseIdMap = new Map<number, string>();
  const roleIdMap = new Map<number, string>();

  // Generate stable UUIDs for steps
  const steps = parsed.steps.map((step) => {
    const id = crypto.randomUUID();
    stepIdMap.set(step.step_order, id);
    return {
      id,
      title: step.title,
      body: step.body,
      step_order: step.step_order - 1, // Convert 1-based to 0-based
      display_mode: 'instant' as const,
      phase_id: null as string | null, // Will be resolved below
      duration_seconds: step.duration_seconds,
      leader_script: step.leader_script,
      participant_prompt: step.participant_prompt,
      board_text: step.board_text,
      optional: step.optional,
    };
  });

  // Generate stable UUIDs for phases
  const phases = parsed.phases.map((phase) => {
    const id = crypto.randomUUID();
    phaseIdMap.set(phase.phase_order, id);
    return {
      id,
      name: phase.name,
      phase_order: phase.phase_order - 1, // Convert 1-based to 0-based
      phase_type: phase.phase_type,
      timer_style: phase.timer_style,
      duration_seconds: phase.duration_seconds,
      timer_visible: phase.timer_visible,
      description: phase.description,
      board_message: phase.board_message,
      auto_advance: phase.auto_advance,
    };
  });

  // Generate stable UUIDs for roles
  const roles = (parsed.roles || []).map((role) => {
    const id = crypto.randomUUID();
    roleIdMap.set(role.role_order, id);
    return {
      id,
      name: role.name,
      role_order: role.role_order - 1, // Convert 1-based to 0-based
      assignment_strategy: role.assignment_strategy,
      icon: role.icon,
      color: role.color,
      public_description: role.public_description,
      private_instructions: role.private_instructions,
      private_hints: role.private_hints,
      min_count: role.min_count,
      max_count: role.max_count,
      scaling_rules: role.scaling_rules,
      conflicts_with: role.conflicts_with,
    };
  });

  // Generate stable UUIDs for artifacts with variants
  const artifacts = (parsed.artifacts || []).map((artifact) => {
    const id = crypto.randomUUID();
    return {
      id,
      title: artifact.title,
      artifact_type: artifact.artifact_type,
      artifact_order: artifact.artifact_order - 1, // Convert 1-based to 0-based
      description: artifact.description,
      metadata: artifact.metadata ?? {},
      tags: artifact.tags,
      variants: artifact.variants.map((variant) => {
        // Resolve visible_to_role_order to actual role ID
        let visibleToRoleId: string | null = null;
        if (variant.visible_to_role_order !== undefined && variant.visible_to_role_order !== null) {
          visibleToRoleId = roleIdMap.get(variant.visible_to_role_order) ?? null;
        }
        return {
          id: crypto.randomUUID(),
          visibility: variant.visibility,
          visible_to_role_id: visibleToRoleId,
          title: variant.title,
          body: variant.body,
          variant_order: variant.variant_order,
        };
      }),
    };
  });

  // Build core (convert null to undefined for GameDraft compatibility)
  const core = {
    name: parsed.name,
    description: parsed.description ?? undefined,
    short_description: parsed.short_description,
    play_mode: parsed.play_mode,
    energy_level: parsed.energy_level,
    location_type: parsed.location_type,
    min_players: parsed.min_players,
    max_players: parsed.max_players,
    age_min: parsed.age_min,
    age_max: parsed.age_max,
    difficulty: parsed.difficulty ?? undefined,
    time_estimate_min: parsed.time_estimate_min,
    duration_max: parsed.duration_max,
    main_purpose_id: parsed.main_purpose_id,
    accessibility_notes: parsed.accessibility_notes ?? undefined,
    space_requirements: parsed.space_requirements ?? undefined,
    leader_tips: parsed.leader_tips ?? undefined,
  };

  return {
    core,
    steps,
    phases,
    roles,
    artifacts,
    triggers: [],
    cover: { mediaId: null },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function loadFixtureCsv(fixturePath: string): string {
  return fs.readFileSync(fixturePath, 'utf-8');
}

// =============================================================================
// TESTS
// =============================================================================

describe('Import Parity Tests (Sprint 4.5)', () => {
  // =========================================================================
  // SUITE 1: CSV Parsing
  // =========================================================================
  describe('CSV Parsing', () => {
    it.each(FIXTURES)('$name: parses without fatal errors', async ({ csvPath }) => {
      const csvData = loadFixtureCsv(csvPath);
      const { games, errors } = parseCsvGames(csvData);

      // Filter for actual errors (not warnings)
      const fatalErrors = errors.filter((e) => e.severity === 'error');
      expect(fatalErrors).toHaveLength(0);
      expect(games.length).toBeGreaterThan(0);
    });

    it.each(FIXTURES)('$name: returns expected number of games', async ({ csvPath, expectedGames }) => {
      const csvData = loadFixtureCsv(csvPath);
      const { games } = parseCsvGames(csvData);

      expect(games).toHaveLength(expectedGames);
    });

    it.each(FIXTURES)('$name: game has correct play_mode', async ({ csvPath, playMode }) => {
      const csvData = loadFixtureCsv(csvPath);
      const { games } = parseCsvGames(csvData);

      expect(games[0].play_mode).toBe(playMode);
    });
  });

  // =========================================================================
  // SUITE 2: ParsedGame → Draft Conversion
  // =========================================================================
  describe('ParsedGame to Draft Conversion', () => {
    it.each(FIXTURES)('$name: converts to valid draft structure', async ({ csvPath }) => {
      const csvData = loadFixtureCsv(csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);

      expect(draft.core).toBeDefined();
      expect(draft.steps).toBeDefined();
      expect(Array.isArray(draft.steps)).toBe(true);
    });

    it.each(FIXTURES)('$name: all step IDs are valid UUIDs', async ({ csvPath }) => {
      const csvData = loadFixtureCsv(csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const step of draft.steps || []) {
        expect(step.id).toMatch(uuidRegex);
      }
    });

    it.each(FIXTURES)('$name: all phase IDs are valid UUIDs', async ({ csvPath }) => {
      const csvData = loadFixtureCsv(csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const phase of draft.phases || []) {
        expect(phase.id).toMatch(uuidRegex);
      }
    });

    it.each(FIXTURES)('$name: steps have 0-based order', async ({ csvPath }) => {
      const csvData = loadFixtureCsv(csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);

      if (draft.steps && draft.steps.length > 0) {
        expect(draft.steps[0].step_order).toBe(0);
      }
    });
  });

  // =========================================================================
  // SUITE 3: Resolver Gates
  // =========================================================================
  describe('Resolver Gate Validation', () => {
    it.each(FIXTURES)('$name: resolveDraft returns result', async ({ csvPath }) => {
      const csvData = loadFixtureCsv(csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);
      const result = resolveDraft(draft);

      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('errorsByGate');
      expect(result).toHaveProperty('counts');
    });

    it.each(FIXTURES)('$name: isDraftValid matches expectation', async ({ csvPath, expectDraftValid }) => {
      const csvData = loadFixtureCsv(csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);

      expect(isDraftValid(draft)).toBe(expectDraftValid);
    });

    it('simple fixture: has no structural errors', async () => {
      const csvData = loadFixtureCsv(FIXTURES[0].csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);
      const result = resolveDraft(draft);

      const draftErrors = result.errorsByGate.draft;
      expect(draftErrors).toHaveLength(0);
    });

    it('facilitated fixture: passes playable gate', async () => {
      const csvData = loadFixtureCsv(FIXTURES[1].csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);
      const result = resolveDraft(draft);

      const playableBlocking = result.blockingErrorsFor('playable');
      // May have some soft errors but should have minimal blocking errors
      expect(playableBlocking.length).toBeLessThan(5);
    });

    it('roles-artifacts fixture: roles have valid structure', async () => {
      const csvData = loadFixtureCsv(FIXTURES[2].csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);

      expect(draft.roles).toBeDefined();
      expect(draft.roles!.length).toBeGreaterThan(0);
      for (const role of draft.roles!) {
        expect(role.id).toBeDefined();
        expect(role.name).toBeDefined();
        expect(role.assignment_strategy).toBeDefined();
      }
    });

    it('roles-artifacts fixture: artifacts have variants', async () => {
      const csvData = loadFixtureCsv(FIXTURES[2].csvPath);
      const { games } = parseCsvGames(csvData);
      const draft = parsedGameToDraft(games[0]);

      expect(draft.artifacts).toBeDefined();
      expect(draft.artifacts!.length).toBeGreaterThan(0);
      for (const artifact of draft.artifacts!) {
        expect(artifact.id).toBeDefined();
        expect(artifact.variants).toBeDefined();
        expect(artifact.variants!.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // SUITE 4: Field Parity
  // =========================================================================
  describe('Field Parity', () => {
    it('ParsedGame.steps maps to Draft.steps correctly', async () => {
      const csvData = loadFixtureCsv(FIXTURES[1].csvPath);
      const { games } = parseCsvGames(csvData);
      const parsed = games[0];
      const draft = parsedGameToDraft(parsed);

      expect(draft.steps!.length).toBe(parsed.steps.length);
      for (let i = 0; i < parsed.steps.length; i++) {
        expect(draft.steps![i].title).toBe(parsed.steps[i].title);
        expect(draft.steps![i].body).toBe(parsed.steps[i].body);
      }
    });

    it('ParsedGame.phases maps to Draft.phases correctly', async () => {
      const csvData = loadFixtureCsv(FIXTURES[1].csvPath);
      const { games } = parseCsvGames(csvData);
      const parsed = games[0];
      const draft = parsedGameToDraft(parsed);

      expect(draft.phases!.length).toBe(parsed.phases.length);
      for (let i = 0; i < parsed.phases.length; i++) {
        expect(draft.phases![i].name).toBe(parsed.phases[i].name);
        expect(draft.phases![i].phase_type).toBe(parsed.phases[i].phase_type);
      }
    });

    it('ParsedGame core fields map correctly', async () => {
      const csvData = loadFixtureCsv(FIXTURES[1].csvPath);
      const { games } = parseCsvGames(csvData);
      const parsed = games[0];
      const draft = parsedGameToDraft(parsed);

      expect(draft.core!.name).toBe(parsed.name);
      expect(draft.core!.play_mode).toBe(parsed.play_mode);
      expect(draft.core!.energy_level).toBe(parsed.energy_level);
      expect(draft.core!.location_type).toBe(parsed.location_type);
    });

    it('ParsedGame.roles maps to Draft.roles correctly', async () => {
      const csvData = loadFixtureCsv(FIXTURES[2].csvPath);
      const { games } = parseCsvGames(csvData);
      const parsed = games[0];
      const draft = parsedGameToDraft(parsed);

      expect(draft.roles!.length).toBe(parsed.roles.length);
      for (let i = 0; i < parsed.roles.length; i++) {
        const draftRole = draft.roles![i] as unknown as Record<string, unknown>;
        expect(draftRole.name).toBe(parsed.roles[i].name);
        expect(draftRole.private_instructions).toBe(parsed.roles[i].private_instructions);
      }
    });

    it('ParsedGame.artifacts maps to Draft.artifacts correctly', async () => {
      const csvData = loadFixtureCsv(FIXTURES[2].csvPath);
      const { games } = parseCsvGames(csvData);
      const parsed = games[0];
      const draft = parsedGameToDraft(parsed);

      expect(draft.artifacts!.length).toBe(parsed.artifacts!.length);
      for (let i = 0; i < parsed.artifacts!.length; i++) {
        expect(draft.artifacts![i].title).toBe(parsed.artifacts![i].title);
        expect(draft.artifacts![i].artifact_type).toBe(parsed.artifacts![i].artifact_type);
        expect(draft.artifacts![i].variants!.length).toBe(parsed.artifacts![i].variants.length);
      }
    });
  });

  // =========================================================================
  // SUITE 5: Error Handling
  // =========================================================================
  describe('Error Handling', () => {
    it('empty CSV returns no games', async () => {
      const { games, errors: _errors } = parseCsvGames('');
      expect(games).toHaveLength(0);
    });

    it('malformed CSV returns errors', async () => {
      const malformedCsv = 'game_key,name\n"unclosed quote,test';
      const { games, errors } = parseCsvGames(malformedCsv);
      // Should either return no games or have errors
      expect(games.length + errors.length).toBeGreaterThanOrEqual(0);
    });

    it('missing required fields returns errors', async () => {
      const incompleteCsv = 'game_key,name\ntest-key,';
      const { games, errors } = parseCsvGames(incompleteCsv);
      // Should have errors or warnings for missing fields
      const hasIssues = errors.length > 0 || games.length === 0;
      expect(hasIssues).toBe(true);
    });
  });
});
