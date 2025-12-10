/**
 * useSessionControl Hook
 * 
 * Host controls for managing participant sessions.
 * Provides actions: pause, resume, lock, unlock, end.
 */

'use client';

import { useState, useCallback } from 'react';

type ControlAction = 'pause' | 'resume' | 'lock' | 'unlock' | 'end';

interface SessionControlOptions {
  sessionId: string;
  onSuccess?: (action: ControlAction) => void;
  onError?: (error: string) => void;
}

export function useSessionControl({
  sessionId,
  onSuccess,
  onError,
}: SessionControlOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const controlSession = useCallback(async (
    action: ControlAction,
    reason?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/participants/sessions/${sessionId}/control`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} session`);
      }
      
      if (onSuccess) {
        onSuccess(action);
      }
      
      return data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} session`;
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, onSuccess, onError]);
  
  const pauseSession = useCallback((reason?: string) => {
    return controlSession('pause', reason);
  }, [controlSession]);
  
  const resumeSession = useCallback((reason?: string) => {
    return controlSession('resume', reason);
  }, [controlSession]);
  
  const lockSession = useCallback((reason?: string) => {
    return controlSession('lock', reason);
  }, [controlSession]);
  
  const unlockSession = useCallback((reason?: string) => {
    return controlSession('unlock', reason);
  }, [controlSession]);
  
  const endSession = useCallback((reason?: string) => {
    return controlSession('end', reason);
  }, [controlSession]);
  
  return {
    loading,
    error,
    pauseSession,
    resumeSession,
    lockSession,
    unlockSession,
    endSession,
  };
}
