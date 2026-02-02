/**
 * Trigger Reference Rewriting for Game Import
 * 
 * Resolves source IDs (order aliases or temp IDs) to DB UUIDs.
 * Returns validation errors for missing refs or unknown types.
 * 
 * Policy: All refs must be resolvable - no dangling refs allowed.
 * 
 * SPRINT 3: Uses TRIGGER_CONDITION_TYPES and TRIGGER_ACTION_TYPES from
 * lib/domain/enums.ts - no local hardcoded lists.
 * @see docs/builder/SPRINT3_CONSOLIDATION_PLAN.md
 */

import type { ImportError } from '@/types/csv-import';
import { 
  TRIGGER_CONDITION_TYPES, 
  TRIGGER_ACTION_TYPES 
} from '@/lib/domain/enums';

// =============================================================================
// Types
// =============================================================================

/**
 * ID mapping per entity type.
 * Key: sourceRef (order number, temp ID, or existing UUID)
 * Value: resolvedId (DB UUID)
 */
export interface TriggerIdMap {
  /** order → UUID for steps */
  stepIdByOrder: Map<number, string>;
  /** order → UUID for phases */
  phaseIdByOrder: Map<number, string>;
  /** order → UUID for artifacts */
  artifactIdByOrder: Map<number, string>;
  /** sourceId → UUID for artifacts (when using string refs) */
  artifactIdBySourceId?: Map<string, string>;
  /** sourceId → UUID for steps (when using string refs) */
  stepIdBySourceId?: Map<string, string>;
  /** sourceId → UUID for phases (when using string refs) */
  phaseIdBySourceId?: Map<string, string>;
  /** Set of all UUIDs created in this import batch (for cross-ref validation) */
  importBatchUuids?: Set<string>;
}

export interface TriggerRewriteResult {
  /** Rewritten trigger with resolved IDs */
  trigger: TriggerPayload;
  /** Validation errors (missing refs, unknown types) */
  errors: ImportError[];
  /** Warnings (e.g., UUID not in import batch but accepted) */
  warnings: ImportError[];
}

export interface TriggerPayload {
  name: string;
  description?: string | null;
  enabled?: boolean;
  condition: Record<string, unknown>;
  actions: Record<string, unknown>[];
  execute_once?: boolean;
  delay_seconds?: number;
  sort_order?: number;
}

// =============================================================================
// Known condition and action types (from lib/domain/enums.ts)
// SPRINT 3: Single source of truth - imported from enums, not hardcoded
// =============================================================================

// Cast to Set<string> since we use .has() with unknown string values
const KNOWN_CONDITION_TYPES: Set<string> = new Set(TRIGGER_CONDITION_TYPES);
const KNOWN_ACTION_TYPES: Set<string> = new Set(TRIGGER_ACTION_TYPES);

// =============================================================================
// Ref field mappings by condition/action type
// =============================================================================

/**
 * Maps condition type → ref field → { entityType, canonicalField }
 * canonicalField is the field name to use when the ref is resolved
 */
type RefFieldConfig = { entityType: 'step' | 'phase' | 'artifact'; canonicalField: string };

