/**
 * Browse Feature Exports
 *
 * Public API for the Browse domain.
 */

// =============================================================================
// COMPONENTS
// =============================================================================

export { BrowsePage } from './BrowsePage';
export { FilterBar } from './components/FilterBar';
export { FilterSheet } from './components/FilterSheet';
export { FilterSheetV2 } from './components/FilterSheetV2';
export { FilterAccordion } from './components/FilterAccordion';
export { SearchBar } from './components/SearchBar';
export { GameCard } from './components/GameCard';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Core types
  EnergyLevel,
  Environment,
  GroupSize,
  PlayMode,
  Difficulty,
  Game,
  BrowseFilters,
  SortOption,
  FilterOption,
  FilterOptions,
  // Registry types
  FilterType,
  FilterGroup,
  FilterDefinition,
  DbMapping,
  RangeConfig,
  RegistryFilterOption,
  // Capabilities types
  FilterCoverage,
  UserFilterCapabilities,
  PlayModeCapabilities,
} from './types';

// =============================================================================
// FILTER REGISTRY
// =============================================================================

export {
  FILTER_REGISTRY,
  FILTER_GROUP_META,
  getFilterDefinition,
  getFiltersByGroup,
  getBasicFilters,
  getSuperFilterGroups,
  filterRequiresPlayMode,
  filterPassesCoverage,
} from './filterRegistry';

// =============================================================================
// CAPABILITIES
// =============================================================================

export {
  PLAY_MODE_CAPABILITIES,
  deriveUserCapabilities,
  getVisibleFilters,
  hasSuperFiltersVisible,
  createDefaultCoverage,
  createEmptyCoverage,
} from './capabilities';

// =============================================================================
// HOOKS
// =============================================================================

export { useBrowseFilters } from './hooks';
export type {
  UseBrowseFiltersResult,
  VisibleFilterGroups,
  FilterOptionsWithCoverage,
} from './hooks';
