'use client';

import { useTranslations } from 'next-intl';
import { PlannerTabs } from '@/features/planner/components/PlannerTabs';
import { 
  PlannerPageLayout, 
  PlannerPageHeader,
} from '@/features/planner/components/PlannerPageLayout';
import { PlanCalendar } from '@/features/planner/calendar';
import { usePlannerFeature } from '@/lib/features/planner-features';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

/**
 * Plan Calendar Page (/app/planner/calendar)
 *
 * Shows a calendar view of scheduled plan runs.
 */
export default function PlanCalendarPage() {
  const t = useTranslations('planner.wizard.calendar');
  const calendarEnabled = usePlannerFeature('planner_calendar');

  return (
    <PlannerPageLayout>
      <PlannerPageHeader 
        title={t('title')} 
        eyebrow="Planera"
      />
      
      <PlannerTabs activeTab="calendar" />

      <div className="mt-6">
        {calendarEnabled ? (
          <PlanCalendar />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <CalendarDaysIcon className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {t('comingSoonTitle')}
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t('comingSoonDescription')}
            </p>
          </div>
        )}
      </div>
    </PlannerPageLayout>
  );
}
