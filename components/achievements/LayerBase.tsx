'use client'

import type { BaseConfig, ThemePreset } from '@/types/achievements-builder'
import { tokenToHex } from './color-utils'
import { CircleBase, ShieldBase } from './svg'

function resolveColor(config: BaseConfig['color'], theme: ThemePreset) {
  if (config.mode === 'token') return tokenToHex(config.token)
  if (config.mode === 'theme') return theme.colors[config.from]
  return config.value
}

export function LayerBase({ base, theme }: { base: BaseConfig; theme: ThemePreset }) {
  const color = resolveColor(base.color, theme)

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {base.type === 'circle' ? (
        <CircleBase color={color} size={140} glow />
      ) : (
        <ShieldBase color={color} size={120} glow />
      )}
    </div>
  )
}
