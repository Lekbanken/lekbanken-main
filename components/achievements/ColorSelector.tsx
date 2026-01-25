'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { ColorConfig, ColorToken, ThemeId } from '@/types/achievements-builder'
import { tokenToHex } from './color-utils'
import { THEME_PRESETS } from './themes'

interface ColorSelectorProps {
  value: ColorConfig
  onChange: (value: ColorConfig) => void
  currentTheme: ThemeId
  label?: string
  compact?: boolean
}

const COLOR_TOKEN_KEYS: ColorToken[] = ['gold', 'silver', 'bronze', 'onyx', 'emerald', 'sapphire', 'ruby']

type ColorMode = 'token' | 'theme' | 'custom'

export function ColorSelector({ value, onChange, currentTheme, label, compact }: ColorSelectorProps) {
  const t = useTranslations('achievements')
  const [mode, setMode] = useState<ColorMode>(value.mode)
  const [customColor, setCustomColor] = useState(value.mode === 'custom' ? value.value : '#f59e0b')

  const theme = THEME_PRESETS.find((th) => th.id === currentTheme) ?? THEME_PRESETS[0]

  const handleModeChange = (newMode: ColorMode) => {
    setMode(newMode)
    if (newMode === 'token') {
      onChange({ mode: 'token', token: 'gold' })
    } else if (newMode === 'theme') {
      onChange({ mode: 'theme', from: 'primary' })
    } else {
      onChange({ mode: 'custom', value: customColor })
    }
  }

  const handleTokenSelect = (token: ColorToken) => {
    onChange({ mode: 'token', token })
  }

  const handleThemeColorSelect = (from: 'primary' | 'secondary' | 'accent') => {
    onChange({ mode: 'theme', from })
  }

  const handleCustomColorChange = (hex: string) => {
    setCustomColor(hex)
    onChange({ mode: 'custom', value: hex })
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
        <div className="flex flex-wrap gap-1">
          {COLOR_TOKEN_KEYS.slice(0, 4).map((token) => {
            const isActive = value.mode === 'token' && value.token === token
            const hex = tokenToHex(token)
            return (
              <button
                key={token}
                onClick={() => handleTokenSelect(token)}
                className={cn(
                  'h-6 w-6 rounded-full ring-1 transition-transform hover:scale-110',
                  isActive ? 'ring-primary ring-2' : 'ring-black/10'
                )}
                style={{ backgroundColor: hex }}
                title={t(`colorTokens.${token}`)}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      {/* Mode tabs */}
      <div className="flex rounded-lg border border-border bg-muted/30 p-1">
        {(['token', 'theme', 'custom'] as const).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              mode === m
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`colorModes.${m}`)}
          </button>
        ))}
      </div>

      {/* Token colors */}
      {mode === 'token' && (
        <div className="grid grid-cols-4 gap-2">
          {COLOR_TOKEN_KEYS.map((token) => {
            const isActive = value.mode === 'token' && value.token === token
            const hex = tokenToHex(token)
            const tokenLabel = t(`colorTokens.${token}`)
            return (
              <button
                key={token}
                onClick={() => handleTokenSelect(token)}
                className={cn(
                  'group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all',
                  'border hover:scale-105',
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                )}
                title={tokenLabel}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full shadow-sm ring-1 transition-transform',
                    isActive ? 'ring-primary ring-2' : 'ring-black/10 group-hover:scale-110'
                  )}
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[10px] text-muted-foreground">{tokenLabel}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Theme colors */}
      {mode === 'theme' && (
        <div className="grid grid-cols-3 gap-2">
          {(['primary', 'secondary', 'accent'] as const).map((from) => {
            const isActive = value.mode === 'theme' && value.from === from
            const hex = theme.colors[from]
            return (
              <button
                key={from}
                onClick={() => handleThemeColorSelect(from)}
                className={cn(
                  'group flex flex-col items-center gap-2 rounded-lg p-3 transition-all',
                  'border hover:scale-105',
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-full shadow-sm ring-1 transition-transform',
                    isActive ? 'ring-primary ring-2' : 'ring-black/10 group-hover:scale-110'
                  )}
                  style={{ backgroundColor: hex }}
                />
                <span className="text-xs text-muted-foreground">{t(`themeColors.${from}`)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Custom color */}
      {mode === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="h-12 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">{t('hexValue')}</label>
              <input
                type="text"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                placeholder="#f59e0b"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
