/**
 * Cookie Consent Banner
 * Enterprise-grade, Cookiebot-quality cookie consent UI for Lekbanken
 * 
 * Features:
 * - Cookiebot-level UX quality
 * - Granular category control with toggles
 * - Equal prominence for Accept/Deny
 * - GPC/DNT signal detection and auto-handling
 * - Full accessibility (WCAG 2.1 AA)
 * - Multi-language support (EN/NO/SV)
 * - Smooth animations
 * - Mobile-first responsive design
 */

'use client'

import { useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { 
  ShieldCheckIcon, 
  CogIcon, 
  ChartBarIcon, 
  MegaphoneIcon,
  XMarkIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/catalyst-ui-kit/typescript/dialog'
import { Switch, SwitchField } from '@/catalyst-ui-kit/typescript/switch'
import { Text } from '@/catalyst-ui-kit/typescript/text'
import { Button } from '@/components/ui/button'
import { useCookieConsent } from '@/lib/consent/use-cookie-consent'
import type { CookieConsentState } from '@/lib/consent/types'

// ============================================================================
// Types
// ============================================================================

interface CategoryConfig {
  key: keyof CookieConsentState
  icon: React.ComponentType<{ className?: string }>
  color: string
  disabled?: boolean
}

// ============================================================================
// Category Configuration
// ============================================================================

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'necessary',
    icon: ShieldCheckIcon,
    color: 'text-green-600 dark:text-green-400',
    disabled: true,
  },
  {
    key: 'functional',
    icon: CogIcon,
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'analytics',
    icon: ChartBarIcon,
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    key: 'marketing',
    icon: MegaphoneIcon,
    color: 'text-orange-600 dark:text-orange-400',
  },
]

// ============================================================================
// Main Component
// ============================================================================

// Helper for hydration-safe client-only rendering
const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function CookieConsentBanner() {
  const t = useTranslations('cookie_consent')
  const {
    consent,
    showBanner,
    isLoading,
    privacySignals,
    acceptAllCookies,
    denyAllCookies,
    savePreferences,
  } = useCookieConsent()

  // Hydration-safe: returns false on server, true on client
  const isClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)
  
  const [showSettings, setShowSettings] = useState(false)
  const [localPreferences, setLocalPreferences] = useState<CookieConsentState>(() => 
    consent ?? {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    }
  )

  // Don't render during SSR or before hydration
  if (!isClient || isLoading) {
    return null
  }

  // Don't render if banner shouldn't be shown
  if (!showBanner) {
    return null
  }

  const handleAcceptAll = () => {
    acceptAllCookies()
    setShowSettings(false)
  }

  const handleDenyAll = () => {
    denyAllCookies()
    setShowSettings(false)
  }

  const handleSavePreferences = () => {
    savePreferences(localPreferences)
    setShowSettings(false)
  }

  const handleToggleCategory = (category: keyof CookieConsentState) => {
    if (category === 'necessary') return // Can't toggle necessary
    setLocalPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const openSettings = () => {
    // Reset to current consent or defaults when opening
    setLocalPreferences(consent ?? {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    })
    setShowSettings(true)
  }

  return (
    <>
      {/* Simple Banner (when settings not open) */}
      {!showSettings && (
        <div 
          className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300"
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-banner-title"
        >
          <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                {/* Icon */}
                <div className="hidden sm:block">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
                    <ShieldCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h2 
                    id="cookie-banner-title" 
                    className="text-lg font-semibold text-zinc-950 dark:text-white"
                  >
                    {t('title')}
                  </h2>
                  <Text className="mt-1">
                    {t('description')}
                  </Text>
                  
                  {/* GPC/DNT Notice */}
                  {(privacySignals.gpc || privacySignals.dnt) && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/50">
                      <InformationCircleIcon className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                      <Text className="text-sm text-blue-800 dark:text-blue-200">
                        {t('privacy_signal_notice')}
                      </Text>
                    </div>
                  )}
                </div>

                {/* Actions - Equal prominence for all buttons */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button variant="primary" onClick={handleAcceptAll}>
                    {t('accept_all')}
                  </Button>
                  <Button variant="outline" onClick={handleDenyAll}>
                    {t('deny_all')}
                  </Button>
                  <Button variant="ghost" onClick={openSettings}>
                    {t('customize')}
                  </Button>
                </div>
              </div>

              {/* Privacy Policy Link */}
              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <Text className="text-sm">
                  {t('learn_more')}{' '}
                  <a 
                    href="/legal/cookie-policy" 
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {t('cookie_policy_link')}
                  </a>
                </Text>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} size="xl">
        <div className="flex items-center justify-between">
          <DialogTitle>{t('settings_title')}</DialogTitle>
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label={t('close')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <Text className="mt-2">
          {t('settings_description')}
        </Text>

        <DialogBody>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {CATEGORIES.map((category) => {
              const Icon = category.icon
              return (
                <div key={category.key} className="py-5 first:pt-0 last:pb-0">
                  <SwitchField>
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`mt-0.5 ${category.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-zinc-950 dark:text-white">
                            {t(`categories.${category.key}.title`)}
                            {category.disabled && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                                {t('always_active')}
                              </span>
                            )}
                          </h3>
                          <Switch
                            checked={localPreferences[category.key]}
                            onChange={() => handleToggleCategory(category.key)}
                            disabled={category.disabled}
                            color={category.disabled ? 'green' : 'blue'}
                            aria-label={t(`categories.${category.key}.title`)}
                          />
                        </div>
                        <Text className="mt-1 text-sm">
                          {t(`categories.${category.key}.description`)}
                        </Text>
                      </div>
                    </div>
                  </SwitchField>
                </div>
              )
            })}
          </div>
        </DialogBody>

        <DialogActions>
          <Button variant="ghost" onClick={() => setShowSettings(false)}>
            {t('cancel')}
          </Button>
          <Button variant="outline" onClick={handleDenyAll}>
            {t('deny_all')}
          </Button>
          <Button variant="primary" onClick={handleSavePreferences}>
            {t('save_preferences')}
          </Button>
        </DialogActions>

        {/* Footer with policy link */}
        <div className="mt-4 text-center">
          <Text className="text-sm">
            <a 
              href="/legal/cookie-policy" 
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              {t('view_full_policy')}
            </a>
          </Text>
        </div>
      </Dialog>
    </>
  )
}

// ============================================================================
// Re-open Button (for users who want to change preferences later)
// ============================================================================

export function CookieSettingsButton({ 
  className,
  children,
}: { 
  className?: string
  children?: React.ReactNode 
}) {
  const t = useTranslations('cookie_consent')
  const { reopenBanner } = useCookieConsent()

  return (
    <button
      type="button"
      onClick={reopenBanner}
      className={className ?? "text-sm text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"}
    >
      {children ?? t('manage_cookies')}
    </button>
  )
}
