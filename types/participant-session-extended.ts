/**
 * Extended Participant Session Type
 * 
 * Extends the base Supabase type with runtime fields
 * added in migration 20251216160000_play_runtime_schema.sql
 * 
 * After running `supabase gen types typescript`, these fields
 * will be in the base type and this file can be removed.
 */

import type { Database } from '@/types/supabase';
import type { TimerState, BoardState } from '@/types/play-runtime';

type BaseParticipantSession = Database['public']['Tables']['participant_sessions']['Row'];

/**
 * Extended participant session with runtime fields
 */
export interface ParticipantSessionWithRuntime extends BaseParticipantSession {
  /** Current step index for basic play mode (0-based) */
  current_step_index?: number;
  /** Current phase index for facilitated/participants mode (0-based) */
  current_phase_index?: number;
  /** Event-driven timer state */
  timer_state?: TimerState | null;
  /** Runtime board overrides */
  board_state?: BoardState | null;
}

/**
 * Session role (snapshot from game_roles)
 */
export interface SessionRole {
  id: string;
  session_id: string;
  source_role_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  role_order: number;
  public_description: string | null;
  private_instructions: string;
  private_hints: string | null;
  min_count: number;
  max_count: number | null;
  assignment_strategy: 'random' | 'leader_picks' | 'player_picks';
  scaling_rules: Record<string, number> | null;
  conflicts_with: string[];
  assigned_count: number;
  created_at: string;
}

/**
 * Session event (audit log)
 */
export interface SessionEvent {
  id: string;
  session_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  actor_user_id: string | null;
  actor_participant_id: string | null;
  created_at: string;
}

/**
 * Role assignment
 */
export interface ParticipantRoleAssignment {
  id: string;
  session_id: string;
  participant_id: string;
  session_role_id: string;
  assigned_at: string;
  assigned_by: string | null;
  revealed_at: string | null;
}
