/**
 * DirectorModePanel — Presentational Core
 *
 * The shared UI for Director Mode, usable in two contexts:
 *
 *   1. **Session Director** — rendered inside DirectorModeDrawer as
 *      a full-screen overlay with realtime data and action callbacks.
 *
 *   2. **Game Director Preview** — rendered as a standalone page with
 *      static game data, no session, no realtime, and no-op callbacks.
 *
 * This component owns the visual layout (header, tabs, content, footer)
 * but has ZERO side-effects — no subscriptions, no fetches, no
 * fullscreen management, no keyboard shortcuts, no scroll locks.
 * All of that stays in the host (Drawer or Preview page).
 *
 * Architecture rule:
 *   If `isPreview` is true, interactive action buttons (signals, fire
 *   trigger, reset, chat) are hidden or disabled. The user can still
 *   navigate steps and read leader scripts.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  PlayIcon,
  BoltIcon,
  ClockIcon,
  SignalIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  LightBulbIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { StopIcon } from '@heroicons/react/24/solid';
import type {
  CockpitStep,
  CockpitPhase,
  CockpitTrigger,
  CockpitArtifact,
  ArtifactState,
  SessionEvent,
  Signal,
  SessionCockpitStatus,
  TriggerActionResult,
} from '@/types/session-cockpit';
import { DirectorChipLane } from './DirectorChipLane';
import type { DirectorChip, DirectorChipType } from './DirectorChipLane';
import { DirectorStagePanel } from './DirectorStagePanel';
import { DirectorTriggerCard, type PendingAction } from './DirectorTriggerCard';
import { DrawerOverlay, PlayHeader, PlayTopArea, getSessionStatusConfig } from '@/features/play/components/shared';
import { NowSummaryRow } from '@/features/play/components/shared';
import {
  sortedSignalEvents,
  selectLatestUnhandledSignal,
  countUnhandledSignals,
  extractSignalMeta,
  getSignalChannelLabel,
  getSignalDirectionLabel,
} from '@/features/play/utils/signalHelpers';

// =============================================================================
// Types
// =============================================================================

export type DirectorTab = 'play' | 'time' | 'artifacts' | 'triggers' | 'signals' | 'events';
export type DirectorDrawerType = 'time' | 'artifacts' | 'triggers' | 'signals' | 'events';

export interface DirectorModePanelProps {
  /** Title shown in header */
  title: string;
  /** Session status (or 'draft' for preview) */
  status: SessionCockpitStatus;
  /** If true, this is a read-only preview — no session exists */
  isPreview?: boolean;

  /** Steps */
  steps: CockpitStep[];
  /** Current step index */
  currentStepIndex: number;
  /** Phases (may be empty) */
  phases: CockpitPhase[];
  /** Current phase index */
  currentPhaseIndex: number;

  /** Triggers */
  triggers: CockpitTrigger[];
  /** Recent signals */
  recentSignals: Signal[];
  /** Device signal presets */
  signalPresets?: Array<{
    id: string;
    name: string;
    type: 'torch' | 'audio' | 'vibration' | 'screen_flash' | 'notification';
    color?: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  /** Recent events */
  events: SessionEvent[];

  /** Time bank balance (seconds) */
  timeBankBalance: number;
  /** Time bank paused? */
  timeBankPaused: boolean;

  /** Participant count */
  participantCount: number;

  /** Artifacts */
  artifacts: CockpitArtifact[];
  /** Artifact states */
  artifactStates: Record<string, ArtifactState>;

  // Actions — all optional so preview can omit them
  onNextStep?: () => void;
  onPreviousStep?: () => void;
  onFireTrigger?: (triggerId: string) => Promise<TriggerActionResult>;
  onArmTrigger?: (triggerId: string) => Promise<TriggerActionResult>;
  onDisableTrigger?: (triggerId: string) => Promise<TriggerActionResult>;
  onDisableAllTriggers?: () => void;
  onSendSignal?: (channel: string, payload: unknown) => void;
  onExecuteSignal?: (type: string, config: Record<string, unknown>) => Promise<void>;
  onTimeBankDelta?: (delta: number, reason: string) => void;
  onOpenChat?: () => void;
  chatUnreadCount?: number;
  onRevealArtifact?: (artifactId: string) => Promise<void>;
  onHideArtifact?: (artifactId: string) => Promise<void>;
  onResetArtifact?: (artifactId: string) => Promise<void>;

  // Chrome
  onClose: () => void;
  /** Show fullscreen button? (only in drawer context) */
  showFullscreenButton?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Connection quality (derived from realtime status) */
  connectionState?: 'connected' | 'degraded' | 'offline';
  /** Director chip lane — host-side system cues */
  directorChips?: DirectorChip[];
  directorChipLabels?: Record<DirectorChipType, string>;
  onDirectorChipClick?: (chip: DirectorChip) => void;
  /** Step start times for per-step timer */
  stepStartTimes?: Map<number, number>;
  /** Swipe ref for mobile gestures */
  swipeRef?: React.RefObject<HTMLDivElement | null>;
  /** Reset confirm pending state (managed by parent) */
  resetConfirmPending?: boolean;
  onResetClick?: () => void;

  className?: string;
}

// =============================================================================
// Status config — delegates to shared SSoT
// =============================================================================

// =============================================================================
// Sub-components
// =============================================================================

// StepNavigation + LeaderScriptPanel extracted into DirectorStagePanel.tsx

