/**
 * SessionCockpit Component
 * 
 * Unified shell for host session management.
 * Combines Lobby tabs with Director Mode overlay.
 * "Two modes of the same control panel, not two different worlds."
 */

'use client';

import { createContext, useContext, useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { isFeatureEnabled } from '@/lib/config/env';
import {
  PlayIcon,
  UserGroupIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useSessionState } from '../hooks/useSessionState';
import { useSessionChat } from '../hooks/useSessionChat';
import { useSessionEvents } from '../hooks/useSessionEvents';
import { DirectorModeDrawer } from './DirectorModeDrawer';
import { PreflightChecklist, type ChecklistItem } from './PreflightChecklist';
import { ArtifactsPanel } from './ArtifactsPanel';
import { SignalPanel } from './SignalPanel';
import { TimeBankPanel } from './TimeBankPanel';
import { EventFeedPanel } from './EventFeedPanel';
import { SessionChatDrawer } from './SessionChatDrawer';
import { SessionStoryPanel } from './SessionStoryPanel';
import { LobbyHub } from '@/components/play';
import { StoryViewModal } from './StoryViewModal';
import type { SessionCockpitState, CockpitParticipant, UseSessionStateReturn, SessionEvent as CockpitEvent } from '@/types/session-cockpit';
import type { SessionEvent as EventFeedEvent } from '@/types/session-event';
import type { SessionRole } from '@/types/play-runtime';
import type { LobbyState, SectionReadiness, ReadinessLevel } from '@/types/lobby';
import { DEFAULT_SESSION_SETTINGS } from '@/types/lobby';

// =============================================================================
// Context
// =============================================================================

const SessionCockpitContext = createContext<UseSessionStateReturn | null>(null);

export function useSessionCockpit(): UseSessionStateReturn {
  const ctx = useContext(SessionCockpitContext);
  if (!ctx) {
    throw new Error('useSessionCockpit must be used within a SessionCockpitProvider');
  }
  return ctx;
}

// =============================================================================
// Types
// =============================================================================

export interface SessionCockpitProps {
  /** Session ID */
  sessionId: string;
  /** Optional host ID override */
  hostId?: string;
  /** Optional tenant ID */
  tenantId?: string;
  /** Render prop for custom lobby tabs content */
  children?: ReactNode;
  /** Class name */
  className?: string;
}

type CockpitTab =
  | 'overview'
  | 'story'
  | 'participants'
  | 'artifacts'
  | 'triggers'
  | 'signals'
  | 'timebank'
  | 'events'
  | 'settings';

// Session info for display
interface SessionInfo {
  name: string;
  code: string;
}

interface LobbyCheckInput {
  id: string;
  label: string;
  status: 'ready' | 'warning' | 'error' | 'pending';
  detail?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

function SessionHeader({
  session,
  status,
  participantCount,
  onEnterDirectorMode,
  isPending,
  onOpenChat,
  chatUnreadCount,
}: {
  session: SessionInfo | null;
  status: SessionCockpitState['status'];
  participantCount: number;
  onEnterDirectorMode: () => void;
  isPending: boolean;
  onOpenChat?: () => void;
  chatUnreadCount?: number;
}) {
  if (!session) return null;

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-foreground truncate">
          {session.name}
        </h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span className="font-mono tracking-wider">{session.code}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <UserGroupIcon className="h-4 w-4" />
            {participantCount} deltagare
          </span>
          {status === 'active' && (
            <Badge variant="success" size="sm">
              ● LIVE
            </Badge>
          )}
          {status === 'paused' && (
            <Badge variant="warning" size="sm">
              ⏸ PAUSAD
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onOpenChat && (
          <Button
            onClick={onOpenChat}
            variant="outline"
            size="sm"
            className="relative"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
            <span className="sr-only">Öppna chatt</span>
            {chatUnreadCount && chatUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {chatUnreadCount}
              </span>
            )}
          </Button>
        )}
        {status === 'lobby' && (
          <Button
            onClick={onEnterDirectorMode}
            disabled={isPending}
            size="lg"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            Starta session
          </Button>
        )}
        {(status === 'active' || status === 'paused') && (
          <Button
            onClick={onEnterDirectorMode}
            variant="outline"
          >
            <ChevronRightIcon className="h-5 w-5 mr-1" />
            Director Mode
          </Button>
        )}
      </div>
    </header>
  );
}

interface PreflightState {
  ready: boolean;
  items: ChecklistItem[];
}

function ReadinessIndicator({
  preflight,
  onShowChecklist,
}: {
  preflight: PreflightState;
  onShowChecklist: () => void;
}) {
  const { ready, items } = preflight;
  const pendingCount = items.filter((i: ChecklistItem) => i.status === 'pending').length;
  const errorCount = items.filter((i: ChecklistItem) => i.status === 'error').length;
  const warningCount = items.filter((i: ChecklistItem) => i.status === 'warning').length;
  
  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-colors hover:bg-muted/50',
        ready 
          ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20' 
          : errorCount > 0 
            ? 'border-destructive/50 bg-destructive/10' 
            : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
      )}
      onClick={onShowChecklist}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {ready ? (
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          ) : (
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-amber-600" />
          )}
          <div>
            <div className="font-medium text-foreground">
              {ready ? 'Redo att starta' : 'Förbereda session'}
            </div>
            <div className="text-sm text-muted-foreground">
              {ready 
                ? 'Alla kontroller godkända'
                : `${pendingCount} väntande${warningCount > 0 ? `, ${warningCount} varningar` : ''}${errorCount > 0 ? `, ${errorCount} fel` : ''}`
              }
            </div>
          </div>
        </div>
        <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    </Card>
  );
}

