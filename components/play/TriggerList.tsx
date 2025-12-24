'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { Trigger, TriggerStatus } from '@/types/trigger';
import { TriggerCard } from './TriggerCard';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, BoltIcon } from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

export interface TriggerListProps {
  /** List of triggers to display */
  triggers: Trigger[];
  /** Filter by status (optional) */
  filterStatus?: TriggerStatus | 'all';
  /** Empty state title */
  emptyTitle?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Whether to show the add button */
  showAddButton?: boolean;
  /** Called when add is clicked */
  onAdd?: () => void;
  /** Called when a trigger is edited */
  onEdit?: (trigger: Trigger) => void;
  /** Called when a trigger is toggled */
  onToggle?: (trigger: Trigger) => void;
  /** Called when a trigger is deleted */
  onDelete?: (trigger: Trigger) => void;
  /** Called when a manual trigger is fired */
  onFire?: (trigger: Trigger) => void;
  /** Called when a trigger is reset */
  onReset?: (trigger: Trigger) => void;
  /** Called when a trigger card is clicked */
  onSelect?: (trigger: Trigger) => void;
  /** Currently selected trigger ID */
  selectedId?: string;
  /** Show compact cards */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Summary Header
// ============================================================================

interface SummaryProps {
  triggers: Trigger[];
}

function TriggerSummary({ triggers }: SummaryProps) {
  const armed = triggers.filter(t => t.status === 'armed').length;
  const fired = triggers.filter(t => t.status === 'fired').length;
  const disabled = triggers.filter(t => t.status === 'disabled').length;

  return (
    <div className="flex items-center gap-3 text-sm">
      {armed > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="text-foreground-secondary">{armed} armed</span>
        </span>
      )}
      {fired > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-foreground-secondary">{fired} fired</span>
        </span>
      )}
      {disabled > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-foreground-secondary" />
          <span className="text-foreground-secondary">{disabled} disabled</span>
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  title: string;
  description: string;
  onAdd?: () => void;
}

function EmptyState({ title, description, onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
        <BoltIcon className="h-8 w-8 text-foreground-secondary" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-foreground-secondary text-sm max-w-xs mb-6">{description}</p>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Trigger
        </button>
      )}
    </div>
  );
}

// ============================================================================
// TriggerList Component
// ============================================================================

export const TriggerList = forwardRef<HTMLDivElement, TriggerListProps>(
  (
    {
      triggers,
      filterStatus = 'all',
      emptyTitle = 'No triggers yet',
      emptyDescription = 'Create triggers to automate your game. Triggers fire actions when conditions are met.',
      showAddButton = true,
      onAdd,
      onEdit,
      onToggle,
      onDelete,
      onFire,
      onReset,
      onSelect,
      selectedId,
      compact = false,
      className,
    },
    ref
  ) => {
    // Filter triggers if needed
    const filteredTriggers = filterStatus === 'all'
      ? triggers
      : triggers.filter(t => t.status === filterStatus);

    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BoltIcon className="h-5 w-5 text-yellow" />
              Triggers
              <Badge variant="secondary" size="sm">
                {triggers.length}
              </Badge>
            </h2>
          </div>

          {showAddButton && onAdd && triggers.length > 0 && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add
            </button>
          )}
        </div>

        {/* Summary */}
        {triggers.length > 0 && (
          <TriggerSummary triggers={triggers} />
        )}

        {/* Empty State */}
        {filteredTriggers.length === 0 && (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            onAdd={showAddButton ? onAdd : undefined}
          />
        )}

        {/* Trigger Cards */}
        {filteredTriggers.length > 0 && (
          <div className="space-y-3">
            {filteredTriggers.map(trigger => (
              <TriggerCard
                key={trigger.id}
                trigger={trigger}
                compact={compact}
                selected={selectedId === trigger.id}
                onEdit={onEdit}
                onToggle={onToggle}
                onDelete={onDelete}
                onFire={onFire}
                onReset={onReset}
                onClick={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

TriggerList.displayName = 'TriggerList';

export default TriggerList;
