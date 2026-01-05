'use client'

import { cn } from '@/lib/utils'
import type { Palette } from '../types'

interface AvatarPaletteProps {
  palettes: Palette[]
  selectedToken: string | null
  onSelect: (token: string) => void
  className?: string
}

/**
 * AvatarPalette
 * 
 * A horizontal scrollable row of color swatches for selecting colors.
 * Shows a checkmark or ring on the selected color.
 */
export function AvatarPalette({ 
  palettes, 
  selectedToken, 
  onSelect,
  className = '' 
}: AvatarPaletteProps) {
  if (palettes.length === 0) {
    return (
      <div className={cn('text-center text-sm text-muted-foreground py-2', className)}>
        No colors available
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-thin', className)}>
      {palettes.map((palette) => {
        const isSelected = selectedToken === palette.token
        
        return (
          <button
            key={palette.token}
            onClick={() => onSelect(palette.token)}
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all duration-150',
              'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
              isSelected 
                ? 'border-primary ring-2 ring-primary ring-offset-2 scale-110' 
                : 'border-transparent hover:border-gray-300'
            )}
            style={{ backgroundColor: palette.hex }}
            title={palette.label}
            aria-label={`Select ${palette.label} color`}
            aria-pressed={isSelected}
          >
            {isSelected && (
              <span className="flex items-center justify-center w-full h-full">
                <svg 
                  className={cn(
                    'w-4 h-4',
                    isLightColor(palette.hex) ? 'text-gray-800' : 'text-white'
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
          </button>
        )
      })}
    </div>
  )
}

// Helper to determine if a color is light (for contrast)
function isLightColor(hex: string): boolean {
  // Remove # if present
  const color = hex.replace('#', '')
  
  // Parse RGB
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5
}

export default AvatarPalette
