/**
 * Host Session Detail Client with Play Mode Integration
 * 
 * Extended version of the host session client that includes
 * FacilitatorDashboard for live gameplay.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { HostPlayMode } from '@/features/play';
import { ActiveSessionShell } from '@/features/play/components/ActiveSessionShell';
import { RoleAssignerContainer } from '@/features/play/components/RoleAssignerContainer';
import { PreflightChecklist, buildPreflightItems } from '@/features/play/components/PreflightChecklist';
import { SessionChatDrawer } from '@/features/play/components/SessionChatDrawer';
import { useSessionChat } from '@/features/play/hooks/useSessionChat';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { 
  ShareIcon, 
  QrCodeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import type { SessionRole } from '@/types/play-runtime';

const POLL_INTERVAL = 3000;

type HostSessionWithPlayProps = {
  sessionId: string;
};

type ParticipantWithExtras = Participant & {
  position?: number | null;
  isNextStarter?: boolean;
};

export function HostSessionWithPlayClient({ sessionId }: HostSessionWithPlayProps) {
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState<PlaySession | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);

  // Role assignment in lobby
  const [sessionRoles, setSessionRoles] = useState<SessionRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  // Secret instructions controls (host)
  const [secretsLoading, setSecretsLoading] = useState(false);
  const [secretsError, setSecretsError] = useState<string | null>(null);
  const [secretsStatus, setSecretsStatus] = useState<{
    unlockedAt: string | null;
    participantCount: number;
    assignedCount: number;
    revealedCount: number;
  } | null>(null);
  
  // Play mode state
  const [isPlayMode, setIsPlayMode] = useState(false);

  const isLive = session?.status === 'active' || session?.status === 'paused';
  const hasGame = Boolean(session?.gameId);

  const chat = useSessionChat({
    sessionId,
    role: 'host',
    isOpen: chatOpen,
    enabled: Boolean(isPlayMode && isLive && hasGame),
  });

  const { markAllRead } = chat;
  useEffect(() => {
    if (chatOpen) markAllRead();
  }, [chatOpen, markAllRead]);

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
      setError(err instanceof Error ? err.message : 'Kunde inte hämta session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/roles`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Kunde inte ladda roller');
      }
      const data = (await res.json()) as { roles?: SessionRole[] };
      setSessionRoles(data.roles ?? []);
      setRolesError(null);
    } catch (err) {
      setRolesError(err instanceof Error ? err.message : 'Kunde inte ladda roller');
    } finally {
      setRolesLoading(false);
    }
  }, [sessionId]);

  const loadSecrets = useCallback(async () => {
    setSecretsLoading(true);
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/secrets`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Kunde inte ladda hemlighetsstatus');
      }
      const data = (await res.json()) as {
        session?: { secret_instructions_unlocked_at?: string | null };
        stats?: { participant_count?: number; assigned_count?: number; revealed_count?: number };
      };
      setSecretsStatus({
        unlockedAt: data.session?.secret_instructions_unlocked_at ?? null,
        participantCount: data.stats?.participant_count ?? 0,
        assignedCount: data.stats?.assigned_count ?? 0,
        revealedCount: data.stats?.revealed_count ?? 0,
      });
      setSecretsError(null);
    } catch (err) {
      setSecretsError(err instanceof Error ? err.message : 'Kunde inte ladda hemlighetsstatus');
    } finally {
      setSecretsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadData();
    void loadRoles();
    void loadSecrets();
    const interval = setInterval(() => void loadData(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData, loadRoles, loadSecrets]);

  const handleSnapshotRoles = async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg = (data as { error?: string }).error ?? 'Kunde inte kopiera roller';
        throw new Error(errMsg);
      }

      const count = (data as { count?: number }).count ?? 0;
      toast.success(`${count} roller kopierade till sessionen`);
      await loadRoles();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Kunde inte kopiera roller';
      setRolesError(errMsg);
      toast.error(errMsg);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleSecretsAction = async (action: 'unlock' | 'relock') => {
    setSecretsLoading(true);
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = data as {
          error?: string;
          stats?: { participant_count?: number; assigned_count?: number };
          revealed_count?: number;
        };

        if (res.status === 409 && action === 'unlock' && err.stats) {
          throw new Error(
            `Tilldela roller först (tilldelade ${err.stats.assigned_count ?? 0} av ${err.stats.participant_count ?? 0}).`
          );
        }

        if (res.status === 409 && action === 'relock' && typeof err.revealed_count === 'number') {
          throw new Error('Kan inte låsa igen: minst en deltagare har redan visat sina hemligheter.');
        }

        throw new Error(err.error ?? 'Kunde inte uppdatera');
      }

      const ok = data as {
        session?: { secret_instructions_unlocked_at?: string | null };
        stats?: { participant_count?: number; assigned_count?: number; revealed_count?: number };
      };

      if (ok.session || ok.stats) {
        setSecretsStatus((prev) => ({
          unlockedAt: ok.session?.secret_instructions_unlocked_at ?? prev?.unlockedAt ?? null,
          participantCount: ok.stats?.participant_count ?? prev?.participantCount ?? 0,
          assignedCount: ok.stats?.assigned_count ?? prev?.assignedCount ?? 0,
          revealedCount: ok.stats?.revealed_count ?? prev?.revealedCount ?? 0,
        }));
      } else {
        // Fallback for unexpected response shape
        await loadSecrets();
      }
    } catch (err) {
      setSecretsError(err instanceof Error ? err.message : 'Kunde inte uppdatera');
    } finally {
      setSecretsLoading(false);
    }
  };

  const doAction = async (action: 'start' | 'pause' | 'resume' | 'end') => {
    setActionPending(true);
    setLoadingAction(action);
    try {
      await updateSessionStatus(sessionId, action);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte uppdatera status');
    } finally {
      setActionPending(false);
      setLoadingAction(undefined);
    }
  };

  const handleShare = async () => {
    if (!session) return;
    
    const shareUrl = `${window.location.origin}/play`;
    const shareText = `Gå med i sessionen! Kod: ${session.sessionCode}`;

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
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort deltagare');
    }
  };

  const handleBlock = async (participantId: string) => {
    try {
      await blockParticipant(sessionId, participantId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte blockera deltagare');
    }
  };

  const handleSetNextStarter = async (participantId: string) => {
    try {
      await setNextStarter(sessionId, participantId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte sätta nästa startare');
    }
  };

  const handleSetPosition = async (participantId: string, position: number) => {
    try {
      await setParticipantPosition(sessionId, participantId, position);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte sätta position');
    }
  };

  const handleEnterPlayMode = async () => {
    const currentSession = session;
    if (!currentSession) return;
    setActionPending(true);
    setLoadingAction('start');
    try {
      // Participants only enter play mode when the session is active.
      // Ensure we start the session before switching the host UI into play mode.
      if (currentSession.status !== 'active' && currentSession.status !== 'paused') {
        await updateSessionStatus(sessionId, 'start');
      }

      await loadData();
      setIsPlayMode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte starta spelläge');
    } finally {
      setActionPending(false);
      setLoadingAction(undefined);
    }
  };

  const handleExitPlayMode = () => {
    setIsPlayMode(false);
  };

  const handleHostExitAction = async (action: 'continue_active' | 'pause_session' | 'end_session') => {
    if (action === 'pause_session') {
      await updateSessionStatus(sessionId, 'pause');
      await loadData();
    }
    if (action === 'end_session') {
      await updateSessionStatus(sessionId, 'end');
      await loadData();
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
            Session hittades inte
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="primary" onClick={() => router.push('/app/play/sessions')}>
            Tillbaka till sessioner
          </Button>
        </Card>
      </div>
    );
  }

  if (!session) return null;

  const isEnded = session.status === 'ended' || session.status === 'cancelled';

  // Play mode view
  if (isPlayMode && hasGame && isLive) {
    return (
      <ActiveSessionShell
        role="host"
        open
        title={session.displayName}
        onRequestClose={handleExitPlayMode}
        onHostExitAction={handleHostExitAction}
        chatUnreadCount={chat.unreadCount}
        onOpenChat={() => setChatOpen(true)}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Sessionskod</div>
          <div className="font-mono text-base font-bold text-primary">{session.sessionCode}</div>
        </div>

        <HostPlayMode
          sessionId={sessionId}
          onExitPlayMode={handleExitPlayMode}
          showExitButton={false}
          participantCount={participants.length}
        />

        <SessionChatDrawer
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          role="host"
          messages={chat.messages}
          error={chat.error}
          sending={chat.sending}
          onSend={chat.send}
        />
      </ActiveSessionShell>
    );
  }

  // Regular lobby view
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
          title="Något gick fel"
          message={error}
          onDismiss={() => setError(null)}
          autoDismiss
        />
      )}

      {/* Pre-flight Checklist for sessions with games */}
      {hasGame && !isEnded && (() => {
        // Build checklist state
        const rolesAssignedCount = sessionRoles.reduce((acc, role) => {
          // Count assignments for this role from the role data or fall back to 0
          return acc + ((role as unknown as { assigned_count?: number }).assigned_count ?? 0);
        }, 0);
        
        const checklistState = {
          participantCount: participants.length,
          hasGame: Boolean(session?.gameId),
          rolesSnapshotted: sessionRoles.length > 0,
          rolesAssignedCount,
          totalRoles: sessionRoles.length,
        };
        
        const items = buildPreflightItems(checklistState, {
          onSnapshotRoles: handleSnapshotRoles,
        });
        
        // Can start if no errors (warnings are allowed)
        const canStart = !items.some((i) => i.status === 'error');
        
        return (
          <PreflightChecklist
            items={items}
            canStart={canStart}
            onStart={() => void handleEnterPlayMode()}
            isStarting={actionPending}
          />
        );
      })()}

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Controls & Share */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls */}
          <Card variant="elevated" className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Sessionskontroller
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
                Dela session
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Large code display */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-muted-foreground mb-1">Sessionskod</p>
                  <p className="text-4xl font-mono font-bold text-primary tracking-widest">
                    {session.sessionCode}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Deltagare går till <span className="font-medium">lekbanken.se/play</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleShare}>
                    <ShareIcon className="h-4 w-4" />
                    {copied ? 'Kopierad!' : 'Dela'}
                  </Button>
                  <Button variant="outline" disabled>
                    <QrCodeIcon className="h-4 w-4" />
                    QR-kod
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Role assignment (Lobby) */}
          {hasGame && !isEnded && (
            <Card variant="elevated" className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Roller</h2>
                  <p className="text-sm text-muted-foreground">
                    Tilldela roller i lobbyn innan ni går in i aktiv session.
                  </p>
                </div>
                {sessionRoles.length === 0 && (
                  <Button variant="outline" onClick={handleSnapshotRoles} disabled={rolesLoading}>
                    Kopiera roller från spel
                  </Button>
                )}
              </div>

              {rolesError && (
                <div className="mt-4 text-sm text-destructive">{rolesError}</div>
              )}

              <div className="mt-4">
                {rolesLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <RoleAssignerContainer
                    sessionId={sessionId}
                    sessionRoles={sessionRoles}
                    onAssignmentComplete={() => void loadRoles()}
                  />
                )}
              </div>

              <div className="mt-6 border-t border-border pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Hemliga instruktioner</h3>
                    <p className="text-sm text-muted-foreground">
                      Lås upp när alla har fått en roll. Du kan bara låsa igen om ingen har hunnit visa sina hemligheter.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void handleSecretsAction('relock')}
                      disabled={
                        secretsLoading ||
                        !secretsStatus?.unlockedAt ||
                        (secretsStatus.revealedCount ?? 0) > 0
                      }
                    >
                      Lås igen
                    </Button>
                    <Button
                      onClick={() => void handleSecretsAction('unlock')}
                      disabled={
                        secretsLoading ||
                        Boolean(secretsStatus?.unlockedAt) ||
                        (secretsStatus?.participantCount ?? 0) > 0 &&
                          (secretsStatus?.assignedCount ?? 0) < (secretsStatus?.participantCount ?? 0)
                      }
                    >
                      Lås upp
                    </Button>
                  </div>
                </div>

                {secretsError && (
                  <div className="mt-2 text-sm text-destructive">{secretsError}</div>
                )}

                {secretsStatus && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    Status: {secretsStatus.unlockedAt ? 'Upplåst' : 'Låst'} · Deltagare: {secretsStatus.participantCount} · Tilldelade: {secretsStatus.assignedCount} · Visade: {secretsStatus.revealedCount}
                  </div>
                )}

                {secretsStatus && !secretsStatus.unlockedAt && secretsStatus.participantCount > 0 && secretsStatus.assignedCount < secretsStatus.participantCount && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Tips: Du kan låsa upp när alla har en roll.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right column - Participants */}
        <div>
          <Card variant="elevated" className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Deltagare
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
