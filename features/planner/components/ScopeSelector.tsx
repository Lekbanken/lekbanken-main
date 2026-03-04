'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/lib/context/TenantContext';

// =============================================================================
// Types
// =============================================================================

export type PlanScope = 'mine' | 'org' | 'global';

interface ScopeSelectorProps {
  activeScope: PlanScope;
  onScopeChange: (scope: PlanScope) => void;
  className?: string;
}

// =============================================================================
// ScopeSelector
// =============================================================================

/**
 * Scope tab selector for plan list.
 *
 * - "Mina" — shows user's own plans
 * - "{Org}" — shows tenant-visible plans (MS5: enabled)
 * - "Global" — shows public plans (MS5: enabled)
 */
export function ScopeSelector({ activeScope, onScopeChange, className }: ScopeSelectorProps) {
  const t = useTranslations('planner.scopeTabs');
  const { currentTenant } = useTenant();

  const orgName = currentTenant?.name ?? t('org', { orgName: '' });

  const tabs: { scope: PlanScope; label: string; disabled: boolean }[] = [
    { scope: 'mine', label: t('mine'), disabled: false },
    { scope: 'org', label: t('org', { orgName }), disabled: !currentTenant },
    { scope: 'global', label: t('global'), disabled: false },
  ];

  return (
    <div className={cn('flex items-center gap-1 rounded-lg bg-muted/50 p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.scope}
          type="button"
          onClick={() => !tab.disabled && onScopeChange(tab.scope)}
          disabled={tab.disabled}
          className={cn(
            'relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            activeScope === tab.scope && !tab.disabled
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground',
            tab.disabled
              ? 'cursor-not-allowed opacity-60'
              : 'hover:text-foreground'
          )}
          aria-current={activeScope === tab.scope ? 'true' : undefined}
        >
          {tab.label}
          {tab.disabled && (
            <Badge
              variant="outline"
              className="ml-1 text-[10px] px-1.5 py-0 font-normal leading-4 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
            >
              {t('comingSoon')}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
