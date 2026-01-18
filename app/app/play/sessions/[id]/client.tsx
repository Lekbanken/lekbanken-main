'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  getHostSession, 
  getParticipants, 
  updateSessionStatus,
  kickParticipant,
  blockParticipant,
  setNextStarter,
  setParticipantPosition,
  type Participant, 
  type PlaySession,
} from '@/features/play-participant/api';
import { 
  SessionHeader, 
  SessionControls, 
  ParticipantList,
  SessionStatusMessage,
} from '@/components/play';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShareIcon, 
  QrCodeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const POLL_INTERVAL = 3000;

type HostSessionDetailClientProps = {
  sessionId: string;
};

type ParticipantWithExtras = Participant & {
  position?: number | null;
  isNextStarter?: boolean;
};

export function HostSessionDetailClient({ sessionId }: HostSessionDetailClientProps) {
  const t = useTranslations('app.play.sessionDetail');
  const router = useRouter();
  const [session, setSession] = useState<PlaySession | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sessionRes, participantsRes] = await Promise.all([
        getHostSession(sessionId),
        getParticipants(sessionId),
      ]);
      setSession(sessionRes.session);
      setParticipants(participantsRes.participants);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [sessionId, t]);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const doAction = async (action: 'start' | 'pause' | 'resume' | 'end') => {
    setActionPending(true);
    setLoadingAction(action);
    try {
      await updateSessionStatus(sessionId, action);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('updateFailed'));
    } finally {
      setActionPending(false);
      setLoadingAction(undefined);
    }
  };

  const handleShare = async () => {
    if (!session) return;
    
    const shareUrl = `${window.location.origin}/play`;
    const shareText = t('shareText', { code: session.sessionCode });

    if (navigator.share) {
      try {
        await navigator.share({
          title: session.displayName,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback to copying code
      await navigator.clipboard.writeText(session.sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKick = async (participantId: string) => {
    try {
      await kickParticipant(sessionId, participantId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kickFailed'));
    }
  };

  const handleBlock = async (participantId: string) => {
    try {
      await blockParticipant(sessionId, participantId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('blockFailed'));
    }
  };

  const handleSetNextStarter = async (participantId: string) => {
    try {
      await setNextStarter(sessionId, participantId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setNextStarterFailed'));
    }
  };

  const handleSetPosition = async (participantId: string, position: number) => {
    try {
      await setParticipantPosition(sessionId, participantId, position);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setPositionFailed'));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card variant="elevated" className="max-w-md p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ExclamationCircleIcon className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {t('notFoundTitle')}
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="primary" onClick={() => router.push('/app/play/sessions')}>
            {t('backToSessions')}
          </Button>
        </Card>
      </div>
    );
  }

  if (!session) return null;

  const isLive = session.status === 'active' || session.status === 'paused';

  return (
    <div className="space-y-6">
      {/* Header */}
      <SessionHeader
        name={session.displayName}
        code={session.sessionCode}
        status={session.status}
        participantCount={session.participantCount ?? participants.length}
        backHref="/app/play/sessions"
      />

      {/* Error message */}
      {error && (
        <SessionStatusMessage
          type="error"
          title={t('errorTitle')}
          message={error}
          onDismiss={() => setError(null)}
          autoDismiss
        />
      )}

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Controls & Share */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls */}
          <Card variant="elevated" className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t('controlsTitle')}
            </h2>
            <SessionControls
              status={session.status}
              onPause={() => doAction('pause')}
              onResume={() => doAction('resume')}
              onEnd={() => doAction('end')}
              onShare={handleShare}
              isLoading={actionPending}
              loadingAction={loadingAction}
              variant="full"
            />
          </Card>

          {/* Share section for live sessions */}
          {isLive && (
            <Card variant="elevated" className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {t('shareTitle')}
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Large code display */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-muted-foreground mb-1">{t('sessionCode')}</p>
                  <p className="text-4xl font-mono font-bold text-primary tracking-widest">
                    {session.sessionCode}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('participantJoinHint', { url: 'lekbanken.se/play' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleShare}>
                    <ShareIcon className="h-4 w-4" />
                    {copied ? t('copied') : t('share')}
                  </Button>
                  <Button variant="outline" disabled>
                    <QrCodeIcon className="h-4 w-4" />
                    {t('qrCode')}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right column - Participants */}
        <div>
          <Card variant="elevated" className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t('participantsTitle')}
            </h2>
            <ParticipantList
              participants={participants.map((p) => ({
                id: p.id,
                displayName: p.displayName,
                status: p.status,
                role: p.role,
                position: p.position,
                isNextStarter: p.isNextStarter,
              }))}
              showActions
              isSessionEnded={session.status === 'ended'}
              onKick={handleKick}
              onBlock={handleBlock}
              onSetNextStarter={handleSetNextStarter}
              onSetPosition={handleSetPosition}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
