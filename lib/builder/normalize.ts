/**
 * Builder Normalization Utilities
 *
 * Canonical normalization functions for builder data.
 * Use these at load/save boundaries to ensure consistent data.
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

// =============================================================================
// UUID VALIDATION
// =============================================================================

/**
 * UUID v4 regex pattern.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID v4.
 */
export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

// =============================================================================
// STEP ID NORMALIZATION
// =============================================================================

/**
 * Normalize a step_id value from artifact metadata.
 *
 * CANONICAL PATH: artifacts[i].metadata.step_id
 *
 * Rules:
 * - Non-string values → undefined
 * - Empty or whitespace-only strings → undefined
 * - Valid strings → trimmed string
 *
 * Note: This does NOT validate UUID format. Use isValidUuid() for that.
 *
 * @example
 * normalizeStepId(undefined)     // undefined
 * normalizeStepId(null)          // undefined
 * normalizeStepId('')            // undefined
 * normalizeStepId('  ')          // undefined
 * normalizeStepId('abc-123')     // 'abc-123'
 * normalizeStepId('  uuid  ')    // 'uuid'
 */
export function normalizeStepId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Extract step_id from artifact metadata using canonical path.
 *
 * CANONICAL PATH: artifact.metadata.step_id
 *
 * @example
 * getArtifactStepId({ metadata: { step_id: 'uuid' } }) // 'uuid'
 * getArtifactStepId({ metadata: null })                 // undefined
 * getArtifactStepId({})                                 // undefined
 */
export function getArtifactStepId(artifact: {
  metadata?: Record<string, unknown> | null;
}): string | undefined {
  if (!artifact.metadata) return undefined;
  return normalizeStepId(artifact.metadata.step_id);
}

/**
 * Set step_id in artifact metadata using canonical path.
 *
 * CANONICAL PATH: artifact.metadata.step_id
 *
 * @returns New artifact with updated metadata (immutable)
 */
export function setArtifactStepId<
  T extends { metadata?: Record<string, unknown> | null },
>(artifact: T, stepId: string | undefined): T {
  const normalized = normalizeStepId(stepId);
  const existingMetadata = artifact.metadata ?? {};

  if (normalized === undefined) {
    // Remove step_id from metadata
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { step_id, ...rest } = existingMetadata;
    return {
      ...artifact,
      metadata: Object.keys(rest).length > 0 ? rest : null,
    };
  }

  return {
    ...artifact,
    metadata: {
      ...existingMetadata,
      step_id: normalized,
    },
  };
}

// =============================================================================
// ORDER NORMALIZATION
// =============================================================================

/**
 * Normalize order values to ensure they are non-negative integers.
 */
export function normalizeOrder(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  return 0;
}

// =============================================================================
// STRING NORMALIZATION
// =============================================================================

/**
 * Normalize a string value (trim, convert empty to undefined).
 */
export function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Normalize a string value (trim, convert empty to null).
 * Use this for database fields that expect null instead of undefined.
 */
export function normalizeStringToNull(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ?? null;
}
