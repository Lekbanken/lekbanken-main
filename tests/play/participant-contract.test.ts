/**
 * Participant Contract Regression Tests
 *
 * A) Forbidden keys never appear for participant — verifies that Zod schemas
 *    flag host-only fields when present.
 * B) Schemas accept current payload — verifies that known-good fixtures pass.
 *
 * Run: npx vitest run tests/play/participant-contract.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  ParticipantGameResponseSchema,
  ParticipantRoleResponseSchema,
  ParticipantArtifactsResponseSchema,
  ParticipantDecisionsResponseSchema,
  validateParticipantPayload,
} from '@/features/play/contracts/participantCockpit.schema';

// =============================================================================
// Fixtures — representative participant payloads
// =============================================================================

const GAME_FIXTURE = {
  title: 'Demo Game',
  playMode: 'facilitated' as const,
  board: { theme: 'neutral' },
  steps: [
    {
      id: 'step-1',
      index: 0,
      title: 'Intro',
      description: 'Welcome to the game.',
      durationMinutes: 5,
      display_mode: 'instant' as const,
      materials: ['Penna', 'Papper'],
      safety: 'Var försiktig',
    },
    {
      id: 'step-2',
      index: 1,
      title: 'Main Activity',
      description: 'Do the thing.',
      media: { type: 'image', url: 'https://example.com/img.jpg', altText: 'Photo' },
    },
  ],
  phases: [
    { id: 'phase-1', index: 0, name: 'Uppvärmning', description: 'Get ready' },
  ],
  tools: [{ tool_key: 'dice_roller_v1', enabled: true, scope: 'both' }],
  safety: {
    safetyNotes: 'Be careful',
    accessibilityNotes: 'Wheelchair friendly',
    spaceRequirements: '10 sqm',
  },
};

const GAME_FIXTURE_WITH_LEAKS = {
  ...GAME_FIXTURE,
  steps: [
    {
      ...GAME_FIXTURE.steps[0],
      leaderScript: 'SECRET: Tell players about the twist.',
      boardText: 'HOST ONLY: Move piece to square 5.',
    },
    {
      ...GAME_FIXTURE.steps[1],
      leaderTips: 'If stuck, give them a hint about the door.',
    },
  ],
  safety: {
    ...GAME_FIXTURE.safety,
    leaderTips: 'HOST ONLY: Watch for anxious participants.',
  },
};

const ROLE_FIXTURE = {
  role: {
    id: 'role-1',
    name: 'Detektiv',
    icon: '🕵️',
    color: '#2563eb',
    public_description: 'You are the detective.',
    private_instructions: 'Find the hidden clue.',
    private_hints: 'Look under the table.',
  },
  revealedAt: '2026-02-21T10:00:00Z',
  secretRevealedAt: null,
};

const ROLE_FIXTURE_WITH_LEAKS = {
  role: {
    ...ROLE_FIXTURE.role,
    assignment_strategy: 'random',
    scaling_rules: { min: 1, max: 4 },
    conflicts_with: ['role-2'],
    min_count: 1,
    max_count: 3,
  },
  revealedAt: '2026-02-21T10:00:00Z',
  secretRevealedAt: null,
};

const ARTIFACTS_FIXTURE = {
  artifacts: [
    {
      id: 'art-1',
      title: 'Karta',
      description: 'En gammal karta',
      artifact_type: 'standard',
      artifact_order: 1,
      metadata: {},
    },
    {
      id: 'art-2',
      title: 'Kodlås',
      description: 'En keypad',
      artifact_type: 'keypad',
      artifact_order: 2,
      metadata: { codeLength: 4, keypadState: { isUnlocked: false, isLockedOut: false, attemptCount: 0 } },
    },
  ],
  variants: [
    {
      id: 'var-1',
      session_artifact_id: 'art-1',
      title: 'Framsida',
      body: 'North is up.',
      visibility: 'public' as const,
      revealed_at: '2026-02-21T10:00:00Z',
      highlighted_at: null,
      variant_order: 0,
    },
  ],
};

const DECISIONS_FIXTURE = {
  decisions: [
    {
      id: 'dec-1',
      title: 'Vilken dörr?',
      prompt: 'Välj en dörr att öppna.',
      decision_type: 'single_choice',
      options: [
        { key: 'left', label: 'Vänster dörr' },
        { key: 'right', label: 'Höger dörr' },
      ],
      status: 'open' as const,
      allow_anonymous: false,
      max_choices: 1,
      opened_at: '2026-02-21T10:05:00Z',
      closed_at: null,
      revealed_at: null,
    },
  ],
};

// =============================================================================
// A) Forbidden keys never appear for participant
// =============================================================================

describe('Participant Contract — Forbidden Keys', () => {
  it('flags leaderScript in step response', () => {
    const result = ParticipantGameResponseSchema.safeParse(GAME_FIXTURE_WITH_LEAKS);
    // Should parse (passthrough) but have issues for forbidden fields
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        '[CONTRACT] Host-only field "leaderScript" present in participant step response'
      );
    }
  });

  it('flags boardText in step response', () => {
    const result = ParticipantGameResponseSchema.safeParse(GAME_FIXTURE_WITH_LEAKS);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        '[CONTRACT] Host-only field "boardText" present in participant step response'
      );
    }
  });

  it('flags leaderTips in step response', () => {
    const result = ParticipantGameResponseSchema.safeParse(GAME_FIXTURE_WITH_LEAKS);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        '[CONTRACT] Host-only field "leaderTips" present in participant step response'
      );
    }
  });

  it('flags leaderTips in safety object', () => {
    const result = ParticipantGameResponseSchema.safeParse(GAME_FIXTURE_WITH_LEAKS);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        '[CONTRACT] Host-only field "leaderTips" present in participant safety response'
      );
    }
  });

  it('flags assignment_strategy in role response', () => {
    const result = ParticipantRoleResponseSchema.safeParse(ROLE_FIXTURE_WITH_LEAKS);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain(
        '[CONTRACT] Host-only field "assignment_strategy" present in participant role response'
      );
    }
  });

  it('flags all forbidden role fields', () => {
    const result = ParticipantRoleResponseSchema.safeParse(ROLE_FIXTURE_WITH_LEAKS);
    expect(result.success).toBe(false);
    if (!result.success) {
      const forbidden = ['assignment_strategy', 'scaling_rules', 'conflicts_with', 'min_count', 'max_count'];
      const messages = result.error.issues.map((i) => i.message);
      for (const field of forbidden) {
        expect(messages).toContain(
          `[CONTRACT] Host-only field "${field}" present in participant role response`
        );
      }
    }
  });

  it('clean payload has NO forbidden-key issues', () => {
    const gameResult = ParticipantGameResponseSchema.safeParse(GAME_FIXTURE);
    expect(gameResult.success).toBe(true);

    const roleResult = ParticipantRoleResponseSchema.safeParse(ROLE_FIXTURE);
    expect(roleResult.success).toBe(true);
  });
});

// =============================================================================
// B) Schemas accept current payload shapes
// =============================================================================

describe('Participant Contract — Schema Acceptance', () => {
  it('accepts game response fixture', () => {
    const result = ParticipantGameResponseSchema.safeParse(GAME_FIXTURE);
    expect(result.success).toBe(true);
  });

  it('accepts role response fixture', () => {
    const result = ParticipantRoleResponseSchema.safeParse(ROLE_FIXTURE);
    expect(result.success).toBe(true);
  });

  it('accepts role response with null role', () => {
    const result = ParticipantRoleResponseSchema.safeParse({
      role: null,
      revealedAt: null,
      secretRevealedAt: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts artifacts response fixture', () => {
    const result = ParticipantArtifactsResponseSchema.safeParse(ARTIFACTS_FIXTURE);
    expect(result.success).toBe(true);
  });

  it('accepts decisions response fixture', () => {
    const result = ParticipantDecisionsResponseSchema.safeParse(DECISIONS_FIXTURE);
    expect(result.success).toBe(true);
  });

  it('accepts empty artifacts', () => {
    const result = ParticipantArtifactsResponseSchema.safeParse({
      artifacts: [],
      variants: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty decisions', () => {
    const result = ParticipantDecisionsResponseSchema.safeParse({ decisions: [] });
    expect(result.success).toBe(true);
  });

  it('validateParticipantPayload returns data even on contract violation', () => {
    // This tests that the dev-only safeParse never crashes the UI
    const data = validateParticipantPayload(
      ParticipantGameResponseSchema,
      GAME_FIXTURE_WITH_LEAKS,
      'test',
    );
    // Should return the original data regardless of validation failure
    expect(data).toBe(GAME_FIXTURE_WITH_LEAKS);
  });
});

// =============================================================================
// C) Auth overlap — participant token always triggers field stripping
// =============================================================================

describe('Participant Contract — Auth Overlap Guard', () => {
  it('isParticipant must be true when participantToken is present, even if host is also authenticated', () => {
    // Simulates the auth logic from /api/play/sessions/[id]/game/route.ts
    // The bug: when a host tests their own game as a participant,
    // host auth succeeded first → isParticipant stayed false → leaderScript leaked.
    function resolveIsParticipant(
      participantToken: string | null,
      _hostAuthorized: boolean,
    ): boolean {
      // Fixed: isParticipant is determined by token presence, not auth order
      return Boolean(participantToken);
    }

    // Host + participant token → must be participant-scoped
    expect(resolveIsParticipant('tok_abc', true)).toBe(true);

    // Only participant token → participant
    expect(resolveIsParticipant('tok_abc', false)).toBe(true);

    // No token → not participant
    expect(resolveIsParticipant(null, true)).toBe(false);
    expect(resolveIsParticipant(null, false)).toBe(false);
  });

  it('destructuring strip removes leaderScript from step objects', () => {
    // Simulates the server-side destructuring strip
    const rawStep = {
      id: 's1',
      title: 'Step 1',
      description: 'Desc',
      leaderScript: 'SECRET host instructions',
      boardText: 'Board hint',
      phaseId: 'phase-1',
    };

    const { leaderScript: _ls, boardText: _bt, phaseId: _pid, ...safe } = rawStep;

    expect('leaderScript' in safe).toBe(false);
    expect('boardText' in safe).toBe(false);
    expect('phaseId' in safe).toBe(false);
    expect(safe.id).toBe('s1');
    expect(safe.title).toBe('Step 1');
  });
});
