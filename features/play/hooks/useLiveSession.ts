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
  
  // Handle incoming broadcast event
  const handleBroadcastEvent = useCallback((event: PlayBroadcastEvent) => {
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
        
        onStateChange?.(payload as Partial<SessionRuntimeState>);
        break;
      }
      
      case 'timer_update': {
        const payload = (event as TimerBroadcast).payload;
        setTimerState(payload.timer_state);
        setTimerDisplay(calculateTimerDisplay(payload.timer_state));
        onTimerUpdate?.(payload.action, payload.timer_state);
        break;
      }
      
      case 'role_update': {
        const payload = (event as RoleBroadcast).payload;
        onRoleUpdate?.(payload);
        break;
      }
      
      case 'board_update': {
        const payload = (event as BoardBroadcast).payload;
        setBoardState((prev) => ({
          ...prev,
          message: payload.message ?? prev?.message,
          overrides: payload.overrides ?? prev?.overrides,
        }));
        onBoardUpdate?.(payload);
        break;
      }

      case 'turn_update': {
        const payload = (event as TurnBroadcast).payload;
        setNextStarterParticipantId(payload.next_starter_participant_id);
        onTurnUpdate?.(payload);
        break;
      }

      case 'artifact_update': {
        const payload = (event as ArtifactBroadcast).payload;
        onArtifactUpdate?.(payload);
        break;
      }

      case 'decision_update': {
        const payload = (event as DecisionBroadcast).payload;
        onDecisionUpdate?.(payload);
        break;
      }

      case 'outcome_update': {
        const payload = (event as OutcomeBroadcast).payload;
        onOutcomeUpdate?.(payload);
        break;
      }

      case 'countdown': {
        const payload = (event as CountdownBroadcast).payload;
        onCountdown?.(payload);
        break;
      }
    }
  }, [onStateChange, onTimerUpdate, onRoleUpdate, onBoardUpdate, onTurnUpdate, onArtifactUpdate, onDecisionUpdate, onOutcomeUpdate, onCountdown]);
  
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
        switch (status) {
          case 'SUBSCRIBED':
            setConnected(true);
            setReconnecting(false);
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setConnected(false);
            setReconnecting(true);
            break;
          case 'CLOSED':
            setConnected(false);
            setReconnecting(false);
            break;
        }
      });
    
    channelRef.current = channel;
    
    return () => {
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
