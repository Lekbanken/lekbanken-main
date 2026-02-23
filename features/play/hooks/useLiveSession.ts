/**
 * useLiveSession Hook
 * 
 * Real-time subscription to play runtime state for a session.
 * Used by participants and facilitators to receive live updates.
 * 
 * Features:
 * - Subscribes to play broadcast channel
 * - Handles state changes, timer updates, role updates, board updates
 * - Auto-reconnects on connection issues
 * - Provides local timer calculation
 */

'use client';

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useLatestRef } from '@/hooks/useLatestRef';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getPlayChannelName, PLAY_BROADCAST_EVENTS } from '@/lib/realtime/play-broadcast';
import { calculateTimerDisplay } from '@/lib/utils/timer-utils';
import type {
  PlayBroadcastEvent,
  StateChangeBroadcast,
  TimerBroadcast,
  RoleBroadcast,
  BoardBroadcast,
  TurnBroadcast,
  ArtifactBroadcast,
  DecisionBroadcast,
  OutcomeBroadcast,
  CountdownBroadcast,
  StoryOverlayBroadcast,
  SignalReceivedBroadcast,
  TimeBankChangedBroadcast,
  PuzzleBroadcast,
  SessionRuntimeState,
  TimerState,
  TimerDisplay,
  BoardState,
} from '@/types/play-runtime';

// =============================================================================
// Types
// =============================================================================

export interface UseLiveSessionOptions {
  /** Session ID to subscribe to */
  sessionId: string;
  /** Initial state (from server-side fetch) */
  initialState?: Partial<SessionRuntimeState>;
  /** Called when any state change occurs */
  onStateChange?: (state: Partial<SessionRuntimeState>) => void;
  /** Called when timer is updated */
  onTimerUpdate?: (action: TimerBroadcast['payload']['action'], timerState: TimerState | null) => void;
  /** Called when a role is assigned/revealed */
  onRoleUpdate?: (payload: RoleBroadcast['payload']) => void;
  /** Called when board is updated */
  onBoardUpdate?: (payload: BoardBroadcast['payload']) => void;
  /** Called when next starter/turn changes */
  onTurnUpdate?: (payload: TurnBroadcast['payload']) => void;
  /** Called when artifacts change (snapshot/reveal/highlight/assign) */
  onArtifactUpdate?: (payload: ArtifactBroadcast['payload']) => void;
  /** Called when decisions change (create/open/close/reveal/vote) */
  onDecisionUpdate?: (payload: DecisionBroadcast['payload']) => void;
  /** Called when outcomes change (create/reveal/hide) */
  onOutcomeUpdate?: (payload: OutcomeBroadcast['payload']) => void;
  /** Called when countdown overlay should be shown */
  onCountdown?: (payload: CountdownBroadcast['payload']) => void;
  /** Called when story overlay should be shown */
  onStoryOverlay?: (payload: StoryOverlayBroadcast['payload']) => void;
  /** Called when a signal is received */
  onSignalReceived?: (payload: SignalReceivedBroadcast['payload']) => void;
  /** Called when time bank changes */
  onTimeBankChanged?: (payload: TimeBankChangedBroadcast['payload']) => void;
  /** Called when puzzle state changes */
  onPuzzleUpdate?: (payload: PuzzleBroadcast['payload']) => void;
  /** Called after the channel recovers from CHANNEL_ERROR / TIMED_OUT.
   *  Use this to re-fetch authoritative state from the server so any
   *  broadcasts missed during the outage window are reconciled. */
  onReconnect?: () => void;
  /** Whether subscription is enabled */
  enabled?: boolean;
  /** Timer tick interval in ms (default: 1000) */
  timerTickInterval?: number;
}

