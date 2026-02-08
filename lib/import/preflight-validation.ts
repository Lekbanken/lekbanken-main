/**
 * Pre-flight validation for game import
 * 
 * This module runs ALL validation checks BEFORE any database writes.
 * It ensures that invalid data is caught early (fail-fast) and no
 * partial game state is created.
 * 
 * CRITICAL: This must be called BEFORE creating the game row in the database.
 */

import type { ParsedGame, ParsedTrigger } from '@/types/csv-import';
import type { ImportError } from '@/types/csv-import';
import { 
  normalizeAndValidateGameTriggers, 
  hasBlockingTriggerErrors,
  type TriggerNormalizationResult 
} from './trigger-normalization';

// =============================================================================
// Types
// =============================================================================

export interface PreflightResult {
  /** Whether all preflight checks passed */
  ok: boolean;
  
  /** Blocking errors that prevent import */
  blockingErrors: ImportError[];
  
  /** Warnings that don't prevent import */
  warnings: ImportError[];
  
  /** Normalized game data (with canonicalized triggers) */
  normalizedGame: ParsedGame;
  
  /** Pre-computed data for DB writes */
  precomputed: PrecomputedData;
}

export interface PrecomputedData {
  /** Step ID by step_order */
  stepIdByOrder: Map<number, string>;
  
  /** Phase ID by phase_order */
  phaseIdByOrder: Map<number, string>;
  
  /** Artifact ID by artifact_order */
  artifactIdByOrder: Map<number, string>;
  
  /** Role ID by role_order */
  roleIdByOrder: Map<number, string>;
  
  /** Role ID by role name (lowercase) */
  roleIdByName: Map<string, string>;
  
  /** Normalized and validated triggers */
  normalizedTriggers: ParsedTrigger[];
  
  /** Resolved phase_id for each step (by step_order) - null if no phase assigned */
  stepPhaseIdByOrder: Map<number, string | null>;
}

// =============================================================================
// Preflight validation
// =============================================================================

/**
 * Run all preflight validation checks for a game BEFORE any DB writes.
 * 
 * This function:
 * 1. Normalizes legacy trigger formats to canonical
 * 2. Validates all triggers have required fields
 * 3. Checks for duplicate orders (step_order, phase_order, etc.)
 * 4. Pre-generates UUIDs for all entities
 * 
 * If any blocking error is found, the import MUST be aborted.
 * 
 * @param game - Parsed game data (may have legacy trigger format)
 * @param gameKey - Game key for error messages
 * @returns Preflight result with normalized data or blocking errors
 */
