'use client'

import type { DecorationConfig, ThemePreset, DecorationType } from '@/types/achievements-builder'
import { tokenToHex } from './color-utils'
import {
  WingsDecoration,
  LaurelsDecoration,
  FlamesDecoration,
  RibbonDecoration,
  StarsDecoration,
  CrownDecoration,
} from './svg'

const DECORATION_COMPONENTS: Record<
  DecorationType,
  React.ComponentType<{ color: string; size: number; count?: number }>
> = {
  wings: WingsDecoration,
  laurels: LaurelsDecoration,
  flames: FlamesDecoration,
  ribbon: RibbonDecoration,
  stars: StarsDecoration,
  crown: CrownDecoration,
}

export function LayerFrontDecoration({ items, theme }: { items: DecorationConfig[]; theme: ThemePreset }) {
  if (!items.length) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {items.map((item, idx) => {
        const color =
          item.color.mode === 'token'
            ? tokenToHex(item.color.token)
            : item.color.mode === 'theme'
              ? theme.colors[item.color.from]
              : item.color.value
        
        const DecorationComponent = DECORATION_COMPONENTS[item.type]
        
        return (
          <div
            key={`${item.type}-${idx}`}
            className="absolute"
            aria-label={`front-${item.type}`}
          >
            <DecorationComponent 
              color={color} 
              size={item.type === 'crown' ? 100 : 160} 
              count={item.count}
            />
          </div>
        )
      })}
    </div>
  )
}
