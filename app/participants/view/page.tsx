/**
 * Participant View Page
 * 
 * Anonymous participant interface - displays session info and maintains presence via heartbeat.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useParticipantHeartbeat } from '@/features/participants/hooks/useParticipantHeartbeat';
import { useParticipantBroadcast, type BroadcastEvent } from '@/features/participants/hooks/useParticipantBroadcast';
import { resolveUiState } from '@/lib/play/ui-state';

interface SessionInfo {
  sessionCode: string;
  displayName: string;
  participantToken: string;
  sessionId: string;
}

type ParticipantMeResponse = {
  participant: {
    id: string;
    displayName: string;
    role: string | null;
    status: string;
  };
  session: {
    id: string;
    sessionCode: string;
    displayName: string;
    description: string | null;
    status: string;
    gameId: string | null;
    participantCount: number;
    currentStepIndex: number | null;
    currentPhaseIndex: number | null;
    timerState: unknown | null;
    boardState: { message?: string | null } | null;
    settings: Record<string, unknown> | null;
    startedAt?: string | null;
    pausedAt?: string | null;
    endedAt?: string | null;
  };
};

type GameContent = {
  steps: Array<{
    id: string;
    index: number;
    title: string;
    description: string;
    participantPrompt?: string;
    boardText?: string;
  }>;
  phases: Array<{
    id: string;
    index: number;
    name: string;
  }>;
};

const POLL_INTERVAL = 5000;

export default function ParticipantViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tLobby = useTranslations('play.participantView.lobby');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastMessages, setBroadcastMessages] = useState<string[]>([]);
  const [participantStatus, setParticipantStatus] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<ParticipantMeResponse['session'] | null>(null);
  const [gameContent, setGameContent] = useState<GameContent | null>(null);
  const [lastPollAt, setLastPollAt] = useState<string | null>(null);
  const [lastRealtimeAt, setLastRealtimeAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatBroadcastMessage = (event: BroadcastEvent): string | null => {
    if (event.type === 'host_message') {
      const message = event.payload?.message;
      if (typeof message === 'string' && message.trim()) return message;
      return tLobby('events.host_message');
    }

    if (event.type === 'participant_joined' || event.type === 'participant_left') {
      const name = event.payload?.displayName;
      if (typeof name === 'string' && name.trim()) {
        return tLobby(`events.${event.type}` as Parameters<typeof tLobby>[0], { name });
      }
    }

    return tLobby(`events.${event.type}` as Parameters<typeof tLobby>[0]);
  };
  
  // Load session info from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('participant_token');
    const storedSessionId = localStorage.getItem('participant_session_id');
    const storedSessionCode = localStorage.getItem('participant_session_code');
    const storedDisplayName = localStorage.getItem('participant_display_name');
    const storedStatus = localStorage.getItem('participant_status');
    
    if (!storedToken || !storedSessionId || !storedSessionCode || !storedDisplayName) {
      const code = searchParams.get('code');
      router.push(code ? `/participants/join?code=${code}` : '/participants/join');
      return;
    }
    
    setSessionInfo({
      participantToken: storedToken,
      sessionId: storedSessionId,
      sessionCode: storedSessionCode,
      displayName: storedDisplayName,
    });
    setParticipantStatus(storedStatus);
    setLoading(false);
  }, [router, searchParams]);
  
  // Maintain heartbeat
  useParticipantHeartbeat({
    sessionId: sessionInfo?.sessionId || '',
    participantToken: sessionInfo?.participantToken || '',
    enabled: !!sessionInfo,
  });
  
  // Listen for broadcast events
  const handleBroadcastEvent = (event: BroadcastEvent) => {
    setLastRealtimeAt(new Date().toISOString());
    const message = formatBroadcastMessage(event);
    if (message) {
      setBroadcastMessages(prev => [...prev, message].slice(-5));
    }
  };
  
  useParticipantBroadcast({
    sessionId: sessionInfo?.sessionId || '',
    onEvent: handleBroadcastEvent,
    enabled: !!sessionInfo,
  });

  useEffect(() => {
    if (!sessionInfo) return;
    let cancelled = false;

    const fetchMe = async () => {
      try {
        const res = await fetch(`/api/play/me?session_code=${encodeURIComponent(sessionInfo.sessionCode)}`, {
          headers: { 'x-participant-token': sessionInfo.participantToken },
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || tLobby('couldNotGetSession'));
        if (!cancelled) {
          setSessionState(data.session as ParticipantMeResponse['session']);
          setParticipantStatus(data.participant?.status ?? null);
          setError(null);
          setLastPollAt(new Date().toISOString());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : tLobby('couldNotGetSession'));
          setLastPollAt(new Date().toISOString());
        }
      }
    };

    void fetchMe();
    const id = setInterval(fetchMe, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionInfo, tLobby]);

  useEffect(() => {
    if (!sessionInfo) return;
    let cancelled = false;

    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/play/sessions/${sessionInfo.sessionId}/game`, {
          headers: { 'x-participant-token': sessionInfo.participantToken },
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) return;
        if (!cancelled) {
          setGameContent({
            steps: data.steps ?? [],
            phases: data.phases ?? [],
          });
        }
      } catch {
        // Ignore
      }
    };

    void fetchGame();
    return () => {
      cancelled = true;
    };
  }, [sessionInfo]);

  const currentStep = useMemo(() => {
    if (!gameContent || !sessionState) return null;
    const index = sessionState.currentStepIndex ?? 0;
    return gameContent.steps[index] ?? null;
  }, [gameContent, sessionState]);

  const uiState = resolveUiState({
    status: sessionState?.status,
    startedAt: sessionState?.startedAt ?? null,
    pausedAt: sessionState?.pausedAt ?? null,
    endedAt: sessionState?.endedAt ?? null,
    lastPollAt,
    lastRealtimeAt,
  });

  const bannerCopy = {
    waiting: tLobby('banner.waiting'),
    paused: tLobby('banner.paused'),
    locked: tLobby('banner.locked'),
    ended: tLobby('banner.ended'),
    degraded: tLobby('banner.degraded'),
    offline: tLobby('banner.offline'),
    none: null,
  } as const;

  const handleLeaveSession = () => {
    localStorage.removeItem('participant_token');
    localStorage.removeItem('participant_session_id');
    localStorage.removeItem('participant_session_code');
    localStorage.removeItem('participant_display_name');
    localStorage.removeItem('participant_status');
    router.push('/participants/join');
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">{tLobby('loadingSession')}</p>
        </div>
      </div>
    );
  }
  
  if (!sessionInfo) return null;

  const isPending = participantStatus === 'idle';

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{sessionInfo.displayName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {tLobby('sessionCodeLabel')}{' '}
                <span className="font-mono font-semibold">{sessionInfo.sessionCode}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    uiState.connection === 'connected'
                      ? 'bg-emerald-500'
                      : uiState.connection === 'offline'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {tLobby(`connection.${uiState.connection}` as Parameters<typeof tLobby>[0])}
                </span>
              </div>
              <button
                onClick={handleLeaveSession}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
              >
                {tLobby('leaveSession')}
              </button>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="p-4 border-destructive bg-destructive/10 text-sm text-destructive">
            {error}
          </Card>
        )}

        {broadcastMessages.length > 0 && (
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{tLobby('updatesTitle')}</h2>
            <div className="space-y-2">
              {broadcastMessages.map((message, index) => (
                <div key={index} className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {message}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{tLobby('statusLabel')}</p>
              <h2 className="text-lg font-semibold text-foreground">
                {tLobby(`statusTitle.${uiState.uiMode}` as Parameters<typeof tLobby>[0])}
              </h2>
            </div>
            <Badge variant={uiState.uiMode === 'live' ? 'default' : uiState.uiMode === 'paused' ? 'warning' : 'secondary'}>
              {tLobby(`statusBadge.${uiState.uiMode}` as Parameters<typeof tLobby>[0])}
            </Badge>
          </div>

          {isPending && (
            <div className="rounded-md bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              {tLobby('pendingApproval')}
            </div>
          )}

          {!isPending && bannerCopy[uiState.banner] && (
            <div className="rounded-md bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              {bannerCopy[uiState.banner]}
            </div>
          )}

          {uiState.uiMode === 'live' && currentStep && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{tLobby('nowTitle')}</p>
              <p className="text-base font-semibold text-foreground">{currentStep.title}</p>
              <p className="text-sm text-muted-foreground">
                {currentStep.participantPrompt || currentStep.boardText || currentStep.description}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
