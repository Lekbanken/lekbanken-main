'use client'

import type { JourneyProgressProps } from '@/types/journey'
import { cn } from '@/lib/utils'
import { getLevelProgress } from '@/lib/factions'

/**
 * JourneyProgress
 * 
 * Displays XP progress bar and next milestone information.
 * The bar uses the faction accent color.
 */
export function JourneyProgress({ 
  level,
  currentXP, 
  xpToNextLevel, 
  theme,
  nextMilestone,
  animated = true,
}: JourneyProgressProps) {
  const progress = getLevelProgress(currentXP, xpToNextLevel)

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* XP Label */}
      <div className="flex justify-between items-baseline mb-2 text-sm">
        <span className="text-white/70">Erfarenhet</span>
        <span className="text-white font-medium">
          {currentXP.toLocaleString('sv-SE')} / {xpToNextLevel.toLocaleString('sv-SE')} XP
        </span>
      </div>
      
      {/* Progress bar container */}
      <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
        {/* Animated progress fill */}
        <div 
          className={cn(
            'h-full rounded-full',
            animated && 'transition-all duration-700 ease-out'
          )}
          style={{ 
            width: `${progress}%`,
            backgroundColor: theme.accentColor,
            boxShadow: `0 0 20px ${theme.glowColor}`,
          }}
        />
        
        {/* Shimmer effect (subtle) */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            animation: animated ? 'shimmer 2s infinite' : 'none',
          }}
        />
      </div>
      
      {/* Level indicator */}
      <div className="flex justify-between items-center mt-2 text-xs text-white/50">
        <span>Level {level}</span>
        <span>Level {level + 1}</span>
      </div>
      
      {/* Next milestone preview */}
      {nextMilestone && (
        <div 
          className="mt-4 p-3 rounded-lg"
          style={{ backgroundColor: theme.accentColorMuted }}
        >
          <div className="flex items-center gap-3">
            {/* Milestone icon */}
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: theme.accentColor }}
            >
              {nextMilestone.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={nextMilestone.iconUrl} 
                  alt="" 
                  className="w-6 h-6"
                />
              ) : (
                <MilestoneIcon type={nextMilestone.type} />
              )}
            </div>
            
            {/* Milestone info */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {nextMilestone.label}
              </p>
              <p className="text-white/60 text-xs">
                {nextMilestone.progress}% klart
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Inline shimmer keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

// Icon component for milestone types
function MilestoneIcon({ type }: { type: string }) {
  const iconClass = "w-5 h-5 text-white"
  
  switch (type) {
    case 'level':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/>
        </svg>
      )
    case 'badge':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )
    case 'reward':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
        </svg>
      )
    case 'streak':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
        </svg>
      )
    default:
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      )
  }
}

export default JourneyProgress
