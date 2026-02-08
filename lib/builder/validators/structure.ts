/**
 * Structure Validator (Draft Gate)
 *
 * Validates structural integrity of the game draft.
 * These errors block saving the draft.
 *
 * Checks:
 * - Order collisions (duplicate step_order, artifact_order, etc.)
 * - Dangling references (artifact.metadata.step_id pointing to non-existent step)
 * - Invalid enums (artifact_type, visibility, etc.)
 * - Invalid UUIDs (metadata.step_id must be valid UUID if present)
 * - Duplicate IDs
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

import {
  type BuilderError,
  type EntityType,
  createBuilderError,
  BUILDER_ERROR_CODES,
} from '@/types/builder-error';
import {
  isValidEnumValue,
  ARTIFACT_TYPES,
  ARTIFACT_VISIBILITIES,
  PHASE_TYPES,
  TIMER_STYLES,
  ASSIGNMENT_STRATEGIES,
  DISPLAY_MODES,
  PLAY_MODES,
  ENERGY_LEVELS,
  LOCATION_TYPES,
} from '@/lib/domain/enums';
import {
  isValidUuid,
  normalizeStepId,
  getArtifactStepId,
} from '@/lib/builder/normalize';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Minimal step data needed for validation.
 */
export interface StepForValidation {
  id: string;
  title?: string;
  step_order?: number;
  display_mode?: string | null;
  phase_id?: string | null;
}

/**
 * Minimal phase data needed for validation.
 */
export interface PhaseForValidation {
  id: string;
  name?: string;
  phase_order?: number;
  phase_type?: string;
  timer_style?: string;
}

/**
 * Minimal role data needed for validation.
 */
export interface RoleForValidation {
  id: string;
  name?: string;
  role_order?: number;
  assignment_strategy?: string;
}

/**
 * Minimal artifact variant data for validation.
 */
export interface ArtifactVariantForValidation {
  id: string;
  visibility?: string;
  visible_to_role_id?: string | null;
}

/**
 * Minimal artifact data needed for validation.
 */
export interface ArtifactForValidation {
  id: string;
  title?: string;
  artifact_type?: string;
  artifact_order?: number;
  metadata?: Record<string, unknown> | null;
  variants?: ArtifactVariantForValidation[];
}

/**
 * Minimal trigger data for validation.
 */
export interface TriggerForValidation {
  id: string;
  name?: string;
  sort_order?: number;
}

/**
 * Core game data for validation.
 */
export interface CoreForValidation {
  play_mode?: string | null;
  energy_level?: string | null;
  location_type?: string | null;
}

/**
 * Complete draft data for structure validation.
 */
export interface DraftForStructureValidation {
  core?: CoreForValidation;
  steps?: StepForValidation[];
  phases?: PhaseForValidation[];
  roles?: RoleForValidation[];
  artifacts?: ArtifactForValidation[];
  triggers?: TriggerForValidation[];
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate structure of the draft (draft gate).
 *
 * @returns Array of BuilderError (empty if valid)
 */
export function validateStructure(
  draft: DraftForStructureValidation
): BuilderError[] {
  const errors: BuilderError[] = [];

  // Validate each section
  errors.push(...validateDuplicateIds(draft));
  errors.push(...validateOrderCollisions(draft));
  errors.push(...validateDanglingRefs(draft));
  errors.push(...validateEnums(draft));
  errors.push(...validateUuids(draft));

  return errors;
}

// =============================================================================
// DUPLICATE ID VALIDATION
// =============================================================================

/**
 * Check for duplicate IDs across all entities.
 */
function validateDuplicateIds(
  draft: DraftForStructureValidation
): BuilderError[] {
  const errors: BuilderError[] = [];
  const allIds = new Map<string, { type: string; path: string }[]>();

  // Collect all IDs
  const collectId = (id: string, type: string, path: string) => {
    if (!id) return;
    const existing = allIds.get(id) || [];
    existing.push({ type, path });
    allIds.set(id, existing);
  };

  // Steps
  draft.steps?.forEach((step, i) => {
    collectId(step.id, 'step', `steps[${i}]`);
  });

  // Phases
  draft.phases?.forEach((phase, i) => {
    collectId(phase.id, 'phase', `phases[${i}]`);
  });

  // Roles
  draft.roles?.forEach((role, i) => {
    collectId(role.id, 'role', `roles[${i}]`);
  });

  // Artifacts and variants
  draft.artifacts?.forEach((artifact, i) => {
    collectId(artifact.id, 'artifact', `artifacts[${i}]`);
    artifact.variants?.forEach((variant, j) => {
      collectId(variant.id, 'variant', `artifacts[${i}].variants[${j}]`);
    });
  });

  // Triggers
  draft.triggers?.forEach((trigger, i) => {
    collectId(trigger.id, 'trigger', `triggers[${i}]`);
  });

  // Report duplicates
  for (const [id, occurrences] of allIds) {
    if (occurrences.length > 1) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.DUPLICATE_ID,
          `Duplicerat ID: ${id} (finns ${occurrences.length} gånger)`,
          'draft',
          'error',
          occurrences[0].path,
          {
            entityType: occurrences[0].type as EntityType,
            entityId: id,
            occurrences: occurrences.map((o) => o.path),
            count: occurrences.length,
          }
        )
      );
    }
  }

  return errors;
}

