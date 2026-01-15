/**
 * Cookie Consent Types
 * Enterprise Cookie Consent System for Lekbanken
 */

export const COOKIE_CATEGORIES = ['necessary', 'functional', 'analytics', 'marketing'] as const
export type CookieCategory = (typeof COOKIE_CATEGORIES)[number]

export interface CookieConsentState {
  necessary: boolean    // Always true, cannot be disabled
  functional: boolean   // Preferences and enhanced features
  analytics: boolean    // Anonymous usage analytics
  marketing: boolean    // Marketing and advertising
}

export interface StoredCookieConsent {
  consentId: string           // Unique identifier for this consent
  schemaVersion: number       // Schema version for migrations
  policyVersion: string       // Policy version at time of consent
  categories: CookieConsentState
  grantedAt: string           // ISO timestamp when first granted
  updatedAt: string           // ISO timestamp when last updated
  expiresAt: string           // ISO timestamp when consent expires
  source: 'banner' | 'settings'
  locale: string
  dntEnabled: boolean         // Do-Not-Track was enabled
  gpcEnabled: boolean         // Global Privacy Control was enabled
}

export interface CookieCatalogEntry {
  key: string
  category: CookieCategory
  purpose: string
  purposeTranslations: Record<string, string>
  provider: string | null
  ttlDays: number | null
  isActive: boolean
  sortOrder: number
}

export interface ConsentAuditEvent {
  consentId: string
  userId?: string
  eventType: 'granted' | 'updated' | 'withdrawn' | 'expired' | 'reprompted'
  previousState?: CookieConsentState
  newState: CookieConsentState
  consentVersion: string
  locale: string
  dntEnabled: boolean
  gpcEnabled: boolean
  pageUrl: string
  referrer: string
  userAgent: string
}

export interface PrivacySignals {
  dnt: boolean   // Do-Not-Track header
  gpc: boolean   // Global Privacy Control
}

export interface ConsentPolicyVersion {
  version: string
  effectiveDate: string
  requiresReconsent: boolean
  changeSummary: string
}
