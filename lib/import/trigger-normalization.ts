/**
 * Server-side trigger normalization and validation
 * 
 * This module provides the SINGLE SOURCE OF TRUTH for trigger format handling.
 * It normalizes legacy trigger formats and validates all triggers BEFORE any DB writes.
 * 
 * IMPORTANT: This module is used by the server route, NOT the UI parser.
 * The UI parser can also normalize for preview UX, but this is the authoritative layer.
 */

import type { ParsedTrigger, ParsedTriggerAction, ParsedTriggerCondition, ImportErrorCode } from '@/types/csv-import';

// =============================================================================
// Types
// =============================================================================

export interface TriggerNormalizationResult {
  /** Successfully normalized triggers */
  triggers: ParsedTrigger[];
  /** Indexes of triggers that could not be normalized (blocking errors) */
  failedIndexes: number[];
  /** Detailed error messages for failed triggers */
  errors: TriggerValidationError[];
}

export interface TriggerValidationError {
  index: number;
  field: string;
  message: string;
  /** Machine-readable error code */
  code: ImportErrorCode;
}

// =============================================================================
// Internal helpers
// =============================================================================

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getBoolean(value: unknown, defaultValue: boolean): boolean {
  return typeof value === 'boolean' ? value : defaultValue;
}

// =============================================================================
// Normalization
// =============================================================================

/**
 * Normalize a single trigger from legacy or mixed format to canonical format.
 * 
 * Legacy format (from "vibe JSON"):
 *   { condition_type: "keypad_correct", condition_config: { artifactOrder: 2 }, actions: [...] }
 * 
 * Canonical format (what the system expects):
 *   { condition: { type: "keypad_correct", artifactOrder: 2 }, actions: [...] }
 * 
 * @returns Normalized trigger, or null if the trigger is fundamentally broken
 */
export function normalizeLegacyTrigger(raw: unknown): ParsedTrigger | null {
  if (!isJsonRecord(raw)) return null;

  const trigger = raw as JsonRecord;

  // Case 1: Already has canonical condition format
  if (isJsonRecord(trigger.condition) && typeof (trigger.condition as JsonRecord).type === 'string') {
    return {
      name: getString(trigger.name) ?? 'Unnamed trigger',
      description: getString(trigger.description) ?? undefined,
      enabled: getBoolean(trigger.enabled, true),
      condition: trigger.condition as ParsedTriggerCondition,
      actions: normalizeActions(trigger.actions),
      execute_once: getBoolean(trigger.execute_once, false),
      delay_seconds: getNumber(trigger.delay_seconds) ?? 0,
      sort_order: getNumber(trigger.sort_order) ?? 0,
    };
  }

  // Case 2: Legacy format with condition_type + condition_config
  const conditionType = getString(trigger.condition_type);
  if (!conditionType) {
    // Cannot normalize - no condition type available
    return null;
  }

  // Build canonical condition from legacy fields
  const conditionConfig = isJsonRecord(trigger.condition_config)
    ? (trigger.condition_config as JsonRecord)
    : {};

  const canonicalCondition = {
    type: conditionType,
    ...conditionConfig,
  } as ParsedTriggerCondition;

  return {
    name: getString(trigger.name) ?? 'Unnamed trigger',
    description: getString(trigger.description) ?? undefined,
    enabled: getBoolean(trigger.enabled, true),
    condition: canonicalCondition,
    actions: normalizeActions(trigger.actions),
    execute_once: getBoolean(trigger.execute_once, false),
    delay_seconds: getNumber(trigger.delay_seconds) ?? 0,
    sort_order: getNumber(trigger.sort_order) ?? 0,
  };
}

/**
 * Normalize actions array.
 * Actions should already use camelCase (artifactOrder, stepOrder, phaseOrder).
 */
function normalizeActions(rawActions: unknown): ParsedTriggerAction[] {
  if (!Array.isArray(rawActions)) return [];

  return rawActions
    .filter(isJsonRecord)
    .map((action) => action as ParsedTriggerAction);
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a normalized trigger has all required fields.
 * This catches issues that normalization can't fix (e.g., invalid condition type).
 */
export function validateTrigger(trigger: ParsedTrigger, index: number): TriggerValidationError[] {
  const errors: TriggerValidationError[] = [];

  // Condition must have type
  if (!trigger.condition || typeof trigger.condition.type !== 'string') {
    errors.push({
      index,
      field: 'condition.type',
      message: `Trigger "${trigger.name}" is missing required field: condition.type`,
      code: 'TRIGGER_MISSING_CONDITION_TYPE',
    });
  }

  // Actions must be an array
  if (!Array.isArray(trigger.actions)) {
    errors.push({
      index,
      field: 'actions',
      message: `Trigger "${trigger.name}" has invalid actions (expected array)`,
      code: 'TRIGGER_INVALID_FORMAT',
    });
  }

  // Each action must have a type
  if (Array.isArray(trigger.actions)) {
    for (let i = 0; i < trigger.actions.length; i++) {
      const action = trigger.actions[i];
      if (!action || typeof action.type !== 'string') {
        errors.push({
          index,
          field: `actions[${i}].type`,
          message: `Trigger "${trigger.name}" action ${i} is missing required field: type`,
          code: 'TRIGGER_ACTION_INVALID',
        });
      }
    }
  }

  return errors;
}

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Normalize and validate all triggers for a game.
 * 
 * This is the SINGLE entry point for server-side trigger processing.
 * It ensures all triggers are in canonical format and valid BEFORE any DB writes.
 * 
 * @param rawTriggers - Array of triggers in any format (legacy or canonical)
 * @param gameKey - Game key for logging purposes
 * @returns Normalized triggers and any errors (blocking if errors.length > 0)
 */
export function normalizeAndValidateGameTriggers(
  rawTriggers: unknown[],
  gameKey: string
): TriggerNormalizationResult {
  const triggers: ParsedTrigger[] = [];
  const failedIndexes: number[] = [];
  const errors: TriggerValidationError[] = [];

  for (let i = 0; i < rawTriggers.length; i++) {
    const raw = rawTriggers[i];
    const normalized = normalizeLegacyTrigger(raw);

    if (!normalized) {
      // Could not normalize - this is a blocking error
      failedIndexes.push(i);
      errors.push({
        index: i,
        field: 'condition',
        message: `Trigger at index ${i} could not be normalized: missing both 'condition.type' and 'condition_type'`,
        code: 'TRIGGER_NORMALIZATION_FAILED',
      });
      continue;
    }

    // Validate the normalized trigger
    const validationErrors = validateTrigger(normalized, i);
    if (validationErrors.length > 0) {
      failedIndexes.push(i);
      errors.push(...validationErrors);
      continue;
    }

    triggers.push(normalized);
  }

  // Log result
  if (errors.length > 0) {
    console.log(
      `[trigger-normalization] game="${gameKey}" total=${rawTriggers.length} ` +
      `normalized=${triggers.length} failed=${failedIndexes.length} errors=${errors.length}`
    );
  }

  return { triggers, failedIndexes, errors };
}

/**
 * Check if triggers have any blocking errors that should prevent import.
 */
export function hasBlockingTriggerErrors(result: TriggerNormalizationResult): boolean {
  return result.errors.length > 0;
}
