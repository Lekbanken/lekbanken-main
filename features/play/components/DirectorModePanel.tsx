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

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from '@/types/session-cockpit';
import { DirectorChipLane } from './DirectorChipLane';
import type { DirectorChip, DirectorChipType } from './DirectorChipLane';
import { DirectorStagePanel } from './DirectorStagePanel';
import { DrawerOverlay, PlayHeader, PlayTopArea, getSessionStatusConfig } from '@/features/play/components/shared';
import { NowSummaryRow } from '@/features/play/components/shared';
import {
  sortedSignalEvents,
  selectLatestUnhandledSignal,
  countUnhandledSignals,
  extractSignalMeta,
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
  onFireTrigger?: (triggerId: string) => void;
  onDisableAllTriggers?: () => void;
  onSendSignal?: (channel: string, payload: unknown) => void;
  onExecuteSignal?: (type: string, config: Record<string, unknown>) => Promise<void>;
  onTimeBankDelta?: (delta: number, reason: string) => void;
  onOpenChat?: () => void;
  chatUnreadCount?: number;

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

  const { channel, sender } = extractSignalMeta(latestSignal);
  const timestamp = new Date(latestSignal.timestamp);
  const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      type="button"
      onClick={() => onOpenSignals(latestSignal.id)}
      className="mx-5 mb-1 flex items-center gap-2 rounded-lg border border-orange-200/50 bg-orange-50/50 px-3 py-2 text-left transition-colors hover:bg-orange-50 active:scale-[0.99] dark:border-orange-800/30 dark:bg-orange-950/10 dark:hover:bg-orange-950/20 animate-in fade-in slide-in-from-bottom-1 duration-200"
    >
      <span className="flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-orange-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-foreground">
          {channel.toUpperCase()}
          {sender && <span className="text-muted-foreground ml-1">— {sender}</span>}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0">{timeStr}</span>
      <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400 shrink-0">
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

function TriggerPanel({
  triggers,
  onFire,
  onDisableAll,
  t,
  disabled,
}: {
  triggers: CockpitTrigger[];
  onFire?: (id: string) => void;
  onDisableAll?: () => void;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const armedTriggers = triggers.filter((tr) => tr.status === 'armed');
  const firedTriggers = triggers.filter((tr) => tr.status === 'fired');
  const errorTriggers = triggers.filter((tr) => tr.status === 'error');

  return (
    <div className="space-y-4">
      {armedTriggers.length > 0 && (
        <div className="flex justify-end">
          <Button variant="destructive" size="sm" onClick={onDisableAll} disabled={disabled || !onDisableAll}>
            <StopIcon className="h-4 w-4 mr-1" />
            {t('triggers.disableAll')}
          </Button>
        </div>
      )}

      {armedTriggers.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t('triggers.armedLabel', { count: armedTriggers.length })}
          </div>
          {armedTriggers.map((trigger) => (
            <div key={trigger.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{trigger.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {trigger.conditionSummary} → {trigger.actionSummary}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onFire?.(trigger.id)} disabled={disabled || !onFire}>
                <BoltIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {errorTriggers.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-destructive">
            {t('triggers.errorLabel', { count: errorTriggers.length })}
          </div>
          {errorTriggers.map((trigger) => (
            <div key={trigger.id} className="p-3 rounded-lg border bg-destructive/10 border-destructive/30">
              <div className="font-medium text-sm">{trigger.name}</div>
              <div className="text-xs text-destructive">{trigger.lastError}</div>
            </div>
          ))}
        </div>
      )}

      {firedTriggers.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t('triggers.firedLabel', { count: firedTriggers.length })}
          </div>
          {firedTriggers.slice(0, 5).map((trigger) => (
            <div key={trigger.id} className="p-3 rounded-lg border bg-muted/50">
              <div className="font-medium text-sm text-muted-foreground">{trigger.name}</div>
              <div className="text-xs text-muted-foreground">
                {trigger.lastFiredAt
                  ? new Date(trigger.lastFiredAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : t('common.dash')}
              </div>
            </div>
          ))}
        </div>
      )}

      {triggers.length === 0 && (
        <div className="text-base text-muted-foreground text-center py-8">
          {t('triggers.noTriggers')}
        </div>
      )}
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

function SignalInbox({
  events,
  handledSignalIds,
  onMarkHandled,
  t,
}: {
  events: SessionEvent[];
  handledSignalIds: Set<string>;
  onMarkHandled: (signalId: string) => void;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
}) {
  const locale = useLocale();
  // Deterministic sort — newest first, stable across reconnects
  const signalEvents = sortedSignalEvents(events).slice(0, 20);

  if (signalEvents.length === 0) {
    return (
      <div className="text-center py-3">
        <div className="text-xs text-muted-foreground">{t('signalInbox.empty')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {t('signalInbox.title')}
      </div>
      <div className="space-y-1 max-h-[240px] overflow-y-auto">
        {signalEvents.map((evt) => {
          const { channel, sender, message } = extractSignalMeta(evt);
          const isHandled = handledSignalIds.has(evt.id);
          return (
            <div
              key={evt.id}
              className={cn(
                'flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors',
                isHandled
                  ? 'bg-muted/30 border-border/30 opacity-60'
                  : 'bg-orange-50/50 border-orange-200/30 dark:bg-orange-950/10 dark:border-orange-800/30',
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isHandled ? (
                  <CheckCircleIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {channel.toUpperCase()}
                    {sender && <span className="text-muted-foreground ml-1">— {sender}</span>}
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
                    className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    {t('signalInbox.markHandled')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArtifactsTab({
  artifacts,
  artifactStates,
  t,
}: {
  artifacts: CockpitArtifact[];
  artifactStates: Record<string, ArtifactState>;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
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
  onDisableAllTriggers,
  onSendSignal,
  onExecuteSignal,
  onTimeBankDelta,
  onOpenChat,
  chatUnreadCount = 0,
  onClose,
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
  const drawerPills: Array<{ id: DirectorDrawerType; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; badge?: number; hideInPreview?: boolean }> = [
    { id: 'time', icon: ClockIcon, label: t('tabs.time') },
    { id: 'artifacts', icon: ArchiveBoxIcon, label: t('tabs.artifacts'), badge: artifacts.length || undefined },
    { id: 'triggers', icon: BoltIcon, label: t('tabs.triggers'), badge: armedCount || undefined },
    { id: 'signals', icon: SignalIcon, label: t('tabs.signals'), badge: unhandledSignalCount || undefined, hideInPreview: true },
    { id: 'events', icon: Cog6ToothIcon, label: t('tabs.events'), badge: events.length || undefined, hideInPreview: true },
  ].filter(pill => !isPreview || !pill.hideInPreview);

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
          <ArtifactsTab artifacts={artifacts} artifactStates={artifactStates} t={t} />
        )}
        {activeDrawer === 'triggers' && (
          <TriggerPanel
            triggers={triggers}
            onFire={onFireTrigger}
            onDisableAll={onDisableAllTriggers}
            t={t}
            disabled={isPreview}
          />
        )}
        {activeDrawer === 'signals' && !isPreview && (
          <div className="space-y-6">
            <SignalInbox events={events} handledSignalIds={handledSignalIds} onMarkHandled={markSignalHandled} t={t} />
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