export interface UseLiveSessionResult {
  /** Current step index */
  currentStepIndex: number;
  /** Current phase index */
  currentPhaseIndex: number;
  /** Session status */
  status: SessionRuntimeState['status'];
  /** Timer state (raw) */
  timerState: TimerState | null;
  /** Timer display (calculated) */
  timerDisplay: TimerDisplay;
  /** Board state */
  boardState: BoardState | null;
  /** Next starter participant id (if set) */
  nextStarterParticipantId: string | null;
  /** Connection status */
  connected: boolean;
  /** Is currently reconnecting? */
  reconnecting: boolean;
  /** Last event timestamp */
  lastEventAt: string | null;
  /** Fetch authoritative runtime state from server (step, phase, status, timer, board). Call on reconnect or as polling fallback. */
  resyncRuntimeState: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLiveSession({
  sessionId,
  initialState,
  onStateChange,
  onTimerUpdate,
  onRoleUpdate,
  onBoardUpdate,
  onTurnUpdate,
  onArtifactUpdate,
  onDecisionUpdate,
  onOutcomeUpdate,
  onCountdown,
  onStoryOverlay,
  onSignalReceived,
  onTimeBankChanged,
  onPuzzleUpdate,
  onReconnect,
  enabled = true,
  timerTickInterval = 1000,
}: UseLiveSessionOptions): UseLiveSessionResult {
  // Channel ref
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Connection state
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  
  // Session state
  // Use -1 as default to indicate "not started yet"
  const [currentStepIndex, setCurrentStepIndex] = useState(initialState?.current_step_index ?? -1);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(initialState?.current_phase_index ?? -1);
  const [status, setStatus] = useState<SessionRuntimeState['status']>(initialState?.status ?? 'active');
  const [timerState, setTimerState] = useState<TimerState | null>(initialState?.timer_state ?? null);
  const [boardState, setBoardState] = useState<BoardState | null>(initialState?.board_state ?? null);
  const [nextStarterParticipantId, setNextStarterParticipantId] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  
  // Timer display (calculated every tick)
  const [timerDisplay, setTimerDisplay] = useState<TimerDisplay>(() => 
    calculateTimerDisplay(timerState)
  );
  
  // Supabase client (memoized)
  const supabase = useMemo(() => createBrowserClient(), []);

  // ---------------------------------------------------------------------------
  // Callback refs — keep references stable so the channel subscription effect
  // never re-runs due to consumer callback identity changes.
  // Without this, every render creates new inline callbacks → handleBroadcastEvent
  // changes → channel unsubscribes/resubscribes → broadcasts lost in the gap.
  // ---------------------------------------------------------------------------
  const onStateChangeRef = useLatestRef(onStateChange);
  const onTimerUpdateRef = useLatestRef(onTimerUpdate);
  const onRoleUpdateRef = useLatestRef(onRoleUpdate);
  const onBoardUpdateRef = useLatestRef(onBoardUpdate);
  const onTurnUpdateRef = useLatestRef(onTurnUpdate);
  const onArtifactUpdateRef = useLatestRef(onArtifactUpdate);
  const onDecisionUpdateRef = useLatestRef(onDecisionUpdate);
  const onOutcomeUpdateRef = useLatestRef(onOutcomeUpdate);
  const onCountdownRef = useLatestRef(onCountdown);
  const onStoryOverlayRef = useLatestRef(onStoryOverlay);
  const onSignalReceivedRef = useLatestRef(onSignalReceived);
  const onTimeBankChangedRef = useLatestRef(onTimeBankChanged);
  const onPuzzleUpdateRef = useLatestRef(onPuzzleUpdate);
  const onReconnectRef = useLatestRef(onReconnect);
  
  // Track whether we've been in an error state so we can fire onReconnect
  // when the channel recovers to SUBSCRIBED.
  const wasDisconnectedRef = useRef(false);
  
  // Debounce timer for onReconnect — prevents multiple rapid reconnect events
  // from triggering multiple fetches.
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Refs that track the latest step/phase for the type-aware seq guard.
  // These are updated in the state_change handler *after* setState so the
  // guard can peek at the current values without triggering re-renders.
  const currentStepRef = useRef(currentStepIndex);
  const currentPhaseRef = useRef(currentPhaseIndex);
  
  // Sequence guard — reject duplicate/stale events (server-attached seq)
  const lastSeqRef = useRef(0);

  // Signal dedupe — LRU set of recently seen signal IDs.
  // Protects against duplicate toasts on reconnect/resubscribe where the
  // same signal_received broadcast may be replayed.  Capped at 50 entries.
  const SIGNAL_DEDUPE_LIMIT = 50;
  const seenSignalIdsRef = useRef<Set<string>>(new Set());
  
  // Handle incoming broadcast event — stable identity (no callback deps)
  const handleBroadcastEvent = useCallback((event: PlayBroadcastEvent) => {
    // ---------------------------------------------------------------------------
    // Sequence guard (hybrid / type-aware)
    //
    // The seq field is a monotonic DB counter (increment_broadcast_seq).
    // We reject events with seq <= lastSeq *unless* the event is "must-deliver":
    //
    //   - state_change with a higher step/phase (forward progress)
    //   - signal_received  (fire-and-forget, no poll fallback)
    //   - time_bank_changed (non-recoverable via poll)
    //
    // Events with seq <= 0 (server fallback when DB-seq fails) skip the guard
    // entirely so they never poison lastSeqRef with a stale/bogus value.
    //
    // For all other event types the strict seq guard is safe because missing
    // a duplicate timer/board/artifact event is recoverable via the 60s poll
    // or onReconnect.
    // ---------------------------------------------------------------------------
    if (typeof event.seq === 'number' && event.seq > 0) {
      if (event.seq <= lastSeqRef.current) {
        // Check for forward-progress / must-deliver override before dropping
        const isMustDeliver = (() => {
          // state_change with a higher step/phase must never be dropped
          if (event.type === 'state_change') {
            const p = (event as StateChangeBroadcast).payload;
            const newStep = p.current_step_index;
            const newPhase = p.current_phase_index;
            if (typeof newStep === 'number' && newStep > currentStepRef.current) return true;
            if (typeof newPhase === 'number' && newPhase > currentPhaseRef.current) return true;
          }
          // signal_received is fire-and-forget — dropping means the participant
          // never sees the toast and the director never sees the inbox entry.
          // Unlike timer/board events there is no 60s poll fallback.
          if (event.type === 'signal_received') return true;
          // time_bank_changed is also non-recoverable via poll
          if (event.type === 'time_bank_changed') return true;
          return false;
        })();

        if (!isMustDeliver) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[useLiveSession] Skipping duplicate/stale event seq=%d (last=%d) type=%s', event.seq, lastSeqRef.current, event.type);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development') {
          console.debug('[useLiveSession] Must-deliver override: accepting %s despite seq=%d <= last=%d', event.type, event.seq, lastSeqRef.current);
        }
      }
      lastSeqRef.current = event.seq;
    }

    setLastEventAt(event.timestamp);
    
    switch (event.type) {
      case 'state_change': {
        const payload = (event as StateChangeBroadcast).payload;
        
        if (payload.current_step_index !== undefined) {
          setCurrentStepIndex(payload.current_step_index);
          currentStepRef.current = payload.current_step_index;
        }
        if (payload.current_phase_index !== undefined) {
          setCurrentPhaseIndex(payload.current_phase_index);
          currentPhaseRef.current = payload.current_phase_index;
        }
        if (payload.status !== undefined) {
          setStatus(payload.status as SessionRuntimeState['status']);
        }
        
        onStateChangeRef.current?.(payload as Partial<SessionRuntimeState>);
        break;
      }
      
      case 'timer_update': {
        const payload = (event as TimerBroadcast).payload;
        setTimerState(payload.timer_state);
        setTimerDisplay(calculateTimerDisplay(payload.timer_state));
        onTimerUpdateRef.current?.(payload.action, payload.timer_state);
        break;
      }
      
      case 'role_update': {
        const payload = (event as RoleBroadcast).payload;
        onRoleUpdateRef.current?.(payload);
        break;
      }
      
      case 'board_update': {
        const payload = (event as BoardBroadcast).payload;
        setBoardState((prev) => ({
          ...prev,
          message: payload.message ?? prev?.message,
          overrides: payload.overrides ?? prev?.overrides,
        }));
        onBoardUpdateRef.current?.(payload);
        break;
      }

      case 'turn_update': {
        const payload = (event as TurnBroadcast).payload;
        setNextStarterParticipantId(payload.next_starter_participant_id);
        onTurnUpdateRef.current?.(payload);
        break;
      }

      case 'artifact_update': {
        const payload = (event as ArtifactBroadcast).payload;
        onArtifactUpdateRef.current?.(payload);
        break;
      }

      case 'decision_update': {
        const payload = (event as DecisionBroadcast).payload;
        onDecisionUpdateRef.current?.(payload);
        break;
      }

      case 'outcome_update': {
        const payload = (event as OutcomeBroadcast).payload;
        onOutcomeUpdateRef.current?.(payload);
        break;
      }

      case 'countdown': {
        const payload = (event as CountdownBroadcast).payload;
        onCountdownRef.current?.(payload);
        break;
      }

      case 'story_overlay': {
        const payload = (event as StoryOverlayBroadcast).payload;
        onStoryOverlayRef.current?.(payload);
        break;
      }

      case 'signal_received': {
        const payload = (event as SignalReceivedBroadcast).payload;
        // Dedupe key: `payload.id` is the DB-backed session_signals UUID —
        // stable and unique.  For future client-only broadcasts that may lack
        // a DB id, fall back to inner-payload fields before giving up.
        const innerPayload = payload.payload as Record<string, unknown> | undefined;
        const rawKey =
          payload.id ??
          (innerPayload?.client_event_id as string | undefined);
        // Guard: only use the key if it's a non-empty string
        const dedupeKey = typeof rawKey === 'string' && rawKey.length > 0 ? rawKey : undefined;
        // LRU dedupe — drop if we've already seen this key
        if (dedupeKey && seenSignalIdsRef.current.has(dedupeKey)) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('[useLiveSession] Dropping duplicate signal_received key=%s', dedupeKey);
          }
          break;
        }
        if (dedupeKey) {
          seenSignalIdsRef.current.add(dedupeKey);
          // Evict oldest entries when exceeding limit
          if (seenSignalIdsRef.current.size > SIGNAL_DEDUPE_LIMIT) {
            const first = seenSignalIdsRef.current.values().next().value;
            if (first) seenSignalIdsRef.current.delete(first);
          }
        }
        onSignalReceivedRef.current?.(payload);
        break;
      }

      case 'time_bank_changed': {
        const payload = (event as TimeBankChangedBroadcast).payload;
        onTimeBankChangedRef.current?.(payload);
        break;
      }

      case 'puzzle_update': {
        const payload = (event as PuzzleBroadcast).payload;
        onPuzzleUpdateRef.current?.(payload);
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks accessed via stable refs
  }, []);
  
