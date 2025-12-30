/**
 * useSessionEvents Hook
 * 
 * Hook for logging and subscribing to session events.
 * Provides event emission, real-time subscription, and query capabilities.
 * 
 * Epic 6: Event System & Observability - Task 6.2
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type {
  SessionEvent,
  CreateEventInput,
  EventCategory,
  EventSeverity,
  EventStats,
} from '@/types/session-event';
import type { Json } from '@/types/supabase';

// =============================================================================
// Types
// =============================================================================

export interface UseSessionEventsOptions {
  /** Session ID to subscribe to */
  sessionId: string;
  /** Whether to enable real-time subscription */
  realtime?: boolean;
  /** Maximum number of events to keep in memory */
  maxEvents?: number;
  /** Filter by category */
  category?: EventCategory;
  /** Filter by severity */
  severity?: EventSeverity;
  /** Callback when new event is received */
  onEvent?: (event: SessionEvent) => void;
  /** Callback when error event is received */
  onError?: (event: SessionEvent) => void;
}

export interface UseSessionEventsReturn {
  /** All events (most recent first) */
  events: SessionEvent[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Emit a new event */
  emitEvent: (input: CreateEventInput) => Promise<SessionEvent | null>;
  /** Emit a batch of events */
  emitEvents: (inputs: CreateEventInput[]) => Promise<SessionEvent[]>;
  /** Clear local events (does not delete from DB) */
  clearEvents: () => void;
  /** Refresh events from database */
  refresh: () => Promise<void>;
  /** Event statistics */
  stats: EventStats[];
  /** Generate a new correlation ID */
  createCorrelationId: () => string;
}

// =============================================================================
// Helper: Convert row to SessionEvent
// =============================================================================


type SessionEventRowV2 = {
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
  created_at: string;
  severity: string;
};

type SessionEventRowLegacy = {
  id: string;
  session_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  actor_user_id: string | null;
  actor_participant_id: string | null;
  created_at: string;
};

type SessionEventRow = SessionEventRowV2 | SessionEventRowLegacy;

const EVENT_CATEGORY_MAP: Array<[RegExp, EventCategory]> = [
  [/^trigger_/, 'trigger'],
  [/trigger/i, 'trigger'],
  [/artifact|puzzle/i, 'artifact'],
  [/signal/i, 'signal'],
  [/time_?bank/i, 'timebank'],
  [/step_|phase_|navigation/i, 'navigation'],
  [/participant|role/i, 'participant'],
  [/session_/i, 'lifecycle'],
  [/host_/i, 'host'],
];

function inferCategory(eventType: string): EventCategory {
  for (const [regex, category] of EVENT_CATEGORY_MAP) {
    if (regex.test(eventType)) return category;
  }
  return 'host';
}

function rowToEvent(row: SessionEventRow): SessionEvent {
  if ('event_category' in row) {
    const eventCategory = row.event_category
      ? (row.event_category as EventCategory)
      : inferCategory(row.event_type);

    return {
      id: row.id,
      sessionId: row.session_id,
      eventType: row.event_type as SessionEvent['eventType'],
      eventCategory,
      actorType: row.actor_type as SessionEvent['actorType'],
      actorId: row.actor_id ?? undefined,
      actorName: row.actor_name ?? undefined,
      targetType: row.target_type as SessionEvent['targetType'],
      targetId: row.target_id ?? undefined,
      targetName: row.target_name ?? undefined,
      payload: row.payload ?? {},
      correlationId: row.correlation_id ?? undefined,
      parentEventId: row.parent_event_id ?? undefined,
      createdAt: new Date(row.created_at),
      severity: row.severity as EventSeverity,
    };
  }

  const actorType = row.actor_participant_id
    ? 'participant'
    : row.actor_user_id
      ? 'host'
      : 'system';

  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type as SessionEvent['eventType'],
    eventCategory: inferCategory(row.event_type),
    actorType,
    actorId: row.actor_participant_id ?? row.actor_user_id ?? undefined,
    payload: row.event_data ?? {},
    createdAt: new Date(row.created_at),
    severity: 'info',
  };
}

function toJsonPayload(payload?: Record<string, unknown>): Json {
  return (payload ?? {}) as Json;
}