/** Signal Strip — compact "latest signal" bar for the stage surface */
function SignalStrip({
  events,
  handledSignalIds,
  onOpenSignals,
  t,
}: {
  events: SessionEvent[];
  handledSignalIds: Set<string>;
  onOpenSignals: (signalId: string) => void;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
}) {
  // Deterministic: sort signals by timestamp desc, pick first unhandled
  const latestSignal = selectLatestUnhandledSignal(events, handledSignalIds);
  if (!latestSignal) return null;

  const { channel, sender, direction } = extractSignalMeta(latestSignal);
  const channelLabel = getSignalChannelLabel(channel, (k) => t(`signalInbox.${k}`));
  const directionLabel = getSignalDirectionLabel(
    channelLabel,
    direction,
    sender,
    (k, v) => t(`signalInbox.${k}`, v),
  );
  const timestamp = new Date(latestSignal.timestamp);
  const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Severity-based border colour
  const isUrgent = direction === 'incoming';

  return (
    <button
      type="button"
      onClick={() => onOpenSignals(latestSignal.id)}
      className={cn(
        'mx-5 mb-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors active:scale-[0.99] animate-in fade-in slide-in-from-bottom-1 duration-200',
        isUrgent
          ? 'border-orange-200/50 bg-orange-50/50 hover:bg-orange-50 dark:border-orange-800/30 dark:bg-orange-950/10 dark:hover:bg-orange-950/20'
          : 'border-blue-200/50 bg-blue-50/50 hover:bg-blue-50 dark:border-blue-800/30 dark:bg-blue-950/10 dark:hover:bg-blue-950/20',
      )}
    >
      <span className="flex h-2 w-2 shrink-0">
        <span className={cn(
          'animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75',
          isUrgent ? 'bg-orange-400' : 'bg-blue-400',
        )} />
        <span className={cn(
          'relative inline-flex h-2 w-2 rounded-full',
          isUrgent ? 'bg-orange-500' : 'bg-blue-500',
        )} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-foreground truncate">
          {directionLabel}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0">{timeStr}</span>
      <span className={cn(
        'text-[10px] font-medium shrink-0',
        isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400',
      )}>
        {t('stage.openSignal')}
      </span>
    </button>
  );
}

