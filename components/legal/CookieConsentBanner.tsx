"use client"

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { COOKIE_CONSENT_SCHEMA_VERSION, DEFAULT_COOKIE_CONSENT } from '@/lib/legal/constants'
import type { CookieConsentState } from '@/lib/legal/consent-types'
import {
  detectPrivacySignals,
  getDefaultConsent,
  readStoredConsent,
  writeStoredConsent,
} from '@/lib/legal/cookie-consent'
import { saveCookieConsent } from '@/app/actions/legal'

export function CookieConsentBanner() {
  const t = useTranslations('legal.cookieBanner')
  const { user, isLoading } = useAuth()
  const [isDismissed, setIsDismissed] = useState(false)
  const [, startTransition] = useTransition()

  const signals = useMemo(() => detectPrivacySignals(), [])
  const storedConsent = useMemo(() => (isLoading ? null : readStoredConsent()), [isLoading])
  const gpcEnforced = signals.gpc || signals.dnt
  const isOpen = !isDismissed && !isLoading && (!storedConsent || storedConsent.schemaVersion !== COOKIE_CONSENT_SCHEMA_VERSION)

  const appliedDefault = useMemo<CookieConsentState>(() => {
    return getDefaultConsent(gpcEnforced)
  }, [gpcEnforced])

  const persistConsent = (categories: CookieConsentState, source: 'banner' | 'settings') => {
    writeStoredConsent(categories, source)
    setIsDismissed(true)

    if (!user) return

    startTransition(() => {
      void saveCookieConsent(categories, source)
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 md:inset-x-auto md:right-6 md:left-auto md:bottom-6 md:w-[420px]">
      <Card padding="sm" className="border-border bg-card/95 shadow-xl backdrop-blur">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
          {gpcEnforced && (
            <p className="text-xs text-muted-foreground">{t('gpcNotice')}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => persistConsent(appliedDefault, 'banner')}
            >
              {t('acceptAll')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => persistConsent(DEFAULT_COOKIE_CONSENT, 'banner')}
            >
              {t('acceptNecessary')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
