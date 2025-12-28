/**
 * Game Builder types
 * Types for games, steps, materials, phases, roles, and board config
 */

// =============================================================================
// Enums / Literals
// =============================================================================

export type PlayMode = 'basic' | 'facilitated' | 'participants';
export type PhaseType = 'intro' | 'round' | 'finale' | 'break';
export type TimerStyle = 'countdown' | 'elapsed' | 'trafficlight';
export type AssignmentStrategy = 'random' | 'leader_picks' | 'player_picks';
export type BoardTheme = 'mystery' | 'party' | 'sport' | 'nature' | 'neutral';
export type BoardLayout = 'standard' | 'fullscreen';  // 'compact' removed for MVP

// =============================================================================
// Game Artifacts (author-time)
// =============================================================================

export type ArtifactVisibility = 'public' | 'leader_only' | 'role_private';

export type GameArtifactVariant = {
  id: string;
  artifact_id: string;
  title: string | null;
  body: string | null;
  media_ref: string | null;
  variant_order: number;
  visibility: ArtifactVisibility;
  visible_to_role_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type GameArtifact = {
  id: string;
  game_id: string;
  title: string;
  description: string | null;
  artifact_type: string;
  artifact_order: number;
  tags: string[];
  metadata: Record<string, unknown> | null;
  locale: string | null;
  variants?: GameArtifactVariant[];
  created_at?: string;
  updated_at?: string;
};

export type ArtifactFormData = {
  id: string;
  title: string;
  description: string;
  artifact_type: string;
  tags: string[];
  metadata?: Record<string, unknown> | null;
  variants: ArtifactVariantFormData[];
};

export type ArtifactVariantFormData = {
  id: string;
  title: string;
  body: string;
  media_ref: string;
  visibility: ArtifactVisibility;
  visible_to_role_id: string | null;
  step_index: number | null;
  phase_index: number | null;
  metadata?: Record<string, unknown> | null;
};

// =============================================================================
// Game Steps
// =============================================================================

export type GameStep = {
  id: string;
  game_id: string;
  locale: string | null;
  phase_id: string | null;
  step_order: number;
  title: string | null;
  body: string | null;
  duration_seconds: number | null;
  leader_script: string | null;
  participant_prompt: string | null;
  board_text: string | null;
  media_ref: string | null;
  optional: boolean;
  conditional: string | null;
  display_mode: 'instant' | 'typewriter' | 'dramatic' | null;
  created_at: string;
  updated_at: string;
};

export type StepFormData = {
  id?: string; // client-side ID for drag-and-drop
  title: string;
  body: string;
  duration_seconds: number | null;
  leader_script: string | null;
  phase_id?: string | null;
  display_mode?: 'instant' | 'typewriter' | 'dramatic';
};

// =============================================================================
// Game Materials
// =============================================================================

export type GameMaterials = {
  id: string;
  game_id: string;
  locale: string | null;
  items: string[];
  safety_notes: string | null;
  preparation: string | null;
  created_at: string;
  updated_at: string;
};

export type MaterialsFormData = {
  items: string[];
  safety_notes: string;
  preparation: string;
};

// =============================================================================
// Game Phases (P2a)
// =============================================================================

export type GamePhase = {
  id: string;
  game_id: string;
  locale: string | null;
  name: string;
  phase_type: PhaseType;
  phase_order: number;
  duration_seconds: number | null;
  timer_visible: boolean;
  timer_style: TimerStyle;
  description: string | null;
  board_message: string | null;
  auto_advance: boolean;
  created_at: string;
  updated_at: string;
};

export type PhaseFormData = {
  id?: string; // client-side ID for UI
  name: string;
  phase_type: PhaseType;
  phase_order: number;
  duration_seconds: number | null;
  timer_visible: boolean;
  timer_style: TimerStyle;
  description: string;
  board_message: string;
  auto_advance: boolean;
};

// =============================================================================
// Game Roles (P2b - reserved)
// =============================================================================

export type GameRole = {
  id: string;
  game_id: string;
  locale: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  role_order: number;
  public_description: string | null;
  private_instructions: string;
  private_hints: string | null;
  min_count: number;
  max_count: number | null;
  assignment_strategy: AssignmentStrategy;
  scaling_rules: Record<string, number> | null;
  conflicts_with: string[];
  created_at: string;
  updated_at: string;
};

export type RoleFormData = {
  id?: string;
  name: string;
  icon: string;
  color: string;
  role_order: number;
  public_description: string;
  private_instructions: string;
  private_hints: string;
  min_count: number;
  max_count: number | null;
  assignment_strategy: AssignmentStrategy;
  scaling_rules: Record<string, number> | null;
  conflicts_with: string[];
};

// =============================================================================
// Game Board Config (P2c)
// =============================================================================

export type GameBoardConfig = {
  id: string;
  game_id: string;
  locale: string | null;
  show_game_name: boolean;
  show_current_phase: boolean;
  show_timer: boolean;
  show_participants: boolean;
  show_public_roles: boolean;   // no-op if no roles defined
  show_leaderboard: boolean;    // stub until leaderboard model
  show_qr_code: boolean;        // links to /join/[code]
  welcome_message: string | null;
  // NOTE: custom_css removed for MVP (XSS risk)
  theme: BoardTheme;
  background_media_id: string | null;
  background_color: string | null;
  layout_variant: BoardLayout;
  created_at: string;
  updated_at: string;
};

export type BoardConfigFormData = {
  locale?: string | null;
  show_game_name: boolean;
  show_current_phase: boolean;
  show_timer: boolean;
  show_participants: boolean;
  show_public_roles: boolean;
  show_leaderboard: boolean;
  show_qr_code: boolean;
  welcome_message: string;
  theme: BoardTheme;
  background_media_id?: string | null;
  background_color: string;
  layout_variant: BoardLayout;
};

// =============================================================================
// Builder API Response
// =============================================================================

export type GameBuilderData = {
  game: {
    id: string;
    name: string;
    short_description: string | null;
    description: string | null;
    status: 'draft' | 'published';
    play_mode: PlayMode;
    main_purpose_id: string | null;
    product_id: string | null;
    energy_level: string | null;
    location_type: string | null;
    time_estimate_min: number | null;
    duration_max: number | null;
    min_players: number | null;
    max_players: number | null;
    age_min: number | null;
    age_max: number | null;
    difficulty: string | null;
    accessibility_notes: string | null;
    space_requirements: string | null;
    leader_tips: string | null;
  };
  steps: GameStep[];
  materials: GameMaterials | null;
  phases: GamePhase[];
  roles: GameRole[];
  boardConfig: GameBoardConfig | null;
  artifacts?: GameArtifact[];
  triggers?: GameTrigger[];
};

// =============================================================================
// Game Triggers (Declarative Automation)
// =============================================================================

import type { TriggerCondition, TriggerAction, TriggerStatus } from './trigger';

/** Trigger stored in game_triggers table */
export type GameTrigger = {
  id: string;
  game_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  condition: TriggerCondition;
  actions: TriggerAction[];
  execute_once: boolean;
  delay_seconds: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Form data for creating/editing triggers */
export type TriggerFormData = {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: TriggerCondition;
  actions: TriggerAction[];
  execute_once: boolean;
  delay_seconds: number;
};

/** Runtime trigger in session_triggers table */
export type SessionTrigger = GameTrigger & {
  session_id: string;
  source_trigger_id: string | null;
  status: TriggerStatus;
  fired_at: string | null;
  fired_count: number;
};

// =============================================================================
// Game Decisions (Templates for Polls/Votes)
// =============================================================================

/** Decision type determines display and behavior */
export type DecisionType = 'poll' | 'vote' | 'quiz' | 'rating' | 'ranking';

/** Option for a decision */
export type DecisionOption = {
  key: string;
  label: string;
  description?: string;
  media_ref?: string;
  correct?: boolean; // for quiz type
  order: number;
};

/** Decision template stored in game definition (JSONB in game_data or dedicated table) */
export type GameDecision = {
  id: string;
  title: string;
  prompt: string;
  decision_type: DecisionType;
  options: DecisionOption[];
  allow_anonymous: boolean;
  allow_multiple: boolean;
  max_choices: number;
  auto_close_seconds: number | null;
  reveal_on_close: boolean;
  step_index: number | null; // when to show (optional)
  phase_index: number | null;
  sort_order: number;
  metadata?: Record<string, unknown> | null;
};

/** Form data for creating/editing decisions */
export type DecisionFormData = {
  id?: string;
  title: string;
  prompt: string;
  decision_type: DecisionType;
  options: DecisionOption[];
  allow_anonymous: boolean;
  allow_multiple: boolean;
  max_choices: number;
  auto_close_seconds: number | null;
  reveal_on_close: boolean;
  step_index: number | null;
  phase_index: number | null;
};
