/**
 * Resolver Tests
 *
 * Tests for lib/builder/resolver.ts
 *
 * Includes invariant tests:
 * 1. No mutation of input draft
 * 2. Deterministic output
 * 3. O(n) time (basic sanity check)
 * 4. No ID creation
 */

import { describe, it, expect } from 'vitest';
import {
  resolveDraft,
  isDraftValid,
  isPlayable,
  isPublishable,
  errorsForEntity,
  errorsForPath,
  firstErrorForPath,
  hasErrorsForEntity,
  entitySeverity,
} from '@/lib/builder/resolver';
import type { GameDraft } from '@/lib/builder/resolver';

// =============================================================================
// HELPERS
// =============================================================================

const validUuid = () => crypto.randomUUID();

function createValidDraft(): GameDraft {
  const stepId = validUuid();
  const phaseId = validUuid();
  const roleId = validUuid();
  const purposeId = validUuid();

  return {
    core: {
      name: 'Test Game',
      description: 'A'.repeat(100),
      main_purpose_id: purposeId,
      play_mode: 'facilitated',
      energy_level: 'medium',
      location_type: 'indoor',
      age_min: 6,
      age_max: 12,
      min_players: 2,
      max_players: 10,
    },
    steps: [
      {
        id: stepId,
        title: 'Introduction',
        body: 'Welcome everyone',
        step_order: 0,
        display_mode: 'instant',
        phase_id: phaseId,
      },
    ],
    phases: [
      {
        id: phaseId,
        name: 'Intro Phase',
        phase_order: 0,
        phase_type: 'intro',
        timer_style: 'countdown',
      },
    ],
    roles: [
      {
        id: roleId,
        name: 'Player',
        role_order: 0,
        assignment_strategy: 'random',
      },
    ],
    artifacts: [
      {
        id: validUuid(),
        title: 'Card 1',
        artifact_type: 'card',
        artifact_order: 0,
        metadata: { step_id: stepId },
        variants: [
          {
            id: validUuid(),
            visibility: 'public',
            visible_to_role_id: null,
          },
        ],
      },
    ],
    triggers: [],
    cover: { mediaId: 'cover-123' },
  };
}

// =============================================================================
// BASIC FUNCTIONALITY
// =============================================================================