const CONDITION_REF_FIELDS: Record<string, Record<string, RefFieldConfig>> = {
  step_started: { 
    stepId: { entityType: 'step', canonicalField: 'stepId' }, 
    stepOrder: { entityType: 'step', canonicalField: 'stepId' },
  },
  step_completed: { 
    stepId: { entityType: 'step', canonicalField: 'stepId' }, 
    stepOrder: { entityType: 'step', canonicalField: 'stepId' },
  },
  phase_started: { 
    phaseId: { entityType: 'phase', canonicalField: 'phaseId' }, 
    phaseOrder: { entityType: 'phase', canonicalField: 'phaseId' },
  },
  phase_completed: { 
    phaseId: { entityType: 'phase', canonicalField: 'phaseId' }, 
    phaseOrder: { entityType: 'phase', canonicalField: 'phaseId' },
  },
  artifact_unlocked: { 
    artifactId: { entityType: 'artifact', canonicalField: 'artifactId' }, 
    artifactOrder: { entityType: 'artifact', canonicalField: 'artifactId' },
  },
  keypad_correct: { 
    keypadId: { entityType: 'artifact', canonicalField: 'keypadId' }, 
    artifactOrder: { entityType: 'artifact', canonicalField: 'keypadId' },
  },
  keypad_failed: { 
    keypadId: { entityType: 'artifact', canonicalField: 'keypadId' }, 
    artifactOrder: { entityType: 'artifact', canonicalField: 'keypadId' },
  },
  riddle_correct: { riddleId: { entityType: 'artifact', canonicalField: 'riddleId' } },
  audio_acknowledged: { audioId: { entityType: 'artifact', canonicalField: 'audioId' } },
  multi_answer_complete: { multiAnswerId: { entityType: 'artifact', canonicalField: 'multiAnswerId' } },
  scan_verified: { scanGateId: { entityType: 'artifact', canonicalField: 'scanGateId' } },
  hotspot_found: { hotspotHuntId: { entityType: 'artifact', canonicalField: 'hotspotHuntId' } },
  hotspot_hunt_complete: { hotspotHuntId: { entityType: 'artifact', canonicalField: 'hotspotHuntId' } },
  tile_puzzle_complete: { tilePuzzleId: { entityType: 'artifact', canonicalField: 'tilePuzzleId' } },
  cipher_decoded: { cipherId: { entityType: 'artifact', canonicalField: 'cipherId' } },
  prop_confirmed: { propId: { entityType: 'artifact', canonicalField: 'propId' } },
  prop_rejected: { propId: { entityType: 'artifact', canonicalField: 'propId' } },
  location_verified: { locationId: { entityType: 'artifact', canonicalField: 'locationId' } },
  logic_grid_solved: { gridId: { entityType: 'artifact', canonicalField: 'gridId' } },
  sound_level_triggered: { soundMeterId: { entityType: 'artifact', canonicalField: 'soundMeterId' } },
  time_bank_expired: { timeBankId: { entityType: 'artifact', canonicalField: 'timeBankId' } },
  signal_generator_triggered: { signalGeneratorId: { entityType: 'artifact', canonicalField: 'signalGeneratorId' } },
};

/**
 * Maps action type → ref field → { entityType, canonicalField }
 */
const ACTION_REF_FIELDS: Record<string, Record<string, RefFieldConfig>> = {
  reveal_artifact: { 
    artifactId: { entityType: 'artifact', canonicalField: 'artifactId' }, 
    artifactOrder: { entityType: 'artifact', canonicalField: 'artifactId' },
  },
  hide_artifact: { 
    artifactId: { entityType: 'artifact', canonicalField: 'artifactId' }, 
    artifactOrder: { entityType: 'artifact', canonicalField: 'artifactId' },
  },
  reset_keypad: { keypadId: { entityType: 'artifact', canonicalField: 'keypadId' } },
  reset_riddle: { riddleId: { entityType: 'artifact', canonicalField: 'riddleId' } },
  reset_scan_gate: { scanGateId: { entityType: 'artifact', canonicalField: 'scanGateId' } },
  reset_hotspot_hunt: { hotspotHuntId: { entityType: 'artifact', canonicalField: 'hotspotHuntId' } },
  reset_tile_puzzle: { tilePuzzleId: { entityType: 'artifact', canonicalField: 'tilePuzzleId' } },
  reset_cipher: { cipherId: { entityType: 'artifact', canonicalField: 'cipherId' } },
  reset_prop: { propId: { entityType: 'artifact', canonicalField: 'propId' } },
  reset_location: { locationId: { entityType: 'artifact', canonicalField: 'locationId' } },
  reset_logic_grid: { gridId: { entityType: 'artifact', canonicalField: 'gridId' } },
  reset_sound_meter: { soundMeterId: { entityType: 'artifact', canonicalField: 'soundMeterId' } },
  trigger_signal: { signalGeneratorId: { entityType: 'artifact', canonicalField: 'signalGeneratorId' } },
  time_bank_pause: { timeBankId: { entityType: 'artifact', canonicalField: 'timeBankId' } },
  show_leader_script: { stepId: { entityType: 'step', canonicalField: 'stepId' } },
};

