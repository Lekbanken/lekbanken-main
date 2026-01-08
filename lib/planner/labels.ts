/**
 * Centralized labels and constants for Planner domain.
 * Used by both Admin and App to ensure consistency.
 */

import type { PlannerStatus, PlannerVisibility } from '@/types/planner'

// =============================================================================
// STATUS LABELS & COLORS
// =============================================================================

export const STATUS_LABELS: Record<PlannerStatus, string> = {
  draft: 'Utkast',
  published: 'Publicerad',
  modified: 'Ändrad',
  archived: 'Arkiverad',
} as const

export const STATUS_COLORS: Record<PlannerStatus, { bg: string; text: string; border: string; dot: string }> = {
  draft: { 
    bg: 'bg-slate-100', 
    text: 'text-slate-700', 
    border: 'border-slate-200', 
    dot: 'bg-slate-400' 
  },
  published: { 
    bg: 'bg-green-50', 
    text: 'text-green-700', 
    border: 'border-green-200', 
    dot: 'bg-green-500' 
  },
  modified: { 
    bg: 'bg-amber-50', 
    text: 'text-amber-700', 
    border: 'border-amber-200', 
    dot: 'bg-amber-500' 
  },
  archived: { 
    bg: 'bg-red-50', 
    text: 'text-red-700', 
    border: 'border-red-200', 
    dot: 'bg-red-400' 
  },
} as const

/**
 * Badge variants compatible with the UI Badge component
 */
export const STATUS_BADGE_VARIANTS: Record<PlannerStatus, 'secondary' | 'success' | 'warning' | 'outline'> = {
  draft: 'secondary',
  published: 'success',
  modified: 'warning',
  archived: 'outline',
} as const

// =============================================================================
// VISIBILITY LABELS & COLORS
// =============================================================================

export const VISIBILITY_LABELS: Record<PlannerVisibility, string> = {
  private: 'Privat',
  tenant: 'Organisation',
  public: 'Publik',
} as const

export const VISIBILITY_COLORS: Record<PlannerVisibility, { bg: string; text: string; border: string }> = {
  private: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  tenant: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  public: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
} as const

/**
 * Badge variants compatible with the UI Badge component
 */
export const VISIBILITY_BADGE_VARIANTS: Record<PlannerVisibility, 'outline' | 'accent' | 'primary'> = {
  private: 'outline',
  tenant: 'accent',
  public: 'primary',
} as const

// =============================================================================
// FILTER OPTIONS
// =============================================================================

export const STATUS_FILTER_OPTIONS: Array<{ value: PlannerStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'draft', label: STATUS_LABELS.draft },
  { value: 'published', label: STATUS_LABELS.published },
  { value: 'modified', label: STATUS_LABELS.modified },
  { value: 'archived', label: STATUS_LABELS.archived },
]

export const VISIBILITY_FILTER_OPTIONS: Array<{ value: PlannerVisibility | 'all'; label: string }> = [
  { value: 'all', label: 'Alla synligheter' },
  { value: 'private', label: VISIBILITY_LABELS.private },
  { value: 'tenant', label: VISIBILITY_LABELS.tenant },
  { value: 'public', label: VISIBILITY_LABELS.public },
]

// =============================================================================
// SORT OPTIONS
// =============================================================================

export type PlanSortOption = 
  | 'updated-desc' 
  | 'updated-asc' 
  | 'name-asc' 
  | 'name-desc' 
  | 'duration-desc' 
  | 'duration-asc'

export const SORT_OPTIONS: Array<{ value: PlanSortOption; label: string }> = [
  { value: 'updated-desc', label: 'Senast uppdaterad' },
  { value: 'updated-asc', label: 'Äldst uppdaterad' },
  { value: 'name-asc', label: 'Namn A-Ö' },
  { value: 'name-desc', label: 'Namn Ö-A' },
  { value: 'duration-desc', label: 'Längst tid' },
  { value: 'duration-asc', label: 'Kortast tid' },
]

// =============================================================================
// BLOCK TYPE LABELS
// =============================================================================

export const BLOCK_TYPE_LABELS: Record<string, string> = {
  game: 'Lek',
  pause: 'Paus',
  preparation: 'Förberedelse',
  custom: 'Anpassat',
} as const

export const BLOCK_TYPE_ICONS: Record<string, string> = {
  game: '🎮',
  pause: '☕',
  preparation: '📋',
  custom: '✨',
} as const

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format a duration in minutes to a human-readable string
 */
export function formatDuration(totalMinutes?: number | null): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 min'
  
  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (minutes === 0) {
    return `${hours} tim`
  }
  
  return `${hours} tim ${minutes} min`
}

/**
 * Format a date to Swedish locale
 */
export function formatDate(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('sv-SE')
}

/**
 * Format a date with time to Swedish locale
 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('sv-SE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