// =============================================================================
// ORDER COLLISION VALIDATION
// =============================================================================

/**
 * Check for duplicate order values within each collection.
 */
function validateOrderCollisions(
  draft: DraftForStructureValidation
): BuilderError[] {
  const errors: BuilderError[] = [];

  // Helper to check order collisions
  const checkOrders = (
    items: Array<{ id: string; order?: number; name?: string }>,
    entityType: 'step' | 'phase' | 'role' | 'artifact' | 'trigger',
    pathPrefix: string,
    orderField: string
  ) => {
    const orderMap = new Map<number, string[]>();

    items.forEach((item, i) => {
      const order = item.order ?? i;
      const existing = orderMap.get(order) || [];
      existing.push(`${pathPrefix}[${i}]`);
      orderMap.set(order, existing);
    });

    for (const [order, paths] of orderMap) {
      if (paths.length > 1) {
        errors.push(
          createBuilderError(
            BUILDER_ERROR_CODES.ORDER_COLLISION,
            `${entityType} har duplicerad ${orderField}: ${order}`,
            'draft',
            'error',
            paths[0],
            {
              entityType,
              order,
              paths,
              count: paths.length,
            }
          )
        );
      }
    }
  };

  // Check steps
  if (draft.steps) {
    checkOrders(
      draft.steps.map((s) => ({ id: s.id, order: s.step_order })),
      'step',
      'steps',
      'step_order'
    );
  }

  // Check phases
  if (draft.phases) {
    checkOrders(
      draft.phases.map((p) => ({ id: p.id, order: p.phase_order })),
      'phase',
      'phases',
      'phase_order'
    );
  }

  // Check roles
  if (draft.roles) {
    checkOrders(
      draft.roles.map((r) => ({ id: r.id, order: r.role_order })),
      'role',
      'roles',
      'role_order'
    );
  }

  // Check artifacts
  if (draft.artifacts) {
    checkOrders(
      draft.artifacts.map((a) => ({ id: a.id, order: a.artifact_order })),
      'artifact',
      'artifacts',
      'artifact_order'
    );
  }

  // Check triggers
  if (draft.triggers) {
    checkOrders(
      draft.triggers.map((t) => ({ id: t.id, order: t.sort_order })),
      'trigger',
      'triggers',
      'sort_order'
    );
  }

  return errors;
}

// =============================================================================
// DANGLING REFERENCE VALIDATION
// =============================================================================

/**
 * Check for references to non-existent entities.
 */
