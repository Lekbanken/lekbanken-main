'use client';

/**
 * ScheduleCard Component
 * 
 * Card displaying a single scheduled plan run.
 */

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlanSchedule } from '../types';

// Icons
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 20 12 6 21 6 3"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const BlocksIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/>
    <rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
  </svg>
);

interface ScheduleCardProps {
  schedule: PlanSchedule;
  onPlay?: () => void;
  onMarkComplete?: () => void;
  onMarkSkipped?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
}

export function ScheduleCard({
  schedule,
  onPlay,
  onMarkComplete,
  onMarkSkipped,
  onEdit,
  showActions = true,
}: ScheduleCardProps) {
  const t = useTranslations('planner.wizard.calendar');
  
  const statusColors = {
    scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
    completed: 'bg-green-500/10 text-green-600 border-green-200',
    skipped: 'bg-gray-500/10 text-gray-600 border-gray-200',
  };

  const statusLabels = {
    scheduled: t('status.scheduled'),
    completed: t('status.completed'),
    skipped: t('status.skipped'),
  };

  return (
    <div
      className={cn(
        'group rounded-xl border bg-card p-4 transition-all hover:shadow-md',
        schedule.status === 'completed' && 'opacity-75',
        schedule.status === 'skipped' && 'opacity-60',
      )}
    >
      {/* Header: Time and Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {schedule.scheduledTime && (
            <span className="text-lg font-semibold tabular-nums">
              {schedule.scheduledTime}
            </span>
          )}
          <Badge 
            variant="outline" 
            className={cn('text-xs', statusColors[schedule.status])}
          >
            {statusLabels[schedule.status]}
          </Badge>
        </div>
        
        {showActions && schedule.status === 'scheduled' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPlay}
            className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={t('startPlan')}
          >
            <PlayIcon />
          </Button>
        )}
      </div>

      {/* Plan Name */}
      <h3 
        className="mt-2 font-medium text-foreground line-clamp-1 cursor-pointer hover:text-primary"
        onClick={onEdit}
      >
        {schedule.planName}
      </h3>

      {/* Meta info */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {schedule.blockCount !== undefined && (
          <span className="flex items-center gap-1">
            <BlocksIcon />
            {schedule.blockCount} {t('blocks')}
          </span>
        )}
        {schedule.totalTimeMinutes !== undefined && (
          <span className="flex items-center gap-1">
            <ClockIcon />
            {schedule.totalTimeMinutes} min
          </span>
        )}
      </div>

      {/* Notes */}
      {schedule.notes && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {schedule.notes}
        </p>
      )}

      {/* Actions for scheduled items */}
      {showActions && schedule.status === 'scheduled' && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkComplete}
            className="flex-1 text-green-600 hover:bg-green-50 hover:text-green-700"
          >
            <CheckIcon />
            <span className="ml-1.5">{t('markComplete')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkSkipped}
            className="flex-1 text-gray-600 hover:bg-gray-50 hover:text-gray-700"
          >
            <XIcon />
            <span className="ml-1.5">{t('markSkipped')}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * ScheduleCardSkeleton
 * 
 * Loading placeholder for ScheduleCard.
 */
export function ScheduleCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="h-6 w-12 rounded bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="mt-2 h-5 w-3/4 rounded bg-muted" />
      <div className="mt-2 flex gap-3">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-4 w-12 rounded bg-muted" />
      </div>
    </div>
  );
}
