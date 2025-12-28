/**
 * Trigger CSV Import/Export Utilities
 *
 * Provides round-trip CSV functionality for game triggers.
 * Allows exporting triggers to CSV for backup/editing and importing them back.
 */

import type { TriggerFormData } from '@/types/games';
import type { TriggerCondition, TriggerAction } from '@/types/trigger';

// =============================================================================
// CSV Column Definitions
// =============================================================================

const CSV_COLUMNS = [
  'name',
  'description',
  'enabled',
  'execute_once',
  'delay_seconds',
  'condition_type',
  'condition_target',
  'condition_extra',
  'actions_json',
] as const;

const CSV_HEADER = CSV_COLUMNS.join(',');

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Escape a value for CSV format
 */
function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Quote if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Extract condition target ID from a TriggerCondition
 */
function getConditionTarget(condition: TriggerCondition): string {
  if ('stepId' in condition && condition.stepId) return condition.stepId;
  if ('phaseId' in condition && condition.phaseId) return condition.phaseId;
  if ('keypadId' in condition && condition.keypadId) return condition.keypadId;
  if ('artifactId' in condition && condition.artifactId) return condition.artifactId;
  if ('timerId' in condition && condition.timerId) return condition.timerId;
  if ('decisionId' in condition && condition.decisionId) return condition.decisionId;
  return '';
}

/**
 * Extract extra condition data (channel, outcome, etc.)
 */
function getConditionExtra(condition: TriggerCondition): string {
  if (condition.type === 'signal_received' && 'channel' in condition) {
    return condition.channel ?? '';
  }
  if (condition.type === 'decision_resolved' && 'outcome' in condition) {
    return condition.outcome ?? '';
  }
  return '';
}

/**
 * Convert a single trigger to a CSV row
 */
function triggerToRow(trigger: TriggerFormData): string {
  const values = [
    escapeCSV(trigger.name),
    escapeCSV(trigger.description),
    escapeCSV(trigger.enabled),
    escapeCSV(trigger.execute_once),
    escapeCSV(trigger.delay_seconds),
    escapeCSV(trigger.condition.type),
    escapeCSV(getConditionTarget(trigger.condition)),
    escapeCSV(getConditionExtra(trigger.condition)),
    escapeCSV(JSON.stringify(trigger.actions)),
  ];
  return values.join(',');
}

/**
 * Export triggers to CSV format
 */
export function exportTriggersToCSV(triggers: TriggerFormData[]): string {
  const rows = [CSV_HEADER, ...triggers.map(triggerToRow)];
  return rows.join('\n');
}

/**
 * Download triggers as a CSV file
 */
export function downloadTriggersCSV(triggers: TriggerFormData[], filename = 'triggers.csv'): void {
  const csv = exportTriggersToCSV(triggers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// =============================================================================
// Import Functions
// =============================================================================

/**
 * Parse a CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  
  return result;
}

/**
 * Build a TriggerCondition from parsed CSV values
 */
function buildCondition(
  type: string,
  target: string,
  extra: string
): TriggerCondition {
  switch (type) {
    case 'manual':
      return { type: 'manual' };
    case 'step_started':
      return { type: 'step_started', stepId: target };
    case 'step_completed':
      return { type: 'step_completed', stepId: target };
    case 'phase_started':
      return { type: 'phase_started', phaseId: target };
    case 'phase_completed':
      return { type: 'phase_completed', phaseId: target };
    case 'artifact_unlocked':
      return { type: 'artifact_unlocked', artifactId: target };
    case 'keypad_correct':
      return { type: 'keypad_correct', keypadId: target };
    case 'keypad_failed':
      return { type: 'keypad_failed', keypadId: target };
    case 'timer_ended':
      return { type: 'timer_ended', timerId: target };
    case 'decision_resolved':
      return { type: 'decision_resolved', decisionId: target, outcome: extra || undefined };
    case 'signal_received':
      return { type: 'signal_received', channel: extra };
    default:
      return { type: 'manual' };
  }
}

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Parse a CSV row into a TriggerFormData
 */
function rowToTrigger(values: string[]): TriggerFormData {
  const [
    name,
    description,
    enabled,
    executeOnce,
    delaySeconds,
    conditionType,
    conditionTarget,
    conditionExtra,
    actionsJson,
  ] = values;

  let actions: TriggerAction[] = [];
  try {
    actions = actionsJson ? JSON.parse(actionsJson) : [];
  } catch {
    console.warn('Failed to parse actions JSON:', actionsJson);
  }

  return {
    id: makeId(),
    name: name || 'Importerad trigger',
    description: description || '',
    enabled: enabled.toLowerCase() !== 'false',
    execute_once: executeOnce.toLowerCase() !== 'false',
    delay_seconds: parseInt(delaySeconds) || 0,
    condition: buildCondition(conditionType, conditionTarget, conditionExtra),
    actions,
  };
}

export type ImportResult = {
  triggers: TriggerFormData[];
  errors: string[];
};

/**
 * Import triggers from CSV content
 */
export function importTriggersFromCSV(csv: string): ImportResult {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  const errors: string[] = [];
  const triggers: TriggerFormData[] = [];

  if (lines.length === 0) {
    errors.push('CSV-filen är tom');
    return { triggers, errors };
  }

  // Skip header row
  const header = parseCSVLine(lines[0]);
  const hasHeader = header[0] === 'name' || header[0] === 'Name';
  const startRow = hasHeader ? 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length < 5) {
        errors.push(`Rad ${i + 1}: För få kolumner (${values.length})`);
        continue;
      }
      triggers.push(rowToTrigger(values));
    } catch (err) {
      errors.push(`Rad ${i + 1}: ${err instanceof Error ? err.message : 'Parse error'}`);
    }
  }

  return { triggers, errors };
}

/**
 * Read a CSV file and import triggers
 */
export function importTriggersFromFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(importTriggersFromCSV(content));
    };
    reader.onerror = () => reject(new Error('Kunde inte läsa filen'));
    reader.readAsText(file);
  });
}
