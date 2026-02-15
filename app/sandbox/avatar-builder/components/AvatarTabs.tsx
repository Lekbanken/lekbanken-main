'use client'

import { cn } from '@/lib/utils'
import type { AvatarCategory } from '../types'
import { AVATAR_CATEGORIES, CATEGORY_META } from '../types'

// SVG icons for each category
const CategoryIcons: Record<AvatarCategory, React.FC<{ className?: string }>> = {
  face: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  eyes: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  nose: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 4v10M8 18c0-2 2-4 4-4s4 2 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  mouth: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 14c2 4 10 4 12 0" strokeLinecap="round" />
    </svg>
  ),
  hair: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2C8 2 4 5 4 10c0 2 1 4 2 5h12c1-1 2-3 2-5 0-5-4-8-8-8Z" />
      <path d="M8 15v5M12 15v6M16 15v5" strokeLinecap="round" />
    </svg>
  ),
  glasses: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="12" r="4" />
      <circle cx="17" cy="12" r="4" />
      <path d="M11 12h2" />
      <path d="M3 12h0M21 12h0" strokeLinecap="round" />
    </svg>
  ),
}

interface AvatarTabsProps {
  activeTab: AvatarCategory
  onTabChange: (tab: AvatarCategory) => void
  className?: string
}

/**
 * AvatarTabs v2
 *
 * Category tabs with icon + label using Lekbanken design tokens.
 */
export function AvatarTabs({
  activeTab,
  onTabChange,
  className = '',
}: AvatarTabsProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-1 rounded-xl bg-muted p-1',
        className
      )}
      role="tablist"
    >
      {AVATAR_CATEGORIES.map((category) => {
        const Icon = CategoryIcons[category]
        const meta = CATEGORY_META[category]
        const isActive = activeTab === category

        return (
          <button
            key={category}
            onClick={() => onTabChange(category)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 px-1 transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              isActive
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            )}
            aria-label={meta.label}
            aria-selected={isActive}
            role="tab"
          >
            <Icon className="w-5 h-5" />
            <span
              className={cn(
                'text-[10px] font-medium leading-none',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {meta.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default AvatarTabs
