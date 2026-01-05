/**
 * Faction Themes Configuration
 * 
 * Defines the visual theming for each faction.
 * Factions are purely cosmetic and affect only the Journey Overview scene.
 * 
 * Design principles:
 * - Factions change CSS variables, never component logic
 * - Accent colors must maintain WCAG contrast on dark backgrounds
 * - Gradients are subtle, never overwhelming
 * - Patterns are optional, low-opacity overlays
 */

import type { FactionId, FactionTheme } from '@/types/journey'

// =============================================================================
// Faction Theme Definitions
// =============================================================================

export const FACTION_THEMES: Record<NonNullable<FactionId>, FactionTheme> = {
  explorer: {
    id: 'explorer',
    name: 'Utforskare',
    description: 'Nyfikna själar som söker nya horisonter',
    accentColor: '#00c7b0',           // Teal
    accentColorMuted: 'rgba(0, 199, 176, 0.12)',
    gradientFrom: '#0d3d38',
    gradientTo: '#1a1a2e',
    glowColor: 'rgba(0, 199, 176, 0.25)',
    iconVariant: 'organic',
  },
  guardian: {
    id: 'guardian',
    name: 'Väktare',
    description: 'Beskyddare av tradition och gemenskap',
    accentColor: '#4a90d9',           // Blue
    accentColorMuted: 'rgba(74, 144, 217, 0.12)',
    gradientFrom: '#1a2a4a',
    gradientTo: '#1a1a2e',
    glowColor: 'rgba(74, 144, 217, 0.25)',
    iconVariant: 'sharp',
  },
  trickster: {
    id: 'trickster',
    name: 'Skojare',
    description: 'Lekfulla andar som sprider glädje',
    accentColor: '#ffd166',           // Gold
    accentColorMuted: 'rgba(255, 209, 102, 0.12)',
    gradientFrom: '#3d3520',
    gradientTo: '#1a1a2e',
    glowColor: 'rgba(255, 209, 102, 0.25)',
    iconVariant: 'rounded',
  },
  sage: {
    id: 'sage',
    name: 'Vis',
    description: 'Tänkare som söker djupare förståelse',
    accentColor: '#9b5de5',           // Purple
    accentColorMuted: 'rgba(155, 93, 229, 0.12)',
    gradientFrom: '#2a1f3d',
    gradientTo: '#1a1a2e',
    glowColor: 'rgba(155, 93, 229, 0.25)',
    iconVariant: 'organic',
  },
}

// Default theme when no faction is selected (uses Lekbanken primary)
export const DEFAULT_THEME: FactionTheme = {
  id: null,
  name: 'Neutral',
  description: 'Ingen fraktion vald ännu',
  accentColor: '#8661ff',             // Lekbanken primary
  accentColorMuted: 'rgba(134, 97, 255, 0.12)',
  gradientFrom: '#1f1f3a',
  gradientTo: '#1a1a2e',
  glowColor: 'rgba(134, 97, 255, 0.2)',
  iconVariant: 'rounded',
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the theme for a faction ID
 */
export function getFactionTheme(factionId: FactionId): FactionTheme {
  if (!factionId) return DEFAULT_THEME
  return FACTION_THEMES[factionId] ?? DEFAULT_THEME
}

/**
 * Get all available factions (for selection UI)
 */
export function getAllFactions(): FactionTheme[] {
  return Object.values(FACTION_THEMES)
}

/**
 * Get CSS variables object for a theme (for inline styles)
 */
export function getThemeCSSVariables(theme: FactionTheme): Record<string, string> {
  return {
    '--journey-accent': theme.accentColor,
    '--journey-accent-muted': theme.accentColorMuted,
    '--journey-gradient-from': theme.gradientFrom,
    '--journey-gradient-to': theme.gradientTo,
    '--journey-glow': theme.glowColor ?? 'transparent',
  }
}

/**
 * Get faction icon based on iconVariant
 * Returns a className hint for icon styling
 */
export function getFactionIconClass(theme: FactionTheme): string {
  switch (theme.iconVariant) {
    case 'sharp':
      return 'journey-icon-sharp'
    case 'organic':
      return 'journey-icon-organic'
    case 'rounded':
    default:
      return 'journey-icon-rounded'
  }
}

// =============================================================================
// Level & XP Calculations
// =============================================================================

/**
 * Calculate XP required for a given level
 * Uses a gentle curve: base + (level * multiplier)^exponent
 */
export function getXPForLevel(level: number): number {
  const base = 100
  const multiplier = 50
  const exponent = 1.2
  return Math.floor(base + Math.pow(level * multiplier, exponent))
}

/**
 * Calculate level from total XP
 */
export function getLevelFromTotalXP(totalXP: number): { level: number; currentXP: number; xpToNext: number } {
  let level = 1
  let xpRemaining = totalXP
  
  while (true) {
    const xpNeeded = getXPForLevel(level)
    if (xpRemaining < xpNeeded) {
      return {
        level,
        currentXP: xpRemaining,
        xpToNext: xpNeeded,
      }
    }
    xpRemaining -= xpNeeded
    level++
  }
}

/**
 * Get progress percentage to next level
 */
export function getLevelProgress(currentXP: number, xpToNextLevel: number): number {
  if (xpToNextLevel <= 0) return 100
  return Math.min(100, Math.floor((currentXP / xpToNextLevel) * 100))
}