  // Timer tick effect (recalculate display)
  useEffect(() => {
    // Only tick if timer is running
    if (!timerState || timerState.paused_at) {
      return;
    }
    
    const interval = setInterval(() => {
      setTimerDisplay(calculateTimerDisplay(timerState));
    }, timerTickInterval);
    
    return () => clearInterval(interval);
  }, [timerState, timerTickInterval]);
  
  // Channel subscription effect
  useEffect(() => {
    if (!enabled || !sessionId) return;
    
    const channelName = getPlayChannelName(sessionId);

    if (process.env.NODE_ENV === 'development') {
      console.debug('[useLiveSession] Subscribing to channel %s', channelName);
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });
    
    channel
      .on('broadcast', { event: PLAY_BROADCAST_EVENTS.PLAY_EVENT }, (payload) => {
        const event = payload.payload as PlayBroadcastEvent;
        handleBroadcastEvent(event);
      })
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[useLiveSession] Channel %s status: %s', channelName, status);
        }
        switch (status) {
          case 'SUBSCRIBED':
            setConnected(true);
            setReconnecting(false);
            // If we recovered from an error/timeout, fire onReconnect so the
            // consumer can re-fetch authoritative state for any missed events.
            // Debounced (500ms) to coalesce rapid reconnect cycles.
            if (wasDisconnectedRef.current) {
              wasDisconnectedRef.current = false;
              if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
              reconnectTimerRef.current = setTimeout(() => {
                if (process.env.NODE_ENV === 'development') {
                  console.debug('[useLiveSession] Channel recovered — firing onReconnect');
                }
                onReconnectRef.current?.();
                reconnectTimerRef.current = null;
              }, 500);
            }
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setConnected(false);
            setReconnecting(true);
            wasDisconnectedRef.current = true;
            break;
          case 'CLOSED':
            setConnected(false);
            setReconnecting(false);
            break;
        }
      });
    
    channelRef.current = channel;
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[useLiveSession] Unsubscribing from channel %s', channelName);
      }
      channel.unsubscribe();
      channelRef.current = null;
      setConnected(false);
      // Clear any pending reconnect debounce
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [sessionId, enabled, handleBroadcastEvent, supabase]);

  // Imperative resync: fetch authoritative runtime state from server
  const resyncRuntimeState = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/state`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const s = data.session as Record<string, unknown> | undefined;
      if (!s) return;

      const step = s.current_step_index as number | undefined;
      const phase = s.current_phase_index as number | undefined;
      const serverStatus = s.status as SessionRuntimeState['status'] | undefined;
      const timer = s.timer_state as TimerState | null | undefined;
      const board = s.board_state as BoardState | null | undefined;

      if (typeof step === 'number' && step !== currentStepRef.current) {
        setCurrentStepIndex(step);
        currentStepRef.current = step;
      }
      if (typeof phase === 'number' && phase !== currentPhaseRef.current) {
        setCurrentPhaseIndex(phase);
        currentPhaseRef.current = phase;
      }
      if (serverStatus) setStatus(serverStatus);
      if (timer !== undefined) {
        setTimerState(timer);
        setTimerDisplay(calculateTimerDisplay(timer));
      }
      if (board !== undefined) setBoardState(board);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useLiveSession] resyncRuntimeState failed:', err);
      }
    }
  }, [sessionId]);
  
  return {
    currentStepIndex,
    currentPhaseIndex,
    status,
    timerState,
    timerDisplay,
    boardState,
    nextStarterParticipantId,
    connected,
    reconnecting,
    lastEventAt,
    resyncRuntimeState,
  };
}

// =============================================================================
// Utility Hook: Timer Only
// =============================================================================

interface UseLiveTimerOptions {
  timerState: TimerState | null;
  tickInterval?: number;
}

/**
 * Standalone hook for timer display calculation.
 * Use when you already have timer state from another source.
 */
export function useLiveTimer({
  timerState,
  tickInterval = 1000,
}: UseLiveTimerOptions): TimerDisplay {
  // Calculate initial display from timerState
  const initialDisplay = useMemo(() => 
    calculateTimerDisplay(timerState), 
    [timerState]
  );
  
  const [display, setDisplay] = useState<TimerDisplay>(initialDisplay);
  
  // Update display when timerState changes (from prop)
  useEffect(() => {
    setDisplay(initialDisplay);
  }, [initialDisplay]);
  
  // Tick interval for running timers
  useEffect(() => {
    // Only tick if timer is running
    if (!timerState || timerState.paused_at) {
      return;
    }
    
    const interval = setInterval(() => {
      setDisplay(calculateTimerDisplay(timerState));
    }, tickInterval);
    
    return () => clearInterval(interval);
  }, [timerState, tickInterval]);
  
  return display;
}
