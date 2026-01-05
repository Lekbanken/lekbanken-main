'use client'

import type { JourneyIdentityProps } from '@/types/journey'
import { cn } from '@/lib/utils'

/**
 * JourneyIdentity
 * 
 * Displays the user's avatar, level badge, and faction indicator.
 * This is the "hero" element at the top of the Journey Overview.
 */
export function JourneyIdentity({ 
  journey, 
  theme,
  size = 'lg',
}: JourneyIdentityProps) {
  const sizeClasses = {
    sm: { avatar: 'w-16 h-16', level: 'text-sm', name: 'text-base' },
    md: { avatar: 'w-24 h-24', level: 'text-base', name: 'text-lg' },
    lg: { avatar: 'w-32 h-32', level: 'text-lg', name: 'text-xl' },
  }
  
  const sizes = sizeClasses[size]

  return (
    <div className="flex flex-col items-center text-center">
      {/* Avatar with frame */}
      <div className="relative">
        {/* Glow ring behind avatar */}
        <div 
          className={cn(
            'absolute inset-0 rounded-full blur-xl opacity-40',
            sizes.avatar
          )}
          style={{ backgroundColor: theme.accentColor }}
        />
        
        {/* Avatar container */}
        <div 
          className={cn(
            'relative rounded-full border-4 overflow-hidden',
            'bg-gradient-to-br from-white/10 to-white/5',
            sizes.avatar
          )}
          style={{ borderColor: theme.accentColor }}
        >
          {journey.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={journey.avatarUrl} 
              alt={journey.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            // Placeholder avatar
            <div className="w-full h-full flex items-center justify-center text-white/60">
              <svg 
                className="w-1/2 h-1/2" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          )}
        </div>
        
        {/* Level badge */}
        <div 
          className={cn(
            'absolute -bottom-2 left-1/2 -translate-x-1/2',
            'px-3 py-1 rounded-full font-bold text-white',
            'shadow-lg',
            sizes.level
          )}
          style={{ 
            backgroundColor: theme.accentColor,
            boxShadow: `0 4px 14px ${theme.glowColor}`,
          }}
        >
          Lvl {journey.level}
        </div>
      </div>
      
      {/* Name */}
      <h2 className={cn('mt-6 font-semibold text-white', sizes.name)}>
        {journey.displayName}
      </h2>
      
      {/* Faction badge (if selected) */}
      {theme.id && (
        <div 
          className="mt-2 px-3 py-1 rounded-full text-sm font-medium"
          style={{ 
            backgroundColor: theme.accentColorMuted,
            color: theme.accentColor,
          }}
        >
          {theme.name}
        </div>
      )}
    </div>
  )
}

export default JourneyIdentity
