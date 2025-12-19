/**
 * Play Runtime Types
 * 
 * Types for the Legendary Play runtime system.
 * Covers session state, timer, roles, and events.
 */

// =============================================================================
// Timer State (event-driven)
// =============================================================================

export interface TimerState {
  /** When the timer was started (ISO string) */
  started_at: string;
  /** Total duration in seconds */
  duration_seconds: number;
  /** When paused (ISO string), null if running */
  paused_at: string | null;
}

export interface TimerDisplay {
  /** Remaining seconds (calculated client-side) */
  remaining: number;
  /** Is timer currently running? */
  isRunning: boolean;
  /** Is timer paused? */
  isPaused: boolean;
  /** Is timer finished (remaining <= 0)? */
  isFinished: boolean;
  /** Progress 0-1 */
  progress: number;
}

// =============================================================================
// Board State (runtime overrides)
// =============================================================================

export interface BoardState {
  /** Custom message to display on board */
  message?: string;
  /** Override individual board_config settings */
  overrides?: {
    show_timer?: boolean;
    show_participants?: boolean;
    show_qr_code?: boolean;
  };
}

// =============================================================================
// Session Runtime State
// =============================================================================

export interface SessionRuntimeState {
  /** Current step index (0-based) for basic mode */
  current_step_index: number;
  /** Current phase index (0-based) for facilitated/participants mode */
  current_phase_index: number;
  /** Timer state (event-driven) */
  timer_state: TimerState | null;
  /** Board runtime state */
  board_state: BoardState | null;
  /** Session status */
  status: 'active' | 'paused' | 'ended' | 'cancelled';
}

// =============================================================================
// Session Role (snapshot from game_roles)
// =============================================================================

export interface SessionRole {
  id: string;
  session_id: string;
  source_role_id: string | null;
  
  // Identity
  name: string;
  icon: string | null;
  color: string | null;
  role_order: number;
  
  // Content
  public_description: string | null;
  private_instructions: string;
  private_hints: string | null;
  
  // Assignment rules
  min_count: number;
  max_count: number | null;
  assignment_strategy: 'random' | 'leader_picks' | 'player_picks';
  
  // Scaling and conflicts
  scaling_rules: Record<string, number> | null;
  conflicts_with: string[];
  
  // Runtime state
  assigned_count: number;
  
  created_at: string;
}

export interface SessionRoleWithAssignment extends SessionRole {
  /** Is this role assigned to the current participant? */
  is_mine?: boolean;
  /** Participant IDs assigned to this role (host view only) */
  assigned_participants?: string[];
}

// =============================================================================
// Role Assignment
// =============================================================================

export interface RoleAssignment {
  id: string;
  session_id: string;
  participant_id: string;
  session_role_id: string;
  assigned_at: string;
  assigned_by: string | null;
  revealed_at: string | null;
}

export interface ParticipantWithRole {
  id: string;
  display_name: string;
  status: string;
  role?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    private_instructions?: string; // Only for own role
    private_hints?: string | null;
  };
}

// =============================================================================
// Session Events (audit log)
// =============================================================================

export type SessionEventType =
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_ended'
  | 'step_changed'
  | 'phase_changed'
  | 'timer_started'
  | 'timer_paused'
  | 'timer_resumed'
  | 'timer_reset'
  | 'role_assigned'
  | 'role_revealed'
  | 'participant_joined'
  | 'participant_left'
  | 'board_message_set';

export interface SessionEvent {
  id: string;
  session_id: string;
  event_type: SessionEventType;
  event_data: Record<string, unknown>;
  actor_user_id: string | null;
  actor_participant_id: string | null;
  created_at: string;
}

// =============================================================================
// Broadcast Events (Realtime)
// =============================================================================

export interface PlayBroadcastEvent {
  type: 'state_change' | 'timer_update' | 'role_update' | 'board_update' | 'turn_update';
  payload: unknown;
  timestamp: string;
}

export interface StateChangeBroadcast extends PlayBroadcastEvent {
  type: 'state_change';
  payload: {
    current_step_index?: number;
    current_phase_index?: number;
    status?: string;
  };
}

export interface TimerBroadcast extends PlayBroadcastEvent {
  type: 'timer_update';
  payload: {
    action: 'start' | 'pause' | 'resume' | 'reset';
    timer_state: TimerState | null;
  };
}

export interface RoleBroadcast extends PlayBroadcastEvent {
  type: 'role_update';
  payload: {
    action: 'assigned' | 'revealed';
    participant_id: string;
    role_id?: string;
    role_name?: string;
  };
}

export interface BoardBroadcast extends PlayBroadcastEvent {
  type: 'board_update';
  payload: {
    message?: string;
    overrides?: BoardState['overrides'];
  };
}

export interface TurnBroadcast extends PlayBroadcastEvent {
  type: 'turn_update';
  payload: {
    next_starter_participant_id: string | null;
  };
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface UpdateSessionStateRequest {
  current_step_index?: number;
  current_phase_index?: number;
}

export interface StartTimerRequest {
  duration_seconds: number;
}

export interface AssignRoleRequest {
  participant_id: string;
  session_role_id: string;
}

export interface RandomAssignRolesRequest {
  /** If true, respect min_count requirements */
  respect_minimums?: boolean;
}

export interface SetBoardMessageRequest {
  message: string | null;
}
