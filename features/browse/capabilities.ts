/**
 * Filter Capabilities
 *
 * Shared capabilities map that aligns with getSectionConfig pattern in GameDetails.
 * This is the single source of truth for:
 * - Which filter groups are available per PlayMode
 * - Which fields are relevant per PlayMode
 * - Coverage data structure for progressive disclosure
 *
 * @see components/game/GameDetails/config.ts for getSectionConfig
 * @see filterRegistry.ts for filter definitions
 */

import type { PlayMode } from '@/lib/game-display';
import type { FilterGroup, FilterDefinition } from './filterRegistry';
import {
  getFiltersByGroup,
  filterRequiresPlayMode,
  filterPassesCoverage,
} from './filterRegistry';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Coverage data returned from API.
 * Each key represents a filter that can be gated by coverage.
 * Value is 0.0 - 1.0 representing percentage of games with data.
 * 
 * NOTE: This must match the coverage object returned by /api/browse/filters
 */
export interface FilterCoverage {
  /** Games with roles defined */
  hasRoles: number;
  /** Games with artifacts defined */
  hasArtifacts: number;
  /** Games with phases defined */
  hasPhases: number;
  /** Games with materials defined */
  hasMaterials: number;
  /** Games with age range defined */
  hasAgeRange: number;
}

/**
 * User capabilities for filter access.
 * Derived from user's license, tenant, and role.
 */
export interface UserFilterCapabilities {
  /**
   * Play modes the user has access to (based on product licenses).
   * Used to gate Super filters that require specific play modes.
   */
  playModes: PlayMode[];

  /**
   * Filter groups the user can see.
   * Basic is always included; Super groups depend on playModes.
   */
  filterGroups: FilterGroup[];

  /**
   * Whether user is in demo mode (limited filters).
   */
  isDemoMode?: boolean;
}

/**
 * Capabilities per PlayMode - which filter groups and fields are relevant.
 * Mirrors the structure of getSectionConfig but for filters.
 */
export interface PlayModeCapabilities {
  /** Filter groups that should be visible for this play mode */
  availableFilterGroups: FilterGroup[];

  /** DB fields that are meaningful for this play mode */
  relevantFields: string[];
}

// =============================================================================
// PLAY MODE → CAPABILITIES MAP
// =============================================================================

/**
 * PlayMode capabilities map.
 * Aligns with getSectionConfig pattern from GameDetails.
 *
 * - basic: Simple games, no facilitator features
 * - facilitated: Facilitator-led with phases/tools
 * - participants: Full features including roles/artifacts
 */
