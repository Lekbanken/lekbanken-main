'use client';

/**
 * CalendarGrid Component
 * 
 * Month/week grid view of the calendar.
 */

import { useTranslations } from 'next-intl';
import { CalendarDay, CalendarDayHeader } from './CalendarDay';
import type { CalendarMonth, CalendarWeek } from '../types';
import { getWeekdayNames } from '../utils/dateUtils';

interface CalendarGridProps {
  monthGrid?: CalendarMonth;
  weekGrid?: CalendarWeek;
  onSelectDate: (date: string) => void;
  locale?: string;
}

export function CalendarGrid({
  monthGrid,
  weekGrid,
  onSelectDate,
  locale = 'sv-SE',
}: CalendarGridProps) {
  const t = useTranslations('planner.wizard.calendar');
  const weekdays = getWeekdayNames(locale, 'short');

  // Month view
  if (monthGrid) {
    return (
      <div className="rounded-xl border border-border bg-card p-2 sm:p-4">
        <CalendarDayHeader weekdays={weekdays} />
        
        <div className="mt-2 space-y-1">
          {monthGrid.weeks.map((week) => (
            <div key={week.weekNumber} className="grid grid-cols-7 gap-1">
              {week.days.map((day) => (
                <CalendarDay
                  key={day.date}
                  day={day}
                  onClick={onSelectDate}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Week view
  if (weekGrid) {
    return (
      <div className="rounded-xl border border-border bg-card p-2 sm:p-4">
        <CalendarDayHeader weekdays={weekdays} />
        
        <div className="mt-2 grid grid-cols-7 gap-1">
          {weekGrid.days.map((day) => (
            <CalendarDay
              key={day.date}
              day={day}
              onClick={onSelectDate}
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
      <p className="text-muted-foreground">{t('noData')}</p>
    </div>
  );
}
