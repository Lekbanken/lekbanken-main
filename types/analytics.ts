/**
 * Analytics types for session statistics and reporting
 */

// =============================================================================
// Session Analytics
// =============================================================================

/** Summary stats for a single session */
export interface SessionAnalytics {
  session_id: string;
  game_id: string;
  game_name: string;
  
  // Duration
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  
  // Participants
  participant_count: number;
  active_participant_count: number;
  
  // Events
  total_events: number;
  events_by_type: Record<string, number>;
  
  // Triggers
  total_triggers: number;
  triggers_fired: number;
  triggers_pending: number;
  trigger_fire_rate: number; // percentage
  
  // Time Bank
  time_bank_initial: number;
  time_bank_final: number;
  time_bank_delta: number;
  time_bank_transactions: number;
  
  // Decisions
  total_decisions: number;
  decisions_completed: number;
  total_votes: number;
  
  // Signals
  total_signals: number;
  signals_by_type: Record<string, number>;
}

/** Aggregated stats across multiple sessions */
export interface GameAnalytics {
  game_id: string;
  game_name: string;
  
  // Session stats
  total_sessions: number;
  completed_sessions: number;
  avg_duration_seconds: number | null;
  min_duration_seconds: number | null;
  max_duration_seconds: number | null;
  
  // Participant stats
  total_participants: number;
  avg_participants_per_session: number;
  
  // Trigger stats
  avg_trigger_fire_rate: number;
  most_fired_triggers: TriggerStat[];
  least_fired_triggers: TriggerStat[];
  
  // Time bank stats
  avg_time_bank_usage: number;
  
  // Recent sessions
  recent_sessions: SessionSummary[];
}

/** Trigger firing statistics */
export interface TriggerStat {
  trigger_id: string;
  trigger_name: string;
  fire_count: number;
  fire_rate: number;
}

/** Minimal session summary for lists */
export interface SessionSummary {
  session_id: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  participant_count: number;
  status: 'pending' | 'active' | 'ended';
}

// =============================================================================
// Event Timeline
// =============================================================================

/** Event for timeline display */
export interface TimelineEvent {
  id: string;
  timestamp: string;
  event_type: string;
  actor_type: 'user' | 'participant' | 'system';
  actor_name: string | null;
  description: string;
  data: Record<string, unknown> | null;
}

/** Time bank ledger entry for timeline */
export interface TimeBankEntry {
  id: string;
  timestamp: string;
  delta_seconds: number;
  balance_after: number;
  reason: string;
  actor_type: string | null;
  actor_id: string | null;
}

// =============================================================================
// Dashboard Filters
// =============================================================================

export interface AnalyticsFilter {
  date_from?: string;
  date_to?: string;
  game_id?: string;
  session_status?: 'all' | 'active' | 'ended';
}

// =============================================================================
// API Response Types
// =============================================================================

export interface SessionAnalyticsResponse {
  analytics: SessionAnalytics;
  timeline: TimelineEvent[];
  time_bank_history: TimeBankEntry[];
}

export interface GameAnalyticsResponse {
  analytics: GameAnalytics;
}

export interface DashboardOverview {
  total_games: number;
  total_sessions: number;
  active_sessions: number;
  total_participants: number;
  recent_sessions: SessionSummary[];
  popular_games: { game_id: string; game_name: string; session_count: number }[];
}
