'use client'

/**
 * Cookie Admin Tabs Component
 * Client-side tab navigation for cookie management sections
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { 
  TableCellsIcon, 
  DocumentTextIcon, 
  ChartBarIcon, 
  ClipboardDocumentListIcon 
} from '@heroicons/react/24/outline'
import { CookieCatalogTab } from './CookieCatalogTab'
import { ConsentPolicyTab } from './ConsentPolicyTab'
import { ConsentStatisticsTab } from './ConsentStatisticsTab'
import { ConsentAuditTab } from './ConsentAuditTab'

// ============================================================================
// Types
// ============================================================================

type TabId = 'catalog' | 'policy' | 'statistics' | 'audit'

interface TabConfig {
  id: TabId
  icon: React.ComponentType<{ className?: string }>
}

// ============================================================================
// Tab Configuration
// ============================================================================

const TABS: TabConfig[] = [
  { id: 'catalog', icon: TableCellsIcon },
  { id: 'policy', icon: DocumentTextIcon },
  { id: 'statistics', icon: ChartBarIcon },
  { id: 'audit', icon: ClipboardDocumentListIcon },
]

// ============================================================================
// Component
// ============================================================================

export function CookieAdminTabs() {
  const t = useTranslations('admin.cookies')
  const [activeTab, setActiveTab] = useState<TabId>('catalog')

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium
                  transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span className="hidden sm:inline">{t(`tabs.${tab.id}`)}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'catalog' && <CookieCatalogTab />}
        {activeTab === 'policy' && <ConsentPolicyTab />}
        {activeTab === 'statistics' && <ConsentStatisticsTab />}
        {activeTab === 'audit' && <ConsentAuditTab />}
      </div>
    </div>
  )
}
