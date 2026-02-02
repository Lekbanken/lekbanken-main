/**
 * Enum Registry
 *
 * Single source of truth for all enums used in Game Builder.
 * Each enum specifies its source (db constraint or builder-defined)
 * and constraint name for verification.
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

// =============================================================================
// PLAY MODE
// =============================================================================

/**
 * Play modes for games.
 * Source: DB constraint `games_play_mode_check`
 */
export const PLAY_MODES = ['basic', 'facilitated', 'participants'] as const;
export type PlayMode = (typeof PLAY_MODES)[number];

export const PLAY_MODE_ENUM = {
  values: PLAY_MODES,
  source: 'db' as const,
  constraint: 'games_play_mode_check',
} as const;

// =============================================================================
// ENERGY LEVEL
// =============================================================================

/**
 * Energy levels for games.
 * Source: DB constraint `games_energy_level_check`
 */
export const ENERGY_LEVELS = ['low', 'medium', 'high'] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

export const ENERGY_LEVEL_ENUM = {
  values: ENERGY_LEVELS,
  source: 'db' as const,
  constraint: 'games_energy_level_check',
} as const;

// =============================================================================
// LOCATION TYPE
// =============================================================================

/**
 * Location types for games.
 * Source: DB constraint `games_location_type_check`
 */
