/**
 * Game Display Formatters
 *
 * Centraliserade formatters för all speldata-visning.
 * UI får ALDRIG formatera grunddata på egen hand.
 * Alla labels och styling måste komma härifrån.
 *
 * @see GAMECARD_UNIFIED_IMPLEMENTATION.md för full dokumentation
 */

import type { EnergyLevel, PlayMode, Environment, Difficulty } from './types';

// =============================================================================
// DURATION
// =============================================================================

/**
 * Formaterar duration till läsbar sträng
 *
 * @example
 * formatDuration(15, 20) // "15-20 min"
 * formatDuration(15, 15) // "15 min"
 * formatDuration(15, null) // "15 min"
 * formatDuration(null, null) // null
 */
export function formatDuration(
  min?: number | null,
  max?: number | null
): string | null {
  if (min == null && max == null) return null;

  const minVal = min ?? max;
  const maxVal = max ?? min;

  if (minVal === maxVal) {
    return `${minVal} min`;
  }

  return `${minVal}-${maxVal} min`;
}

/**
 * Formaterar duration kort (utan "min")
 *
 * @example
 * formatDurationShort(15, 20) // "15-20"
 * formatDurationShort(15) // "15"
 */
export function formatDurationShort(
  min?: number | null,
  max?: number | null
): string | null {
  if (min == null && max == null) return null;

  const minVal = min ?? max;
  const maxVal = max ?? min;

  if (minVal === maxVal) {
    return `${minVal}`;
  }

  return `${minVal}-${maxVal}`;
}

// =============================================================================
// PLAYERS
// =============================================================================

/**
 * Formaterar spelarantal till läsbar sträng
 *
 * @example
 * formatPlayers(4, 12) // "4-12 deltagare"
 * formatPlayers(4, null) // "4+ deltagare"
 * formatPlayers(null, 12) // "Upp till 12 deltagare"
 */
export function formatPlayers(
  min?: number | null,
  max?: number | null
): string | null {
  if (min == null && max == null) return null;

  if (min != null && max != null) {
    if (min === max) return `${min} deltagare`;
    return `${min}-${max} deltagare`;
  }

  if (min != null) return `${min}+ deltagare`;
  return `Upp till ${max} deltagare`;
}

/**
 * Formaterar spelarantal kort
 *
 * @example
 * formatPlayersShort(4, 12) // "4-12"
 * formatPlayersShort(4, null) // "4+"
 */
export function formatPlayersShort(
  min?: number | null,
  max?: number | null
): string | null {
  if (min == null && max == null) return null;

  if (min != null && max != null) {
    if (min === max) return `${min}`;
    return `${min}-${max}`;
  }

  if (min != null) return `${min}+`;
  return `≤${max}`;
}

// =============================================================================
// AGE
// =============================================================================

/**
 * Formaterar åldersintervall till läsbar sträng
 *
 * @example
 * formatAge(8, 12) // "8-12 år"
 * formatAge(8, null) // "8+ år"
 * formatAge(null, 12) // "Upp till 12 år"
 * formatAge(8, 99) // "8+ år" (99 behandlas som "ingen övre gräns")
 */
export function formatAge(
  min?: number | null,
  max?: number | null
): string | null {
  if (min == null && max == null) return null;

  // Behandla 99 som "ingen övre gräns"
  const effectiveMax = max != null && max >= 99 ? null : max;

  if (min != null && effectiveMax != null) {
    if (min === effectiveMax) return `${min} år`;
    return `${min}-${effectiveMax} år`;
  }

  if (min != null) return `${min}+ år`;
  return `Upp till ${effectiveMax} år`;
}

/**
 * Formaterar åldersintervall kort
 *
 * @example
 * formatAgeShort(8, 12) // "8-12"
 * formatAgeShort(8, null) // "8+"
 */
export function formatAgeShort(
  min?: number | null,
  max?: number | null
): string | null {
  if (min == null && max == null) return null;

  const effectiveMax = max != null && max >= 99 ? null : max;

  if (min != null && effectiveMax != null) {
    if (min === effectiveMax) return `${min}`;
    return `${min}-${effectiveMax}`;
  }

  if (min != null) return `${min}+`;
  return `≤${effectiveMax}`;
}

// =============================================================================
// ENERGY LEVEL
// =============================================================================

export interface EnergyLevelFormat {
  label: string;
  labelShort: string;
  color: string;
  bgColor: string;
  borderColor: string;
  variant: 'success' | 'warning' | 'destructive';
}

const ENERGY_CONFIG: Record<EnergyLevel, EnergyLevelFormat> = {
  low: {
    label: 'Låg energi',
    labelShort: 'Låg',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/50',
    borderColor: 'border-green-200 dark:border-green-800',
    variant: 'success',
  },
  medium: {
    label: 'Medel energi',
    labelShort: 'Medel',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
    variant: 'warning',
  },
  high: {
    label: 'Hög energi',
    labelShort: 'Hög',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/50',
    borderColor: 'border-red-200 dark:border-red-800',
    variant: 'destructive',
  },
} as const;

/**
 * Formaterar energinivå till objekt med label och styling
 *
 * @example
 * formatEnergyLevel('high') // { label: 'Hög energi', color: '...', ... }
 */
export function formatEnergyLevel(
  level?: EnergyLevel | null
): EnergyLevelFormat | null {
  if (!level) return null;
  return ENERGY_CONFIG[level];
}

// =============================================================================
// PLAY MODE
// =============================================================================

