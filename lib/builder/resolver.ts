/**
 * Draft Resolver
 *
 * Pure function that resolves a game draft and runs all validations.
 * Returns errors categorized by gate with helper functions.
 *
 * INVARIANTS (tested):
 * 1. No mutation of input draft
 * 2. Deterministic output (same input → same errors in same order)
 * 3. O(n) time complexity (no nested scans over big arrays)
 * 4. No ID creation (IDs only created by reducer/actions)
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

import type { BuilderError, BuilderGate } from '@/types/builder-error';
import { GATE_ORDER, getGateIndex } from '@/types/builder-error';
import {
  validateStructure,
  type DraftForStructureValidation,
} from './validators/structure';
import {
  validateCompleteness,
  type DraftForCompletenessValidation,
} from './validators/completeness';
import {
  validateQuality,
  type DraftForQualityValidation,
} from './validators/quality';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Combined draft type for resolver.
 */
export type GameDraft = DraftForStructureValidation &
  DraftForCompletenessValidation &
  DraftForQualityValidation;

/**
 * Orphan key for steps without a phase.
 * Matches the ReactFlow 'phase-orphan' container node.
 */
export const ORPHAN_PHASE_KEY = 'phase-orphan';

/**
 * Unassigned key for artifacts without a step.
 * Follows same naming convention as ORPHAN_PHASE_KEY.
 * 
 * LOCKED: Never use '__unassigned__' or other formats.
 */
export const UNASSIGNED_STEP_KEY = 'step-unassigned';

/**
 * Phase data with ID for grouping.
 */
interface PhaseForGrouping {
  id: string;
  phase_order?: number;
}

/**
 * Step data with ID and phase_id for grouping.
 */
interface StepForGrouping {
  id: string;
  step_order?: number;
  phase_id?: string | null;
}

/**
 * Artifact data with metadata.step_id for grouping.
 * Note: metadata can be Record<string, unknown> from validators,
 * so we use a helper to extract step_id safely.
 */
interface ArtifactForGrouping {
  id: string;
  artifact_order?: number;
  metadata?: Record<string, unknown> | null;
}

/**
 * Safely extract step_id from unknown metadata.
 * Handles Record<string, unknown>, null, undefined.
 */