// =============================================================================
// Helper functions
// =============================================================================

function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // Basic UUID v4 pattern
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function resolveRef(
  entityType: 'step' | 'phase' | 'artifact',
  sourceValue: unknown,
  idMap: TriggerIdMap,
  path: string,
): { resolvedId: string | null; error?: ImportError; warning?: ImportError } {
  // Handle order-based refs (number)
  if (typeof sourceValue === 'number') {
    let resolvedId: string | undefined;
    
    switch (entityType) {
      case 'step':
        resolvedId = idMap.stepIdByOrder.get(sourceValue);
        break;
      case 'phase':
        resolvedId = idMap.phaseIdByOrder.get(sourceValue);
        break;
      case 'artifact':
        resolvedId = idMap.artifactIdByOrder.get(sourceValue);
        break;
    }
    
    if (!resolvedId) {
      return {
        resolvedId: null,
        error: {
          row: 0,
          column: path,
          message: `Missing ${entityType} mapping for order ${sourceValue}`,
          severity: 'error',
        },
      };
    }
    
    return { resolvedId };
  }
  
  // Handle string refs (UUID or temp ID)
  if (typeof sourceValue === 'string' && sourceValue.length > 0) {
    // First, try sourceId maps
    let resolvedFromSource: string | undefined;
    switch (entityType) {
      case 'step':
        resolvedFromSource = idMap.stepIdBySourceId?.get(sourceValue);
        break;
      case 'phase':
        resolvedFromSource = idMap.phaseIdBySourceId?.get(sourceValue);
        break;
      case 'artifact':
        resolvedFromSource = idMap.artifactIdBySourceId?.get(sourceValue);
        break;
    }
    
    if (resolvedFromSource) {
      return { resolvedId: resolvedFromSource };
    }
    
    // If it's already a UUID, accept it with optional warning
    if (isUuid(sourceValue)) {
      // If we have a batch set, warn if UUID not in batch
      if (idMap.importBatchUuids && !idMap.importBatchUuids.has(sourceValue)) {
        return {
          resolvedId: sourceValue,
          warning: {
            row: 0,
            column: path,
            message: `UUID ${sourceValue} not in import batch - may reference external entity`,
            severity: 'warning',
          },
        };
      }
      return { resolvedId: sourceValue };
    }
    
    // String is not UUID and not in mapping - error
    return {
      resolvedId: null,
      error: {
        row: 0,
        column: path,
        message: `Missing ${entityType} mapping for source ID "${sourceValue}"`,
        severity: 'error',
      },
    };
  }
  
  // Value is null/undefined - no ref to resolve
  return { resolvedId: null };
}

// =============================================================================
// Main rewrite function
// =============================================================================

/**
 * Rewrites trigger references from source IDs to resolved DB UUIDs.
 * Returns errors for missing refs or unknown types.
 * 
 * @param trigger - The trigger payload to rewrite
 * @param idMap - ID mappings for steps, phases, artifacts
 * @param triggerIndex - Index of trigger in array (for error paths)
 */
