/**
 * Cookie Consent Manager
 * Enterprise-grade, GDPR-compliant consent management for Lekbanken
 * 
 * Features:
 * - 100% owned (zero third-party dependencies)
 * - Granular category control (necessary, functional, analytics, marketing)
 * - Privacy signal detection (DNT, GPC)
 * - Consent versioning and expiration
 * - Audit logging for compliance
 * - Anonymous and authenticated user support
 */

import type {
  CookieConsentState,
  StoredCookieConsent,
  PrivacySignals,
  ConsentAuditEvent,
} from './types'

// ============================================================================
// Constants
// ============================================================================

export const CONSENT_COOKIE_NAME = 'lb-cookie-consent'
export const CONSENT_SCHEMA_VERSION = 2  // Increment when schema changes
export const CONSENT_POLICY_VERSION = '1.0'  // Increment when policy changes
export const CONSENT_DURATION_DAYS = 365  // 12 months

export const DEFAULT_CONSENT: CookieConsentState = {
  necessary: true,   // Always true
  functional: false,
  analytics: false,
  marketing: false,
}

// ============================================================================
// Privacy Signal Detection
// ============================================================================

/**
 * Detect browser privacy signals (DNT, GPC)
 */
export function detectPrivacySignals(): PrivacySignals {
  if (typeof window === 'undefined') {
    return { dnt: false, gpc: false }
  }

  const dnt = 
    navigator.doNotTrack === '1' || 
    navigator.doNotTrack === 'yes' ||
    (window as Window & { doNotTrack?: string }).doNotTrack === '1'

  const gpc = Boolean(
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  )

  return { dnt, gpc }
}

/**
 * Check if any privacy signal is enabled
 */
export function hasPrivacySignal(): boolean {
  const signals = detectPrivacySignals()
  return signals.dnt || signals.gpc
}

// ============================================================================
// Consent ID Generation
// ============================================================================

/**
 * Generate a unique consent ID
 * Format: consent_<timestamp>_<random>
 */
function generateConsentId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `consent_${timestamp}_${random}`
}

// ============================================================================
// Local Storage Operations
// ============================================================================

/**
 * Read stored consent from localStorage
 */
export function getStoredConsent(): StoredCookieConsent | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(CONSENT_COOKIE_NAME)
    if (!raw) return null

    const consent = JSON.parse(raw) as StoredCookieConsent

    // Check schema version
    if (consent.schemaVersion !== CONSENT_SCHEMA_VERSION) {
      return null  // Outdated schema, needs re-consent
    }

    // Check expiration
    if (new Date(consent.expiresAt) < new Date()) {
      clearStoredConsent()
      return null  // Expired, needs re-consent
    }

    // Check policy version (if requires reconsent)
    // This would need to be checked against server-side policy version

    return consent
  } catch {
    return null
  }
}

/**
 * Save consent to localStorage
 */
function saveStoredConsent(consent: StoredCookieConsent): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONSENT_COOKIE_NAME, JSON.stringify(consent))
}

/**
 * Clear stored consent from localStorage
 */
export function clearStoredConsent(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CONSENT_COOKIE_NAME)
}

// ============================================================================
// Consent State Helpers
// ============================================================================

/**
 * Normalize consent state (ensure necessary is always true)
 */
export function normalizeConsent(consent: Partial<CookieConsentState>): CookieConsentState {
  return {
    necessary: true,  // Always true
    functional: consent.functional ?? false,
    analytics: consent.analytics ?? false,
    marketing: consent.marketing ?? false,
  }
}

/**
 * Get default consent based on privacy signals
 */
export function getDefaultConsent(): CookieConsentState {
  const signals = detectPrivacySignals()
  
  // If privacy signal is enabled, default to minimal consent
  if (signals.dnt || signals.gpc) {
    return DEFAULT_CONSENT
  }

  // Otherwise, still default to minimal but UI can suggest different
  return DEFAULT_CONSENT
}

/**
 * Get consent for accepting all categories
 */
export function getAllAcceptedConsent(): CookieConsentState {
  return {
    necessary: true,
    functional: true,
    analytics: true,
    marketing: true,
  }
}

// ============================================================================
// Main Consent Operations
// ============================================================================

/**
 * Get current consent state
 */
export function getConsent(): CookieConsentState | null {
  const stored = getStoredConsent()
  if (!stored) return null
  return stored.categories
}

/**
 * Check if consent has been given (any choice made)
 */
export function hasConsent(): boolean {
  return getStoredConsent() !== null
}

/**
 * Check if a specific category is consented
 */
export function hasConsentFor(category: keyof CookieConsentState): boolean {
  const consent = getConsent()
  if (!consent) return category === 'necessary'  // Necessary always allowed
  return consent[category] === true
}

/**
 * Save consent choice
 */