function readStepIdFromMetadata(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const v = (metadata as Record<string, unknown>)['step_id'];
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

/**
 * Result of resolving a draft.
 */
export interface ResolveResult {
  /**
   * All errors from all gates.
   */
  errors: BuilderError[];

  /**
   * Errors grouped by gate.
   */
  errorsByGate: Record<BuilderGate, BuilderError[]>;

  /**
   * Get blocking errors for a specific gate (cumulative).
   *
   * - draft: only draft errors
   * - playable: draft + playable errors
   * - publish: draft + playable + publish errors (but publish only has warnings)
   *
   * Only returns errors with severity === 'error'.
   */
  blockingErrorsFor: (gate: BuilderGate) => BuilderError[];

  /**
   * Check if a gate is passed (no blocking errors).
   */
  isGatePassed: (gate: BuilderGate) => boolean;

  /**
   * Get all warnings (severity === 'warning').
   */
  warnings: BuilderError[];

  /**
   * Summary counts.
   */
  counts: {
    total: number;
    errors: number;
    warnings: number;
    byGate: Record<BuilderGate, number>;
  };

  // ===========================================================================
  // COMPUTED GROUPINGS (for Wizard/Mallar/ReactFlow)
  // ===========================================================================

  /**
   * Steps grouped by phase_id.
   * - Key is phase UUID or ORPHAN_PHASE_KEY ('phase-orphan') for null phase_id
   * - Values are sorted by step_order, then id (stable sort)
   */
  stepsByPhaseId: Map<string, StepForGrouping[]>;

  /**
   * Artifacts grouped by metadata.step_id.
   * - Key is step UUID or UNASSIGNED_STEP_KEY ('__unassigned__') for no step
   * - Values are sorted by artifact_order, then id (stable sort)
   */
  artifactsByStepId: Map<string, ArtifactForGrouping[]>;

  /**
   * Phases sorted by phase_order, then id (stable sort).
   */
  phasesSorted: PhaseForGrouping[];

  /**
   * Steps sorted by step_order, then id (stable sort).
   */
  stepsSorted: StepForGrouping[];
}

// =============================================================================
// RESOLVER
// =============================================================================

/**
 * Resolve a game draft and run all validations.
 *
 * This is a PURE function - it does not mutate the input.
 *
 * @param draft - The game draft to validate
 * @returns ResolveResult with errors and helper functions
 */
export function resolveDraft(draft: GameDraft): ResolveResult {
  // Run all validators
  const structureErrors = validateStructure(draft);
  const completenessErrors = validateCompleteness(draft);
  const qualityErrors = validateQuality(draft);

  // Combine all errors
  const errors: BuilderError[] = [
    ...structureErrors,
    ...completenessErrors,
    ...qualityErrors,
  ];

  // Group by gate
  const errorsByGate: Record<BuilderGate, BuilderError[]> = {
    draft: structureErrors,
    playable: completenessErrors,
    publish: qualityErrors,
  };

  // Separate warnings
  const warnings = errors.filter((e) => e.severity === 'warning');

  // Create helper functions
  const blockingErrorsFor = (gate: BuilderGate): BuilderError[] => {
    const gateIndex = getGateIndex(gate);
    const result: BuilderError[] = [];

    // Collect errors from this gate and all earlier gates
    for (let i = 0; i <= gateIndex; i++) {
      const g = GATE_ORDER[i];
      const gateErrors = errorsByGate[g] ?? [];
      // Only include errors (not warnings)
      result.push(...gateErrors.filter((e) => e.severity === 'error'));
    }

    return result;
  };

  const isGatePassed = (gate: BuilderGate): boolean => {
    return blockingErrorsFor(gate).length === 0;
  };

  // Calculate counts
  const counts = {
    total: errors.length,
    errors: errors.filter((e) => e.severity === 'error').length,
    warnings: warnings.length,
    byGate: {
      draft: structureErrors.length,
      playable: completenessErrors.length,
      publish: qualityErrors.length,
    },
  };

  // ===========================================================================
  // COMPUTED GROUPINGS (pure, no mutation)
  // ===========================================================================

  // Stable sort helper: sort by order, then by id for determinism
  // Uses string key to avoid keyof constraints across different view types
  const stableSort = <T extends { id: string }>(
    items: T[],
    orderKey: string
  ): T[] => {
    return [...items].sort((a, b) => {
      const orderA = typeof (a as Record<string, unknown>)[orderKey] === 'number'
        ? ((a as Record<string, unknown>)[orderKey] as number)
        : Infinity;
      const orderB = typeof (b as Record<string, unknown>)[orderKey] === 'number'
        ? ((b as Record<string, unknown>)[orderKey] as number)
        : Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return a.id.localeCompare(b.id);
    });
  };

  // Group steps by phase_id
  const stepsByPhaseId = new Map<string, StepForGrouping[]>();
  for (const step of draft.steps ?? []) {
    const key = step.phase_id ?? ORPHAN_PHASE_KEY;
    if (!stepsByPhaseId.has(key)) {
      stepsByPhaseId.set(key, []);
    }
    stepsByPhaseId.get(key)!.push(step);
  }
  // Sort each group
  for (const [key, steps] of stepsByPhaseId) {
    stepsByPhaseId.set(key, stableSort(steps, 'step_order'));
  }

  // Group artifacts by metadata.step_id
  const artifactsByStepId = new Map<string, ArtifactForGrouping[]>();
  for (const artifact of draft.artifacts ?? []) {
    const stepId = readStepIdFromMetadata(artifact.metadata);
    const key = stepId ?? UNASSIGNED_STEP_KEY;
    if (!artifactsByStepId.has(key)) {
      artifactsByStepId.set(key, []);
    }
    artifactsByStepId.get(key)!.push(artifact);
  }
  // Sort each group
  for (const [key, artifacts] of artifactsByStepId) {
    artifactsByStepId.set(key, stableSort(artifacts, 'artifact_order'));
  }

  // Sorted phases
  const phasesSorted = stableSort(draft.phases ?? [], 'phase_order');

  // Sorted steps
  const stepsSorted = stableSort(draft.steps ?? [], 'step_order');

  return {
    errors,
    errorsByGate,
    blockingErrorsFor,
    isGatePassed,
    warnings,
    counts,
    // Computed groupings
    stepsByPhaseId,
    artifactsByStepId,
    phasesSorted,
    stepsSorted,
  };
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Quick check if draft is valid for saving.
 */
export function isDraftValid(draft: GameDraft): boolean {
  return resolveDraft(draft).isGatePassed('draft');
}

/**
 * Quick check if draft is playable.
 */
export function isPlayable(draft: GameDraft): boolean {
  return resolveDraft(draft).isGatePassed('playable');
}

/**
 * Quick check if draft is publishable (same as playable - publish gate only has warnings).
 */
export function isPublishable(draft: GameDraft): boolean {
  // Publish gate only has warnings, so we check playable gate
  return resolveDraft(draft).isGatePassed('playable');
}

// =============================================================================
// ERROR ROUTING HELPERS (for UI wiring)
// =============================================================================

/**
 * Get errors for a specific entity type and ID.
 *
 * Use this for highlighting entities in the UI (e.g., ReactFlow nodes).
 *
 * @example
 * const stepErrors = errorsForEntity(result.errors, 'step', 'uuid-123');
 */
export function errorsForEntity(
  errors: BuilderError[],
  entityType: 'step' | 'phase' | 'role' | 'artifact' | 'trigger' | 'core',
  entityId?: string
): BuilderError[] {
  return errors.filter((e) => {
    if (e.meta?.entityType !== entityType) return false;
    if (entityId && e.meta?.entityId !== entityId) return false;
    return true;
  });
}

/**
 * Get errors for a specific JSON path prefix.
 *
 * Use this for inline field markers in forms.
 *
 * @example
 * const nameErrors = errorsForPath(result.errors, 'core.name');
 * const step0Errors = errorsForPath(result.errors, 'steps[0]');
 */
export function errorsForPath(
  errors: BuilderError[],
  pathPrefix: string
): BuilderError[] {
  return errors.filter(
    (e) => e.path === pathPrefix || e.path.startsWith(`${pathPrefix}.`)
  );
}

/**
 * Get the first error for a specific path (for single-field display).
 */
export function firstErrorForPath(
  errors: BuilderError[],
  path: string
): BuilderError | undefined {
  return errors.find((e) => e.path === path);
}

/**
 * Check if any errors exist for an entity (for node highlighting).
 */
export function hasErrorsForEntity(
  errors: BuilderError[],
  entityType: 'step' | 'phase' | 'role' | 'artifact' | 'trigger' | 'core',
  entityId?: string
): boolean {
  return errorsForEntity(errors, entityType, entityId).length > 0;
}

/**
 * Get error severity for entity (for node border color).
 * Returns 'error' if any errors, 'warning' if only warnings, undefined if none.
 */
export function entitySeverity(
  errors: BuilderError[],
  entityType: 'step' | 'phase' | 'role' | 'artifact' | 'trigger' | 'core',
  entityId?: string
): 'error' | 'warning' | undefined {
  const entityErrors = errorsForEntity(errors, entityType, entityId);
  if (entityErrors.length === 0) return undefined;
  if (entityErrors.some((e) => e.severity === 'error')) return 'error';
  return 'warning';
}
