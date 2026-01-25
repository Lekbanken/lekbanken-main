'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/20/solid';

interface AdminPageHeaderProps {
  /** Main title of the page */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Optional icon to display next to the title */
  icon?: ReactNode;
  /** Primary action button(s) - displayed on the right */
  actions?: ReactNode;
  /** Breadcrumb trail */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Optional contextual help tooltip */
  helpText?: string;
  /** Additional className for customization */
  className?: string;
}

/**
 * Shared page header component for Admin pages.
 * Provides consistent styling for title, description, icon, and action buttons.
 * 
 * @example
 * <AdminPageHeader
 *   title="Användare"
 *   description="Hantera användare och deras behörigheter"
 *   icon={<UsersIcon className="h-6 w-6" />}
 *   breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Användare' }]}
 *   actions={<Button>Bjud in användare</Button>}
 * />
 */
export function AdminPageHeader({
  title,
  description,
  icon,
  actions,
  breadcrumbs,
  helpText,
  className = '',
}: AdminPageHeaderProps) {
  const t = useTranslations('admin.pageHeader');
  return (
    <header className={`mb-8 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label={t('breadcrumbsLabel')} className="mb-4">
          <ol className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center">
                {index > 0 && (
                  <ChevronRightIcon 
                    className="mx-1 h-4 w-4 flex-shrink-0 text-muted-foreground/60" 
                    aria-hidden="true" 
                  />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span 
                    className={index === breadcrumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}
                    aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Main header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Title section */}
        <div className="flex items-start gap-4">
          {/* Icon container */}
          {icon && (
            <div 
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10"
              aria-hidden="true"
            >
              <div className="h-6 w-6">{icon}</div>
            </div>
          )}

          {/* Title and description */}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-[1.75rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 text-sm text-muted-foreground lg:text-[0.9375rem] leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
            {helpText && (
              <p className="mt-2 text-xs text-muted-foreground/80 flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {helpText}
              </p>
            )}
          </div>
        </div>

        {/* Actions - always top-right for discoverability */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:ml-4">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
