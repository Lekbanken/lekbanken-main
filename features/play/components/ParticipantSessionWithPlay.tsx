/**
 * Participant Session Client with Play Mode Integration
 * 
 * Extended version of the participant session client that includes
 * ParticipantPlayView for live gameplay.
 */

'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  getPublicSession, 
  getParticipantMe, 
  heartbeat, 
  rejoinSession,
  setParticipantReady,
  ApiError,
  type PlaySession,
  type Participant,
  type LobbyParticipant,
} from '@/features/play-participant/api';
import { 
  SessionStatusBadge, 
  ReconnectingBanner,
  SessionStatusMessage,
} from '@/components/play';
import { ParticipantPlayMode } from './ParticipantPlayMode';
import { ParticipantLobby } from './ParticipantLobby';
import { ActiveSessionShell } from './ActiveSessionShell';
import { SessionChatModal } from '@/features/play/components/SessionChatModal';
import { useSessionChat } from '@/features/play/hooks/useSessionChat';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UserGroupIcon, 
  ClockIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const SESSION_STORAGE_KEY = 'lekbanken_participant_token';
const ACTIVE_JOIN_PREF_KEY = 'lekbanken_active_join_pref';
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_BACKOFF = 30000; // 30 seconds max between retries

type ParticipantSessionWithPlayProps = {
  code: string;
};

