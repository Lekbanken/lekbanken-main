/**
 * TriggerLivePanel Component
 * 
 * Live display and control panel for session triggers during Director Mode.
 * Groups triggers by status, allows manual fire, and shows errors.
 * 
 * Task 5.2 - Session Cockpit Architecture
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tooltip } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  BoltIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import type { Trigger, TriggerStatus, TriggerCondition } from '@/types/trigger';

// =============================================================================
// Types
// =============================================================================

export interface TriggerLivePanelProps {
  /** All session triggers */
  triggers: Trigger[];
  /** Fire a trigger manually */
  onFireTrigger: (triggerId: string) => Promise<void>;
  /** Disable a trigger */
  onDisableTrigger: (triggerId: string) => Promise<void>;
  /** Re-arm a trigger (clear error or enable disabled) */
  onRearmTrigger: (triggerId: string) => Promise<void>;
  /** Disable all triggers (kill switch) */
  onDisableAll?: () => Promise<void>;
  /** Re-arm all triggers */
  onRearmAll?: () => Promise<void>;
  /** Is the kill switch engaged? */
  killSwitchActive?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

// =============================================================================
// Helper: Group triggers by status
// =============================================================================

interface TriggerGroup {
  status: TriggerStatus;
  labelKey: 'armed' | 'error' | 'fired' | 'disabled';
  icon: React.ReactNode;
  triggers: Trigger[];
  variant: 'default' | 'outline' | 'destructive';
}

const groupTriggers = (triggers: Trigger[]): TriggerGroup[] => {
  const armed = triggers.filter((t) => t.status === 'armed');
  const fired = triggers.filter((t) => t.status === 'fired');
  const error = triggers.filter((t) => t.status === 'error');
  const disabled = triggers.filter((t) => t.status === 'disabled');

  const groups: TriggerGroup[] = [
    {
      status: 'armed' as TriggerStatus,
      labelKey: 'armed',
      icon: <BoltIcon className="h-4 w-4 text-green-500" />,
      triggers: armed,
      variant: 'default',
    },
    {
      status: 'error' as TriggerStatus,
      labelKey: 'error',
      icon: <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />,
      triggers: error,
      variant: 'destructive',
    },
    {
      status: 'fired' as TriggerStatus,
      labelKey: 'fired',
      icon: <CheckCircleIcon className="h-4 w-4 text-blue-500" />,
      triggers: fired,
      variant: 'outline',
    },
    {
      status: 'disabled' as TriggerStatus,
      labelKey: 'disabled',
      icon: <XCircleIcon className="h-4 w-4 text-muted-foreground" />,
      triggers: disabled,
      variant: 'outline',
    },
  ];
  
  return groups.filter((g) => g.triggers.length > 0);
};

// =============================================================================
// Helper: Get condition description
// =============================================================================

const getConditionKey = (condition: TriggerCondition): string => {
  switch (condition.type) {
    case 'step_started':
      return 'conditions.stepStarted';
    case 'step_completed':
      return 'conditions.stepCompleted';
    case 'phase_started':
      return 'conditions.phaseStarted';
    case 'phase_completed':
      return 'conditions.phaseCompleted';
    case 'keypad_correct':
      return 'conditions.keypadCorrect';
    case 'keypad_failed':
      return 'conditions.keypadFailed';
    case 'artifact_unlocked':
      return 'conditions.artifactUnlocked';
    case 'timer_ended':
      return 'conditions.timerEnded';
    case 'manual':
      return 'conditions.manual';
    case 'signal_received':
      return 'conditions.signalReceived';
    case 'counter_reached':
      return 'conditions.counterReached';
    case 'riddle_correct':
      return 'conditions.riddleCorrect';
    case 'time_bank_expired':
      return 'conditions.timeBankExpired';
    case 'signal_generator_triggered':
      return 'conditions.signalGenerator';
    default:
      return condition.type;
  }
};

// =============================================================================
// Sub-Component: TriggerRow
// =============================================================================

interface TriggerRowProps {
  trigger: Trigger;
  onFire: () => Promise<void>;
  onDisable: () => Promise<void>;
  onRearm: () => Promise<void>;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations<'play.triggerLivePanel'>>;
}

