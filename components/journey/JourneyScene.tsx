'use client'

import type { JourneySceneProps } from '@/types/journey'
import { getThemeCSSVariables } from '@/lib/factions'
import { cn } from '@/lib/utils'

/**
 * JourneyScene
 * 
 * The base container for the Journey Overview.
 * Provides the dark, immersive background with faction-themed gradient.
 * 
 * Layer structure:
 * 1. Base gradient (faction-themed)
 * 2. Pattern overlay (optional, low opacity)
 * 3. Content (children)
 */
export function JourneyScene({ 
  theme, 
  children, 
  className,
  showPattern = false,
}: JourneySceneProps) {
  const cssVars = getThemeCSSVariables(theme)

  return (
    <div
      className={cn(
        'relative min-h-[500px] w-full overflow-hidden',
        'bg-gradient-to-b from-[var(--journey-gradient-from)] to-[var(--journey-gradient-to)]',
        className
      )}
      style={cssVars as React.CSSProperties}
    >
      {/* Faction pattern overlay (expansion feature) */}
      {showPattern && theme.pattern && (
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ 
            backgroundImage: `url(${theme.pattern})`,
            backgroundRepeat: 'repeat',
          }}
        />
      )}
      
      {/* Subtle radial glow at top */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-48 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center top, var(--journey-glow) 0%, transparent 70%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

export default JourneyScene