export interface PlayModeFormat {
  label: string;
  labelShort: string;
  description: string;
  border: string;         // Full border for grid cards
  borderLeft: string;     // Left accent border for list cards
  badge: string;
  bgColor: string;
  titleColor: string;     // Accent color for title on hover
  icon: string;           // Emoji eller ikon-namn
}

const PLAYMODE_CONFIG: Record<PlayMode, PlayModeFormat> = {
  basic: {
    label: 'Enkel lek',
    labelShort: 'Enkel',
    description: 'En enkel lek utan digitala verktyg',
    border: 'border-slate-200 dark:border-slate-700',
    borderLeft: 'border-l-slate-300 dark:border-l-slate-600',
    badge: 'bg-muted text-muted-foreground ring-1 ring-border',
    bgColor: 'bg-muted/50',
    titleColor: 'group-hover:text-foreground',
    icon: '🎮',
  },
  facilitated: {
    label: 'Ledd aktivitet',
    labelShort: 'Ledd',
    description: 'Strukturerad aktivitet med faser och timer',
    border: 'border-amber-300 dark:border-amber-600',
    borderLeft: 'border-l-amber-400 dark:border-l-amber-500',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 ring-1 ring-amber-300 dark:ring-amber-700',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    titleColor: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    icon: '🎯',
  },
  participants: {
    label: 'Deltagarlek',
    labelShort: 'Deltagare',
    description: 'Med roller, privata kort och publik tavla',
    border: 'border-purple-300 dark:border-purple-600',
    borderLeft: 'border-l-purple-400 dark:border-l-purple-500',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 ring-1 ring-purple-300 dark:ring-purple-700',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    titleColor: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
    icon: '🎭',
  },
} as const;

/**
 * Formaterar play mode till objekt med label och styling
 *
 * @example
 * formatPlayMode('facilitated') // { label: 'Ledd aktivitet', border: '...', ... }
 */
export function formatPlayMode(mode?: PlayMode | null): PlayModeFormat | null {
  if (!mode) return null;
  return PLAYMODE_CONFIG[mode];
}

// =============================================================================
// ENVIRONMENT
// =============================================================================

export interface EnvironmentFormat {
  label: string;
  labelShort: string;
  icon: string;
}

const ENVIRONMENT_CONFIG: Record<Environment, EnvironmentFormat> = {
  indoor: {
    label: 'Inomhus',
    labelShort: 'Inne',
    icon: '🏠',
  },
  outdoor: {
    label: 'Utomhus',
    labelShort: 'Ute',
    icon: '🌳',
  },
  both: {
    label: 'Inne eller ute',
    labelShort: 'Inne/Ute',
    icon: '🏠🌳',
  },
} as const;

/**
 * Formaterar environment till objekt med label
 *
 * @example
 * formatEnvironment('indoor') // { label: 'Inomhus', labelShort: 'Inne', icon: '🏠' }
 */
export function formatEnvironment(
  env?: Environment | null
): EnvironmentFormat | null {
  if (!env) return null;
  return ENVIRONMENT_CONFIG[env];
}

// =============================================================================
// DIFFICULTY
// =============================================================================

export interface DifficultyFormat {
  label: string;
  labelShort: string;
  color: string;
  bgColor: string;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyFormat> = {
  easy: {
    label: 'Lätt',
    labelShort: 'Lätt',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/50',
  },
  medium: {
    label: 'Medel',
    labelShort: 'Medel',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
  },
  hard: {
    label: 'Svår',
    labelShort: 'Svår',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/50',
  },
} as const;

/**
 * Formaterar difficulty till objekt med label och styling
 *
 * @example
 * formatDifficulty('hard') // { label: 'Svår', color: '...', ... }
 */
export function formatDifficulty(
  diff?: Difficulty | null
): DifficultyFormat | null {
  if (!diff) return null;
  return DIFFICULTY_CONFIG[diff];
}

// =============================================================================
// RATING
// =============================================================================

/**
 * Formaterar rating till läsbar sträng
 *
 * @example
 * formatRating(4.5) // "4.5"
 * formatRating(4.567) // "4.6"
 * formatRating(null) // null
 */
export function formatRating(rating?: number | null): string | null {
  if (rating == null) return null;
  return rating.toFixed(1);
}

/**
 * Formaterar rating med antal
 *
 * @example
 * formatRatingWithCount(4.5, 123) // "4.5 (123)"
 */
export function formatRatingWithCount(
  rating?: number | null,
  count?: number | null
): string | null {
  if (rating == null) return null;
  const ratingStr = rating.toFixed(1);
  if (count == null) return ratingStr;
  return `${ratingStr} (${count})`;
}

// =============================================================================
// PLAY COUNT
// =============================================================================

/**
 * Formaterar spelningar till läsbar sträng
 *
 * @example
 * formatPlayCount(1234) // "1 234 spelningar"
 * formatPlayCount(1) // "1 spelning"
 */
export function formatPlayCount(count?: number | null): string | null {
  if (count == null) return null;
  const formatted = count.toLocaleString('sv-SE');
  return count === 1 ? `${formatted} spelning` : `${formatted} spelningar`;
}

// =============================================================================
// STATUS
// =============================================================================

export interface StatusFormat {
  label: string;
  color: string;
  bgColor: string;
}

/**
 * Formaterar game status till objekt med label och styling
 */
export function formatStatus(
  status?: 'draft' | 'published' | 'archived' | null
): StatusFormat | null {
  if (!status) return null;

  const config: Record<string, StatusFormat> = {
    draft: {
      label: 'Utkast',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    },
    published: {
      label: 'Publicerad',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/50',
    },
    archived: {
      label: 'Arkiverad',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950/50',
    },
  };

  return config[status] ?? null;
}