export function ParticipantSessionWithPlayClient({ code }: ParticipantSessionWithPlayProps) {
  const router = useRouter();
  const t = useTranslations('play.participantView.lobby');
  const [session, setSession] = useState<PlaySession | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // 3-state connection model: connected / degraded / offline
  type ConnectionState = 'connected' | 'degraded' | 'offline';
  type DegradedReason = 'auth' | 'not-found' | 'temporary' | null;
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [degradedReason, setDegradedReason] = useState<DegradedReason>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Lobby readiness state
  const [lobbyParticipants, setLobbyParticipants] = useState<LobbyParticipant[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);

  // Retry button in-flight state
  const [retrying, setRetrying] = useState(false);

  // -----------------------------------------------------------------------
  // Refs for stable polling (avoid recreating loadData on every state change)
  // -----------------------------------------------------------------------
  const sessionRef = useRef<PlaySession | null>(null);
  const lobbyParticipantsRef = useRef<LobbyParticipant[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const backoffMsRef = useRef(POLL_INTERVAL);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionStateRef = useRef<ConnectionState>('connected');
  const degradedReasonRef = useRef<DegradedReason>(null);
  const reconnectingRef = useRef(false);

  // Keep refs in sync with state
  sessionRef.current = session;
  lobbyParticipantsRef.current = lobbyParticipants;
  reconnectAttemptsRef.current = reconnectAttempts;
  connectionStateRef.current = connectionState;
  degradedReasonRef.current = degradedReason;
  reconnectingRef.current = isReconnecting;

  // Active session mode UI state
  const [activeSessionOpen, setActiveSessionOpen] = useState(false);
  const [joinGateSecondsLeft, setJoinGateSecondsLeft] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const joinPrefKey = useMemo(() => `${ACTIVE_JOIN_PREF_KEY}_${code}`, [code]);

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(`${SESSION_STORAGE_KEY}_${code}`);
  }, [code]);

  // Load session and participant data (stable identity — reads mutable state via refs)
  const loadData = useCallback(async () => {
    if (inFlightRef.current) return; // Prevent overlapping requests
    inFlightRef.current = true;

    try {
      const token = getToken();
      const currentSession = sessionRef.current;

      // -----------------------------------------------------------------------
      // 1. Fetch public session info (always works, no auth needed)
      // -----------------------------------------------------------------------
      let sessionOk = false;
      let sessionFailIsNetwork = false;
      let retryAfterHint = 0; // ms, from Retry-After header

      try {
        const sessionRes = await getPublicSession(code);
        if (!mountedRef.current) return;
        setSession(sessionRes.session);
        sessionRef.current = sessionRes.session;

        // Update lobby participant list from polling
        if (Array.isArray(sessionRes.participants)) {
          setLobbyParticipants(sessionRes.participants as LobbyParticipant[]);
          lobbyParticipantsRef.current = sessionRes.participants as LobbyParticipant[];
        }

        sessionOk = true;
      } catch (err) {
        if (!mountedRef.current) return;
        if (err instanceof ApiError) {
          // Server responded with HTTP error (5xx, 429, etc.) — NOT network issue
          sessionFailIsNetwork = false;
          if (err.retryAfterMs > 0) retryAfterHint = err.retryAfterMs;
        } else {
          // TypeError: Failed to fetch — real network / DNS / timeout failure
          sessionFailIsNetwork = true;
        }
        if (!currentSession) {
          setError(err instanceof Error ? err.message : t('couldNotGetSession'));
        }
      }

      // -----------------------------------------------------------------------
      // 2. Fetch own participant info (requires token, may fail independently)
      // -----------------------------------------------------------------------
      let meOk = false;
      let meFailReason: DegradedReason = null;

      if (token) {
        try {
          const meRes = await getParticipantMe(code, token);
          if (!mountedRef.current) return;
          setParticipant(meRes.participant);
          meOk = true;

          // Sync own readiness from the lobby participant list
          const me = lobbyParticipantsRef.current.find((p) => p.id === meRes.participant?.id);
          if (me) setIsReady(me.isReady);
        } catch (err) {
          if (!mountedRef.current) return;
          // Classify the failure by HTTP status
          if (err instanceof ApiError) {
            const s = err.status;
            if (s === 401 || s === 403) {
              meFailReason = 'auth';
            } else if (s === 404) {
              meFailReason = 'not-found';
            } else {
              // 429, 5xx, or other server errors
              meFailReason = 'temporary';
            }
            if (err.retryAfterMs > 0) retryAfterHint = Math.max(retryAfterHint, err.retryAfterMs);
          } else {
            // Network error (fetch threw, not an HTTP response)
            meFailReason = 'temporary';
          }
        }
      } else {
        // No token → treat as "me not available" but not degraded
        meOk = true;
      }

      if (!mountedRef.current) return;

      // -----------------------------------------------------------------------
      // 3. Derive connection state
      //    offline   = session endpoint unreachable (real network failure only)
      //    degraded  = session reachable but /me fails, OR session 5xx (server error)
      //    connected = both OK
      // -----------------------------------------------------------------------
      // Helper: only update state when value actually changes (avoids re-renders)
      const setIfChanged = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, ref: React.MutableRefObject<T>, next: T) => {
        if (ref.current !== next) { setter(next); ref.current = next; }
      };

      if (sessionOk && meOk) {
        setIfChanged(setConnectionState, connectionStateRef, 'connected' as ConnectionState);
        setIfChanged(setDegradedReason, degradedReasonRef, null as DegradedReason);
        setError(null);
        if (reconnectingRef.current) { setIsReconnecting(false); reconnectingRef.current = false; }
        if (reconnectAttemptsRef.current !== 0) { setReconnectAttempts(0); reconnectAttemptsRef.current = 0; }
        setLastSyncedAt(new Date());
        // Success → reset backoff to base interval
        backoffMsRef.current = POLL_INTERVAL;
      } else if (sessionOk && !meOk) {
        // Session reachable but participant fetch failed
        setIfChanged(setConnectionState, connectionStateRef, 'degraded' as ConnectionState);
        setIfChanged(setDegradedReason, degradedReasonRef, meFailReason);
        setError(null);
        if (reconnectingRef.current) { setIsReconnecting(false); reconnectingRef.current = false; }
        if (reconnectAttemptsRef.current !== 0) { setReconnectAttempts(0); reconnectAttemptsRef.current = 0; }
        setLastSyncedAt(new Date()); // session data IS fresh
        // Mild backoff — respect Retry-After if present
        const base = Math.min(backoffMsRef.current * 1.5, MAX_BACKOFF);
        backoffMsRef.current = retryAfterHint > 0 ? Math.max(base, retryAfterHint) : base;
      } else if (currentSession) {
        if (sessionFailIsNetwork) {
          // True network failure (no HTTP response at all) → offline
          const currentStatus = currentSession.status;
          const connectivityRelevant =
            currentStatus === 'lobby' ||
            currentStatus === 'active' ||
            currentStatus === 'paused' ||
            currentStatus === 'locked';

          if (connectivityRelevant) {
            setIfChanged(setConnectionState, connectionStateRef, 'offline' as ConnectionState);
            setIfChanged(setDegradedReason, degradedReasonRef, null as DegradedReason);
            if (!reconnectingRef.current) { setIsReconnecting(true); reconnectingRef.current = true; }
            const next = reconnectAttemptsRef.current + 1;
            setReconnectAttempts(next);
            reconnectAttemptsRef.current = next;
          }
        } else {
          // Server responded with HTTP error (5xx/429) — NOT a network issue
          setIfChanged(setConnectionState, connectionStateRef, 'degraded' as ConnectionState);
          setIfChanged(setDegradedReason, degradedReasonRef, 'temporary' as DegradedReason);
          setError(null);
          if (reconnectingRef.current) { setIsReconnecting(false); reconnectingRef.current = false; }
        }
        // Error → exponential backoff with jitter, respect Retry-After
        const jitter = Math.random() * 1000;
        const base = Math.min(backoffMsRef.current * 2 + jitter, MAX_BACKOFF);
        backoffMsRef.current = retryAfterHint > 0 ? Math.max(base, retryAfterHint) : base;
      }

      setLoading(false);
    } finally {
      inFlightRef.current = false;
    }
  }, [code, getToken, t]); // Stable deps only — mutable state read via refs

  // Send heartbeat (stable — no state deps)
  const sendHeartbeat = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      await heartbeat(code, token);
    } catch {
      // Heartbeat failed, will be handled by polling
    }
  }, [code, getToken]);

  // Ref to always call the latest loadData without changing effect deps
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  // -----------------------------------------------------------------------
  // Single poller — setTimeout chain with adaptive backoff + visibility pause
  // Uses pollTimerRef to prevent double-resume on visibilitychange.
  // -----------------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    let heartbeatTimer: ReturnType<typeof setInterval>;
    let stopped = false;

    const clearPollTimer = () => {
      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const doPoll = async () => {
      await loadDataRef.current();
    };

    // Schedule next poll AFTER current one completes (no overlap)
    const schedulePoll = () => {
      if (stopped) return;
      clearPollTimer(); // Guarantee no stale timer
      pollTimerRef.current = setTimeout(async () => {
        pollTimerRef.current = null;
        if (stopped) return;
        await doPoll();
        schedulePoll();
      }, backoffMsRef.current);
    };

    // Initial load
    void doPoll().then(() => {
      if (!stopped) schedulePoll();
    });

    heartbeatTimer = setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL);

    // Pause polling when tab is hidden, resume immediately when visible.
    // Guard: only resume if no timer is already pending and no request in-flight.
    const handleVisibility = () => {
      if (stopped) return;
      if (document.hidden) {
        clearPollTimer();
      } else {
        // Tab regained focus — only poll if idle (no pending timer, no in-flight)
        if (pollTimerRef.current !== null || inFlightRef.current) return;
        void doPoll().then(() => {
          if (!stopped) schedulePoll();
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopped = true;
      mountedRef.current = false;
      clearPollTimer();
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [code, loadData, sendHeartbeat]); // loadData is stable (deps: code, getToken, t)

  // Try to rejoin if we have a token but no participant (fires once)
  const rejoinAttemptedRef = useRef(false);
  useEffect(() => {
    if (rejoinAttemptedRef.current) return;
    const token = getToken();
    if (session && token && !participant && !loading) {
      rejoinAttemptedRef.current = true;
      void (async () => {
        try {
          await rejoinSession({ sessionCode: code, participantToken: token });
          await loadDataRef.current();
        } catch {
          // Token might be invalid, clear it
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${code}`);
          }
        }
      })();
    }
  }, [session, participant, loading, code, getToken]);

  const handleLeave = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${code}`);
    }
    router.push('/play');
  }, [code, router]);

  /**
   * Unified retry / reconnect handler — behaviour depends on connectionState + degradedReason.
   * - offline           → full reload (loadData) with backoff reset
   * - degraded:auth     → attempt rejoin flow, redirect to /play on failure
   * - degraded:not-found → redirect to /play (no longer in session)
   * - degraded:temporary → lightweight /me re-fetch
   * Button is disabled while in-flight via `retrying` state.
   */
  const handleConnectionRetry = useCallback(async () => {
    if (retrying || inFlightRef.current) return;
    setRetrying(true);

    try {
      if (connectionState === 'offline') {
        // Full reload — reset backoff so next poll is immediate
        backoffMsRef.current = POLL_INTERVAL;
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;
        await loadData();
        return;
      }

      // Degraded states
      if (degradedReason === 'not-found') {
        // Not in session → redirect
        handleLeave();
        return;
      }

      const tkn = getToken();
      if (!tkn) {
        handleLeave();
        return;
      }

      if (degradedReason === 'auth') {
        // Auth issue → try rejoin flow first
        try {
          await rejoinSession({ sessionCode: code, participantToken: tkn });
          const meRes = await getParticipantMe(code, tkn);
          if (mountedRef.current) {
            setParticipant(meRes.participant);
            setConnectionState('connected');
            setDegradedReason(null);
            setLastSyncedAt(new Date());
            backoffMsRef.current = POLL_INTERVAL;
          }
        } catch {
          // Rejoin failed → clear token and redirect
          handleLeave();
        }
        return;
      }

      // temporary → lightweight /me re-fetch
      try {
        const meRes = await getParticipantMe(code, tkn);
        if (mountedRef.current) {
          setParticipant(meRes.participant);
          setConnectionState('connected');
          setDegradedReason(null);
          setLastSyncedAt(new Date());
          backoffMsRef.current = POLL_INTERVAL;
        }
      } catch {
        // Will self-heal on next poll cycle
      }
    } finally {
      if (mountedRef.current) setRetrying(false);
    }
  }, [connectionState, degradedReason, retrying, code, getToken, loadData, handleLeave]);

  const handleToggleReady = useCallback(async () => {
    const tkn = getToken();
    if (!tkn) return;
    // Optimistic update — instant UI feedback
    const prev = isReady;
    setIsReady(!prev);
    setReadyLoading(true);
    try {
      const res = await setParticipantReady(code, tkn, !prev);
      setIsReady(res.isReady);
    } catch {
      // Revert on failure — next poll will reconcile anyway
      setIsReady(prev);
    } finally {
      setReadyLoading(false);
    }
  }, [code, getToken, isReady]);

  const setJoinPreference = useCallback((value: 'join' | 'later') => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(joinPrefKey, value);
    } catch {
      // ignore
    }
  }, [joinPrefKey]);

  const getJoinPreference = useCallback((): 'join' | 'later' | null => {
    if (typeof window === 'undefined') return null;
    try {
      const v = sessionStorage.getItem(joinPrefKey);
      if (v === 'join' || v === 'later') return v;
      return null;
    } catch {
      return null;
    }
  }, [joinPrefKey]);

  // Check if we should offer Active Session Mode (game linked and participant joined)
  const hasGame = Boolean(session?.gameId);
  const token = getToken();
  const isSessionActive = session?.status === 'active';
  const canEnterActiveSession = Boolean(hasGame && participant && token && isSessionActive);

  const shouldRenderActiveSessionShell = Boolean(token && canEnterActiveSession && activeSessionOpen);

  // Enable chat in both the active session shell AND the lobby
  const isInLobby = Boolean(session?.status === 'lobby' && participant && token);
  const chatEnabled = Boolean(
    (shouldRenderActiveSessionShell || isInLobby) && token && session?.id,
  );

  const chat = useSessionChat({
    sessionId: session?.id ?? '',
    role: 'participant',
    participantToken: token ?? undefined,
    isOpen: chatOpen,
    enabled: chatEnabled,
  });

  const { markAllRead } = chat;
  useEffect(() => {
    if (chatOpen) markAllRead();
  }, [chatOpen, markAllRead]);

  // Gate: when host starts session, show 5s countdown + choices.
  useEffect(() => {
    if (!canEnterActiveSession) {
      setActiveSessionOpen(false);
      setJoinGateSecondsLeft(null);
      return;
    }

    const pref = getJoinPreference();
    if (pref === 'later') {
      setActiveSessionOpen(false);
      setJoinGateSecondsLeft(null);
      return;
    }

    if (activeSessionOpen) return;
    setJoinGateSecondsLeft(5);
  }, [activeSessionOpen, canEnterActiveSession, getJoinPreference]);

  useEffect(() => {
    if (joinGateSecondsLeft === null) return;
    if (joinGateSecondsLeft <= 0) {
      setJoinPreference('join');
      setJoinGateSecondsLeft(null);
      setActiveSessionOpen(true);
      return;
    }
    const t = window.setTimeout(() => setJoinGateSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [joinGateSecondsLeft, setJoinPreference]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
        <Card variant="elevated" className="w-full max-w-lg p-8 space-y-6">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  // Error state - session not found
  if (error && !session) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
        <Card variant="elevated" className="w-full max-w-md p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ExclamationCircleIcon className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {t('sessionNotFound')}
          </h1>
          <p className="text-muted-foreground">
            {t('checkCodeAndRetry')}
          </p>
          <Button variant="primary" onClick={() => router.push('/play')}>
            <ArrowLeftIcon className="h-4 w-4" />
            {t('backToStart')}
          </Button>
        </Card>
      </div>
    );
  }

  // Session ended state
  if (session?.status === 'ended' || session?.status === 'cancelled') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
        <Card variant="elevated" className="w-full max-w-md p-8 text-center space-y-4">
          <SessionStatusBadge status={session.status} size="lg" showIcon />
          <h1 className="text-xl font-semibold text-foreground">
            {t('sessionEnded')}
          </h1>
          <p className="text-muted-foreground">
            {t('thanksForParticipating')}
          </p>
          <Button variant="primary" onClick={() => router.push('/play')}>
            <ArrowLeftIcon className="h-4 w-4" />
            {t('joinNewSession')}
          </Button>
        </Card>
      </div>
    );
  }

  // Regular lobby view (no game or waiting)
  return (
    <div className="min-h-[80vh] flex flex-col px-4 py-6">

      {/* ------------------------------------------------------------------ */}
      {/* LOBBY MODE: rich waiting room with avatar grid + readiness          */}
      {/* ------------------------------------------------------------------ */}
      {session?.status === 'lobby' && participant ? (
        <>
          <ParticipantLobby
            code={code}
            sessionName={session.displayName}
            gameName={session.gameName}
            gameCoverUrl={session.gameCoverUrl}
            myParticipantId={participant.id}
            myDisplayName={participant.displayName}
            participants={lobbyParticipants}
            maxParticipants={
              (session.settings as { max_participants?: number } | null)
                ?.max_participants ?? null
            }
            isReady={isReady}
            readyLoading={readyLoading}
            onToggleReady={handleToggleReady}
            onLeave={handleLeave}
            onOpenChat={() => setChatOpen(true)}
            chatUnreadCount={chat.unreadCount}
            enableChat={isInLobby}
            status={session.status}
            connectionState={connectionState}
            degradedReason={degradedReason}
            lastSyncedAt={lastSyncedAt}
            onRetry={handleConnectionRetry}
            retrying={retrying}
          />

          {/* Chat modal for lobby */}
          {chatOpen && (
            <SessionChatModal
              open={chatOpen}
              onClose={() => setChatOpen(false)}
              role="participant"
              messages={chat.messages}
              error={chat.error}
              sending={chat.sending}
              onSend={chat.send}
            />
          )}
        </>
      ) : (
        <>
          {/* -------------------------------------------------------------- */}
          {/* FALLBACK: non-lobby statuses (active / paused / locked / etc)   */}
          {/* -------------------------------------------------------------- */}

          {/* Floating reconnect banner (only for non-lobby views) */}
          <ReconnectingBanner
            isReconnecting={isReconnecting}
            attemptCount={reconnectAttempts}
            maxAttempts={5}
            onRetry={handleConnectionRetry}
          />

          {/* Session header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="font-mono text-lg font-bold text-primary tracking-wider">
                {code}
              </span>
              <SessionStatusBadge status={session?.status ?? 'active'} size="sm" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {session?.displayName}
            </h1>
          </div>

          {/* Participant info */}
          {participant && (
            <Card variant="elevated" className="max-w-lg mx-auto w-full p-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">{t('participatingAs')}</p>
                <p className="text-xl font-semibold text-foreground">
                  {participant.displayName}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {participant.role === 'player' && t('rolePlayer')}
                  {participant.role === 'observer' && t('roleObserver')}
                  {participant.role === 'team_lead' && t('roleTeamLead')}
                  {participant.role === 'facilitator' && t('roleFacilitator')}
                </p>
              </div>
            </Card>
          )}

          {/* Session status */}
          {session?.status === 'paused' && (
            <SessionStatusMessage
              type="warning"
              title={t('sessionPaused')}
              message={t('awaitInstructions')}
              className="max-w-lg mx-auto w-full mb-6"
            />
          )}

          {session?.status === 'locked' && (
            <SessionStatusMessage
              type="info"
              title={t('sessionLocked')}
              message={t('noNewParticipants')}
              className="max-w-lg mx-auto w-full mb-6"
            />
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              <span>{t('participants', { count: session?.participantCount ?? 0 })}</span>
            </div>
            {session?.createdAt && (
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                <span>{t('started')}</span>
              </div>
            )}
          </div>

          {/* Main content area - waiting message */}
          <Card variant="default" className="max-w-2xl mx-auto w-full flex-1 p-8 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">{t('waitingForActivity')}</p>
              <p className="text-sm mt-2">
                {hasGame 
                  ? t('gameContentWillShow')
                  : t('contentWillShow')}
              </p>

              {canEnterActiveSession && !activeSessionOpen && getJoinPreference() === 'later' && (
                <div className="mt-6">
                  <Button variant="primary" onClick={() => {
                    setJoinPreference('join');
                    setActiveSessionOpen(true);
                  }}>
                    {t('joinSession')}
                  </Button>
                </div>
              )}

              {canEnterActiveSession && !activeSessionOpen && joinGateSecondsLeft !== null && (
                <div className="mt-6 space-y-3">
                  <div className="text-sm text-muted-foreground">{t('sessionIsActive')}</div>
                  <div className="text-2xl font-semibold text-foreground">
                    {t('countdownSeconds', { seconds: joinGateSecondsLeft })}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="primary"
                      onClick={() => {
                        setJoinPreference('join');
                        setJoinGateSecondsLeft(null);
                        setActiveSessionOpen(true);
                      }}
                    >
                      {t('joinNow')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setJoinPreference('later');
                        setJoinGateSecondsLeft(null);
                        setActiveSessionOpen(false);
                      }}
                    >
                      {t('notYet')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Leave button */}
          <div className="mt-8 text-center">
            <Button variant="ghost" size="sm" onClick={handleLeave}>
              {t('leaveSession')}
            </Button>
          </div>
        </>
      )}

      {shouldRenderActiveSessionShell && token && (
        <ActiveSessionShell
          role="participant"
          open
          title={session?.displayName ?? t('activeSession')}
          onRequestClose={() => setActiveSessionOpen(false)}
          chatUnreadCount={chat.unreadCount}
          onOpenChat={() => setChatOpen(true)}
        >
          <ReconnectingBanner
            isReconnecting={isReconnecting}
            attemptCount={reconnectAttempts}
            maxAttempts={5}
            onRetry={handleConnectionRetry}
          />

          <ParticipantPlayMode
            sessionCode={code}
            participantToken={token}
            showRole={true}
          />

          <SessionChatModal
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            role="participant"
            messages={chat.messages}
            error={chat.error}
            sending={chat.sending}
            onSend={chat.send}
          />
        </ActiveSessionShell>
      )}
    </div>
  );
}