function TriggerRow({
  trigger,
  onFire,
  onDisable,
  onRearm,
  isLoading,
  t,
}: TriggerRowProps) {
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = useCallback(
    (value: string | Date) => {
      try {
        const date = value instanceof Date ? value : new Date(value);
        return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
      } catch {
        return '';
      }
    },
    [locale]
  );

  const statusColors: Record<TriggerStatus, string> = {
    armed: 'border-l-green-500',
    fired: 'border-l-blue-500',
    error: 'border-l-red-500',
    disabled: 'border-l-muted-foreground',
  };

  return (
    <div
      className={`
        border-l-4 ${statusColors[trigger.status]}
        bg-card rounded-r-lg p-3
      `}
    >
      <div className="flex items-center gap-3">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        {/* Trigger info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{trigger.name}</span>
            <Badge variant="outline" className="text-xs">
              {t(getConditionKey(trigger.when) as Parameters<typeof t>[0])}
            </Badge>
            {trigger.executeOnce && (
              <Badge variant="outline" className="text-xs">
                {t('executeOnce')}
              </Badge>
            )}
          </div>

          {/* Error message */}
          {trigger.status === 'error' && trigger.lastError && (
            <div className="text-xs text-red-500 mt-1 truncate">
              {trigger.lastError}
            </div>
          )}

          {/* Fired info */}
          {trigger.firedCount > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {t('firedCount', { count: trigger.firedCount })}
              {trigger.firedAt && (
                <> • {formatTime(trigger.firedAt)}</>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {trigger.status === 'armed' && (
            <>
              <Tooltip content={t('tooltips.fireNow')}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFire}
                  disabled={isLoading}
                  className="h-8 w-8 p-0"
                >
                  <PlayIcon className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content={t('tooltips.disable')}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDisable}
                  disabled={isLoading}
                  className="h-8 w-8 p-0 text-muted-foreground"
                >
                  <PauseIcon className="h-4 w-4" />
                </Button>
              </Tooltip>
            </>
          )}

          {(trigger.status === 'disabled' || trigger.status === 'error') && (
            <Tooltip content={trigger.status === 'error' ? t('tooltips.clearErrorRearm') : t('tooltips.rearm')}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRearm}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}

          {trigger.status === 'fired' && trigger.executeOnce && (
            <Tooltip content={t('tooltips.resetCanFire')}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRearm}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">{t('details.condition')}:</span>{' '}
              <code className="bg-muted px-1 rounded">{trigger.when.type}</code>
            </div>
            <div>
              <span className="text-muted-foreground">{t('details.actions')}:</span>{' '}
              {t('details.actionsCount', { count: trigger.then.length })}
            </div>
            {trigger.delaySeconds && trigger.delaySeconds > 0 && (
              <div>
                <span className="text-muted-foreground">{t('details.delay')}:</span>{' '}
                {t('details.delaySeconds', { count: trigger.delaySeconds })}
              </div>
            )}
            {trigger.errorCount > 0 && (
              <div>
                <span className="text-muted-foreground">{t('details.totalErrors')}:</span>{' '}
                {trigger.errorCount}
              </div>
            )}
          </div>

          {/* Actions list */}
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-1">{t('details.actions')}:</div>
            <div className="space-y-1">
              {trigger.then.map((action, i) => (
                <div
                  key={i}
                  className="text-xs bg-muted px-2 py-1 rounded font-mono"
                >
                  {action.type}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-Component: TriggerGroupSection
// =============================================================================

interface TriggerGroupSectionProps {
  group: TriggerGroup;
  onFireTrigger: (id: string) => Promise<void>;
  onDisableTrigger: (id: string) => Promise<void>;
  onRearmTrigger: (id: string) => Promise<void>;
  loadingTriggerId: string | null;
  t: ReturnType<typeof useTranslations<'play.triggerLivePanel'>>;
}

function TriggerGroupSection({
  group,
  onFireTrigger,
  onDisableTrigger,
  onRearmTrigger,
  loadingTriggerId,
  t,
}: TriggerGroupSectionProps) {
  const [isOpen, setIsOpen] = useState(
    group.status === 'armed' || group.status === 'error'
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {isOpen ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
          {group.icon}
          <span className="font-medium">{t(`groups.${group.labelKey}` as Parameters<typeof t>[0])}</span>
          <Badge variant={group.variant} className="ml-auto">
            {group.triggers.length}
          </Badge>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 mt-2 ml-6">
        {group.triggers.map((trigger) => (
          <TriggerRow
            key={trigger.id}
            trigger={trigger}
            onFire={() => onFireTrigger(trigger.id)}
            onDisable={() => onDisableTrigger(trigger.id)}
            onRearm={() => onRearmTrigger(trigger.id)}
            isLoading={loadingTriggerId === trigger.id}
            t={t}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TriggerLivePanel({
  triggers,
  onFireTrigger,
  onDisableTrigger,
  onRearmTrigger,
  onDisableAll,
  onRearmAll,
  killSwitchActive = false,
  compact = false,
  className,
}: TriggerLivePanelProps) {
  const t = useTranslations('play.triggerLivePanel');
  const [loadingTriggerId, setLoadingTriggerId] = useState<string | null>(null);
  const [isKillSwitchLoading, setIsKillSwitchLoading] = useState(false);

  const groups = useMemo(() => groupTriggers(triggers), [triggers]);

  const armedCount = triggers.filter((tr) => tr.status === 'armed').length;
  const errorCount = triggers.filter((tr) => tr.status === 'error').length;

  const handleFireTrigger = useCallback(
    async (id: string) => {
      setLoadingTriggerId(id);
      try {
        await onFireTrigger(id);
      } finally {
        setLoadingTriggerId(null);
      }
    },
    [onFireTrigger]
  );

  const handleDisableTrigger = useCallback(
    async (id: string) => {
      setLoadingTriggerId(id);
      try {
        await onDisableTrigger(id);
      } finally {
        setLoadingTriggerId(null);
      }
    },
    [onDisableTrigger]
  );

  const handleRearmTrigger = useCallback(
    async (id: string) => {
      setLoadingTriggerId(id);
      try {
        await onRearmTrigger(id);
      } finally {
        setLoadingTriggerId(null);
      }
    },
    [onRearmTrigger]
  );

  const handleDisableAll = useCallback(async () => {
    if (!onDisableAll) return;
    setIsKillSwitchLoading(true);
    try {
      await onDisableAll();
    } finally {
      setIsKillSwitchLoading(false);
    }
  }, [onDisableAll]);

  const handleRearmAll = useCallback(async () => {
    if (!onRearmAll) return;
    setIsKillSwitchLoading(true);
    try {
      await onRearmAll();
    } finally {
      setIsKillSwitchLoading(false);
    }
  }, [onRearmAll]);

  // Compact mode
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <BoltIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{t('title')}</span>
        <Badge variant={armedCount > 0 ? 'default' : 'outline'}>
          {t('readyCount', { count: armedCount })}
        </Badge>
        {errorCount > 0 && (
          <Badge variant="destructive">
            {t('errorCount', { count: errorCount })}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BoltIcon className="h-5 w-5" />
            {t('title')}
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Stats badges */}
            <Badge variant={armedCount > 0 ? 'default' : 'outline'}>
              {t('readyCount', { count: armedCount })}
            </Badge>
            {errorCount > 0 && (
              <Badge variant="destructive">
                {t('errorCount', { count: errorCount })}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {t('description', { count: triggers.length })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Kill switch controls */}
        {(onDisableAll || onRearmAll) && (
          <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
            {onDisableAll && armedCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isKillSwitchLoading}
                    className="gap-1"
                  >
                    <ShieldExclamationIcon className="h-4 w-4" />
                    {t('emergencyStop')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('dialog.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('dialog.description', { count: armedCount })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('dialog.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisableAll}>
                      {t('dialog.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {onRearmAll && armedCount < triggers.filter((tr) => tr.enabled).length && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRearmAll}
                disabled={isKillSwitchLoading}
                className="gap-1"
              >
                <ShieldCheckIcon className="h-4 w-4" />
                {t('rearmAll')}
              </Button>
            )}

            {killSwitchActive && (
              <div className="flex items-center gap-1 text-sm text-destructive ml-auto">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {t('emergencyStopActive')}
              </div>
            )}
          </div>
        )}

        {/* Trigger groups */}
        {groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BoltIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('noTriggersInSession')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <TriggerGroupSection
                key={group.status}
                group={group}
                onFireTrigger={handleFireTrigger}
                onDisableTrigger={handleDisableTrigger}
                onRearmTrigger={handleRearmTrigger}
                loadingTriggerId={loadingTriggerId}
                t={t}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
