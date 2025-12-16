/**
 * usePlayBroadcast Hook
 * 
 * Hook for facilitators to broadcast play runtime events.
 * Manages connection lifecycle and provides typed broadcast methods.
 */

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { PlayBroadcaster } from '@/lib/realtime/play-broadcast';
import type { TimerState, BoardState } from '@/types/play-runtime';

// =============================================================================
// Types
// =============================================================================

export interface UsePlayBroadcastOptions {
  /** Session ID to broadcast to */
  sessionId: string;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Whether subscription is enabled */
  enabled?: boolean;
}

export interface UsePlayBroadcastResult {
  /** Is connected to broadcast channel */
  connected: boolean;
  /** Manually connect to channel */
  connect: () => Promise<boolean>;
  /** Disconnect from channel */
  disconnect: () => void;
  /** Broadcast state change */
  broadcastStateChange: (payload: {
    current_step_index?: number;
    current_phase_index?: number;
    status?: string;
  }) => Promise<boolean>;
  /** Broadcast timer update */
  broadcastTimerUpdate: (
    action: 'start' | 'pause' | 'resume' | 'reset',
    timerState: TimerState | null
  ) => Promise<boolean>;
  /** Broadcast role update */
  broadcastRoleUpdate: (
    action: 'assigned' | 'revealed',
    participantId: string,
    roleId?: string,
    roleName?: string
  ) => Promise<boolean>;
  /** Broadcast board update */
  broadcastBoardUpdate: (
    message?: string,
    overrides?: BoardState['overrides']
  ) => Promise<boolean>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function usePlayBroadcast({
  sessionId,
  autoConnect = true,
  enabled = true,
}: UsePlayBroadcastOptions): UsePlayBroadcastResult {
  const broadcasterRef = useRef<PlayBroadcaster | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Create broadcaster on mount
  useEffect(() => {
    if (!enabled || !sessionId) return;
    
    const broadcaster = new PlayBroadcaster({ sessionId, selfBroadcast: true });
    broadcasterRef.current = broadcaster;
    
    if (autoConnect) {
      broadcaster.connect().then(setConnected);
    }
    
    return () => {
      broadcaster.disconnect();
      broadcasterRef.current = null;
      setConnected(false);
    };
  }, [sessionId, autoConnect, enabled]);
  
  // Manual connect
  const connect = useCallback(async (): Promise<boolean> => {
    if (!broadcasterRef.current) return false;
    const result = await broadcasterRef.current.connect();
    setConnected(result);
    return result;
  }, []);
  
  // Disconnect
  const disconnect = useCallback((): void => {
    if (broadcasterRef.current) {
      broadcasterRef.current.disconnect();
      setConnected(false);
    }
  }, []);
  
  // Broadcast state change
  const broadcastStateChange = useCallback(
    async (payload: {
      current_step_index?: number;
      current_phase_index?: number;
      status?: string;
    }): Promise<boolean> => {
      if (!broadcasterRef.current) return false;
      return broadcasterRef.current.sendStateChange(payload);
    },
    []
  );
  
  // Broadcast timer update
  const broadcastTimerUpdate = useCallback(
    async (
      action: 'start' | 'pause' | 'resume' | 'reset',
      timerState: TimerState | null
    ): Promise<boolean> => {
      if (!broadcasterRef.current) return false;
      return broadcasterRef.current.sendTimerUpdate(action, timerState);
    },
    []
  );
  
  // Broadcast role update
  const broadcastRoleUpdate = useCallback(
    async (
      action: 'assigned' | 'revealed',
      participantId: string,
      roleId?: string,
      roleName?: string
    ): Promise<boolean> => {
      if (!broadcasterRef.current) return false;
      return broadcasterRef.current.sendRoleUpdate(action, participantId, roleId, roleName);
    },
    []
  );
  
  // Broadcast board update
  const broadcastBoardUpdate = useCallback(
    async (
      message?: string,
      overrides?: BoardState['overrides']
    ): Promise<boolean> => {
      if (!broadcasterRef.current) return false;
      return broadcasterRef.current.sendBoardUpdate(message, overrides);
    },
    []
  );
  
  return {
    connected,
    connect,
    disconnect,
    broadcastStateChange,
    broadcastTimerUpdate,
    broadcastRoleUpdate,
    broadcastBoardUpdate,
  };
}
