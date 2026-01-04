/**
 * Design System Types
 * 
 * Central type definitions for the Design Hub configuration.
 * These shapes mirror the JSON structure stored in the database.
 */

// ---------------------------------------------------------------------------
// Brand Assets
// ---------------------------------------------------------------------------

export interface BrandConfig {
  /** Light mode logo URL */
  logoLightUrl?: string
  /** Dark mode logo URL */
  logoDarkUrl?: string
  /** App icon URL (used in app shell, PWA) */
  iconUrl?: string
  /** Light mode favicon URL */
  faviconLightUrl?: string
  /** Dark mode favicon URL */
  faviconDarkUrl?: string
  /** Primary brand color (hex) */
  primaryColor?: string
  /** Secondary brand color (hex) */
  secondaryColor?: string
}

// ---------------------------------------------------------------------------
// Media Defaults
// ---------------------------------------------------------------------------

export interface MediaConfig {
  /** Default profile images (array of URLs) */
  defaultProfileImages?: string[]
  /** Default "Lek" cover images (array of URLs) */
  defaultCoverImages?: string[]
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export interface TypographyScale {
  /** Base font size in px */
  base: number
  /** Scale steps (multipliers or fixed sizes) */
  steps: number[]
}

export interface TypographyConfig {
  /** Primary font family name */
  fontFamily?: string
  /** URL to load font (Google Fonts, self-hosted, etc.) */
  fontUrl?: string
  /** Heading font family (optional, defaults to fontFamily) */
  headingFontFamily?: string
  /** Heading font URL */
  headingFontUrl?: string
  /** Font size scale */
  scale?: TypographyScale
  /** Title format (e.g., 'uppercase', 'capitalize', 'normal') */
  titleFormat?: 'uppercase' | 'capitalize' | 'normal'
}

// ---------------------------------------------------------------------------
// Advanced Tokens (future-safe)
// ---------------------------------------------------------------------------

export interface TokensConfig {
  /** Border radius scale */
  radius?: {
    sm?: string
    md?: string
    lg?: string
    xl?: string
    full?: string
  }
  /** Spacing scale */
  spacing?: {
    unit?: number
    scale?: number[]
  }
  /** Custom CSS variables */
  cssVariables?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Complete System Design Config
// ---------------------------------------------------------------------------

export interface SystemDesignConfig {
  id?: string
  brand: BrandConfig
  media: MediaConfig
  typography: TypographyConfig
  tokens: TokensConfig
  updatedAt?: string
}

// ---------------------------------------------------------------------------
// Tenant Design Overrides
// ---------------------------------------------------------------------------

/**
 * Tenant overrides are partial and only certain fields are whitelisted.
 * Typography and tokens are NOT overridable by tenants.
 */
export interface TenantDesignOverrides {
  brand?: Partial<BrandConfig>
  media?: Partial<MediaConfig>
  // typography and tokens are intentionally omitted - not overridable
}

export interface TenantDesignConfig {
  tenantId: string
  overrides: TenantDesignOverrides
  updatedAt?: string
}

// ---------------------------------------------------------------------------
// Effective (Resolved) Design
// ---------------------------------------------------------------------------

/**
 * The effective design config after merging system + tenant overrides.
 */
export interface EffectiveDesign {
  brand: BrandConfig
  media: MediaConfig
  typography: TypographyConfig
  tokens: TokensConfig
  /** Source of the config */
  source: 'system' | 'tenant-merged'
  /** Tenant ID if tenant overrides were applied */
  tenantId?: string
}

// ---------------------------------------------------------------------------
// Asset Upload Types
// ---------------------------------------------------------------------------

export type SystemAssetType = 
  | 'logo-light'
  | 'logo-dark'
  | 'icon'
  | 'favicon-light'
  | 'favicon-dark'
  | 'default-profile'
  | 'default-cover'

export type TenantAssetType = 
  | 'logo-light'
  | 'logo-dark'
  | 'icon'
  | 'favicon-light'
  | 'favicon-dark'

export interface AssetUploadResult {
  success: boolean
  url?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Whitelist for tenant overrides
// ---------------------------------------------------------------------------

/**
 * Fields that tenants are allowed to override (when branding is enabled).
 */
export const TENANT_OVERRIDE_WHITELIST = {
  brand: [
    'logoLightUrl',
    'logoDarkUrl',
    'iconUrl',
    'faviconLightUrl',
    'faviconDarkUrl',
    'primaryColor',
    'secondaryColor',
  ] as const,
  media: [
    'defaultProfileImages',
    'defaultCoverImages',
  ] as const,
} as const

// ---------------------------------------------------------------------------
// Storage paths
// ---------------------------------------------------------------------------

export const SYSTEM_ASSETS_BUCKET = 'system-assets'
export const TENANT_ASSETS_BUCKET = 'tenant-assets'

export function getSystemAssetPath(type: SystemAssetType, extension: string): string {
  const paths: Record<SystemAssetType, string> = {
    'logo-light': `system/logo/light.${extension}`,
    'logo-dark': `system/logo/dark.${extension}`,
    'icon': `system/icon/app.${extension}`,
    'favicon-light': `system/favicon/light.${extension}`,
    'favicon-dark': `system/favicon/dark.${extension}`,
    'default-profile': `system/defaults/profile/${Date.now()}.${extension}`,
    'default-cover': `system/defaults/cover/${Date.now()}.${extension}`,
  }
  return paths[type]
}

export function getTenantAssetPath(tenantId: string, type: TenantAssetType, extension: string): string {
  const paths: Record<TenantAssetType, string> = {
    'logo-light': `${tenantId}/logo/light.${extension}`,
    'logo-dark': `${tenantId}/logo/dark.${extension}`,
    'icon': `${tenantId}/icon/app.${extension}`,
    'favicon-light': `${tenantId}/favicon/light.${extension}`,
    'favicon-dark': `${tenantId}/favicon/dark.${extension}`,
  }
  return paths[type]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]

export const MAX_ASSET_SIZE_MB = 5
export const MAX_ASSET_SIZE_BYTES = MAX_ASSET_SIZE_MB * 1024 * 1024

export function validateAssetFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Ogiltig filtyp: ${file.type}. Tillåtna: PNG, JPEG, SVG, WebP, ICO.` 
    }
  }
  
  if (file.size > MAX_ASSET_SIZE_BYTES) {
    return { 
      valid: false, 
      error: `Filen är för stor (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: ${MAX_ASSET_SIZE_MB} MB.` 
    }
  }
  
  return { valid: true }
}
