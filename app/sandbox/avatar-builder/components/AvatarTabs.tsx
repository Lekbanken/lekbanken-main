'use client'

import { cn } from '@/lib/utils'
import type { AvatarCategory } from '../types'
import { AVATAR_CATEGORIES } from '../types'

// Icon components for each category
const CategoryIcons: Record<AvatarCategory, React.FC<{ className?: string }>> = {
  body: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    </svg>
  ),
  face: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d="M8 15c1.5 2 4.5 2 6 0" strokeLinecap="round" />
    </svg>
  ),
  hair: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C8 2 4 5 4 10c0 2 1 4 2 5h12c1-1 2-3 2-5 0-5-4-8-8-8z" />
      <path d="M8 15v5M12 15v6M16 15v5" strokeLinecap="round" />
    </svg>
  ),
  accessories: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="9" r="4" />
      <circle cx="16" cy="9" r="4" />
      <line x1="12" y1="9" x2="12" y2="9" />
      <path d="M4 9h-2M22 9h-2" strokeLinecap="round" />
    </svg>
  ),
  outfit: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16l-2 5H6L4 4z" />
      <path d="M6 9v11h12V9" />
      <path d="M9 9v4M15 9v4" strokeLinecap="round" />
    </svg>
  ),
}

// Labels for accessibility
const CategoryLabels: Record<AvatarCategory, string> = {
  body: 'Body Shape',
  face: 'Face Expression',
  hair: 'Hairstyle',
  accessories: 'Accessories',
  outfit: 'Outfit',
}

interface AvatarTabsProps {
  activeTab: AvatarCategory
  onTabChange: (tab: AvatarCategory) => void
  className?: string
}

/**
 * AvatarTabs
 * 
 * Icon-only tabs for switching between avatar categories.
 * Uses mobile-friendly touch targets.
 */
export function AvatarTabs({
  activeTab,
  onTabChange,
  className = '',
}: AvatarTabsProps) {
  return (
    <div className={cn(
      'flex justify-around items-center bg-gray-100/80 rounded-xl p-1',
      className
    )}>
      {AVATAR_CATEGORIES.map((category) => {
        const Icon = CategoryIcons[category]
        const isActive = activeTab === category

        return (
          <button
            key={category}
            onClick={() => onTabChange(category)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              isActive
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            )}
            aria-label={CategoryLabels[category]}
            aria-selected={isActive}
            role="tab"
          >
            <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
            <span className={cn(
              'text-[10px] font-medium capitalize',
              isActive ? 'text-primary' : 'text-gray-400'
            )}>
              {category}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default AvatarTabs
