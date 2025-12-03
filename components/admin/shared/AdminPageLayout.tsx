'use client';

import type { ReactNode } from 'react';

interface AdminPageLayoutProps {
  /** Page content */
  children: ReactNode;
  /** Maximum width constraint */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
  /** Additional className for customization */
  className?: string;
}

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

/**
 * Shared layout wrapper for Admin pages.
 * Provides consistent max-width, padding, and responsive behavior.
 * 
 * @example
 * <AdminPageLayout maxWidth="6xl">
 *   <AdminPageHeader ... />
 *   <AdminStatGrid>...</AdminStatGrid>
 *   <AdminSection title="Users">...</AdminSection>
 * </AdminPageLayout>
 */
export function AdminPageLayout({
  children,
  maxWidth = '7xl',
  className = '',
}: AdminPageLayoutProps) {
  return (
    <div className={`mx-auto w-full px-4 py-6 lg:px-8 lg:py-8 ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}

interface AdminSectionProps {
  /** Section content */
  children: ReactNode;
  /** Optional section title */
  title?: string;
  /** Optional section description */
  description?: string;
  /** Actions to display in the section header */
  actions?: ReactNode;
  /** Spacing from previous section */
  spacing?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

const spacingClasses = {
  sm: 'mt-4',
  md: 'mt-6',
  lg: 'mt-8',
};

/**
 * Section wrapper for grouping content within an admin page.
 * Provides consistent spacing and optional header.
 * 
 * @example
 * <AdminSection 
 *   title="Senaste aktivitet" 
 *   description="Visa de senaste händelserna i systemet"
 *   actions={<Button size="sm">Exportera</Button>}
 * >
 *   <ActivityList items={activities} />
 * </AdminSection>
 */
export function AdminSection({
  children,
  title,
  description,
  actions,
  spacing = 'lg',
  className = '',
}: AdminSectionProps) {
  return (
    <section className={`${spacingClasses[spacing]} ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 mt-2 sm:mt-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

interface AdminGridProps {
  /** Grid content */
  children: ReactNode;
  /** Number of columns at different breakpoints */
  cols?: {
    default?: 1 | 2 | 3 | 4;
    sm?: 1 | 2 | 3 | 4;
    md?: 1 | 2 | 3 | 4;
    lg?: 1 | 2 | 3 | 4 | 5 | 6;
    xl?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  /** Gap size */
  gap?: 2 | 3 | 4 | 5 | 6;
  /** Additional className */
  className?: string;
}

/**
 * Responsive grid layout for admin cards and stats.
 */
export function AdminGrid({
  children,
  cols = { default: 1, sm: 2, lg: 4 },
  gap = 4,
  className = '',
}: AdminGridProps) {
  const gapClasses: Record<Required<AdminGridProps>['gap'], string> = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
  };

  const colClasses = [
    cols.default ? `grid-cols-${cols.default}` : '',
    cols.sm ? `sm:grid-cols-${cols.sm}` : '',
    cols.md ? `md:grid-cols-${cols.md}` : '',
    cols.lg ? `lg:grid-cols-${cols.lg}` : '',
    cols.xl ? `xl:grid-cols-${cols.xl}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`grid ${gapClasses[gap]} ${colClasses} ${className}`}>
      {children}
    </div>
  );
}
