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
  
  // Sequence guard — reject duplicate/stale events (server-attached seq)
  const lastSeqRef = useRef(0);
  
  // Handle incoming broadcast event — stable identity (no callback deps)
  const handleBroadcastEvent = useCallback((event: PlayBroadcastEvent) => {
    // Sequence guard: skip events we've already processed
    if (typeof event.seq === 'number') {
      if (event.seq <= lastSeqRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[useLiveSession] Skipping duplicate/stale event seq=%d (last=%d)', event.seq, lastSeqRef.current);
        }
        return;
      }
      lastSeqRef.current = event.seq;
    }

    setLastEventAt(event.timestamp);
    
    switch (event.type) {
      case 'state_change': {
        const payload = (event as StateChangeBroadcast).payload;
        
        if (payload.current_step_index !== undefined) {
          setCurrentStepIndex(payload.current_step_index);
        }
        if (payload.current_phase_index !== undefined) {
          setCurrentPhaseIndex(payload.current_phase_index);
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
            if (wasDisconnectedRef.current) {
              wasDisconnectedRef.current = false;
              if (process.env.NODE_ENV === 'development') {
                console.debug('[useLiveSession] Channel recovered — firing onReconnect');
              }
              onReconnectRef.current?.();
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
    };
  }, [sessionId, enabled, handleBroadcastEvent, supabase]);
  
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
