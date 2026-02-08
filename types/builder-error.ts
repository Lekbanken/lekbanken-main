/**
 * Builder Error Types
 *
 * Typed error system for Game Builder validation.
 * All codes prefixed with B_ to distinguish from Import errors (I_) in logs.
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * Builder error codes (exhaustive list).
 * PREFIX: B_ for Builder errors (distinguishes from I_ Import errors in logs)
 */
export const BUILDER_ERROR_CODES = {
  // Draft-level (structure)
  ORDER_COLLISION: 'B_ORDER_COLLISION',
  DANGLING_REF: 'B_DANGLING_REF',
  INVALID_ENUM: 'B_INVALID_ENUM',
  INVALID_UUID: 'B_INVALID_UUID',
  INVALID_REF_FORMAT: 'B_INVALID_REF_FORMAT', // e.g., metadata.step_id contains node id instead of uuid
  DUPLICATE_ID: 'B_DUPLICATE_ID',

  // Playable-level (completeness)
  MISSING_PURPOSE: 'B_MISSING_PURPOSE',
  MISSING_TITLE: 'B_MISSING_TITLE',
  NO_STEPS: 'B_NO_STEPS',
  EMPTY_STEP: 'B_EMPTY_STEP',

  // Publish-level (quality warnings)
  NO_COVER: 'B_NO_COVER',
  SHORT_DESCRIPTION: 'B_SHORT_DESCRIPTION',
  MISSING_AGE_RANGE: 'B_MISSING_AGE_RANGE',
  MISSING_PLAYER_COUNT: 'B_MISSING_PLAYER_COUNT',
  
  // Beta feature warnings (never block)
  PUBLIC_BOARD_BETA: 'B_PUBLIC_BOARD_BETA',
  DEMO_MISSING_COVER: 'B_DEMO_MISSING_COVER',
} as const;

export type BuilderErrorCode =
  (typeof BUILDER_ERROR_CODES)[keyof typeof BUILDER_ERROR_CODES];

// =============================================================================
// GATES
// =============================================================================

/**
 * Validation gates in order of strictness.
 * - draft: structural integrity (refs, collisions, enums, UUID validity)
 * - playable: minimum completeness to run/test
 * - publish: quality recommendations (warnings only in v1)
 */
export type BuilderGate = 'draft' | 'playable' | 'publish';

/**
 * Gate order for comparison.
 * Lower index = earlier gate = less strict.
 */
export const GATE_ORDER: readonly BuilderGate[] = [
  'draft',
  'playable',
  'publish',
] as const;

// =============================================================================
// ERROR INTERFACE
// =============================================================================

/**
 * Severity levels.
 * - error: blocks the gate
 * - warning: shown but never blocks any action
 */
export type BuilderSeverity = 'error' | 'warning';

/**
 * Entity types for error routing.
 */
export type EntityType = 'step' | 'phase' | 'role' | 'artifact' | 'trigger' | 'core';

/**
 * Strongly-typed meta for BuilderError.
 * entityType and entityId are the known fields, rest is [key: string]: unknown.
 */
export interface BuilderErrorMeta {
  /** Type of entity (for UI routing) */
  entityType?: EntityType;
  /** ID of the entity */
  entityId?: string;
  /** Additional context (e.g., duplicate count, expected value) */
  [key: string]: unknown;
}

/**
 * Type guard to check if meta has entityType.
 */
export function metaHasEntity(
  meta: unknown
): meta is { entityType: EntityType; entityId?: string } {
  return (
    !!meta &&
    typeof meta === 'object' &&
    'entityType' in meta &&
    typeof (meta as Record<string, unknown>).entityType === 'string'
  );
}

/**
 * Structured error for builder validation.
 * Designed for UI navigation and debugging.
 */
export interface BuilderError {
  /** Unique error code (B_ prefix) */
  code: BuilderErrorCode;

  /** Human-readable message (localized) */
  message: string;

  /** Which gate this error belongs to */
  gate: BuilderGate;

  /** error = blocks gate, warning = shown but never blocks */
  severity: BuilderSeverity;

  /**
   * JSON path to the field with the error.
   * Example: "steps[0].title", "artifacts[2].metadata.step_id"
   */
  path: string;

  /**
   * Optional metadata for debugging and UI.
   * Contains entity info for click-navigation.
   */
  meta?: BuilderErrorMeta;

  /**
   * Optional suggestion for how to fix the error.
   * Shown in validation UI to help users resolve issues.
   */
  suggestion?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a BuilderError with required fields.
 */
export function createBuilderError(
  code: BuilderErrorCode,
  message: string,
  gate: BuilderGate,
  severity: BuilderSeverity,
  path: string,
  meta?: BuilderError['meta']
): BuilderError {
  return { code, message, gate, severity, path, meta };
}

/**
 * Check if a code belongs to a specific gate.
 */
export function codeIsForGate(
  code: BuilderErrorCode,
  gate: BuilderGate
): boolean {
  // Draft-level codes
  const draftCodes: BuilderErrorCode[] = [
    'B_ORDER_COLLISION',
    'B_DANGLING_REF',
    'B_INVALID_ENUM',
    'B_INVALID_UUID',
    'B_DUPLICATE_ID',
  ];

  // Playable-level codes
  const playableCodes: BuilderErrorCode[] = [
    'B_MISSING_PURPOSE',
    'B_MISSING_TITLE',
    'B_NO_STEPS',
    'B_EMPTY_STEP',
  ];

  // Publish-level codes (warnings)
  const publishCodes: BuilderErrorCode[] = [
    'B_NO_COVER',
    'B_SHORT_DESCRIPTION',
    'B_MISSING_AGE_RANGE',
    'B_MISSING_PLAYER_COUNT',
  ];

  switch (gate) {
    case 'draft':
      return draftCodes.includes(code);
    case 'playable':
      return playableCodes.includes(code);
    case 'publish':
      return publishCodes.includes(code);
    default:
      return false;
  }
}

/**
 * Get the gate index for comparison.
 */
export function getGateIndex(gate: BuilderGate): number {
  return GATE_ORDER.indexOf(gate);
}

/**
 * Check if gate A comes before gate B.
 */
export function gateIsBefore(a: BuilderGate, b: BuilderGate): boolean {
  return getGateIndex(a) < getGateIndex(b);
}
