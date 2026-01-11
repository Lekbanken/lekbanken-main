"use client"

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  COOKIE_CONSENT_SCHEMA_VERSION,
  COOKIE_CONSENT_STORAGE_KEY,
  DEFAULT_COOKIE_CONSENT,
} from '@/lib/legal/constants'
import type { CookieConsentState } from '@/lib/legal/consent-types'
import { saveCookieConsent } from '@/app/actions/legal'

type StoredConsent = {
  schemaVersion: number
  categories: CookieConsentState
  updatedAt: string
  source: 'banner' | 'settings'
}

function readStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredConsent
  } catch {
    return null
  }
}

function detectPrivacySignals(): { gpc: boolean; dnt: boolean } {
  if (typeof window === 'undefined') return { gpc: false, dnt: false }
  const gpc = Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl)
  const dnt = navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes'
  return { gpc, dnt }
}

export function CookieConsentBanner() {
  const t = useTranslations('legal.cookieBanner')
  const { user, isLoading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [signals, setSignals] = useState({ gpc: false, dnt: false })
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (isLoading) return
    const stored = readStoredConsent()
    const privacySignals = detectPrivacySignals()
    setSignals(privacySignals)

    if (!stored || stored.schemaVersion !== COOKIE_CONSENT_SCHEMA_VERSION) {
      setIsOpen(true)
      return
    }

    setIsOpen(false)
  }, [isLoading])

  const gpcEnforced = signals.gpc || signals.dnt

  const appliedDefault = useMemo<CookieConsentState>(() => {
    if (gpcEnforced) {
      return { ...DEFAULT_COOKIE_CONSENT }
    }
    return { ...DEFAULT_COOKIE_CONSENT, functional: true, analytics: true, marketing: true }
  }, [gpcEnforced])

  const persistConsent = (categories: CookieConsentState, source: 'banner' | 'settings') => {
    const payload: StoredConsent = {
      schemaVersion: COOKIE_CONSENT_SCHEMA_VERSION,
      categories,
      updatedAt: new Date().toISOString(),
      source,
    }

    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload))
    setIsOpen(false)

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
