'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAchievementBuilderStore } from './store'
import type { BaseType, DecorationType, SymbolType, ColorConfig } from '@/types/achievements-builder'
import { tokenToHex } from './color-utils'
import { ColorSelector } from './ColorSelector'
import {
  CircleBase,
  ShieldBase,
  FlameSymbol,
  StarSymbol,
  ShieldSymbol,
  WingsSymbol,
  MedalSymbol,
  BoltSymbol,
  WingsDecoration,
  LaurelsDecoration,
  FlamesDecoration,
  RibbonDecoration,
  StarsDecoration,
  CrownDecoration,
} from './svg'

const decorationOptions: { type: DecorationType; labelKey: string; Icon: React.ComponentType<{ color: string; size: number }> }[] = [
  { type: 'wings', labelKey: 'decorationTypes.wings', Icon: WingsDecoration },
  { type: 'laurels', labelKey: 'decorationTypes.laurels', Icon: LaurelsDecoration },
  { type: 'flames', labelKey: 'decorationTypes.flames', Icon: FlamesDecoration },
  { type: 'ribbon', labelKey: 'decorationTypes.ribbon', Icon: RibbonDecoration },
  { type: 'stars', labelKey: 'decorationTypes.stars', Icon: StarsDecoration },
  { type: 'crown', labelKey: 'decorationTypes.crown', Icon: CrownDecoration },
]

export function BaseSelector() {
  const t = useTranslations('achievements')
  const base = useAchievementBuilderStore((s) => s.state.base)
  const setBase = useAchievementBuilderStore((s) => s.setBase)
  const currentTheme = useAchievementBuilderStore((s) => s.state.theme)

  const baseOptions: { type: BaseType; labelKey: string; Icon: React.ComponentType<{ color: string; size: number }> }[] = [
    { type: 'circle', labelKey: 'baseTypes.circle', Icon: CircleBase },
    { type: 'shield', labelKey: 'baseTypes.shield', Icon: ShieldBase },
  ]

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">{t('selectBaseShape')}</label>
        <div className="grid grid-cols-2 gap-3">
          {baseOptions.map(({ type, labelKey, Icon }) => {
            const isActive = base.type === type
            const color = base.color.mode === 'token' ? tokenToHex(base.color.token) : '#f59e0b'
            return (
              <button
                key={type}
                onClick={() => setBase({ ...base, type })}
                className={cn(
                  'group flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200',
                  'border-2 hover:shadow-md',
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                )}
              >
                <div className="transition-transform group-hover:scale-105">
                  <Icon color={color} size={48} />
                </div>
                <span className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {t(labelKey)}
                </span>
              </button>
            )
          })}
        </div>
      </div>


      <ColorSelector
        value={base.color}
        onChange={(color) => setBase({ ...base, color })}
        currentTheme={currentTheme}
        label={t('baseColor')}
      />
    </div>
  )
}

