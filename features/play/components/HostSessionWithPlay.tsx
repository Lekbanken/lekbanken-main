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
  UsersIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { SignalIcon } from '@heroicons/react/24/solid';
import { Tabs, TabPanel, useTabs } from '@/components/ui/tabs';
import type { SessionRole } from '@/types/play-runtime';
import type { AdminOverrides, SessionRoleUpdate, StepInfo as GameStepInfo, PhaseInfo as GamePhaseInfo } from '@/features/play/api/session-api';
import { getSessionOverrides, updateSessionOverrides, updateSessionRoles } from '@/features/play/api/session-api';
import { TimeBankPanel } from '@/features/play/components/TimeBankPanel';
import { SignalPanel } from '@/features/play/components/SignalPanel';
import { isFeatureEnabled } from '@/lib/config/env';

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

  // Session overrides (steps, phases, safety)
  const [overridesLoading, setOverridesLoading] = useState(false);

  // Game structure (to display editable fields)
  const [gameSteps, setGameSteps] = useState<GameStepInfo[]>([]);
  const [gamePhases, setGamePhases] = useState<GamePhaseInfo[]>([]);
  const [gameSafety, setGameSafety] = useState<AdminOverrides['safety'] | undefined>(undefined);

  // Draft state for overrides
  const [stepDrafts, setStepDrafts] = useState<Record<string, Partial<GameStepInfo> & { order?: number }>>({});
  const [phaseDrafts, setPhaseDrafts] = useState<Record<string, Partial<GamePhaseInfo> & { order?: number }>>({});
  const [safetyDraft, setSafetyDraft] = useState<AdminOverrides['safety'] | undefined>(undefined);

  // Draft state for roles
  const [roleDrafts, setRoleDrafts] = useState<Record<string, SessionRoleUpdate>>({});

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
  
  // Lobby tabs state
  const { activeTab: lobbyTab, setActiveTab: setLobbyTab } = useTabs('participants');

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
      const drafts: Record<string, SessionRoleUpdate> = {};
      (data.roles ?? []).forEach((role) => {
        drafts[role.id] = {
          id: role.id,
          name: role.name,
          public_description: (role as { public_description?: string }).public_description,
          private_instructions: (role as { private_instructions?: string }).private_instructions,
          min_count: (role as { min_count?: number }).min_count,
          max_count: (role as { max_count?: number | null }).max_count,
          icon: (role as { icon?: string | null }).icon,
          color: (role as { color?: string | null }).color,
        };
      });
      setRoleDrafts(drafts);
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

  const loadGameStructure = useCallback(async () => {
    setOverridesLoading(true);
    try {
      const [gameRes, overridesRes] = await Promise.all([
        fetch(`/api/play/sessions/${sessionId}/game`, { cache: 'no-store' }),
        getSessionOverrides(sessionId),
      ]);

      if (gameRes.ok) {
        const data = await gameRes.json();
        setGameSteps((data.steps as GameStepInfo[]) ?? []);
        setGamePhases((data.phases as GamePhaseInfo[]) ?? []);
        setGameSafety((data.safety as AdminOverrides['safety']) ?? undefined);

        const stepDraftInit: Record<string, Partial<GameStepInfo> & { order?: number }> = {};
        for (const step of (data.steps as GameStepInfo[]) ?? []) {
          stepDraftInit[step.id] = {
            title: step.title,
            description: step.description,
            durationMinutes: step.durationMinutes,
            display_mode: (step as { display_mode?: GameStepInfo['display_mode'] }).display_mode,
            order: step.index,
          };
        }
        setStepDrafts(stepDraftInit);

        const phaseDraftInit: Record<string, Partial<GamePhaseInfo> & { order?: number }> = {};
        for (const phase of (data.phases as GamePhaseInfo[]) ?? []) {
          phaseDraftInit[phase.id] = {
            name: phase.name,
            description: phase.description,
            duration: phase.duration,
            order: phase.index,
          };
        }
        setPhaseDrafts(phaseDraftInit);
      }

      if (overridesRes) {
        if (overridesRes.safety) setSafetyDraft(overridesRes.safety);
      }
    } catch (err) {
      console.error('[HostSessionWithPlay] loadGameStructure error', err);
    } finally {
      setOverridesLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadData();
    void loadRoles();
    void loadSecrets();
    void loadGameStructure();
    const interval = setInterval(() => void loadData(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData, loadRoles, loadSecrets, loadGameStructure]);

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

  const handleSaveOverrides = async () => {
    setOverridesLoading(true);
    try {
      const payload: AdminOverrides = {
        steps: Object.entries(stepDrafts).map(([id, draft]) => ({
          id,
          title: draft.title,
          description: draft.description,
          durationMinutes: typeof draft.durationMinutes === 'number' ? draft.durationMinutes : undefined,
          display_mode: (draft as { display_mode?: GameStepInfo['display_mode'] }).display_mode,
          order: typeof draft.order === 'number' ? draft.order : undefined,
        })),
        phases: Object.entries(phaseDrafts).map(([id, draft]) => ({
          id,
          name: draft.name,
          description: draft.description,
          duration: draft.duration ?? undefined,
          order: typeof draft.order === 'number' ? draft.order : undefined,
        })),
        safety: safetyDraft,
      };

      const ok = await updateSessionOverrides(sessionId, payload);
      if (!ok) throw new Error('Kunde inte spara sessionens overrides');
      toast.success('Sessionens inställningar sparades');
      await loadGameStructure();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte spara inställningar');
    } finally {
      setOverridesLoading(false);
    }
  };

  const handleResetOverrides = async () => {
    setOverridesLoading(true);
    try {
      const ok = await updateSessionOverrides(sessionId, {});
      if (!ok) throw new Error('Kunde inte återställa overrides');
      toast.success('Overrides återställda');
      await loadGameStructure();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte återställa');
    } finally {
      setOverridesLoading(false);
    }
  };

  const handleSaveRoleEdits = async () => {
    setRolesLoading(true);
    try {
      const updates = Object.values(roleDrafts);
      const ok = await updateSessionRoles(sessionId, updates);
      if (!ok) throw new Error('Kunde inte spara roller');
      toast.success('Roller sparade för sessionen');
      await loadRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte spara roller');
    } finally {
      setRolesLoading(false);
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
  const lobbyTabs = [
    { id: 'participants', label: 'Deltagare', icon: <UsersIcon className="h-4 w-4" />, badge: participants.length },
    { id: 'roles', label: 'Roller', icon: <UserGroupIcon className="h-4 w-4" /> },
    ...(isFeatureEnabled('signals') ? [{ id: 'signals', label: 'Signals', icon: <SignalIcon className="h-4 w-4" /> }] : []),
    ...(isFeatureEnabled('timeBank') ? [{ id: 'timebank', label: 'Tidsbank', icon: <ClockIcon className="h-4 w-4" /> }] : []),
    { id: 'settings', label: 'Inställningar', icon: <Cog6ToothIcon className="h-4 w-4" /> },
  ];

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

      {/* Lobby Tabs Navigation */}
      <Tabs
        tabs={lobbyTabs}
        activeTab={lobbyTab}
        onChange={setLobbyTab}
        variant="underline"
        size="md"
      />

      {/* Tab Content */}
      <TabPanel id="participants" activeTab={lobbyTab} className="space-y-6">
        <Card variant="elevated" className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Deltagare ({participants.length})
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
      </TabPanel>

      <TabPanel id="roles" activeTab={lobbyTab} className="space-y-6">
        {hasGame && !isEnded ? (
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
        ) : (
          <Card variant="elevated" className="p-6">
            <p className="text-muted-foreground">
              {isEnded ? 'Sessionen är avslutad.' : 'Inget spel är kopplat till sessionen.'}
            </p>
          </Card>
        )}
      </TabPanel>

      {isFeatureEnabled('signals') && (
        <TabPanel id="signals" activeTab={lobbyTab} className="space-y-6">
          <SignalPanel sessionId={sessionId} disabled={actionPending || session.status === 'ended'} />
        </TabPanel>
      )}

      {isFeatureEnabled('timeBank') && (
        <TabPanel id="timebank" activeTab={lobbyTab} className="space-y-6">
          <TimeBankPanel sessionId={sessionId} disabled={actionPending || session.status === 'ended'} />
        </TabPanel>
      )}

      <TabPanel id="settings" activeTab={lobbyTab} className="space-y-6">
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

        <Card variant="elevated" className="p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Admin-inställningar (endast denna session)</h2>
              <p className="text-sm text-muted-foreground">Justera steg, säkerhet, faser och roller utan att ändra spelets originaldata.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void handleResetOverrides()} disabled={overridesLoading}>
                Återställ overrides
              </Button>
              <Button size="sm" onClick={() => void handleSaveOverrides()} disabled={overridesLoading}>
                Spara sessionens ändringar
              </Button>
            </div>
          </div>

          {/* Steps */}
          <div className="border border-border/70 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Steg-för-steg</h3>
              <span className="text-xs text-muted-foreground">Titel, beskrivning, tid, ordning</span>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {gameSteps.map((step, idx) => {
                const draft = stepDrafts[step.id] ?? {};
                return (
                  <div key={step.id} className="rounded-md border border-border/60 p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{idx + 1}. {step.title}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <label className="flex items-center gap-1">
                          Ordning
                          <input
                            type="number"
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                            value={draft.order ?? idx}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setStepDrafts((prev) => ({
                                ...prev,
                                [step.id]: { ...prev[step.id], order: Number.isFinite(value) ? value : undefined },
                              }));
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          Tid (min)
                          <input
                            type="number"
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                            value={draft.durationMinutes ?? ''}
                            placeholder={step.durationMinutes?.toString() ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              setStepDrafts((prev) => ({
                                ...prev,
                                [step.id]: { ...prev[step.id], durationMinutes: Number.isFinite(value as number) ? (value as number) : undefined },
                              }));
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <input
                      type="text"
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      value={draft.title ?? ''}
                      placeholder={step.title}
                      onChange={(e) => setStepDrafts((prev) => ({ ...prev, [step.id]: { ...prev[step.id], title: e.target.value } }))}
                    />
                    <textarea
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      rows={3}
                      value={draft.description ?? ''}
                      placeholder={step.description}
                      onChange={(e) => setStepDrafts((prev) => ({ ...prev, [step.id]: { ...prev[step.id], description: e.target.value } }))}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Safety & Inclusion */}
          <div className="border border-border/70 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Säkerhet & Inkludering</h3>
              <span className="text-xs text-muted-foreground">Säkerhet, tillgänglighet, utrymme, ledartips</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Säkerhetsnoteringar</label>
                <textarea
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={safetyDraft?.safetyNotes ?? ''}
                  placeholder={gameSafety?.safetyNotes ?? ''}
                  onChange={(e) => setSafetyDraft((prev) => ({ ...prev, safetyNotes: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tillgänglighetsnoteringar</label>
                <textarea
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={safetyDraft?.accessibilityNotes ?? ''}
                  placeholder={gameSafety?.accessibilityNotes ?? ''}
                  onChange={(e) => setSafetyDraft((prev) => ({ ...prev, accessibilityNotes: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Utrymmeskrav</label>
                <textarea
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={safetyDraft?.spaceRequirements ?? ''}
                  placeholder={gameSafety?.spaceRequirements ?? ''}
                  onChange={(e) => setSafetyDraft((prev) => ({ ...prev, spaceRequirements: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Ledartips</label>
                <textarea
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={safetyDraft?.leaderTips ?? ''}
                  placeholder={gameSafety?.leaderTips ?? ''}
                  onChange={(e) => setSafetyDraft((prev) => ({ ...prev, leaderTips: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="border border-border/70 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Faser & Rundor</h3>
              <span className="text-xs text-muted-foreground">Namn, beskrivning, tid, ordning</span>
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {gamePhases.map((phase, idx) => {
                const draft = phaseDrafts[phase.id] ?? {};
                return (
                  <div key={phase.id} className="rounded-md border border-border/60 p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{idx + 1}. {phase.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <label className="flex items-center gap-1">
                          Ordning
                          <input
                            type="number"
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                            value={draft.order ?? idx}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setPhaseDrafts((prev) => ({
                                ...prev,
                                [phase.id]: { ...prev[phase.id], order: Number.isFinite(value) ? value : undefined },
                              }));
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          Tid (sek)
                          <input
                            type="number"
                            className="w-20 rounded border border-input bg-background px-2 py-1 text-sm"
                            value={draft.duration ?? ''}
                            placeholder={phase.duration?.toString() ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              setPhaseDrafts((prev) => ({
                                ...prev,
                                [phase.id]: { ...prev[phase.id], duration: Number.isFinite(value as number) ? (value as number) : undefined },
                              }));
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <input
                      type="text"
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      value={draft.name ?? ''}
                      placeholder={phase.name}
                      onChange={(e) => setPhaseDrafts((prev) => ({ ...prev, [phase.id]: { ...prev[phase.id], name: e.target.value } }))}
                    />
                    <textarea
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      rows={2}
                      value={draft.description ?? ''}
                      placeholder={phase.description ?? ''}
                      onChange={(e) => setPhaseDrafts((prev) => ({ ...prev, [phase.id]: { ...prev[phase.id], description: e.target.value } }))}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roles */}
          <div className="border border-border/70 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Roller (sessionens kopia)</h3>
              <span className="text-xs text-muted-foreground">Namn, beskrivning, min/max, instruktioner, ikon/färg</span>
            </div>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {sessionRoles.map((role) => {
                const draft = roleDrafts[role.id] ?? { id: role.id };
                return (
                  <div key={role.id} className="rounded-md border border-border/60 p-3 space-y-2 bg-muted/30">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <input
                        type="text"
                        className="w-full md:w-1/2 rounded border border-input bg-background px-3 py-2 text-sm"
                        value={draft.name ?? ''}
                        placeholder={role.name}
                        onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [role.id]: { ...prev[role.id], id: role.id, name: e.target.value } }))}
                      />
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <label className="flex items-center gap-1">
                          Min
                          <input
                            type="number"
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                            value={draft.min_count ?? ''}
                            placeholder={(role as { min_count?: number }).min_count?.toString() ?? ''}
                            onChange={(e) => {
                              const v = e.target.value === '' ? undefined : Number(e.target.value);
                              setRoleDrafts((prev) => ({ ...prev, [role.id]: { ...prev[role.id], id: role.id, min_count: Number.isFinite(v as number) ? (v as number) : undefined } }));
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          Max
                          <input
                            type="number"
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                            value={draft.max_count ?? ''}
                            placeholder={(role as { max_count?: number | null }).max_count?.toString() ?? ''}
                            onChange={(e) => {
                              const v = e.target.value === '' ? undefined : Number(e.target.value);
                              setRoleDrafts((prev) => ({ ...prev, [role.id]: { ...prev[role.id], id: role.id, max_count: Number.isFinite(v as number) ? (v as number) : null } }));
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          Ikon
                          <input
                            type="text"
                            className="w-24 rounded border border-input bg-background px-2 py-1 text-sm"
                            value={(draft as { icon?: string | null }).icon ?? ''}
                            placeholder={(role as { icon?: string | null }).icon ?? ''}
                            onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [role.id]: { ...prev[role.id], id: role.id, icon: e.target.value } }))}
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          Färg
                          <input
                            type="text"
                            className="w-24 rounded border border-input bg-background px-2 py-1 text-sm"
                            value={(draft as { color?: string | null }).color ?? ''}
                            placeholder={(role as { color?: string | null }).color ?? ''}
                            onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [role.id]: { ...prev[role.id], id: role.id, color: e.target.value } }))}
                          />
                        </label>
                      </div>
                    </div>
                    <textarea
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      rows={2}
                      value={draft.public_description ?? ''}
                      placeholder={(role as { public_description?: string }).public_description ?? ''}
                      onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [role.id]: { ...prev[role.id], id: role.id, public_description: e.target.value } }))}
                    />
                    <textarea
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      rows={3}
                      value={draft.private_instructions ?? ''}
                      placeholder={(role as { private_instructions?: string }).private_instructions ?? ''}
                      onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [role.id]: { ...prev[role.id], id: role.id, private_instructions: e.target.value } }))}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void handleSaveRoleEdits()} disabled={rolesLoading}>
                Spara roller
              </Button>
            </div>
          </div>
        </Card>
      </TabPanel>
    </div>
  );
}
