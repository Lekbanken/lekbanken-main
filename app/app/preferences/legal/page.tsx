'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
  const { user, isLoading } = useAuth()
  const [receipt, setReceipt] = useState<LegalAcceptanceReceipt | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      setNotice({ type: 'error', message: 'Sign in to view your legal receipts.' })
      return
    }

    let active = true
    setIsFetching(true)

    getLegalAcceptanceReceipt()
      .then((result) => {
        if (!active) return
        if (!result.success || !result.data) {
          setNotice({ type: 'error', message: result.error ?? 'Failed to load receipts.' })
          setReceipt(null)
          return
        }
        setReceipt(result.data)
        setNotice(null)
      })
      .catch(() => {
        if (!active) return
        setNotice({ type: 'error', message: 'Failed to load receipts.' })
        setReceipt(null)
      })
      .finally(() => {
        if (!active) return
        setIsFetching(false)
      })

    return () => {
      active = false
    }
  }, [user, isLoading])

  const entries = receipt?.entries ?? []
  const acceptedCount = entries.length

  const lastAccepted = useMemo(() => {
    return receipt?.updatedAt ?? null
  }, [receipt])

  const handleDownload = () => {
    if (!receipt) {
      setNotice({ type: 'error', message: 'No receipt data available.' })
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
          <h1 className="text-2xl font-bold text-foreground">Legal acceptances</h1>
          <p className="text-sm text-muted-foreground">
            Review the agreements you have accepted and download a receipt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{acceptedCount} accepted</Badge>
          {lastAccepted && (
            <Badge variant="secondary">Last accepted: {formatDate(lastAccepted)}</Badge>
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

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Accepted documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFetching && (
              <p className="text-sm text-muted-foreground">Loading receipts...</p>
            )}
            {!isFetching && acceptedCount === 0 && (
              <p className="text-sm text-muted-foreground">
                No acceptance records found yet.
              </p>
            )}
            {entries.map((entry) => {
              const doc = entry.document
              const label = doc ? LEGAL_DOC_LABELS[doc.type] : 'Unknown document'
              const locale = doc ? LEGAL_LOCALE_LABELS[doc.locale] : entry.acceptedLocale
              const route = doc ? resolveDocLink(doc.type, doc.scope) : null
              return (
                <div key={`${entry.documentId}-${entry.acceptedAt}`} className="rounded-lg border border-border px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {doc ? `Version ${doc.version}` : 'Version unavailable'} · {locale}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Accepted {formatDate(entry.acceptedAt)}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{doc?.scope ?? 'unknown'} scope</Badge>
                    {route && (
                      <Link href={route} className="text-primary hover:underline">
                        View current version
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
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Total accepted</span>
                <span className="text-foreground">{acceptedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last accepted</span>
                <span className="text-foreground">{formatDate(lastAccepted)}</span>
              </div>
              {receipt?.missingDocuments?.length ? (
                <div className="text-xs text-amber-600">
                  {receipt.missingDocuments.length} document(s) are no longer available.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleDownload} disabled={!receipt || acceptedCount === 0}>
                Download acceptance receipt
              </Button>
              <Link
                href="/legal/terms"
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                View legal pages
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
