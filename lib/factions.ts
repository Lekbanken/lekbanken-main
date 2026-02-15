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

// Re-export palette utils for consumers that import from factions
export { hexToHSL, hslToHex, lightenColor, darkenColor, withAlpha } from './palette'
export type { ColorMode } from './palette'

// =============================================================================
// Faction Theme Definitions
// =============================================================================

export const FACTION_THEMES: Record<NonNullable<FactionId>, FactionTheme> = {
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Djup skog, mossa och organisk energi',
    accentColor: '#10b981',           // Emerald
    accentColorMuted: 'rgba(16, 185, 129, 0.12)',
    gradientFrom: '#0b3d2e',
    gradientTo: '#1a1a2e',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    iconVariant: 'organic',
  },
  sea: {
    id: 'sea',
    name: 'Sea',
    description: 'Djupt hav, koraller och strömmande vatten',
    accentColor: '#0ea5e9',           // Ocean blue
    accentColorMuted: 'rgba(14, 165, 233, 0.12)',
    gradientFrom: '#0c2d4a',
    gradientTo: '#1a1a2e',
    glowColor: 'rgba(14, 165, 233, 0.25)',
    iconVariant: 'sharp',
  },
  sky: {
    id: 'sky',
    name: 'Sky',
    description: 'Öppen himmel, solstrålar och fria vindar',
    accentColor: '#f59e0b',           // Amber / Sun gold
    accentColorMuted: 'rgba(245, 158, 11, 0.12)',
    gradientFrom: '#3d3520',
    gradientTo: '#1a1a2e',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    iconVariant: 'rounded',
  },
  void: {
    id: 'void',
    name: 'Void',
    description: 'Kosmisk rymd, stjärnor och oändlighet',
    accentColor: '#7c3aed',           // Deep violet
    accentColorMuted: 'rgba(124, 58, 237, 0.12)',
    gradientFrom: '#1e1040',
    gradientTo: '#1a1a2e',
    glowColor: 'rgba(124, 58, 237, 0.25)',
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
