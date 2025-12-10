/**
 * useParticipantRejoin Hook
 * 
 * Handles automatic rejoin when participant returns to session.
 * Validates stored token and restores participant state.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

interface RejoinState {
  loading: boolean;
  error: string | null;
  rejoined: boolean;
}

interface RejoinResult {
  participant: {
    id: string;
    displayName: string;
    role: string;
    status: string;
    joinedAt: string;
    progress: unknown;
    token: string;
  };
  session: {
    id: string;
    sessionCode: string;
    displayName: string;
    status: string;
    settings: unknown;
  };
}

interface UseParticipantRejoinOptions {
  enabled?: boolean;
  onSuccess?: (result: RejoinResult) => void;
  onError?: (error: string) => void;
}

export function useParticipantRejoin({
  enabled = true,
  onSuccess,
  onError,
}: UseParticipantRejoinOptions = {}) {
  const [state, setState] = useState<RejoinState>({
    loading: false,
    error: null,
    rejoined: false,
  });
  
  const clearStoredSession = useCallback(() => {
    localStorage.removeItem('participant_token');
    localStorage.removeItem('participant_session_id');
    localStorage.removeItem('participant_session_code');
    localStorage.removeItem('participant_display_name');
  }, []);
  
  const attemptRejoin = useCallback(async () => {
    if (!enabled) return null;
    
    // Check for stored session data
    const storedToken = localStorage.getItem('participant_token');
    const storedSessionId = localStorage.getItem('participant_session_id');
    
    if (!storedToken || !storedSessionId) {
      return null; // No session to rejoin
    }
    
    setState({ loading: true, error: null, rejoined: false });
    
    try {
      const response = await fetch('/api/participants/sessions/rejoin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantToken: storedToken,
          sessionId: storedSessionId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 403 || response.status === 410) {
          // Blocked, kicked, or ended session - clear localStorage
          clearStoredSession();
        }
        
        if (response.status === 401) {
          // Token expired - clear and allow fresh join
          clearStoredSession();
        }
        
        throw new Error(data.error || 'Failed to rejoin session');
      }
      
      // Update localStorage with fresh data
      localStorage.setItem('participant_token', data.participant.token);
      localStorage.setItem('participant_session_id', data.session.id);
      localStorage.setItem('participant_session_code', data.session.sessionCode);
      localStorage.setItem('participant_display_name', data.participant.displayName);
      
      setState({ loading: false, error: null, rejoined: true });
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      return data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rejoin';
      setState({ loading: false, error: errorMessage, rejoined: false });
      
      if (onError) {
        onError(errorMessage);
      }
      
      return null;
    }
  }, [enabled, onSuccess, onError, clearStoredSession]);
  
  // Auto-attempt rejoin on mount if enabled
  useEffect(() => {
    if (enabled) {
      attemptRejoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount
  
  return {
    ...state,
    attemptRejoin,
    clearStoredSession,
  };
}
