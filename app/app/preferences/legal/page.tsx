'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useAuth } from '@/lib/supabase/auth'
import type { LegalDocScope, LegalDocType } from '@/lib/legal/types'
import {
  LEGAL_DOC_LABELS,
  LEGAL_DOC_PUBLIC_ROUTES,
  LEGAL_LOCALE_LABELS,
} from '@/lib/legal/doc-metadata'
import {
  getLegalAcceptanceReceipt,
  type LegalAcceptanceReceipt,
} from '@/app/actions/legal'

function formatDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString()
}

function resolveDocLink(type: LegalDocType, scope: LegalDocScope) {
  if (scope !== 'global') return null
  return LEGAL_DOC_PUBLIC_ROUTES[type] ?? null
}

export default function LegalPreferencesPage() {
  const t = useTranslations('app.preferences.legal')
  const { user, isLoading } = useAuth()
  const [receipt, setReceipt] = useState<LegalAcceptanceReceipt | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const authNotice = useMemo(() => {
    if (isLoading) return null
    if (user) return null
    return { type: 'error', message: t('signInRequired') }
  }, [isLoading, user, t])

  const isFetching = useMemo(() => {
    if (!user || isLoading) return false
    return !receipt && !notice
  }, [user, isLoading, receipt, notice])

  useEffect(() => {
    if (isLoading) return
    if (!user) return

    let active = true

    getLegalAcceptanceReceipt()
      .then((result) => {
        if (!active) return
        if (!result.success || !result.data) {
          setNotice({ type: 'error', message: result.error ?? t('loadFailed') })
          setReceipt(null)
          return
        }
        setReceipt(result.data)
        setNotice(null)
      })
      .catch(() => {
        if (!active) return
        setNotice({ type: 'error', message: t('loadFailed') })
        setReceipt(null)
      })

    return () => {
      active = false
    }
  }, [user, isLoading, t])

  const entries = user ? receipt?.entries ?? [] : []
  const acceptedCount = entries.length

  const displayNotice = authNotice ?? notice

  const lastAccepted = useMemo(() => {
    return receipt?.updatedAt ?? null
  }, [receipt])

  const handleDownload = () => {
    if (!receipt) {
      setNotice({ type: 'error', message: t('noReceipt') })
      return
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      updatedAt: receipt.updatedAt,
      entries: receipt.entries,
      missingDocuments: receipt.missingDocuments,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `lekbanken-legal-acceptance-${new Date().toISOString().split('T')[0]}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{t('accepted', { count: acceptedCount })}</Badge>
          {lastAccepted && (
            <Badge variant="secondary">{t('lastAccepted', { date: formatDate(lastAccepted) })}</Badge>
          )}
        </div>
      </div>

      {displayNotice && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            displayNotice.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {displayNotice.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('acceptedDocuments')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFetching && (
              <p className="text-sm text-muted-foreground">{t('loadingReceipts')}</p>
            )}
            {!isFetching && acceptedCount === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('noRecordsYet')}
              </p>
            )}
            {entries.map((entry) => {
              const doc = entry.document
              const label = doc ? LEGAL_DOC_LABELS[doc.type] : t('unknownDocument')
              const locale = doc ? LEGAL_LOCALE_LABELS[doc.locale] : entry.acceptedLocale
              const route = doc ? resolveDocLink(doc.type, doc.scope) : null
              return (
                <div key={`${entry.documentId}-${entry.acceptedAt}`} className="rounded-lg border border-border px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {doc ? `Version ${doc.version}` : t('versionUnavailable')} · {locale}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('acceptedAt', { date: formatDate(entry.acceptedAt) })}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{t('scope', { scope: doc?.scope ?? t('unknownScope') })}</Badge>
                    {route && (
                      <Link href={route} className="text-primary hover:underline">
                        {t('viewCurrentVersion')}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>{t('totalAccepted')}</span>
                <span className="text-foreground">{acceptedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('lastAcceptedLabel')}</span>
                <span className="text-foreground">{formatDate(lastAccepted)}</span>
              </div>
              {receipt?.missingDocuments?.length ? (
                <div className="text-xs text-amber-600">
                  {t('missingDocuments', { count: receipt.missingDocuments.length })}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleDownload} disabled={!receipt || acceptedCount === 0}>
                {t('downloadReceipt')}
              </Button>
              <Link
                href="/legal/terms"
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('viewLegalPages')}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
