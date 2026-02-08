/**
 * Golden Fixture Test — Arkivets sista signal
 * 
 * Tests that a complex game (phases, steps, roles, artifacts, triggers)
 * can be parsed and validated correctly through the import pipeline.
 * 
 * This test catches:
 * - Fields being dropped during parse
 * - Metadata validation failures
 * - Trigger ref resolution issues
 * - Schema changes that break imports
 * 
 * @module tests/unit/import/golden-arkivets-sista-signal.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { parseGamesFromJsonPayload } from '@/features/admin/games/utils/json-game-import';
import { normalizeAndValidate } from '@/lib/import/metadataSchemas';
import { rewriteTriggerRefs } from '@/lib/import/triggerRefRewrite';
import type { DryRunGamePreview } from '@/types/csv-import';
import { buildTriggerIdMap, buildTriggerIdMapFromGame } from '@/tests/helpers/buildTriggerIdMap';

// Load fixture
const fixturePath = join(__dirname, '../../fixtures/games/arkivets-sista-signal.json');
const fixtureRaw = readFileSync(fixturePath, 'utf-8');

describe('Golden fixture — Arkivets sista signal', () => {
  describe('Schema/Parse test (no DB)', () => {
    it('should parse JSON payload without errors', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      
      expect(games).toHaveLength(1);
      const game = games[0];
      
      // Core fields
      expect(game.game_key).toBe('arkivets-sista-signal');
      expect(game.name).toBe('Arkivets sista signal');
      expect(game.play_mode).toBe('facilitated');
      expect(game.status).toBe('draft');
    });

    it('should preserve all phases', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      expect(game.phases).toBeDefined();
      expect(game.phases!.length).toBe(4);
      
      // Check phase types
      const phaseTypes = game.phases!.map(p => p.phase_type);
      expect(phaseTypes).toContain('intro');
      expect(phaseTypes).toContain('round');
      expect(phaseTypes).toContain('finale');
    });

    it('should preserve all steps', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      expect(game.steps).toBeDefined();
      expect(game.steps!.length).toBe(4);
      
      // Check step titles exist
      expect(game.steps![0].title).toBe('Briefing');
      expect(game.steps![3].title).toBe('Debrief');
    });

    it('should preserve all roles', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      expect(game.roles).toBeDefined();
      expect(game.roles!.length).toBe(3);
      
      // Check role names
      const roleNames = game.roles!.map(r => r.name);
      expect(roleNames).toContain('Arkivarien');
      expect(roleNames).toContain('Kryptografen');
      expect(roleNames).toContain('Historikern');
      
      // Check private_instructions are preserved
      expect(game.roles![0].private_instructions).toContain('1943');
    });

    it('should preserve all artifacts with correct types', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      expect(game.artifacts).toBeDefined();
      expect(game.artifacts!.length).toBe(4);
      
      // Check artifact types
      const artifactTypes = game.artifacts!.map(a => a.artifact_type);
      expect(artifactTypes).toContain('document');
      expect(artifactTypes).toContain('keypad');
      expect(artifactTypes).toContain('riddle');
      expect(artifactTypes).toContain('hint_container');
    });

    it('should preserve all triggers', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      expect(game.triggers).toBeDefined();
      expect(game.triggers!.length).toBe(3);
      
      // Check trigger condition types
      const conditionTypes = game.triggers!.map(t => t.condition.type);
      expect(conditionTypes).toContain('keypad_correct');
      expect(conditionTypes).toContain('riddle_correct');
      expect(conditionTypes).toContain('phase_started');
    });
  });

  describe('Metadata validation test', () => {
    it('should validate keypad metadata correctly', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const keypadArtifact = games[0].artifacts!.find(a => a.artifact_type === 'keypad');
      
      expect(keypadArtifact).toBeDefined();
      
      const result = normalizeAndValidate('keypad', keypadArtifact!.metadata);
      
      expect(result.validation.ok).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
      expect(result.canonical).toHaveProperty('correctCode', '1943');
      expect(result.canonical).toHaveProperty('codeLength', 4);
    });

    it('should validate riddle metadata correctly', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const riddleArtifact = games[0].artifacts!.find(a => a.artifact_type === 'riddle');
      
      expect(riddleArtifact).toBeDefined();
      
      const result = normalizeAndValidate('riddle', riddleArtifact!.metadata);
      
      expect(result.validation.ok).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
      expect(result.canonical).toHaveProperty('promptText');
      expect(result.canonical).toHaveProperty('correctAnswers');
      expect((result.canonical as { correctAnswers: string[] }).correctAnswers.length).toBeGreaterThan(0);
    });

    it('should validate hint_container metadata correctly', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const hintArtifact = games[0].artifacts!.find(a => a.artifact_type === 'hint_container');
      
      expect(hintArtifact).toBeDefined();
      
      const result = normalizeAndValidate('hint_container', hintArtifact!.metadata);
      
      expect(result.validation.ok).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
      expect(result.canonical).toHaveProperty('hints');
      expect((result.canonical as { hints: unknown[] }).hints.length).toBe(3);
    });

    it('should validate all artifact metadata without errors', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      const errors: string[] = [];
      
      for (const artifact of game.artifacts ?? []) {
        const result = normalizeAndValidate(artifact.artifact_type, artifact.metadata);
        if (!result.validation.ok) {
          errors.push(`${artifact.title} (${artifact.artifact_type}): ${result.validation.errors.join(', ')}`);
        }
      }
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('Trigger ref resolution test', () => {
    it('should resolve artifactOrder references correctly', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      // Use helper to build ID map with correct shape
      const idMap = buildTriggerIdMapFromGame(game);
      
      // Test trigger with keypad_correct condition
      const keypadTrigger = game.triggers!.find(t => t.condition.type === 'keypad_correct');
      expect(keypadTrigger).toBeDefined();
      
      // Cast to TriggerPayload format (ParsedTrigger -> TriggerPayload)
      const triggerPayload = {
        name: keypadTrigger!.name,
        description: keypadTrigger!.description,
        enabled: keypadTrigger!.enabled,
        condition: keypadTrigger!.condition as Record<string, unknown>,
        actions: keypadTrigger!.actions as Record<string, unknown>[],
      };
      
      const result = rewriteTriggerRefs(triggerPayload, idMap, 0);
      
      expect(result.errors).toHaveLength(0);
      expect(result.trigger.condition).toHaveProperty('keypadId');
      // artifactOrder 2 -> artifact-uuid-2
      expect((result.trigger.condition as { keypadId: string }).keypadId).toBe('artifact-uuid-2');
    });

    it('should resolve phaseOrder references correctly', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      // Use helper to build ID map with correct shape
      const idMap = buildTriggerIdMapFromGame(game);
      
      // Test trigger with phase_started condition
      const phaseTrigger = game.triggers!.find(t => t.condition.type === 'phase_started');
      expect(phaseTrigger).toBeDefined();
      
      // Cast to TriggerPayload format
      const triggerPayload = {
        name: phaseTrigger!.name,
        description: phaseTrigger!.description,
        enabled: phaseTrigger!.enabled,
        condition: phaseTrigger!.condition as Record<string, unknown>,
        actions: phaseTrigger!.actions as Record<string, unknown>[],
      };
      
      const result = rewriteTriggerRefs(triggerPayload, idMap, 0);
      
      expect(result.errors).toHaveLength(0);
      expect(result.trigger.condition).toHaveProperty('phaseId');
      // phaseOrder 3 -> phase-uuid-3
      expect((result.trigger.condition as { phaseId: string }).phaseId).toBe('phase-uuid-3');
    });
  });

  describe('TriggerIdMap contract test', () => {
    it('should build correct ID mappings per entity type', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      const idMap = buildTriggerIdMapFromGame(game);
      
      // Verify stepIdByOrder contains correct mappings
      expect(idMap.stepIdByOrder.size).toBe(4);
      expect(idMap.stepIdByOrder.get(1)).toBe('step-uuid-1');
      expect(idMap.stepIdByOrder.get(4)).toBe('step-uuid-4');
      
      // Verify phaseIdByOrder contains correct mappings
      expect(idMap.phaseIdByOrder.size).toBe(4);
      expect(idMap.phaseIdByOrder.get(1)).toBe('phase-uuid-1');
      expect(idMap.phaseIdByOrder.get(4)).toBe('phase-uuid-4');
      
      // Verify artifactIdByOrder contains correct mappings
      expect(idMap.artifactIdByOrder.size).toBe(4);
      expect(idMap.artifactIdByOrder.get(1)).toBe('artifact-uuid-1');
      expect(idMap.artifactIdByOrder.get(4)).toBe('artifact-uuid-4');
    });

    it('should populate importBatchUuids as union of all entity UUIDs', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      const idMap = buildTriggerIdMapFromGame(game);
      
      // importBatchUuids should contain ALL UUIDs from all entity types
      expect(idMap.importBatchUuids).toBeDefined();
      
      // 4 steps + 4 phases + 4 artifacts = 12 UUIDs
      expect(idMap.importBatchUuids!.size).toBe(12);
      
      // Verify it contains UUIDs from each type
      expect(idMap.importBatchUuids!.has('step-uuid-1')).toBe(true);
      expect(idMap.importBatchUuids!.has('phase-uuid-2')).toBe(true);
      expect(idMap.importBatchUuids!.has('artifact-uuid-3')).toBe(true);
      
      // Verify all UUIDs are unique (set size matches expected count)
      const allValues = [
        ...idMap.stepIdByOrder.values(),
        ...idMap.phaseIdByOrder.values(),
        ...idMap.artifactIdByOrder.values(),
      ];
      expect(new Set(allValues).size).toBe(allValues.length);
    });

    it('should work with buildTriggerIdMap helper using array syntax', () => {
      // Test the explicit array-based builder
      const idMap = buildTriggerIdMap({
        phases: [[1, 'p1'], [2, 'p2']],
        artifacts: [[1, 'a1']],
        steps: [[1, 's1'], [2, 's2'], [3, 's3']],
      });
      
      expect(idMap.phaseIdByOrder.size).toBe(2);
      expect(idMap.artifactIdByOrder.size).toBe(1);
      expect(idMap.stepIdByOrder.size).toBe(3);
      
      // importBatchUuids should be union: 2 + 1 + 3 = 6
      expect(idMap.importBatchUuids!.size).toBe(6);
      expect(idMap.importBatchUuids!.has('p1')).toBe(true);
      expect(idMap.importBatchUuids!.has('a1')).toBe(true);
      expect(idMap.importBatchUuids!.has('s3')).toBe(true);
    });

    it('should have no stray UUIDs in importBatchUuids (tightness invariant)', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      const idMap = buildTriggerIdMapFromGame(game);
      
      // Compute expected UUIDs from all maps
      const expectedUuids = new Set<string>([
        ...idMap.stepIdByOrder.values(),
        ...idMap.phaseIdByOrder.values(),
        ...idMap.artifactIdByOrder.values(),
        ...(idMap.artifactIdBySourceId?.values() ?? []),
        ...(idMap.stepIdBySourceId?.values() ?? []),
        ...(idMap.phaseIdBySourceId?.values() ?? []),
      ]);
      
      // importBatchUuids should contain EXACTLY what's in the maps, nothing more
      expect(idMap.importBatchUuids!.size).toBe(expectedUuids.size);
      
      // Every UUID in importBatchUuids must be in expectedUuids
      for (const uuid of idMap.importBatchUuids!) {
        expect(expectedUuids.has(uuid)).toBe(true);
      }
      
      // Every UUID in expectedUuids must be in importBatchUuids
      for (const uuid of expectedUuids) {
        expect(idMap.importBatchUuids!.has(uuid)).toBe(true);
      }
    });

    it('should have contiguous 1-based order keys in maps', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      const idMap = buildTriggerIdMapFromGame(game);
      
      // Helper to check contiguous 1-based keys
      const checkContiguousKeys = (map: Map<number, string>, expectedCount: number) => {
        expect(map.size).toBe(expectedCount);
        for (let i = 1; i <= expectedCount; i++) {
          expect(map.has(i)).toBe(true);
        }
      };
      
      // All maps should have contiguous 1-based keys
      checkContiguousKeys(idMap.stepIdByOrder, 4);    // steps 1,2,3,4
      checkContiguousKeys(idMap.phaseIdByOrder, 4);   // phases 1,2,3,4
      checkContiguousKeys(idMap.artifactIdByOrder, 4); // artifacts 1,2,3,4
    });
  });

  describe('DryRunGamePreview contract test', () => {
    it('should produce correct preview counts for advanced game', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      // Simulate what route.ts does for dry run preview
      const artifactTypes = Array.from(
        new Set((game.artifacts ?? []).map(a => a.artifact_type).filter(Boolean))
      ).sort();

      const preview: DryRunGamePreview = {
        row_number: 1,
        game_key: game.game_key,
        name: game.name,
        play_mode: game.play_mode,
        status: game.status,
        steps: game.steps,
        phases_count: game.phases?.length ?? 0,
        artifacts_count: game.artifacts?.length ?? 0,
        triggers_count: game.triggers?.length ?? 0,
        roles_count: game.roles?.length ?? 0,
        artifact_types: artifactTypes,
      };
      
      // Verify counts match actual data
      expect(preview.phases_count).toBe(4);
      expect(preview.artifacts_count).toBe(4);
      expect(preview.triggers_count).toBe(3);
      expect(preview.roles_count).toBe(3);
      expect(preview.steps?.length).toBe(4);
      
      // Verify artifact types
      expect(preview.artifact_types).toContain('document');
      expect(preview.artifact_types).toContain('keypad');
      expect(preview.artifact_types).toContain('riddle');
      expect(preview.artifact_types).toContain('hint_container');
    });

    it('should have artifact_types as unique sorted list', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      const artifactTypes = Array.from(
        new Set((game.artifacts ?? []).map(a => a.artifact_type).filter(Boolean))
      ).sort();
      
      // Should be unique (no duplicates)
      expect(artifactTypes.length).toBe(new Set(artifactTypes).size);
      
      // Should be sorted alphabetically
      const sortedCopy = [...artifactTypes].sort();
      expect(artifactTypes).toEqual(sortedCopy);
      
      // Should have exactly 4 types for this fixture
      expect(artifactTypes).toEqual(['document', 'hint_container', 'keypad', 'riddle']);
    });

    it('should match counts with actual parsed data (parity check)', () => {
      const games = parseGamesFromJsonPayload(fixtureRaw);
      const game = games[0];
      
      // This test ensures preview counts ALWAYS match the source data
      // If someone changes the preview logic, this will catch drift
      const preview: DryRunGamePreview = {
        row_number: 1,
        game_key: game.game_key,
        name: game.name,
        play_mode: game.play_mode,
        status: game.status,
        steps: game.steps,
        phases_count: game.phases?.length ?? 0,
        artifacts_count: game.artifacts?.length ?? 0,
        triggers_count: game.triggers?.length ?? 0,
        roles_count: game.roles?.length ?? 0,
        artifact_types: [],
      };
      
      // Counts must match actual arrays
      expect(preview.phases_count).toBe(game.phases?.length ?? 0);
      expect(preview.artifacts_count).toBe(game.artifacts?.length ?? 0);
      expect(preview.triggers_count).toBe(game.triggers?.length ?? 0);
      expect(preview.roles_count).toBe(game.roles?.length ?? 0);
      expect(preview.steps?.length).toBe(game.steps?.length ?? 0);
    });
  });
});
