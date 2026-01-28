/**
 * Game Builder State Types
 *
 * Centralized state management for the game builder with history support
 * for undo/redo functionality.
 */

import type { ArtifactFormData, TriggerFormData, PhaseType, TimerStyle, AssignmentStrategy, BoardTheme, BoardLayout } from './games';
import type { ToolKey, ToolScope } from '@/features/tools/types';

// Re-export PlayMode from games.ts
export type { PlayMode } from './games';

// ============================================================================
// Core Types (re-exported/unified here for clarity)
// ============================================================================

export interface CoreForm {
  name: string;
  short_description: string;
  description: string;
  status: 'draft' | 'published';
  play_mode: 'basic' | 'facilitated' | 'participants';
  main_purpose_id: string;
  product_id: string | null;
  taxonomy_category: string;
  energy_level: string | null;
  location_type: string | null;
  time_estimate_min: number | null;
  duration_max: number | null;
  min_players: number | null;
  max_players: number | null;
  age_min: number | null;
  age_max: number | null;
  difficulty: string | null;
  accessibility_notes: string;
  space_requirements: string;
  leader_tips: string;
  is_demo_content: boolean;
}

export interface MaterialsForm {
  items: string[];
  safety_notes: string;
  preparation: string;
}

export interface StepData {
  id: string;
  title: string;
  body: string;
  duration_seconds: number | null;
  leader_script?: string;
  media_ref?: string;
  display_mode?: 'instant' | 'typewriter' | 'dramatic';
  phase_id?: string | null;
}

export interface PhaseData {
  id: string;
  name: string;
  phase_type: PhaseType;
  phase_order: number;
  duration_seconds: number | null;
  timer_visible: boolean;
  timer_style: TimerStyle;
  description: string;
  board_message: string;
  auto_advance: boolean;
}

export interface RoleData {
  id: string;
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
  scaling_rules: Record<string, unknown> | null;
  conflicts_with: string[] | null;
}

export interface BoardConfigData {
  show_game_name: boolean;
  show_current_phase: boolean;
  show_timer: boolean;
  show_participants: boolean;
  show_public_roles: boolean;
  show_leaderboard: boolean;
  show_qr_code: boolean;
  welcome_message: string;
  theme: BoardTheme;
  background_color: string;
  layout_variant: BoardLayout;
}

export interface GameToolForm {
  tool_key: ToolKey;
  enabled: boolean;
  scope: ToolScope;
}

export interface CoverMedia {
  mediaId: string | null;
  url: string | null;
}

// ============================================================================
// Builder State
// ============================================================================

export interface GameBuilderState {
  core: CoreForm;
  steps: StepData[];
  materials: MaterialsForm;
  phases: PhaseData[];
  roles: RoleData[];
  artifacts: ArtifactFormData[];
  triggers: TriggerFormData[];
  boardConfig: BoardConfigData;
  gameTools: GameToolForm[];
  subPurposeIds: string[];
  cover: CoverMedia;
}

// ============================================================================
// History Management
// ============================================================================

export interface BuilderHistory {
  past: GameBuilderState[];
  present: GameBuilderState;
  future: GameBuilderState[];
}

/** Maximum number of history states to keep */
export const MAX_HISTORY_SIZE = 50;

// ============================================================================
// Actions
// ============================================================================

/** Actions that should commit to history immediately (structural changes) */
export type CommittingAction =
  // Steps
  | { type: 'ADD_STEP'; payload: StepData }
  | { type: 'DELETE_STEP'; payload: { id: string } }
  | { type: 'REORDER_STEPS'; payload: { from: number; to: number } }
  // Phases
  | { type: 'ADD_PHASE'; payload: PhaseData }
  | { type: 'DELETE_PHASE'; payload: { id: string } }
  | { type: 'REORDER_PHASES'; payload: { from: number; to: number } }
  // Roles
  | { type: 'ADD_ROLE'; payload: RoleData }
  | { type: 'DELETE_ROLE'; payload: { id: string } }
  | { type: 'REORDER_ROLES'; payload: { from: number; to: number } }
  // Artifacts
  | { type: 'ADD_ARTIFACT'; payload: ArtifactFormData }
  | { type: 'DELETE_ARTIFACT'; payload: { id: string } }
  | { type: 'REORDER_ARTIFACTS'; payload: { from: number; to: number } }
  // Triggers
  | { type: 'ADD_TRIGGER'; payload: TriggerFormData }
  | { type: 'DELETE_TRIGGER'; payload: { id: string } }
  | { type: 'REORDER_TRIGGERS'; payload: { from: number; to: number } };

