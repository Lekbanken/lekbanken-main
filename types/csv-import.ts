/**
 * CSV Import/Export Types for Game Builder
 * 
 * Types for importing and exporting games via CSV format.
 * Supports all three play modes: basic, facilitated, participants
 */

import type { PlayMode, PhaseType, TimerStyle, AssignmentStrategy, BoardTheme, BoardLayout } from './games';

// =============================================================================
// Import/Export Modes
// =============================================================================

export type ImportMode = 'create' | 'upsert';
export type ImportFormat = 'csv' | 'json';

// =============================================================================
// CSV Row Structure
// =============================================================================

/**
 * Represents a single row in the CSV import file.
 * All fields are strings from CSV parsing - validation happens after.
 */
export type CsvGameRow = {
  // Identity (required for upsert)
  game_key: string;
  
  // Core (required)
  name: string;
  short_description: string;
  play_mode: string;
  
  // Core (optional with defaults)
  description?: string;
  status?: string;
  locale?: string;
  
  // Metadata (optional)
  energy_level?: string;
  location_type?: string;
  time_estimate_min?: string;
  duration_max?: string;
  min_players?: string;
  max_players?: string;
  players_recommended?: string;
  age_min?: string;
  age_max?: string;
  difficulty?: string;
  accessibility_notes?: string;
  space_requirements?: string;
  leader_tips?: string;
  
  // References (optional)
  main_purpose_id?: string;
  /**
   * Secondary purposes.
   * Preferred: JSON array string in CSV cell, e.g. ["uuid1","uuid2"].
   */
  sub_purpose_ids?: string;
  /** Legacy: comma-separated UUIDs in a single cell */
  sub_purpose_id?: string;
  product_id?: string;
  owner_tenant_id?: string;
  
  // Step count for validation
  step_count?: string;
  
  // JSON columns for complex data
  materials_json?: string;
  phases_json?: string;
  roles_json?: string;
  board_config_json?: string;
  artifacts_json?: string;
  decisions_json?: string;
  outcomes_json?: string;
  
  // Inline steps (step_1_title, step_1_body, step_1_duration, etc.)
  // These are dynamic and handled separately
  [key: string]: string | undefined;
};

// =============================================================================
// Parsed Game Data (after CSV parsing, before DB insert)
// =============================================================================

export type ParsedStep = {
  step_order: number;
  title: string;
  body: string;
  duration_seconds: number | null;
  leader_script?: string | null;
  participant_prompt?: string | null;
  board_text?: string | null;
  optional?: boolean;
};

export type ParsedMaterials = {
  items: string[];
  safety_notes: string | null;
  preparation: string | null;
};

export type ParsedPhase = {
  phase_order: number;
  name: string;
  phase_type: PhaseType;
  duration_seconds: number | null;
  timer_visible: boolean;
  timer_style: TimerStyle;
  description: string | null;
  board_message: string | null;
  auto_advance: boolean;
};

export type ParsedRole = {
  role_order: number;
  name: string;
  icon: string | null;
  color: string | null;
  public_description: string | null;
  private_instructions: string;
  private_hints: string | null;
  min_count: number;
  max_count: number | null;
  assignment_strategy: AssignmentStrategy;
  scaling_rules: Record<string, number> | null;
  conflicts_with: string[];
};

export type ParsedBoardConfig = {
  show_game_name: boolean;
  show_current_phase: boolean;
  show_timer: boolean;
  show_participants: boolean;
  show_public_roles: boolean;
  show_leaderboard: boolean;
  show_qr_code: boolean;
  welcome_message: string | null;
  theme: BoardTheme;
  background_color: string | null;
  layout_variant: BoardLayout;
};

// =============================================================================
// Play primitives (author-time) via CSV
// =============================================================================

export type ParsedArtifactVisibility = 'public' | 'leader_only' | 'role_private';

