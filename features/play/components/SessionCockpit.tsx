/**
 * SessionCockpit Component
 * 
 * Unified shell for host session management.
 * Combines Lobby tabs with Director Mode overlay.
 * "Two modes of the same control panel, not two different worlds."
 */

'use client';

import { createContext, useContext, useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { isFeatureEnabled } from '@/lib/config/env';
import { resolveUiState } from '@/lib/play/ui-state';
import {
  PlayIcon,
  UserGroupIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  FlagIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline';
import { useSessionState } from '../hooks/useSessionState';
import { useSignalCapabilities } from '../hooks/useSignalCapabilities';
import { useSessionChat } from '../hooks/useSessionChat';
import { useSessionEvents } from '../hooks/useSessionEvents';
import { DirectorModeDrawer } from './DirectorModeDrawer';
import { PreflightChecklist, type ChecklistItem } from './PreflightChecklist';
import { ArtifactsPanel } from './ArtifactsPanel';
import { SessionChatDrawer } from './SessionChatDrawer';
import { LobbyHub } from '@/components/play';
import { Toolbelt } from '@/features/tools/components/Toolbelt';
import { updateSessionRoles, type SessionRoleUpdate } from '@/features/play/api/session-api';
import { approveParticipant, kickParticipant, setNextStarter } from '@/features/play-participant/api';
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
  | 'run'
  | 'participants'
  | 'artifacts'
  | 'triggers'
  | 'board'
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

function RunTab({
  status,
  startedAt,
  pausedAt,
  endedAt,
  steps,
  phases,
  currentStepIndex,
  currentPhaseIndex,
  participants,
  triggers,
  onStart,
  onPause,
  onResume,
  onEnd,
  onNextStep,
  onOpenArtifacts,
  onOpenTriggers,
  lastSyncAt,
}: {
  status: SessionCockpitState['status'];
  startedAt?: string | null;
  pausedAt?: string | null;
  endedAt?: string | null;
  steps: SessionCockpitState['steps'];
  phases: SessionCockpitState['phases'];
  currentStepIndex: number;
  currentPhaseIndex: number;
  participants: SessionCockpitState['participants'];
  triggers: SessionCockpitState['triggers'];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onNextStep: () => void;
  onOpenArtifacts: () => void;
  onOpenTriggers: () => void;
  lastSyncAt?: string | null;
}) {
  const tRun = useTranslations('play.cockpit.run');
  const uiState = resolveUiState({
    status,
    startedAt: startedAt ?? null,
    pausedAt: pausedAt ?? null,
    endedAt: endedAt ?? null,
    lastPollAt: lastSyncAt ?? null,
  });

  const currentStep = steps[currentStepIndex] ?? null;
  const nextStep = steps[currentStepIndex + 1] ?? null;
  const currentPhase = phases[currentPhaseIndex] ?? null;

  const bannerCopy: Record<string, string> = {
    waiting: tRun('banner.waiting'),
    paused: tRun('banner.paused'),
    locked: tRun('banner.locked'),
    ended: tRun('banner.ended'),
    degraded: tRun('banner.degraded'),
    offline: tRun('banner.offline'),
  };

  const statusBadge = status === 'paused'
    ? tRun('status.paused')
    : status === 'ended'
      ? tRun('status.ended')
      : status === 'locked'
        ? tRun('status.locked')
        : tRun('status.active');

  const participantCounts = participants.reduce(
    (acc, p) => {
      acc.total += 1;
      if (p.status === 'active') acc.active += 1;
      if (p.status === 'disconnected') acc.disconnected += 1;
      if (p.status === 'idle') acc.idle += 1;
      return acc;
    },
    { total: 0, active: 0, disconnected: 0, idle: 0 }
  );

  return (
    <div className="space-y-6">
      {uiState.banner !== 'none' && bannerCopy[uiState.banner] && (
        <Card className="p-4 border-border/60">
          <p className="text-sm text-muted-foreground">{bannerCopy[uiState.banner]}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{tRun('labels.now')}</p>
              <h2 className="text-lg font-semibold text-foreground">{currentStep?.title ?? tRun('empty.currentStep')}</h2>
              {currentPhase && (
                <p className="text-xs text-muted-foreground">{currentPhase.name}</p>
              )}
            </div>
            <Badge variant={status === 'paused' ? 'warning' : status === 'ended' ? 'secondary' : 'default'}>
              {statusBadge}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentStep?.leaderScript || currentStep?.boardText || currentStep?.description || tRun('empty.dash')}
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">{tRun('labels.next')}</p>
          <h3 className="text-base font-semibold text-foreground">{nextStep?.title ?? tRun('empty.nextStep')}</h3>
          <p className="text-sm text-muted-foreground">
            {nextStep?.description || tRun('empty.dash')}
          </p>
          <Button
            onClick={onNextStep}
            disabled={!uiState.allowed.advanceStep}
            className="w-full"
          >
            {tRun('actions.advanceStep')}
          </Button>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">{tRun('labels.controls')}</p>
          <div className="flex flex-col gap-2">
            {uiState.allowed.start && <Button onClick={onStart}>{tRun('actions.start')}</Button>}
            {uiState.allowed.pause && <Button variant="outline" onClick={onPause}>{tRun('actions.pause')}</Button>}
            {uiState.allowed.resume && <Button onClick={onResume}>{tRun('actions.resume')}</Button>}
            {uiState.allowed.end && <Button variant="destructive" onClick={onEnd}>{tRun('actions.end')}</Button>}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="ghost" onClick={onOpenArtifacts}>{tRun('actions.artifacts')}</Button>
            <Button variant="ghost" onClick={onOpenTriggers}>{tRun('actions.triggers')}</Button>
          </div>
        </Card>

        <Card className="p-6 space-y-3 lg:col-span-2">
          <p className="text-xs font-semibold text-muted-foreground">{tRun('labels.health')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-foreground">{tRun('health.realtime')}</p>
              <p className="text-sm text-muted-foreground">{tRun(`health.connection.${uiState.connection}`)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{tRun('health.participants')}</p>
              <p className="text-sm text-muted-foreground">
                {tRun('health.participantStatus', {
                  active: participantCounts.active,
                  idle: participantCounts.idle,
                  offline: participantCounts.disconnected,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{tRun('health.triggers')}</p>
              <p className="text-sm text-muted-foreground">
                {tRun('health.triggersArmed', { count: triggers.filter((tr) => tr.status === 'armed').length })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{tRun('health.lastUpdated')}</p>
              <p className="text-sm text-muted-foreground">{lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : tRun('empty.dash')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SessionHeader({
  session,
  status,
  participantCount,
  sessionId,
  onEnterDirectorMode,
  isPending,
  onOpenChat,
  chatUnreadCount,
}: {
  session: SessionInfo | null;
  status: SessionCockpitState['status'];
  participantCount: number;
  sessionId: string;
  onEnterDirectorMode: () => void;
  isPending: boolean;
  onOpenChat?: () => void;
  chatUnreadCount?: number;
}) {
  const t = useTranslations('play.cockpit');
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
            {participantCount} {t('header.participants')}
          </span>
          {status === 'active' && (
            <Badge variant="success" size="sm">
              ● {t('status.live')}
            </Badge>
          )}
          {status === 'paused' && (
            <Badge variant="warning" size="sm">
              ⏸ {t('status.paused')}
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
            <span className="sr-only">{t('header.openChat')}</span>
            {chatUnreadCount && chatUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {chatUnreadCount}
              </span>
            )}
          </Button>
        )}

        <Toolbelt
          sessionId={sessionId}
          role="host"
          buttonLabel={t('header.toolbeltLabel')}
        />

        {status === 'lobby' && (
          <Button
            onClick={onEnterDirectorMode}
            disabled={isPending}
            size="lg"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            {t('startSession')}
          </Button>
        )}
        {(status === 'active' || status === 'paused') && (
          <Button
            onClick={onEnterDirectorMode}
            variant="outline"
          >
            <ChevronRightIcon className="h-5 w-5 mr-1" />
            {t('actions.directorMode')}
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
  const t = useTranslations('play.cockpit.preflight');
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
              {ready ? t('readyToStart') : t('preparingSession')}
            </div>
            <div className="text-sm text-muted-foreground">
              {ready 
                ? t('allChecksOk')
                : `${pendingCount} ${t('pendingLabel')}${warningCount > 0 ? `, ${warningCount} ${t('warningsLabel')}` : ''}${errorCount > 0 ? `, ${errorCount} ${t('errorsLabel')}` : ''}`
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
  onKick,
  onApprove,
  onMarkNext,
  isDisabled,
}: {
  participant: CockpitParticipant;
  roles: SessionRole[];
  onAssignRole: (participantId: string, roleId: string | null) => void;
  onUnassignRole: (participantId: string) => void;
  onKick: (participantId: string, displayName?: string) => void;
  onApprove?: (participantId: string, displayName?: string) => void;
  onMarkNext: (participantId: string) => void;
  isDisabled: boolean;
}) {
  const t = useTranslations('play.cockpit.participants');
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
            {participant.displayName ?? t('anonymous')}
          </div>
          {participant.isNextStarter && (
            <Badge variant="outline" className="mt-1 w-fit text-[10px]">
              {t('nextTurn')}
            </Badge>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {isConnected ? (
              <span className="text-green-600">● {t('online')}</span>
            ) : (
              <span className="text-muted-foreground">○ {t('offline')}</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {participant.status === 'idle' && onApprove && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onApprove(participant.id, participant.displayName)}
            disabled={isDisabled}
            className="px-2"
          >
            {t('approve')}
          </Button>
        )}
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
            <option value="">{t('assignRole')}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        )}
        <Button
          variant={participant.isNextStarter ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onMarkNext(participant.id)}
          disabled={isDisabled}
          className="px-2"
        >
          <FlagIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onKick(participant.id, participant.displayName)}
          disabled={isDisabled}
          className="px-2"
        >
          <UserMinusIcon className="h-4 w-4" />
        </Button>
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
  onKickParticipant,
  onApproveParticipant,
  onMarkNext,
  isReadOnly,
  isLoading,
}: {
  participants: CockpitParticipant[];
  roles: SessionRole[];
  onAssignRole: (participantId: string, roleId: string | null) => void;
  onUnassignRole: (participantId: string) => void;
  onSnapshotRoles?: () => void;
  onKickParticipant: (participantId: string, displayName?: string) => void;
  onApproveParticipant?: (participantId: string, displayName?: string) => void;
  onMarkNext: (participantId: string) => void;
  isReadOnly: boolean;
  isLoading: boolean;
}) {
  const t = useTranslations('play.cockpit.roles');
  const tParticipants = useTranslations('play.cockpit.participants');
  const tHostSession = useTranslations('play.hostSession.roles');
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
          <h3 className="text-base font-semibold text-foreground">{t('noRolesCopied')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('copyRolesDescription')}
          </p>
          <Button
            size="sm"
            onClick={onSnapshotRoles}
            disabled={!onSnapshotRoles || isReadOnly || isLoading}
          >
            {tHostSession('copyFromGame')}
          </Button>
        </Card>
      )}
      {/* Role summary section */}
      {roles.length > 0 && (
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-foreground">{t('roleDistribution')}</h4>
            {allMinsSatisfied ? (
              <Badge variant="success" size="sm">✓ {t('allMinsSatisfied')}</Badge>
            ) : (
              <Badge variant="warning" size="sm">⚠ {t('minsNotSatisfied')}</Badge>
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
              {t('participantsMissingRole', { count: unassignedParticipants.length })}
            </div>
          )}
        </Card>
      )}

      {/* Summary stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{t('onlineCount', { online: connectedCount, total: participants.length })}</span>
        <span>•</span>
        <span>{t('rolesCount', { assigned: assignedCount, total: participants.length })}</span>
      </div>
      
      {/* Participant list */}
      <div className="space-y-2">
        {participants.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{tParticipants('noParticipantsYet')}</p>
            <p className="text-sm mt-2">
              {tParticipants('shareCodeToInvite')}
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
              onKick={onKickParticipant}
              onApprove={onApproveParticipant}
              onMarkNext={onMarkNext}
              isDisabled={isReadOnly}
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
  const t = useTranslations('play.cockpit.triggers');
  if (triggers.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <BoltIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('noTriggers')}</p>
        <p className="text-sm mt-2">
          {t('configuredViaBuilder')}
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
            🟢 {t('armedLabel', { count: armed.length })}
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
            ✅ {t('firedLabel', { count: fired.length })}
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
  const t = useTranslations('play.cockpit');
  const tTabs = useTranslations('play.cockpit.tabs');
  const sessionState = useSessionState({ sessionId });
  const {
    // State
    displayName,
    sessionCode,
    status,
    startedAt,
    pausedAt,
    endedAt,
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
    lastSyncAt,
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
    endSession,
    nextStep,
    previousStep,
    assignRole,
    unassignRole,
    snapshotRoles,
    fireTrigger,
    disableAllTriggers,
    sendSignal,
    applyTimeBankDelta,
    refresh,
  } = sessionState;

  const showSignals = isFeatureEnabled('signals');
  const showEvents = isFeatureEnabled('eventLogging');

  const {
    capabilities,
    flashScreen,
    playSound,
    vibrate,
    flashTorch,
    sendNotification,
    activateAudioGate,
    audioGateActive,
  } = useSignalCapabilities({ autoDetect: showSignals });

  const toast = useToast();

  const signalPresets = useMemo(() => {
    const presets: Array<{
      id: string;
      name: string;
      type: 'torch' | 'audio' | 'vibration' | 'screen_flash' | 'notification';
      color?: string;
      disabled?: boolean;
      disabledReason?: string;
    }> = [];

    if (capabilities.screenFlash.status === 'available') {
      presets.push({ id: 'screen_flash', name: t('signalPresets.screenFlash'), type: 'screen_flash', color: '#ffffff' });
    }
    if (capabilities.vibration.status === 'available') {
      presets.push({ id: 'vibration', name: t('signalPresets.vibration'), type: 'vibration' });
    }
    if (capabilities.torch.status === 'available') {
      presets.push({ id: 'torch', name: t('signalPresets.torch'), type: 'torch' });
    }
    if (capabilities.audio.status === 'available') {
      presets.push({ id: 'audio', name: t('signalPresets.audio'), type: 'audio' });
    }
    const notificationStatus = capabilities.notification.status;
    const notificationDisabled = notificationStatus !== 'available';
    let notificationReason: string | undefined;
    if (notificationDisabled) {
      switch (notificationStatus) {
        case 'denied':
          notificationReason = t('notifications.reason.denied');
          break;
        case 'unavailable':
          notificationReason = t('notifications.reason.unavailable');
          break;
        case 'error':
          notificationReason = t('notifications.reason.error');
          break;
        case 'unknown':
          notificationReason = t('notifications.reason.unknown');
          break;
        default:
          notificationReason = t('notifications.reason.default');
          break;
      }
    }
    presets.push({
      id: 'notification',
      name: t('signalPresets.notification'),
      type: 'notification',
      disabled: notificationDisabled,
      disabledReason: notificationReason,
    });

    return presets;
  }, [capabilities, t]);

  const [activeTab, setActiveTab] = useState<CockpitTab>('run');
  const [showChecklist, setShowChecklist] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, SessionRoleUpdate>>({});
  const [rolesSaving, setRolesSaving] = useState(false);
  const [rolesSaveError, setRolesSaveError] = useState<string | null>(null);
  
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
  } = useSessionEvents({
    sessionId,
    realtime: showEvents,
  });

  useEffect(() => {
    if (sessionRoles.length === 0) {
      setRoleDrafts({});
      return;
    }

    setRoleDrafts((prev) => {
      const next: Record<string, SessionRoleUpdate> = {};
      for (const role of sessionRoles) {
        next[role.id] = prev[role.id] ?? {
          id: role.id,
          name: role.name,
          public_description: role.public_description ?? '',
          private_instructions: role.private_instructions ?? '',
          min_count: role.min_count,
          max_count: role.max_count ?? null,
          icon: role.icon ?? '',
          color: role.color ?? '',
        };
      }
      return next;
    });
  }, [sessionRoles]);

  const handleSaveRoleEdits = useCallback(async () => {
    if (sessionRoles.length === 0) return;
    const saveErrorMessage = t('settings.sessionRoles.saveError');
    setRolesSaving(true);
    setRolesSaveError(null);
    try {
      const updates = Object.values(roleDrafts);
      const ok = await updateSessionRoles(sessionId, updates);
      if (!ok) {
        setRolesSaveError(saveErrorMessage);
        return;
      }
      await refresh();
    } catch {
      setRolesSaveError(saveErrorMessage);
    } finally {
      setRolesSaving(false);
    }
  }, [refresh, roleDrafts, sessionId, sessionRoles.length, t]);

  const handleExecuteSignal = useCallback(async (type: string, config: Record<string, unknown>) => {
    switch (type) {
      case 'screen_flash': {
        const color = typeof config.color === 'string' ? config.color : '#ffffff';
        const duration = typeof config.durationMs === 'number' ? config.durationMs : undefined;
        await flashScreen(color, duration);
        break;
      }
      case 'vibration': {
        const pattern = Array.isArray(config.pattern)
          ? (config.pattern.filter((p) => typeof p === 'number') as number[])
          : undefined;
        await vibrate(pattern);
        break;
      }
      case 'torch': {
        const duration = typeof config.durationMs === 'number' ? config.durationMs : undefined;
        await flashTorch(duration);
        break;
      }
      case 'audio': {
        if (!audioGateActive) {
          await activateAudioGate();
        }
        const url = typeof config.url === 'string' ? config.url : undefined;
        await playSound(url);
        break;
      }
      case 'notification': {
        const title = typeof config.title === 'string' ? config.title : t('notifications.defaultTitle');
        const body = typeof config.body === 'string' ? config.body : undefined;
        const forceToast = config.forceToast === true;
        const notificationStatus = capabilities.notification.status;
        let sent = false;
        if (!forceToast && notificationStatus === 'available') {
          sent = await sendNotification(title, body);
        }
        if (!sent) {
          let fallbackTitle = t('notifications.fallbackTitle.inApp');
          if (!forceToast) {
            switch (notificationStatus) {
              case 'denied':
                fallbackTitle = t('notifications.fallbackTitle.blocked');
                break;
              case 'unavailable':
                fallbackTitle = t('notifications.fallbackTitle.unavailable');
                break;
              case 'error':
                fallbackTitle = t('notifications.fallbackTitle.error');
                break;
              case 'unknown':
                fallbackTitle = t('notifications.fallbackTitle.unknown');
                break;
              default:
                fallbackTitle = t('notifications.fallbackTitle.default');
                break;
            }
          }
          const fallbackMessage = body ? `${title}: ${body}` : title;
          toast.info(fallbackMessage, fallbackTitle);
        }
        break;
      }
    }
  }, [activateAudioGate, audioGateActive, capabilities.notification.status, flashScreen, flashTorch, playSound, sendNotification, t, toast, vibrate]);

  const handleKickParticipant = useCallback(async (participantId: string, displayName?: string) => {
    if (typeof window !== 'undefined') {
      const label = displayName ? t('confirmKick', { name: displayName }) : t('confirmKickAnonymous');
      if (!window.confirm(label)) return;
    }
    try {
      await kickParticipant(sessionId, participantId);
      await refresh();
    } catch (error) {
      console.warn('Failed to remove participant', error);
    }
  }, [refresh, sessionId, t]);

  const handleApproveParticipant = useCallback(async (participantId: string, displayName?: string) => {
    try {
      await approveParticipant(sessionId, participantId);
      toast.success(displayName ? t('participants.approved', { name: displayName }) : t('participants.approvedAnonymous'));
      await refresh();
    } catch (error) {
      console.warn('Failed to approve participant', error);
      toast.error(t('participants.approvalFailed'));
    }
  }, [refresh, sessionId, t, toast]);

  const handleMarkNext = useCallback(async (participantId: string) => {
    try {
      await setNextStarter(sessionId, participantId);
      await refresh();
    } catch (error) {
      console.warn('Failed to mark next starter', error);
    }
  }, [refresh, sessionId]);

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
        label: tTabs('participants'),
        status: participants.length > 0 ? 'ready' : 'warning',
        detail: participants.length > 0
          ? t('participants.participantsConnected', { count: participants.length })
          : t('participants.noParticipantsConnected'),
      },
    ];

    const rolesChecks: LobbyCheckInput[] = preflightItems.filter((item) =>
      ['roles-snapshot', 'roles-assigned', 'secrets'].includes(item.id)
    );

    const contentChecks: LobbyCheckInput[] = [
      {
        id: 'steps',
        label: t('content.stepsAndPhases'),
        status: steps.length > 0 ? 'ready' : 'error',
        detail: steps.length > 0
          ? t('content.stepsDefined', { count: steps.length })
          : t('content.noStepsDefined'),
      },
      ...preflightItems.filter((item) => item.id === 'artifacts'),
    ];

    const triggerChecks: LobbyCheckInput[] = preflightItems.filter((item) => item.id === 'triggers');

    const settingsChecks: LobbyCheckInput[] = [
      {
        id: 'session-code',
        label: t('settings.sessionCode'),
        status: sessionCode ? 'ready' : 'error',
        detail: sessionCode ? t('settings.codeGenerated') : t('settings.noCodeGenerated'),
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
    const fallbackPhaseTitle = phases[0]?.name ?? t('steps.unnamedPhase');

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
        title: step.title || t('steps.unnamedStep'),
        type: 'activity',
        isReady: !missingTitle && !missingDescription,
        issues: [
          ...(missingTitle ? [t('steps.missingTitle')] : []),
          ...(missingDescription ? [t('steps.missingDescription')] : []),
        ],
      });
    });

    const lobbyPhases = Array.from(phaseMap.values());

    return {
      sessionId,
      sessionName: displayName || t('session.fallbackName'),
      sessionStatus: status === 'ended' ? 'completed' : status === 'active' || status === 'paused' ? 'active' : 'lobby',
      participants: participants.map((participant) => ({
        id: participant.id,
        name: participant.displayName || t('participants.anonymous'),
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
  }, [sessionId, displayName, status, participants, sessionRoles, phases, steps, triggers, preflightItems, sessionCode, t, tTabs]);

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
    { id: 'run', label: tTabs('run') },
    { id: 'participants', label: tTabs('participants'), badge: participants.length },
    { id: 'artifacts', label: tTabs('artifacts'), badge: artifacts.length },
    { id: 'triggers', label: tTabs('triggers'), badge: triggers.filter((tr) => tr.status === 'armed').length || undefined },
    { id: 'board', label: tTabs('board') },
    { id: 'settings', label: tTabs('settings') },
  ] as Array<{ id: CockpitTab; label: string; badge?: number }>;

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
          sessionId={sessionId}
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
                <span className="font-medium">{t('errors.title')}</span>
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
          
          <TabPanel id="run" activeTab={activeTab} className="space-y-6">
            {status === 'lobby' && (
              <LobbyHub
                state={lobbyState}
                onParticipantsClick={() => setActiveTab('participants')}
                onRolesClick={() => setActiveTab('participants')}
                onContentClick={() => setActiveTab('artifacts')}
                onTriggersClick={() => setActiveTab('triggers')}
                onSettingsClick={() => setActiveTab('settings')}
                onStartSession={handleEnterDirectorMode}
                isStarting={isLoading}
              />
            )}

            <RunTab
              status={status}
              startedAt={startedAt ?? null}
              pausedAt={pausedAt ?? null}
              endedAt={endedAt ?? null}
              steps={steps}
              phases={phases}
              currentStepIndex={currentStepIndex}
              currentPhaseIndex={currentPhaseIndex}
              participants={participants}
              triggers={triggers}
              onStart={startSession}
              onPause={pauseSession}
              onResume={resumeSession}
              onEnd={endSession}
              onNextStep={nextStep}
              onOpenArtifacts={() => setActiveTab('artifacts')}
              onOpenTriggers={() => setActiveTab('triggers')}
              lastSyncAt={lastSyncAt ?? null}
            />

            {children}
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
              isReadOnly={status === 'ended'}
              onKickParticipant={handleKickParticipant}
              onApproveParticipant={handleApproveParticipant}
              onMarkNext={handleMarkNext}
              isLoading={isLoading}
            />
          </TabPanel>
          
          <TabPanel id="artifacts" activeTab={activeTab}>
            <ArtifactsPanel sessionId={sessionId} />
          </TabPanel>
          
          <TabPanel id="triggers" activeTab={activeTab}>
            <TriggersTab triggers={triggers} />
          </TabPanel>

          <TabPanel id="board" activeTab={activeTab}>
            <Card className="p-6 space-y-3">
              <p className="text-sm font-semibold text-foreground">{t('board.title')}</p>
              <p className="text-sm text-muted-foreground">{t('board.openInstruction')}</p>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm font-mono">
                /board/{sessionCode}
              </div>
            </Card>
          </TabPanel>

          
          <TabPanel id="settings" activeTab={activeTab} className="space-y-6">
            <Card className="p-6">
              <h3 className="font-medium mb-4">{t('settings.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('settings.description')}</p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-medium">{t('settings.sessionRoles.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('settings.sessionRoles.description')}</p>
                </div>
                <Button
                  onClick={() => void handleSaveRoleEdits()}
                  disabled={rolesSaving || sessionRoles.length === 0}
                >
                  {t('settings.sessionRoles.save')}
                </Button>
              </div>

              {rolesSaveError && (
                <div className="text-sm text-destructive">{rolesSaveError}</div>
              )}

              {sessionRoles.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('settings.sessionRoles.empty')}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void snapshotRoles()}>
                    {t('settings.sessionRoles.copy')}
                  </Button>
                </div>
              ) : (
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
                            onChange={(e) => setRoleDrafts((prev) => ({
                              ...prev,
                              [role.id]: { ...prev[role.id], id: role.id, name: e.target.value },
                            }))}
                          />
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <label className="flex items-center gap-1">
                              {t('settings.sessionRoles.fields.min')}
                              <input
                                type="number"
                                className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                                value={draft.min_count ?? ''}
                                placeholder={role.min_count?.toString() ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  setRoleDrafts((prev) => ({
                                    ...prev,
                                    [role.id]: {
                                      ...prev[role.id],
                                      id: role.id,
                                      min_count: Number.isFinite(value as number) ? (value as number) : undefined,
                                    },
                                  }));
                                }}
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              {t('settings.sessionRoles.fields.max')}
                              <input
                                type="number"
                                className="w-16 rounded border border-input bg-background px-2 py-1 text-sm"
                                value={draft.max_count ?? ''}
                                placeholder={role.max_count?.toString() ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  setRoleDrafts((prev) => ({
                                    ...prev,
                                    [role.id]: {
                                      ...prev[role.id],
                                      id: role.id,
                                      max_count: Number.isFinite(value as number) ? (value as number) : null,
                                    },
                                  }));
                                }}
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              {t('settings.sessionRoles.fields.icon')}
                              <input
                                type="text"
                                className="w-24 rounded border border-input bg-background px-2 py-1 text-sm"
                                value={draft.icon ?? ''}
                                placeholder={role.icon ?? ''}
                                onChange={(e) => setRoleDrafts((prev) => ({
                                  ...prev,
                                  [role.id]: { ...prev[role.id], id: role.id, icon: e.target.value },
                                }))}
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              {t('settings.sessionRoles.fields.color')}
                              <input
                                type="text"
                                className="w-24 rounded border border-input bg-background px-2 py-1 text-sm"
                                value={draft.color ?? ''}
                                placeholder={role.color ?? ''}
                                onChange={(e) => setRoleDrafts((prev) => ({
                                  ...prev,
                                  [role.id]: { ...prev[role.id], id: role.id, color: e.target.value },
                                }))}
                              />
                            </label>
                          </div>
                        </div>
                        <textarea
                          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                          rows={2}
                          value={draft.public_description ?? ''}
                          placeholder={role.public_description ?? ''}
                          onChange={(e) => setRoleDrafts((prev) => ({
                            ...prev,
                            [role.id]: { ...prev[role.id], id: role.id, public_description: e.target.value },
                          }))}
                        />
                        <textarea
                          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                          rows={3}
                          value={draft.private_instructions ?? ''}
                          placeholder={role.private_instructions ?? ''}
                          onChange={(e) => setRoleDrafts((prev) => ({
                            ...prev,
                            [role.id]: { ...prev[role.id], id: role.id, private_instructions: e.target.value },
                          }))}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
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
          signalPresets={signalPresets}
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
          onExecuteSignal={handleExecuteSignal}
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

        {/* Preflight Checklist Modal */}
        {showChecklist && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold">{t('preflight.title')}</h2>
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
