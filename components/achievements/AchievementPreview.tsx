'use client'

import { useMemo } from 'react'
import { LayerBase } from './LayerBase'
import { LayerBackDecoration } from './LayerBackDecoration'
import { LayerFrontDecoration } from './LayerFrontDecoration'
import { LayerSymbol } from './LayerSymbol'
import { THEME_PRESETS } from './themes'
import type { AchievementState } from '@/types/achievements-builder'
import { cn } from '@/lib/utils'

interface AchievementPreviewProps {
  state: AchievementState
  size?: 'sm' | 'md' | 'lg'
  showBackground?: boolean
}

const sizeClasses = {
  sm: 'h-24 w-24',
  md: 'h-48 w-48',
  lg: 'h-64 w-64',
}

export function AchievementPreview({ state, size = 'md', showBackground = true }: AchievementPreviewProps) {
  const theme = useMemo(
    () => THEME_PRESETS.find((t) => t.id === state.theme) ?? THEME_PRESETS[0],
    [state.theme]
  )

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-2xl transition-all duration-300',
        sizeClasses[size],
        showBackground && 'bg-gradient-to-br from-muted/50 to-muted shadow-inner'
      )}
      style={{
        background: showBackground
          ? `radial-gradient(circle at 30% 30%, ${theme.colors.background}, ${theme.colors.background}88)`
          : undefined,
      }}
    >
      {/* Ambient glow behind badge */}
      <div
        className="absolute inset-0 opacity-30 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${theme.colors.primary}60, transparent 70%)`,
        }}
      />

      {/* Layers */}
      <LayerBackDecoration items={state.backDecorations} theme={theme} />
      <LayerBase base={state.base} theme={theme} />
      <LayerSymbol symbol={state.symbol} theme={theme} />
      <LayerFrontDecoration items={state.frontDecorations} theme={theme} />
    </div>
  )
}
