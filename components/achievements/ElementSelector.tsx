'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAchievementBuilderStore } from './store'
import { BaseType, DecorationType, SymbolType, ColorConfig, ColorToken } from '@/types/achievements-builder'
import { tokenToHex } from './color-utils'
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

const baseOptions: { type: BaseType; label: string; Icon: React.ComponentType<{ color: string; size: number }> }[] = [
  { type: 'circle', label: 'Cirkel', Icon: CircleBase },
  { type: 'shield', label: 'Sköld', Icon: ShieldBase },
]

const symbolOptions: { type: SymbolType; label: string; Icon: React.ComponentType<{ color: string; size: number }> }[] = [
  { type: 'flame', label: 'Flamma', Icon: FlameSymbol },
  { type: 'star', label: 'Stjärna', Icon: StarSymbol },
  { type: 'shield', label: 'Sköld', Icon: ShieldSymbol },
  { type: 'wings', label: 'Vingar', Icon: WingsSymbol },
  { type: 'medal', label: 'Medalj', Icon: MedalSymbol },
  { type: 'bolt', label: 'Blixt', Icon: BoltSymbol },
]

const decorationOptions: { type: DecorationType; label: string; Icon: React.ComponentType<{ color: string; size: number }> }[] = [
  { type: 'wings', label: 'Vingar', Icon: WingsDecoration },
  { type: 'laurels', label: 'Lager', Icon: LaurelsDecoration },
  { type: 'flames', label: 'Flammor', Icon: FlamesDecoration },
  { type: 'ribbon', label: 'Band', Icon: RibbonDecoration },
  { type: 'stars', label: 'Stjärnor', Icon: StarsDecoration },
  { type: 'crown', label: 'Krona', Icon: CrownDecoration },
]

const colorTokens: { token: ColorToken; label: string }[] = [
  { token: 'gold', label: 'Guld' },
  { token: 'silver', label: 'Silver' },
  { token: 'bronze', label: 'Brons' },
  { token: 'onyx', label: 'Onyx' },
]

function ColorChips({
  value,
  onChange,
}: {
  value: ColorConfig
  onChange: (config: ColorConfig) => void
}) {
  return (
    <div className="flex gap-1">
      {colorTokens.map(({ token }) => {
        const isActive = value.mode === 'token' && value.token === token
        return (
          <button
            key={token}
            onClick={() => onChange({ mode: 'token', token })}
            className={cn(
              'h-5 w-5 rounded-full ring-1 transition-transform hover:scale-110',
              isActive ? 'ring-2 ring-primary' : 'ring-black/10'
            )}
            style={{ backgroundColor: tokenToHex(token) }}
            title={token}
          />
        )
      })}
    </div>
  )
}

export function BaseSelector() {
  const base = useAchievementBuilderStore((s) => s.state.base)
  const setBase = useAchievementBuilderStore((s) => s.setBase)

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Välj basform</label>
        <div className="grid grid-cols-2 gap-3">
          {baseOptions.map(({ type, label, Icon }) => {
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
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Basfärg</label>
        <div className="flex flex-wrap gap-2">
          {colorTokens.map(({ token, label }) => {
            const isActive = base.color.mode === 'token' && base.color.token === token
            return (
              <button
                key={token}
                onClick={() => setBase({ ...base, color: { mode: 'token', token } })}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 transition-all hover:scale-105',
                  isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                )}
              >
                <div
                  className="h-5 w-5 rounded-full shadow-sm ring-1 ring-black/10"
                  style={{ backgroundColor: tokenToHex(token) }}
                />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function SymbolSelector() {
  const symbol = useAchievementBuilderStore((s) => s.state.symbol)
  const setSymbol = useAchievementBuilderStore((s) => s.setSymbol)

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Välj symbol</label>
        <div className="grid grid-cols-3 gap-2">
          {symbolOptions.map(({ type, label, Icon }) => {
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
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Symbolfärg</label>
        <div className="flex flex-wrap gap-2">
          {colorTokens.map(({ token, label }) => {
            const isActive = symbol.color.mode === 'token' && symbol.color.token === token
            return (
              <button
                key={token}
                onClick={() => setSymbol({ ...symbol, color: { mode: 'token', token } })}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 transition-all hover:scale-105',
                  isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                )}
              >
                <div
                  className="h-5 w-5 rounded-full shadow-sm ring-1 ring-black/10"
                  style={{ backgroundColor: tokenToHex(token) }}
                />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function DecorationSelector({ position }: { position: 'back' | 'front' }) {
  const [isAdding, setIsAdding] = useState(false)
  const items = useAchievementBuilderStore((s) =>
    position === 'back' ? s.state.backDecorations : s.state.frontDecorations
  )
  const setItems = useAchievementBuilderStore((s) =>
    position === 'back' ? s.setBackDecorations : s.setFrontDecorations
  )

  function addItem(type: DecorationType) {
    const next = [...items, { type, color: { mode: 'token' as const, token: 'gold' as const }, position }]
    setItems(next)
    setIsAdding(false)
  }

  function updateColor(idx: number, token: ColorToken) {
    const next = items.map((item, i) =>
      i === idx ? { ...item, color: { mode: 'token' as const, token } } : item
    )
    setItems(next)
  }

  function updateCount(idx: number, count: number) {
    const next = items.map((item, i) => (i === idx ? { ...item, count } : item))
    setItems(next)
  }

  function remove(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  const positionLabel = position === 'back' ? 'Bakre' : 'Främre'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{positionLabel} dekorationer</span>
        <Button size="sm" variant="outline" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Avbryt' : '+ Lägg till'}
        </Button>
      </div>

      {/* Add decoration picker */}
      {isAdding && (
        <div className="rounded-xl border border-dashed border-primary/50 bg-primary/5 p-3">
          <p className="mb-2 text-xs text-muted-foreground">Välj dekoration att lägga till:</p>
          <div className="grid grid-cols-3 gap-2">
            {decorationOptions.map(({ type, label, Icon }) => (
              <button
                key={type}
                onClick={() => addItem(type)}
                className="group flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-2 transition-all hover:border-primary hover:shadow-sm"
              >
                <Icon color="#9ca3af" size={36} />
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && !isAdding && (
        <p className="text-center text-xs text-muted-foreground">Inga {positionLabel.toLowerCase()} dekorationer</p>
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
                <span className="text-sm font-medium text-foreground">{decoration?.label}</span>
                <ColorChips
                  value={item.color}
                  onChange={(config) => {
                    if (config.mode === 'token') {
                      updateColor(idx, config.token)
                    }
                  }}
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