export type ParsedArtifactVariant = {
  variant_order: number;
  visibility: ParsedArtifactVisibility;
  visible_to_role_id?: string | null;
  /** Optional aliases that can be resolved during import */
  visible_to_role_order?: number | null;
  visible_to_role_name?: string | null;
  title: string | null;
  body: string | null;
  media_ref?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ParsedArtifact = {
  artifact_order: number;
  locale: string | null;
  title: string;
  description: string | null;
  artifact_type: string;
  tags: string[];
  metadata?: Record<string, unknown> | null;
  variants: ParsedArtifactVariant[];
};

export type ParsedDecisionsPayload = unknown;
export type ParsedOutcomesPayload = unknown;

// =============================================================================
// Triggers (import format)
// =============================================================================

/**
 * Condition types for triggers.
 * When importing, use stepOrder/phaseOrder aliases which get resolved to IDs.
 */
export type ParsedTriggerCondition = 
  | { type: 'manual' }
  | { type: 'step_started'; stepId?: string; stepOrder?: number }
  | { type: 'step_completed'; stepId?: string; stepOrder?: number }
  | { type: 'phase_started'; phaseId?: string; phaseOrder?: number }
  | { type: 'phase_completed'; phaseId?: string; phaseOrder?: number }
  | { type: 'artifact_unlocked'; artifactId?: string; artifactOrder?: number }
  | { type: 'keypad_correct'; keypadId?: string; artifactOrder?: number }
  | { type: 'keypad_failed'; keypadId?: string; artifactOrder?: number }
  | { type: 'timer_ended'; timerId: string }
  | { type: 'decision_resolved'; decisionId: string; outcome?: string }
  | { type: 'signal_received'; channel?: string };

/**
 * Action types for triggers.
 * When importing, use artifactOrder aliases which get resolved to IDs.
 */
export type ParsedTriggerAction = 
  | { type: 'reveal_artifact'; artifactId?: string; artifactOrder?: number }
  | { type: 'hide_artifact'; artifactId?: string; artifactOrder?: number }
  | { type: 'unlock_decision'; decisionId: string }
  | { type: 'lock_decision'; decisionId: string }
  | { type: 'advance_step' }
  | { type: 'advance_phase' }
  | { type: 'start_timer'; duration: number; name: string }
  | { type: 'send_message'; message: string; style?: 'normal' | 'dramatic' | 'typewriter' }
  | { type: 'send_signal'; channel: string; message: string }
  | { type: 'time_bank_apply_delta'; deltaSeconds: number; reason: string; minBalanceSeconds?: number; maxBalanceSeconds?: number }
  | { type: 'play_sound'; soundId: string }
  | { type: 'show_countdown'; duration: number; message: string }
  | { type: 'reset_keypad'; keypadId: string };

export type ParsedTrigger = {
  name: string;
  description?: string | null;
  enabled?: boolean;
  condition: ParsedTriggerCondition;
  actions: ParsedTriggerAction[];
  execute_once?: boolean;
  delay_seconds?: number;
  sort_order?: number;
};

export type ParsedGame = {
  // Identity
  game_key: string;
  
  // Core
  name: string;
  short_description: string;
  description: string | null;
  play_mode: PlayMode;
  status: 'draft' | 'published';
  locale: string | null;
  
  // Metadata
  energy_level: 'low' | 'medium' | 'high' | null;
  location_type: 'indoor' | 'outdoor' | 'both' | null;
  time_estimate_min: number | null;
  duration_max: number | null;
  min_players: number | null;
  max_players: number | null;
  players_recommended: number | null;
  age_min: number | null;
  age_max: number | null;
  difficulty: string | null;
  accessibility_notes: string | null;
  space_requirements: string | null;
  leader_tips: string | null;
  
  // References
  main_purpose_id: string | null;
  sub_purpose_ids: string[];
  product_id: string | null;
  owner_tenant_id: string | null;
  
  // Related data
  steps: ParsedStep[];
  materials: ParsedMaterials | null;
  phases: ParsedPhase[];
  roles: ParsedRole[];
  boardConfig: ParsedBoardConfig | null;

  /** Optional play primitives provided by newer CSV generators */
  artifacts?: ParsedArtifact[];
  decisions?: ParsedDecisionsPayload;
  outcomes?: ParsedOutcomesPayload;
  
  /** Triggers (automation rules) */
  triggers?: ParsedTrigger[];
};

// =============================================================================
// Import Errors & Warnings
// =============================================================================

export type ImportErrorSeverity = 'error' | 'warning';

export type ImportError = {
  row: number;
  column?: string;
  message: string;
  severity: ImportErrorSeverity;
};

// =============================================================================
// Import Options & Results
// =============================================================================

export type ImportOptions = {
  mode: ImportMode;
  validateOnly: boolean;
  defaultStatus: 'draft' | 'published';
  defaultTenantId?: string;
  defaultPurposeId?: string;
  defaultLocale?: string;
};

export type GamePreview = {
  row: number;
  game_key: string;
  name: string;
  playMode: PlayMode;
  stepsCount: number;
  phasesCount: number;
  rolesCount: number;
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
};

export type ImportStats = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
};

