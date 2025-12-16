'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { getParticipantMe, heartbeat, joinSession, rejoinSession } from './api';
import { clearParticipantAuth, loadParticipantAuth, saveParticipantAuth, type StoredParticipant } from './tokenStorage';

type JoinState = 'idle' | 'joining' | 'joined' | 'error';

export function useParticipantSession(sessionCode: string) {
  const [auth, setAuth] = useState<StoredParticipant | null>(() => loadParticipantAuth(sessionCode));
  const [joinState, setJoinState] = useState<JoinState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMe = useCallback(async () => {
    if (!auth?.token) return;
    setIsLoading(true);
    try {
      const res = await getParticipantMe(sessionCode, auth.token);
      setParticipant(res.participant);
      setSession(res.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta deltagare');
    } finally {
      setIsLoading(false);
    }
  }, [auth?.token, sessionCode]);

  // Heartbeat + polling
  useEffect(() => {
    if (!auth?.token) return;
    void fetchMe();
    const poll = setInterval(() => {
      void fetchMe();
      void heartbeat(sessionCode, auth.token);
    }, 3000);
    return () => clearInterval(poll);
  }, [auth?.token, fetchMe, sessionCode]);

  const join = useCallback(async (displayName: string) => {
    setJoinState('joining');
    setError(null);
    try {
      const res = await joinSession({ sessionCode, displayName });
      const stored: StoredParticipant = {
        token: res.participant.token,
        participantId: res.participant.id,
        sessionId: res.participant.sessionId,
        displayName: res.participant.displayName,
      };
      saveParticipantAuth(sessionCode, stored);
      setAuth(stored);
      setParticipant(res.participant);
      setSession(res.session);
      setJoinState('joined');
    } catch (err) {
      setJoinState('error');
      setError(err instanceof Error ? err.message : 'Kunde inte gå med');
      throw err;
    }
  }, [sessionCode]);

  const tryRejoin = useCallback(async () => {
    const stored = loadParticipantAuth(sessionCode);
    if (!stored) return false;
    try {
      await rejoinSession({ sessionCode, participantToken: stored.token });
      setAuth(stored);
      await fetchMe();
      return true;
    } catch {
      clearParticipantAuth(sessionCode);
      setAuth(null);
      return false;
    }
  }, [sessionCode, fetchMe]);

  const leave = useCallback(() => {
    clearParticipantAuth(sessionCode);
    setAuth(null);
    setJoinState('idle');
    setParticipant(null);
    setSession(null);
  }, [sessionCode]);

  const status = useMemo(() => session?.status, [session]);

  return {
    auth,
    participant,
    session,
    status,
    joinState,
    error,
    isLoading,
    join,
    tryRejoin,
    leave,
    refresh: fetchMe,
  };
}
