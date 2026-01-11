/**
 * DirectorModeDrawer Component
 * 
 * Overlay drawer for Director Mode during active sessions.
 * Slides in from the right, providing focused game control
 * while keeping the lobby accessible underneath.
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BoltIcon,
  ClockIcon,
  SignalIcon,
  DocumentTextIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { StopIcon } from '@heroicons/react/24/solid';
import type { 
  CockpitStep, 
  CockpitPhase,
  CockpitTrigger,
  SessionEvent,
  Signal,
} from '@/types/session-cockpit';
import { StoryViewModal } from './StoryViewModal';

// =============================================================================
// Types
// =============================================================================

export interface DirectorModeDrawerProps {
  /** Is the drawer open? */
  open: boolean;
  /** Called when user requests to close */
  onClose: () => void;
  
  /** Session display name */
  sessionName: string;
  /** Session code */
  sessionCode: string;
  /** Session status */
  status: 'active' | 'paused' | 'ended';
  
  /** Steps */
  steps: CockpitStep[];
  /** Current step index */
  currentStepIndex: number;
  /** Phases (reserved for future) */
  phases: CockpitPhase[];
  /** Current phase index */
  currentPhaseIndex: number;
  
  /** Triggers */
  triggers: CockpitTrigger[];
  
  /** Recent signals */
  recentSignals: Signal[];

  /** Optional device signal presets */
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
  
  // Actions
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onNextStep: () => Promise<void>;
  onPreviousStep: () => Promise<void>;
  onFireTrigger: (triggerId: string) => Promise<void>;
  onDisableAllTriggers: () => Promise<void>;
  onSendSignal: (channel: string, payload: unknown) => Promise<void>;
  onExecuteSignal?: (type: string, config: Record<string, unknown>) => Promise<void>;
  onTimeBankDelta: (delta: number, reason: string) => Promise<void>;
  
  /** Optional class name */
  className?: string;
}

type DirectorTab = 'play' | 'triggers' | 'signals' | 'events';

// =============================================================================
// Sub-components
// =============================================================================