function applyEventFilters(
  events: SessionEvent[],
  category?: EventCategory,
  severity?: EventSeverity
): SessionEvent[] {
  let result = events;
  if (category) {
    result = result.filter((event) => event.eventCategory === category);
  }
  if (severity) {
    result = result.filter((event) => event.severity === severity);
  }
  return result;
}

function computeEventStats(events: SessionEvent[]): EventStats[] {
  const stats = new Map<EventCategory, EventStats>();

  for (const event of events) {
    const existing = stats.get(event.eventCategory) ?? {
      eventCategory: event.eventCategory,
      eventCount: 0,
      errorCount: 0,
      warningCount: 0,
    };

    existing.eventCount += 1;
    if (event.severity === 'error') existing.errorCount += 1;
    if (event.severity === 'warning') existing.warningCount += 1;

    stats.set(event.eventCategory, existing);
  }

  return Array.from(stats.values());
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSessionEvents({
  sessionId,
  realtime = true,
  maxEvents = 200,
  category,
  severity,
  onEvent,
  onError,
}: UseSessionEventsOptions): UseSessionEventsReturn {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [stats, setStats] = useState<EventStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createBrowserClient();
  }, []);
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  
  // Keep callback refs updated
  useEffect(() => {
    onEventRef.current = onEvent;
    onErrorRef.current = onError;
  }, [onEvent, onError]);

  // ==========================================================================
  // Generate correlation ID
  // ==========================================================================
  
  const createCorrelationId = useCallback(() => {
    return crypto.randomUUID();
  }, []);

  // ==========================================================================
  // Emit single event
  // ==========================================================================
  
  const emitEvent = useCallback(async (input: CreateEventInput): Promise<SessionEvent | null> => {
    if (!supabase) return null;
    try {
      const { data, error: insertError } = await supabase
        .from('session_events')
        .insert({
          session_id: input.sessionId,
          event_type: input.eventType,
          event_category: input.eventCategory,
          actor_type: input.actorType ?? 'system',
          actor_id: input.actorId ?? null,
          actor_name: input.actorName ?? null,
          target_type: input.targetType ?? null,
          target_id: input.targetId ?? null,
          target_name: input.targetName ?? null,
          payload: toJsonPayload(input.payload),
          correlation_id: input.correlationId ?? null,
          parent_event_id: input.parentEventId ?? null,
          severity: input.severity ?? 'info',
        })
        .select()
        .single();

      if (insertError || !data) {
        const fallback = await supabase
          .from('session_events')
          .insert({
            session_id: input.sessionId,
            event_type: input.eventType,
            event_data: toJsonPayload(input.payload),
            actor_user_id: input.actorType === 'host' ? input.actorId ?? null : null,
            actor_participant_id: input.actorType === 'participant' ? input.actorId ?? null : null,
          })
          .select()
          .single();

        if (fallback.error || !fallback.data) {
          console.error('[useSessionEvents] Insert error:', insertError ?? fallback.error);
          return null;
        }

        const legacyEvent = rowToEvent(fallback.data as unknown as SessionEventRow);
        setEvents((prev) => {
          const exists = prev.some((e) => e.id === legacyEvent.id);
          if (exists) return prev;
          return [legacyEvent, ...prev].slice(0, maxEvents);
        });

        return legacyEvent;
      }

      const event = rowToEvent(data as unknown as SessionEventRow);
      
      // Add to local state (realtime subscription will also add it, but this is faster)
      setEvents((prev) => {
        const exists = prev.some((e) => e.id === event.id);
        if (exists) return prev;
        return [event, ...prev].slice(0, maxEvents);
      });

      return event;
    } catch (err) {
      console.error('[useSessionEvents] Emit error:', err);
      return null;
    }
  }, [supabase, maxEvents]);

  // ==========================================================================
  // Emit batch of events
  // ==========================================================================
  
  const emitEvents = useCallback(async (inputs: CreateEventInput[]): Promise<SessionEvent[]> => {
    if (inputs.length === 0) return [];
    if (!supabase) return [];

    try {
      const rows = inputs.map((input) => ({
        session_id: input.sessionId,
        event_type: input.eventType,
        event_category: input.eventCategory,
        actor_type: input.actorType ?? 'system',
        actor_id: input.actorId ?? null,
        actor_name: input.actorName ?? null,
        target_type: input.targetType ?? null,
        target_id: input.targetId ?? null,
        target_name: input.targetName ?? null,
        payload: toJsonPayload(input.payload),
        correlation_id: input.correlationId ?? null,
        parent_event_id: input.parentEventId ?? null,
        severity: input.severity ?? 'info',
      }));

      const { data, error: insertError } = await supabase
        .from('session_events')
        .insert(rows)
        .select();

      if (insertError || !data) {
        const fallbackRows = inputs.map((input) => ({
          session_id: input.sessionId,
          event_type: input.eventType,
          event_data: toJsonPayload(input.payload),
          actor_user_id: input.actorType === 'host' ? input.actorId ?? null : null,
          actor_participant_id: input.actorType === 'participant' ? input.actorId ?? null : null,
        }));

        const fallback = await supabase
          .from('session_events')
          .insert(fallbackRows)
          .select();

        if (fallback.error || !fallback.data) {
          console.error('[useSessionEvents] Batch insert error:', insertError ?? fallback.error);
          return [];
        }

        const legacyEvents = (fallback.data as unknown as SessionEventRow[]).map(rowToEvent);
        setEvents((prev) => {
          const ids = new Set(prev.map((e) => e.id));
          const newEvents = legacyEvents.filter((e) => !ids.has(e.id));
          return [...newEvents, ...prev].slice(0, maxEvents);
        });

        return legacyEvents;
      }

      const events = (data as unknown as SessionEventRow[]).map(rowToEvent);
      
      // Add to local state
      setEvents((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const newEvents = events.filter((e) => !ids.has(e.id));
        return [...newEvents, ...prev].slice(0, maxEvents);
      });

      return events;
    } catch (err) {
      console.error('[useSessionEvents] Batch emit error:', err);
      return [];
    }
  }, [supabase, maxEvents]);

  // ==========================================================================
  // Clear local events
  // ==========================================================================
  
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // ==========================================================================
  // Fetch events from database
  // ==========================================================================
  
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = supabase;
      if (!client) {
        setIsLoading(false);
        return;
      }

      const query = client
        .from('session_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(maxEvents);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const fetchedEvents = (data as unknown as SessionEventRow[]).map(rowToEvent);
      const filteredEvents = applyEventFilters(fetchedEvents, category, severity);
      setEvents(filteredEvents);
      const fallbackStats = computeEventStats(fetchedEvents);

      // Fetch stats - bypass RPC type checking since this RPC may not exist yet
      try {
        type RpcInvoker = (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
        const rpc = client.rpc as unknown as RpcInvoker;
        const { data: statsData, error: statsError } = await rpc('get_session_event_stats', {
          p_session_id: sessionId,
        });

        if (!statsError && statsData && Array.isArray(statsData)) {
          type StatsRow = { event_category: string; event_count: number; error_count: number; warning_count: number };
          setStats(
            (statsData as StatsRow[]).map((row) => ({
              eventCategory: row.event_category as EventCategory,
              eventCount: Number(row.event_count),
              errorCount: Number(row.error_count),
              warningCount: Number(row.warning_count),
            }))
          );
        } else {
          setStats(fallbackStats);
        }
      } catch {
        // Stats RPC may not exist yet, ignore error
        console.warn('[useSessionEvents] Stats RPC not available');
        setStats(fallbackStats);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch events'));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, sessionId, maxEvents, category, severity]);

  // ==========================================================================
  // Initial fetch
  // ==========================================================================
  
  useEffect(() => {
    refresh();
  }, [refresh]);

  // ==========================================================================
  // Real-time subscription
  // ==========================================================================
  
  useEffect(() => {
    if (!realtime) return;
    if (!supabase) return;

    const channel = supabase
      .channel(`session_events:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: { new: SessionEventRow }) => {
          const event = rowToEvent(payload.new as SessionEventRow);
          
          // Apply filters
          if (category && event.eventCategory !== category) return;
          if (severity && event.severity !== severity) return;

          setEvents((prev) => {
            const exists = prev.some((e) => e.id === event.id);
            if (exists) return prev;
            return [event, ...prev].slice(0, maxEvents);
          });

          // Call callbacks
          onEventRef.current?.(event);
          if (event.severity === 'error') {
            onErrorRef.current?.(event);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, realtime, category, severity, maxEvents]);

  return {
    events,
    isLoading,
    error,
    emitEvent,
    emitEvents,
    clearEvents,
    refresh,
    stats,
    createCorrelationId,
  };
}

// =============================================================================
// Event Emitter Helpers
// =============================================================================

export interface SessionEventEmitter {
  sessionId: string;
  actorType?: SessionEvent['actorType'];
  actorId?: string;
  actorName?: string;
}

/**
 * Create helper functions for common event emissions
 */
export function createEventEmitters(
  emitter: SessionEventEmitter,
  emitEvent: (input: CreateEventInput) => Promise<SessionEvent | null>
) {
  const base = {
    sessionId: emitter.sessionId,
    actorType: emitter.actorType ?? 'system',
    actorId: emitter.actorId,
    actorName: emitter.actorName,
  };

  return {
    // Trigger events
    triggerFired: (triggerId: string, triggerName: string, payload: Record<string, unknown> = {}) =>
      emitEvent({
        ...base,
        eventType: 'trigger_fired',
        eventCategory: 'trigger',
        targetType: 'trigger',
        targetId: triggerId,
        targetName: triggerName,
        payload,
      }),

    triggerError: (triggerId: string, triggerName: string, error: string, payload: Record<string, unknown> = {}) =>
      emitEvent({
        ...base,
        eventType: 'trigger_error',
        eventCategory: 'trigger',
        targetType: 'trigger',
        targetId: triggerId,
        targetName: triggerName,
        payload: { error, ...payload },
        severity: 'error',
      }),

    // Artifact events
    artifactRevealed: (artifactId: string, artifactName: string, artifactType: string) =>
      emitEvent({
        ...base,
        eventType: 'artifact_revealed',
        eventCategory: 'artifact',
        targetType: 'artifact',
        targetId: artifactId,
        targetName: artifactName,
        payload: { artifactType },
      }),

    artifactSolved: (artifactId: string, artifactName: string, artifactType: string) =>
      emitEvent({
        ...base,
        eventType: 'artifact_solved',
        eventCategory: 'artifact',
        targetType: 'artifact',
        targetId: artifactId,
        targetName: artifactName,
        payload: { artifactType },
      }),

    // Navigation events
    stepStarted: (stepId: string, stepName: string, phaseId?: string) =>
      emitEvent({
        ...base,
        eventType: 'step_started',
        eventCategory: 'navigation',
        targetType: 'step',
        targetId: stepId,
        targetName: stepName,
        payload: { phaseId },
      }),

    stepCompleted: (stepId: string, stepName: string) =>
      emitEvent({
        ...base,
        eventType: 'step_completed',
        eventCategory: 'navigation',
        targetType: 'step',
        targetId: stepId,
        targetName: stepName,
      }),

    // Signal events
    signalSent: (channel: string, signalType?: string) =>
      emitEvent({
        ...base,
        eventType: 'signal_sent',
        eventCategory: 'signal',
        targetType: 'signal',
        targetId: channel,
        targetName: channel,
        payload: { signalType },
      }),

    // TimeBank events
    timeBankDeltaApplied: (delta: number, reason?: string) =>
      emitEvent({
        ...base,
        eventType: 'timebank_delta_applied',
        eventCategory: 'timebank',
        targetType: 'timebank',
        payload: { deltaSeconds: delta, reason },
      }),

    // Lifecycle events
    sessionStarted: () =>
      emitEvent({
        ...base,
        eventType: 'session_started',
        eventCategory: 'lifecycle',
        targetType: 'session',
        targetId: emitter.sessionId,
      }),

    sessionEnded: () =>
      emitEvent({
        ...base,
        eventType: 'session_ended',
        eventCategory: 'lifecycle',
        targetType: 'session',
        targetId: emitter.sessionId,
      }),

    // Host events
    hostMessage: (message: string) =>
      emitEvent({
        ...base,
        eventType: 'host_message_sent',
        eventCategory: 'host',
        payload: { message },
      }),

    hostHint: (hintId: string, hintText: string, artifactId?: string) =>
      emitEvent({
        ...base,
        eventType: 'host_hint_sent',
        eventCategory: 'host',
        targetType: 'artifact',
        targetId: artifactId,
        payload: { hintId, hintText },
      }),
  };
}
