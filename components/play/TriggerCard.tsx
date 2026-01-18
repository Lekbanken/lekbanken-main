'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Trigger, TriggerStatus } from '@/types/trigger';
import { getConditionLabel, getConditionIcon, getActionLabel } from '@/types/trigger';
import { Badge } from '@/components/ui/badge';
import {
  BoltIcon,
  PencilIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

export interface TriggerCardProps {
  /** The trigger to display */
  trigger: Trigger;
  /** Whether the card is in compact mode */
  compact?: boolean;
  /** Whether the card is selected */
  selected?: boolean;
  /** Called when edit is clicked */
  onEdit?: (trigger: Trigger) => void;
  /** Called when enable/disable is clicked */
  onToggle?: (trigger: Trigger) => void;
  /** Called when delete is clicked */
  onDelete?: (trigger: Trigger) => void;
  /** Called when fire (manual) is clicked */
  onFire?: (trigger: Trigger) => void;
  /** Called when reset is clicked */
  onReset?: (trigger: Trigger) => void;
  /** Called when card is clicked */
  onClick?: (trigger: Trigger) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status, label }: { status: TriggerStatus; label: string }) {
  const variants: Record<TriggerStatus, { variant: 'success' | 'warning' | 'secondary' }> = {
    armed: { variant: 'success' },
    fired: { variant: 'warning' },
    disabled: { variant: 'secondary' },
    error: { variant: 'warning' },
  };

  const { variant } = variants[status];

  return (
    <Badge variant={variant} size="sm" dot>
      {label}
    </Badge>
  );
}

// ============================================================================
// Action Summary
// ============================================================================

function ActionSummary({ actions, moreLabel }: { actions: Trigger['then']; moreLabel: (count: number) => string }) {
  if (actions.length === 0) return null;
  
  if (actions.length === 1) {
    return <span className="text-foreground-secondary">{getActionLabel(actions[0].type)}</span>;
  }
  
  return (
    <span className="text-foreground-secondary">
      {getActionLabel(actions[0].type)} + {moreLabel(actions.length - 1)}
    </span>
  );
}

// ============================================================================
// TriggerCard Component
// ============================================================================

export const TriggerCard = forwardRef<HTMLDivElement, TriggerCardProps>(
  (
    {
      trigger,
      compact = false,
      selected = false,
      onEdit,
      onToggle,
      onDelete,
      onFire,
      onReset,
      onClick,
      className,
    },
    ref
  ) => {
    const t = useTranslations('play.triggerCard');
    const isManual = trigger.when.type === 'manual';
    const canFire = isManual && trigger.enabled && trigger.status === 'armed';
    const canReset = trigger.status === 'fired';

    return (
      <div
        ref={ref}
        onClick={() => onClick?.(trigger)}
        className={cn(
          'rounded-lg border bg-surface-primary p-4 transition-all',
          'hover:shadow-md',
          selected && 'ring-2 ring-primary',
          !trigger.enabled && 'opacity-60',
          onClick && 'cursor-pointer',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0" aria-hidden>
              <BoltIcon className="h-5 w-5 text-yellow" />
            </span>
            <h3 className="font-medium text-foreground truncate">
              {trigger.name}
            </h3>
          </div>
          <StatusBadge status={trigger.status} label={t(`status.${trigger.status}`)} />
        </div>

        {/* Condition & Actions */}
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-foreground-secondary font-medium uppercase text-xs w-10">
              {t('labels.when')}
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden>{getConditionIcon(trigger.when.type)}</span>
              <span className="text-foreground">{getConditionLabel(trigger.when.type)}</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-foreground-secondary font-medium uppercase text-xs w-10">
              {t('labels.then')}
            </span>
            <ActionSummary
              actions={trigger.then}
              moreLabel={(count) => t('actions.more', { count })}
            />
          </div>
        </div>

        {/* Meta info */}
        {!compact && (
          <div className="mt-3 flex items-center gap-3 text-xs text-foreground-secondary">
            {trigger.executeOnce && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground-secondary" />
                {t('onceOnly')}
              </span>
            )}
            {trigger.delaySeconds && trigger.delaySeconds > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground-secondary" />
                {trigger.delaySeconds}s delay
              </span>
            )}
            {trigger.firedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground-secondary" />
                Fired {trigger.firedCount}×
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {(onEdit || onToggle || onDelete || onFire || onReset) && (
          <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(trigger);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-foreground-secondary hover:text-foreground rounded-md hover:bg-surface-secondary transition-colors"
                aria-label="Edit trigger"
              >
                <PencilIcon className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Edit</span>
              </button>
            )}

            {canFire && onFire && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFire(trigger);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-primary hover:text-primary/80 rounded-md hover:bg-primary/10 transition-colors"
                aria-label="Fire trigger manually"
              >
                <PlayIcon className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Fire</span>
              </button>
            )}

            {canReset && onReset && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset(trigger);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-foreground-secondary hover:text-foreground rounded-md hover:bg-surface-secondary transition-colors"
                aria-label="Reset trigger"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Reset</span>
              </button>
            )}

            {onToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(trigger);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md transition-colors',
                  trigger.enabled
                    ? 'text-foreground-secondary hover:text-foreground hover:bg-surface-secondary'
                    : 'text-accent hover:text-accent/80 hover:bg-accent/10'
                )}
                aria-label={trigger.enabled ? 'Disable trigger' : 'Enable trigger'}
              >
                {trigger.enabled ? (
                  <>
                    <StopIcon className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Disable</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">Enable</span>
                  </>
                )}
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(trigger);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-error hover:text-error/80 rounded-md hover:bg-error/10 transition-colors ml-auto"
                aria-label="Delete trigger"
              >
                <TrashIcon className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

TriggerCard.displayName = 'TriggerCard';

export default TriggerCard;
