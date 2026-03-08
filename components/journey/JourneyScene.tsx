'use client'

import { useEffect, useRef } from 'react'
import type { JourneySceneProps } from '@/types/journey'
import type { CssBackgroundConfig } from '@/features/journey/cosmetic-types'
import { getThemeCSSVariables } from '@/lib/factions'
import { SceneBackgroundEffect, SceneBackgroundEffectStyles } from './SceneBackgroundEffect'
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
  backgroundChildren,
  contentClassName,
  showPattern = false,
  backgroundConfig,
}: JourneySceneProps & {
  /** v2.0 loadout config — when present, adds CSS class to scene */
  backgroundConfig?: CssBackgroundConfig | null;
}) {
  const cssVars = getThemeCSSVariables(theme)
  const sceneRef = useRef<HTMLDivElement | null>(null)
  const backgroundViewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const scene = sceneRef.current
    const backgroundViewport = backgroundViewportRef.current
    if (!scene || !backgroundViewport) return

    let rafId = 0

    const updateBackgroundPosition = () => {
      const sceneRect = scene.getBoundingClientRect()
      const sceneHeight = scene.offsetHeight
      const viewportHeight = window.innerHeight
      const maxOffset = Math.max(sceneHeight - viewportHeight, 0)
      const scrolledWithinScene = Math.min(Math.max(-sceneRect.top, 0), maxOffset)

      backgroundViewport.style.width = `${sceneRect.width}px`

      if (sceneRect.top > 0) {
        backgroundViewport.style.position = 'absolute'
        backgroundViewport.style.left = '0px'
        backgroundViewport.style.top = '0px'
      } else if (scrolledWithinScene < maxOffset) {
        backgroundViewport.style.position = 'fixed'
        backgroundViewport.style.left = `${sceneRect.left}px`
        backgroundViewport.style.top = '0px'
      } else {
        backgroundViewport.style.position = 'absolute'
        backgroundViewport.style.left = '0px'
        backgroundViewport.style.top = `${maxOffset}px`
      }
    }

    const requestUpdate = () => {
      cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(updateBackgroundPosition)
    }

    requestUpdate()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [])

  return (
    <div
      ref={sceneRef}
      className={cn(
        'relative isolate min-h-[500px] w-full overflow-clip',
        'bg-gradient-to-b from-[var(--journey-gradient-from)] to-[var(--journey-gradient-to)]',
        className
      )}
      style={cssVars as React.CSSProperties}
    >
      {/* Full-height scene pattern stays attached to the scene itself */}
      {showPattern && theme.pattern && (
        <div 
          className="absolute inset-0 rounded-[inherit] opacity-5 pointer-events-none"
          style={{ 
            backgroundImage: `url(${theme.pattern})`,
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      {/* Viewport-bound scene background/effects layer */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
        <div
          ref={backgroundViewportRef}
          className="top-0 h-[100vh] overflow-hidden rounded-[inherit]"
        >
          <div className="relative h-full w-full">
            <SceneBackgroundEffect className={backgroundConfig?.className} accentColor={theme.accentColor} />
            {backgroundChildren}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className={cn('relative z-10', contentClassName)}>
        {children}
      </div>
      <SceneBackgroundEffectStyles />
    </div>
  )
}

export default JourneyScene
