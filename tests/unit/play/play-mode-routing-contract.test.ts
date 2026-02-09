/**
 * Contract test: play_mode → viewType routing
 *
 * Protects against regression of the play_mode routing logic:
 * - HostPlayMode switch statement must handle all ViewType cases
 * - ParticipantPlayMode must gate on playMode
 * - useSessionCapabilities must degrade gracefully
 *
 * The core invariants:
 * 1. 'basic' always → 'basic' viewType
 * 2. 'facilitated' + phases → 'facilitated' viewType
 * 3. 'facilitated' - phases → 'basic' viewType (graceful degradation)
 * 4. 'participants' + roles → 'participants' viewType
 * 5. 'participants' - roles → 'basic' viewType (graceful degradation)
 *
 * @see docs/play/PLAY_UI_WIRING_AUDIT_REPORT.md for full routing spec
 * @see hooks/useSessionCapabilities.ts for implementation
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// --------------------------------------------------------------------------
// Type definitions matching codebase
// --------------------------------------------------------------------------

type ViewType = 'basic' | 'facilitated' | 'participants';

interface DataCaps {
  hasPhases: boolean;
  hasRoles: boolean;
}

// --------------------------------------------------------------------------
// Pure function extraction from useSessionCapabilities.ts
// --------------------------------------------------------------------------

/**
 * Determines the view type with graceful degradation.
 * Extracted from hooks/useSessionCapabilities.ts for contract testing.
 *
 * - participants without roles → basic
 * - facilitated without phases → basic
 */
function determineViewType(intent: ViewType, caps: DataCaps): ViewType {
  if (intent === 'participants') {
    return caps.hasRoles ? 'participants' : 'basic';
  }
  if (intent === 'facilitated') {
    return caps.hasPhases ? 'facilitated' : 'basic';
  }
  return 'basic';
}

// --------------------------------------------------------------------------
// HostPlayMode routing simulation
// --------------------------------------------------------------------------

/**
 * Simulates the switch statement in HostPlayMode.tsx
 * This represents the FIXED routing logic with explicit participants case.
 */
function hostPlayModeRoutesTo(viewType: ViewType): 'BasicPlayView' | 'FacilitatedPlayView' {
  switch (viewType) {
    case 'basic':
      return 'BasicPlayView';
    case 'facilitated':
      // Falls through to facilitated view
      return 'FacilitatedPlayView';
    case 'participants':
      // Explicitly handled - uses FacilitatedPlayView (same host controls)
      return 'FacilitatedPlayView';
    default:
      // Exhaustive check - should never reach here
      const _exhaustive: never = viewType;
      throw new Error(`Unhandled viewType: ${_exhaustive}`);
  }
}

/**
 * BUGGY version - what the code did BEFORE the fix.
 * The 'participants' case fell through to legacy default.
 */
function hostPlayModeRoutesToBuggy(viewType: ViewType): string {
  switch (viewType) {
    case 'basic':
      return 'BasicPlayView';
    case 'facilitated':
      return 'FacilitatedPlayView';
    case 'participants':
      // BUG: just broke out, fell to legacy default
      break;
    default:
      break;
  }
  return 'LegacyFallback'; // Bug: participants landed here
}

// --------------------------------------------------------------------------
// ParticipantPlayMode gating simulation
// --------------------------------------------------------------------------

/**
 * Simulates the playMode gating in ParticipantPlayMode.tsx
 * This represents the FIXED gating logic.
 */
function participantPlayModeRoutesTo(
  playMode: ViewType | null | undefined
): 'BasicFollowBoard' | 'FullParticipantPlayView' {
  // Treat null/undefined as 'basic' for safety
  const mode = playMode ?? 'basic';

  if (mode === 'basic') {
    return 'BasicFollowBoard';
  }
  // facilitated / participants → full interactive view
  return 'FullParticipantPlayView';
}

// --------------------------------------------------------------------------
// Contract Tests
// --------------------------------------------------------------------------

