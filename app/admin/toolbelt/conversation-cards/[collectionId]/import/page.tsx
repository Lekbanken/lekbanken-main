'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const error = typeof maybe.error === 'string' && maybe.error.trim() ? maybe.error : ''
  const details = typeof maybe.details === 'object' && maybe.details ? (maybe.details as { errors?: ImportIssue[] }) : undefined
  return { error, details }
}

export default function ConversationCardsImportPage() {
  const t = useTranslations('admin.conversationCards')
  const tImport = useTranslations('admin.conversationCards.importPage')
  const tActions = useTranslations('common.actions')

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
      setResult({ ok: false, error: e instanceof Error ? e.message : tImport('errorTitle') })
    } finally {
      setSubmitting(false)
    }
  }

  const issues = result && !result.ok ? result.details?.errors ?? null : null

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbHome'), href: '/admin' },
          { label: t('breadcrumbTitle'), href: '/admin/toolbelt/conversation-cards' },
          { label: t('edit.breadcrumbCollection'), href: `/admin/toolbelt/conversation-cards/${collectionId}` },
          { label: t('edit.importCsv') },
        ]}
      />

      <AdminPageHeader
        title={tImport('title')}
        description={tImport('description')}
        icon={<ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" href={`/admin/toolbelt/conversation-cards/${collectionId}`}>
              {tActions('back')}
            </Button>
            <Button onClick={onSubmit} disabled={submitting || !csvText.trim()}>
              {submitting ? tImport('importingLabel') : tActions('import')}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{tImport('csvFormatTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {tImport('csvFormatHeaderHint')}
          </div>
          <div className="rounded-md border border-border bg-muted p-3 text-xs break-all">{expectedHeader}</div>
          <div className="text-sm text-muted-foreground">
            {tImport('csvFormatNote')}
          </div>
        </CardContent>
      </Card>

      {result && 'ok' in result && result.ok ? (
        <Card>
          <CardHeader>
            <CardTitle>{tImport('successTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{tImport('successImported', { count: result.imported })}</div>
            <div className="mt-3">
              <Button onClick={() => router.push(`/admin/toolbelt/conversation-cards/${collectionId}`)}>
                {tImport('goToCollection')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result && (!('ok' in result) || !result.ok) ? (
        <AdminErrorState
          title={tImport('errorTitle')}
          description={result.error || tImport('validationErrorFallback')}
        />
      ) : null}

      {issues && issues.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{tImport('issuesTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.slice(0, 50).map((i, idx) => (
              <div key={idx} className="text-sm">
                {i.column
                  ? tImport('issueRowWithColumn', { row: i.row, column: i.column, message: i.message })
                  : tImport('issueRowWithoutColumn', { row: i.row, message: i.message })}
              </div>
            ))}
            {issues.length > 50 ? (
              <div className="text-sm text-muted-foreground">{tImport('issuesShowing50', { count: issues.length })}</div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{tImport('csvContentTitle')}</CardTitle>
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
            placeholder={tImport('csvPlaceholder')}
            className="min-h-[240px]"
          />
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
