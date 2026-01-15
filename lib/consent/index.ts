/**
 * Cookie Consent Module
 * Export all consent-related utilities
 */

// Types
export type {
  CookieCategory,
  CookieConsentState,
  StoredCookieConsent,
  CookieCatalogEntry,
  ConsentAuditEvent,
  PrivacySignals,
  ConsentPolicyVersion,
} from './types'

export { COOKIE_CATEGORIES } from './types'

// Manager
export {
  CONSENT_COOKIE_NAME,
  CONSENT_SCHEMA_VERSION,
  CONSENT_POLICY_VERSION,
  CONSENT_DURATION_DAYS,
  DEFAULT_CONSENT,
  detectPrivacySignals,
  hasPrivacySignal,
  getStoredConsent,
  clearStoredConsent,
  normalizeConsent,
  getDefaultConsent,
  getAllAcceptedConsent,
  getConsent,
  hasConsent,
  hasConsentFor,
  saveConsent,
  acceptAll,
  denyAll,
  updateConsent,
  withdrawConsent,
  applyConsent,
  initializeConsentDefaults,
  getFullConsent,
  shouldShowConsentBanner,
} from './cookie-consent-manager'

// React Hook
export {
  useCookieConsent,
  useConsentGate,
  type UseCookieConsentReturn,
} from './use-cookie-consent'
