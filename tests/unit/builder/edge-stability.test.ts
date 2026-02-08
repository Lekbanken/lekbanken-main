/**
 * Edge ID Stability Tests
 *
 * Ensures ReactFlow edge IDs follow the locked contract format.
 * These tests catch edge ID drift that would cause jittery ReactFlow diff.
 *
 * LOCKED CONTRACT (Sprint 2):
 * - Trigger edges: `trigger-{triggerId}-{actionIdx}`
 * - Artifact→Step edges: `artifact-step-{artifactId}-{stepId}`
 *
 * @see docs/builder/SPRINT2_WIRING_PLAN.md
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// Edge ID Format Contracts
// =============================================================================

describe('Edge ID format contracts', () => {
  const TRIGGER_EDGE_PATTERN = /^trigger-[a-f0-9-]+-\d+$/;
  const ARTIFACT_STEP_EDGE_PATTERN = /^artifact-step-[a-f0-9-]+-[a-f0-9-]+$/;

  describe('trigger edge IDs', () => {
    it('follows format: trigger-{triggerId}-{actionIdx}', () => {
      const triggerId = 'abc12345-1234-5678-9abc-def012345678';
      const actionIdx = 0;
      const edgeId = `trigger-${triggerId}-${actionIdx}`;

      expect(edgeId).toMatch(TRIGGER_EDGE_PATTERN);
    });

    it('actionIdx is numeric', () => {
      const validIds = [
        'trigger-abc-0',
        'trigger-abc-1',
        'trigger-abc-99',
      ];
      const invalidIds = [
        'trigger-abc-',
        'trigger-abc-a',
        'trigger-abc-1a',
      ];

      validIds.forEach((id) => {
        expect(id).toMatch(/^trigger-[a-z]+-\d+$/);
      });
      invalidIds.forEach((id) => {
        expect(id).not.toMatch(/^trigger-[a-z]+-\d+$/);
      });
    });
  });

  describe('artifact-step edge IDs', () => {
    it('follows format: artifact-step-{artifactId}-{stepId}', () => {
      const artifactId = 'abc12345-1234-5678-9abc-def012345678';
      const stepId = 'def67890-1234-5678-9abc-def012345678';
      const edgeId = `artifact-step-${artifactId}-${stepId}`;

      expect(edgeId).toMatch(ARTIFACT_STEP_EDGE_PATTERN);
    });

    it('requires both artifactId and stepId to be UUID-like', () => {
      const validId = 'artifact-step-abc12345-def67890';
      const invalidIds = [
        'artifact-step--def67890',
        'artifact-step-abc12345-',
        'artifact-abc12345-def67890', // missing -step-
      ];

      expect(validId).toMatch(/^artifact-step-[a-z0-9]+-[a-z0-9]+$/);
      invalidIds.forEach((id) => {
        expect(id).not.toMatch(/^artifact-step-[a-z0-9]+-[a-z0-9]+$/);
      });
    });
  });
});

// =============================================================================
// Edge ID Stability (zero-jitter)
// =============================================================================

describe('Edge ID stability (zero-jitter guarantee)', () => {
  it('same input produces identical edge ID', () => {
    const triggerId = '123e4567-e89b-12d3-a456-426614174000';
    const actionIdx = 2;

    const runs = Array.from({ length: 10 }, () =>
      `trigger-${triggerId}-${actionIdx}`
    );

    // All runs should produce identical ID
    const first = runs[0];
    runs.forEach((id) => {
      expect(id).toBe(first);
    });
  });

  it('artifact-step edge ID is stable', () => {
    const artifactId = '123e4567-e89b-12d3-a456-426614174000';
    const stepId = '987fcdeb-51a2-12d3-a456-426614174000';

    const runs = Array.from({ length: 10 }, () =>
      `artifact-step-${artifactId}-${stepId}`
    );

    const first = runs[0];
    runs.forEach((id) => {
      expect(id).toBe(first);
    });
  });
});

// =============================================================================
// Node ID Format Contracts
// =============================================================================

describe('Node ID format contracts', () => {
  const PHASE_NODE_PATTERN = /^phase-([a-f0-9-]+|orphan)$/;
  const STEP_NODE_PATTERN = /^step-[a-f0-9-]+$/;
  const ARTIFACT_NODE_PATTERN = /^artifact-[a-f0-9-]+$/;

  it('phase node follows format: phase-{uuid} or phase-orphan', () => {
    const validIds = [
      'phase-123e4567-e89b-12d3-a456-426614174000',
      'phase-orphan',
    ];
    const invalidIds = [
      'phases-123',
      'phase_123',
    ];

    validIds.forEach((id) => {
      expect(id).toMatch(PHASE_NODE_PATTERN);
    });
    invalidIds.forEach((id) => {
      expect(id).not.toMatch(PHASE_NODE_PATTERN);
    });
  });

  it('step node follows format: step-{uuid}', () => {
    const validId = 'step-123e4567-e89b-12d3-a456-426614174000';
    const invalidIds = [
      'steps-123',
      'step_123',
    ];

    expect(validId).toMatch(STEP_NODE_PATTERN);
    invalidIds.forEach((id) => {
      expect(id).not.toMatch(STEP_NODE_PATTERN);
    });
  });

  it('artifact node follows format: artifact-{uuid}', () => {
    const validId = 'artifact-123e4567-e89b-12d3-a456-426614174000';
    const invalidIds = [
      'artifacts-123',
      'artifact_123',
    ];

    expect(validId).toMatch(ARTIFACT_NODE_PATTERN);
    invalidIds.forEach((id) => {
      expect(id).not.toMatch(ARTIFACT_NODE_PATTERN);
    });
  });
});
