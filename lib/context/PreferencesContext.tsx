'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/supabase/auth'
import type { Database } from '@/types/supabase'
import { TenantContext } from './TenantContext'
import { LOCALE_COOKIE, getLocaleFromLanguageCode } from '@/lib/i18n/config'

type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'
export type LanguageCode = 'NO' | 'SE' | 'EN'

type PreferencesContextType = {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  language: LanguageCode
  showThemeToggleInHeader: boolean
  setTheme: (theme: ThemePreference) => Promise<void> | void
  toggleTheme: () => Promise<void> | void
  setLanguage: (lang: LanguageCode) => Promise<void> | void
  setShowThemeToggleInHeader: (visible: boolean) => Promise<void> | void
}

const THEME_KEY = 'lb-theme'
const LANGUAGE_KEY = 'lb-language'
const TOGGLE_KEY = 'lb-theme-toggle-visible'

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'dark') return 'dark'
  if (preference === 'light') return 'light'
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved === 'dark' ? 'dark' : 'light'
  }
  return resolved
}

function applyLanguage(lang: LanguageCode) {
  if (typeof document !== 'undefined') {
    const htmlLang =
      lang === 'SE'
        ? 'sv'
        : lang === 'NO'
          ? 'no'
          : 'en'
    document.documentElement.lang = htmlLang
  }
}

