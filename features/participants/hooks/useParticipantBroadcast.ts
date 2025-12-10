/**
 * useParticipantBroadcast Hook
 * 
 * Real-time broadcast channel for participant events.
 * Notifies all participants about session changes (pause/resume, host messages, etc).
 */

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface BroadcastEvent {
  type: 'session_paused' | 'session_resumed' | 'session_ended' | 'session_locked' | 'session_unlocked' | 'host_message' | 'participant_joined' | 'participant_left' | 'role_changed';
  payload?: Record<string, unknown>;
  timestamp: string;
}

interface UseParticipantBroadcastOptions {
  sessionId: string;
  onEvent?: (event: BroadcastEvent) => void;
  enabled?: boolean;
}

export function useParticipantBroadcast({
  sessionId,
  onEvent,
  enabled = true,
}: UseParticipantBroadcastOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);
  const supabase = createBrowserClient();
  
  // Broadcast an event to all participants
  const broadcast = useCallback(async (event: Omit<BroadcastEvent, 'timestamp'>) => {
    if (!channelRef.current || !connected) {
      console.warn('[Broadcast] Channel not connected, event not sent:', event);
      return false;
    }
    
    const fullEvent: BroadcastEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'participant_event',
      payload: fullEvent,
    });
    
    return true;
  }, [connected]);
  
  // Set up broadcast channel
  useEffect(() => {
    if (!enabled) return;
    
    const broadcastChannel = supabase.channel(`session:${sessionId}`, {
      config: {
        broadcast: { self: true }, // Receive own broadcasts for confirmation
      },
    });
    
    // Subscribe to broadcast events
    broadcastChannel
      .on('broadcast', { event: 'participant_event' }, (payload) => {
        const event = payload.payload as BroadcastEvent;
        
        if (onEvent) {
          onEvent(event);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnected(false);
        }
      });
    
    channelRef.current = broadcastChannel;
    
    return () => {
      broadcastChannel.unsubscribe();
      channelRef.current = null;
      setConnected(false);
    };
  }, [sessionId, enabled, onEvent, supabase]);
  
  return {
    broadcast,
    connected,
  };
}
