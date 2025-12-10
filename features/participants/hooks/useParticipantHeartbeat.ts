/**
 * useParticipantHeartbeat Hook
 * 
 * Maintains participant presence by sending periodic heartbeats.
 * Automatically marks participant as active/idle/disconnected.
 * Handles reconnection after network interruptions.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

interface UseParticipantHeartbeatOptions {
  participantToken: string;
  sessionId: string;
  enabled?: boolean;
  heartbeatInterval?: number; // milliseconds (default: 30s)
  idleThreshold?: number; // milliseconds (default: 2 min)
}

export function useParticipantHeartbeat({
  participantToken,
  sessionId,
  enabled = true,
  heartbeatInterval = 30000, // 30 seconds
  idleThreshold = 120000, // 2 minutes
}: UseParticipantHeartbeatOptions) {
  const supabase = createBrowserClient();
  const lastActivityRef = useRef<number>(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize lastActivityRef once
  useEffect(() => {
    if (lastActivityRef.current === 0) {
      lastActivityRef.current = Date.now();
    }
  }, []);
  
  // Update last activity timestamp
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);
  
  // Send heartbeat to server
  const sendHeartbeat = useCallback(async () => {
    if (!enabled) return;
    
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const isIdle = timeSinceActivity > idleThreshold;
    
    try {
      // Type assertion since migration not yet run
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('participants')
        .update({
          last_seen_at: new Date().toISOString(),
          status: isIdle ? 'idle' : 'active',
        })
        .eq('participant_token', participantToken)
        .eq('session_id', sessionId);
      
      if (error) {
        console.error('[Heartbeat] Failed to update:', error);
      }
    } catch (err) {
      console.error('[Heartbeat] Error:', err);
    }
  }, [enabled, participantToken, sessionId, idleThreshold, supabase]);
  
  // Track user activity
  useEffect(() => {
    if (!enabled) return;
    
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    activityEvents.forEach((event) => {
      window.addEventListener(event, recordActivity);
    });
    
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });
    };
  }, [enabled, recordActivity]);
  
  // Start heartbeat interval
  useEffect(() => {
    if (!enabled) return;
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Set up interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, heartbeatInterval);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [enabled, sendHeartbeat, heartbeatInterval]);
  
  // Handle page visibility (tab switching)
  useEffect(() => {
    if (!enabled) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to tab - send immediate heartbeat
        recordActivity();
        sendHeartbeat();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, recordActivity, sendHeartbeat]);
  
  // Mark as disconnected on unmount (cleanup)
  useEffect(() => {
    if (!enabled) return;
    
    return () => {
      // Mark as disconnected when component unmounts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('participants')
        .update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString(),
        })
        .eq('participant_token', participantToken)
        .eq('session_id', sessionId)
        .then(({ error }: { error: unknown }) => {
          if (error) {
            console.error('[Heartbeat] Failed to mark as disconnected:', error);
          }
        });
    };
  }, [enabled, participantToken, sessionId, supabase]);
  
  return {
    recordActivity,
    sendHeartbeat,
  };
}
