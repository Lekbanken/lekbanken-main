'use client'

import { SymbolConfig, ThemePreset, SymbolType } from '@/types/achievements-builder'
import { tokenToHex } from './color-utils'
import {
  FlameSymbol,
  StarSymbol,
  ShieldSymbol,
  WingsSymbol,
  MedalSymbol,
  BoltSymbol,
} from './svg'

const SYMBOL_COMPONENTS: Record<SymbolType, React.ComponentType<{ color: string; size: number; glow?: boolean }>> = {
  flame: FlameSymbol,
  star: StarSymbol,
  shield: ShieldSymbol,
  wings: WingsSymbol,
  medal: MedalSymbol,
  bolt: BoltSymbol,
}

export function LayerSymbol({ symbol, theme }: { symbol: SymbolConfig; theme: ThemePreset }) {
  const color =
    symbol.color.mode === 'token'
      ? tokenToHex(symbol.color.token)
      : symbol.color.mode === 'theme'
        ? theme.colors[symbol.color.from]
        : symbol.color.value

  const SymbolComponent = SYMBOL_COMPONENTS[symbol.type]

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="drop-shadow-lg">
        <SymbolComponent color={color} size={56} glow />
      </div>
    </div>
  )
}
