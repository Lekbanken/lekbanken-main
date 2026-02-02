/**
 * Completeness Validator Tests
 *
 * Tests for lib/builder/validators/completeness.ts
 */

import { describe, it, expect } from 'vitest';
import { validateCompleteness } from '@/lib/builder/validators/completeness';

// =============================================================================
// HELPERS
// =============================================================================

const validUuid = () => crypto.randomUUID();

// =============================================================================
// MISSING TITLE
// =============================================================================

describe('validateCompleteness - missing title', () => {
  it('returns error when title is missing', () => {
    const draft = { core: { name: '' } };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_TITLE')).toBe(true);
  });

  it('returns error when title is whitespace only', () => {
    const draft = { core: { name: '   ' } };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_TITLE')).toBe(true);
  });

  it('returns no error when title is present', () => {
    const draft = { core: { name: 'Test Game' } };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_TITLE')).toBe(false);
  });
});

// =============================================================================
// MISSING PURPOSE
// =============================================================================

describe('validateCompleteness - missing purpose', () => {
  it('returns error when main_purpose_id is missing', () => {
    const draft = { core: { main_purpose_id: null } };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_PURPOSE')).toBe(true);
  });

  it('returns no error when purpose is present', () => {
    const draft = { core: { main_purpose_id: validUuid() } };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_MISSING_PURPOSE')).toBe(false);
  });
});

// =============================================================================
// NO STEPS OR DESCRIPTION
// =============================================================================

describe('validateCompleteness - no steps or description', () => {
  it('returns error when neither steps nor description exist', () => {
    const draft = { core: { description: '' }, steps: [] };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_NO_STEPS')).toBe(true);
  });

  it('returns no error when steps exist', () => {
    const draft = {
      core: { description: '' },
      steps: [{ id: validUuid(), title: 'Step 1', body: 'Do this' }],
    };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_NO_STEPS')).toBe(false);
  });

  it('returns no error when description exists', () => {
    const draft = {
      core: { description: 'This is a game about...' },
      steps: [],
    };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_NO_STEPS')).toBe(false);
  });
});

// =============================================================================
// EMPTY STEPS
// =============================================================================

describe('validateCompleteness - empty steps', () => {
  it('returns error for step without title or body', () => {
    const draft = {
      steps: [{ id: validUuid(), title: '', body: '' }],
    };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_EMPTY_STEP')).toBe(true);
  });

  it('returns error for step with whitespace-only content', () => {
    const draft = {
      steps: [{ id: validUuid(), title: '   ', body: '   ' }],
    };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_EMPTY_STEP')).toBe(true);
  });

  it('returns no error for step with title only', () => {
    const draft = {
      steps: [{ id: validUuid(), title: 'Introduction', body: '' }],
    };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_EMPTY_STEP')).toBe(false);
  });

  it('returns no error for step with body only', () => {
    const draft = {
      steps: [{ id: validUuid(), title: '', body: 'Do this thing' }],
    };
    const errors = validateCompleteness(draft);
    expect(errors.some((e) => e.code === 'B_EMPTY_STEP')).toBe(false);
  });

  it('reports correct step index in error', () => {
    const draft = {
      steps: [
        { id: validUuid(), title: 'Good', body: '' },
        { id: validUuid(), title: '', body: '' }, // This one is empty
      ],
    };
    const errors = validateCompleteness(draft);
    const emptyStepError = errors.find((e) => e.code === 'B_EMPTY_STEP');
    expect(emptyStepError?.path).toBe('steps[1]');
    expect(emptyStepError?.meta?.stepIndex).toBe(1);
  });
});

// =============================================================================
// VALID DRAFT
// =============================================================================

describe('validateCompleteness - valid draft', () => {
  it('returns empty array for complete draft', () => {
    const draft = {
      core: {
        name: 'Test Game',
        main_purpose_id: validUuid(),
        description: 'A fun game',
      },
      steps: [{ id: validUuid(), title: 'Step 1', body: 'Do this' }],
    };
    const errors = validateCompleteness(draft);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// ERROR METADATA
// =============================================================================

describe('validateCompleteness - error metadata', () => {
  it('all errors have gate = playable', () => {
    const draft = { core: { name: '', main_purpose_id: null }, steps: [] };
    const errors = validateCompleteness(draft);
    expect(errors.length).toBeGreaterThan(0);
    errors.forEach((e) => {
      expect(e.gate).toBe('playable');
    });
  });

  it('all errors have severity = error', () => {
    const draft = { core: { name: '', main_purpose_id: null }, steps: [] };
    const errors = validateCompleteness(draft);
    errors.forEach((e) => {
      expect(e.severity).toBe('error');
    });
  });
});