function validateDanglingRefs(
  draft: DraftForStructureValidation
): BuilderError[] {
  const errors: BuilderError[] = [];

  // Build lookup sets
  const stepIds = new Set(draft.steps?.map((s) => s.id) ?? []);
  const phaseIds = new Set(draft.phases?.map((p) => p.id) ?? []);
  const roleIds = new Set(draft.roles?.map((r) => r.id) ?? []);

  // Check step.phase_id references
  draft.steps?.forEach((step, i) => {
    if (step.phase_id && !phaseIds.has(step.phase_id)) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.DANGLING_REF,
          `Steg "${step.title || step.id}" refererar till fas som inte finns`,
          'draft',
          'error',
          `steps[${i}].phase_id`,
          {
            entityType: 'step',
            entityId: step.id,
            refType: 'phase',
            refId: step.phase_id,
          }
        )
      );
    }
  });

  // Check artifact.metadata.step_id references (CANONICAL PATH)
  draft.artifacts?.forEach((artifact, i) => {
    const stepId = getArtifactStepId(artifact);
    if (stepId && !stepIds.has(stepId)) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.DANGLING_REF,
          `Artefakt "${artifact.title || artifact.id}" refererar till steg som inte finns`,
          'draft',
          'error',
          `artifacts[${i}].metadata.step_id`,
          {
            entityType: 'artifact',
            entityId: artifact.id,
            refType: 'step',
            refId: stepId,
          }
        )
      );
    }
  });

  // Check artifact variant visible_to_role_id references
  draft.artifacts?.forEach((artifact, i) => {
    artifact.variants?.forEach((variant, j) => {
      if (variant.visible_to_role_id && !roleIds.has(variant.visible_to_role_id)) {
        errors.push(
          createBuilderError(
            BUILDER_ERROR_CODES.DANGLING_REF,
            `Artefaktvariant refererar till roll som inte finns`,
            'draft',
            'error',
            `artifacts[${i}].variants[${j}].visible_to_role_id`,
            {
              entityType: 'artifact',
              entityId: artifact.id,
              refType: 'role',
              refId: variant.visible_to_role_id,
            }
          )
        );
      }
    });
  });

  return errors;
}

// =============================================================================
// ENUM VALIDATION
// =============================================================================

/**
 * Check that all enum fields have valid values.
 */
function validateEnums(draft: DraftForStructureValidation): BuilderError[] {
  const errors: BuilderError[] = [];

  // Core enums
  if (draft.core) {
    if (
      draft.core.play_mode &&
      !isValidEnumValue(draft.core.play_mode, PLAY_MODES)
    ) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.INVALID_ENUM,
          `Ogiltigt värde för play_mode: "${draft.core.play_mode}"`,
          'draft',
          'error',
          'core.play_mode',
          { expected: PLAY_MODES, actual: draft.core.play_mode }
        )
      );
    }

    if (
      draft.core.energy_level &&
      !isValidEnumValue(draft.core.energy_level, ENERGY_LEVELS)
    ) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.INVALID_ENUM,
          `Ogiltigt värde för energy_level: "${draft.core.energy_level}"`,
          'draft',
          'error',
          'core.energy_level',
          { expected: ENERGY_LEVELS, actual: draft.core.energy_level }
        )
      );
    }

    if (
      draft.core.location_type &&
      !isValidEnumValue(draft.core.location_type, LOCATION_TYPES)
    ) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.INVALID_ENUM,
          `Ogiltigt värde för location_type: "${draft.core.location_type}"`,
          'draft',
          'error',
          'core.location_type',
          { expected: LOCATION_TYPES, actual: draft.core.location_type }
        )
      );
    }
  }

  // Step enums
  draft.steps?.forEach((step, i) => {
    if (
      step.display_mode &&
      !isValidEnumValue(step.display_mode, DISPLAY_MODES)
    ) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.INVALID_ENUM,
          `Ogiltigt värde för display_mode: "${step.display_mode}"`,
          'draft',
          'error',
          `steps[${i}].display_mode`,
          {
            entityType: 'step',
            entityId: step.id,
            expected: DISPLAY_MODES,
            actual: step.display_mode,
          }
        )
      );
    }
  });

  // Phase enums
  draft.phases?.forEach((phase, i) => {
    if (phase.phase_type && !isValidEnumValue(phase.phase_type, PHASE_TYPES)) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.INVALID_ENUM,
          `Ogiltigt värde för phase_type: "${phase.phase_type}"`,
          'draft',
          'error',
          `phases[${i}].phase_type`,
          {
            entityType: 'phase',
            entityId: phase.id,
            expected: PHASE_TYPES,
            actual: phase.phase_type,
          }
        )
      );
    }

    if (
      phase.timer_style &&
      !isValidEnumValue(phase.timer_style, TIMER_STYLES)
    ) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.INVALID_ENUM,
          `Ogiltigt värde för timer_style: "${phase.timer_style}"`,
          'draft',
          'error',
          `phases[${i}].timer_style`,
          {
            entityType: 'phase',
            entityId: phase.id,
            expected: TIMER_STYLES,
            actual: phase.timer_style,
          }
        )
      );
    }
  });

  // Role enums
  draft.roles?.forEach((role, i) => {
    if (
      role.assignment_strategy &&
      !isValidEnumValue(role.assignment_strategy, ASSIGNMENT_STRATEGIES)
    ) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.INVALID_ENUM,
          `Ogiltigt värde för assignment_strategy: "${role.assignment_strategy}"`,
          'draft',
          'error',
          `roles[${i}].assignment_strategy`,
          {
            entityType: 'role',
            entityId: role.id,
            expected: ASSIGNMENT_STRATEGIES,
            actual: role.assignment_strategy,
          }
        )
      );
    }
  });

  // Artifact enums
  draft.artifacts?.forEach((artifact, i) => {
    if (
      artifact.artifact_type &&
      !isValidEnumValue(artifact.artifact_type, ARTIFACT_TYPES)
    ) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.INVALID_ENUM,
          `Ogiltigt värde för artifact_type: "${artifact.artifact_type}"`,
          'draft',
          'error',
          `artifacts[${i}].artifact_type`,
          {
            entityType: 'artifact',
            entityId: artifact.id,
            expected: ARTIFACT_TYPES,
            actual: artifact.artifact_type,
          }
        )
      );
    }

    // Variant visibility
    artifact.variants?.forEach((variant, j) => {
      if (
        variant.visibility &&
        !isValidEnumValue(variant.visibility, ARTIFACT_VISIBILITIES)
      ) {
        errors.push(
          createBuilderError(
            BUILDER_ERROR_CODES.INVALID_ENUM,
            `Ogiltigt värde för visibility: "${variant.visibility}"`,
            'draft',
            'error',
            `artifacts[${i}].variants[${j}].visibility`,
            {
              entityType: 'artifact',
              entityId: artifact.id,
              expected: ARTIFACT_VISIBILITIES,
              actual: variant.visibility,
            }
          )
        );
      }
    });
  });

  return errors;
}