export function runPreflightValidation(
  game: ParsedGame,
  generateUUID: () => string
): PreflightResult {
  const blockingErrors: ImportError[] = [];
  const warnings: ImportError[] = [];
  
  // Pre-computed data
  const stepIdByOrder = new Map<number, string>();
  const phaseIdByOrder = new Map<number, string>();
  const artifactIdByOrder = new Map<number, string>();
  const roleIdByOrder = new Map<number, string>();
  const roleIdByName = new Map<string, string>();

  // =========================================================================
  // 1. Check for duplicate step_order
  // =========================================================================
  const seenStepOrders = new Set<number>();
  for (let i = 0; i < (game.steps?.length ?? 0); i++) {
    const step = game.steps![i];
    const stepOrder = step.step_order ?? i + 1;
    
    if (seenStepOrders.has(stepOrder)) {
      blockingErrors.push({
        row: i + 1,
        column: `steps[${i}].step_order`,
        message: `Duplicate step_order=${stepOrder} detected. Each step must have unique order.`,
        severity: 'error',
        code: 'DUPLICATE_STEP_ORDER',
      });
    } else {
      seenStepOrders.add(stepOrder);
      stepIdByOrder.set(stepOrder, generateUUID());
    }
  }

  // =========================================================================
  // 2. Check for duplicate phase_order
  // =========================================================================
  const seenPhaseOrders = new Set<number>();
  for (let i = 0; i < (game.phases?.length ?? 0); i++) {
    const phase = game.phases![i];
    const phaseOrder = phase.phase_order ?? i + 1;
    
    if (seenPhaseOrders.has(phaseOrder)) {
      blockingErrors.push({
        row: i + 1,
        column: `phases[${i}].phase_order`,
        message: `Duplicate phase_order=${phaseOrder} detected. Each phase must have unique order.`,
        severity: 'error',
        code: 'DUPLICATE_PHASE_ORDER',
      });
    } else {
      seenPhaseOrders.add(phaseOrder);
      phaseIdByOrder.set(phaseOrder, generateUUID());
    }
  }

  // =========================================================================
  // 3. Check for duplicate artifact_order
  // =========================================================================
  const seenArtifactOrders = new Set<number>();
  for (let i = 0; i < (game.artifacts?.length ?? 0); i++) {
    const artifact = game.artifacts![i];
    const artifactOrder = artifact.artifact_order ?? i + 1;
    
    if (seenArtifactOrders.has(artifactOrder)) {
      blockingErrors.push({
        row: i + 1,
        column: `artifacts[${i}].artifact_order`,
        message: `Duplicate artifact_order=${artifactOrder} detected. Each artifact must have unique order.`,
        severity: 'error',
        code: 'DUPLICATE_ARTIFACT_ORDER',
      });
    } else {
      seenArtifactOrders.add(artifactOrder);
      artifactIdByOrder.set(artifactOrder, generateUUID());
    }
  }

  // =========================================================================
  // 4. Check for duplicate role_order
  // =========================================================================
  const seenRoleOrders = new Set<number>();
  for (let i = 0; i < (game.roles?.length ?? 0); i++) {
    const role = game.roles![i];
    const roleOrder = role.role_order ?? i + 1;
    
    if (seenRoleOrders.has(roleOrder)) {
      blockingErrors.push({
        row: i + 1,
        column: `roles[${i}].role_order`,
        message: `Duplicate role_order=${roleOrder} detected. Each role must have unique order.`,
        severity: 'error',
        code: 'DUPLICATE_ROLE_ORDER',
      });
    } else {
      seenRoleOrders.add(roleOrder);
      const id = generateUUID();
      roleIdByOrder.set(roleOrder, id);
      if (role.name) {
        roleIdByName.set(role.name.toLowerCase(), id);
      }
    }
  }

  // =========================================================================
  // 5. Validate and resolve step→phase references
  // =========================================================================
  // UUID regex for validation
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Map to store resolved phase_id for each step
  const resolvedStepPhaseIds = new Map<number, string | null>();
  
  for (let i = 0; i < (game.steps?.length ?? 0); i++) {
    const step = game.steps![i];
    const stepOrder = step.step_order ?? i + 1;
    
    const hasPhaseId = step.phase_id !== undefined && step.phase_id !== null;
    const hasPhaseOrder = step.phase_order !== undefined && step.phase_order !== null;
    
    // Check: both phase_id and phase_order present → blocking error
    if (hasPhaseId && hasPhaseOrder) {
      blockingErrors.push({
        row: i + 1,
        column: `steps[${i}]`,
        message: `Step ${stepOrder} has both phase_id and phase_order. Only one may be specified.`,
        severity: 'error',
        code: 'STEP_PHASE_REF_BOTH_PRESENT',
      });
      continue;
    }
    
    // Validate phase_id if provided
    if (hasPhaseId) {
      if (!UUID_REGEX.test(step.phase_id!)) {
        blockingErrors.push({
          row: i + 1,
          column: `steps[${i}].phase_id`,
          message: `Step ${stepOrder} has invalid phase_id "${step.phase_id}". Must be a valid UUID.`,
          severity: 'error',
          code: 'STEP_PHASE_ID_INVALID',
        });
      } else {
        resolvedStepPhaseIds.set(stepOrder, step.phase_id!);
      }
      continue;
    }
    
    // Resolve phase_order to phase_id if provided
    if (hasPhaseOrder) {
      const phaseOrder = step.phase_order!;
      
      // Validate phase_order is a positive number
      if (typeof phaseOrder !== 'number' || phaseOrder < 1 || !Number.isInteger(phaseOrder)) {
        blockingErrors.push({
          row: i + 1,
          column: `steps[${i}].phase_order`,
          message: `Step ${stepOrder} has invalid phase_order "${phaseOrder}". Must be a positive integer.`,
          severity: 'error',
          code: 'STEP_PHASE_ORDER_INVALID',
        });
        continue;
      }
      
      // Check if phase_order exists in the phases array
      const phaseId = phaseIdByOrder.get(phaseOrder);
      if (!phaseId) {
        blockingErrors.push({
          row: i + 1,
          column: `steps[${i}].phase_order`,
          message: `Step ${stepOrder} references phase_order=${phaseOrder} which does not exist. Available phase orders: ${Array.from(phaseIdByOrder.keys()).sort((a, b) => a - b).join(', ') || 'none'}.`,
          severity: 'error',
          code: 'STEP_PHASE_ORDER_NOT_FOUND',
        });
        continue;
      }
      
      // Successfully resolved
      resolvedStepPhaseIds.set(stepOrder, phaseId);
      continue;
    }
    
    // Neither phase_id nor phase_order provided - step belongs to no phase (allowed)
    resolvedStepPhaseIds.set(stepOrder, null);
  }

  // =========================================================================
  // 6. Normalize and validate triggers (SERVER-SIDE CANONICALIZATION)
  // =========================================================================
  let triggerResult: TriggerNormalizationResult = {
    triggers: [],
    failedIndexes: [],
    errors: [],
  };
  
  if (game.triggers && game.triggers.length > 0) {
    triggerResult = normalizeAndValidateGameTriggers(
      game.triggers,
      game.game_key
    );

    // Convert trigger errors to ImportError format
    if (hasBlockingTriggerErrors(triggerResult)) {
      for (const err of triggerResult.errors) {
        blockingErrors.push({
          row: err.index + 1,
          column: `triggers[${err.index}].${err.field}`,
          message: err.message,
          severity: 'error',
          code: err.code,  // Propagate machine-readable error code
        });
      }
    }
  }

  // =========================================================================
  // 7. Create normalized game with canonicalized triggers and resolved phase_ids
  // =========================================================================
  // Normalize steps to have phase_id instead of phase_order
  const normalizedSteps = game.steps?.map((step, i) => {
    const stepOrder = step.step_order ?? i + 1;
    const resolvedPhaseId = resolvedStepPhaseIds.get(stepOrder);
    
    // Create normalized step with only phase_id (remove phase_order)
    const { phase_order: _removed, ...stepWithoutPhaseOrder } = step;
    return {
      ...stepWithoutPhaseOrder,
      phase_id: resolvedPhaseId ?? null,
    };
  });

  const normalizedGame: ParsedGame = {
    ...game,
    steps: normalizedSteps ?? game.steps,
    triggers: triggerResult.triggers.length > 0 ? triggerResult.triggers : undefined,
  };

  return {
    ok: blockingErrors.length === 0,
    blockingErrors,
    warnings,
    normalizedGame,
    precomputed: {
      stepIdByOrder,
      phaseIdByOrder,
      artifactIdByOrder,
      roleIdByOrder,
      roleIdByName,
      normalizedTriggers: triggerResult.triggers,
      stepPhaseIdByOrder: resolvedStepPhaseIds,
    },
  };
}
