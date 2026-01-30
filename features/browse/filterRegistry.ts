/**
 * Filter Registry
 *
 * Single source of truth för alla filter i Browse.
 * Definierar Basic och Super filter med metadata för:
 * - DB-mappning
 * - i18n-nycklar
 * - PlayMode-krav (för Super-filter)
 * - Minimum coverage threshold
 *
 * @see capabilities.ts för PlayMode → FilterGroup mapping
 * @see GAMEDETAILS_IMPLEMENTATION_PLAN.md för getSectionConfig-mönstret
 */

import type { PlayMode } from '@/lib/game-display';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Filter input types for UI rendering
 */
export type FilterType = 'enum' | 'multi-select' | 'range' | 'boolean';

/**
 * Filter groups for UI organization
 * - basic: Always visible (6-10 stable filters)
 * - super:*: Progressive disclosure, shown based on coverage + capabilities
 */
export type FilterGroup =
  | 'basic'
  | 'super:participants'
  | 'super:facilitator'
  | 'super:material'
  | 'super:advanced';

/**
 * DB mapping configuration
 */
export interface DbMapping {
  /** Direct column on games table */
  column?: string;
  /** Relation table for EXISTS check (e.g., 'game_roles') */
  relation?: string;
  /** True if derived from multiple columns (e.g., players range) */
  computed?: boolean;
}

/**
 * Enum option for filter values
 */
export interface FilterOption {
  value: string;
  labelKey: string;
  icon?: string;
  color?: string;
}

/**
 * Range configuration for numeric filters
 */
export interface RangeConfig {
  min: number;
  max: number;
  step: number;
  /** Key in BrowseFilters for min value */
  minKey?: string;
  /** Key in BrowseFilters for max value */
  maxKey?: string;
  /** i18n key for unit label (e.g., 'minutes', 'years') */
  unit?: string;
  /** Show as buckets instead of exact range (e.g., "5-15 min", "15-30 min") */
  buckets?: { value: string; label: string; min: number; max: number }[];
}

/**
 * Complete filter definition
 */
export interface FilterDefinition {
  /** Unique key matching BrowseFilters property */
  key: string;

  /** i18n translation key for label */
  labelKey: string;

  /** Icon for UI (emoji or icon name) */
  icon?: string;

  /** Filter input type */
  type: FilterType;

  /** Database mapping for query building */
  dbMapping: DbMapping;

  /** Options for enum/multi-select types */
  options?: FilterOption[];

  /** Range config for range type */
  range?: RangeConfig;

  /** UI group (basic always shown, super:* progressive) */
  group: FilterGroup;

  /**
   * Only show if user has access to games with these play modes.
   * Undefined = show for all play modes.
   */
  playModeRequirement?: PlayMode[];

  /**
   * Hide filter if coverage < this threshold (0.0 - 1.0).
   * E.g., 0.05 = hide if <5% of games have this field populated.
   * Only applies to Super filters.
   */
  minCoverage?: number;

  /** Sort order within group (lower = higher priority) */
  priority: number;
}

// =============================================================================
// FILTER REGISTRY
// =============================================================================

