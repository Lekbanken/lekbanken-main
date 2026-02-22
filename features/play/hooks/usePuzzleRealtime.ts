/**
 * usePuzzleRealtime Hook
 * 
 * Manages real-time puzzle state synchronization for participants.
 * 
 * Features:
 * - Subscribes to puzzle_update broadcasts
 * - Maintains local puzzle state with optimistic updates
 * - Auto-syncs when host broadcasts changes
 * - Provides submit handlers that trigger broadcasts
 */

'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useLatestRef } from '@/hooks/useLatestRef';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getPlayChannelName, PLAY_BROADCAST_EVENTS, createPuzzleBroadcast } from '@/lib/realtime/play-broadcast';
import type { PuzzleBroadcast, PlayBroadcastEvent } from '@/types/play-runtime';

// =============================================================================
// Types
// =============================================================================

export interface PuzzleStateData {
  solved?: boolean;
  locked?: boolean;
  attempts?: Array<{ answer: string; correct: boolean; timestamp: string }>;
  currentValue?: number;
  checked?: string[];
  verified?: boolean;
  hints?: string[];
  showHint?: boolean;
  pending?: boolean;
  confirmed?: boolean;
  status?: string;
  [key: string]: unknown;
}

export interface UsePuzzleRealtimeOptions {
  /** Session ID */
  sessionId: string;
  /** Artifact ID for this puzzle */
  artifactId: string;
  /** Participant ID (for filtering updates) */
  participantId?: string;
  /** Team ID (for filtering updates) */
  teamId?: string;
  /** Initial puzzle state */
  initialState?: PuzzleStateData;
  /** Called when state changes (local or remote) */
  onStateChange?: (state: PuzzleStateData) => void;
  /** Called when puzzle is solved */
  onSolved?: () => void;
  /** Called when puzzle is locked by host */
  onLocked?: () => void;
  /** Called when puzzle is unlocked by host */
  onUnlocked?: () => void;
  /** Called when hint is revealed */
  onHintRevealed?: (hint: string) => void;
  /** Whether subscription is enabled */
  enabled?: boolean;
}

export interface UsePuzzleRealtimeResult {
  /** Current puzzle state */
  state: PuzzleStateData;
  /** Whether connected to realtime channel */
  connected: boolean;
  /** Update local state (optimistic) */
  updateState: (updates: Partial<PuzzleStateData>) => void;
  /** Broadcast state change to all participants */
  broadcastStateChange: (updates: Partial<PuzzleStateData>) => Promise<void>;
  /** Whether puzzle is solved */
  isSolved: boolean;
  /** Whether puzzle is locked */
  isLocked: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function usePuzzleRealtime({
  sessionId,
  artifactId,
  participantId,
  teamId,
  initialState = {},
  onStateChange,
  onSolved,
  onLocked,
  onUnlocked,
  onHintRevealed,
  enabled = true,
}: UsePuzzleRealtimeOptions): UsePuzzleRealtimeResult {
  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // State
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<PuzzleStateData>(initialState);
  
  // Supabase client
  const supabase = useMemo(() => createBrowserClient(), []);

  // Callback refs — stable identity, prevents channel churn
  const onStateChangeRef = useLatestRef(onStateChange);
  const onSolvedRef = useLatestRef(onSolved);
  const onLockedRef = useLatestRef(onLocked);
  const onUnlockedRef = useLatestRef(onUnlocked);
  const onHintRevealedRef = useLatestRef(onHintRevealed);
  
  // Handle incoming puzzle broadcast
  const handlePuzzleBroadcast = useCallback((payload: PuzzleBroadcast['payload']) => {
    // Filter: only process updates for this artifact
    if (payload.artifact_id !== artifactId) return;
    
    // Filter: if participant/team specified, only process relevant updates
    if (payload.participant_id && participantId && payload.participant_id !== participantId) return;
    if (payload.team_id && teamId && payload.team_id !== teamId) return;
    
    switch (payload.action) {
      case 'state_changed': {
        if (payload.state) {
          setState(prev => {
            const newState = { ...prev, ...payload.state };
            onStateChangeRef.current?.(newState);
            
            // Check if puzzle was just solved
            if (!prev.solved && newState.solved) {
              onSolvedRef.current?.();
            }
            
            return newState;
          });
        }
        break;
      }
      
      case 'locked': {
        setState(prev => {
          const newState = { ...prev, locked: true };
          onStateChangeRef.current?.(newState);
          onLockedRef.current?.();
          return newState;
        });
        break;
      }
      
      case 'unlocked': {
        setState(prev => {
          const newState = { ...prev, locked: false };
          onStateChangeRef.current?.(newState);
          onUnlockedRef.current?.();
          return newState;
        });
        break;
      }
      
      case 'hint_revealed': {
        const hint = payload.message || '';
        setState(prev => {
          const hints = prev.hints || [];
          const newState = { 
            ...prev, 
            hints: [...hints, hint],
            showHint: true,
          };
          onStateChangeRef.current?.(newState);
          onHintRevealedRef.current?.(hint);
          return newState;
        });
        break;
      }
      
      case 'reset': {
        setState(_ => {
          const newState: PuzzleStateData = { solved: false, locked: false };
          onStateChangeRef.current?.(newState);
          return newState;
        });
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks via stable refs
  }, [artifactId, participantId, teamId]);
  
  // Handle broadcast event
  const handleBroadcastEvent = useCallback((event: PlayBroadcastEvent) => {
    if (event.type === 'puzzle_update') {
      handlePuzzleBroadcast((event as PuzzleBroadcast).payload);
    }
  }, [handlePuzzleBroadcast]);
  
  // Subscribe to channel
  useEffect(() => {
    if (!enabled || !sessionId) return;
    
    const channelName = getPlayChannelName(sessionId);
    const channel = supabase.channel(channelName);
    
    channel.on(
      'broadcast',
      { event: PLAY_BROADCAST_EVENTS.PLAY_EVENT },
      (payload) => {
        if (payload.payload) {
          handleBroadcastEvent(payload.payload as PlayBroadcastEvent);
        }
      }
    );
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnected(false);
      }
    });
    
    channelRef.current = channel;
    
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setConnected(false);
    };
  }, [enabled, sessionId, supabase, handleBroadcastEvent]);
  
  // Update local state (optimistic)
  const updateState = useCallback((updates: Partial<PuzzleStateData>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      onStateChangeRef.current?.(newState);
      return newState;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- callback via stable ref
  }, []);
  
  // Broadcast state change
  const broadcastStateChange = useCallback(async (updates: Partial<PuzzleStateData>) => {
    if (!channelRef.current || !connected) {
      console.warn('[usePuzzleRealtime] Not connected, cannot broadcast');
      return;
    }
    
    // Optimistic update
    updateState(updates);
    
    // Broadcast
    const broadcast = createPuzzleBroadcast({
      action: 'state_changed',
      artifact_id: artifactId,
      participant_id: participantId,
      team_id: teamId,
      state: updates,
    });
    
    await channelRef.current.send({
      type: 'broadcast',
      event: PLAY_BROADCAST_EVENTS.PLAY_EVENT,
      payload: broadcast,
    });
  }, [connected, artifactId, participantId, teamId, updateState]);
  
  // Computed values
  const isSolved = state.solved === true;
  const isLocked = state.locked === true;
  
  return {
    state,
    connected,
    updateState,
    broadcastStateChange,
    isSolved,
    isLocked,
  };
}
