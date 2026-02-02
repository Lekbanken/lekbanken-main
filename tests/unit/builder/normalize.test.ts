/**
 * Normalize Tests
 *
 * Tests for lib/builder/normalize.ts
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeStepId,
  getArtifactStepId,
  setArtifactStepId,
  isValidUuid,
  normalizeOrder,
  normalizeString,
  normalizeStringToNull,
} from '@/lib/builder/normalize';

// =============================================================================
// normalizeStepId
// =============================================================================

describe('normalizeStepId', () => {
  it('returns undefined for undefined', () => {
    expect(normalizeStepId(undefined)).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(normalizeStepId(null)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(normalizeStepId('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(normalizeStepId('   ')).toBeUndefined();
    expect(normalizeStepId('\t\n')).toBeUndefined();
  });

  it('returns undefined for non-string values', () => {
    expect(normalizeStepId(123)).toBeUndefined();
    expect(normalizeStepId({})).toBeUndefined();
    expect(normalizeStepId([])).toBeUndefined();
  });

  it('trims and returns valid strings', () => {
    expect(normalizeStepId('abc-123')).toBe('abc-123');
    expect(normalizeStepId('  uuid  ')).toBe('uuid');
  });

  it('handles valid UUIDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(normalizeStepId(uuid)).toBe(uuid);
  });
});

// =============================================================================
// isValidUuid
// =============================================================================

describe('isValidUuid', () => {
  it('returns true for valid UUID v4', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('returns false for non-string values', () => {
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(123)).toBe(false);
  });

  it('returns false for invalid formats', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUuid('')).toBe(false);
  });
});

// =============================================================================
// getArtifactStepId
// =============================================================================

describe('getArtifactStepId', () => {
  it('returns step_id from metadata', () => {
    const artifact = { metadata: { step_id: 'uuid-123' } };
    expect(getArtifactStepId(artifact)).toBe('uuid-123');
  });

  it('returns undefined for null metadata', () => {
    const artifact = { metadata: null };
    expect(getArtifactStepId(artifact)).toBeUndefined();
  });

  it('returns undefined for missing metadata', () => {
    const artifact = {};
    expect(getArtifactStepId(artifact)).toBeUndefined();
  });

  it('returns undefined for empty step_id', () => {
    const artifact = { metadata: { step_id: '' } };
    expect(getArtifactStepId(artifact)).toBeUndefined();
  });

  it('normalizes step_id', () => {
    const artifact = { metadata: { step_id: '  uuid  ' } };
    expect(getArtifactStepId(artifact)).toBe('uuid');
  });
});

// =============================================================================
// setArtifactStepId
// =============================================================================

describe('setArtifactStepId', () => {
  it('sets step_id in metadata', () => {
    const artifact = { id: 'a1', metadata: null };
    const result = setArtifactStepId(artifact, 'step-uuid');
    expect(result.metadata).toEqual({ step_id: 'step-uuid' });
    // Original should be unchanged (immutable)
    expect(artifact.metadata).toBeNull();
  });

  it('preserves existing metadata', () => {
    const artifact = { id: 'a1', metadata: { foo: 'bar' } };
    const result = setArtifactStepId(artifact, 'step-uuid');
    expect(result.metadata).toEqual({ foo: 'bar', step_id: 'step-uuid' });
  });

  it('removes step_id when undefined', () => {
    const artifact = { id: 'a1', metadata: { step_id: 'old', foo: 'bar' } };
    const result = setArtifactStepId(artifact, undefined);
    expect(result.metadata).toEqual({ foo: 'bar' });
  });

  it('sets metadata to null when removing only key', () => {
    const artifact = { id: 'a1', metadata: { step_id: 'old' } };
    const result = setArtifactStepId(artifact, undefined);
    expect(result.metadata).toBeNull();
  });

  it('normalizes empty string to undefined', () => {
    const artifact = { id: 'a1', metadata: { step_id: 'old' } };
    const result = setArtifactStepId(artifact, '  ');
    expect(result.metadata).toBeNull();
  });
});

// =============================================================================
// normalizeOrder
// =============================================================================

describe('normalizeOrder', () => {
  it('returns valid non-negative integers as-is', () => {
    expect(normalizeOrder(0)).toBe(0);
    expect(normalizeOrder(5)).toBe(5);
    expect(normalizeOrder(100)).toBe(100);
  });

  it('returns 0 for negative numbers', () => {
    expect(normalizeOrder(-1)).toBe(0);
    expect(normalizeOrder(-100)).toBe(0);
  });

  it('returns 0 for non-integers', () => {
    expect(normalizeOrder(1.5)).toBe(0);
    expect(normalizeOrder('5')).toBe(0);
    expect(normalizeOrder(null)).toBe(0);
  });
});

// =============================================================================
// normalizeString
// =============================================================================

describe('normalizeString', () => {
  it('returns trimmed string', () => {
    expect(normalizeString('  hello  ')).toBe('hello');
  });

  it('returns undefined for empty string', () => {
    expect(normalizeString('')).toBeUndefined();
    expect(normalizeString('   ')).toBeUndefined();
  });

  it('returns undefined for non-strings', () => {
    expect(normalizeString(null)).toBeUndefined();
    expect(normalizeString(123)).toBeUndefined();
  });
});

// =============================================================================
// normalizeStringToNull
// =============================================================================

describe('normalizeStringToNull', () => {
  it('returns trimmed string', () => {
    expect(normalizeStringToNull('  hello  ')).toBe('hello');
  });

  it('returns null for empty string', () => {
    expect(normalizeStringToNull('')).toBeNull();
    expect(normalizeStringToNull('   ')).toBeNull();
  });

  it('returns null for non-strings', () => {
    expect(normalizeStringToNull(null)).toBeNull();
    expect(normalizeStringToNull(123)).toBeNull();
  });
});