export function SymbolSelector() {
  const t = useTranslations('achievements')
  const symbol = useAchievementBuilderStore((s) => s.state.symbol)
  const setSymbol = useAchievementBuilderStore((s) => s.setSymbol)
  const currentTheme = useAchievementBuilderStore((s) => s.state.theme)

  const symbolOptions: { type: SymbolType; labelKey: string; Icon: React.ComponentType<{ color: string; size: number }> }[] = [
    { type: 'flame', labelKey: 'symbolTypes.flame', Icon: FlameSymbol },
    { type: 'star', labelKey: 'symbolTypes.star', Icon: StarSymbol },
    { type: 'shield', labelKey: 'symbolTypes.shield', Icon: ShieldSymbol },
    { type: 'wings', labelKey: 'symbolTypes.wings', Icon: WingsSymbol },
    { type: 'medal', labelKey: 'symbolTypes.medal', Icon: MedalSymbol },
    { type: 'bolt', labelKey: 'symbolTypes.bolt', Icon: BoltSymbol },
  ]

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">{t('selectSymbol')}</label>
        <div className="grid grid-cols-3 gap-2">
          {symbolOptions.map(({ type, labelKey, Icon }) => {
            const isActive = symbol.type === type
            const color = symbol.color.mode === 'token' ? tokenToHex(symbol.color.token) : '#f59e0b'
            return (
              <button
                key={type}
                onClick={() => setSymbol({ ...symbol, type })}
                className={cn(
                  'group flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all duration-200',
                  'border-2 hover:shadow-md',
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                )}
              >
                <div className="transition-transform group-hover:scale-110">
                  <Icon color={color} size={32} />
                </div>
                <span className={cn('text-xs font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {t(labelKey)}
                </span>
              </button>
            )
          })}
        </div>
      </div>


      <ColorSelector
        value={symbol.color}
        onChange={(color) => setSymbol({ ...symbol, color })}
        currentTheme={currentTheme}
        label={t('symbolColor')}
      />
    </div>
  )
}

export function DecorationSelector({ position }: { position: 'back' | 'front' }) {
  const t = useTranslations('achievements')
  const [isAdding, setIsAdding] = useState(false)
  const items = useAchievementBuilderStore((s) =>
    position === 'back' ? s.state.backDecorations : s.state.frontDecorations
  )
  const setItems = useAchievementBuilderStore((s) =>
    position === 'back' ? s.setBackDecorations : s.setFrontDecorations
  )
  const currentTheme = useAchievementBuilderStore((s) => s.state.theme)

  function addItem(type: DecorationType) {
    const next = [...items, { type, color: { mode: 'token' as const, token: 'gold' as const }, position }]
    setItems(next)
    setIsAdding(false)
  }

  function updateColor(idx: number, color: ColorConfig) {
    const next = items.map((item, i) => (i === idx ? { ...item, color } : item))
    setItems(next)
  }

  function updateCount(idx: number, count: number) {
    const next = items.map((item, i) => (i === idx ? { ...item, count } : item))
    setItems(next)
  }

  function remove(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  const positionLabel = position === 'back' ? t('positions.back') : t('positions.front')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{t('decorations', { position: positionLabel })}</span>
        <Button size="sm" variant="outline" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? t('cancel') : t('addDecoration')}
        </Button>
      </div>

      {/* Add decoration picker */}
      {isAdding && (
        <div className="rounded-xl border border-dashed border-primary/50 bg-primary/5 p-3">
          <p className="mb-2 text-xs text-muted-foreground">{t('selectDecorationToAdd')}</p>
          <div className="grid grid-cols-3 gap-2">
            {decorationOptions.map(({ type, labelKey, Icon }) => (
              <button
                key={type}
                onClick={() => addItem(type)}
                className="group flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2 transition-all hover:border-primary hover:shadow-sm"
              >
                <Icon color="#9ca3af" size={36} />
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && !isAdding && (
        <p className="text-center text-xs text-muted-foreground">{t('noDecorations', { position: positionLabel.toLowerCase() })}</p>
      )}

      {/* Active decorations */}
      <div className="space-y-2">
        {items.map((item, idx) => {
          const decoration = decorationOptions.find((d) => d.type === item.type)
          const Icon = decoration?.Icon
          const color = item.color.mode === 'token' ? tokenToHex(item.color.token) : '#f59e0b'

          return (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-muted-foreground/30"
            >
              {Icon && <Icon color={color} size={40} />}
              <div className="flex-1 space-y-1">
                <span className="text-sm font-medium text-foreground">{decoration?.labelKey ? t(decoration.labelKey) : ''}</span>
                <ColorSelector
                  value={item.color}
                  onChange={(color) => updateColor(idx, color)}
                  currentTheme={currentTheme}
                  compact
                />
              </div>
              {item.type === 'stars' && (
                <div className="flex items-center gap-1">
                  <label className="text-xs text-muted-foreground">Antal:</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={item.count ?? 3}
                    onChange={(e) => updateCount(idx, Number(e.target.value))}
                    className="w-14 rounded-lg border border-border bg-muted/30 px-2 py-1 text-center text-sm"
                  />
                </div>
              )}
              <Button size="sm" variant="ghost" onClick={() => remove(idx)} className="text-destructive">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