// =============================================================================
// UUID VALIDATION
// =============================================================================

/**
 * Check that UUIDs are valid where required.
 * Also validates that references don't contain node ids (step-xxx, phase-xxx).
 */
function validateUuids(draft: DraftForStructureValidation): BuilderError[] {
  const errors: BuilderError[] = [];

  // Validate artifact.metadata.step_id is valid UUID if present
  draft.artifacts?.forEach((artifact, i) => {
    const stepIdRaw = normalizeStepId(artifact.metadata?.step_id);
    if (stepIdRaw) {
      // Check for node id format (step-xxx) - should be raw UUID
      if (stepIdRaw.startsWith('step-')) {
        errors.push(
          createBuilderError(
            BUILDER_ERROR_CODES.INVALID_REF_FORMAT,
            `metadata.step_id innehåller node-id format istället för UUID: "${stepIdRaw}"`,
            'draft',
            'error',
            `artifacts[${i}].metadata.step_id`,
            {
              entityType: 'artifact',
              entityId: artifact.id,
              actual: stepIdRaw,
              hint: 'Använd rå UUID, inte node-id format',
            }
          )
        );
      } else if (!isValidUuid(stepIdRaw)) {
        errors.push(
          createBuilderError(
            BUILDER_ERROR_CODES.INVALID_UUID,
            `metadata.step_id är inte ett giltigt UUID: "${stepIdRaw}"`,
            'draft',
            'error',
            `artifacts[${i}].metadata.step_id`,
            {
              entityType: 'artifact',
              entityId: artifact.id,
              actual: stepIdRaw,
            }
          )
        );
      }
    }
  });

  // Validate entity IDs are valid UUIDs
  const validateEntityId = (
    id: string,
    path: string,
    entityType: EntityType
  ) => {
    if (id && !isValidUuid(id)) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.INVALID_UUID,
          `ID är inte ett giltigt UUID: "${id}"`,
          'draft',
          'error',
          path,
          { entityType, entityId: id }
        )
      );
    }
  };

  draft.steps?.forEach((step, i) => validateEntityId(step.id, `steps[${i}].id`, 'step'));
  draft.phases?.forEach((phase, i) => validateEntityId(phase.id, `phases[${i}].id`, 'phase'));
  draft.roles?.forEach((role, i) => validateEntityId(role.id, `roles[${i}].id`, 'role'));
  draft.artifacts?.forEach((artifact, i) => {
    validateEntityId(artifact.id, `artifacts[${i}].id`, 'artifact');
    artifact.variants?.forEach((variant, j) => {
      validateEntityId(variant.id, `artifacts[${i}].variants[${j}].id`, 'artifact');
    });
  });
  draft.triggers?.forEach((trigger, i) => validateEntityId(trigger.id, `triggers[${i}].id`, 'trigger'));

  return errors;
}
