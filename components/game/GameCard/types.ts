/**
 * GameCard Types
 *
 * Typdefinitioner för Unified GameCard-komponenten.
 * Alla varianter använder samma props-interface.
 *
 * @see GAMECARD_UNIFIED_IMPLEMENTATION.md
 */

import type { GameSummary } from '@/lib/game-display';

// =============================================================================
// VARIANTS
// =============================================================================

/**
 * Tillgängliga GameCard-varianter
 *
 * - grid: Browse card view (default)
 * - list: Browse list view
 * - compact: Sidebars, små listor
 * - picker: Planner välj lek
 * - block: Planner blockrad
 * - mini: Related games
 * - featured: Hero/kampanj
 */
export type GameCardVariant =
  | 'grid'
  | 'list'
  | 'compact'
  | 'picker'
  | 'block'
  | 'mini'
  | 'featured';

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Actions som kan triggas på ett GameCard
 */
export interface GameCardActions {
  /** URL att navigera till vid klick */
  href?: string;
  /** Callback vid klick (istället för navigation) */
  onClick?: () => void;
  /** Callback vid favorit-toggle */
  onFavorite?: (isFavorite: boolean) => void;
  /** Callback vid "lägg till" (t.ex. i planner) */
  onAdd?: () => void;
  /** Callback vid "ta bort" (t.ex. i planner) */
  onRemove?: () => void;
}

// =============================================================================
// FLAGS
// =============================================================================

/**
 * Flaggor för vad som ska visas
 */
export interface GameCardFlags {
  /** Visa favorit-knapp */
  showFavorite?: boolean;
  /** Visa rating */
  showRating?: boolean;
  /** Visa PlayMode-badge */
  showPlayMode?: boolean;
  /** Visa duration */
  showDuration?: boolean;
  /** Visa spelarantal */
  showPlayers?: boolean;
  /** Visa energinivå */
  showEnergy?: boolean;
  /** Visa åldersintervall */
  showAge?: boolean;
  /** Visa bild */
  showImage?: boolean;
  /** Visa beskrivning */
  showDescription?: boolean;
  /** Visa kategorier/tags */
  showCategories?: boolean;
  /** Är kortet draggable (för dnd) */
  isDraggable?: boolean;
  /** Visa som loading state */
  isLoading?: boolean;
}

// =============================================================================
// MAIN PROPS
// =============================================================================

/**
 * Props för GameCard-komponenten
 *
 * KRITISKT: `game` MÅSTE vara en GameSummary.
 * UI får ALDRIG konsumera raw DB-data direkt.
 */
export interface GameCardProps {
  /**
   * Game data - MÅSTE vara GameSummary.
   * Använd mappers från @/lib/game-display för att konvertera data.
   */
  game: GameSummary;

  /**
   * Vilken visuell variant som ska renderas
   * @default 'grid'
   */
  variant?: GameCardVariant;

  /**
   * Actions (navigation, callbacks)
   */
  actions?: GameCardActions;

  /**
   * Flaggor för vad som ska visas
   * Defaults varierar per variant.
   */
  flags?: GameCardFlags;

  /**
   * Extra CSS-klasser
   */
  className?: string;

  /**
   * Test ID för e2e-tester
   */
  testId?: string;
}

// =============================================================================
// SKELETON PROPS
// =============================================================================

/**
 * Props för GameCardSkeleton
 */
export interface GameCardSkeletonProps {
  variant?: GameCardVariant;
  className?: string;
}

// =============================================================================
// DEFAULT FLAGS PER VARIANT
// =============================================================================

/**
 * Standard-flaggor per variant
 * Används om flags inte anges explicit
 */
export const DEFAULT_FLAGS: Record<GameCardVariant, GameCardFlags> = {
  grid: {
    showImage: true,
    showDescription: true,
    showPlayMode: true,
    showEnergy: true,
    showDuration: true,
    showFavorite: true,
    showRating: true,
  },
  list: {
    showImage: true,
    showDescription: true,
    showPlayMode: true,
    showEnergy: true,
    showDuration: true,
    showPlayers: true,
    showAge: true,
  },
  compact: {
    showImage: true,
    showDuration: true,
    showRating: true,
  },
  picker: {
    showImage: true,
    showDescription: true,
    showDuration: true,
  },
  block: {
    showImage: true,
    showDuration: true,
    showEnergy: true,
    isDraggable: true,
  },
  mini: {
    showImage: true,
    showEnergy: true,
  },
  featured: {
    showImage: true,
    showDescription: true,
    showPlayMode: true,
    showEnergy: true,
    showDuration: true,
    showPlayers: true,
    showCategories: true,
    showFavorite: true,
    showRating: true,
  },
};
