'use client';

import { LockClosedIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

/**
 * Props for DisabledSection
 */
export interface DisabledSectionProps {
  /** Section title */
  title: string;
  /** Reason why the section is disabled */
  reason: string;
  /** Priority level for roadmap indication */
  priority?: 'P1' | 'P2' | 'P3';
  /** Optional icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * DisabledSection - Placeholder for sections without DB support
 *
 * Displays a locked/disabled section with clear indication that:
 * - The feature exists in the design
 * - It's not yet implemented in the database
 * - It's on the roadmap with a priority level
 *
 * This follows the "Disabled over Mocked" principle - we show
 * that something is missing rather than faking it with mock data.
 */
export function DisabledSection({
  title,
  reason,
  priority = 'P2',
  icon: Icon = LockClosedIcon,
  className = '',
}: DisabledSectionProps) {
  const priorityColors: Record<string, string> = {
    P1: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    P2: 'text-orange-600 bg-orange-50 border-orange-200',
    P3: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  const priorityLabels: Record<string, string> = {
    P1: 'Nästa sprint',
    P2: 'Roadmap',
    P3: 'Framtida',
  };

  return (
    <section
      className={`rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 opacity-60 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-muted-foreground">
              {title}
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${priorityColors[priority]}`}
            >
              <LockClosedIcon className="h-3 w-3" />
              {priority} - {priorityLabels[priority]}
            </span>
          </div>
          
          <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
            <InformationCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{reason}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
