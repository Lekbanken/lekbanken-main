'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// PlannerPageLayout - Main wrapper with AppShell integration
// =============================================================================

interface PlannerPageLayoutProps {
  children: ReactNode;
  /** Maximum width constraint */
  maxWidth?: 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
  /** Additional className */
  className?: string;
}

const maxWidthClasses: Record<string, string> = {
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

/**
 * Shared layout wrapper for Planner pages.
 * Provides consistent max-width, padding, and responsive behavior.
 * Mirrors AdminPageLayout for consistency.
 * 
 * @example
 * <PlannerPageLayout maxWidth="7xl">
 *   <PlannerPageHeader title="Mina planer" />
 *   <PlannerTabs ... />
 *   <PlanListPanel ... />
 * </PlannerPageLayout>
 */
export function PlannerPageLayout({
  children,
  maxWidth = '7xl',
  className,
}: PlannerPageLayoutProps) {
  return (
    <div className={cn(
      'mx-auto w-full px-4 py-4 lg:px-8 lg:py-6',
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
}

// =============================================================================
// PlannerPageHeader - Consistent header with breadcrumbs
// =============================================================================

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PlannerPageHeaderProps {
  /** Page title */
  title: string;
  /** Optional eyebrow text above title */
  eyebrow?: string;
  /** Breadcrumb trail */
  breadcrumbs?: BreadcrumbItem[];
  /** Right-side actions slot */
  actions?: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Consistent page header for Planner pages.
 * Includes optional breadcrumbs and action buttons.
 * 
 * @example
 * <PlannerPageHeader 
 *   title="Mina planer" 
 *   eyebrow="Planera"
 *   actions={<Button>+ Ny plan</Button>}
 * />
 */
export function PlannerPageHeader({
  title,
  eyebrow,
  breadcrumbs,
  actions,
  className,
}: PlannerPageHeaderProps) {
  return (
    <header className={cn(
      'flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-6',
      className
    )}>
      <div className="min-w-0 flex-1">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-1 flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.label} className="flex items-center gap-1">
                {index > 0 && <span className="text-muted-foreground/50">/</span>}
                {crumb.href ? (
                  <a 
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        
        {/* Eyebrow */}
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        
        {/* Title */}
        <h1 className="truncate text-xl font-semibold text-foreground lg:text-2xl">
          {title}
        </h1>
      </div>

      {/* Actions */}
      {actions && (
        <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
          {actions}
        </div>
      )}
    </header>
  );
}

// =============================================================================
// PlannerSection - Content section wrapper
// =============================================================================

interface PlannerSectionProps {
  children: ReactNode;
  /** Optional section title */
  title?: string;
  /** Optional section description */
  description?: string;
  /** Actions in the section header */
  actions?: ReactNode;
  /** Spacing from previous section */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

const spacingClasses = {
  none: '',
  sm: 'mt-4',
  md: 'mt-6',
  lg: 'mt-8',
};

/**
 * Section wrapper for grouping content within a planner page.
 * 
 * @example
 * <PlannerSection title="Dina planer" actions={<FilterDropdown />}>
 *   <PlanList plans={plans} />
 * </PlannerSection>
 */
export function PlannerSection({
  children,
  title,
  description,
  actions,
  spacing = 'md',
  className,
}: PlannerSectionProps) {
  return (
    <section className={cn(spacingClasses[spacing], className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// =============================================================================
// PlannerCard - Consistent card styling
// =============================================================================

interface PlannerCardProps {
  children: ReactNode;
  /** Card padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Hover effect */
  hoverable?: boolean;
  /** Click handler (makes card interactive) */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * Consistent card styling for Planner UI.
 * Matches the catalyst-ui-kit Card component.
 * 
 * @example
 * <PlannerCard hoverable onClick={() => handleSelect(plan.id)}>
 *   <PlanCardContent plan={plan} />
 * </PlannerCard>
 */
export function PlannerCard({
  children,
  padding = 'md',
  hoverable = false,
  onClick,
  className,
}: PlannerCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border border-border bg-card text-left',
        paddingClasses[padding],
        hoverable && 'transition-all hover:border-primary/30 hover:shadow-md',
        onClick && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20',
        className
      )}
    >
      {children}
    </Component>
  );
}

// =============================================================================
// PlannerEmptyState - Empty state display
// =============================================================================

interface PlannerEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Empty state display for Planner pages.
 * 
 * @example
 * <PlannerEmptyState
 *   icon={<ClipboardIcon className="h-12 w-12" />}
 *   title="Inga planer ännu"
 *   description="Skapa din första plan för att komma igång"
 *   action={<Button>Skapa plan</Button>}
 * />
 */
export function PlannerEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: PlannerEmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 text-center',
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground/50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
