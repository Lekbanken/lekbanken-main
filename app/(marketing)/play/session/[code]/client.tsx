'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const POLL_INTERVAL = 3000; // 3 seconds

type ParticipantSessionClientProps = {
  code: string;
};

export function ParticipantSessionClient({ code }: ParticipantSessionClientProps) {
  const router = useRouter();
  const [session, setSession] = useState<PlaySession | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const getToken = useCallback(() => {
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
        setError(err instanceof Error ? err.message : 'Kunde inte hämta session');
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
          sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${code}`);
        }
      })();
    }
  }, [session, participant, loading, code, getToken, loadData]);

  const handleRetry = () => {
    setReconnectAttempts(0);
    void loadData();
  };

  const handleLeave = () => {
    sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${code}`);
    router.push('/play');
  };

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
            Session hittades inte
          </h1>
          <p className="text-muted-foreground">
            Kontrollera att sessionskoden är korrekt och försök igen.
          </p>
          <Button variant="primary" onClick={() => router.push('/play')}>
            <ArrowLeftIcon className="h-4 w-4" />
            Tillbaka till start
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
            Sessionen har avslutats
          </h1>
          <p className="text-muted-foreground">
            Tack för ditt deltagande!
          </p>
          <Button variant="primary" onClick={() => router.push('/play')}>
            <ArrowLeftIcon className="h-4 w-4" />
            Gå med i en ny session
          </Button>
        </Card>
      </div>
    );
  }

  // Active session view
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
            <p className="text-sm text-muted-foreground mb-1">Du deltar som</p>
            <p className="text-xl font-semibold text-foreground">
              {participant.displayName}
            </p>
            <p className="text-sm text-muted-foreground capitalize">
              {participant.role === 'player' && 'Spelare'}
              {participant.role === 'observer' && 'Observatör'}
              {participant.role === 'team_lead' && 'Lagledare'}
              {participant.role === 'facilitator' && 'Facilitator'}
            </p>
          </div>
        </Card>
      )}

      {/* Session status */}
      {session?.status === 'paused' && (
        <SessionStatusMessage
          type="warning"
          title="Sessionen är pausad"
          message="Invänta instruktioner från värden."
          className="max-w-lg mx-auto w-full mb-6"
        />
      )}

      {session?.status === 'locked' && (
        <SessionStatusMessage
          type="info"
          title="Sessionen är låst"
          message="Inga nya deltagare kan gå med just nu."
          className="max-w-lg mx-auto w-full mb-6"
        />
      )}

      {/* Stats */}
      <div className="flex items-center justify-center gap-6 text-muted-foreground mb-8">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5" />
          <span>{session?.participantCount ?? 0} deltagare</span>
        </div>
        {session?.createdAt && (
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            <span>Startad</span>
          </div>
        )}
      </div>

      {/* Main content area - placeholder for game content */}
      <Card variant="default" className="max-w-2xl mx-auto w-full flex-1 p-8 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">Väntar på aktivitet...</p>
          <p className="text-sm mt-2">Innehåll kommer att visas här när sessionen startar.</p>
        </div>
      </Card>

      {/* Leave button */}
      <div className="mt-8 text-center">
        <Button variant="ghost" size="sm" onClick={handleLeave}>
          Lämna session
        </Button>
      </div>
    </div>
  );
}
