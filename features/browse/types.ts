/**
 * Browse Domain Types
 *
 * Core types for the Browse feature. For filter registry types,
 * see filterRegistry.ts and capabilities.ts.
 */

// =============================================================================
// RE-EXPORTS from Registry (for convenience)
// =============================================================================

export type {
  FilterType,
  FilterGroup,
  FilterDefinition,
  FilterOption as RegistryFilterOption,
  DbMapping,
  RangeConfig,
} from './filterRegistry';

export type {
  FilterCoverage,
  UserFilterCapabilities,
  PlayModeCapabilities,
} from './capabilities';

// =============================================================================
// CORE ENUMS
// =============================================================================

export type EnergyLevel = "low" | "medium" | "high";
export type Environment = "indoor" | "outdoor" | "both";
export type GroupSize = "small" | "medium" | "large";
export type PlayMode = "basic" | "facilitated" | "participants";
export type Difficulty = "easy" | "medium" | "hard";

// =============================================================================
// GAME TYPES (for Browse display)
// =============================================================================

export type Game = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  groupSize: GroupSize;
  ageRange: string;
  energyLevel: EnergyLevel;
  environment: Environment;
  purpose: string;
  playMode?: PlayMode | null;
  imageUrl?: string | null;
  productName?: string | null;
};

// =============================================================================
// FILTER STATE
// =============================================================================

/**
 * BrowseFilters - Current filter state in UI.
 *
 * Basic filters (always available):
 * - products, mainPurposes, subPurposes, groupSizes, energyLevels
 * - environment, minPlayers, maxPlayers, minTime, maxTime
 * - showLiked (personal filter)
 *
 * Super filters (progressive disclosure):
 * - playMode, hasPhases (facilitator)
 * - hasRoles, hasArtifacts (participants)
 * - hasMaterials (material)
 * - minAge, maxAge, category, difficulty (advanced)
 */
export type BrowseFilters = {
  // ─────────────────────────────────────────────────────────────────────────
  // Basic Filters
  // ─────────────────────────────────────────────────────────────────────────
  products: string[];
  mainPurposes: string[];
  subPurposes: string[];
  groupSizes: GroupSize[];
  energyLevels: EnergyLevel[];
  environment: Environment | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minTime: number | null;
  maxTime: number | null;
  /** Filter to only show liked games */
  showLiked?: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Super Filters: Facilitator
  // ─────────────────────────────────────────────────────────────────────────
  /** Filter by play mode (basic/facilitated/participants) */
  playMode?: PlayMode | null;
  /** Only games with phases defined */
  hasPhases?: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Super Filters: Participants
  // ─────────────────────────────────────────────────────────────────────────
  /** Only games with roles defined */
  hasRoles?: boolean;
  /** Only games with artifacts defined */
  hasArtifacts?: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Super Filters: Material
  // ─────────────────────────────────────────────────────────────────────────
  /** Only games with materials defined */
  hasMaterials?: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Super Filters: Advanced
  // ─────────────────────────────────────────────────────────────────────────
  minAge: number | null;
  maxAge: number | null;
  /** Filter by category */
  categories?: string[];
  /** Filter by difficulty */
  difficulty?: Difficulty | null;
};

// =============================================================================
// SORT & VIEW OPTIONS
// =============================================================================

export type SortOption = "relevance" | "newest" | "name" | "duration" | "popular" | "rating";

// =============================================================================
// FILTER OPTIONS (from API)
// =============================================================================

export type FilterOption = { id: string; name: string | null };

export type FilterOptions = {
  products: FilterOption[];
  mainPurposes: FilterOption[];
  subPurposes: FilterOption[];
  /** Categories available in current scope */
  categories?: FilterOption[];
};
