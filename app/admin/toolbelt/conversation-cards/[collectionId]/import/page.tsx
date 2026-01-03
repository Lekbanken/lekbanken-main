'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AdminBreadcrumbs,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
} from '@/components/admin/shared'
import { Button, Card, CardContent, CardHeader, CardTitle, Textarea } from '@/components/ui'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { CONVERSATION_CARDS_CSV_HEADERS } from '@/features/conversation-cards/csv-format'

type ImportIssue = { row: number; column?: string; message: string }

type ImportResult = { ok: true; imported: number } | { ok: false; error: string; details?: { errors?: ImportIssue[] } }

function getImportedCount(payload: unknown): number {
  const maybe = payload as { imported?: unknown }
  if (typeof maybe.imported === 'number') return maybe.imported
  const coerced = Number(maybe.imported)
  return Number.isFinite(coerced) ? coerced : 0
}

function getErrorPayload(payload: unknown): { error: string; details?: { errors?: ImportIssue[] } } {
  const maybe = payload as { error?: unknown; details?: unknown }
  const error = typeof maybe.error === 'string' && maybe.error.trim() ? maybe.error : 'Import misslyckades'
  const details = typeof maybe.details === 'object' && maybe.details ? (maybe.details as { errors?: ImportIssue[] }) : undefined
  return { error, details }
}

export default function ConversationCardsImportPage() {
  const params = useParams<{ collectionId: string }>()
  const collectionId = params.collectionId
  const router = useRouter()

  const [csvText, setCsvText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const expectedHeader = useMemo(() => CONVERSATION_CARDS_CSV_HEADERS.join(','), [])

  const onPickFile = async (file: File | null) => {
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    setResult(null)
  }

  const onSubmit = async () => {
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/toolbelt/conversation-cards/collections/${collectionId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText }),
      })

      const payload = (await res.json().catch(() => ({}))) as unknown
      if (!res.ok) {
        const err = getErrorPayload(payload)
        setResult({ ok: false, error: err.error, details: err.details })
        return
      }

      setResult({ ok: true, imported: getImportedCount(payload) })
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Import misslyckades' })
    } finally {
      setSubmitting(false)
    }
  }

  const issues = result && !result.ok ? result.details?.errors ?? null : null

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Startsida', href: '/admin' },
          { label: 'Samtalskort', href: '/admin/toolbelt/conversation-cards' },
          { label: 'Samling', href: `/admin/toolbelt/conversation-cards/${collectionId}` },
          { label: 'Import (CSV)' },
        ]}
      />

      <AdminPageHeader
        title="Importera kort (CSV)"
        description="Importerar kort till samlingen. Importen publicerar inte automatiskt."
        icon={<ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" href={`/admin/toolbelt/conversation-cards/${collectionId}`}>
              Tillbaka
            </Button>
            <Button onClick={onSubmit} disabled={submitting || !csvText.trim()}>
              {submitting ? 'Importerar…' : 'Importera'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>CSV-format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Header måste matcha exakt (ordning och stavning):
          </div>
          <div className="rounded-md border border-border bg-muted p-3 text-xs break-all">{expectedHeader}</div>
          <div className="text-sm text-muted-foreground">
            Obs: Den här importen lägger till nya kort. Kör du import flera gånger kan du få dubletter.
          </div>
        </CardContent>
      </Card>

      {result && 'ok' in result && result.ok ? (
        <Card>
          <CardHeader>
            <CardTitle>Klart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">Importerade {result.imported} kort.</div>
            <div className="mt-3">
              <Button onClick={() => router.push(`/admin/toolbelt/conversation-cards/${collectionId}`)}>Till samlingen</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result && (!('ok' in result) || !result.ok) ? (
        <AdminErrorState
          title="Import misslyckades"
          description={result.error || 'Valideringsfel'}
        />
      ) : null}

      {issues && issues.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Fel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.slice(0, 50).map((i, idx) => (
              <div key={idx} className="text-sm">
                Rad {i.row}
                {i.column ? ` (${i.column})` : ''}: {i.message}
              </div>
            ))}
            {issues.length > 50 ? (
              <div className="text-sm text-muted-foreground">Visar 50 av {issues.length} fel.</div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>CSV-innehåll</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Klistra in CSV här eller välj fil ovan"
            className="min-h-[240px]"
          />
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
