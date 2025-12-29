/**
 * Session Event Types
 * 
 * Type definitions for the session event system used for
 * observability, debugging, and replay.
 * 
 * Epic 6: Event System & Observability - Task 6.1
 */

// =============================================================================
// Event Categories
// =============================================================================

export type EventCategory =
  | 'trigger'       // Trigger-related events
  | 'artifact'      // Artifact state changes
  | 'lifecycle'     // Session lifecycle events
  | 'signal'        // Signal emissions
  | 'timebank'      // Time bank operations
  | 'navigation'    // Step/phase navigation
  | 'participant'   // Participant actions
  | 'host';         // Host actions

// =============================================================================
// Event Severity
// =============================================================================

export type EventSeverity = 'debug' | 'info' | 'warning' | 'error';

// =============================================================================
// Actor Types
// =============================================================================

export type EventActorType = 'host' | 'participant' | 'system' | 'trigger';

// =============================================================================
// Target Types
// =============================================================================

export type EventTargetType =
  | 'artifact'
  | 'trigger'
  | 'step'
  | 'phase'
  | 'participant'
  | 'signal'
  | 'timebank'
  | 'session';

// =============================================================================
// Specific Event Types
// =============================================================================

// Trigger events
export type TriggerEventType =
  | 'trigger_armed'
  | 'trigger_fired'
  | 'trigger_disabled'
  | 'trigger_rearmed'
  | 'trigger_error'
  | 'trigger_error_cleared'
  | 'trigger_kill_switch_activated'
  | 'trigger_kill_switch_deactivated';

// Artifact events
export type ArtifactEventType =
  | 'artifact_revealed'
  | 'artifact_hidden'
  | 'artifact_reset'
  | 'artifact_solved'
  | 'artifact_failed'
  | 'artifact_unlocked'
  | 'artifact_state_changed';

// Lifecycle events
export type LifecycleEventType =
  | 'session_created'
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_ended'
  | 'session_reset';

// Signal events
export type SignalEventType =
  | 'signal_sent'
  | 'signal_received'
  | 'signal_preset_activated';

// TimeBank events
export type TimeBankEventType =
  | 'timebank_started'
  | 'timebank_paused'
  | 'timebank_resumed'
  | 'timebank_expired'
  | 'timebank_delta_applied'
  | 'timebank_reset';

// Navigation events
export type NavigationEventType =
  | 'step_started'
  | 'step_completed'
  | 'phase_started'
  | 'phase_completed'
  | 'navigation_manual';

// Participant events
export type ParticipantEventType =
  | 'participant_joined'
  | 'participant_left'
  | 'participant_role_assigned'
  | 'participant_action';

// Host events
export type HostEventType =
  | 'host_action'
  | 'host_message_sent'
  | 'host_hint_sent'
  | 'host_override';

// Combined event type
export type SessionEventType =
  | TriggerEventType
  | ArtifactEventType
  | LifecycleEventType
  | SignalEventType
  | TimeBankEventType
  | NavigationEventType
  | ParticipantEventType
  | HostEventType;

// =============================================================================
// Session Event Interface
// =============================================================================

export interface SessionEvent {
  id: string;
  sessionId: string;
  
  // Event identification
  eventType: SessionEventType;
  eventCategory: EventCategory;
  
  // Actor
  actorType: EventActorType;
  actorId?: string;
  actorName?: string;
  
  // Target
  targetType?: EventTargetType;
  targetId?: string;
  targetName?: string;
  
  // Data
  payload: Record<string, unknown>;
  
  // Correlation
  correlationId?: string;
  parentEventId?: string;
  
  // Metadata
  createdAt: Date;
  severity: EventSeverity;
}

// =============================================================================
// Event Payloads (type-safe payload definitions)
// =============================================================================

export interface TriggerFiredPayload {
  triggerName: string;
  conditionType: string;
  actionCount: number;
  delaySeconds?: number;
  executeOnce: boolean;
}

export interface TriggerErrorPayload {
  triggerName: string;
  error: string;
  errorCount: number;
  actionIndex?: number;
  actionType?: string;
}