function ParticipantWithRoleRow({
  participant,
  roles,
  onAssignRole,
  onUnassignRole,
  isDisabled,
}: {
  participant: CockpitParticipant;
  roles: SessionRole[];
  onAssignRole: (participantId: string, roleId: string | null) => void;
  onUnassignRole: (participantId: string) => void;
  isDisabled: boolean;
}) {
  const currentRole = roles.find((r) => r.id === participant.assignedRoleId);

  // Map status to connection state
  const isConnected = participant.status === 'active' || participant.status === 'joined';

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {participant.displayName?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">
            {participant.displayName ?? 'Anonym deltagare'}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {isConnected ? (
              <span className="text-green-600">● Online</span>
            ) : (
              <span className="text-muted-foreground">○ Offline</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {currentRole ? (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => !isDisabled && onUnassignRole(participant.id)}
          >
            {currentRole.name}
            <span className="ml-1 opacity-60">×</span>
          </Badge>
        ) : (
          <select
            className="text-sm border rounded-lg px-2 py-1 bg-background"
            value=""
            onChange={(e) => e.target.value && onAssignRole(participant.id, e.target.value)}
            disabled={isDisabled}
          >
            <option value="">Tilldela roll...</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function ParticipantsTab({
  participants,
  roles,
  onAssignRole,
  onUnassignRole,
  onSnapshotRoles,
  isActive,
  isLoading,
}: {
  participants: CockpitParticipant[];
  roles: SessionRole[];
  onAssignRole: (participantId: string, roleId: string | null) => void;
  onUnassignRole: (participantId: string) => void;
  onSnapshotRoles?: () => void;
  isActive: boolean;
  isLoading: boolean;
}) {
  const connectedCount = participants.filter((p) => p.status === 'active' || p.status === 'joined').length;
  const assignedCount = participants.filter((p) => p.assignedRoleId).length;
  
  // Calculate role distribution
  const roleDistribution = roles.map((role) => {
    const assigned = participants.filter((p) => p.assignedRoleId === role.id).length;
    const min = (role as { min_count?: number }).min_count ?? 0;
    const max = (role as { max_count?: number | null }).max_count;
    const maxLabel = max === null || max === undefined ? '+' : `-${max}`;
    return {
      id: role.id,
      name: role.name,
      assigned,
      min,
      max,
      maxLabel,
      isSatisfied: assigned >= min,
    };
  });

  const allMinsSatisfied = roleDistribution.every((r) => r.isSatisfied);
  const unassignedParticipants = participants.filter((p) => !p.assignedRoleId);

  return (
    <div className="space-y-6">
      {roles.length === 0 && (
        <Card className="p-6 text-center space-y-3">
          <h3 className="text-base font-semibold text-foreground">Inga roller kopierade ännu</h3>
          <p className="text-sm text-muted-foreground">
            Kopiera roller från spelet för att kunna tilldela dem till deltagare.
          </p>
          <Button
            size="sm"
            onClick={onSnapshotRoles}
            disabled={!onSnapshotRoles || isActive || isLoading}
          >
            Kopiera roller
          </Button>
        </Card>
      )}
      {/* Role summary section */}
      {roles.length > 0 && (
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-foreground">Rollfördelning</h4>
            {allMinsSatisfied ? (
              <Badge variant="success" size="sm">✓ Alla minimikrav uppfyllda</Badge>
            ) : (
              <Badge variant="warning" size="sm">⚠ Minimikrav ej uppfyllda</Badge>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {roleDistribution.map((role) => (
              <div
                key={role.id}
                className={cn(
                  'flex items-center justify-between p-2 rounded-lg text-sm',
                  role.isSatisfied ? 'bg-muted/50' : 'bg-warning/10 border border-warning/30'
                )}
              >
                <span className="font-medium truncate">{role.name}</span>
                <span className={cn(
                  'ml-2 whitespace-nowrap',
                  role.isSatisfied ? 'text-muted-foreground' : 'text-warning font-medium'
                )}>
                  {role.assigned}/{role.min}{role.maxLabel}
                </span>
              </div>
            ))}
          </div>
          {unassignedParticipants.length > 0 && (
            <div className="mt-3 text-sm text-muted-foreground">
              {unassignedParticipants.length} deltagare saknar roll
            </div>
          )}
        </Card>
      )}

      {/* Summary stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{connectedCount} av {participants.length} online</span>
        <span>•</span>
        <span>{assignedCount} av {participants.length} har roller</span>
      </div>
      
      {/* Participant list */}
      <div className="space-y-2">
        {participants.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Inga deltagare har anslutit ännu.</p>
            <p className="text-sm mt-2">
              Dela sessionskoden för att bjuda in deltagare.
            </p>
          </Card>
        ) : (
          participants.map((p) => (
            <ParticipantWithRoleRow
              key={p.id}
              participant={p}
              roles={roles}
              onAssignRole={onAssignRole}
              onUnassignRole={onUnassignRole}
              isDisabled={isActive}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TriggersTab({
  triggers,
}: {
  triggers: SessionCockpitState['triggers'];
}) {
  if (triggers.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <BoltIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Inga triggers i denna session.</p>
        <p className="text-sm mt-2">
          Triggers konfigureras via Spel-byggaren.
        </p>
      </Card>
    );
  }

  const armed = triggers.filter((t) => t.status === 'armed');
  const fired = triggers.filter((t) => t.status === 'fired');
  // Note: disabled triggers can be added in future iteration for "show all" toggle

  return (
    <div className="space-y-4">
      {armed.length > 0 && (
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            🟢 Armed ({armed.length})
          </div>
          <div className="space-y-2">
            {armed.map((t) => (
              <Card key={t.id} className="p-3 border-green-200 dark:border-green-800">
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-muted-foreground">
                  {t.conditionSummary} → {t.actionSummary}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {fired.length > 0 && (
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            ✅ Fired ({fired.length})
          </div>
          <div className="space-y-2">
            {fired.map((t) => (
              <Card key={t.id} className="p-3 bg-muted/50">
                <div className="font-medium text-muted-foreground">{t.name}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function SessionCockpit({
  sessionId,
  children,
  className,
}: SessionCockpitProps) {
  const sessionState = useSessionState({ sessionId });
  const {
    // State
    displayName,
    sessionCode,
    status,
    isLoading,
    error,
    participants,
    sessionRoles,
    steps,
    phases,
    currentStepIndex,
    currentPhaseIndex,
    artifacts,
    triggers,
    recentSignals,
    timeBankBalance,
    timeBankPaused,
    preflightItems,
    canStartDirectorMode,
    // Actions
    enterDirectorMode,
    exitDirectorMode,
    startSession,
    pauseSession,
    resumeSession,
    goToStep,
    nextStep,
    previousStep,
    assignRole,
    unassignRole,
    snapshotRoles,
    fireTrigger,
    disableAllTriggers,
    sendSignal,
    applyTimeBankDelta,
  } = sessionState;

  const showSignals = isFeatureEnabled('signals');
  const showTimeBank = isFeatureEnabled('timeBank');
  const showEvents = isFeatureEnabled('eventLogging');

  const [activeTab, setActiveTab] = useState<CockpitTab>('overview');
  const [showChecklist, setShowChecklist] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  
  // Initialize director mode state based on session status
  const [directorModeOpen, setDirectorModeOpen] = useState(
    status === 'active' || status === 'paused'
  );

  // Session info for header
  const session: SessionInfo | null = displayName ? { name: displayName, code: sessionCode } : null;

  const chatEnabled = status === 'active' || status === 'paused';

  const chat = useSessionChat({
    sessionId,
    role: 'host',
    isOpen: chatOpen,
    enabled: chatEnabled,
  });

  const { markAllRead } = chat;
  useEffect(() => {
    if (chatOpen) markAllRead();
  }, [chatOpen, markAllRead]);

  const {
    events: sessionEvents,
    stats: eventStats,
    isLoading: eventsLoading,
    error: eventsError,
    refresh: refreshEvents,
  } = useSessionEvents({
    sessionId,
    realtime: showEvents,
  });

  const drawerEvents = useMemo<CockpitEvent[]>(() => {
    if (!showEvents) return [];
    return sessionEvents.map((event: EventFeedEvent) => ({
      id: event.id,
      sessionId: event.sessionId,
      type: event.eventType as unknown as CockpitEvent['type'],
      timestamp: event.createdAt.toISOString(),
      actorType: event.actorType,
      actorId: event.actorId,
      actorName: event.actorName,
      payload: event.payload,
      correlationId: event.correlationId,
      parentEventId: event.parentEventId,
      stepId: event.targetType === 'step' ? event.targetId : undefined,
      phaseId: event.targetType === 'phase' ? event.targetId : undefined,
      artifactId: event.targetType === 'artifact' ? event.targetId : undefined,
      triggerId: event.targetType === 'trigger' ? event.targetId : undefined,
    }));
  }, [sessionEvents, showEvents]);

  const lobbyState = useMemo<LobbyState>(() => {
    const mapStatus = (status: LobbyCheckInput['status']): ReadinessLevel => {
      switch (status) {
        case 'ready':
          return 'ready';
        case 'error':
          return 'error';
        case 'warning':
        case 'pending':
        default:
          return 'warning';
      }
    };

    const buildSection = (section: string, items: LobbyCheckInput[]): SectionReadiness => {
      const checks = items.map((item) => ({
        key: item.id,
        label: item.label,
        status: mapStatus(item.status),
        message: item.detail,
      }));

      const level = checks.reduce<ReadinessLevel>((acc, check) => {
        if (check.status === 'error') return 'error';
        if (check.status === 'warning' && acc !== 'error') return 'warning';
        if (check.status === 'ready' && acc === 'unknown') return 'ready';
        return acc;
      }, 'unknown');

      return {
        section,
        level,
        checks,
      };
    };

    const participantsChecks: LobbyCheckInput[] = [
      {
        id: 'participants',
        label: 'Deltagare',
        status: participants.length > 0 ? 'ready' : 'warning',
        detail: participants.length > 0
          ? `${participants.length} deltagare anslutna`
          : 'Inga deltagare har anslutit än',
      },
    ];

    const rolesChecks: LobbyCheckInput[] = preflightItems.filter((item) =>
      ['roles-snapshot', 'roles-assigned', 'secrets'].includes(item.id)
    );

    const contentChecks: LobbyCheckInput[] = [
      {
        id: 'steps',
        label: 'Steg & faser',
        status: steps.length > 0 ? 'ready' : 'error',
        detail: steps.length > 0
          ? `${steps.length} steg definierade`
          : 'Inga steg definierade',
      },
      ...preflightItems.filter((item) => item.id === 'artifacts'),
    ];

    const triggerChecks: LobbyCheckInput[] = preflightItems.filter((item) => item.id === 'triggers');

    const settingsChecks: LobbyCheckInput[] = [
      {
        id: 'session-code',
        label: 'Sessionskod',
        status: sessionCode ? 'ready' : 'error',
        detail: sessionCode ? 'Kod genererad' : 'Ingen kod genererad',
      },
    ];

    const phaseMap = new Map<string, { id: string; title: string; steps: LobbyState['phases'][number]['steps'] }>();

    phases.forEach((phase) => {
      phaseMap.set(phase.id, {
        id: phase.id,
        title: phase.name,
        steps: [],
      });
    });

    const fallbackPhaseId = phases[0]?.id ?? 'phase-default';
    const fallbackPhaseTitle = phases[0]?.name ?? 'Steg';

    steps.forEach((step) => {
      const missingTitle = !step.title?.trim();
      const missingDescription = !step.description?.trim();
      const targetPhaseId = step.phaseId && phaseMap.has(step.phaseId) ? step.phaseId : fallbackPhaseId;
      if (!phaseMap.has(targetPhaseId)) {
        phaseMap.set(targetPhaseId, {
          id: targetPhaseId,
          title: fallbackPhaseTitle,
          steps: [],
        });
      }

      phaseMap.get(targetPhaseId)!.steps.push({
        id: step.id,
        title: step.title || 'Namnlöst steg',
        type: 'activity',
        isReady: !missingTitle && !missingDescription,
        issues: [
          ...(missingTitle ? ['Saknar rubrik'] : []),
          ...(missingDescription ? ['Saknar beskrivning'] : []),
        ],
      });
    });

    const lobbyPhases = Array.from(phaseMap.values());

    return {
      sessionId,
      sessionName: displayName || 'Session',
      sessionStatus: status === 'ended' ? 'completed' : status === 'active' || status === 'paused' ? 'active' : 'lobby',
      participants: participants.map((participant) => ({
        id: participant.id,
        name: participant.displayName || 'Anonym deltagare',
        roleId: participant.assignedRoleId,
        isConnected: participant.status === 'active' || participant.status === 'joined',
        joinedAt: new Date(participant.joinedAt),
      })),
      roles: sessionRoles.map((role) => ({
        id: role.id,
        name: role.name,
        description: (role as { public_description?: string | null }).public_description ?? undefined,
        color: role.color ?? undefined,
        icon: role.icon ?? undefined,
      })),
      phases: lobbyPhases,
      triggerCount: triggers.length,
      settings: {
        ...DEFAULT_SESSION_SETTINGS,
        maxParticipants: Math.max(DEFAULT_SESSION_SETTINGS.maxParticipants, participants.length),
      },
      readiness: [
        buildSection('participants', participantsChecks),
        buildSection('roles', rolesChecks),
        buildSection('content', contentChecks),
        buildSection('triggers', triggerChecks),
        buildSection('settings', settingsChecks),
      ],
    };
  }, [sessionId, displayName, status, participants, sessionRoles, phases, steps, triggers, preflightItems, sessionCode]);

  // Enter director mode
  const handleEnterDirectorMode = useCallback(async () => {
    if (status === 'lobby') {
      // Start session first
      await startSession();
    }
    enterDirectorMode();
    setDirectorModeOpen(true);
  }, [status, startSession, enterDirectorMode]);

  // Exit director mode
  const handleExitDirectorMode = useCallback(() => {
    exitDirectorMode();
    setDirectorModeOpen(false);
  }, [exitDirectorMode]);

  // Build checklist items for display
  const checklistData: PreflightState = useMemo(() => {
    return {
      ready: canStartDirectorMode,
      items: preflightItems.map((item) => ({
        ...item,
        status: item.status,
      } as ChecklistItem)),
    };
  }, [canStartDirectorMode, preflightItems]);

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Översikt' },
    { id: 'story', label: 'Berattelse' },
    { id: 'participants', label: 'Deltagare', badge: participants.length },
    { id: 'artifacts', label: 'Artefakter', badge: artifacts.length },
    { id: 'triggers', label: 'Triggers', badge: triggers.filter((t) => t.status === 'armed').length || undefined },
    showSignals ? { id: 'signals', label: 'Signaler' } : null,
    showTimeBank ? { id: 'timebank', label: 'Tidsbank' } : null,
    showEvents ? { id: 'events', label: 'Händelser', badge: sessionEvents.length || undefined } : null,
    { id: 'settings', label: 'Inställningar' },
  ].filter(Boolean) as Array<{ id: CockpitTab; label: string; badge?: number }>;

  // Map status for drawer
  const drawerStatus: 'active' | 'paused' | 'ended' = 
    status === 'active' ? 'active' : 
    status === 'paused' ? 'paused' : 
    status === 'ended' ? 'ended' : 'active';

  return (
    <SessionCockpitContext.Provider value={sessionState}>
      <div className={cn('flex flex-col min-h-screen bg-muted/30', className)}>
        {/* Header */}
        <SessionHeader
          session={session}
          status={status}
          participantCount={participants.length}
          onEnterDirectorMode={handleEnterDirectorMode}
          isPending={isLoading}
          onOpenChat={chatEnabled ? () => setChatOpen(true) : undefined}
          chatUnreadCount={chat.unreadCount}
        />
        
        {/* Main content */}
        <main className="flex-1 container max-w-5xl mx-auto py-6 px-4">
          {/* Error banner */}
          {error && (
            <Card className="p-4 mb-6 border-destructive bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span className="font-medium">Fel:</span>
                <span>{error}</span>
              </div>
            </Card>
          )}
          
          {/* Readiness */}
          {status === 'lobby' && (
            <div className="mb-6">
              <ReadinessIndicator
                preflight={checklistData}
                onShowChecklist={() => setShowChecklist(true)}
              />
            </div>
          )}
          
          {/* Tabs */}
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as CockpitTab)}
            variant="underline"
            className="mb-6"
          />
          
          <TabPanel id="overview" activeTab={activeTab} className="space-y-6">
            <LobbyHub
              state={lobbyState}
              onParticipantsClick={() => setActiveTab('participants')}
              onRolesClick={() => setActiveTab('participants')}
              onContentClick={() => setActiveTab('story')}
              onTriggersClick={() => setActiveTab('triggers')}
              onSettingsClick={() => setActiveTab('settings')}
              onStartSession={handleEnterDirectorMode}
              isStarting={isLoading}
            />

            {children}
          </TabPanel>

          <TabPanel id="story" activeTab={activeTab} className="space-y-6">
            <SessionStoryPanel
              sessionId={sessionId}
              onPreview={() => setStoryOpen(true)}
            />
          </TabPanel>
          
          <TabPanel id="participants" activeTab={activeTab}>
            <ParticipantsTab
              participants={participants}
              roles={sessionRoles}
              onAssignRole={(participantId, roleId) => {
                if (roleId) {
                  assignRole(participantId, roleId);
                }
              }}
              onUnassignRole={(participantId) => {
                unassignRole(participantId);
              }}
              onSnapshotRoles={snapshotRoles}
              isActive={status !== 'lobby'}
              isLoading={isLoading}
            />
          </TabPanel>
          
          <TabPanel id="artifacts" activeTab={activeTab}>
            <ArtifactsPanel sessionId={sessionId} />
          </TabPanel>
          
          <TabPanel id="triggers" activeTab={activeTab}>
            <TriggersTab triggers={triggers} />
          </TabPanel>

          {showSignals && (
            <TabPanel id="signals" activeTab={activeTab}>
              <SignalPanel sessionId={sessionId} disabled={isLoading || status === 'ended'} />
            </TabPanel>
          )}

          {showTimeBank && (
            <TabPanel id="timebank" activeTab={activeTab}>
              <TimeBankPanel sessionId={sessionId} disabled={isLoading || status === 'ended'} />
            </TabPanel>
          )}

          {showEvents && (
            <TabPanel id="events" activeTab={activeTab}>
              <EventFeedPanel
                events={sessionEvents}
                stats={eventStats}
                isLoading={eventsLoading}
                error={eventsError}
                onRefresh={refreshEvents}
              />
            </TabPanel>
          )}
          
          <TabPanel id="settings" activeTab={activeTab}>
            <Card className="p-6">
              <h3 className="font-medium mb-4">Session settings</h3>
              <p className="text-sm text-muted-foreground">
                Story and phase text overrides live under the Story tab. More session settings can be restored here next.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveTab('story')}>
                Open Story
              </Button>
            </Card>
          </TabPanel>
        </main>
        
        {/* Director Mode Drawer */}
        <DirectorModeDrawer
          open={directorModeOpen}
          onClose={handleExitDirectorMode}
          sessionName={displayName ?? ''}
          sessionCode={sessionCode ?? ''}
          status={drawerStatus}
          steps={steps}
          currentStepIndex={currentStepIndex}
          phases={phases}
          currentPhaseIndex={currentPhaseIndex}
          triggers={triggers}
          recentSignals={recentSignals}
          events={drawerEvents}
          timeBankBalance={timeBankBalance}
          timeBankPaused={timeBankPaused}
          participantCount={participants.length}
          onPause={pauseSession}
          onResume={resumeSession}
          onNextStep={nextStep}
          onPreviousStep={previousStep}
          onFireTrigger={fireTrigger}
          onDisableAllTriggers={disableAllTriggers}
          onSendSignal={sendSignal}
          onTimeBankDelta={applyTimeBankDelta}
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

        <StoryViewModal
          open={storyOpen}
          onClose={() => setStoryOpen(false)}
          steps={steps}
          currentStepIndex={currentStepIndex}
          title={displayName ?? 'Berättelsen'}
          onNavigateToStep={(index) => void goToStep(index)}
        />
        
        {/* Preflight Checklist Modal */}
        {showChecklist && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold">Förberedelsekontroll</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowChecklist(false)}>
                  ×
                </Button>
              </div>
              <PreflightChecklist
                items={checklistData.items}
                canStart={canStartDirectorMode}
                onStart={() => {
                  setShowChecklist(false);
                  handleEnterDirectorMode();
                }}
                isStarting={isLoading}
              />
            </Card>
          </div>
        )}
      </div>
    </SessionCockpitContext.Provider>
  );
}

export default SessionCockpit;