export type ImportResult = {
  success: boolean;
  stats: ImportStats;
  errors: ImportError[];
  warnings: ImportError[];
  preview?: GamePreview[];
};

/**
 * Result from dry-run validation (UI-friendly format)
 */
export type DryRunResult = {
  valid: boolean;
  total_rows: number;
  valid_count: number;
  warning_count: number;
  error_count: number;
  errors: ImportError[];
  warnings: ImportError[];
  games: DryRunGamePreview[];
};

export type DryRunGamePreview = {
  row_number: number;
  game_key: string | null;
  name: string;
  play_mode: PlayMode;
  status: 'draft' | 'published';
  steps?: ParsedStep[];
};

// =============================================================================
// Export Types
// =============================================================================

export type ExportOptions = {
  format: 'csv' | 'json';
  includeSteps: boolean;
  includeMaterials: boolean;
  includePhases: boolean;
  includeRoles: boolean;
  includeBoardConfig: boolean;
};

export type ExportableGame = {
  id: string;
  game_key: string;
  name: string;
  short_description: string;
  description: string | null;
  play_mode: PlayMode;
  status: 'draft' | 'published';
  locale: string | null;
  
  // Metadata
  energy_level: 'low' | 'medium' | 'high' | null;
  location_type: 'indoor' | 'outdoor' | 'both' | null;
  time_estimate_min: number | null;
  duration_max: number | null;
  min_players: number | null;
  max_players: number | null;
  players_recommended: number | null;
  age_min: number | null;
  age_max: number | null;
  difficulty: string | null;
  accessibility_notes: string | null;
  space_requirements: string | null;
  leader_tips: string | null;
  
  // References (for export info only)
  main_purpose_id: string | null;
  sub_purpose_ids: string[];
  product_id: string | null;
  owner_tenant_id: string | null;
  cover_media_url?: string | null; // Read-only for export
  
  // Related data
  steps: ParsedStep[];
  materials: ParsedMaterials | null;
  phases: ParsedPhase[];
  roles: ParsedRole[];
  boardConfig: ParsedBoardConfig | null;
};

// =============================================================================
// Constants
// =============================================================================

export const MAX_INLINE_STEPS = 20;
export const MAX_JSON_LENGTH = 10000;
export const MAX_TEXT_LENGTH = 10000;

export const CSV_COLUMNS = {
  // Identity & Core
  identity: ['game_key', 'name', 'short_description', 'description', 'play_mode', 'status', 'locale'],
  
  // Metadata
  metadata: [
    'energy_level', 'location_type', 'time_estimate_min', 'duration_max',
    'min_players', 'max_players', 'players_recommended',
    'age_min', 'age_max', 'difficulty',
    'accessibility_notes', 'space_requirements', 'leader_tips'
  ],
  
  // References
  references: ['main_purpose_id', 'sub_purpose_ids', 'product_id', 'owner_tenant_id'],
  
  // Validation
  validation: ['step_count'],
  
  // JSON columns
  json: ['materials_json', 'phases_json', 'roles_json', 'board_config_json'],
} as const;

// Generate step column names
export function getStepColumns(maxSteps: number = MAX_INLINE_STEPS): string[] {
  const columns: string[] = [];
  for (let i = 1; i <= maxSteps; i++) {
    columns.push(`step_${i}_title`, `step_${i}_body`, `step_${i}_duration`);
  }
  return columns;
}

// All CSV columns in order
export function getAllCsvColumns(): string[] {
  return [
    ...CSV_COLUMNS.identity,
    ...CSV_COLUMNS.metadata,
    ...CSV_COLUMNS.references,
    ...CSV_COLUMNS.validation,
    ...CSV_COLUMNS.json,
    ...getStepColumns(),
  ];
}
