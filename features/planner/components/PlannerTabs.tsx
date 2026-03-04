'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ClipboardDocumentListIcon, PencilSquareIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

// =============================================================================
// Tab Configuration
// =============================================================================

interface TabConfig {
  id: string;
  labelKey: string;
  mobileLabelKey: string;
  href: string;
  icon: ReactNode;
  /** Pattern to match for active state */
  matchPattern?: RegExp;
}

const PLANNER_TABS: TabConfig[] = [
  {
    id: 'plans',
    labelKey: 'wizard.tabs.plans',
    mobileLabelKey: 'wizard.tabs.mobilePlans',
    href: '/app/planner/plans',
    icon: <ClipboardDocumentListIcon className="h-4 w-4" />,
    matchPattern: /^\/app\/planner\/plans/,
  },
  {
    id: 'edit',
    labelKey: 'wizard.tabs.edit',
    mobileLabelKey: 'wizard.tabs.edit',
    href: '/app/planner/plan',
    icon: <PencilSquareIcon className="h-4 w-4" />,
    matchPattern: /^\/app\/planner\/plan\//,
  },
  {
    id: 'calendar',
    labelKey: 'wizard.tabs.calendar',
    mobileLabelKey: 'wizard.tabs.calendar',
    href: '/app/planner/calendar',
    icon: <CalendarDaysIcon className="h-4 w-4" />,
    matchPattern: /^\/app\/planner\/calendar/,
  },
];

// =============================================================================
// Component
// =============================================================================

interface PlannerTabsProps {
  /** Explicit active tab override (avoids pathname matching) */
  activeTab?: 'plans' | 'edit' | 'calendar';
  /** Current plan ID for "Planera" tab link */
  planId?: string | null;
  /** Plan name to display in edit tab label */
  planName?: string;
  /** Variant style */
  variant?: 'default' | 'underline';
  className?: string;
}

export function PlannerTabs({ 
  activeTab: explicitActiveTab, 
  planId, 
  planName, 
  variant = 'underline',
  className 
}: PlannerTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('planner');

  // Determine which tab is active
  const getActiveTabId = (): string => {
    if (explicitActiveTab) return explicitActiveTab;
    
    for (const tab of PLANNER_TABS) {
      if (tab.matchPattern?.test(pathname)) {
        return tab.id;
      }
      if (pathname === tab.href) {
        return tab.id;
      }
    }
    return 'plans';
  };

  const activeTabId = getActiveTabId();

  // Build tab config for ui/tabs
  const tabs = PLANNER_TABS.map((tab) => {
    // "Planera" tab shows plan name when available
    let label = t(tab.labelKey);
    let mobileLabel = t(tab.mobileLabelKey);
    
    if (tab.id === 'edit' && planName) {
      const maxLen = 15;
      label = planName.length > maxLen ? planName.slice(0, maxLen) + '…' : planName;
      mobileLabel = label;
    }

    // "Planera" tab is disabled without a plan
    const isDisabled = tab.id === 'edit' && !planId;

    return {
      id: tab.id,
      label: (
        <span className="flex items-center gap-2">
          <span className="hidden sm:inline">{tab.icon}</span>
          <span className="sm:hidden">{mobileLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
      ) as unknown as string,
      disabled: isDisabled,
      title: isDisabled ? t('selectPlanFirst') : undefined,
    };
  });

  const handleTabChange = (tabId: string) => {
    const tab = PLANNER_TABS.find((t) => t.id === tabId);
    if (!tab) return;

    // For edit tab, use planId if available
    if (tabId === 'edit' && planId) {
      router.push(`/app/planner/plan/${planId}`);
    } else {
      router.push(tab.href);
    }
  };

  return (
    <nav className={cn('w-full', className)} aria-label="Planner navigation">
      <Tabs
        tabs={tabs}
        activeTab={activeTabId}
        onChange={handleTabChange}
        variant={variant}
        size="md"
        className="justify-start sm:justify-center"
      />
    </nav>
  );
}
