import {
  COOKIE_CONSENT_SCHEMA_VERSION,
  COOKIE_CONSENT_STORAGE_KEY,
  DEFAULT_COOKIE_CONSENT,
} from './constants'
import type { CookieConsentState } from './consent-types'

export type StoredCookieConsent = {
  schemaVersion: number
  categories: CookieConsentState
  updatedAt: string
  source: 'banner' | 'settings'
}

export function readStoredConsent(): StoredCookieConsent | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredCookieConsent
  } catch {
    return null
  }
}

export function writeStoredConsent(
  categories: CookieConsentState,
  source: StoredCookieConsent['source']
) {
  if (typeof window === 'undefined') return
  const payload: StoredCookieConsent = {
    schemaVersion: COOKIE_CONSENT_SCHEMA_VERSION,
    categories,
    updatedAt: new Date().toISOString(),
    source,
  }
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload))
}

export function clearStoredConsent() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY)
}

export function detectPrivacySignals(): { gpc: boolean; dnt: boolean } {
  if (typeof window === 'undefined') return { gpc: false, dnt: false }
  const gpc = Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl)
  const dnt = navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes'
  return { gpc, dnt }
}

export function normalizeConsent(consent: CookieConsentState): CookieConsentState {
  return {
    ...DEFAULT_COOKIE_CONSENT,
    ...consent,
    necessary: true,
  }
}

export function getDefaultConsent(gpcEnforced: boolean): CookieConsentState {
  if (gpcEnforced) {
    return { ...DEFAULT_COOKIE_CONSENT }
  }
  return {
    ...DEFAULT_COOKIE_CONSENT,
    functional: true,
    analytics: true,
    marketing: true,
  }
}
