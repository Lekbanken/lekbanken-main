'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Link href - if undefined, renders as current page (no link) */
  href?: string;
  /** Optional icon */
  icon?: React.ReactNode;
}

interface AdminBreadcrumbsProps {
  /** Array of breadcrumb items */
  items: BreadcrumbItem[];
  /** Show home icon for first item */
  showHomeIcon?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Breadcrumb navigation for admin pages.
 * Provides clear hierarchy and navigation context.
 * 
 * @example
 * <AdminBreadcrumbs items={[
 *   { label: 'Admin', href: '/admin' },
 *   { label: 'Organisationer', href: '/admin/tenants' },
 *   { label: 'Acme Corp' }  // Current page, no href
 * ]} />
 */
export function AdminBreadcrumbs({
  items,
  showHomeIcon = true,
  className = '',
}: AdminBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 text-sm text-muted-foreground mb-4 ${className}`}
    >
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const showIcon = isFirst && showHomeIcon;

        return (
          <Fragment key={`${item.label}-${index}`}>
            {/* Separator */}
            {!isFirst && (
              <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
            )}

            {/* Breadcrumb item */}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                {showIcon && <HomeIcon className="h-4 w-4" />}
                {item.icon && !showIcon && item.icon}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span
                className={`flex items-center gap-1.5 ${isLast ? 'text-foreground font-medium' : ''}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {showIcon && <HomeIcon className="h-4 w-4" />}
                {item.icon && !showIcon && item.icon}
                <span>{item.label}</span>
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

/**
 * Helper to build breadcrumb items from pathname
 */
export function buildBreadcrumbsFromPath(
  pathname: string,
  labelMap?: Record<string, string>
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    const isLast = i === segments.length - 1;

    // Get label from map or capitalize segment
    const label = labelMap?.[segment] ?? 
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

    items.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return items;
}

/**
 * Common admin breadcrumb label mappings (Swedish)
 */
export const adminLabelMap: Record<string, string> = {
  admin: 'Admin',
  dashboard: 'Dashboard',
  tenants: 'Organisationer',
  organisations: 'Organisationer',
  users: 'Användare',
  products: 'Produkter',
  games: 'Spel',
  content: 'Innehåll',
  sessions: 'Sessioner',
  achievements: 'Achievements',
  leaderboards: 'Leaderboards',
  billing: 'Fakturering',
  moderation: 'Moderering',
  tickets: 'Ärenden',
  audit: 'Granskningslogg',
  'audit-logs': 'Granskningslogg',
  system: 'System',
  health: 'Hälsa',
  features: 'Feature Flags',
  notifications: 'Notifikationer',
  settings: 'Inställningar',
  analytics: 'Analys',
  support: 'Support',
  licenses: 'Licenser',
  media: 'Media',
  marketplace: 'Butik',
  personalization: 'Personalisering',
  leaderboard: 'Leaderboard',
};
