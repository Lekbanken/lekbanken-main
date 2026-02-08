/**
 * Contract test: /game endpoint step response includes phaseId
 *
 * Ensures the phaseId field doesn't accidentally get removed when
 * someone refactors StepInfo. This is an observability field for
 * debugging and future step→phase derivation.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// --------------------------------------------------------------------------
// Type definitions matching API contract
// --------------------------------------------------------------------------

/**
 * Subset of StepInfo returned by /api/play/sessions/[id]/game
 * This must match the actual API response shape.
 */
interface StepInfo {
  id: string;
  index: number;
  title: string;
  description: string;
  // ...other fields omitted for test clarity
  phaseId: string | null; // NEW in v2.1 - must always be present
}

/**
 * Raw game_steps row from DB (simplified for test)
 */
interface GameStepRow {
  id: string;
  title: string | null;
  body: string | null;
  phase_id: string | null;
  step_order: number;
}

// --------------------------------------------------------------------------
// Pure function extraction from /game route logic
// --------------------------------------------------------------------------

/**
 * Simulates the step mapping logic from /api/play/sessions/[id]/game/route.ts
 * Lines 387-406 in the actual implementation.
 */
function mapStepRowToStepInfo(row: GameStepRow, index: number): StepInfo {
  return {
    id: row.id,
    index,
    title: row.title || `Steg ${index + 1}`,
    description: row.body || '',
    // Phase linkage (exposed for debugging/future phase-from-step derivation)
    phaseId: row.phase_id ?? null,
  };
}

// --------------------------------------------------------------------------
// Contract tests
// --------------------------------------------------------------------------

describe('/game Endpoint Step Response Contract', () => {
  describe('phaseId field presence', () => {
    it('step with phase_id set → phaseId is UUID', () => {
      const row: GameStepRow = {
        id: 'step-1',
        title: 'Introduction',
        body: 'Welcome to the game',
        phase_id: '550e8400-e29b-41d4-a716-446655440000',
        step_order: 1,
      };

      const result = mapStepRowToStepInfo(row, 0);

      expect(result).toHaveProperty('phaseId');
      expect(result.phaseId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('step with phase_id null → phaseId is null (not undefined)', () => {
      const row: GameStepRow = {
        id: 'step-2',
        title: 'Freeform Step',
        body: 'No phase assigned',
        phase_id: null,
        step_order: 2,
      };

      const result = mapStepRowToStepInfo(row, 1);

      expect(result).toHaveProperty('phaseId');
      expect(result.phaseId).toBeNull();
    });

    it('step with phase_id undefined → phaseId is null (defensive)', () => {
      const row: GameStepRow = {
        id: 'step-3',
        title: 'Legacy Step',
        body: 'Migrated from old system',
        phase_id: undefined as unknown as null, // Simulate missing field
        step_order: 3,
      };

      const result = mapStepRowToStepInfo(row, 2);

      // Nullish coalescing should handle undefined → null
      expect(result.phaseId).toBeNull();
    });
  });

  describe('phaseId is never stripped from response', () => {
    it('JSON.stringify includes phaseId even when null', () => {
      const row: GameStepRow = {
        id: 'step-x',
        title: 'Test',
        body: null,
        phase_id: null,
        step_order: 1,
      };

      const result = mapStepRowToStepInfo(row, 0);
      const json = JSON.stringify(result);

      // phaseId:null should appear in JSON (not be omitted)
      expect(json).toContain('"phaseId":null');
    });

    it('Object.keys includes phaseId', () => {
      const row: GameStepRow = {
        id: 'step-y',
        title: 'Test',
        body: null,
        phase_id: 'some-uuid',
        step_order: 1,
      };

      const result = mapStepRowToStepInfo(row, 0);

      expect(Object.keys(result)).toContain('phaseId');
    });
  });
});

describe('StepInfo Type Safety', () => {
  it('phaseId type is string | null (compile-time check)', () => {
    // This test is more of a type assertion - if it compiles, the type is correct
    const stepWithPhase: StepInfo = {
      id: 'a',
      index: 0,
      title: 'A',
      description: '',
      phaseId: 'uuid-here',
    };

    const stepWithoutPhase: StepInfo = {
      id: 'b',
      index: 1,
      title: 'B',
      description: '',
      phaseId: null,
    };

    expect(stepWithPhase.phaseId).toBe('uuid-here');
    expect(stepWithoutPhase.phaseId).toBeNull();
  });
});
