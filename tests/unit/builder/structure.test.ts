/**
 * Structure Validator Tests
 *
 * Tests for lib/builder/validators/structure.ts
 */

import { describe, it, expect } from 'vitest';
import { validateStructure } from '@/lib/builder/validators/structure';

// =============================================================================
// HELPERS
// =============================================================================

const validUuid = () => crypto.randomUUID();

// =============================================================================
// DUPLICATE IDS
// =============================================================================

describe('validateStructure - duplicate IDs', () => {
  it('returns no errors for unique IDs', () => {
    const draft = {
      steps: [{ id: validUuid() }, { id: validUuid() }],
      phases: [{ id: validUuid() }],
    };
    const errors = validateStructure(draft);
    expect(errors.filter((e) => e.code === 'B_DUPLICATE_ID')).toHaveLength(0);
  });

  it('detects duplicate step IDs', () => {
    const dupId = validUuid();
    const draft = {
      steps: [{ id: dupId }, { id: dupId }],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_DUPLICATE_ID')).toBe(true);
  });

  it('detects duplicate IDs across entity types', () => {
    const dupId = validUuid();
    const draft = {
      steps: [{ id: dupId }],
      phases: [{ id: dupId }],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_DUPLICATE_ID')).toBe(true);
  });
});

// =============================================================================
// ORDER COLLISIONS
// =============================================================================

describe('validateStructure - order collisions', () => {
  it('returns no errors for unique orders', () => {
    const draft = {
      steps: [
        { id: validUuid(), step_order: 0 },
        { id: validUuid(), step_order: 1 },
      ],
    };
    const errors = validateStructure(draft);
    expect(errors.filter((e) => e.code === 'B_ORDER_COLLISION')).toHaveLength(0);
  });

  it('detects duplicate step_order', () => {
    const draft = {
      steps: [
        { id: validUuid(), step_order: 0 },
        { id: validUuid(), step_order: 0 },
      ],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_ORDER_COLLISION')).toBe(true);
  });

  it('detects duplicate phase_order', () => {
    const draft = {
      phases: [
        { id: validUuid(), phase_order: 1 },
        { id: validUuid(), phase_order: 1 },
      ],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_ORDER_COLLISION')).toBe(true);
  });

  it('detects duplicate artifact_order', () => {
    const draft = {
      artifacts: [
        { id: validUuid(), artifact_order: 5 },
        { id: validUuid(), artifact_order: 5 },
      ],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_ORDER_COLLISION')).toBe(true);
  });
});

// =============================================================================
// DANGLING REFERENCES
// =============================================================================

describe('validateStructure - dangling refs', () => {
  it('returns no errors for valid step→phase reference', () => {
    const phaseId = validUuid();
    const draft = {
      steps: [{ id: validUuid(), phase_id: phaseId }],
      phases: [{ id: phaseId }],
    };
    const errors = validateStructure(draft);
    expect(errors.filter((e) => e.code === 'B_DANGLING_REF')).toHaveLength(0);
  });

  it('detects dangling step→phase reference', () => {
    const draft = {
      steps: [{ id: validUuid(), phase_id: validUuid() }],
      phases: [],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_DANGLING_REF')).toBe(true);
  });

  it('detects dangling artifact.metadata.step_id reference', () => {
    const draft = {
      artifacts: [
        {
          id: validUuid(),
          metadata: { step_id: validUuid() },
        },
      ],
      steps: [],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_DANGLING_REF')).toBe(true);
    expect(errors.some((e) => e.path.includes('metadata.step_id'))).toBe(true);
  });

  it('returns no errors for valid artifact.metadata.step_id', () => {
    const stepId = validUuid();
    const draft = {
      artifacts: [
        {
          id: validUuid(),
          metadata: { step_id: stepId },
        },
      ],
      steps: [{ id: stepId }],
    };
    const errors = validateStructure(draft);
    expect(errors.filter((e) => e.code === 'B_DANGLING_REF')).toHaveLength(0);
  });

  it('detects dangling variant.visible_to_role_id', () => {
    const draft = {
      artifacts: [
        {
          id: validUuid(),
          variants: [{ id: validUuid(), visible_to_role_id: validUuid() }],
        },
      ],
      roles: [],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_DANGLING_REF')).toBe(true);
  });
});

// =============================================================================
// INVALID ENUMS
// =============================================================================

describe('validateStructure - invalid enums', () => {
  it('returns no errors for valid enums', () => {
    const draft = {
      core: { play_mode: 'facilitated', energy_level: 'high' },
      steps: [{ id: validUuid(), display_mode: 'instant' }],
      phases: [{ id: validUuid(), phase_type: 'intro', timer_style: 'countdown' }],
      roles: [{ id: validUuid(), assignment_strategy: 'random' }],
      artifacts: [
        {
          id: validUuid(),
          artifact_type: 'card',
          variants: [{ id: validUuid(), visibility: 'public' }],
        },
      ],
    };
    const errors = validateStructure(draft);
    expect(errors.filter((e) => e.code === 'B_INVALID_ENUM')).toHaveLength(0);
  });

  it('detects invalid play_mode', () => {
    const draft = { core: { play_mode: 'invalid_mode' } };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_INVALID_ENUM' && e.path === 'core.play_mode')).toBe(true);
  });

  it('detects invalid artifact_type', () => {
    const draft = {
      artifacts: [{ id: validUuid(), artifact_type: 'not_real_type' }],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_INVALID_ENUM' && e.path.includes('artifact_type'))).toBe(true);
  });

  it('detects invalid display_mode', () => {
    const draft = {
      steps: [{ id: validUuid(), display_mode: 'super_slow' }],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_INVALID_ENUM')).toBe(true);
  });

  it('detects invalid phase_type', () => {
    const draft = {
      phases: [{ id: validUuid(), phase_type: 'not_a_phase' }],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_INVALID_ENUM')).toBe(true);
  });

  it('detects invalid visibility', () => {
    const draft = {
      artifacts: [
        {
          id: validUuid(),
          variants: [{ id: validUuid(), visibility: 'super_secret' }],
        },
      ],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_INVALID_ENUM')).toBe(true);
  });
});

// =============================================================================
// INVALID UUIDS
// =============================================================================

describe('validateStructure - invalid UUIDs', () => {
  it('returns no errors for valid UUIDs', () => {
    const draft = {
      steps: [{ id: validUuid() }],
      phases: [{ id: validUuid() }],
    };
    const errors = validateStructure(draft);
    expect(errors.filter((e) => e.code === 'B_INVALID_UUID')).toHaveLength(0);
  });

  it('detects invalid step ID', () => {
    const draft = {
      steps: [{ id: 'not-a-uuid' }],
    };
    const errors = validateStructure(draft);
    expect(errors.some((e) => e.code === 'B_INVALID_UUID')).toBe(true);
  });

  it('detects invalid metadata.step_id format', () => {
    const draft = {
      artifacts: [
        {
          id: validUuid(),
          metadata: { step_id: 'invalid-uuid-format' },
        },
      ],
      steps: [{ id: 'invalid-uuid-format' }], // Same ID to avoid dangling ref
    };
    const errors = validateStructure(draft);
    // Both the artifact metadata.step_id and the step.id should be flagged
    expect(errors.filter((e) => e.code === 'B_INVALID_UUID').length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// EMPTY DRAFT
// =============================================================================

describe('validateStructure - empty draft', () => {
  it('handles empty draft gracefully', () => {
    const errors = validateStructure({});
    // Should return empty array, not throw
    expect(Array.isArray(errors)).toBe(true);
  });

  it('handles undefined collections', () => {
    const draft = {
      core: undefined,
      steps: undefined,
      phases: undefined,
      roles: undefined,
      artifacts: undefined,
      triggers: undefined,
    };
    const errors = validateStructure(draft);
    expect(Array.isArray(errors)).toBe(true);
  });
});