export const FILTER_REGISTRY: readonly FilterDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // BASIC FILTERS (always visible, ~6-10 stable filters)
  // ─────────────────────────────────────────────────────────────────────────

  {
    key: 'mainPurposes',
    labelKey: 'browse.filter.purpose',
    icon: '🎯',
    type: 'multi-select',
    dbMapping: { column: 'main_purpose_id', relation: 'purposes' },
    group: 'basic',
    priority: 1,
  },

  {
    key: 'energyLevels',
    labelKey: 'browse.filter.energy.label',
    icon: '⚡',
    type: 'enum',
    dbMapping: { column: 'energy_level' },
    options: [
      { value: 'low', labelKey: 'browse.filter.energy.low', icon: '🔋', color: 'text-emerald-600' },
      { value: 'medium', labelKey: 'browse.filter.energy.medium', icon: '⚡', color: 'text-amber-600' },
      { value: 'high', labelKey: 'browse.filter.energy.high', icon: '🔥', color: 'text-rose-600' },
    ],
    group: 'basic',
    priority: 2,
  },

  {
    key: 'environment',
    labelKey: 'browse.filter.environment.label',
    icon: '🌍',
    type: 'enum',
    dbMapping: { column: 'location_type' },
    options: [
      { value: 'indoor', labelKey: 'browse.filter.environment.indoor', icon: '🏠' },
      { value: 'outdoor', labelKey: 'browse.filter.environment.outdoor', icon: '🌳' },
      { value: 'both', labelKey: 'browse.filter.environment.both', icon: '🔄' },
    ],
    group: 'basic',
    priority: 3,
  },

  {
    key: 'groupSizes',
    labelKey: 'browse.filter.groupSize.label',
    icon: '👥',
    type: 'enum',
    dbMapping: { computed: true }, // Derived from min_players/max_players
    options: [
      { value: 'small', labelKey: 'browse.filter.groupSize.small', icon: '👥' },
      { value: 'medium', labelKey: 'browse.filter.groupSize.medium', icon: '👥' },
      { value: 'large', labelKey: 'browse.filter.groupSize.large', icon: '👥' },
    ],
    group: 'basic',
    priority: 4,
  },

  {
    key: 'time',
    labelKey: 'browse.filter.time',
    icon: '⏱️',
    type: 'range',
    dbMapping: { column: 'time_estimate_min' },
    range: {
      min: 5,
      max: 180,
      step: 5,
      minKey: 'minTime',
      maxKey: 'maxTime',
      unit: 'browse.minutes',
      buckets: [
        { value: 'quick', label: '5-15 min', min: 5, max: 15 },
        { value: 'medium', label: '15-30 min', min: 15, max: 30 },
        { value: 'long', label: '30-60 min', min: 30, max: 60 },
        { value: 'extended', label: '60+ min', min: 60, max: 999 },
      ],
    },
    group: 'basic',
    priority: 5,
  },

  {
    key: 'products',
    labelKey: 'browse.filter.product',
    icon: '📦',
    type: 'multi-select',
    dbMapping: { column: 'product_id', relation: 'products' },
    group: 'basic',
    priority: 6,
  },

  {
    key: 'subPurposes',
    labelKey: 'browse.filter.subPurpose',
    icon: '📌',
    type: 'multi-select',
    dbMapping: { relation: 'game_secondary_purposes' },
    group: 'basic',
    priority: 7,
  },

  {
    key: 'showLiked',
    labelKey: 'browse.filter.showLiked',
    icon: '❤️',
    type: 'boolean',
    dbMapping: { computed: true }, // RPC call, not direct column
    group: 'basic',
    priority: 8,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SUPER: FACILITATOR (shown for facilitated/participants play modes)
  // ─────────────────────────────────────────────────────────────────────────

  {
    key: 'playMode',
    labelKey: 'browse.filter.playMode.label',
    icon: '🎮',
    type: 'enum',
    dbMapping: { column: 'play_mode' },
    options: [
      { value: 'basic', labelKey: 'browse.filter.playMode.basic' },
      { value: 'facilitated', labelKey: 'browse.filter.playMode.facilitated' },
      { value: 'participants', labelKey: 'browse.filter.playMode.participants' },
    ],
    group: 'super:facilitator',
    priority: 1,
  },

  {
    key: 'hasPhases',
    labelKey: 'browse.filter.hasPhases',
    icon: '📊',
    type: 'boolean',
    dbMapping: { relation: 'game_phases' },
    group: 'super:facilitator',
    playModeRequirement: ['facilitated', 'participants'],
    minCoverage: 0.05,
    priority: 2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SUPER: PARTICIPANTS (shown for participants play mode only)
  // ─────────────────────────────────────────────────────────────────────────

  {
    key: 'hasRoles',
    labelKey: 'browse.filter.hasRoles',
    icon: '🎭',
    type: 'boolean',
    dbMapping: { relation: 'game_roles' },
    group: 'super:participants',
    playModeRequirement: ['participants'],
    minCoverage: 0.05,
    priority: 1,
  },

  {
    key: 'hasArtifacts',
    labelKey: 'browse.filter.hasArtifacts',
    icon: '🧩',
    type: 'boolean',
    dbMapping: { relation: 'game_artifacts' },
    group: 'super:participants',
    playModeRequirement: ['participants'],
    minCoverage: 0.05,
    priority: 2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SUPER: MATERIAL (material/preparation related)
  // ─────────────────────────────────────────────────────────────────────────

  {
    key: 'hasMaterials',
    labelKey: 'browse.filter.hasMaterials',
    icon: '🛠️',
    type: 'boolean',
    dbMapping: { relation: 'game_materials' },
    group: 'super:material',
    minCoverage: 0.1,
    priority: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SUPER: ADVANCED (lower coverage / less common filters)
  // ─────────────────────────────────────────────────────────────────────────

  {
    key: 'ageRange',
    labelKey: 'browse.filter.age',
    icon: '🎂',
    type: 'range',
    dbMapping: { computed: true }, // age_min + age_max
    range: { min: 3, max: 99, step: 1, minKey: 'minAge', maxKey: 'maxAge', unit: 'browse.years' },
    group: 'super:advanced',
    minCoverage: 0.2, // Only show if 20%+ of games have age data
    priority: 1,
  },

  {
    key: 'category',
    labelKey: 'browse.filter.category',
    icon: '🏷️',
    type: 'multi-select',
    dbMapping: { column: 'category' },
    group: 'super:advanced',
    minCoverage: 0.3,
    priority: 2,
  },

  {
    key: 'difficulty',
    labelKey: 'browse.filter.difficulty.label',
    icon: '📈',
    type: 'enum',
    dbMapping: { column: 'difficulty' },
    options: [
      { value: 'easy', labelKey: 'browse.filter.difficulty.easy' },
      { value: 'medium', labelKey: 'browse.filter.difficulty.medium' },
      { value: 'hard', labelKey: 'browse.filter.difficulty.hard' },
    ],
    group: 'super:advanced',
    minCoverage: 0.1,
    priority: 3,
  },
] as const;

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get filter definition by key
 */
export function getFilterDefinition(key: string): FilterDefinition | undefined {
  return FILTER_REGISTRY.find((f) => f.key === key);
}

/**
 * Get all filters in a specific group
 */
export function getFiltersByGroup(group: FilterGroup): FilterDefinition[] {
  return FILTER_REGISTRY.filter((f) => f.group === group).sort((a, b) => a.priority - b.priority);
}

/**
 * Get all Basic filters (always visible)
 */
export function getBasicFilters(): FilterDefinition[] {
  return getFiltersByGroup('basic');
}

/**
 * Get all Super filter groups that have at least one filter
 */
export function getSuperFilterGroups(): FilterGroup[] {
  const superGroups: FilterGroup[] = [
    'super:facilitator',
    'super:participants',
    'super:material',
    'super:advanced',
  ];
  return superGroups.filter((group) => getFiltersByGroup(group).length > 0);
}

/**
 * Check if a filter requires specific play modes
 */
export function filterRequiresPlayMode(filter: FilterDefinition, userPlayModes: PlayMode[]): boolean {
  if (!filter.playModeRequirement) return true;
  return filter.playModeRequirement.some((pm) => userPlayModes.includes(pm));
}

/**
 * Check if a filter passes coverage threshold
 */
export function filterPassesCoverage(
  filter: FilterDefinition,
  coverage: Record<string, number>
): boolean {
  if (!filter.minCoverage) return true;
  const coverageKey = filter.key;
  const coverageValue = coverage[coverageKey] ?? 0;
  return coverageValue >= filter.minCoverage;
}

/**
 * Filter group display metadata
 */
export const FILTER_GROUP_META: Record<FilterGroup, { labelKey: string; icon: string }> = {
  basic: { labelKey: 'browse.filter.group.basic', icon: '⚙️' },
  'super:facilitator': { labelKey: 'browse.filter.group.facilitator', icon: '👨‍🏫' },
  'super:participants': { labelKey: 'browse.filter.group.participants', icon: '🎭' },
  'super:material': { labelKey: 'browse.filter.group.material', icon: '🛠️' },
  'super:advanced': { labelKey: 'browse.filter.group.advanced', icon: '🔧' },
};
