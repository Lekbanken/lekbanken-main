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
  references: ['main_purpose_id', 'product_id', 'owner_tenant_id'],
  
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
