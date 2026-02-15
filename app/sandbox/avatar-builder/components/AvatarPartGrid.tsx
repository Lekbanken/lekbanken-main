'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { AvatarPart, AvatarCategory } from '../types'
import { OPTIONAL_CATEGORIES } from '../seed-data'

interface AvatarPartGridProps {
  parts: AvatarPart[]
  category: AvatarCategory
  selectedPartId: string | null
  onSelect: (partId: string | null) => void
  className?: string
}

/**
 * AvatarPartGrid v2
 *
 * Responsive grid of PNG part thumbnails.
 * Shows a "None" option for optional categories (glasses, hair).
 */
export function AvatarPartGrid({
  parts,
  category,
  selectedPartId,
  onSelect,
  className = '',
}: AvatarPartGridProps) {
  const isOptional = OPTIONAL_CATEGORIES.includes(category)

  return (
    <div
      className={cn(
        'grid grid-cols-3 sm:grid-cols-4 gap-3',
        className
      )}
    >
      {/* "None" option for optional categories */}
      {isOptional && (
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'relative aspect-square rounded-xl border-2 p-2 transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            'bg-card hover:bg-card/80',
            selectedPartId === null
              ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
              : 'border-border hover:border-primary/40'
          )}
          aria-label="Ingen"
          aria-pressed={selectedPartId === null}
        >
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M6 18L18 6" strokeLinecap="round" />
            </svg>
          </div>
          <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-muted-foreground font-medium">
            Ingen
          </span>
          {selectedPartId === null && <SelectedBadge />}
        </button>
      )}

      {/* Parts */}
      {parts.map((part) => {
        const isSelected = selectedPartId === part.id

        return (
          <button
            key={part.id}
            onClick={() => onSelect(part.id)}
            className={cn(
              'relative aspect-square rounded-xl border-2 p-1.5 transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              'bg-card hover:bg-card/80',
              isSelected
                ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40'
            )}
            title={part.name}
            aria-label={`Välj ${part.name}`}
            aria-pressed={isSelected}
          >
            {/* PNG thumbnail */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
              <Image
                src={part.src}
                alt={part.name}
                width={80}
                height={80}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>

            {isSelected && <SelectedBadge />}
          </button>
        )
      })}
    </div>
  )
}

/** Small checkmark badge for selected items */
function SelectedBadge() {
  return (
    <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
      <svg
        className="w-3 h-3 text-primary-foreground"
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
  )
}

export default AvatarPartGrid
