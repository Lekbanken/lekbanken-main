/**
 * Contract test: Board phase index → phase_order mapping
 *
 * Protects against regression of the off-by-one bug where:
 * - current_phase_index is 0-based (runtime index)
 * - phase_order is 1-based (DB ordering field)
 *
 * The fix: Board endpoint fetches phases ordered by phase_order,
 * then accesses by array index. This test verifies that invariant.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// --------------------------------------------------------------------------
// Type definitions matching DB schema
// --------------------------------------------------------------------------

interface GamePhase {
  id: string;
  name: string;
  phase_order: number;
}

interface ParticipantSession {
  current_phase_index: number;
}

// --------------------------------------------------------------------------
// Pure function extraction from board route logic
// --------------------------------------------------------------------------

/**
 * Simulates the phase lookup logic from /api/play/board/[code]/route.ts
 * This is the FIXED logic: order by phase_order, then index by position
 */
function resolveCurrentPhaseName(
  phases: GamePhase[],
  session: ParticipantSession
): string | null {
  // Sort by phase_order (ascending) - matches DB ORDER BY
  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order);

  // Index by runtime current_phase_index (0-based)
  const phase = sortedPhases[session.current_phase_index ?? 0];

  return phase?.name ?? null;
}

/**
 * BUGGY version (for comparison) - what the code did BEFORE the fix
 * This looked for phase_order === current_phase_index, which is wrong
 * when phase_order is 1-based and current_phase_index is 0-based.
 */
function resolveCurrentPhaseNameBuggy(
  phases: GamePhase[],
  session: ParticipantSession
): string | null {
  const phase = phases.find((p) => p.phase_order === session.current_phase_index);
  return phase?.name ?? null;
}

// --------------------------------------------------------------------------
// Contract tests
// --------------------------------------------------------------------------

describe('Board Phase Index → Phase Name Contract', () => {
  describe('with 1-based phase_order (common case)', () => {
    const phases: GamePhase[] = [
      { id: 'phase-1', name: 'Intro', phase_order: 1 },
      { id: 'phase-2', name: 'Main Activity', phase_order: 2 },
      { id: 'phase-3', name: 'Debrief', phase_order: 3 },
    ];

    it('current_phase_index=0 → first phase (Intro)', () => {
      const session: ParticipantSession = { current_phase_index: 0 };
      const result = resolveCurrentPhaseName(phases, session);
      expect(result).toBe('Intro');
    });

    it('current_phase_index=1 → second phase (Main Activity)', () => {
      const session: ParticipantSession = { current_phase_index: 1 };
      const result = resolveCurrentPhaseName(phases, session);
      expect(result).toBe('Main Activity');
    });

    it('current_phase_index=2 → third phase (Debrief)', () => {
      const session: ParticipantSession = { current_phase_index: 2 };
      const result = resolveCurrentPhaseName(phases, session);
      expect(result).toBe('Debrief');
    });

    it('current_phase_index out of bounds → null', () => {
      const session: ParticipantSession = { current_phase_index: 99 };
      const result = resolveCurrentPhaseName(phases, session);
      expect(result).toBeNull();
    });
  });

  describe('with gaps in phase_order (edge case)', () => {
    const phases: GamePhase[] = [
      { id: 'phase-a', name: 'Opening', phase_order: 10 },
      { id: 'phase-b', name: 'Middle', phase_order: 20 },
      { id: 'phase-c', name: 'Closing', phase_order: 30 },
    ];

    it('current_phase_index=0 → phase with lowest phase_order', () => {
      const session: ParticipantSession = { current_phase_index: 0 };
      const result = resolveCurrentPhaseName(phases, session);
      expect(result).toBe('Opening');
    });

    it('current_phase_index=1 → phase with second-lowest phase_order', () => {
      const session: ParticipantSession = { current_phase_index: 1 };
      const result = resolveCurrentPhaseName(phases, session);
      expect(result).toBe('Middle');
    });
  });

  describe('with unsorted phase array (DB returns unsorted)', () => {
    const phases: GamePhase[] = [
      { id: 'phase-c', name: 'Last', phase_order: 3 },
      { id: 'phase-a', name: 'First', phase_order: 1 },
      { id: 'phase-b', name: 'Second', phase_order: 2 },
    ];

    it('should sort by phase_order before indexing', () => {
      const session: ParticipantSession = { current_phase_index: 0 };
      const result = resolveCurrentPhaseName(phases, session);
      expect(result).toBe('First'); // Not 'Last'
    });
  });

  describe('regression: buggy version fails on 1-based phase_order', () => {
    const phases: GamePhase[] = [
      { id: 'phase-1', name: 'Intro', phase_order: 1 },
      { id: 'phase-2', name: 'Main Activity', phase_order: 2 },
      { id: 'phase-3', name: 'Debrief', phase_order: 3 },
    ];

    it('BUGGY: current_phase_index=0 returns null (wrong!)', () => {
      const session: ParticipantSession = { current_phase_index: 0 };
      const result = resolveCurrentPhaseNameBuggy(phases, session);
      // Bug: finds phase where phase_order === 0, which doesn't exist
      expect(result).toBeNull();
    });

    it('BUGGY: current_phase_index=1 returns Intro (off by one!)', () => {
      const session: ParticipantSession = { current_phase_index: 1 };
      const result = resolveCurrentPhaseNameBuggy(phases, session);
      // Bug: finds phase_order === 1, which is Intro, but we wanted phase 2
      expect(result).toBe('Intro');
    });
  });
});