export const LOCATION_TYPES = ['indoor', 'outdoor', 'both'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const LOCATION_TYPE_ENUM = {
  values: LOCATION_TYPES,
  source: 'db' as const,
  constraint: 'games_location_type_check',
} as const;

// =============================================================================
// PHASE TYPE
// =============================================================================

/**
 * Phase types for game phases.
 * Source: DB constraint `game_phases_phase_type_check`
 */
export const PHASE_TYPES = ['intro', 'round', 'finale', 'break'] as const;
export type PhaseType = (typeof PHASE_TYPES)[number];

export const PHASE_TYPE_ENUM = {
  values: PHASE_TYPES,
  source: 'db' as const,
  constraint: 'game_phases_phase_type_check',
} as const;

// =============================================================================
// TIMER STYLE
// =============================================================================

/**
 * Timer styles for phases.
 * Source: DB constraint `game_phases_timer_style_check`
 */
export const TIMER_STYLES = ['countdown', 'elapsed', 'trafficlight'] as const;
export type TimerStyle = (typeof TIMER_STYLES)[number];

export const TIMER_STYLE_ENUM = {
  values: TIMER_STYLES,
  source: 'db' as const,
  constraint: 'game_phases_timer_style_check',
} as const;

// =============================================================================
// ASSIGNMENT STRATEGY
// =============================================================================

/**
 * Role assignment strategies.
 * Source: DB constraint `game_roles_assignment_strategy_check`
 */
export const ASSIGNMENT_STRATEGIES = [
  'random',
  'leader_picks',
  'player_picks',
] as const;
export type AssignmentStrategy = (typeof ASSIGNMENT_STRATEGIES)[number];

export const ASSIGNMENT_STRATEGY_ENUM = {
  values: ASSIGNMENT_STRATEGIES,
  source: 'db' as const,
  constraint: 'game_roles_assignment_strategy_check',
} as const;

// =============================================================================
// ARTIFACT TYPE
// =============================================================================

/**
 * Artifact types for game artifacts.
 * Source: Builder-defined (no DB constraint, stored as text)
 */
export const ARTIFACT_TYPES = [
  // Basic content
  'card',
  'document',
  'image',
  // Toolbelt artifacts
  'conversation_cards_collection',
  // Code & Input puzzles
  'keypad',
  'riddle',
  'multi_answer',
  // Media & Interaction
  'audio',
  'hotspot',
  'tile_puzzle',
  // Cryptography & Logic
  'cipher',
  'logic_grid',
  // Special mechanics
  'counter',
  'qr_gate',
  'hint_container',
  'prop_confirmation',
  'location_check',
  'sound_level',
  'replay_marker',
  // Session Cockpit artifacts
  'signal_generator',
  'time_bank_step',
  'empty_artifact',
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_TYPE_ENUM = {
  values: ARTIFACT_TYPES,
  source: 'builder' as const,
  constraint: null, // No DB constraint, validated at builder level
} as const;

// =============================================================================
// ARTIFACT VISIBILITY
// =============================================================================

/**
 * Visibility modes for artifact variants.
 * Source: DB constraint `artifact_variants_visibility_check`
 */
export const ARTIFACT_VISIBILITIES = [
  'public',
  'leader_only',
  'role_private',
] as const;
export type ArtifactVisibility = (typeof ARTIFACT_VISIBILITIES)[number];

export const ARTIFACT_VISIBILITY_ENUM = {
  values: ARTIFACT_VISIBILITIES,
  source: 'db' as const,
  constraint: 'artifact_variants_visibility_check',
} as const;

// =============================================================================
// DISPLAY MODE
// =============================================================================

/**
 * Display modes for steps.
 * Source: DB constraint `game_steps_display_mode_check`
 */
export const DISPLAY_MODES = ['instant', 'typewriter', 'dramatic'] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

export const DISPLAY_MODE_ENUM = {
  values: DISPLAY_MODES,
  source: 'db' as const,
  constraint: 'game_steps_display_mode_check',
} as const;

// =============================================================================
// BOARD THEME
// =============================================================================

/**
 * Board themes.
 * Source: Builder-defined (stored as text in board_config JSONB)
 */
export const BOARD_THEMES = [
  'mystery',
  'party',
  'sport',
  'nature',
  'neutral',
] as const;
export type BoardTheme = (typeof BOARD_THEMES)[number];

export const BOARD_THEME_ENUM = {
  values: BOARD_THEMES,
  source: 'builder' as const,
  constraint: null,
} as const;

// =============================================================================
// BOARD LAYOUT
// =============================================================================

/**
 * Board layouts.
 * Source: Builder-defined (stored as text in board_config JSONB)
 */
export const BOARD_LAYOUTS = ['standard', 'fullscreen'] as const;
export type BoardLayout = (typeof BOARD_LAYOUTS)[number];

export const BOARD_LAYOUT_ENUM = {
  values: BOARD_LAYOUTS,
  source: 'builder' as const,
  constraint: null,
} as const;

// =============================================================================
// TRIGGER CONDITION TYPES
// =============================================================================

/**
 * Trigger condition types.
 * Source: Builder-defined (stored in triggers JSONB)
 * @see types/trigger.ts for full type definitions
 */
export const TRIGGER_CONDITION_TYPES = [
  // Core events
  'step_started',
  'step_completed',
  'phase_started',
  'phase_completed',
  'decision_resolved',
  'timer_ended',
  'artifact_unlocked',
  // Input puzzles
  'keypad_correct',
  'keypad_failed',
  'riddle_correct',
  // Manual & signals
  'manual',
  'signal_received',
  // Advanced mechanics
  'counter_reached',
  'audio_acknowledged',
  'multi_answer_complete',
  'scan_verified',
  'hint_requested',
  'hotspot_found',
  'hotspot_hunt_complete',
  'tile_puzzle_complete',
  'cipher_decoded',
  'prop_confirmed',
  'prop_rejected',
  'location_verified',
  'logic_grid_solved',
  'sound_level_triggered',
  'replay_marker_added',
  'time_bank_expired',
  'signal_generator_triggered',
] as const;
export type TriggerConditionType = (typeof TRIGGER_CONDITION_TYPES)[number];

export const TRIGGER_CONDITION_TYPE_ENUM = {
  values: TRIGGER_CONDITION_TYPES,
  source: 'builder' as const,
  constraint: null,
} as const;

// =============================================================================
// TRIGGER ACTION TYPES
// =============================================================================

/**
 * Trigger action types.
 * Source: Builder-defined (stored in triggers JSONB)
 * @see types/trigger.ts for full type definitions
 */
export const TRIGGER_ACTION_TYPES = [
  // Artifact control
  'reveal_artifact',
  'hide_artifact',
  // Decision control
  'unlock_decision',
  'lock_decision',
  // Navigation
  'advance_step',
  'advance_phase',
  // Timer & time bank
  'start_timer',
  'time_bank_apply_delta',
  'time_bank_pause',
  // Communication
  'send_message',
  'play_sound',
  'show_countdown',
  'send_signal',
  'send_hint',
  'show_leader_script',
  'trigger_signal',
  // Reset actions
  'reset_keypad',
  'reset_riddle',
  'reset_scan_gate',
  'reset_hotspot_hunt',
  'reset_tile_puzzle',
  'reset_cipher',
  'reset_prop',
  'reset_location',
  'reset_logic_grid',
  'reset_sound_meter',
  // Counter & markers
  'increment_counter',
  'reset_counter',
  'add_replay_marker',
] as const;
export type TriggerActionType = (typeof TRIGGER_ACTION_TYPES)[number];

export const TRIGGER_ACTION_TYPE_ENUM = {
  values: TRIGGER_ACTION_TYPES,
  source: 'builder' as const,
  constraint: null,
} as const;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a value is a valid enum value.
 */
export function isValidEnumValue<T extends readonly string[]>(
  value: unknown,
  enumValues: T
): value is T[number] {
  return typeof value === 'string' && enumValues.includes(value as T[number]);
}

/**
 * Get all enum registries for validation.
 */
export const ALL_ENUMS = {
  playMode: PLAY_MODE_ENUM,
  energyLevel: ENERGY_LEVEL_ENUM,
  locationType: LOCATION_TYPE_ENUM,
  phaseType: PHASE_TYPE_ENUM,
  timerStyle: TIMER_STYLE_ENUM,
  assignmentStrategy: ASSIGNMENT_STRATEGY_ENUM,
  artifactType: ARTIFACT_TYPE_ENUM,
  artifactVisibility: ARTIFACT_VISIBILITY_ENUM,
  displayMode: DISPLAY_MODE_ENUM,
  boardTheme: BOARD_THEME_ENUM,
  boardLayout: BOARD_LAYOUT_ENUM,
  triggerConditionType: TRIGGER_CONDITION_TYPE_ENUM,
  triggerActionType: TRIGGER_ACTION_TYPE_ENUM,
} as const;