describe('resolveDraft', () => {
  it('returns errors array', () => {
    const result = resolveDraft({});
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('returns errorsByGate object', () => {
    const result = resolveDraft({});
    expect(result.errorsByGate).toHaveProperty('draft');
    expect(result.errorsByGate).toHaveProperty('playable');
    expect(result.errorsByGate).toHaveProperty('publish');
  });

  it('returns counts', () => {
    const result = resolveDraft({});
    expect(typeof result.counts.total).toBe('number');
    expect(typeof result.counts.errors).toBe('number');
    expect(typeof result.counts.warnings).toBe('number');
  });
});

// =============================================================================
// GATE FUNCTIONS
// =============================================================================

describe('resolveDraft - gate functions', () => {
  it('blockingErrorsFor(draft) returns only draft errors', () => {
    const draft = { core: { play_mode: 'invalid' } };
    const result = resolveDraft(draft);
    const blocking = result.blockingErrorsFor('draft');
    expect(blocking.every((e) => e.gate === 'draft')).toBe(true);
  });

  it('blockingErrorsFor(playable) returns draft + playable errors', () => {
    const draft = {
      core: { play_mode: 'invalid', name: '' },
    };
    const result = resolveDraft(draft);
    const blocking = result.blockingErrorsFor('playable');
    expect(blocking.some((e) => e.gate === 'draft')).toBe(true);
    expect(blocking.some((e) => e.gate === 'playable')).toBe(true);
  });

  it('blockingErrorsFor only returns errors, not warnings', () => {
    const draft = {
      core: { description: '' }, // warning
      cover: { mediaId: null }, // warning
    };
    const result = resolveDraft(draft);
    const blocking = result.blockingErrorsFor('publish');
    expect(blocking.every((e) => e.severity === 'error')).toBe(true);
    expect(blocking.every((e) => e.severity !== 'warning')).toBe(true);
  });

  it('isGatePassed returns true when no blocking errors', () => {
    const draft = createValidDraft();
    const result = resolveDraft(draft);
    expect(result.isGatePassed('draft')).toBe(true);
    expect(result.isGatePassed('playable')).toBe(true);
  });

  it('isGatePassed returns false when blocking errors exist', () => {
    const draft = { core: { name: '' } }; // missing title = playable error
    const result = resolveDraft(draft);
    expect(result.isGatePassed('playable')).toBe(false);
  });
});

// =============================================================================
// WARNINGS
// =============================================================================

describe('resolveDraft - warnings', () => {
  it('separates warnings from errors', () => {
    const draft = {
      core: {
        name: 'Test',
        main_purpose_id: validUuid(),
        description: 'Short', // warning
      },
      steps: [{ id: validUuid(), title: 'Step', body: 'Body' }],
      cover: { mediaId: null }, // warning
    };
    const result = resolveDraft(draft);
    expect(result.warnings.length).toBeGreaterThan(0);
    result.warnings.forEach((w) => {
      expect(w.severity).toBe('warning');
    });
  });

  it('warnings never block gates', () => {
    const draft = {
      core: {
        name: 'Test',
        main_purpose_id: validUuid(),
        description: '', // warning (short)
      },
      steps: [{ id: validUuid(), title: 'Step', body: 'Body' }],
    };
    const result = resolveDraft(draft);
    // Should have warnings but still pass playable
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.isGatePassed('playable')).toBe(true);
  });
});

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

describe('isDraftValid', () => {
  it('returns true for valid structure', () => {
    const draft = createValidDraft();
    expect(isDraftValid(draft)).toBe(true);
  });

  it('returns false for invalid structure', () => {
    const draft = { core: { play_mode: 'invalid_mode' } };
    expect(isDraftValid(draft)).toBe(false);
  });
});

describe('isPlayable', () => {
  it('returns true for complete draft', () => {
    const draft = createValidDraft();
    expect(isPlayable(draft)).toBe(true);
  });

  it('returns false for incomplete draft', () => {
    const draft = { core: { name: '' } };
    expect(isPlayable(draft)).toBe(false);
  });
});

describe('isPublishable', () => {
  it('returns true for complete draft', () => {
    const draft = createValidDraft();
    expect(isPublishable(draft)).toBe(true);
  });

  it('returns true even with warnings', () => {
    const draft = {
      core: {
        name: 'Test',
        main_purpose_id: validUuid(),
        description: '', // warning
      },
      steps: [{ id: validUuid(), title: 'Step', body: 'Body' }],
    };
    // Should be publishable despite warnings
    expect(isPublishable(draft)).toBe(true);
  });
});

// =============================================================================
// INVARIANT: NO MUTATION
// =============================================================================

describe('resolveDraft - invariant: no mutation', () => {
  it('does not mutate input draft', () => {
    const original = createValidDraft();
    const copy = JSON.parse(JSON.stringify(original));

    resolveDraft(original);

    expect(original).toEqual(copy);
  });

  it('does not mutate nested objects', () => {
    const original = createValidDraft();
    const originalStepId = original.steps![0].id;
    const originalArtifactId = original.artifacts![0].id;

    resolveDraft(original);

    expect(original.steps![0].id).toBe(originalStepId);
    expect(original.artifacts![0].id).toBe(originalArtifactId);
  });
});

// =============================================================================
// INVARIANT: DETERMINISTIC
// =============================================================================

describe('resolveDraft - invariant: deterministic', () => {
  it('returns same errors in same order for identical input', () => {
    const draft = {
      core: { play_mode: 'invalid', name: '' },
      steps: [{ id: 'not-uuid', title: '', body: '' }],
    };

    const result1 = resolveDraft(draft);
    const result2 = resolveDraft(draft);

    expect(result1.errors.length).toBe(result2.errors.length);
    result1.errors.forEach((e, i) => {
      expect(e.code).toBe(result2.errors[i].code);
      expect(e.path).toBe(result2.errors[i].path);
    });
  });

  it('produces consistent counts', () => {
    const draft = createValidDraft();

    const result1 = resolveDraft(draft);
    const result2 = resolveDraft(draft);

    expect(result1.counts).toEqual(result2.counts);
  });
});

// =============================================================================
// INVARIANT: NO ID CREATION
// =============================================================================

describe('resolveDraft - invariant: no ID creation', () => {
  it('does not add IDs to entities', () => {
    const draft = {
      steps: [{ id: validUuid(), title: 'Step', body: 'Body' }],
    };
    const originalIds = draft.steps.map((s) => s.id);

    const result = resolveDraft(draft);

    // The resolver should not create or modify IDs
    // (IDs should only be created by actions/reducers)
    expect(result.errors.every((e) => !e.message.includes('created ID'))).toBe(
      true
    );
    expect(draft.steps.map((s) => s.id)).toEqual(originalIds);
  });
});

// =============================================================================
// PERFORMANCE SANITY CHECK
// =============================================================================

describe('resolveDraft - performance', () => {
  it('handles large drafts in reasonable time', () => {
    const draft = {
      steps: Array.from({ length: 1000 }, (_, i) => ({
        id: validUuid(),
        title: `Step ${i}`,
        body: `Body ${i}`,
        step_order: i,
      })),
      artifacts: Array.from({ length: 500 }, (_, i) => ({
        id: validUuid(),
        title: `Artifact ${i}`,
        artifact_type: 'card' as const,
        artifact_order: i,
        variants: [{ id: validUuid(), visibility: 'public' as const }],
      })),
    };

    const start = performance.now();
    resolveDraft(draft);
    const end = performance.now();

    // Should complete in under 100ms for 1500 items
    expect(end - start).toBeLessThan(100);
  });
});

// =============================================================================
// ERROR ROUTING HELPERS
// =============================================================================

describe('errorsForEntity', () => {
  it('filters errors by entity type', () => {
    const draft = {
      steps: [{ id: 'not-uuid', title: '', body: '' }],
      artifacts: [{ id: 'also-not-uuid', artifact_type: 'invalid' }],
    };
    const result = resolveDraft(draft);

    const stepErrors = errorsForEntity(result.errors, 'step');
    const artifactErrors = errorsForEntity(result.errors, 'artifact');

    expect(stepErrors.every((e) => e.meta?.entityType === 'step')).toBe(true);
    expect(artifactErrors.every((e) => e.meta?.entityType === 'artifact')).toBe(true);
  });

  it('filters by entity ID when provided', () => {
    const stepId = validUuid();
    const draft = {
      steps: [
        { id: stepId, title: '', body: '' },
        { id: validUuid(), title: '', body: '' },
      ],
    };
    const result = resolveDraft(draft);

    const specificErrors = errorsForEntity(result.errors, 'step', stepId);
    expect(specificErrors.every((e) => e.meta?.entityId === stepId)).toBe(true);
  });
});

describe('errorsForPath', () => {
  it('filters errors by exact path', () => {
    const draft = { core: { name: '', main_purpose_id: null } };
    const result = resolveDraft(draft);

    const nameErrors = errorsForPath(result.errors, 'core.name');
    expect(nameErrors.some((e) => e.path === 'core.name')).toBe(true);
  });

  it('filters errors by path prefix', () => {
    const draft = {
      steps: [
        { id: validUuid(), title: '', body: '' },
        { id: validUuid(), title: '', body: '' },
      ],
    };
    const result = resolveDraft(draft);

    const allStepErrors = errorsForPath(result.errors, 'steps');
    expect(allStepErrors.every((e) => e.path.startsWith('steps'))).toBe(true);
  });
});

describe('firstErrorForPath', () => {
  it('returns first error for path', () => {
    const draft = { core: { name: '' } };
    const result = resolveDraft(draft);

    const error = firstErrorForPath(result.errors, 'core.name');
    expect(error?.path).toBe('core.name');
  });

  it('returns undefined if no error', () => {
    const draft = { core: { name: 'Valid Name' } };
    const result = resolveDraft(draft);

    const error = firstErrorForPath(result.errors, 'core.name');
    expect(error).toBeUndefined();
  });
});

describe('hasErrorsForEntity', () => {
  it('returns true when entity has errors', () => {
    const draft = { steps: [{ id: 'not-uuid', title: '', body: '' }] };
    const result = resolveDraft(draft);

    expect(hasErrorsForEntity(result.errors, 'step')).toBe(true);
  });

  it('returns false when entity has no errors', () => {
    const draft = createValidDraft();
    const result = resolveDraft(draft);

    expect(hasErrorsForEntity(result.errors, 'step')).toBe(false);
  });
});

describe('entitySeverity', () => {
  it('returns error when entity has errors', () => {
    const draft = { steps: [{ id: 'not-uuid', title: '', body: '' }] };
    const result = resolveDraft(draft);

    expect(entitySeverity(result.errors, 'step')).toBe('error');
  });

  it('returns warning when entity has only warnings', () => {
    // Create a valid playable draft with only publish warnings
    const draft = {
      core: {
        name: 'Valid Name',
        main_purpose_id: validUuid(),
        description: 'Short', // warning (too short)
        age_min: null,         // warning
        min_players: null,     // warning
      },
      steps: [{ id: validUuid(), title: 'Step', body: 'Body' }],
      cover: { mediaId: null }, // warning
    };
    const result = resolveDraft(draft);

    // Should have only warnings (no errors)
    expect(result.counts.errors).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(entitySeverity(result.errors, 'core')).toBe('warning');
  });

  it('returns undefined when entity has no errors', () => {
    const draft = createValidDraft();
    const result = resolveDraft(draft);

    expect(entitySeverity(result.errors, 'trigger')).toBeUndefined();
  });
});
