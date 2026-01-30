/**
 * GameDetails Configuration
 *
 * Config-driven section visibility based on mode and playMode.
 * Page.tsx uses this config to determine which sections to render.
 *
 * @see GAMEDETAILS_IMPLEMENTATION_PLAN.md Fas 3
 */

import type { PlayMode } from '@/lib/game-display';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Available modes for GameDetails display
 */
export type GameDetailMode = 'preview' | 'admin' | 'host';

/**
 * Section visibility configuration
 */
export interface SectionVisibility {
  header: boolean;
  badges: boolean;
  about: boolean;
  steps: boolean;
  materials: boolean;
  safety: boolean;
  preparation: boolean;
  phases: boolean;
  gallery: boolean;
  roles: boolean;
  artifacts: boolean;
  triggers: boolean;
  quickFacts: boolean;
  sidebar: boolean;
  adminActions: boolean;
  // P1 sections
  accessibility: boolean;
  requirements: boolean;
  board: boolean;
  tools: boolean;
}

// =============================================================================
// SECTION VISIBILITY CONFIG
// =============================================================================

/**
 * Base visibility config per mode
 */
export const SECTION_VISIBILITY: Record<GameDetailMode, SectionVisibility> = {
  /**
   * Preview mode - public game detail page
   * Shows all sections except admin actions
   * Lazy-loaded sections (roles/artifacts/triggers) shown based on playMode
   */
  preview: {
    header: true,
    badges: true,
    about: true,
    steps: true,
    materials: true,
    safety: true,
    preparation: true,
    phases: true,
    gallery: true,
    roles: true,      // Shown but lazy-loaded
    artifacts: true,  // Shown but lazy-loaded
    triggers: true,   // Shown but lazy-loaded
    quickFacts: true,
    sidebar: true,
    adminActions: false,
    // P1 sections
    accessibility: true,
    requirements: true,
    board: true,
    tools: true,
  },

  /**
   * Admin mode - game editing/management
   * Shows all sections including admin actions
   */
  admin: {
    header: true,
    badges: true,
    about: true,
    steps: true,
    materials: true,
    safety: true,
    preparation: true,
    phases: true,
    gallery: true,
    roles: true,
    artifacts: true,
    triggers: true,
    quickFacts: true,
    sidebar: true,
    adminActions: true,
    // P1 sections
    accessibility: true,
    requirements: true,
    board: true,
    tools: true,
  },

  /**
   * Host mode - running a game session
   * Focused on gameplay-relevant sections
   */
  host: {
    header: true,
    badges: false,     // Less clutter during gameplay
    about: false,      // Already know the game
    steps: true,       // Core gameplay
    materials: true,   // Reference during play
    safety: true,      // Important for safety
    preparation: false, // Already prepared
    phases: true,      // Facilitated mode timing
    gallery: false,    // Not needed during play
    roles: true,       // Manage participant roles
    artifacts: true,   // Use during gameplay
    triggers: true,    // Trigger events
    quickFacts: false, // Not needed during play
    sidebar: false,    // Focus on gameplay
    adminActions: false,
    // P1 sections - relevant for host
    accessibility: true,  // Important for adaptations
    requirements: false,  // Already set up
    board: true,          // Control public display
    tools: true,          // Facilitator tools
  },
} as const;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get section visibility config based on mode and playMode
 *
 * Applies playMode-specific filters:
 * - 'basic': Hide phases, roles, artifacts, triggers
 * - 'facilitated': Show phases, hide roles/artifacts/triggers
 * - 'participants': Show roles/artifacts/triggers
 *
 * @param mode - The display mode (preview, admin, host)
 * @param playMode - The game's play mode
 * @returns Section visibility configuration
 */
export function getSectionConfig(
  mode: GameDetailMode,
  playMode?: PlayMode | null
): SectionVisibility {
  const baseConfig = { ...SECTION_VISIBILITY[mode] };

  // Apply playMode-specific filters
  if (playMode === 'basic') {
    // Basic mode: no phases, roles, artifacts, triggers
    baseConfig.phases = false;
    baseConfig.roles = false;
    baseConfig.artifacts = false;
    baseConfig.triggers = false;
    // Basic mode: hide facilitator-specific P1 sections
    baseConfig.board = false;
    baseConfig.tools = false;
  } else if (playMode === 'facilitated') {
    // Facilitated mode: show phases, but no participant features
    baseConfig.roles = false;
    baseConfig.artifacts = false;
    baseConfig.triggers = false;
  }
  // 'participants' mode: show everything (default config)

  return baseConfig;
}

/**
 * Check if any lazy-loaded section is visible
 */
export function hasLazyLoadedSections(config: SectionVisibility): boolean {
  return config.roles || config.artifacts || config.triggers;
}

/**
 * Get section keys that are visible
 */
export function getVisibleSections(config: SectionVisibility): string[] {
  return Object.entries(config)
    .filter(([, visible]) => visible)
    .map(([key]) => key);
}
