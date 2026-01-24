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
import { toDataURL } from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { isFeatureEnabled } from '@/lib/config/env';
import { resolveUiState } from '@/lib/play/ui-state';
import {
  PlayIcon,
  UserGroupIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftRightIcon,
  PresentationChartBarIcon,
  QrCodeIcon,
  WrenchScrewdriverIcon,
  ClipboardIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ChevronRightIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeSlashIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { useSessionState } from '../hooks/useSessionState';
import { useSignalCapabilities } from '../hooks/useSignalCapabilities';
import { useSessionChat } from '../hooks/useSessionChat';
import { useSessionEvents } from '../hooks/useSessionEvents';
import { DirectorModeDrawer } from './DirectorModeDrawer';
import { PreflightChecklist, type ChecklistItem } from './PreflightChecklist';
import { ArtifactsPanel } from './ArtifactsPanel';
import { SessionChatModal } from './SessionChatModal';
import { StorylineModal } from './StorylineModal';
import { LeaveSessionModal } from './LeaveSessionModal';
import { Toolbelt } from '@/features/tools/components/Toolbelt';
import { updateSessionRoles, type SessionRoleUpdate } from '@/features/play/api/session-api';
import { approveParticipant, kickParticipant, setNextStarter } from '@/features/play-participant/api';
import type { SessionCockpitState, CockpitParticipant, UseSessionStateReturn, SessionEvent as CockpitEvent } from '@/types/session-cockpit';
import type { SessionEvent as EventFeedEvent } from '@/types/session-event';
import type { SessionRole } from '@/types/play-runtime';

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
  | 'settings';

// Session info for display
interface SessionInfo {
  name: string;
  code: string;
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * ParticipantRoleListbox - Assign a role to a participant
 * Uses Headless UI Listbox with online indicator
 */
function ParticipantRoleListbox({
  participant,
  availableRoles,
  onAssign,
  disabled,
}: {
  participant: { id: string; displayName?: string | null; status?: string };
  availableRoles: Array<{ id: string; name: string; color?: string | null }>;
  onAssign: (participantId: string, roleId: string) => void;
  disabled?: boolean;
}) {
  const isOnline = participant.status === 'active' || participant.status === 'joined';
  
  return (
    <Listbox
      value={null}
      onChange={(role: { id: string; name: string; color?: string | null } | null) => role && onAssign(participant.id, role.id)}
      disabled={disabled}
    >
      <div className="relative">
        <ListboxButton className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-sm cursor-pointer hover:bg-muted/50 transition-colors shadow-sm">
          <span
            aria-label={isOnline ? 'Online' : 'Offline'}
            className={cn(
              'inline-block size-2.5 shrink-0 rounded-full ring-2 ring-background',
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            )}
          />
          <span className="font-medium text-foreground truncate max-w-[120px]">
            {participant.displayName || 'Anonym'}
          </span>
          <ChevronUpDownIcon className="h-4 w-4 text-muted-foreground" />
        </ListboxButton>

        <ListboxOptions
          transition
          anchor="bottom start"
          className="z-[100] mt-1 max-h-60 min-w-[180px] overflow-auto rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 py-1 shadow-xl focus:outline-none data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0"
        >
          {availableRoles.map((role) => (
            <ListboxOption
              key={role.id}
              value={role}
              className="group relative cursor-pointer py-2.5 px-3 text-gray-900 dark:text-gray-100 select-none data-[focus]:bg-violet-100 dark:data-[focus]:bg-violet-900/40 data-[focus]:text-violet-900 dark:data-[focus]:text-violet-100"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-block size-3 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: role.color || '#6366f1' }}
                />
                <span className="block truncate text-sm font-medium group-data-[selected]:font-bold">
                  {role.name}
                </span>
              </div>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-violet-600 dark:text-violet-400 group-[&:not([data-selected])]:hidden">
                <CheckIcon aria-hidden="true" className="size-5" />
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

/**
 * RoleParticipantListbox - Assign a participant to a role
 * Uses Headless UI Listbox with online indicator
 */
function RoleParticipantListbox({
  roleId,
  unassignedParticipants,
  onAssign,
  disabled,
  placeholder,
}: {
  roleId: string;
  unassignedParticipants: Array<{ id: string; displayName?: string | null; status?: string }>;
  onAssign: (participantId: string, roleId: string) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <Listbox
      value={null}
      onChange={(p: { id: string; displayName?: string | null; status?: string } | null) => p && onAssign(p.id, roleId)}
      disabled={disabled}
    >
      <div className="relative mt-2">
        <ListboxButton className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm cursor-pointer hover:bg-muted/50 transition-colors shadow-sm">
          <span className="text-muted-foreground truncate">{placeholder}</span>
          <ChevronUpDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        </ListboxButton>

        <ListboxOptions
          transition
          anchor="bottom"
          className="z-[100] mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 py-1 shadow-xl focus:outline-none data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0"
        >
          {unassignedParticipants.map((p) => {
            const isOnline = p.status === 'active' || p.status === 'joined';
            return (
              <ListboxOption
                key={p.id}
                value={p}
                className="group relative cursor-pointer py-2.5 px-3 text-gray-900 dark:text-gray-100 select-none data-[focus]:bg-violet-100 dark:data-[focus]:bg-violet-900/40 data-[focus]:text-violet-900 dark:data-[focus]:text-violet-100"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-label={isOnline ? 'Online' : 'Offline'}
                    className={cn(
                      'inline-block size-2.5 shrink-0 rounded-full ring-1 ring-black/10',
                      isOnline ? 'bg-green-500' : 'bg-gray-400'
                    )}
                  />
                  <span className="block truncate text-sm font-medium group-data-[selected]:font-bold">
                    {p.displayName || 'Anonym'}
                  </span>
                </div>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-violet-600 dark:text-violet-400 group-[&:not([data-selected])]:hidden">
                  <CheckIcon aria-hidden="true" className="size-5" />
                </span>
              </ListboxOption>
            );
          })}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

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
  onNextStep,
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
  onNextStep: () => void;
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

      <div className="grid gap-6">
        <Card className="p-6 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">{tRun('labels.health')}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  _status,
  sessionId,
  onOpenChat,
  chatUnreadCount,
}: {
  session: SessionInfo;
  _status: SessionCockpitState['status'];
  sessionId: string;
  onOpenChat?: () => void;
  chatUnreadCount?: number;
}) {
  const t = useTranslations('play.cockpit');

  return (
    <header className="flex items-center justify-between p-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Left: Game name */}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-foreground truncate">
          {session.name}
        </h1>
      </div>
      
      {/* Right: Chat, toolbelt */}
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
          buttonIcon={<WrenchScrewdriverIcon className="h-4 w-4" />}
        />
      </div>
    </header>
  );
}

function estimateTotalMinutes(steps: SessionCockpitState['steps']): number | null {
  const minutes = steps
    .map((s) => (typeof s.durationMinutes === 'number' ? s.durationMinutes : null))
    .filter((m): m is number => typeof m === 'number')
    .reduce((acc, m) => acc + m, 0);

  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return minutes;
}

function SessionSummaryCard({
  sessionCode,
  participantCount,
  totalMinutes,
  onOpenBoard,
  status,
  onStart,
  onPublish,
  onPause,
  onResume,
  onOpenDirectorMode,
  onBack,
  onEndSession,
  onTakeOffline,
  isLoading,
}: {
  sessionCode: string;
  participantCount: number;
  totalMinutes: number | null;
  onOpenBoard: () => void;
  status: SessionCockpitState['status'];
  onStart: () => void;
  onPublish?: () => void;
  onPause: () => void;
  onResume: () => void;
  onOpenDirectorMode: () => void;
  onBack: () => void;
  onEndSession: () => void;
  onTakeOffline?: () => void;
  isLoading?: boolean;
}) {
  const t = useTranslations('play.cockpit.lobbySummary');
  const [showBackDialog, setShowBackDialog] = useState(false);
  const { success: toastSuccess } = useToast();
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Generate QR code when modal opens
  useEffect(() => {
    if (!qrOpen || !sessionCode || sessionCode === '—') return;
    let active = true;
    const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/participants/join?code=${encodeURIComponent(sessionCode)}`;
    void toDataURL(joinUrl, { margin: 1, width: 256 })
      .then((url: string) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => { active = false; };
  }, [qrOpen, sessionCode]);

  const handleCopyCode = useCallback(() => {
    if (sessionCode && sessionCode !== '—') {
      navigator.clipboard.writeText(sessionCode).then(() => {
        toastSuccess(t('codeCopied'));
      }).catch(() => {
        // Silent fail
      });
    }
  }, [sessionCode, toastSuccess, t]);

  // Status display config
  const statusConfig = {
    lobby: { label: t('status.lobby'), bgClass: 'bg-slate-500/5', textClass: 'text-slate-400/60 dark:text-slate-500/60' },
    draft: { label: t('status.draft'), bgClass: 'bg-slate-500/5', textClass: 'text-slate-400/60 dark:text-slate-500/60' },
    active: { label: t('status.active'), bgClass: 'bg-green-500/5', textClass: 'text-green-600/60 dark:text-green-400/60' },
    paused: { label: t('status.paused'), bgClass: 'bg-amber-500/5', textClass: 'text-amber-600/60 dark:text-amber-400/60' },
    ended: { label: t('status.ended'), bgClass: 'bg-gray-500/5', textClass: 'text-gray-500/60 dark:text-gray-400/60' },
    locked: { label: t('status.locked'), bgClass: 'bg-red-500/5', textClass: 'text-red-500/60 dark:text-red-400/60' },
  };
  const currentStatus = statusConfig[status] || statusConfig.lobby;

  // Connectivity mode: draft = offline, lobby+ = online
  const isOffline = status === 'draft';
  const connectivityLabel = isOffline ? t('connectivity.offline') : t('connectivity.online');
  const connectivityClass = isOffline 
    ? 'text-orange-500/70 dark:text-orange-400/70' 
    : 'text-green-500/70 dark:text-green-400/70';

  return (
    <>
      <Card className="p-4 sm:p-6 border-border/40">
          {/* Session Code with Board and QR icons - with status watermark */}
          <div className={cn('relative overflow-hidden rounded-xl border border-border/40 px-4 py-3', currentStatus.bgClass)}>
            {/* Connectivity indicator - top left corner */}
            <div className="absolute top-2 left-3 pointer-events-none select-none">
              <span className={cn(
                'text-sm font-bold tracking-wide uppercase',
                connectivityClass
              )}>
                {connectivityLabel}
              </span>
            </div>
            
            {/* Status watermark - top right corner */}
            <div className="absolute top-2 right-3 pointer-events-none select-none">
              <span className={cn(
                'text-sm font-bold tracking-wide uppercase',
                currentStatus.textClass
              )}>
                {currentStatus.label}
              </span>
            </div>
            
            {/* Content - positioned above watermark */}
            <div className="relative z-10">
              <div className="text-xs font-medium text-muted-foreground text-center mb-2">{t('sessionCodeLabel')}</div>
              <div className="flex items-center justify-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenBoard}
              className="p-2"
              title={t('openBoard')}
            >
              <PresentationChartBarIcon className="h-6 w-6 text-muted-foreground hover:text-foreground" />
              <span className="sr-only">{t('openBoard')}</span>
            </Button>
            
            <button
              type="button"
              onClick={handleCopyCode}
              className="group relative text-3xl sm:text-4xl font-mono font-bold tracking-widest text-foreground hover:text-primary transition-colors cursor-pointer"
              title={t('copyCode')}
            >
              {sessionCode}
              <ClipboardIcon className="absolute -right-5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQrOpen(true)}
              className="p-2"
              title={t('showQrCode')}
            >
              <QrCodeIcon className="h-6 w-6 text-muted-foreground hover:text-foreground" />
              <span className="sr-only">{t('showQrCode')}</span>
            </Button>
              </div>
            </div>
          </div>

        {/* Participants and Total Time */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/40 bg-background/80 backdrop-blur-sm px-4 py-3">
            <div className="text-xs font-medium text-muted-foreground">{t('participantsLabel')}</div>
            <div className="mt-1 text-xl font-semibold text-foreground">{participantCount}</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/80 backdrop-blur-sm px-4 py-3">
            <div className="text-xs font-medium text-muted-foreground">{t('totalTimeLabel')}</div>
            <div className="mt-1 text-xl font-semibold text-foreground">
              {totalMinutes ? t('minutes', { minutes: totalMinutes }) : t('unknown')}
            </div>
          </div>
        </div>

        {/* Session Controls - fixed width layout for symmetry */}
        <div className="mt-4 flex items-center gap-2">
          {/* Back button (small, left) - 20% width */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBackDialog(true)}
            className="w-[20%] min-w-[70px]"
          >
            {t('controls.back')}
          </Button>
          
          {/* Director Mode button (large, center) - 60% width */}
          <Button
            variant="default"
            onClick={onOpenDirectorMode}
            className="w-[60%] h-10"
          >
            {t('controls.directorMode')}
          </Button>
          
          {/* Dynamic Start/Pause/Resume/Publish button (small, right) - 20% width */}
          <div className="w-[20%] min-w-[70px]">
            {status === 'draft' && onPublish && (
              <Button
                onClick={onPublish}
                disabled={isLoading}
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </span>
                ) : (
                  t('controls.publish')
                )}
              </Button>
            )}
            {status === 'lobby' && (
              <Button
                onClick={onStart}
                disabled={isLoading}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </span>
                ) : (
                  t('controls.start')
                )}
              </Button>
            )}
            {status === 'active' && (
              <Button
                variant="outline"
                onClick={onPause}
                disabled={isLoading}
                size="sm"
                className="w-full"
              >
                {t('controls.pause')}
              </Button>
            )}
            {status === 'paused' && (
              <Button
                onClick={onResume}
                disabled={isLoading}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {t('controls.resume')}
              </Button>
            )}
            {status === 'ended' && (
              <Button
                variant="secondary"
                disabled
                size="sm"
                className="w-full"
              >
                {t('controls.ended')}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Leave Session Modal */}
      <LeaveSessionModal
        open={showBackDialog}
        onClose={() => setShowBackDialog(false)}
        status={status}
        onGoBack={onBack}
        onTakeOffline={onTakeOffline}
        onEndSession={onEndSession}
      />

      {/* QR Code Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('qrTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- data URL, no optimization benefit from next/image */
              <img src={qrDataUrl} alt="QR Code" className="rounded-lg" />
            ) : (
              <div className="h-64 w-64 flex items-center justify-center bg-muted rounded-lg">
                <span className="text-muted-foreground">{t('generatingQr')}</span>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-mono font-bold tracking-widest">{sessionCode}</div>
              <div className="text-sm text-muted-foreground mt-1">{t('qrDescription')}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PreflightState {
  ready: boolean;
  items: ChecklistItem[];
}

/**
 * LobbyPreflightCard - Unified checklist and start button component
 * 
 * Shows all preflight checks with their status, separated by phase (offline/online).
 * In draft mode: shows offline items and "Publish" button
 * In lobby mode: shows online items and "Start Session" button
 */
function LobbyPreflightCard({
  preflight,
  onShowFullChecklist,
  onStartSession,
  onPublishSession,
  isStarting,
  sessionStatus,
}: {
  preflight: PreflightState;
  onShowFullChecklist: () => void;
  onStartSession: () => void;
  onPublishSession?: () => void;
  isStarting: boolean;
  sessionStatus: SessionCockpitState['status'];
}) {
  const t = useTranslations('play.cockpit.preflight');
  const { items } = preflight;
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isOfflineMode = sessionStatus === 'draft';
  
  // Separate items by phase
  const offlineItems = items.filter((i) => i.phase === 'offline' || !i.phase);
  const onlineItems = items.filter((i) => i.phase === 'online');
  
  // In draft mode, show offline items. In lobby mode, show online items.
  const currentPhaseItems = isOfflineMode ? offlineItems : onlineItems;
  const visibleItems = currentPhaseItems.slice(0, 6);
  const remaining = Math.max(0, currentPhaseItems.length - visibleItems.length);

  // Calculate status counts for current phase
  const errorCount = currentPhaseItems.filter((i) => i.status === 'error').length;
  const warningCount = currentPhaseItems.filter((i) => i.status === 'warning').length;
  const pendingCount = currentPhaseItems.filter((i) => i.status === 'pending').length;
  const readyCount = currentPhaseItems.filter((i) => i.status === 'ready').length;
  
  // Check if current phase is ready (no errors)
  const phaseReady = !currentPhaseItems.some((i) => i.status === 'error');

  const iconFor = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircleIcon className="h-5 w-5 text-green-600 shrink-0" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-destructive shrink-0" />;
      case 'pending':
      default:
        return <span className="inline-block h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />;
    }
  };

  const handleStartClick = () => {
    if (isOfflineMode) {
      // In offline mode, publish the session
      if (phaseReady && onPublishSession) {
        onPublishSession();
      } else if (onPublishSession) {
        setShowConfirmDialog(true);
      }
    } else {
      // In lobby mode, start the session
      if (phaseReady) {
        onStartSession();
      } else {
        setShowConfirmDialog(true);
      }
    }
  };

  const handleConfirmStart = () => {
    setShowConfirmDialog(false);
    if (isOfflineMode && onPublishSession) {
      onPublishSession();
    } else {
      onStartSession();
    }
  };

  return (
    <>
      <Card className="p-4">
        {/* Header with title and summary */}
        <div className="mb-4">
          <div className="text-base font-semibold text-foreground">
            {isOfflineMode ? t('titleOffline') : t('titleOnline')}
          </div>
          <div className="text-sm text-muted-foreground">
            {phaseReady 
              ? t('allChecksOk')
              : `${readyCount} ${t('readyLabel')}, ${pendingCount + warningCount + errorCount} ${t('remainingLabel')}`
            }
          </div>
        </div>

        {/* Checklist items */}
        <div className="space-y-2 mb-4">
          {visibleItems.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2 transition-colors",
                item.status === 'ready' 
                  ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                  : item.status === 'error'
                    ? 'bg-destructive/5 border-destructive/30'
                    : item.status === 'warning'
                      ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
                      : 'bg-muted/20 border-border'
              )}
            >
              {iconFor(item.status)}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                {item.detail && (
                  <div className="text-xs text-muted-foreground line-clamp-1">{item.detail}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {remaining > 0 && (
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={onShowFullChecklist} className="px-2 text-xs">
              {t('showAll', { count: remaining })}
            </Button>
          </div>
        )}

        {/* Action Button - Publish (offline) or Start Session (online) */}
        <Button
          onClick={handleStartClick}
          disabled={isStarting}
          className={cn(
            "w-full h-12 text-base font-medium transition-all",
            phaseReady
              ? isOfflineMode 
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
              : "bg-muted hover:bg-muted/80 text-muted-foreground border border-border"
          )}
        >
          {isStarting ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {isOfflineMode ? t('publishing') : t('starting')}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <PlayIcon className="h-5 w-5" />
              {isOfflineMode ? t('publishSession') : t('startSession')}
            </span>
          )}
        </Button>

        {!phaseReady && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {errorCount > 0 
              ? t('hasErrors', { count: errorCount })
              : warningCount > 0 
                ? t('hasWarnings', { count: warningCount })
                : t('hasPending', { count: pendingCount })
            }
          </p>
        )}
      </Card>

      {/* Confirmation Dialog for starting without requirements met */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmStart.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmStart.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="mt-3 space-y-1">
            {items
              .filter((i) => i.status !== 'ready')
              .slice(0, 5)
              .map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  {iconFor(item.status)}
                  <span>{item.label}</span>
                </li>
              ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('confirmStart.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStart}>
              {t('confirmStart.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ParticipantsTab({
  participants,
  roles,
  onAssignRole,
  onUnassignRole,
  onSnapshotRoles,
  onKickParticipant: _onKickParticipant,
  onApproveParticipant: _onApproveParticipant,
  onMarkNext: _onMarkNext,
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
  
  // State
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [allSecretsUnlocked, setAllSecretsUnlocked] = useState(false);
  const [assigningRandomly, setAssigningRandomly] = useState(false);
  
  // Computed values
  const connectedCount = participants.filter((p) => p.status === 'active' || p.status === 'joined').length;
  const assignedCount = participants.filter((p) => p.assignedRoleId).length;
  const unassignedParticipants = participants.filter((p) => !p.assignedRoleId);
  
  // Role data with assignments
  const rolesWithAssignments = roles.map((role) => {
    const assignedParticipants = participants.filter((p) => p.assignedRoleId === role.id);
    const min = role.min_count ?? 0;
    const max = role.max_count;
    return {
      ...role,
      assignedParticipants,
      min,
      max,
      isSatisfied: assignedParticipants.length >= min,
      isFull: max !== null && max !== undefined && assignedParticipants.length >= max,
    };
  });

  const allMinsSatisfied = rolesWithAssignments.every((r) => r.isSatisfied);
  const hasSecretContent = roles.some(r => r.private_instructions || r.private_hints);

  // Random assignment handler
  const handleRandomAssign = () => {
    if (unassignedParticipants.length === 0 || isReadOnly) return;
    setAssigningRandomly(true);
    
    // Simple random assignment logic - assign each unassigned participant to a random available role
    const shuffled = [...unassignedParticipants].sort(() => Math.random() - 0.5);
    for (const participant of shuffled) {
      const availableRoles = rolesWithAssignments.filter(r => !r.isFull);
      if (availableRoles.length === 0) break;
      const randomRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];
      onAssignRole(participant.id, randomRole.id);
    }
    
    setAssigningRandomly(false);
  };

  // Toggle all secrets
  const toggleAllSecrets = () => {
    setAllSecretsUnlocked(prev => !prev);
  };

  // No roles state
  if (roles.length === 0) {
    return (
      <Card className="p-6 text-center space-y-3">
        <UserGroupIcon className="h-12 w-12 mx-auto opacity-30" />
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
    );
  }

  return (
    <div className="space-y-2">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-lg">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">
            {connectedCount} online • {assignedCount}/{participants.length} {t('assigned')}
          </div>
          {!allMinsSatisfied && (
            <div className="text-xs text-warning flex items-center gap-1">
              <ExclamationTriangleIcon className="h-3 w-3" />
              {t('minsNotSatisfied')}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {unassignedParticipants.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRandomAssign}
              disabled={isReadOnly || assigningRandomly}
              className="gap-1.5"
            >
              <BoltIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('randomAssign')}</span>
              <span className="sm:hidden">🎲</span>
            </Button>
          )}
          {hasSecretContent && (
            <Button
              variant={allSecretsUnlocked ? 'outline' : 'secondary'}
              size="sm"
              onClick={toggleAllSecrets}
              className="gap-1.5"
            >
              {allSecretsUnlocked ? (
                <>
                  <LockClosedIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('lockAllSecrets')}</span>
                </>
              ) : (
                <>
                  <LockOpenIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('unlockAllSecrets')}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Participants Overview - Show unassigned first */}
      {unassignedParticipants.length > 0 && (
        <Card className="p-2 border-dashed border-border/50 bg-muted/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('unassignedParticipants')} ({unassignedParticipants.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unassignedParticipants.map((p) => (
              <ParticipantRoleListbox
                key={p.id}
                participant={p}
                availableRoles={rolesWithAssignments.filter(r => !r.isFull)}
                onAssign={onAssignRole}
                disabled={isReadOnly}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Unified Role Cards with Participants */}
      <div className="space-y-1.5">
        {rolesWithAssignments.map((role) => {
          const isExpanded = expandedRoleId === role.id;
          const secretsVisible = allSecretsUnlocked;
          const hasSecrets = Boolean(role.private_instructions || role.private_hints);

          return (
            <Card 
              key={role.id} 
              className={cn(
                'overflow-hidden transition-all border-border/50',
                !role.isSatisfied && 'border-warning/50 bg-warning/5'
              )}
            >
              {/* Role Header - Always visible */}
              <button
                type="button"
                onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
              >
                {/* Role icon/avatar */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ 
                    backgroundColor: role.color || '#6366f1', 
                    color: 'white' 
                  }}
                >
                  {role.icon || role.name.charAt(0).toUpperCase()}
                </div>

                {/* Role info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground truncate">{role.name}</span>
                    {hasSecrets && (
                      <LockClosedIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className={cn(
                      !role.isSatisfied && 'text-warning font-medium'
                    )}>
                      {role.assignedParticipants.length}/{role.min}{role.max === null || role.max === undefined ? '+' : `-${role.max}`}
                    </span>
                    {role.assignedParticipants.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          {role.assignedParticipants.map(p => p.displayName || tParticipants('anonymous')).join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Assigned avatars (mobile-friendly) */}
                <div className="flex -space-x-1.5 shrink-0">
                  {role.assignedParticipants.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-medium border-2 border-background"
                      title={p.displayName || tParticipants('anonymous')}
                    >
                      {p.displayName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  ))}
                  {role.assignedParticipants.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-medium border-2 border-background">
                      +{role.assignedParticipants.length - 3}
                    </div>
                  )}
                </div>

                <ChevronRightIcon className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform shrink-0',
                  isExpanded && 'rotate-90'
                )} />
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border/50 px-3 py-2 space-y-3 bg-muted/10">
                  {/* Role Description */}
                  {role.public_description && (
                    <p className="text-sm text-muted-foreground">
                      {role.public_description}
                    </p>
                  )}

                  {/* Secret Instructions */}
                  {hasSecrets && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        {secretsVisible ? <LockOpenIcon className="h-3 w-3" /> : <LockClosedIcon className="h-3 w-3" />}
                        {t('secretInstructions')}
                      </div>
                      {secretsVisible ? (
                        <div className="space-y-1.5">
                          {role.private_instructions && (
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                              <p className="text-xs text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                                {role.private_instructions}
                              </p>
                            </div>
                          )}
                          {role.private_hints && (
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                              <div className="text-[10px] font-medium text-blue-700 dark:text-blue-400 mb-0.5">💡 Tips</div>
                              <p className="text-xs text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                                {role.private_hints}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground italic flex items-center gap-1.5">
                          <EyeSlashIcon className="h-3.5 w-3.5" />
                          {t('secretInstructionsLocked')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assigned Participants */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('assignedToRole')} ({role.assignedParticipants.length})
                    </span>
                    {role.assignedParticipants.length > 0 ? (
                      <div className="space-y-1">
                        {role.assignedParticipants.map((p) => (
                          <div 
                            key={p.id} 
                            className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border border-border/30"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                                {p.displayName?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <span className="text-xs font-medium truncate">
                                {p.displayName || tParticipants('anonymous')}
                              </span>
                              {(p.status === 'active' || p.status === 'joined') && (
                                <span className="text-green-500 text-xs">●</span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUnassignRole(p.id)}
                              disabled={isReadOnly}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <XCircleIcon className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic py-1">
                        {t('noParticipantsAssigned')}
                      </div>
                    )}

                    {/* Quick assign dropdown */}
                    {unassignedParticipants.length > 0 && !role.isFull && (
                      <RoleParticipantListbox
                        roleId={role.id}
                        unassignedParticipants={unassignedParticipants}
                        onAssign={onAssignRole}
                        disabled={isReadOnly}
                        placeholder={t('addParticipantToRole')}
                      />
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* No Participants State */}
      {participants.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <UserGroupIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{tParticipants('noParticipantsYet')}</p>
          <p className="text-sm mt-2">{tParticipants('shareCodeToInvite')}</p>
        </Card>
      )}
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
  const tStoryline = useTranslations('play.storyline');
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
    safetyInfo,
    preflightItems,
    canStartDirectorMode,
    // Actions
    enterDirectorMode,
    exitDirectorMode,
    startSession,
    publishSession,
    unpublishSession,
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
  const [showStoryline, setShowStoryline] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, SessionRoleUpdate>>({});
  const [rolesSaving, setRolesSaving] = useState(false);
  const [rolesSaveError, setRolesSaveError] = useState<string | null>(null);
  
  // Director mode drawer state
  const [directorModeOpen, setDirectorModeOpen] = useState(false);

  // Sync director mode with session status (open when live/paused, close when lobby)
  useEffect(() => {
    if (status === 'active' || status === 'paused') {
      setDirectorModeOpen(true);
    } else if (status === 'lobby' || status === 'draft') {
      setDirectorModeOpen(false);
    }
  }, [status]);

  // Session info for header (always show; fall back while loading)
  const session: SessionInfo = {
    name: displayName || t('session.fallbackName'),
    code: sessionCode || '—',
  };

  const totalMinutes = useMemo(() => estimateTotalMinutes(steps), [steps]);

  // Chat is always enabled - host can write on wall before session starts
  const chatEnabled = true;

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

  // Tabs configuration - icon-only tabs
  const tabs = [
    { id: 'run', label: '', icon: <PlayIcon className="h-5 w-5" />, title: tTabs('run') },
    { id: 'participants', label: '', icon: <UserGroupIcon className="h-5 w-5" />, title: tTabs('participants') },
    { id: 'artifacts', label: '', icon: <DocumentTextIcon className="h-5 w-5" />, badge: artifacts.length, title: tTabs('artifacts') },
    { id: 'triggers', label: '', icon: <BoltIcon className="h-5 w-5" />, badge: triggers.filter((tr) => tr.status === 'armed').length || undefined, title: tTabs('triggers') },
    { id: 'settings', label: '', icon: <Cog6ToothIcon className="h-5 w-5" />, title: tTabs('settings') },
  ] as Array<{ id: CockpitTab; label: string; icon?: ReactNode; badge?: number; title?: string }>;

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
          _status={status}
          sessionId={sessionId}
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
          
          {/* Session Summary */}
          {status !== 'ended' && (
            <div className="mb-6 space-y-4">
              <SessionSummaryCard
                sessionCode={sessionCode || '—'}
                participantCount={participants.length}
                totalMinutes={totalMinutes}
                onOpenBoard={() => {
                  // Open board in new tab
                  if (sessionCode) {
                    window.open(`/board/${sessionCode}`, '_blank');
                  }
                }}
                status={status}
                onStart={handleEnterDirectorMode}
                onPublish={publishSession}
                onPause={pauseSession}
                onResume={resumeSession}
                onOpenDirectorMode={() => setDirectorModeOpen(true)}
                onBack={() => {
                  // Navigate back to sessions list
                  window.location.href = '/app/play';
                }}
                onEndSession={endSession}
                onTakeOffline={unpublishSession}
                isLoading={isLoading}
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
            {(status === 'lobby' || status === 'draft') && (
              <>
                <LobbyPreflightCard
                  preflight={checklistData}
                  onShowFullChecklist={() => setShowChecklist(true)}
                  onStartSession={handleEnterDirectorMode}
                  onPublishSession={publishSession}
                  isStarting={isLoading}
                  sessionStatus={status}
                />

                {/* Storyline button */}
                {steps.length > 0 && (
                  <Card className="p-4 border-border/40">
                    <button
                      type="button"
                      onClick={() => setShowStoryline(true)}
                      className="w-full flex items-center gap-3 text-left hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <BookOpenIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">{tStoryline('buttonLabel')}</div>
                        <div className="text-sm text-muted-foreground">{tStoryline('buttonDescription')}</div>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                    </button>
                  </Card>
                )}
              </>
            )}

            {status !== 'lobby' && status !== 'draft' && (
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
                onNextStep={nextStep}
                lastSyncAt={lastSyncAt ?? null}
              />
            )}

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

        <SessionChatModal
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          role="host"
          messages={chat.messages}
          error={chat.error}
          sending={chat.sending}
          onSend={chat.send}
          participants={participants.map(p => ({
            id: p.id,
            displayName: p.displayName || 'Anonym',
          }))}
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

        {/* Storyline Modal */}
        <StorylineModal
          open={showStoryline}
          onClose={() => setShowStoryline(false)}
          title={displayName || tStoryline('title')}
          steps={steps}
          phases={phases}
          safetyInfo={safetyInfo}
        />
      </div>
    </SessionCockpitContext.Provider>
  );
}

export default SessionCockpit;