export interface ArtifactStatePayload {
  artifactType: string;
  previousState?: string;
  newState: string;
}

export interface SignalSentPayload {
  channel: string;
  signalType?: string;
  duration?: number;
}

export interface TimeBankDeltaPayload {
  deltaSeconds: number;
  previousRemaining: number;
  newRemaining: number;
  ruleId?: string;
  reason?: string;
}

export interface NavigationPayload {
  fromStepId?: string;
  fromStepName?: string;
  toStepId: string;
  toStepName: string;
  fromPhaseId?: string;
  toPhaseId?: string;
  manual: boolean;
}

export interface ParticipantPayload {
  participantId: string;
  participantName?: string;
  deviceId?: string;
  role?: string;
}

// =============================================================================
// Event Stats
// =============================================================================

export interface EventStats {
  eventCategory: EventCategory;
  eventCount: number;
  errorCount: number;
  warningCount: number;
}

// =============================================================================
// Event Query Options
// =============================================================================

export interface EventQueryOptions {
  sessionId: string;
  limit?: number;
  offset?: number;
  category?: EventCategory;
  severity?: EventSeverity;
  since?: Date;
  actorType?: EventActorType;
  targetType?: EventTargetType;
  correlationId?: string;
}

// =============================================================================
// Helper: Create Event Input
// =============================================================================

export interface CreateEventInput {
  sessionId: string;
  eventType: SessionEventType;
  eventCategory: EventCategory;
  actorType?: EventActorType;
  actorId?: string;
  actorName?: string;
  targetType?: EventTargetType;
  targetId?: string;
  targetName?: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
  parentEventId?: string;
  severity?: EventSeverity;
}

// =============================================================================
// Database row type (snake_case for Supabase)
// =============================================================================

export interface SessionEventRow {
  id: string;
  session_id: string;
  event_type: string;
  event_category: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  payload: Record<string, unknown>;
  correlation_id: string | null;
  parent_event_id: string | null;
  severity: string;
  created_at: string;
}

// =============================================================================
// Converter functions
// =============================================================================

export function sessionEventFromRow(row: SessionEventRow): SessionEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type as SessionEventType,
    eventCategory: row.event_category as EventCategory,
    actorType: row.actor_type as EventActorType,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor_name ?? undefined,
    targetType: row.target_type as EventTargetType | undefined,
    targetId: row.target_id ?? undefined,
    targetName: row.target_name ?? undefined,
    payload: row.payload,
    correlationId: row.correlation_id ?? undefined,
    parentEventId: row.parent_event_id ?? undefined,
    createdAt: new Date(row.created_at),
    severity: row.severity as EventSeverity,
  };
}

export function sessionEventToRow(event: SessionEvent): Omit<SessionEventRow, 'id' | 'created_at'> {
  return {
    session_id: event.sessionId,
    event_type: event.eventType,
    event_category: event.eventCategory,
    actor_type: event.actorType,
    actor_id: event.actorId ?? null,
    actor_name: event.actorName ?? null,
    target_type: event.targetType ?? null,
    target_id: event.targetId ?? null,
    target_name: event.targetName ?? null,
    payload: event.payload,
    correlation_id: event.correlationId ?? null,
    parent_event_id: event.parentEventId ?? null,
    severity: event.severity,
  };
}

// =============================================================================
// Event Display Helpers
// =============================================================================

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  trigger: 'Trigger',
  artifact: 'Artefakt',
  lifecycle: 'Session',
  signal: 'Signal',
  timebank: 'Tidsbank',
  navigation: 'Navigation',
  participant: 'Deltagare',
  host: 'Ledare',
};

export const EVENT_CATEGORY_ICONS: Record<EventCategory, string> = {
  trigger: '⚡',
  artifact: '🧩',
  lifecycle: '🎮',
  signal: '📡',
  timebank: '⏱️',
  navigation: '🧭',
  participant: '👤',
  host: '🎭',
};

export const SEVERITY_COLORS: Record<EventSeverity, string> = {
  debug: 'text-muted-foreground',
  info: 'text-foreground',
  warning: 'text-yellow-600',
  error: 'text-red-600',
};
