'use client'

import { cn } from '@/lib/utils'
import type { AvatarPart, AvatarCategory } from '../types'
import { getColorHex } from '../seed-data'

interface AvatarPartGridProps {
  parts: AvatarPart[]
  category: AvatarCategory
  selectedPartId: string | null
  selectedColor: string | null
  onSelect: (partId: string) => void
  className?: string
}

/**
 * AvatarPartGrid
 * 
 * A responsive grid of clickable part thumbnails.
 * Uses 3-4 columns depending on screen width.
 */
export function AvatarPartGrid({
  parts,
  category,
  selectedPartId,
  selectedColor,
  onSelect,
  className = '',
}: AvatarPartGridProps) {
  return (
    <div className={cn(
      'grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto max-h-[200px] pr-1',
      'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent',
      className
    )}>
      {parts.map((part) => {
        const isSelected = selectedPartId === part.id
        
        // Use thumbnail SVG if available, otherwise use main SVG
        const displaySvg = part.thumbnailSvg || part.svg
        
        // Apply color for preview
        const colorHex = selectedColor 
          ? getColorHex(category, selectedColor)
          : part.defaultColorToken 
            ? getColorHex(category, part.defaultColorToken)
            : undefined

        return (
          <button
            key={part.id}
            onClick={() => onSelect(part.id)}
            className={cn(
              'relative aspect-square rounded-lg border-2 p-1 transition-all duration-150',
              'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              'bg-white/50 hover:bg-white',
              isSelected 
                ? 'border-primary bg-primary/10 shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            )}
            title={part.name}
            aria-label={`Select ${part.name}`}
            aria-pressed={isSelected}
          >
            {/* SVG Preview */}
            <div 
              className="w-full h-full flex items-center justify-center"
              style={colorHex && part.supportsColor ? { color: colorHex } : undefined}
              dangerouslySetInnerHTML={{ __html: displaySvg }}
            />
            
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <svg 
                  className="w-2.5 h-2.5 text-white" 
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
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default AvatarPartGrid
