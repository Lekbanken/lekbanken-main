'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Switch,
} from '@/components/ui'
import {
  COOKIE_CATEGORIES,
  COOKIE_CONSENT_SCHEMA_VERSION,
  COOKIE_CONSENT_RETENTION_DAYS,
  DEFAULT_COOKIE_CONSENT,
  type CookieCategory,
} from '@/lib/legal/constants'
import type { CookieConsentState } from '@/lib/legal/consent-types'
import type { CookieCatalogRow } from '@/lib/legal/types'
import {
  clearStoredConsent,
  detectPrivacySignals,
  normalizeConsent,
  readStoredConsent,
  writeStoredConsent,
} from '@/lib/legal/cookie-consent'
import {
  deleteCookieConsentHistory,
  getCookieCatalog,
  getCookieConsentReceipt,
  getCookieConsentState,
  saveCookieConsent,
} from '@/app/actions/legal'
import { useAuth } from '@/lib/supabase/auth'

const CATEGORY_LABELS: Record<CookieCategory, string> = {
  necessary: 'Necessary',
  functional: 'Functional',
  analytics: 'Analytics',
  marketing: 'Marketing',
}

const CATEGORY_DESCRIPTIONS: Record<CookieCategory, string> = {
  necessary: 'Required to keep core services running.',
  functional: 'Preferences and enhanced features.',
  analytics: 'Anonymous usage analytics and measurements.',
  marketing: 'Marketing and advertising tracking.',
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString()
}

export default function CookiePreferencesPage() {
  const { user, isLoading } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [catalog, setCatalog] = useState<CookieCatalogRow[]>([])
  const [consent, setConsent] = useState<CookieConsentState>(DEFAULT_COOKIE_CONSENT)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [source, setSource] = useState<'banner' | 'settings' | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [gpcEnforced, setGpcEnforced] = useState(false)

  useEffect(() => {
    const signals = detectPrivacySignals()
    setGpcEnforced(signals.gpc || signals.dnt)
  }, [])

  useEffect(() => {
    let active = true

    const load = async () => {
      const catalogResult = await getCookieCatalog()
      if (active && catalogResult.success && catalogResult.data) {
        setCatalog(catalogResult.data)
      }

      const stored = readStoredConsent()
      if (active && stored?.categories && stored.schemaVersion === COOKIE_CONSENT_SCHEMA_VERSION) {
        setConsent(normalizeConsent(stored.categories))
        setUpdatedAt(stored.updatedAt)
        setSource(stored.source)
      }

      if (user) {
        const serverResult = await getCookieConsentState()
        if (active && serverResult.success && serverResult.data) {
          const next = normalizeConsent(serverResult.data.categories)
          setConsent(next)
          setUpdatedAt(serverResult.data.updatedAt)
          setSource(serverResult.data.source)
          writeStoredConsent(next, serverResult.data.source ?? 'settings')
        }
      }
    }

    if (!isLoading) {
      void load()
    }

    return () => {
      active = false
    }
  }, [user, isLoading])

  const catalogByCategory = useMemo(() => {
    return COOKIE_CATEGORIES.reduce<Record<CookieCategory, CookieCatalogRow[]>>((acc, category) => {
      acc[category] = catalog.filter((item) => item.category === category)
      return acc
    }, {
      necessary: [],
      functional: [],
      analytics: [],
      marketing: [],
    })
  }, [catalog])

  const effectiveConsent = useMemo(() => {
    if (!gpcEnforced) return consent
    return { ...DEFAULT_COOKIE_CONSENT }
  }, [consent, gpcEnforced])

  const handleToggle = (category: CookieCategory, nextValue: boolean) => {
    if (category === 'necessary') return
    if (gpcEnforced) return
    setConsent((prev) => ({
      ...prev,
      [category]: nextValue,
    }))
  }

  const handleSave = () => {
    setNotice(null)
    const normalized = normalizeConsent(effectiveConsent)

    writeStoredConsent(normalized, 'settings')
    setConsent(normalized)
    setUpdatedAt(new Date().toISOString())
    setSource('settings')
    setNotice({ type: 'success', message: 'Preferences saved.' })

    if (!user) return

    startTransition(() => {
      void saveCookieConsent(normalized, 'settings')
    })
  }

  const handleDownloadReceipt = async () => {
    setNotice(null)
    if (!user) {
      setNotice({ type: 'error', message: 'Sign in to download your receipt.' })
      return
    }

    const result = await getCookieConsentReceipt()
    if (!result.success || !result.data) {
      setNotice({ type: 'error', message: result.error ?? 'Failed to load receipt.' })
      return
    }

    const receipt = {
      generatedAt: new Date().toISOString(),
      schemaVersion: result.data.schemaVersion,
      updatedAt: result.data.updatedAt,
      categories: result.data.categories,
      entries: result.data.entries,
    }

    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `lekbanken-cookie-consent-${new Date().toISOString().split('T')[0]}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = async () => {
    setNotice(null)
    if (user) {
      const result = await deleteCookieConsentHistory()
      if (!result.success) {
        setNotice({ type: 'error', message: result.error ?? 'Failed to reset consent.' })
        return
      }
    }

    clearStoredConsent()
    setConsent(DEFAULT_COOKIE_CONSENT)
    setUpdatedAt(null)
    setSource(null)
    setNotice({ type: 'success', message: 'Consent history cleared.' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cookie preferences</h1>
          <p className="text-sm text-muted-foreground">
            Manage how Lekbanken uses cookies on your device.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Schema v{COOKIE_CONSENT_SCHEMA_VERSION}</Badge>
          {source && (
            <Badge variant="secondary">Source: {source}</Badge>
          )}
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {notice.message}
        </div>
      )}

      {gpcEnforced && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Global Privacy Control or Do Not Track is enabled. Only necessary cookies are allowed.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cookie categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {COOKIE_CATEGORIES.map((category) => (
              <div key={category} className="space-y-2 border-b border-border pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[category]}</p>
                    <p className="text-xs text-muted-foreground">{CATEGORY_DESCRIPTIONS[category]}</p>
                  </div>
                  <Switch
                    checked={effectiveConsent[category]}
                    onCheckedChange={(checked) => handleToggle(category, checked)}
                    disabled={category === 'necessary' || gpcEnforced}
                  />
                </div>
                {catalogByCategory[category]?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {catalogByCategory[category].map((entry) => (
                      <div key={entry.key} className="flex items-center justify-between gap-2">
                        <span>{entry.key}</span>
                        <span>{entry.provider ?? 'Lekbanken'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consent summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Last updated</span>
                <span className="text-foreground">{formatDate(updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active categories</span>
                <span className="text-foreground">
                  {Object.values(effectiveConsent).filter(Boolean).length}/{COOKIE_CATEGORIES.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Retention</span>
                <span className="text-foreground">{COOKIE_CONSENT_RETENTION_DAYS} days</span>
              </div>
              <div className="pt-3">
                <Link href="/legal/cookie-policy" className="text-primary hover:underline">
                  Read cookie policy
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save preferences'}
              </Button>
              <Button variant="outline" onClick={handleDownloadReceipt}>
                Download consent receipt
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Reset consent
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
