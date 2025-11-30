'use client'

import { useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: string | number
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md'
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, variant = 'default', size = 'md', className }: TabsProps) {
  const baseClasses = 'inline-flex items-center gap-2 font-medium transition-colors focus:outline-none'
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
  }

  const variantClasses = {
    default: {
      container: 'flex gap-1 rounded-lg bg-muted p-1',
      tab: 'rounded-md',
      active: 'bg-card text-foreground shadow-sm',
      inactive: 'text-muted-foreground hover:text-foreground',
    },
    pills: {
      container: 'flex gap-2',
      tab: 'rounded-full',
      active: 'bg-primary text-white',
      inactive: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    },
    underline: {
      container: 'flex gap-6 border-b border-border',
      tab: '-mb-px border-b-2',
      active: 'border-primary text-foreground',
      inactive: 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground',
    },
  }

  const styles = variantClasses[variant]

  return (
    <div className={cn(styles.container, className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              baseClasses,
              sizeClasses[size],
              styles.tab,
              isActive ? styles.active : styles.inactive,
              tab.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={cn(
                'ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                isActive 
                  ? variant === 'pills' ? 'bg-white/20' : 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Tab panel wrapper
interface TabPanelProps {
  id: string
  activeTab: string
  children: ReactNode
  className?: string
}

export function TabPanel({ id, activeTab, children, className }: TabPanelProps) {
  if (id !== activeTab) return null

  return (
    <div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      className={className}
    >
      {children}
    </div>
  )
}

// Convenience hook for managing tab state
export function useTabs(defaultTab: string) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return { activeTab, setActiveTab }
}