export function rewriteTriggerRefs(
  trigger: TriggerPayload,
  idMap: TriggerIdMap,
  triggerIndex: number,
): TriggerRewriteResult {
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];
  
  // Deep clone to avoid mutation
  const rewritten: TriggerPayload = {
    ...trigger,
    condition: { ...trigger.condition },
    actions: trigger.actions.map(a => ({ ...a })),
  };
  
  const basePath = `triggers[${triggerIndex}]`;
  
  // =========================================================================
  // Validate and rewrite condition
  // =========================================================================
  const conditionType = rewritten.condition.type;
  
  if (typeof conditionType !== 'string') {
    errors.push({
      row: 0,
      column: `${basePath}.condition.type`,
      message: 'Condition missing type field',
      severity: 'error',
    });
  } else if (!KNOWN_CONDITION_TYPES.has(conditionType)) {
    errors.push({
      row: 0,
      column: `${basePath}.condition.type`,
      message: `Unknown condition type: "${conditionType}" (POLICY: unknown types are blocked)`,
      severity: 'error',
    });
  } else {
    // Rewrite ref fields for this condition type
    const refFields = CONDITION_REF_FIELDS[conditionType] ?? {};
    
    for (const [field, config] of Object.entries(refFields)) {
      const sourceValue = rewritten.condition[field];
      if (sourceValue === undefined || sourceValue === null) continue;
      
      const path = `${basePath}.condition.${field}`;
      const { resolvedId, error, warning } = resolveRef(config.entityType, sourceValue, idMap, path);
      
      if (error) errors.push(error);
      if (warning) warnings.push(warning);
      
      if (resolvedId !== null) {
        // Use the canonical field name from config
        rewritten.condition[config.canonicalField] = resolvedId;
        // Remove source field if different from canonical
        if (field !== config.canonicalField) {
          delete rewritten.condition[field];
        }
      }
    }
  }
  
  // =========================================================================
  // Validate and rewrite actions
  // =========================================================================
  for (let i = 0; i < rewritten.actions.length; i++) {
    const action = rewritten.actions[i];
    const actionType = action.type;
    const actionPath = `${basePath}.actions[${i}]`;
    
    if (typeof actionType !== 'string') {
      errors.push({
        row: 0,
        column: `${actionPath}.type`,
        message: 'Action missing type field',
        severity: 'error',
      });
      continue;
    }
    
    if (!KNOWN_ACTION_TYPES.has(actionType)) {
      errors.push({
        row: 0,
        column: `${actionPath}.type`,
        message: `Unknown action type: "${actionType}" (POLICY: unknown types are blocked)`,
        severity: 'error',
      });
      continue;
    }
    
    // Rewrite ref fields for this action type
    const refFields = ACTION_REF_FIELDS[actionType] ?? {};
    
    for (const [field, config] of Object.entries(refFields)) {
      const sourceValue = action[field];
      if (sourceValue === undefined || sourceValue === null) continue;
      
      const path = `${actionPath}.${field}`;
      const { resolvedId, error, warning } = resolveRef(config.entityType, sourceValue, idMap, path);
      
      if (error) errors.push(error);
      if (warning) warnings.push(warning);
      
      if (resolvedId !== null) {
        // Use the canonical field name from config
        action[config.canonicalField] = resolvedId;
        // Remove source field if different from canonical
        if (field !== config.canonicalField) {
          delete action[field];
        }
      }
    }
  }
  
  return { trigger: rewritten, errors, warnings };
}

/**
 * Rewrites all triggers for a game import.
 * Returns combined errors/warnings and rewritten triggers.
 */
export function rewriteAllTriggerRefs(
  triggers: TriggerPayload[],
  idMap: TriggerIdMap,
  gameKey: string,
): {
  triggers: TriggerPayload[];
  errors: ImportError[];
  warnings: ImportError[];
} {
  const allErrors: ImportError[] = [];
  const allWarnings: ImportError[] = [];
  const rewrittenTriggers: TriggerPayload[] = [];
  
  for (let i = 0; i < triggers.length; i++) {
    const { trigger, errors, warnings } = rewriteTriggerRefs(triggers[i], idMap, i);
    
    // Add game context to error messages
    allErrors.push(...errors.map(e => ({
      ...e,
      message: `[${gameKey}] ${e.message}`,
    })));
    allWarnings.push(...warnings.map(w => ({
      ...w,
      message: `[${gameKey}] ${w.message}`,
    })));
    
    rewrittenTriggers.push(trigger);
  }
  
  return {
    triggers: rewrittenTriggers,
    errors: allErrors,
    warnings: allWarnings,
  };
}
