/**
 * Contract test: Step index → step_order mapping
 *
 * Protects against the same class of bug as phase-index:
 * - current_step_index is 0-based (runtime index)
 * - step_order is ordering field (may be 0-based or 1-based, may have gaps)
 *
 * The contract: Steps are ordered by step_order ascending,
 * then accessed by array index via current_step_index.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// --------------------------------------------------------------------------
// Type definitions matching DB schema
// --------------------------------------------------------------------------

interface GameStep {
  id: string;
  title: string;
  step_order: number;
  body?: string | null;
}

interface ParticipantSession {
  current_step_index: number;
}

// --------------------------------------------------------------------------
// Pure function extraction from route logic
// --------------------------------------------------------------------------

/**
 * Simulates the step lookup logic from:
 * - /api/play/board/[code]/route.ts (lines 72-78)
 * - /api/play/sessions/[id]/game/route.ts (pickLocalizedByOrder)
 *
 * This is the CORRECT logic: order by step_order, then index by position
 */
function resolveCurrentStep(
  steps: GameStep[],
  session: ParticipantSession
): GameStep | null {
  // Sort by step_order (ascending) - matches DB ORDER BY
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

  // Index by runtime current_step_index (0-based)
  const step = sortedSteps[session.current_step_index ?? 0];

  return step ?? null;
}

/**
 * Simulates pickLocalizedByOrder from /api/play/sessions/[id]/game/route.ts
 * This is how steps are merged for locale-aware content
 */
function pickLocalizedByOrder(
  fallbackSteps: GameStep[],
  localeSteps: GameStep[]
): GameStep[] {
  const byOrder = new Map<number, GameStep>();

  for (const step of fallbackSteps) {
    byOrder.set(step.step_order, step);
  }
  for (const step of localeSteps) {
    byOrder.set(step.step_order, step); // Locale overwrites fallback
  }

  return Array.from(byOrder.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, step]) => step);
}

// --------------------------------------------------------------------------
// Contract tests
// --------------------------------------------------------------------------

describe('Step Index → Step Mapping Contract', () => {
  describe('with 0-based step_order (builder convention)', () => {
    const steps: GameStep[] = [
      { id: 'step-1', title: 'Introduction', step_order: 0 },
      { id: 'step-2', title: 'Main Activity', step_order: 1 },
      { id: 'step-3', title: 'Debrief', step_order: 2 },
    ];

    it('current_step_index=0 → first step (Introduction)', () => {
      const session: ParticipantSession = { current_step_index: 0 };
      const result = resolveCurrentStep(steps, session);
      expect(result?.title).toBe('Introduction');
    });

    it('current_step_index=1 → second step (Main Activity)', () => {
      const session: ParticipantSession = { current_step_index: 1 };
      const result = resolveCurrentStep(steps, session);
      expect(result?.title).toBe('Main Activity');
    });

    it('current_step_index=2 → third step (Debrief)', () => {
      const session: ParticipantSession = { current_step_index: 2 };
      const result = resolveCurrentStep(steps, session);
      expect(result?.title).toBe('Debrief');
    });

    it('current_step_index out of bounds → null', () => {
      const session: ParticipantSession = { current_step_index: 99 };
      const result = resolveCurrentStep(steps, session);
      expect(result).toBeNull();
    });
  });

  describe('with 1-based step_order (legacy/import convention)', () => {
    const steps: GameStep[] = [
      { id: 'step-1', title: 'First', step_order: 1 },
      { id: 'step-2', title: 'Second', step_order: 2 },
      { id: 'step-3', title: 'Third', step_order: 3 },
    ];

    it('current_step_index=0 → step with step_order=1', () => {
      const session: ParticipantSession = { current_step_index: 0 };
      const result = resolveCurrentStep(steps, session);
      expect(result?.title).toBe('First');
    });

    it('current_step_index=1 → step with step_order=2', () => {
      const session: ParticipantSession = { current_step_index: 1 };
      const result = resolveCurrentStep(steps, session);
      expect(result?.title).toBe('Second');
    });
  });

  describe('with gaps in step_order (edge case)', () => {
    const steps: GameStep[] = [
      { id: 'step-a', title: 'Opening', step_order: 10 },
      { id: 'step-b', title: 'Middle', step_order: 20 },
      { id: 'step-c', title: 'Closing', step_order: 30 },
    ];

    it('current_step_index=0 → step with lowest step_order', () => {
      const session: ParticipantSession = { current_step_index: 0 };
      const result = resolveCurrentStep(steps, session);
      expect(result?.title).toBe('Opening');
    });

    it('current_step_index=1 → step with second-lowest step_order', () => {
      const session: ParticipantSession = { current_step_index: 1 };
      const result = resolveCurrentStep(steps, session);
      expect(result?.title).toBe('Middle');
    });

    it('step_order values are irrelevant, only ordering matters', () => {
      const session: ParticipantSession = { current_step_index: 2 };
      const result = resolveCurrentStep(steps, session);
      expect(result?.title).toBe('Closing');
    });
  });

  describe('with unsorted step array (DB returns unsorted)', () => {
    const steps: GameStep[] = [
      { id: 'step-c', title: 'Last', step_order: 3 },
      { id: 'step-a', title: 'First', step_order: 1 },
      { id: 'step-b', title: 'Second', step_order: 2 },
    ];

    it('should sort by step_order before indexing', () => {
      const session: ParticipantSession = { current_step_index: 0 };
      const result = resolveCurrentStep(steps, session);
      expect(result?.title).toBe('First'); // Not 'Last'
    });
  });
});

describe('pickLocalizedByOrder Contract', () => {
  it('merges fallback and locale steps by step_order', () => {
    const fallback: GameStep[] = [
      { id: 'step-1', title: 'Intro (EN)', step_order: 1 },
      { id: 'step-2', title: 'Main (EN)', step_order: 2 },
    ];

    const locale: GameStep[] = [
      { id: 'step-1-sv', title: 'Intro (SV)', step_order: 1 }, // Override
    ];

    const result = pickLocalizedByOrder(fallback, locale);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Intro (SV)'); // Locale wins
    expect(result[1].title).toBe('Main (EN)'); // Fallback preserved
  });

  it('result is sorted by step_order ascending', () => {
    const fallback: GameStep[] = [
      { id: 'step-3', title: 'Third', step_order: 3 },
      { id: 'step-1', title: 'First', step_order: 1 },
    ];

    const result = pickLocalizedByOrder(fallback, []);

    expect(result[0].title).toBe('First');
    expect(result[1].title).toBe('Third');
  });
});

describe('Step Index Independence (step_order is NOT identity)', () => {
  it('same current_step_index works regardless of step_order base', () => {
    // 0-based
    const steps0: GameStep[] = [
      { id: 's0', title: 'A', step_order: 0 },
      { id: 's1', title: 'B', step_order: 1 },
    ];

    // 1-based
    const steps1: GameStep[] = [
      { id: 's1', title: 'A', step_order: 1 },
      { id: 's2', title: 'B', step_order: 2 },
    ];

    // 10-based with gaps
    const steps10: GameStep[] = [
      { id: 's10', title: 'A', step_order: 10 },
      { id: 's20', title: 'B', step_order: 20 },
    ];

    const session: ParticipantSession = { current_step_index: 1 };

    expect(resolveCurrentStep(steps0, session)?.title).toBe('B');
    expect(resolveCurrentStep(steps1, session)?.title).toBe('B');
    expect(resolveCurrentStep(steps10, session)?.title).toBe('B');
  });
});
