'use client';

import type { ReactNode } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/20/solid';

interface AdminStatCardProps {
  /** Metric label/title */
  label: string;
  /** Main value to display */
  value: string | number;
  /** Optional change indicator (e.g., "+12%") */
  change?: string;
  /** Trend direction for styling */
  trend?: 'up' | 'down' | 'flat';
  /** Icon to display */
  icon?: ReactNode;
  /** Color theme for the icon background */
  iconColor?: 'primary' | 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'slate';
  /** Loading state */
  isLoading?: boolean;
  /** Optional subtitle or secondary info */
  subtitle?: string;
  /** Additional className */
  className?: string;
}

const iconColorClasses: Record<string, string> = {
  primary: 'from-primary/20 to-primary/5 text-primary ring-primary/10',
  blue: 'from-blue-500/20 to-blue-500/5 text-blue-600 ring-blue-500/10',
  green: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 ring-emerald-500/10',
  amber: 'from-amber-500/20 to-amber-500/5 text-amber-600 ring-amber-500/10',
  purple: 'from-purple-500/20 to-purple-500/5 text-purple-600 ring-purple-500/10',
  red: 'from-red-500/20 to-red-500/5 text-red-600 ring-red-500/10',
  slate: 'from-slate-500/20 to-slate-500/5 text-slate-600 ring-slate-500/10',
};

const trendConfig = {
  up: { 
    classes: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
    icon: ArrowTrendingUpIcon,
  },
  down: { 
    classes: 'text-red-600 bg-red-50 dark:bg-red-500/10',
    icon: ArrowTrendingDownIcon,
  },
  flat: { 
    classes: 'text-muted-foreground bg-muted',
    icon: MinusIcon,
  },
};

/**
 * Stat card component for displaying metrics with optional trend indicators.
 * 
 * @example
 * <AdminStatCard
 *   label="Aktiva användare"
 *   value={2847}
 *   change="+12%"
 *   trend="up"
 *   icon={<UsersIcon className="h-5 w-5" />}
 *   iconColor="blue"
 * />
 */
export function AdminStatCard({
  label,
  value,
  change,
  trend = 'flat',
  icon,
  iconColor = 'primary',
  isLoading = false,
  subtitle,
  className = '',
}: AdminStatCardProps) {
  if (isLoading) {
    return (
      <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-7 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  const TrendIcon = trendConfig[trend].icon;

  return (
    <div 
      className={`group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-border/80 hover:shadow-md ${className}`}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div 
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm ring-1 transition-transform duration-200 group-hover:scale-105 ${iconColorClasses[iconColor]}`}
            aria-hidden="true"
          >
            <div className="h-5 w-5">{icon}</div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
          <div className="mt-1 flex items-baseline gap-2.5 flex-wrap">
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {change && (
              <span 
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${trendConfig[trend].classes}`}
              >
                <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {change}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground/80">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface AdminStatGridProps {
  /** Stat cards to display */
  children: ReactNode;
  /** Number of columns */
  cols?: 2 | 3 | 4 | 5;
  /** Additional className */
  className?: string;
}

/**
 * Grid wrapper for stat cards with responsive columns.
 */
export function AdminStatGrid({
  children,
  cols = 4,
  className = '',
}: AdminStatGridProps) {
  const colClasses: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  return (
    <div className={`grid gap-4 lg:gap-5 ${colClasses[cols]} ${className}`}>
      {children}
    </div>
  );
}
