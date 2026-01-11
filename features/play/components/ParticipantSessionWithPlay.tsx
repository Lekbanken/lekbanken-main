/**
 * Participant Session Client with Play Mode Integration
 * 
 * Extended version of the participant session client that includes
 * ParticipantPlayView for live gameplay.
 */

'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  getPublicSession, 
  getParticipantMe, 
  heartbeat, 
  rejoinSession,
  type PlaySession,
  type Participant,
} from '@/features/play-participant/api';
import { 
  SessionStatusBadge, 
  ReconnectingBanner,
  SessionStatusMessage,
} from '@/components/play';
import { ParticipantPlayMode } from './ParticipantPlayMode';
import { ActiveSessionShell } from './ActiveSessionShell';
import { SessionChatDrawer } from '@/features/play/components/SessionChatDrawer';
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

  // Active session mode UI state
  const [activeSessionOpen, setActiveSessionOpen] = useState(false);
  const [joinGateSecondsLeft, setJoinGateSecondsLeft] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const joinPrefKey = useMemo(() => `${ACTIVE_JOIN_PREF_KEY}_${code}`, [code]);

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(`${SESSION_STORAGE_KEY}_${code}`);
  }, [code]);

  // Load session and participant data
  const loadData = useCallback(async () => {
    const token = getToken();
    
    try {
      // Get public session info
      const sessionRes = await getPublicSession(code);
      setSession(sessionRes.session);

      // If we have a token, get our participant info
      if (token) {
        const meRes = await getParticipantMe(code, token);
        setParticipant(meRes.participant);
      }

      setError(null);
      setIsReconnecting(false);
      setReconnectAttempts(0);
    } catch (err) {
      // If we were connected before, show reconnecting state
      if (session) {
        setIsReconnecting(true);
        setReconnectAttempts((prev) => prev + 1);
      } else {
        setError(err instanceof Error ? err.message : t('couldNotGetSession'));
      }
    } finally {
      setLoading(false);
    }
  }, [code, getToken, session]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      await heartbeat(code, token);
    } catch {
      // Heartbeat failed, will be handled by polling
    }
  }, [code, getToken]);

  // Initial load and polling
  useEffect(() => {
    void loadData();

    const pollInterval = setInterval(() => void loadData(), POLL_INTERVAL);
    const heartbeatInterval = setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
    };
  }, [loadData, sendHeartbeat]);

  // Try to rejoin if we have a token but no participant
  useEffect(() => {
    const token = getToken();
    if (session && token && !participant && !loading) {
      void (async () => {
        try {
          await rejoinSession({ sessionCode: code, participantToken: token });
          await loadData();
        } catch {
          // Token might be invalid, clear it
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${code}`);
          }
        }
      })();
    }
  }, [session, participant, loading, code, getToken, loadData]);

  const handleRetry = () => {
    setReconnectAttempts(0);
    void loadData();
  };

  const handleLeave = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${code}`);
    }
    router.push('/play');
  };

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

  const chat = useSessionChat({
    sessionId: session?.id ?? '',
    role: 'participant',
    participantToken: token ?? undefined,
    isOpen: chatOpen,
    enabled: Boolean(shouldRenderActiveSessionShell && token && session?.id),
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
      {/* Reconnecting banner */}
      <ReconnectingBanner
        isReconnecting={isReconnecting}
        attemptCount={reconnectAttempts}
        maxAttempts={5}
        onRetry={handleRetry}
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
              <div className="text-2xl font-semibold text-foreground">{joinGateSecondsLeft}s</div>
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
            onRetry={handleRetry}
          />

          <ParticipantPlayMode
            sessionCode={code}
            participantToken={token}
            showRole={true}
          />

          <SessionChatDrawer
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
