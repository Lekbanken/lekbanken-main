/**
 * useCookieConsent Hook
 * React hook for managing cookie consent state
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import type { CookieConsentState, StoredCookieConsent, PrivacySignals } from './types'
import {
  getStoredConsent,
  saveConsent,
  acceptAll,
  denyAll,
  withdrawConsent,
  detectPrivacySignals,
  shouldShowConsentBanner,
  hasConsentFor,
} from './cookie-consent-manager'

export interface UseCookieConsentReturn {
  // State
  consent: CookieConsentState | null
  storedConsent: StoredCookieConsent | null
  isLoading: boolean
  showBanner: boolean
  privacySignals: PrivacySignals
  
  // Actions
  acceptAllCookies: () => void
  denyAllCookies: () => void
  savePreferences: (categories: Partial<CookieConsentState>) => void
  withdrawAllConsent: () => void
  reopenBanner: () => void
  
  // Helpers
  hasConsentFor: (category: keyof CookieConsentState) => boolean
}

export function useCookieConsent(): UseCookieConsentReturn {
  const locale = useLocale()
  
  // Initialize state with lazy initializer to avoid effects
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        storedConsent: null as StoredCookieConsent | null,
        isLoading: true,
        showBanner: false,
        privacySignals: { dnt: false, gpc: false } as PrivacySignals,
      }
    }
    
    const stored = getStoredConsent()
    const signals = detectPrivacySignals()
    const shouldShow = shouldShowConsentBanner()
    
    return {
      storedConsent: stored,
      isLoading: false,
      showBanner: shouldShow,
      privacySignals: signals,
    }
  })

  // Handle auto-deny for privacy signals on mount (client-side only)
  useEffect(() => {
    if (state.showBanner && (state.privacySignals.dnt || state.privacySignals.gpc)) {
      // Give a small delay to allow banner to mount before auto-handling
      const timer = setTimeout(() => {
        if (shouldShowConsentBanner()) {
          denyAll(locale)
          setState(prev => ({
            ...prev,
            storedConsent: getStoredConsent(),
            showBanner: false,
          }))
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [locale, state.showBanner, state.privacySignals.dnt, state.privacySignals.gpc])

  // Listen for consent updates from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'lb-cookie-consent') {
        const stored = getStoredConsent()
        setState(prev => ({
          ...prev,
          storedConsent: stored,
          showBanner: shouldShowConsentBanner(),
        }))
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const acceptAllCookies = useCallback(() => {
    const newConsent = acceptAll(locale)
    setState(prev => ({
      ...prev,
      storedConsent: newConsent,
      showBanner: false,
    }))
  }, [locale])

  const denyAllCookies = useCallback(() => {
    const newConsent = denyAll(locale)
    setState(prev => ({
      ...prev,
      storedConsent: newConsent,
      showBanner: false,
    }))
  }, [locale])

  const savePreferences = useCallback((categories: Partial<CookieConsentState>) => {
    const newConsent = saveConsent(categories, 'settings', locale)
    setState(prev => ({
      ...prev,
      storedConsent: newConsent,
      showBanner: false,
    }))
  }, [locale])

  const withdrawAllConsent = useCallback(() => {
    withdrawConsent()
    setState(prev => ({
      ...prev,
      storedConsent: null,
      showBanner: true,
    }))
  }, [])

  const reopenBanner = useCallback(() => {
    setState(prev => ({
      ...prev,
      showBanner: true,
    }))
  }, [])

  const checkConsentFor = useCallback((category: keyof CookieConsentState): boolean => {
    return hasConsentFor(category)
  }, [])

  return {
    consent: state.storedConsent?.categories ?? null,
    storedConsent: state.storedConsent,
    isLoading: state.isLoading,
    showBanner: state.showBanner,
    privacySignals: state.privacySignals,
    acceptAllCookies,
    denyAllCookies,
    savePreferences,
    withdrawAllConsent,
    reopenBanner,
    hasConsentFor: checkConsentFor,
  }
}

/**
 * Hook for conditional rendering based on consent
 * Useful for lazy-loading components that require consent
 */
export function useConsentGate(requiredCategory: keyof CookieConsentState): {
  isAllowed: boolean
  isLoading: boolean
} {
  const { consent, isLoading } = useCookieConsent()

  const isAllowed = !isLoading && (
    requiredCategory === 'necessary' || 
    (consent?.[requiredCategory] ?? false)
  )

  return { isAllowed, isLoading }
}
