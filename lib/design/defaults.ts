/**
 * Design System - Constants and Defaults
 * 
 * Default values used when no design config is set.
 * These match the current hardcoded assets in the codebase.
 */

import type {
  BrandConfig,
  MediaConfig,
  TypographyConfig,
  TokensConfig,
  SystemDesignConfig,
  EffectiveDesign,
} from '@/types/design'

// ---------------------------------------------------------------------------
// Default Brand Config
// ---------------------------------------------------------------------------

export const DEFAULT_BRAND: BrandConfig = {
  logoLightUrl: undefined, // Falls back to inline SVG
  logoDarkUrl: undefined,
  iconUrl: '/lekbanken-icon.png',
  faviconLightUrl: '/lekbanken-icon.png',
  faviconDarkUrl: '/lekbanken-icon.png',
  primaryColor: '#6366f1', // Indigo-500
  secondaryColor: '#8b5cf6', // Violet-500
}

// ---------------------------------------------------------------------------
// Default Media Config
// ---------------------------------------------------------------------------

export const DEFAULT_MEDIA: MediaConfig = {
  defaultProfileImages: [],
  defaultCoverImages: [],
}

// ---------------------------------------------------------------------------
// Default Typography Config
// ---------------------------------------------------------------------------

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontUrl: undefined, // Uses system font
  headingFontFamily: undefined, // Same as fontFamily
  headingFontUrl: undefined,
  scale: {
    base: 16,
    steps: [12, 14, 16, 18, 20, 24, 30, 36, 48, 60],
  },
  titleFormat: 'normal',
}

// ---------------------------------------------------------------------------
// Default Tokens Config
// ---------------------------------------------------------------------------

export const DEFAULT_TOKENS: TokensConfig = {
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  spacing: {
    unit: 4,
    scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64],
  },
  cssVariables: {},
}

// ---------------------------------------------------------------------------
// Complete Default System Design
// ---------------------------------------------------------------------------

export const DEFAULT_SYSTEM_DESIGN: SystemDesignConfig = {
  brand: DEFAULT_BRAND,
  media: DEFAULT_MEDIA,
  typography: DEFAULT_TYPOGRAPHY,
  tokens: DEFAULT_TOKENS,
}

// ---------------------------------------------------------------------------
// Default Effective Design (when nothing is configured)
// ---------------------------------------------------------------------------

export const DEFAULT_EFFECTIVE_DESIGN: EffectiveDesign = {
  brand: DEFAULT_BRAND,
  media: DEFAULT_MEDIA,
  typography: DEFAULT_TYPOGRAPHY,
  tokens: DEFAULT_TOKENS,
  source: 'system',
}