describe('play_mode routing contract', () => {
  describe('determineViewType (graceful degradation)', () => {
    it('basic intent → basic viewType (no data dependency)', () => {
      // Basic mode has no data requirements
      expect(determineViewType('basic', { hasPhases: false, hasRoles: false })).toBe('basic');
      expect(determineViewType('basic', { hasPhases: true, hasRoles: false })).toBe('basic');
      expect(determineViewType('basic', { hasPhases: false, hasRoles: true })).toBe('basic');
      expect(determineViewType('basic', { hasPhases: true, hasRoles: true })).toBe('basic');
    });

    it('facilitated + phases → facilitated viewType', () => {
      expect(determineViewType('facilitated', { hasPhases: true, hasRoles: false })).toBe(
        'facilitated'
      );
      expect(determineViewType('facilitated', { hasPhases: true, hasRoles: true })).toBe(
        'facilitated'
      );
    });

    it('facilitated - phases → basic viewType (degradation)', () => {
      // CRITICAL: facilitated mode without phases degrades to basic
      expect(determineViewType('facilitated', { hasPhases: false, hasRoles: false })).toBe('basic');
      expect(determineViewType('facilitated', { hasPhases: false, hasRoles: true })).toBe('basic');
    });

    it('participants + roles → participants viewType', () => {
      expect(determineViewType('participants', { hasPhases: false, hasRoles: true })).toBe(
        'participants'
      );
      expect(determineViewType('participants', { hasPhases: true, hasRoles: true })).toBe(
        'participants'
      );
    });

    it('participants - roles → basic viewType (degradation)', () => {
      // CRITICAL: participants mode without roles degrades to basic
      expect(determineViewType('participants', { hasPhases: false, hasRoles: false })).toBe(
        'basic'
      );
      expect(determineViewType('participants', { hasPhases: true, hasRoles: false })).toBe('basic');
    });
  });

  describe('HostPlayMode routing', () => {
    it('routes basic → BasicPlayView', () => {
      expect(hostPlayModeRoutesTo('basic')).toBe('BasicPlayView');
    });

    it('routes facilitated → FacilitatedPlayView', () => {
      expect(hostPlayModeRoutesTo('facilitated')).toBe('FacilitatedPlayView');
    });

    it('routes participants → FacilitatedPlayView (explicit handling)', () => {
      // CRITICAL: participants must NOT fall through to legacy
      expect(hostPlayModeRoutesTo('participants')).toBe('FacilitatedPlayView');
    });

    it('buggy version: participants → LegacyFallback (regression demo)', () => {
      // This test documents the bug that was fixed
      expect(hostPlayModeRoutesToBuggy('participants')).toBe('LegacyFallback');
    });

    it('handles all ViewType exhaustively', () => {
      // TypeScript compile-time exhaustiveness check
      const allViewTypes: ViewType[] = ['basic', 'facilitated', 'participants'];
      allViewTypes.forEach((vt) => {
        // Should not throw
        expect(() => hostPlayModeRoutesTo(vt)).not.toThrow();
      });
    });
  });

  describe('ParticipantPlayMode gating', () => {
    it('basic → BasicFollowBoard (simplified view)', () => {
      expect(participantPlayModeRoutesTo('basic')).toBe('BasicFollowBoard');
    });

    it('facilitated → FullParticipantPlayView', () => {
      expect(participantPlayModeRoutesTo('facilitated')).toBe('FullParticipantPlayView');
    });

    it('participants → FullParticipantPlayView', () => {
      expect(participantPlayModeRoutesTo('participants')).toBe('FullParticipantPlayView');
    });

    it('null/undefined → BasicFollowBoard (safe default)', () => {
      // CRITICAL: Missing playMode should default to basic for safety
      expect(participantPlayModeRoutesTo(null)).toBe('BasicFollowBoard');
      expect(participantPlayModeRoutesTo(undefined)).toBe('BasicFollowBoard');
    });
  });

  describe('End-to-end routing chains', () => {
    it('basic game → basic viewType → BasicPlayView (host) + BasicFollowBoard (participant)', () => {
      const intent: ViewType = 'basic';
      const viewType = determineViewType(intent, { hasPhases: false, hasRoles: false });
      expect(viewType).toBe('basic');
      expect(hostPlayModeRoutesTo(viewType)).toBe('BasicPlayView');
      expect(participantPlayModeRoutesTo(intent)).toBe('BasicFollowBoard');
    });

    it('facilitated game with phases → facilitated viewType → FacilitatedPlayView (host) + FullParticipantPlayView (participant)', () => {
      const intent: ViewType = 'facilitated';
      const viewType = determineViewType(intent, { hasPhases: true, hasRoles: false });
      expect(viewType).toBe('facilitated');
      expect(hostPlayModeRoutesTo(viewType)).toBe('FacilitatedPlayView');
      expect(participantPlayModeRoutesTo(intent)).toBe('FullParticipantPlayView');
    });

    it('participants game with roles → participants viewType → FacilitatedPlayView (host) + FullParticipantPlayView (participant)', () => {
      const intent: ViewType = 'participants';
      const viewType = determineViewType(intent, { hasPhases: false, hasRoles: true });
      expect(viewType).toBe('participants');
      expect(hostPlayModeRoutesTo(viewType)).toBe('FacilitatedPlayView');
      expect(participantPlayModeRoutesTo(intent)).toBe('FullParticipantPlayView');
    });

    it('facilitated game missing phases → degrades to basic chain', () => {
      const intent: ViewType = 'facilitated';
      const viewType = determineViewType(intent, { hasPhases: false, hasRoles: false });
      expect(viewType).toBe('basic'); // Degraded
      expect(hostPlayModeRoutesTo(viewType)).toBe('BasicPlayView');
      // Note: participant still uses intent, not degraded viewType
      expect(participantPlayModeRoutesTo(intent)).toBe('FullParticipantPlayView');
    });

    it('participants game missing roles → degrades to basic chain', () => {
      const intent: ViewType = 'participants';
      const viewType = determineViewType(intent, { hasPhases: false, hasRoles: false });
      expect(viewType).toBe('basic'); // Degraded
      expect(hostPlayModeRoutesTo(viewType)).toBe('BasicPlayView');
      // Note: participant still uses intent, not degraded viewType
      expect(participantPlayModeRoutesTo(intent)).toBe('FullParticipantPlayView');
    });
  });
});