function StepNavigation({
  steps,
  currentIndex,
  onNext,
  onPrevious,
  t,
}: {
  steps: CockpitStep[];
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
}) {
  if (steps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-6">
        {t('steps.noSteps')}
      </div>
    );
  }

  const currentStep = steps[currentIndex];
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= steps.length - 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={isFirst}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        
        <div className="text-center flex-1 px-4">
          <div className="text-xs text-muted-foreground">
            {t('steps.stepOf', { current: currentIndex + 1, total: steps.length })}
          </div>
          <div className="font-medium text-foreground truncate">
            {currentStep?.title ?? t('steps.notStarted')}
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={isLast}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function LeaderScriptPanel({ script }: { script?: string }) {
  if (!script) return null;
  
  return (
    <Card className="p-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
      <div className="flex items-start gap-2">
        <DocumentTextIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
            LEADER SCRIPT
          </div>
          <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
            {script}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TriggerPanel({
  triggers,
  onFire,
  onDisableAll,
  t,
}: {
  triggers: CockpitTrigger[];
  onFire: (id: string) => void;
  onDisableAll: () => void;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
}) {
  const armedTriggers = triggers.filter((t) => t.status === 'armed');
  const firedTriggers = triggers.filter((t) => t.status === 'fired');
  const errorTriggers = triggers.filter((t) => t.status === 'error');
  // Note: disabled triggers reserved for future "show all" toggle

  return (
    <div className="space-y-4">
      {/* Kill switch */}
      {armedTriggers.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDisableAll}
          >
            <StopIcon className="h-4 w-4 mr-1" />
            {t('triggers.disableAll')}
          </Button>
        </div>
      )}
      
      {/* Armed */}
      {armedTriggers.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            🟢 ARMED ({armedTriggers.length})
          </div>
          {armedTriggers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-2 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {t.conditionSummary} → {t.actionSummary}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onFire(t.id)}>
                <BoltIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {/* Errors */}
      {errorTriggers.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-destructive">
            ❌ ERROR ({errorTriggers.length})
          </div>
          {errorTriggers.map((t) => (
            <div
              key={t.id}
              className="p-2 rounded-lg border bg-destructive/10 border-destructive/30"
            >
              <div className="font-medium text-sm">{t.name}</div>
              <div className="text-xs text-destructive">{t.lastError}</div>
            </div>
          ))}
        </div>
      )}
      
      {/* Fired */}
      {firedTriggers.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            ✅ FIRED ({firedTriggers.length})
          </div>
          {firedTriggers.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="p-2 rounded-lg border bg-muted/50"
            >
              <div className="font-medium text-sm text-muted-foreground">{t.name}</div>
              <div className="text-xs text-muted-foreground">
                {t.lastFiredAt ? new Date(t.lastFiredAt).toLocaleTimeString() : '–'}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {triggers.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
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
}: {
  recentSignals: Signal[];
  presets?: Array<{
    id: string;
    name: string;
    type: 'torch' | 'audio' | 'vibration' | 'screen_flash' | 'notification';
    color?: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  onSend: (channel: string, payload: unknown) => void;
  onExecuteSignal?: (type: string, config: Record<string, unknown>) => Promise<void>;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
}) {
  const [channel, setChannel] = useState('');
  const [message, setMessage] = useState('');
  const [executingSignal, setExecutingSignal] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  const handleSend = () => {
    if (!channel.trim() || !message.trim()) return;
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

  // Quick presets - built-in
  const builtInPresets = [
    { id: 'pause', channel: 'pause', label: `⏸ ${t('signals.presets.pause')}`, message: t('signals.presets.pauseMessage'), icon: '⏸' },
    { id: 'hint', channel: 'hint', label: `💡 ${t('signals.presets.hint')}`, message: t('signals.presets.hintMessage'), icon: '💡' },
    { id: 'attention', channel: 'attention', label: `⚡ ${t('signals.presets.attention')}`, message: t('signals.presets.attentionMessage'), icon: '⚡' },
    { id: 'flash', channel: 'flash', label: `💥 ${t('signals.presets.flash')}`, message: t('signals.presets.flashMessage'), icon: '💥' },
  ];

  // Signal type icons
  const getSignalTypeIcon = (type: string) => {
    switch (type) {
      case 'torch': return '🔦';
      case 'audio': return '🔊';
      case 'vibration': return '📳';
      case 'screen_flash': return '💡';
      case 'notification': return '🔔';
      default: return '📡';
    }
  };

  const notificationPreset = presets.find((preset) => preset.type === 'notification');
  const notificationStatus = notificationPreset?.disabled ? notificationPreset.disabledReason : null;

  return (
    <div className="space-y-4">
      {/* Device signal presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('signals.deviceSignals')}
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                size="sm"
                onClick={() => handleExecutePreset(p)}
                disabled={executingSignal === p.id || p.disabled}
                className="gap-1"
                title={p.disabled && p.disabledReason ? p.disabledReason : undefined}
                style={p.type === 'screen_flash' && p.color ? {
                  borderColor: p.color,
                  color: p.color,
                } : undefined}
              >
                <span>{getSignalTypeIcon(p.type)}</span>
                <span>{p.name}</span>
                {executingSignal === p.id && (
                  <span className="animate-pulse">●</span>
                )}
              </Button>
            ))}
          </div>
          {notificationStatus && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Notifications: {notificationStatus}</span>
              {onExecuteSignal && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void onExecuteSignal('notification', {
                    forceToast: true,
                    title: 'Notification',
                    body: 'In-app toast',
                  })}
                >
                  Show in-app toast
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Message presets */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('signals.quickMessages')}
        </div>
        <div className="flex flex-wrap gap-2">
          {builtInPresets.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => onSend(p.channel, { message: p.message })}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Custom signal toggle */}
      <div className="border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCustom(!showCustom)}
          className="w-full justify-between"
        >
          <span>{t('signals.customSignal')}</span>
          <span className="text-muted-foreground">{showCustom ? '−' : '+'}</span>
        </Button>
        
        {showCustom && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              placeholder={t('signals.channelPlaceholder')}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('signals.messagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button size="sm" onClick={handleSend} disabled={!channel || !message}>
                {t('signals.send')}
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Recent signals */}
      {recentSignals.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('signals.recentSignals')}
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {recentSignals.slice(0, 8).map((s) => (
              <div 
                key={s.id} 
                className="text-xs text-muted-foreground flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 cursor-pointer"
                onClick={() => onSend(s.channel, s.payload)}
              >
                <span className="font-mono truncate max-w-[120px]">{s.channel}</span>
                <span className="text-[10px] opacity-70">
                  {new Date(s.createdAt).toLocaleTimeString('sv-SE', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {t('signals.clickToResend')}
          </p>
        </div>
      )}
    </div>
  );
}

function EventFeed({ events, t }: { events: SessionEvent[]; t: ReturnType<typeof useTranslations<'play.directorDrawer'>> }) {
  if (events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        {t('events.noEvents')}
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    if (type.includes('trigger')) return '⚡';
    if (type.includes('artifact')) return '📦';
    if (type.includes('signal')) return '📡';
    if (type.includes('step')) return '📍';
    if (type.includes('error')) return '❌';
    return '•';
  };

  return (
    <div className="space-y-1 max-h-[300px] overflow-y-auto">
      {events.slice(0, 20).map((e) => (
        <div
          key={e.id}
          className={cn(
            'flex items-start gap-2 text-xs p-2 rounded',
            e.type.includes('error') && 'bg-destructive/10'
          )}
        >
          <span className="shrink-0">{getEventIcon(e.type)}</span>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{e.type}</div>
            {e.payload && Object.keys(e.payload).length > 0 && (
              <div className="text-muted-foreground truncate">
                {JSON.stringify(e.payload).slice(0, 50)}
              </div>
            )}
          </div>
          <span className="text-muted-foreground shrink-0">
            {new Date(e.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function TimeBankQuickPanel({
  balance,
  paused,
  onDelta,
  t,
}: {
  balance: number;
  paused: boolean;
  onDelta: (delta: number, reason: string) => void;
  t: ReturnType<typeof useTranslations<'play.directorDrawer'>>;
}) {
  const minutes = Math.floor(balance / 60);
  const seconds = balance % 60;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl font-mono font-bold text-primary">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        {paused && (
          <Badge variant="warning" size="sm" className="mt-1">
            {t('timeBank.paused')}
          </Badge>
        )}
      </div>
      
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelta(-60, t('timeBank.manualAdjustment'))}
        >
          −1 min
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelta(-30, t('timeBank.manualAdjustment'))}
        >
          −30s
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelta(30, t('timeBank.manualAdjustment'))}
        >
          +30s
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelta(60, t('timeBank.manualAdjustment'))}
        >
          +1 min
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DirectorModeDrawer({
  open,
  onClose,
  sessionName,
  sessionCode,
  status,
  steps,
  currentStepIndex,
  phases: _phases, // Reserved for phase navigation
  currentPhaseIndex: _currentPhaseIndex, // Reserved for phase navigation
  triggers,
  recentSignals,
  signalPresets,
  events,
  timeBankBalance,
  timeBankPaused,
  participantCount,
  onPause,
  onResume,
  onNextStep,
  onPreviousStep,
  onFireTrigger,
  onDisableAllTriggers,
  onSendSignal,
  onExecuteSignal,
  onTimeBankDelta,
  className,
}: DirectorModeDrawerProps) {
  const t = useTranslations('play.directorDrawer');
  const [activeTab, setActiveTab] = useState<DirectorTab>('play');
  const [actionPending, setActionPending] = useState(false);
  const [showStoryView, setShowStoryView] = useState(false);

  const currentStep = steps[currentStepIndex];

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handlePauseResume = async () => {
    setActionPending(true);
    try {
      if (status === 'active') {
        await onPause();
      } else {
        await onResume();
      }
    } finally {
      setActionPending(false);
    }
  };

  const tabs = [
    { id: 'play' as const, label: t('tabs.play'), icon: PlayIcon },
    { id: 'triggers' as const, label: t('tabs.triggers'), icon: BoltIcon, badge: triggers.filter((tr) => tr.status === 'armed').length },
    { id: 'signals' as const, label: t('tabs.signals'), icon: SignalIcon },
    { id: 'events' as const, label: t('tabs.events'), icon: ClockIcon, badge: events.length },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-50 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 w-full max-w-lg bg-background border-l shadow-xl z-50 flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <ArrowLeftIcon className="h-4 w-4" />
                </Button>
                <div>
                  <div className="font-semibold text-foreground">{sessionName}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{sessionCode}</span>
                    <span className="mx-2">•</span>
                    <span>{t('header.participants', { count: participantCount })}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge
                  variant={status === 'active' ? 'success' : status === 'paused' ? 'warning' : 'default'}
                >
                  {status === 'active' ? `● ${t('header.statusLive')}` : status === 'paused' ? `⏸ ${t('header.statusPaused')}` : t('header.statusEnded')}
                </Badge>
                
                {status !== 'ended' && (
                  <Button
                    variant={status === 'active' ? 'outline' : 'default'}
                    size="sm"
                    onClick={handlePauseResume}
                    disabled={actionPending}
                  >
                    {status === 'active' ? (
                      <>
                        <PauseIcon className="h-4 w-4 mr-1" />
                        {t('header.pause')}
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-4 w-4 mr-1" />
                        {t('header.resume')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <Badge variant="default" size="sm">
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'play' && (
                <div className="space-y-6">
                  {/* Step Navigation */}
                  <StepNavigation
                    steps={steps}
                    currentIndex={currentStepIndex}
                    onNext={onNextStep}
                    onPrevious={onPreviousStep}
                    t={t}
                  />
                  
                  {/* Leader Script */}
                  <LeaderScriptPanel script={currentStep?.leaderScript} />
                  
                  {/* Time Bank */}
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ClockIcon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{t('timeBank.title')}</span>
                    </div>
                    <TimeBankQuickPanel
                      balance={timeBankBalance}
                      paused={timeBankPaused}
                      onDelta={onTimeBankDelta}
                      t={t}
                    />
                  </Card>
                  
                  {/* Quick Actions */}
                  {currentStep && (
                    <Card className="p-4">
                      <div className="text-sm font-medium mb-3">{t('quickActions.title')}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowStoryView(true)}
                        >
                          <BookOpenIcon className="h-4 w-4 mr-1" />
                          {t('quickActions.story')}
                        </Button>
                        <Button variant="outline" size="sm">
                          💡 {t('quickActions.giveHint')}
                        </Button>
                        <Button variant="outline" size="sm">
                          🔄 {t('quickActions.reset')}
                        </Button>
                        <Button variant="outline" size="sm">
                          📣 {t('quickActions.message')}
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              )}
              
              {activeTab === 'triggers' && (
                <TriggerPanel
                  triggers={triggers}
                  onFire={onFireTrigger}
                  onDisableAll={onDisableAllTriggers}
                  t={t}
                />
              )}
              
              {activeTab === 'signals' && (
                <SignalQuickPanel
                  recentSignals={recentSignals}
                  presets={signalPresets}
                  onSend={onSendSignal}
                  onExecuteSignal={onExecuteSignal}
                  t={t}
                />
              )}
              
              {activeTab === 'events' && (
                <EventFeed events={events} t={t} />
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t bg-muted/30">
              <Button
                variant="outline"
                className="w-full"
                onClick={onClose}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                {t('footer.backToLobby')}
              </Button>
            </div>
          </div>
          
          {/* Story View Modal */}
          <StoryViewModal
            open={showStoryView}
            onClose={() => setShowStoryView(false)}
            steps={steps}
            currentStepIndex={currentStepIndex}
            title={sessionName}
          />
    </>
  );
}

export default DirectorModeDrawer;