export function saveConsent(
  categories: Partial<CookieConsentState>,
  source: 'banner' | 'settings',
  locale: string
): StoredCookieConsent {
  const now = new Date()
  const signals = detectPrivacySignals()
  const existingConsent = getStoredConsent()
  
  const normalizedCategories = normalizeConsent(categories)
  
  const consent: StoredCookieConsent = {
    consentId: existingConsent?.consentId ?? generateConsentId(),
    schemaVersion: CONSENT_SCHEMA_VERSION,
    policyVersion: CONSENT_POLICY_VERSION,
    categories: normalizedCategories,
    grantedAt: existingConsent?.grantedAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONSENT_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    source,
    locale,
    dntEnabled: signals.dnt,
    gpcEnabled: signals.gpc,
  }

  // Save to localStorage
  saveStoredConsent(consent)

  // Apply consent (enable/disable tracking)
  applyConsent(consent.categories)

  // Log consent event (async, non-blocking)
  const eventType = existingConsent ? 'updated' : 'granted'
  logConsentEvent(consent, eventType, existingConsent?.categories)

  return consent
}

/**
 * Accept all cookies
 */
export function acceptAll(locale: string): StoredCookieConsent {
  return saveConsent(getAllAcceptedConsent(), 'banner', locale)
}

/**
 * Deny all non-essential cookies
 */
export function denyAll(locale: string): StoredCookieConsent {
  return saveConsent(DEFAULT_CONSENT, 'banner', locale)
}

/**
 * Update consent with specific categories
 */
export function updateConsent(
  categories: Partial<CookieConsentState>,
  locale: string
): StoredCookieConsent {
  return saveConsent(categories, 'settings', locale)
}

/**
 * Withdraw consent (clear all)
 */
export function withdrawConsent(): void {
  const existing = getStoredConsent()
  
  if (existing) {
    // Log withdrawal before clearing
    logConsentEvent(
      { ...existing, categories: DEFAULT_CONSENT },
      'withdrawn',
      existing.categories
    )
  }

  clearStoredConsent()
  applyConsent(DEFAULT_CONSENT)
}

// ============================================================================
// Script/Tracking Control
// ============================================================================

// Declare global window types for tracking
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    _hsq?: unknown[]
    Intercom?: (...args: unknown[]) => void
    hj?: (...args: unknown[]) => void
  }
}

/**
 * Apply consent settings to third-party scripts
 */
export function applyConsent(consent: CookieConsentState): void {
  if (typeof window === 'undefined') return

  // Google Analytics / GTM consent mode
  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      functionality_storage: consent.functional ? 'granted' : 'denied',
      personalization_storage: consent.functional ? 'granted' : 'denied',
    })
  }

  // Facebook Pixel
  if (window.fbq) {
    if (consent.marketing) {
      window.fbq('consent', 'grant')
    } else {
      window.fbq('consent', 'revoke')
    }
  }

  // Hotjar
  if (window.hj && !consent.analytics) {
    // Hotjar doesn't have a consent API, would need to not load it
  }

  // Intercom
  if (window.Intercom && !consent.functional) {
    window.Intercom('shutdown')
  }

  // Emit custom event for other scripts to listen to
  window.dispatchEvent(new CustomEvent('cookieConsentUpdated', {
    detail: consent
  }))
}

/**
 * Initialize default consent state before scripts load
 * Call this early in the page lifecycle
 */
export function initializeConsentDefaults(): void {
  if (typeof window === 'undefined') return

  // Initialize Google consent mode with defaults (denied)
  window.dataLayer = window.dataLayer || []
  
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    wait_for_update: 500,  // Wait for consent banner
  })

  // Apply stored consent if exists
  const stored = getStoredConsent()
  if (stored) {
    applyConsent(stored.categories)
  }
}

// ============================================================================
// Consent Logging (Server-side)
// ============================================================================

/**
 * Log consent event to server
 */
async function logConsentEvent(
  consent: StoredCookieConsent,
  eventType: ConsentAuditEvent['eventType'],
  previousState?: CookieConsentState
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const event: ConsentAuditEvent = {
      consentId: consent.consentId,
      eventType,
      previousState,
      newState: consent.categories,
      consentVersion: consent.policyVersion,
      locale: consent.locale,
      dntEnabled: consent.dntEnabled,
      gpcEnabled: consent.gpcEnabled,
      pageUrl: window.location.href,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent,
    }

    // Fire and forget - don't block on this
    fetch('/api/consent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      // Silent fail - consent logging shouldn't block UX
      console.debug('[CookieConsent] Failed to log consent event')
    })
  } catch {
    // Silent fail
  }
}

// ============================================================================
// React Hook Support
// ============================================================================

/**
 * Get the full stored consent object
 * Useful for React hooks that need to track updates
 */
export function getFullConsent(): StoredCookieConsent | null {
  return getStoredConsent()
}

/**
 * Check if consent needs to be shown
 * Returns true if:
 * - No consent stored
 * - Consent expired
 * - Schema version changed
 * - Policy version requires re-consent
 */
export function shouldShowConsentBanner(): boolean {
  const stored = getStoredConsent()
  
  if (!stored) return true
  
  // Check expiration
  if (new Date(stored.expiresAt) < new Date()) {
    return true
  }
  
  // Check schema version
  if (stored.schemaVersion !== CONSENT_SCHEMA_VERSION) {
    return true
  }
  
  // Note: Policy version check should be done server-side
  // to compare against current active policy version
  
  return false
}
