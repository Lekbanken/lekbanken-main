'use client'

import type { JourneyOverviewProps } from '@/types/journey'
import { JourneyScene } from './JourneyScene'
import { JourneyIdentity } from './JourneyIdentity'
import { JourneyProgress } from './JourneyProgress'
import { JourneyStats } from './JourneyStats'
import { JourneyActions } from './JourneyActions'

/**
 * JourneyOverview
 * 
 * The main "scene" component for the Journey (Resan) page.
 * Composes all sub-components into a cohesive, immersive view.
 * 
 * Design principles:
 * - Mobile-first layout
 * - Faction theming via CSS variables only
 * - Clear visual hierarchy: Identity → Progress → Stats → Actions
 */
export function JourneyOverview({ 
  journey, 
  theme,
  compact = false,
  reducedMotion = false,
}: JourneyOverviewProps) {
  // Compact mode is for Dashboard card (not implemented here)
  if (compact) {
    return (
      <JourneyCompactCard journey={journey} theme={theme} />
    )
  }

  return (
    <JourneyScene theme={theme} className="pb-8">
      {/* Top padding for safe area / notch */}
      <div className="pt-12 px-4">
        {/* Identity Section */}
        <JourneyIdentity 
          journey={journey} 
          theme={theme}
          size="lg"
        />
        
        {/* Progress Section */}
        <div className="mt-8">
          <JourneyProgress
            level={journey.level}
            currentXP={journey.currentXP}
            xpToNextLevel={journey.xpToNextLevel}
            theme={theme}
            nextMilestone={journey.nextMilestone}
            animated={!reducedMotion}
          />
        </div>
        
        {/* Stats Section */}
        <div className="mt-8">
          <JourneyStats
            coins={journey.totalCoins}
            badges={journey.badgeCount}
            streak={journey.currentStreak}
            theme={theme}
          />
        </div>
        
        {/* Actions Section */}
        <div className="mt-8">
          <JourneyActions theme={theme} />
        </div>
      </div>
    </JourneyScene>
  )
}

/**
 * Compact card variant for Dashboard
 */
function JourneyCompactCard({ 
  journey, 
  theme 
}: Pick<JourneyOverviewProps, 'journey' | 'theme'>) {
  const progress = Math.floor((journey.currentXP / journey.xpToNextLevel) * 100)
  
  return (
    <div 
      className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {/* Mini avatar */}
        <div 
          className="w-12 h-12 rounded-full border-2 overflow-hidden flex-shrink-0"
          style={{ borderColor: theme.accentColor }}
        >
          {journey.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={journey.avatarUrl} 
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: theme.accentColorMuted }}
            >
              <svg 
                className="w-6 h-6" 
                fill={theme.accentColor}
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span 
              className="px-2 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: theme.accentColor }}
            >
              Lvl {journey.level}
            </span>
            <span className="text-sm font-medium text-gray-900 truncate">
              {journey.displayName}
            </span>
          </div>
          
          {/* Mini progress bar */}
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${progress}%`,
                backgroundColor: theme.accentColor,
              }}
            />
          </div>
          
          <p className="mt-1 text-xs text-gray-500">
            {journey.currentXP.toLocaleString('sv-SE')} / {journey.xpToNextLevel.toLocaleString('sv-SE')} XP
          </p>
        </div>
        
        {/* Chevron */}
        <svg 
          className="w-5 h-5 text-gray-400 flex-shrink-0" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export default JourneyOverview
