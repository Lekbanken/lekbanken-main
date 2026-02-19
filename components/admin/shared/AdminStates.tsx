'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Select } from '@/components/ui/select';

interface AdminErrorStateProps {
  /** Error title */
  title?: string;
  /** Error description */
  description?: string;
  /** Retry action */
  onRetry?: () => void;
  /** Custom icon */
  icon?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Error state component for admin pages.
 * Displays a friendly error message with optional retry action.
 * 
 * @example
 * <AdminErrorState
 *   title="Kunde inte ladda data"
 *   description="Något gick fel vid hämtning av användare."
 *   onRetry={() => refetch()}
 * />
 */
export function AdminErrorState({
  title,
  description,
  onRetry,
  icon,
  className = '',
}: AdminErrorStateProps) {
  const t = useTranslations('admin.states.errorState');
  const displayTitle = title || t('defaultTitle');
  const displayDescription = description || t('defaultDescription');
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        {icon || <ExclamationTriangleIcon className="h-7 w-7" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{displayTitle}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{displayDescription}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {t('retryButton')}
        </button>
      )}
    </div>
  );
}

interface AdminEmptyStateProps {
  /** Empty state title */
  title: string;
  /** Empty state description */
  description?: string;
  /** Custom icon */
  icon?: ReactNode;
  /** Primary action */
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional className */
  className?: string;
}

/**
 * Empty state component for admin pages.
 * Used when a list or table has no items.
 * 
 * @example
 * <AdminEmptyState
 *   icon={<UsersIcon className="h-8 w-8" />}
 *   title="Inga användare"
 *   description="Det finns inga användare att visa. Bjud in användare för att komma igång."
 *   action={{
 *     label: "Bjud in användare",
 *     onClick: () => openInviteModal(),
 *     icon: <PlusIcon className="h-4 w-4" />
 *   }}
 * />
 */
export function AdminEmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className = '',
}: AdminEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <div className="h-7 w-7">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {action.icon}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface AdminFilterSelectProps {
  /** Label for the select */
  label: string;
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Options to display */
  options: Array<{ value: string; label: string }>;
  /** Placeholder option */
  placeholder?: string;
  /** Additional className */
  className?: string;
}

/**
 * Filter select component for admin toolbars.
 * Consistent styling for dropdown filters.
 * 
 * @example
 * <AdminFilterSelect
 *   label="Status"
 *   value={statusFilter}
 *   onChange={setStatusFilter}
 *   options={[
 *     { value: 'active', label: 'Aktiv' },
 *     { value: 'inactive', label: 'Inaktiv' },
 *   ]}
 *   placeholder="Alla statusar"
 * />
 */
export function AdminFilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Alla',
  className = '',
}: AdminFilterSelectProps) {
  return (
    <div className={className}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        options={[
          { value: '', label: placeholder },
          ...options,
        ]}
      />
    </div>
  );
}

interface AdminCardProps {
  /** Card content */
  children: ReactNode;
  /** Optional title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Optional icon for title */
  icon?: ReactNode;
  /** Actions to display in header */
  actions?: ReactNode;
  /** Remove default padding */
  noPadding?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Card component for admin sections.
 * Provides consistent card styling with optional header.
 * 
 * @example
 * <AdminCard
 *   title="Senaste aktivitet"
 *   icon={<ClockIcon className="h-5 w-5" />}
 *   actions={<Button size="sm">Visa alla</Button>}
 * >
 *   <ActivityList items={activities} />
 * </AdminCard>
 */
export function AdminCard({
  children,
  title,
  description,
  icon,
  actions,
  noPadding = false,
  className = '',
}: AdminCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <div className="h-4 w-4">{icon}</div>
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
              )}
              {description && (
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}
