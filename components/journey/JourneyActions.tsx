'use client'

import type { JourneyActionsProps } from '@/types/journey'
import { cn } from '@/lib/utils'

/**
 * JourneyActions
 * 
 * Quick action buttons to navigate to Journey sub-pages.
 */
export function JourneyActions({ 
  theme,
  onNavigate,
}: JourneyActionsProps) {
  const actions = [
    {
      id: 'badges',
      label: 'Utmärkelser',
      href: '/resan/utmarkelser',
      icon: BadgeIcon,
    },
    {
      id: 'coins',
      label: 'Mynt',
      href: '/resan/mynt',
      icon: CoinIcon,
    },
    {
      id: 'shop',
      label: 'Butik',
      href: '/resan/butik',
      icon: ShopIcon,
    },
    {
      id: 'log',
      label: 'Logg',
      href: '/resan/logg',
      icon: LogIcon,
    },
  ]

  const handleClick = (href: string) => {
    if (onNavigate) {
      onNavigate(href)
    }
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleClick(action.href)}
          className={cn(
            'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl',
            'bg-white/5 backdrop-blur-sm',
            'transition-all duration-200',
            'hover:bg-white/10 hover:scale-105',
            'active:scale-95'
          )}
        >
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: theme.accentColorMuted }}
          >
            <action.icon 
              className="w-5 h-5" 
              style={{ color: theme.accentColor }}
            />
          </div>
          <span className="text-white/80 text-xs font-medium">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  )
}

// Action icons
function BadgeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  )
}

function CoinIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  )
}

function ShopIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"/>
    </svg>
  )
}

function LogIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
    </svg>
  )
}

export default JourneyActions