function StepTimerSection({
  steps,
  currentIndex,
  stepStartTimes,
  t,
}: {
  steps: CockpitStep[];
  currentIndex: number;
  stepStartTimes: Map<number, number>;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
}) {
  const [now, setNow] = useState(() => Date.now());

  // Tick every second for elapsed display
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (steps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {t('stepTimer.noData')}
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-6">
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {t('stepTimer.title')}
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex;
          const startTime = stepStartTimes.get(i);
          const elapsedMs = startTime ? now - startTime : 0;
          const elapsedMin = Math.floor(elapsedMs / 60000);
          const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
          const planned = step.durationMinutes;
          const isOvertime = planned && elapsedMin >= planned;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                isCurrent
                  ? 'bg-primary/10 border border-primary/30 font-medium'
                  : i < currentIndex
                    ? 'bg-muted/30 text-muted-foreground'
                    : 'text-muted-foreground/60'
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs w-5 text-center shrink-0">{i + 1}</span>
                <span className="truncate">{step.title}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {startTime && (
                  <span className={cn(
                    'font-mono text-xs',
                    isOvertime ? 'text-red-500 font-bold' : 'text-foreground'
                  )}>
                    {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}
                  </span>
                )}
                {planned ? (
                  <span className="text-xs text-muted-foreground">
                    / {t('stepTimer.minutes', { count: planned })}
                  </span>
                ) : (
                  !startTime && <span className="text-xs text-muted-foreground/50">{t('stepTimer.noDuration')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeBankTab({
  balance,
  paused,
  onDelta,
  steps,
  currentStepIndex,
  stepStartTimes,
  t,
  disabled,
}: {
  balance: number;
  paused: boolean;
  onDelta?: (delta: number, reason: string) => void;
  steps: CockpitStep[];
  currentStepIndex: number;
  stepStartTimes: Map<number, number>;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
  disabled?: boolean;
}) {
  const minutes = Math.floor(balance / 60);
  const seconds = balance % 60;

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          {t('timeBank.title')}
        </div>
        <div className="text-6xl font-mono font-bold text-primary tracking-tight">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        {paused && (
          <Badge variant="warning" size="sm" className="mt-3">
            {t('timeBank.paused')}
          </Badge>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="lg" className="h-12 px-5 text-base" disabled={disabled || !onDelta}
          onClick={() => onDelta?.(-60, t('timeBank.manualAdjustment'))}>−1 min</Button>
        <Button variant="outline" size="lg" className="h-12 px-5 text-base" disabled={disabled || !onDelta}
          onClick={() => onDelta?.(-30, t('timeBank.manualAdjustment'))}>−30s</Button>
        <Button variant="outline" size="lg" className="h-12 px-5 text-base" disabled={disabled || !onDelta}
          onClick={() => onDelta?.(30, t('timeBank.manualAdjustment'))}>+30s</Button>
        <Button variant="outline" size="lg" className="h-12 px-5 text-base" disabled={disabled || !onDelta}
          onClick={() => onDelta?.(60, t('timeBank.manualAdjustment'))}>+1 min</Button>
      </div>

      <StepTimerSection
        steps={steps}
        currentIndex={currentStepIndex}
        stepStartTimes={stepStartTimes}
        t={t}
      />
    </div>
  );
}

type TriggerFilter = 'all' | 'armed' | 'fired' | 'error' | 'disabled';

// ── Smart trigger ranking ──
// Rank triggers by relevance to the director's current position in the game.
function rankTrigger(
  trigger: CockpitTrigger,
  steps: CockpitStep[],
  currentStepIndex: number,
  currentPhaseIndex: number,
): number {
  const conditionType = trigger.conditionType || (trigger.condition?.type as string) || '';
  const cond = trigger.condition ?? {};

  // Manual triggers: always top priority
  if (conditionType === 'manual') return 0;

  // Extract phase/step references from condition JSONB
  const condStepId = (cond.step_id ?? cond.stepId) as string | undefined;
  const condStepIndex = (cond.step_index ?? cond.stepIndex) as number | undefined;
  const condPhaseId = (cond.phase_id ?? cond.phaseId) as string | undefined;
  const condPhaseIndex = (cond.phase_index ?? cond.phaseIndex) as number | undefined;

  const currentStep = steps[currentStepIndex];
  const currentPhaseId = currentStep?.phaseId;

  // Check if trigger targets current step
  if (condStepId && currentStep && condStepId === currentStep.id) return 1;
  if (condStepIndex != null && condStepIndex === currentStepIndex) return 1;

  // Check if trigger targets current phase
  if (condPhaseId && currentPhaseId && condPhaseId === currentPhaseId) return 2;
  if (condPhaseIndex != null && condPhaseIndex === currentPhaseIndex) return 2;

  // Check if trigger targets next step (current + 1)
  const nextStep = steps[currentStepIndex + 1];
  if (condStepId && nextStep && condStepId === nextStep.id) return 3;
  if (condStepIndex != null && condStepIndex === currentStepIndex + 1) return 3;

  // Everything else
  return 5;
}

function TriggerPanel({
  triggers,
  steps,
  currentStepIndex,
  currentPhaseIndex,
  onFire,
  onRearm,
  onDisable,
  onDisableAll,
  t,
  disabled,
}: {
  triggers: CockpitTrigger[];
  steps: CockpitStep[];
  currentStepIndex: number;
  currentPhaseIndex: number;
  onFire?: (id: string) => Promise<TriggerActionResult>;
  onRearm?: (id: string) => Promise<TriggerActionResult>;
  onDisable?: (id: string) => Promise<TriggerActionResult>;
  onDisableAll?: () => void;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [filter, setFilter] = useState<TriggerFilter>('all');

  // ── Sticky override per session (sessionStorage keyed on URL path) ──
  const overrideStorageKey = typeof window !== 'undefined'
    ? `lekbanken:directorOverride:${window.location.pathname}`
    : '';
  const [overrideEnabled, setOverrideEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return sessionStorage.getItem(overrideStorageKey) === '1'; } catch { return false; }
  });
  const handleOverrideChange = useCallback((checked: boolean) => {
    setOverrideEnabled(checked);
    try { sessionStorage.setItem(overrideStorageKey, checked ? '1' : '0'); } catch {}
  }, [overrideStorageKey]);

  const [confirmFireId, setConfirmFireId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    all: triggers.length,
    armed: triggers.filter((tr) => tr.status === 'armed').length,
    fired: triggers.filter((tr) => tr.status === 'fired').length,
    error: triggers.filter((tr) => tr.status === 'error').length,
    disabled: triggers.filter((tr) => tr.status === 'disabled').length,
  }), [triggers]);

  const filteredTriggers = useMemo(() => {
    const list = filter === 'all' ? [...triggers] : triggers.filter((tr) => tr.status === filter);

    const STATUS_ORDER: Record<string, number> = { armed: 0, error: 1, fired: 2, disabled: 3 };
    list.sort((a, b) => {
      // Primary: relevance rank (manual/current-step/current-phase/next/rest)
      const ra = rankTrigger(a, steps, currentStepIndex, currentPhaseIndex);
      const rb = rankTrigger(b, steps, currentStepIndex, currentPhaseIndex);
      if (ra !== rb) return ra - rb;
      // Secondary: status order
      const sa = STATUS_ORDER[a.status] ?? 9;
      const sb = STATUS_ORDER[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      // Tertiary: alphabetical
      return (a.name ?? '').localeCompare(b.name ?? '');
    });

    return list;
  }, [triggers, filter, steps, currentStepIndex, currentPhaseIndex]);

  const filters: Array<{ key: TriggerFilter; label: string; count: number }> = [
    { key: 'all', label: t('triggers.filterAll'), count: counts.all },
    { key: 'armed', label: t('triggers.filterArmed'), count: counts.armed },
    { key: 'fired', label: t('triggers.filterFired'), count: counts.fired },
    { key: 'error', label: t('triggers.filterError'), count: counts.error },
    { key: 'disabled', label: t('triggers.filterDisabled'), count: counts.disabled },
  ];

  // ── Override fire: non-manual triggers need confirm dialog ──
  const handleFireWithOverrideCheck = useCallback(async (triggerId: string): Promise<TriggerActionResult> => {
    const trigger = triggers.find((tr) => tr.id === triggerId);
    if (!trigger) return { ok: false, action: 'fire', triggerId, kind: 'action_failed', httpStatus: 0, errorCode: 'TRIGGER_NOT_FOUND', message: 'Trigger not found' };
    const isManual = (trigger.conditionType || (trigger.condition?.type as string)) === 'manual';
    if (isManual) {
      return await onFire?.(triggerId) ?? { ok: false, action: 'fire', triggerId, kind: 'action_failed', httpStatus: 0, errorCode: 'NO_HANDLER', message: 'No fire handler' };
    } else {
      // Non-manual: require confirm (result returned from handleConfirmOverrideFire)
      setConfirmFireId(triggerId);
      // For non-manual, the actual fire happens in handleConfirmOverrideFire
      // Return a synthetic success since the confirm dialog takes over
      return { ok: true, action: 'fire', triggerId };
    }
  }, [triggers, onFire]);

  const handleConfirmOverrideFire = useCallback(async () => {
    if (confirmFireId) {
      await onFire?.(confirmFireId);
      setConfirmFireId(null);
    }
  }, [confirmFireId, onFire]);

  // ── Pending timeout handler → toast ──
  const handlePendingTimeout = useCallback((triggerId: string, action: PendingAction) => {
    const trigger = triggers.find((tr) => tr.id === triggerId);
    const name = trigger?.name ?? triggerId;
    toast.warning(
      t('triggers.pendingTimeout', { name, action: action ?? 'unknown' }),
      t('triggers.pendingTimeoutTitle'),
    );
  }, [triggers, toast, t]);

  // ── Request error handler → diagnostic toast (uses `kind` for classification) ──
  const handleRequestError = useCallback((triggerId: string, action: PendingAction, result: Extract<TriggerActionResult, { ok: false }>) => {
    const trigger = triggers.find((tr) => tr.id === triggerId);
    const name = trigger?.name ?? triggerId;
    if (result.kind === 'request_failed') {
      toast.error(
        t('triggers.requestFailed', { name }),
        t('triggers.requestFailedTitle'),
      );
    } else {
      toast.error(
        t('triggers.actionFailed', { name, errorCode: result.errorCode }),
        t('triggers.actionFailedTitle'),
      );
    }
    if (typeof window !== 'undefined') {
      try { if (localStorage.getItem('trigger:debug') === '1') console.debug('[TriggerPanel] request:error', { triggerId, action, kind: result.kind, httpStatus: result.httpStatus, errorCode: result.errorCode, message: result.message }); } catch {}
    }
  }, [triggers, toast, t]);

  const confirmTrigger = confirmFireId ? triggers.find((tr) => tr.id === confirmFireId) : null;

  return (
    <div className="space-y-4">
      {/* Filter toggles + Override toggle */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {filters.map((f) => (
          f.count > 0 || f.key === 'all' ? (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted',
              )}
            >
              {f.label}
              {f.count > 0 && (
                <span className={cn(
                  'text-[10px] rounded-full min-w-[18px] px-1 py-0.5 text-center',
                  filter === f.key ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20',
                )}>
                  {f.count}
                </span>
              )}
            </button>
          ) : null
        ))}

        {/* Disable All — push to the right */}
        {counts.armed > 0 && onDisableAll && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDisableAll}
            disabled={disabled}
            className="ml-auto shrink-0"
          >
            <StopIcon className="h-3.5 w-3.5 mr-1" />
            {t('triggers.disableAll')}
          </Button>
        )}
      </div>

      {/* Director Override Mode toggle */}
      {!disabled && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/10 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-600 dark:text-amber-400 text-sm">⚡</span>
            <div className="min-w-0">
              <span className="text-xs font-medium text-foreground">{t('triggers.overrideMode')}</span>
              <p className="text-[10px] text-muted-foreground">{t('triggers.overrideModeDesc')}</p>
            </div>
          </div>
          <Switch
            checked={overrideEnabled}
            onCheckedChange={handleOverrideChange}
            aria-label={t('triggers.overrideMode')}
          />
        </div>
      )}

      {/* Trigger cards */}
      <div className="space-y-3">
        {filteredTriggers.map((trigger) => (
          <DirectorTriggerCard
            key={trigger.id}
            trigger={trigger}
            onFire={handleFireWithOverrideCheck}
            onRearm={onRearm}
            onDisable={onDisable}
            overrideEnabled={overrideEnabled}
            onPendingTimeout={handlePendingTimeout}
            onRequestError={handleRequestError}
            disabled={disabled}
          />
        ))}
      </div>

      {filteredTriggers.length === 0 && triggers.length > 0 && (
        <div className="text-sm text-muted-foreground text-center py-6">
          {t('triggers.noMatchingTriggers')}
        </div>
      )}

      {triggers.length === 0 && (
        <div className="text-base text-muted-foreground text-center py-8">
          {t('triggers.noTriggers')}
        </div>
      )}

      {/* Override fire confirm dialog */}
      <ConfirmDialog
        open={confirmFireId !== null}
        onClose={() => setConfirmFireId(null)}
        onConfirm={handleConfirmOverrideFire}
        title={t('triggers.overrideConfirmTitle')}
        description={t('triggers.overrideConfirmDesc', { name: confirmTrigger?.name ?? '' })}
        confirmLabel={t('triggers.overrideConfirmButton')}
        variant="warning"
      />
    </div>
  );
}

