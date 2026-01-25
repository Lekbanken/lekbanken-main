'use client';

/**
 * CalendarDay Component
 * 
 * Individual day cell in the calendar grid.
 */

import { cn } from '@/lib/utils';
import type { CalendarDay as CalendarDayType } from '../types';

interface CalendarDayProps {
  day: CalendarDayType;
  onClick: (date: string) => void;
  compact?: boolean;
}

export function CalendarDay({ day, onClick, compact = false }: CalendarDayProps) {
  const hasSchedules = day.schedules.length > 0;
  const scheduledCount = day.schedules.filter(s => s.status === 'scheduled').length;
  const completedCount = day.schedules.filter(s => s.status === 'completed').length;

  return (
    <button
      onClick={() => onClick(day.date)}
      disabled={!day.isCurrentMonth}
      className={cn(
        'relative flex flex-col items-center justify-start rounded-lg p-1 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        compact ? 'h-10 w-10' : 'min-h-[60px] sm:min-h-[80px]',
        day.isCurrentMonth 
          ? 'hover:bg-muted/50' 
          : 'cursor-default opacity-40',
        day.isSelected && 'bg-primary/10 ring-2 ring-primary',
        day.isToday && !day.isSelected && 'bg-accent',
        day.isWeekend && day.isCurrentMonth && 'bg-muted/30',
      )}
    >
      {/* Day number */}
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
          day.isToday && 'bg-primary text-primary-foreground',
          day.isPast && !day.isToday && 'text-muted-foreground',
        )}
      >
        {day.dayOfMonth}
      </span>

      {/* Schedule indicators */}
      {hasSchedules && !compact && (
        <div className="mt-1 flex flex-wrap gap-0.5 px-0.5">
          {scheduledCount > 0 && (
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          )}
          {completedCount > 0 && (
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
          )}
          {day.schedules.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{day.schedules.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Compact mode dot indicator */}
      {hasSchedules && compact && (
        <div className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
      )}
    </button>
  );
}

/**
 * CalendarDayHeader Component
 * 
 * Weekday header labels for the calendar grid.
 */
interface CalendarDayHeaderProps {
  weekdays: string[];
}

export function CalendarDayHeader({ weekdays }: CalendarDayHeaderProps) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {weekdays.map((day, index) => (
        <div
          key={index}
          className={cn(
            'py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground',
            (index === 5 || index === 6) && 'text-muted-foreground/60',
          )}
        >
          {day}
        </div>
      ))}
    </div>
  );
}
