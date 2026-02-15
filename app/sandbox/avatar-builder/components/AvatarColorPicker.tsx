'use client'

import { cn } from '@/lib/utils'
import type { ColorPreset } from '../types'

interface AvatarColorPickerProps {
  presets: ColorPreset[]
  selectedId: string | null | undefined
  onSelect: (colorId: string | null) => void
  className?: string
}

/**
 * AvatarColorPicker
 *
 * A horizontal row of color swatches for tinting a PNG layer.
 * The first preset is typically "Original" (no filter).
 */
export function AvatarColorPicker({
  presets,
  selectedId,
  onSelect,
  className = '',
}: AvatarColorPickerProps) {
  if (presets.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {presets.map((preset) => {
        // A preset is the "original" (unmodified) when it has no filter and no tint
        const isOriginal = preset.filter === 'none' && !preset.tint
        const isSelected =
          (selectedId == null && isOriginal) ||
          selectedId === preset.id

        return (
          <button
            key={preset.id}
            onClick={() => onSelect(isOriginal ? null : preset.id)}
            className={cn(
              'group relative flex-shrink-0 w-9 h-9 rounded-full border-2 transition-all duration-150',
              'hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
              isSelected
                ? 'border-primary ring-2 ring-primary/30 scale-110'
                : 'border-border hover:border-primary/40'
            )}
            style={{ backgroundColor: preset.swatch }}
            title={preset.name}
            aria-label={`Välj ${preset.name}`}
            aria-pressed={isSelected}
          >
            {/* Checkmark for selected */}
            {isSelected && (
              <span className="flex items-center justify-center w-full h-full">
                <svg
                  className={cn(
                    'w-4 h-4',
                    isLightColor(preset.swatch) ? 'text-gray-800' : 'text-white'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
            )}

            {/* Tooltip on hover */}
            <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {preset.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Determine if a hex color is light (for checkmark contrast) */
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '')
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

export default AvatarColorPicker