/** Actions that should NOT commit to history (non-structural, or debounced) */
export type NonCommittingAction =
  // Core updates (debounced separately)
  | { type: 'SET_CORE'; payload: Partial<CoreForm> }
  // Full updates to collections (for editing single items)
  | { type: 'UPDATE_STEP'; payload: { id: string; data: Partial<StepData> } }
  | { type: 'UPDATE_PHASE'; payload: { id: string; data: Partial<PhaseData> } }
  | { type: 'UPDATE_ROLE'; payload: { id: string; data: Partial<RoleData> } }
  | { type: 'UPDATE_ARTIFACT'; payload: { id: string; data: Partial<ArtifactFormData> } }
  | { type: 'UPDATE_TRIGGER'; payload: { id: string; data: Partial<TriggerFormData> } }
  // Bulk setters (from API load, from undo, etc.)
  | { type: 'SET_STEPS'; payload: StepData[] }
  | { type: 'SET_PHASES'; payload: PhaseData[] }
  | { type: 'SET_ROLES'; payload: RoleData[] }
  | { type: 'SET_ARTIFACTS'; payload: ArtifactFormData[] }
  | { type: 'SET_TRIGGERS'; payload: TriggerFormData[] }
  // Other state
  | { type: 'SET_MATERIALS'; payload: Partial<MaterialsForm> }
  | { type: 'SET_BOARD_CONFIG'; payload: Partial<BoardConfigData> }
  | { type: 'SET_GAME_TOOLS'; payload: GameToolForm[] }
  | { type: 'SET_SUB_PURPOSE_IDS'; payload: string[] }
  | { type: 'SET_COVER'; payload: CoverMedia };

/** History navigation */
export type HistoryAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'COMMIT_TO_HISTORY' } // Force a commit (e.g., after debounced text edits)
  | { type: 'LOAD_FROM_API'; payload: GameBuilderState }
  | { type: 'RESET' };

/** All possible builder actions */
export type BuilderAction = CommittingAction | NonCommittingAction | HistoryAction;

/** Check if action should commit to history */
export function isCommittingAction(action: BuilderAction): action is CommittingAction {
  const committingTypes = [
    'ADD_STEP',
    'DELETE_STEP',
    'REORDER_STEPS',
    'ADD_PHASE',
    'DELETE_PHASE',
    'REORDER_PHASES',
    'ADD_ROLE',
    'DELETE_ROLE',
    'REORDER_ROLES',
    'ADD_ARTIFACT',
    'DELETE_ARTIFACT',
    'REORDER_ARTIFACTS',
    'ADD_TRIGGER',
    'DELETE_TRIGGER',
    'REORDER_TRIGGERS',
  ];
  return committingTypes.includes(action.type);
}

// ============================================================================
// Defaults
// ============================================================================

export const defaultCore: CoreForm = {
  name: '',
  short_description: '',
  description: '',
  status: 'draft',
  play_mode: 'basic',
  main_purpose_id: '',
  product_id: null,
  taxonomy_category: '',
  energy_level: null,
  location_type: null,
  time_estimate_min: null,
  duration_max: null,
  min_players: null,
  max_players: null,
  age_min: null,
  age_max: null,
  difficulty: null,
  accessibility_notes: '',
  space_requirements: '',
  leader_tips: '',
  is_demo_content: false,
};

export const defaultMaterials: MaterialsForm = {
  items: [],
  safety_notes: '',
  preparation: '',
};

export const defaultBoardConfig: BoardConfigData = {
  show_game_name: true,
  show_current_phase: true,
  show_timer: true,
  show_participants: true,
  show_public_roles: true,
  show_leaderboard: false,
  show_qr_code: false,
  welcome_message: '',
  theme: 'neutral',
  background_color: '',
  layout_variant: 'standard',
};

export const defaultCover: CoverMedia = {
  mediaId: null,
  url: null,
};

export function createInitialState(): GameBuilderState {
  return {
    core: defaultCore,
    steps: [],
    materials: defaultMaterials,
    phases: [],
    roles: [],
    artifacts: [],
    triggers: [],
    boardConfig: defaultBoardConfig,
    gameTools: [],
    subPurposeIds: [],
    cover: defaultCover,
  };
}

export function createInitialHistory(): BuilderHistory {
  return {
    past: [],
    present: createInitialState(),
    future: [],
  };
}
