'use client';

/**
 * CalendarHeader Component
 * 
 * Navigation header for the calendar with month/week navigation and view toggle.
 */

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { CalendarView } from '../types';

// Icons
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

interface CalendarHeaderProps {
  title: string;
  view: CalendarView;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
  showViewToggle?: boolean;
}

export function CalendarHeader({
  title,
  view,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  showViewToggle = true,
}: CalendarHeaderProps) {
  const t = useTranslations('planner.wizard.calendar');

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Title and Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          aria-label={t('previousPeriod')}
          className="h-9 w-9 p-0"
        >
          <ChevronLeftIcon />
        </Button>
        
        <h2 className="min-w-[160px] text-center text-lg font-semibold capitalize">
          {title}
        </h2>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          aria-label={t('nextPeriod')}
          className="h-9 w-9 p-0"
        >
          <ChevronRightIcon />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="ml-2 hidden sm:inline-flex"
        >
          {t('today')}
        </Button>
      </div>

      {/* View Toggle & Today (mobile) */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="flex-1 sm:hidden"
        >
          {t('today')}
        </Button>
        
        {showViewToggle && (
          <div className="flex rounded-lg border border-border bg-background p-0.5">
            <button
              onClick={() => onViewChange('month')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === 'month'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('monthView')}
            </button>
            <button
              onClick={() => onViewChange('week')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === 'week'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('weekView')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