function SignalQuickPanel({
  recentSignals,
  presets = [],
  onSend,
  onExecuteSignal,
  t,
  disabled,
}: {
  recentSignals: Signal[];
  presets?: DirectorModePanelProps['signalPresets'];
  onSend?: (channel: string, payload: unknown) => void;
  onExecuteSignal?: (type: string, config: Record<string, unknown>) => Promise<void>;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const [channel, setChannel] = useState('');
  const [message, setMessage] = useState('');
  const [executingSignal, setExecutingSignal] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  const handleSend = () => {
    if (!channel.trim() || !message.trim() || !onSend) return;
    onSend(channel.trim(), { message: message.trim() });
    setMessage('');
  };

  const handleExecutePreset = async (preset: { id: string; type: string; color?: string; disabled?: boolean }) => {
    if (!onExecuteSignal || preset.disabled) return;
    setExecutingSignal(preset.id);
    try {
      await onExecuteSignal(preset.type, { color: preset.color });
    } finally {
      setExecutingSignal(null);
    }
  };

  const builtInPresets = [
    { id: 'pause', channel: 'pause', label: t('signals.presets.pause'), message: t('signals.presets.pauseMessage'), icon: ClockIcon },
    { id: 'hint', channel: 'hint', label: t('signals.presets.hint'), message: t('signals.presets.hintMessage'), icon: BookOpenIcon },
    { id: 'attention', channel: 'attention', label: t('signals.presets.attention'), message: t('signals.presets.attentionMessage'), icon: BoltIcon },
    { id: 'flash', channel: 'flash', label: t('signals.presets.flash'), message: t('signals.presets.flashMessage'), icon: SignalIcon },
  ];

  const getSignalTypeIcon = (type: string) => {
    switch (type) {
      case 'torch': return <BoltIcon className="h-4 w-4" />;
      case 'audio': return <SignalIcon className="h-4 w-4" />;
      default: return <SignalIcon className="h-4 w-4" />;
    }
  };

  const notificationPreset = presets?.find((p) => p.type === 'notification');
  const notificationStatus = notificationPreset?.disabled ? notificationPreset.disabledReason : null;

  return (
    <div className="space-y-4">
      {presets && presets.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('signals.deviceSignals')}
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button key={p.id} variant="outline" size="sm"
                onClick={() => handleExecutePreset(p)}
                disabled={executingSignal === p.id || p.disabled || disabled}
                className="gap-1"
                title={p.disabled && p.disabledReason ? p.disabledReason : undefined}
                style={p.type === 'screen_flash' && p.color ? { borderColor: p.color, color: p.color } : undefined}>
                {getSignalTypeIcon(p.type)}
                <span>{p.name}</span>
                {executingSignal === p.id && <span className="animate-pulse" aria-hidden>{t('signals.executingIndicator')}</span>}
              </Button>
            ))}
          </div>
          {notificationStatus && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('signals.notificationsStatus', { status: notificationStatus })}</span>
              {onExecuteSignal && (
                <Button variant="ghost" size="sm" disabled={disabled}
                  onClick={() => void onExecuteSignal('notification', { forceToast: true, title: t('signals.toast.title'), body: t('signals.toast.body') })}>
                  {t('signals.toast.button')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('signals.quickMessages')}
        </div>
        <div className="flex flex-wrap gap-2">
          {builtInPresets.map((p) => (
            <Button key={p.id} variant="outline" size="sm" disabled={disabled || !onSend}
              onClick={() => onSend?.(p.channel, { message: p.message })} className="gap-1.5">
              <p.icon className="h-4 w-4" aria-hidden />
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {!disabled && (
        <div className="border-t pt-3">
          <Button variant="ghost" size="sm" onClick={() => setShowCustom(!showCustom)} className="w-full justify-between">
            <span>{t('signals.customSignal')}</span>
            <span className="text-muted-foreground">{showCustom ? t('signals.toggle.hide') : t('signals.toggle.show')}</span>
          </Button>
          {showCustom && (
            <div className="mt-2 space-y-2">
              <input type="text" placeholder={t('signals.channelPlaceholder')} value={channel}
                onChange={(e) => setChannel(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg bg-background" />
              <div className="flex gap-2">
                <input type="text" placeholder={t('signals.messagePlaceholder')} value={message}
                  onChange={(e) => setMessage(e.target.value)} className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background"
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                <Button size="sm" onClick={handleSend} disabled={!channel || !message}>{t('signals.send')}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {recentSignals.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('signals.recentSignals')}
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {recentSignals.slice(0, 8).map((s) => (
              <div key={s.id} className="text-xs text-muted-foreground flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 cursor-pointer"
                onClick={() => !disabled && onSend?.(s.channel, s.payload)}>
                <span className="font-mono truncate max-w-[120px]">{s.channel}</span>
                <span className="text-[10px] opacity-70">
                  {new Date(s.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">{t('signals.clickToResend')}</p>
        </div>
      )}
    </div>
  );
}

function EventFeed({ events, t }: { events: SessionEvent[]; t: ReturnType<typeof useTranslations<'play.directorDrawer'>> }) {
  if (events.length === 0) {
    return (
      <div className="text-base text-muted-foreground text-center py-8">
        {t('events.noEvents')}
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    if (type.includes('trigger')) return '\u26A1';
    if (type.includes('artifact')) return '\uD83D\uDCE6';
    if (type.includes('signal')) return '\uD83D\uDCE1';
    if (type.includes('step')) return '\uD83D\uDCCD';
    if (type.includes('error')) return '\u274C';
    return '\u2022';
  };

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {events.slice(0, 20).map((e) => (
        <div key={e.id} className={cn('flex items-start gap-2 text-sm p-3 rounded', e.type.includes('error') && 'bg-destructive/10')}>
          <span className="shrink-0 text-base">{getEventIcon(e.type)}</span>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{e.type}</div>
            {e.payload && Object.keys(e.payload).length > 0 && (
              <div className="text-muted-foreground truncate text-xs">{JSON.stringify(e.payload).slice(0, 50)}</div>
            )}
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">{new Date(e.timestamp).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}

/** Bucket signals into time groups for the inbox.
 *  `now` should be a stable timestamp (via useMemo) to avoid groups
 *  shuffling when a minute-boundary passes during a single render. */
function groupSignalsByTime(
  signals: SessionEvent[],
  labels: { recent: string; today: string; earlier: string },
  now: number,
): Array<{ label: string; events: SessionEvent[] }> {
  const fiveMinAgo = now - 5 * 60 * 1000;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const recent: SessionEvent[] = [];
  const today: SessionEvent[] = [];
  const earlier: SessionEvent[] = [];

  for (const evt of signals) {
    const ts = new Date(evt.timestamp).getTime();
    // Guard against invalid / unparseable timestamps
    if (Number.isNaN(ts)) { earlier.push(evt); continue; }
    if (ts >= fiveMinAgo) recent.push(evt);
    else if (ts >= todayMs) today.push(evt);
    else earlier.push(evt);
  }

  const groups: Array<{ label: string; events: SessionEvent[] }> = [];
  if (recent.length) groups.push({ label: labels.recent, events: recent });
  if (today.length) groups.push({ label: labels.today, events: today });
  if (earlier.length) groups.push({ label: labels.earlier, events: earlier });
  return groups;
}

function SignalInbox({
  events,
  handledSignalIds,
  onMarkHandled,
  t,
  participantCount,
}: {
  events: SessionEvent[];
  handledSignalIds: Set<string>;
  onMarkHandled: (signalId: string) => void;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
  participantCount?: number;
}) {
  const locale = useLocale();
  // Deterministic sort — newest first, stable across reconnects
  const signalEvents = sortedSignalEvents(events).slice(0, 20);

  // Stable `now` — only refreshes when the event list changes, prevents
  // groups from shuffling when a minute-boundary passes mid-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableNow = useMemo(() => Date.now(), [signalEvents.length]);

  // Filter pills — local toggle state (all active by default)
  const [showIncoming, setShowIncoming] = useState(true);
  const [showOutgoing, setShowOutgoing] = useState(true);
  const [showUrgent, setShowUrgent] = useState(false);

  if (signalEvents.length === 0) {
    return (
      <div className="text-center py-3">
        <div className="text-xs text-muted-foreground">{t('signalInbox.empty')}</div>
      </div>
    );
  }

  const timeGroups = groupSignalsByTime(signalEvents, {
    recent: t('signalInbox.timeGroup.recent'),
    today: t('signalInbox.timeGroup.today'),
    earlier: t('signalInbox.timeGroup.earlier'),
  }, stableNow);

  // Apply direction / urgency filter after time grouping.
  // Urgent is a *modifier*: it narrows the currently-visible directions
  // to only urgent items.  Direction pills control which directions show.
  const filteredGroups = timeGroups.map((group) => {
    const filtered = group.events.filter((evt) => {
      const { direction, severity } = extractSignalMeta(evt);
      if (direction === 'incoming' && !showIncoming) return false;
      if (direction === 'outgoing' && !showOutgoing) return false;
      if (showUrgent && severity !== 'urgent') return false;
      return true;
    });
    return { ...group, events: filtered };
  }).filter((g) => g.events.length > 0);

  // Determine which filter-specific empty message to show (if any)
  const isFiltered = !showIncoming || !showOutgoing || showUrgent;
  const filterEmptyKey: string | null = filteredGroups.length === 0 && isFiltered
    ? showUrgent
      ? 'signalInbox.filterEmpty.urgent'
      : !showIncoming && showOutgoing
        ? 'signalInbox.filterEmpty.incoming'
        : showIncoming && !showOutgoing
          ? 'signalInbox.filterEmpty.outgoing'
          : 'signalInbox.filterEmpty.combo'
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {t('signalInbox.title')}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowIncoming((p) => !p)}
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full border transition-colors font-medium',
              showIncoming
                ? 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-300'
                : 'bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/60',
            )}
          >
            {t('signalInbox.filter.incoming')}
          </button>
          <button
            type="button"
            onClick={() => setShowOutgoing((p) => !p)}
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full border transition-colors font-medium',
              showOutgoing
                ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300'
                : 'bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/60',
            )}
          >
            {t('signalInbox.filter.outgoing')}
          </button>
          <button
            type="button"
            onClick={() => setShowUrgent((p) => !p)}
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full border transition-colors font-medium',
              showUrgent
                ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-950/40 dark:border-red-700 dark:text-red-300'
                : 'bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/60',
            )}
          >
            {t('signalInbox.filter.urgent')}
          </button>
        </div>
      </div>
      <div className="space-y-1 max-h-[240px] overflow-y-auto">
        {filterEmptyKey && (
          <div className="text-center py-3">
            <div className="text-[10px] text-muted-foreground">{t(filterEmptyKey)}</div>
          </div>
        )}
        {filteredGroups.map((group) => (
          <div key={group.label}>
            {/* Show section header only when there are multiple groups */}
            {timeGroups.length > 1 && (
              <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2 pt-2 pb-0.5">
                {group.label}
              </div>
            )}
            {group.events.map((evt) => {
          const { channel, sender, message, direction, severity } = extractSignalMeta(evt);
          const channelLabel = getSignalChannelLabel(channel, (k) => t(`signalInbox.${k}`));
          const directionLabel = getSignalDirectionLabel(
            channelLabel,
            direction,
            sender,
            (k, v) => t(`signalInbox.${k}`, v),
            direction === 'outgoing' ? participantCount : undefined,
          );
          const isHandled = handledSignalIds.has(evt.id);
          const isIncoming = direction === 'incoming';
          const isUrgent = severity === 'urgent';

          return (
            <div
              key={evt.id}
              className={cn(
                'flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors',
                isHandled
                  ? 'bg-muted/30 border-border/30 opacity-60'
                  : isIncoming
                    ? isUrgent
                      ? 'bg-red-50/50 border-red-200/30 dark:bg-red-950/10 dark:border-red-800/30'
                      : 'bg-orange-50/50 border-orange-200/30 dark:bg-orange-950/10 dark:border-orange-800/30'
                    : 'bg-blue-50/50 border-blue-200/30 dark:bg-blue-950/10 dark:border-blue-800/30',
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isHandled ? (
                  <CheckCircleIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                ) : isIncoming ? (
                  <ArrowDownLeftIcon className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isUrgent ? 'text-red-500' : 'text-orange-500',
                  )} />
                ) : (
                  <ArrowUpRightIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {directionLabel}
                  </div>
                  {message && (
                    <div className="text-[10px] text-muted-foreground truncate">{message}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground/60 font-mono">
                  {new Date(evt.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {!isHandled && (
                  <button
                    type="button"
                    onClick={() => onMarkHandled(evt.id)}
                    className={cn(
                      'text-[10px] font-medium hover:underline',
                      isIncoming
                        ? isUrgent
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-orange-600 dark:text-orange-400'
                        : 'text-blue-600 dark:text-blue-400',
                    )}
                  >
                    {t('signalInbox.markHandled')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtifactsTab({
  artifacts,
  artifactStates,
  t,
  onRevealArtifact,
  onHideArtifact,
  onResetArtifact,
}: {
  artifacts: CockpitArtifact[];
  artifactStates: Record<string, ArtifactState>;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
  onRevealArtifact?: (artifactId: string) => Promise<void>;
  onHideArtifact?: (artifactId: string) => Promise<void>;
  onResetArtifact?: (artifactId: string) => Promise<void>;
}) {
  const hiddenCount = artifacts.filter(a => { const s = artifactStates[a.id]; return !s || s.status === 'hidden'; }).length;
  const availableCount = artifacts.filter(a => { const s = artifactStates[a.id]; return s && (s.status === 'revealed' || s.status === 'unlocked'); }).length;
  const shownCount = artifacts.filter(a => { const s = artifactStates[a.id]; return s && (s.status === 'solved' || s.isRevealed); }).length;

  if (artifacts.length === 0) {
    return (
      <div className="text-base text-muted-foreground text-center py-8">
        {t('artifacts.noArtifacts')}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{hiddenCount}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('artifacts.hidden')}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{availableCount}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('artifacts.available')}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{shownCount}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('artifacts.shown')}</div>
        </Card>
      </div>

      <div className="space-y-3">
        {artifacts.map((artifact) => {
          const state = artifactStates[artifact.id];
          const statusLabel = state?.status ?? 'hidden';
          return (
            <Card key={artifact.id} className={cn('p-4 transition-colors',
              statusLabel === 'hidden' && 'opacity-60',
              statusLabel === 'revealed' && 'border-primary/40',
              statusLabel === 'solved' && 'border-green-400/40 bg-green-50/50 dark:bg-green-950/10')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{artifact.title}</div>
                  {artifact.description && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{artifact.description}</div>}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={
                      statusLabel === 'revealed' || statusLabel === 'unlocked' ? 'default' :
                      statusLabel === 'solved' ? 'success' :
                      statusLabel === 'failed' ? 'destructive' : 'secondary'
                    } size="sm">{statusLabel}</Badge>
                    <span className="text-xs text-muted-foreground">{artifact.artifactType}</span>
                  </div>
                </div>
                <ArchiveBoxIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
              {/* Action buttons */}
              {(onRevealArtifact || onHideArtifact) && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                  {statusLabel === 'hidden' && onRevealArtifact && (
                    <Button size="sm" variant="default" className="h-7 text-xs"
                      onClick={() => onRevealArtifact(artifact.id)}>
                      <EyeIcon className="h-3.5 w-3.5 mr-1" />
                      {t('artifacts.reveal')}
                    </Button>
                  )}
                  {(statusLabel === 'revealed' || statusLabel === 'unlocked') && onHideArtifact && (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => onHideArtifact(artifact.id)}>
                      <EyeSlashIcon className="h-3.5 w-3.5 mr-1" />
                      {t('artifacts.hide')}
                    </Button>
                  )}
                  {statusLabel !== 'hidden' && onResetArtifact && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                      onClick={() => onResetArtifact(artifact.id)}>
                      {t('artifacts.reset')}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DirectorModePanel({
  title,
  status,
  isPreview = false,
  steps,
  currentStepIndex,
  phases,
  currentPhaseIndex,
  triggers,
  recentSignals,
  signalPresets,
  events,
  timeBankBalance,
  timeBankPaused,
  participantCount,
  artifacts,
  artifactStates,
  onNextStep,
  onPreviousStep,
  onFireTrigger,
  onArmTrigger,
  onDisableTrigger,
  onDisableAllTriggers,
  onSendSignal,
  onExecuteSignal,
  onTimeBankDelta,
  onOpenChat,
  chatUnreadCount = 0,
  onClose,
  onRevealArtifact,
  onHideArtifact,
  onResetArtifact,
  showFullscreenButton = false,
  isFullscreen = false,
  onToggleFullscreen,
  connectionState = 'connected',
  directorChips = [],
  directorChipLabels,
  onDirectorChipClick,
  stepStartTimes = new Map(),
  swipeRef,
  resetConfirmPending = false,
  onResetClick,
  className,
}: DirectorModePanelProps) {
  const t = useTranslations('play.directorDrawer');
  const tShared = useTranslations('play.shared');
  const [activeDrawer, setActiveDrawer] = useState<DirectorDrawerType | null>(null);
  const [handledSignalIds, setHandledSignalIds] = useState<Set<string>>(new Set());
  const toggleDrawer = (d: DirectorDrawerType) => setActiveDrawer(prev => prev === d ? null : d);
  const markSignalHandled = (signalId: string) => {
    setHandledSignalIds((prev) => new Set(prev).add(signalId));
  };
  const handleOpenSignal = (signalId: string) => {
    markSignalHandled(signalId);
    setActiveDrawer('signals');
  };

  const currentStep = steps[currentStepIndex];
  const statusConfig = getSessionStatusConfig(status);
  const armedCount = triggers.filter((tr) => tr.status === 'armed').length;
  const unhandledSignalCount = countUnhandledSignals(events, handledSignalIds);

  // Drawer pills — replaces old tab bar
  const allDrawerPills: Array<{ id: DirectorDrawerType; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; badge?: number; hideInPreview?: boolean }> = [
    { id: 'time', icon: ClockIcon, label: t('tabs.time') },
    { id: 'artifacts', icon: ArchiveBoxIcon, label: t('tabs.artifacts'), badge: artifacts.length || undefined },
    { id: 'triggers', icon: BoltIcon, label: t('tabs.triggers'), badge: armedCount || undefined },
    { id: 'signals', icon: SignalIcon, label: t('tabs.signals'), badge: unhandledSignalCount || undefined, hideInPreview: true },
    { id: 'events', icon: Cog6ToothIcon, label: t('tabs.events'), badge: events.length || undefined, hideInPreview: true },
  ];
  const drawerPills = allDrawerPills.filter(pill => !isPreview || !pill.hideInPreview);

  return (
    <div className={cn('flex flex-col h-full bg-background relative', className)}>
      {/* ================================================================= */}
      {/* TOP AREA — header + NowSummaryRow + ChipLane (SSoT ordering)     */}
      {/* ================================================================= */}
      <PlayTopArea
        header={
          <PlayHeader
            title={title}
            onBack={onClose}
            backLabel={tShared('header.backToLobby')}
            connectionState={(connectionState || 'connected') as 'connected' | 'degraded' | 'offline'}
            sessionStatus={status}
            statusLabels={{
              live: tShared('status.active'),
              paused: tShared('status.paused'),
              statusLabel: tShared(`status.${status}` as 'status.draft' | 'status.lobby' | 'status.active' | 'status.paused' | 'status.locked' | 'status.ended'),
              degraded: tShared('connection.degraded'),
              offline: tShared('connection.offline'),
            }}
            bgTintClass={statusConfig.bgTintClass}
            isFullscreen={isFullscreen}
            showFullscreenButton={showFullscreenButton}
            onToggleFullscreen={onToggleFullscreen}
            rightSlot={
              <>
                {!isPreview && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <UserGroupIcon className="h-3.5 w-3.5" />
                    <span className="font-medium">{participantCount}</span>
                  </div>
                )}
                {isPreview && (
                  <Badge variant="secondary" size="sm" className="uppercase tracking-wider text-[10px]">
                    {tShared('header.preview')}
                  </Badge>
                )}
              </>
            }
          />
        }
      >
        {/* NowSummaryRow — glanceable session status */}
        {!isPreview && (
          <NowSummaryRow
            stepNumber={currentStepIndex + 1}
            totalSteps={steps.length}
            stepTitle={currentStep?.title ?? ''}
            plannedMinutes={currentStep?.durationMinutes ?? undefined}
            stepStartedAt={stepStartTimes.get(currentStepIndex)}
            timerPaused={timeBankPaused}
            unhandledSignals={unhandledSignalCount}
            labels={{
              step: t('nowRow.step'),
              live: t('nowRow.live'),
              paused: t('nowRow.paused'),
            }}
          />
        )}

        {/* DirectorChipLane — host-side system cues */}
        {directorChipLabels && (
          <DirectorChipLane
            chips={directorChips}
            labels={directorChipLabels}
            onChipClick={(chip) => {
              onDirectorChipClick?.(chip);
              if (chip.type === 'SIGNAL_RECEIVED') {
                setActiveDrawer('signals');
              }
            }}
          />
        )}
      </PlayTopArea>

      {/* ================================================================= */}
      {/* STAGE — always-visible primary surface                            */}
      {/* ================================================================= */}
      <div className={cn(
        'flex-1 overflow-y-auto p-5 transition-opacity duration-200',
        activeDrawer && 'opacity-30 pointer-events-none',
      )}>
        <DirectorStagePanel
          steps={steps}
          currentStepIndex={currentStepIndex}
          phases={phases}
          currentPhaseIndex={currentPhaseIndex}
          onNextStep={onNextStep}
          onPreviousStep={onPreviousStep}
          disabled={isPreview}
          swipeRef={swipeRef}
          t={t}
        />

        {/* Signal strip — latest signal at-a-glance (inside stage scroll) */}
        {!isPreview && !activeDrawer && (
          <SignalStrip
            events={events}
            handledSignalIds={handledSignalIds}
            onOpenSignals={handleOpenSignal}
            t={t}
          />
        )}
      </div>

      {/* ================================================================= */}
      {/* ACTION STRIP — drawer pills + quick actions                       */}
      {/* ================================================================= */}
      <div
        className="shrink-0 border-t bg-muted/30 px-4 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {/* Drawer pills */}
        <div className="flex gap-1.5 justify-center max-w-xl mx-auto mb-2 overflow-x-auto">
          {drawerPills.map((pill) => (
            <button
              key={pill.id}
              onClick={() => toggleDrawer(pill.id)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap',
                activeDrawer === pill.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border/50 hover:bg-muted',
              )}
            >
              <pill.icon className="h-3.5 w-3.5" />
              {pill.label}
              {pill.badge !== undefined && pill.badge > 0 && (
                <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary/20 text-primary text-[9px] font-bold px-1">
                  {pill.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Quick actions */}
        {!isPreview && (
          <div className="flex items-center justify-center gap-2 max-w-xl mx-auto">
            <Button variant="outline" size="sm" className="flex-1 h-10 text-xs gap-1.5"
              onClick={() => onSendSignal?.('hint', { message: t('quickActions.giveHint') })}>
              <LightBulbIcon className="h-4 w-4" />
              {t('quickActions.giveHint')}
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-10 text-xs gap-1.5"
              onClick={onOpenChat}>
              <BookOpenIcon className="h-4 w-4" />
              {t('quickActions.story')}
            </Button>
            <Button variant={resetConfirmPending ? 'destructive' : 'outline'} size="sm"
              className="flex-1 h-10 text-xs gap-1.5" onClick={onResetClick}>
              <ArrowPathIcon className="h-4 w-4" />
              {resetConfirmPending ? t('quickActions.confirmReset') : t('quickActions.reset')}
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-10 text-xs gap-1.5 relative"
              onClick={onOpenChat}>
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              {t('quickActions.message')}
              {chatUnreadCount > 0 && (
                <Badge variant="destructive" size="sm"
                  className="absolute -top-2 -right-1 min-w-[18px] h-[18px] text-[10px]">
                  {chatUnreadCount}
                </Badge>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* DRAWER OVERLAY — responsive: sheet on mobile, modal on desktop    */}
      {/* ================================================================= */}
      <DrawerOverlay
        open={activeDrawer != null}
        onClose={() => setActiveDrawer(null)}
        size="lg"
        title={activeDrawer ? drawerPills.find(p => p.id === activeDrawer)?.label : undefined}
      >
        {activeDrawer === 'time' && (
          <TimeBankTab
            balance={timeBankBalance}
            paused={timeBankPaused}
            onDelta={onTimeBankDelta}
            steps={steps}
            currentStepIndex={currentStepIndex}
            stepStartTimes={stepStartTimes}
            t={t}
            disabled={isPreview}
          />
        )}
        {activeDrawer === 'artifacts' && (
          <ArtifactsTab artifacts={artifacts} artifactStates={artifactStates} t={t}
            onRevealArtifact={onRevealArtifact}
            onHideArtifact={onHideArtifact}
            onResetArtifact={onResetArtifact}
          />
        )}
        {activeDrawer === 'triggers' && (
          <TriggerPanel
            triggers={triggers}
            steps={steps}
            currentStepIndex={currentStepIndex}
            currentPhaseIndex={currentPhaseIndex}
            onFire={onFireTrigger}
            onRearm={onArmTrigger}
            onDisable={onDisableTrigger}
            onDisableAll={onDisableAllTriggers}
            t={t}
            disabled={isPreview}
          />
        )}
        {activeDrawer === 'signals' && !isPreview && (
          <div className="space-y-6">
            <SignalInbox events={events} handledSignalIds={handledSignalIds} onMarkHandled={markSignalHandled} t={t} participantCount={participantCount} />
            <SignalQuickPanel
              recentSignals={recentSignals}
              presets={signalPresets}
              onSend={onSendSignal}
              onExecuteSignal={onExecuteSignal}
              t={t}
            />
          </div>
        )}
        {activeDrawer === 'events' && !isPreview && (
          <EventFeed events={events} t={t} />
        )}
      </DrawerOverlay>
    </div>
  );
}

export default DirectorModePanel;
