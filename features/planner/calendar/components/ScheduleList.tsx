'use client';

/**
 * ScheduleList Component
 * 
 * List of schedules for a selected day.
 */

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ScheduleCard, ScheduleCardSkeleton } from './ScheduleCard';
import { formatDisplayDate, parseISODate } from '../utils/dateUtils';
import type { PlanSchedule } from '../types';

// Icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4"/><path d="M16 2v4"/>
    <rect width="18" height="18" x="3" y="4" rx="2"/>
    <path d="M3 10h18"/>
  </svg>
);

interface ScheduleListProps {
  date: string | null;
  schedules: PlanSchedule[];
  isLoading?: boolean;
  onAddSchedule: () => void;
  onPlaySchedule: (schedule: PlanSchedule) => void;
  onMarkComplete: (schedule: PlanSchedule) => void;
  onMarkSkipped: (schedule: PlanSchedule) => void;
  onEditSchedule: (schedule: PlanSchedule) => void;
}

export function ScheduleList({
  date,
  schedules,
  isLoading = false,
  onAddSchedule,
  onPlaySchedule,
  onMarkComplete,
  onMarkSkipped,
  onEditSchedule,
}: ScheduleListProps) {
  const t = useTranslations('planner.wizard.calendar');

  // No date selected
  if (!date) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <CalendarIcon />
        <p className="mt-4 text-sm font-medium text-foreground">
          {t('selectDay')}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('selectDayDescription')}
        </p>
      </div>
    );
  }

  const displayDate = formatDisplayDate(parseISODate(date));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">{displayDate}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddSchedule}
        >
          <PlusIcon />
          <span className="ml-1.5">{t('addSchedule')}</span>
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          <ScheduleCardSkeleton />
          <ScheduleCardSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && schedules.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('noSchedulesForDay')}
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={onAddSchedule}
            className="mt-2"
          >
            {t('scheduleFirst')}
          </Button>
        </div>
      )}

      {/* Schedule list */}
      {!isLoading && schedules.length > 0 && (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onPlay={() => onPlaySchedule(schedule)}
              onMarkComplete={() => onMarkComplete(schedule)}
              onMarkSkipped={() => onMarkSkipped(schedule)}
              onEdit={() => onEditSchedule(schedule)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
