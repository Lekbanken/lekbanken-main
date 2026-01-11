export const COOKIE_CONSENT_SCHEMA_VERSION = 1
export const COOKIE_CONSENT_STORAGE_KEY = 'lb-cookie-consent'

export const COOKIE_CATEGORIES = ['necessary', 'functional', 'analytics', 'marketing'] as const
export type CookieCategory = (typeof COOKIE_CATEGORIES)[number]

export const DEFAULT_COOKIE_CONSENT: Record<CookieCategory, boolean> = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
}

export const REQUIRED_LEGAL_TYPES = ['terms', 'privacy'] as const