function useOptionalTenantId() {
  const tenantContext = useContext(TenantContext)
  return tenantContext?.currentTenant?.id ?? null
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, userProfile, updateProfile } = useAuth()
  const tenantId = useOptionalTenantId()

  const [theme, setThemeState] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [language, setLanguageState] = useState<LanguageCode>('NO')
  const [showThemeToggleInHeader, setShowThemeToggleState] = useState(true)
  const [userChangedTheme, setUserChangedTheme] = useState(false)
  const [userChangedLanguage, setUserChangedLanguage] = useState(false)
  const initializedRef = useRef(false)

  // Hydrate from localStorage and system preference
  useEffect(() => {
    const storedTheme = typeof window !== 'undefined' ? (localStorage.getItem(THEME_KEY) as ThemePreference | null) : null
    const storedLanguage = typeof window !== 'undefined' ? (localStorage.getItem(LANGUAGE_KEY) as LanguageCode | null) : null
    const storedToggle = typeof window !== 'undefined' ? localStorage.getItem(TOGGLE_KEY) : null

    const initialTheme = storedTheme || 'system'
    const initialLanguage = storedLanguage || 'NO'
    const initialToggle = storedToggle === null ? true : storedToggle === 'true'

    setThemeState(initialTheme)
    setResolvedTheme(applyTheme(initialTheme))
    setLanguageState(initialLanguage)
    setShowThemeToggleState(initialToggle)

    // Treat persisted choices as intentional so we sync them after login
    setUserChangedTheme(Boolean(storedTheme))
    setUserChangedLanguage(Boolean(storedLanguage))

    applyLanguage(initialLanguage)
    initializedRef.current = true
  }, [])

  // Listen for system changes when using system preference
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        const resolved = media.matches ? 'dark' : 'light'
        setResolvedTheme(resolved)
        applyTheme('system')
      }
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme])

  // Apply and persist theme
  useEffect(() => {
    if (!initializedRef.current) return
    const resolved = applyTheme(theme)
    setResolvedTheme(resolved)
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme)
    }
  }, [theme])

  // Apply and persist language (and sync to next-intl cookie)
  useEffect(() => {
    if (!initializedRef.current) return
    applyLanguage(language)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_KEY, language)
      // Sync to next-intl locale cookie
      const locale = getLocaleFromLanguageCode(language) ?? 'sv'
      document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    }
  }, [language])

  // Persist header toggle visibility for logged out scenarios too
  useEffect(() => {
    if (!initializedRef.current) return
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOGGLE_KEY, showThemeToggleInHeader ? 'true' : 'false')
    }
  }, [showThemeToggleInHeader])

  // Adopt server profile values when present (unless the user has explicitly changed them client-side)
  useEffect(() => {
    if (!userProfile) return

    setShowThemeToggleState((prev) =>
      typeof userProfile.show_theme_toggle_in_header === 'boolean'
        ? userProfile.show_theme_toggle_in_header
        : prev
    )

    if (!userChangedTheme && userProfile.preferred_theme) {
      setThemeState(userProfile.preferred_theme as ThemePreference)
    }

    if (!userChangedLanguage && userProfile.language) {
      setLanguageState(userProfile.language as LanguageCode)
    }
  }, [userProfile, userChangedLanguage, userChangedTheme])

  // Check if user is a demo user (preferences should only be stored locally)
  const isDemoUser = user?.user_metadata?.is_demo_user === true

  // Helper to persist to users table (skipped for demo users)
  const persistUserProfile = useCallback(
    async (updates: Partial<Database['public']['Tables']['users']['Update']>) => {
      if (!user) return
      // Demo users don't persist to database - their preferences are localStorage only
      if (isDemoUser) return
      try {
        await updateProfile(updates)
      } catch (err) {
        console.warn('[preferences] Failed to persist profile updates', err)
      }
    },
    [updateProfile, user, isDemoUser]
  )

  // Helper to sync user_preferences (tenant-scoped) for analytics/use elsewhere
  // Skipped for demo users - their preferences are localStorage only
  const syncUserPreferences = useCallback(
    async (updates: Partial<{ theme: ThemePreference; language: LanguageCode }>) => {
      if (!user || !tenantId || isDemoUser) return
      try {
        await supabase
          .from('user_preferences')
          .upsert(
            {
              tenant_id: tenantId,
              user_id: user.id,
              ...updates,
            },
            { onConflict: 'tenant_id, user_id' }
          )
      } catch (err) {
        console.warn('[preferences] Failed to sync user_preferences', err)
      }
    },
    [tenantId, user, isDemoUser]
  )

  const setTheme = useCallback(
    async (next: ThemePreference) => {
      setThemeState(next)
      setUserChangedTheme(true)
      if (userProfile?.preferred_theme !== next) {
        await persistUserProfile({ preferred_theme: next })
      }
      await syncUserPreferences({ theme: next })
    },
    [persistUserProfile, syncUserPreferences, userProfile?.preferred_theme]
  )

  const toggleTheme = useCallback(async () => {
    const currentResolved = resolveTheme(theme)
    const next: ThemePreference = currentResolved === 'dark' ? 'light' : 'dark'
    await setTheme(next)
  }, [setTheme, theme])

  const setLanguage = useCallback(
    async (next: LanguageCode) => {
      setLanguageState(next)
      setUserChangedLanguage(true)
      if (userProfile?.language !== next) {
        await persistUserProfile({ language: next })
      }
      await syncUserPreferences({ language: next })
    },
    [persistUserProfile, syncUserPreferences, userProfile?.language]
  )

  const setHeaderToggleVisibility = useCallback(
    async (visible: boolean) => {
      setShowThemeToggleState(visible)
      if (userProfile?.show_theme_toggle_in_header !== visible) {
        await persistUserProfile({ show_theme_toggle_in_header: visible })
      }
    },
    [persistUserProfile, userProfile?.show_theme_toggle_in_header]
  )

  // If the user picked preferences before logging in, sync them once we have a profile
  useEffect(() => {
    if (!user || !userProfile) return
    if (userChangedTheme && userProfile.preferred_theme !== theme) {
      void persistUserProfile({ preferred_theme: theme })
      void syncUserPreferences({ theme })
    }
    if (userChangedLanguage && userProfile.language !== language) {
      void persistUserProfile({ language })
      void syncUserPreferences({ language })
    }
  }, [
    language,
    persistUserProfile,
    syncUserPreferences,
    theme,
    user,
    userChangedLanguage,
    userChangedTheme,
    userProfile,
  ])

  const value: PreferencesContextType = {
    theme,
    resolvedTheme,
    language,
    showThemeToggleInHeader,
    setTheme,
    toggleTheme,
    setLanguage,
    setShowThemeToggleInHeader: setHeaderToggleVisibility,
  }

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider')
  }
  return ctx
}