export const PLAY_MODE_CAPABILITIES: Record<PlayMode, PlayModeCapabilities> = {
  /**
   * Basic play mode: simple games without facilitator features.
   * Basic filters + super:advanced (age, category, difficulty) are available.
   * super:advanced uses minCoverage gating so empty filters won't appear.
   */
  basic: {
    availableFilterGroups: ['basic', 'super:advanced'],
    relevantFields: [
      'energy_level',
      'location_type',
      'min_players',
      'max_players',
      'time_estimate_min',
      'age_min',
      'age_max',
      'main_purpose_id',
      'product_id',
      // Advanced (shown via super:advanced if coverage met)
      'category',
      'difficulty',
    ],
  },

  /**
   * Facilitated play mode: facilitator-led games with phases.
   * Basic + facilitator filters.
   */
  facilitated: {
    availableFilterGroups: ['basic', 'super:facilitator', 'super:material'],
    relevantFields: [
      'energy_level',
      'location_type',
      'min_players',
      'max_players',
      'time_estimate_min',
      'age_min',
      'age_max',
      'main_purpose_id',
      'product_id',
      'play_mode',
      // Facilitator-specific
      'leader_tips',
    ],
  },

  /**
   * Participants play mode: full features including roles/artifacts.
   * All filter groups available.
   */
  participants: {
    availableFilterGroups: [
      'basic',
      'super:facilitator',
      'super:participants',
      'super:material',
      'super:advanced',
    ],
    relevantFields: [
      'energy_level',
      'location_type',
      'min_players',
      'max_players',
      'time_estimate_min',
      'age_min',
      'age_max',
      'main_purpose_id',
      'product_id',
      'play_mode',
      'leader_tips',
      // Participant-specific
      'difficulty',
      'category',
    ],
  },
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Derive user filter capabilities from their play modes.
 *
 * @param userPlayModes - PlayModes the user has access to (from licenses)
 * @param isDemoMode - Whether user is in demo mode
 * @returns UserFilterCapabilities
 */
export function deriveUserCapabilities(
  userPlayModes: PlayMode[],
  isDemoMode = false
): UserFilterCapabilities {
  // If no play modes, default to basic
  const modes = userPlayModes.length > 0 ? userPlayModes : ['basic' as PlayMode];

  // Collect all filter groups from all user's play modes
  const filterGroupsSet = new Set<FilterGroup>();
  for (const mode of modes) {
    const caps = PLAY_MODE_CAPABILITIES[mode];
    if (caps) {
      for (const group of caps.availableFilterGroups) {
        filterGroupsSet.add(group);
      }
    }
  }

  // Demo mode: only basic filters
  if (isDemoMode) {
    return {
      playModes: modes,
      filterGroups: ['basic'],
      isDemoMode: true,
    };
  }

  return {
    playModes: modes,
    filterGroups: Array.from(filterGroupsSet),
    isDemoMode: false,
  };
}

/**
 * Get visible filters based on user capabilities and coverage.
 *
 * This is the main utility for UI to determine which filters to render.
 *
 * @param userCaps - User's filter capabilities
 * @param coverage - Field coverage data from API (optional in v1)
 * @returns Visible filters grouped by FilterGroup
 */
export function getVisibleFilters(
  userCaps: UserFilterCapabilities,
  coverage: Partial<FilterCoverage> = {}
): Map<FilterGroup, FilterDefinition[]> {
  const result = new Map<FilterGroup, FilterDefinition[]>();

  // Map coverage keys to filter keys
  // Default to 1 (100%) if coverage not provided, so filters show by default
  const coverageMap: Record<string, number> = {
    hasRoles: coverage.hasRoles ?? 1,
    hasArtifacts: coverage.hasArtifacts ?? 1,
    hasPhases: coverage.hasPhases ?? 1,
    hasMaterials: coverage.hasMaterials ?? 1,
    ageRange: coverage.hasAgeRange ?? 1,
    // category and difficulty don't have coverage gating in v1
    category: 1,
    difficulty: 1,
  };

  for (const group of userCaps.filterGroups) {
    const groupFilters = getFiltersByGroup(group);

    const visibleFilters = groupFilters.filter((filter) => {
      // 1. Check play mode requirement
      if (!filterRequiresPlayMode(filter, userCaps.playModes)) {
        return false;
      }

      // 2. Check coverage threshold (only for Super filters)
      if (group !== 'basic' && !filterPassesCoverage(filter, coverageMap)) {
        return false;
      }

      return true;
    });

    if (visibleFilters.length > 0) {
      result.set(group, visibleFilters);
    }
  }

  return result;
}

/**
 * Check if any Super filters are visible.
 * Used to determine if "Advanced" section should be shown.
 */
export function hasSuperFiltersVisible(
  userCaps: UserFilterCapabilities,
  coverage: Partial<FilterCoverage> = {}
): boolean {
  const visible = getVisibleFilters(userCaps, coverage);
  for (const [group] of visible) {
    if (group !== 'basic') return true;
  }
  return false;
}

/**
 * Create default coverage (100% for all - used when no coverage data available)
 */
export function createDefaultCoverage(): FilterCoverage {
  return {
    hasRoles: 1,
    hasArtifacts: 1,
    hasPhases: 1,
    hasMaterials: 1,
    hasAgeRange: 1,
  };
}

/**
 * Create empty coverage (0% for all - hides all coverage-gated filters)
 */
export function createEmptyCoverage(): FilterCoverage {
  return {
    hasRoles: 0,
    hasArtifacts: 0,
    hasPhases: 0,
    hasMaterials: 0,
    hasAgeRange: 0,
  };
}
