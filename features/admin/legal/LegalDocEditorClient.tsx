"use client"

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { EyeIcon } from '@heroicons/react/24/outline'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input, Textarea, Select, Switch } from '@/components/ui'
import { AdminConfirmDialog } from '@/components/admin/shared'
import { LegalPreviewDialog } from '@/components/legal/LegalPreviewDialog'
import {
  deleteLegalDraft,
  publishLegalDocument,
  recordOrgLegalAcceptance,
  saveLegalDraft,
} from '@/app/actions/legal-admin'
import type {
  LegalDocScope,
  LegalDocType,
  LegalDocumentDraftRow,
  LegalDocumentRow,
  LegalLocale,
  OrgLegalAcceptanceRow,
} from '@/lib/legal/types'
import { LEGAL_DOC_PUBLIC_ROUTES, LEGAL_LOCALE_LABELS } from '@/lib/legal/doc-metadata'

type LegalEditorSnapshot = {
  activeDocs: LegalDocumentRow[]
  drafts: LegalDocumentDraftRow[]
}

type FormState = {
  title: string
  contentMarkdown: string
  requiresAcceptance: boolean
  changeSummary: string
}

const LOCALES: LegalLocale[] = ['sv', 'no', 'en']

function buildLocaleMap<T extends { locale: LegalLocale }>(items: T[]) {
  return LOCALES.reduce((acc, locale) => {
    acc[locale] = items.find((item) => item.locale === locale) ?? null
    return acc
  }, {} as Record<LegalLocale, T | null>)
}

function buildInitialForms(
  drafts: Record<LegalLocale, LegalDocumentDraftRow | null>,
  activeDocs: Record<LegalLocale, LegalDocumentRow | null>
) {
  return LOCALES.reduce((acc, locale) => {
    const draft = drafts[locale]
    const published = activeDocs[locale]
    acc[locale] = {
      title: draft?.title ?? published?.title ?? '',
      contentMarkdown: draft?.content_markdown ?? published?.content_markdown ?? '',
      requiresAcceptance: draft?.requires_acceptance ?? published?.requires_acceptance ?? true,
      changeSummary: draft?.change_summary ?? '',
    }
    return acc
  }, {} as Record<LegalLocale, FormState>)
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString()
}

export function LegalDocEditorClient({
  scope,
  tenantId,
  docType,
  docTypeLabel,
  initialSnapshot,
  initialOrgAcceptance,
}: {
  scope: LegalDocScope
  tenantId?: string | null
  docType: LegalDocType
  docTypeLabel: string
  initialSnapshot: LegalEditorSnapshot
  initialOrgAcceptance?: Record<string, OrgLegalAcceptanceRow>
}) {
  const t = useTranslations('admin.legal')
  const [locale, setLocale] = useState<LegalLocale>(() => {
    const map = buildLocaleMap(initialSnapshot.drafts)
    if (map.sv) return 'sv'
    if (map.no) return 'no'
    if (map.en) return 'en'
    return 'sv'
  })
  const [activeDocs, setActiveDocs] = useState(() => buildLocaleMap(initialSnapshot.activeDocs))
  const [drafts, setDrafts] = useState(() => buildLocaleMap(initialSnapshot.drafts))
  const [forms, setForms] = useState(() => buildInitialForms(drafts, activeDocs))
  const [orgAcceptance, setOrgAcceptance] = useState<Record<string, OrgLegalAcceptanceRow>>(initialOrgAcceptance ?? {})
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const currentDraft = drafts[locale]
  const currentPublished = activeDocs[locale]
  const currentForm = forms[locale]
  const publicRoute = LEGAL_DOC_PUBLIC_ROUTES[docType]
  const canPublish = Boolean(
    currentForm.title.trim() &&
    currentForm.contentMarkdown.trim() &&
    currentForm.changeSummary.trim()
  )

  const isDirty = useMemo(() => {
    const base = currentDraft ?? currentPublished
    if (!base) {
      return currentForm.title.trim() !== '' || currentForm.contentMarkdown.trim() !== '' || currentForm.changeSummary.trim() !== ''
    }
    return (
      currentForm.title.trim() !== base.title ||
      currentForm.contentMarkdown.trim() !== base.content_markdown ||
      currentForm.requiresAcceptance !== base.requires_acceptance ||
      (currentDraft ? currentForm.changeSummary.trim() !== currentDraft.change_summary : currentForm.changeSummary.trim() !== '')
    )
  }, [currentDraft, currentPublished, currentForm])

  const acceptanceRecord = currentPublished ? orgAcceptance[currentPublished.id] : undefined

  function updateForm(field: keyof FormState, value: string | boolean) {
    setForms((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }))
  }

  function resetFormFromPublished() {
    const published = activeDocs[locale]
    setForms((prev) => ({
      ...prev,
      [locale]: {
        title: published?.title ?? '',
        contentMarkdown: published?.content_markdown ?? '',
        requiresAcceptance: published?.requires_acceptance ?? true,
        changeSummary: '',
      },
    }))
  }

  async function handleSaveDraft() {
    setNotice(null)
    setIsSaving(true)
    const result = await saveLegalDraft({
      scope,
      tenantId: tenantId ?? null,
      type: docType,
      locale,
      title: currentForm.title,
      contentMarkdown: currentForm.contentMarkdown,
      requiresAcceptance: currentForm.requiresAcceptance,
      changeSummary: currentForm.changeSummary,
    })
    setIsSaving(false)

    if (!result.success) {
      setNotice({ type: 'error', message: result.error })
      return
    }

    setDrafts((prev) => ({ ...prev, [locale]: result.data }))
    setNotice({ type: 'success', message: 'Draft saved.' })
  }

  async function handleDeleteDraft() {
    if (!currentDraft) return
    setNotice(null)
    setIsDeleting(true)
    const result = await deleteLegalDraft({
      scope,
      tenantId: tenantId ?? null,
      type: docType,
      locale,
    })
    setIsDeleting(false)
    if (!result.success) {
      setNotice({ type: 'error', message: result.error })
      return
    }
    setDrafts((prev) => ({ ...prev, [locale]: null }))
    resetFormFromPublished()
    setNotice({ type: 'success', message: 'Draft deleted.' })
  }

  async function handlePublish() {
    setNotice(null)
    setIsPublishing(true)
    const result = await publishLegalDocument({
      scope,
      tenantId: tenantId ?? null,
      type: docType,
      locale,
      title: currentForm.title,
      contentMarkdown: currentForm.contentMarkdown,
      requiresAcceptance: currentForm.requiresAcceptance,
      changeSummary: currentForm.changeSummary,
    })
    setIsPublishing(false)
    setConfirmOpen(false)

    if (!result.success) {
      setNotice({ type: 'error', message: result.error })
      return
    }

    setActiveDocs((prev) => ({ ...prev, [locale]: result.data }))
    setDrafts((prev) => ({ ...prev, [locale]: null }))
    setForms((prev) => ({
      ...prev,
      [locale]: {
        title: result.data.title,
        contentMarkdown: result.data.content_markdown,
        requiresAcceptance: result.data.requires_acceptance,
        changeSummary: '',
      },
    }))
    setNotice({ type: 'success', message: 'Document published.' })
  }

  async function handleRecordAcceptance() {
    if (!tenantId || !currentPublished) return
    setNotice(null)
    setIsRecording(true)
    const result = await recordOrgLegalAcceptance({
      tenantId,
      documentId: currentPublished.id,
    })
    setIsRecording(false)
    if (!result.success) {
      setNotice({ type: 'error', message: result.error })
      return
    }
    setOrgAcceptance((prev) => ({ ...prev, [currentPublished.id]: result.data }))
    setNotice({ type: 'success', message: 'Organization acceptance recorded.' })
  }

  const localeOptions = LOCALES.map((value) => ({
    value,
    label: LEGAL_LOCALE_LABELS[value],
  }))

  return (
    <>
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="min-w-[200px]">
            <Select
              label="Locale"
              value={locale}
              onChange={(event) => setLocale(event.target.value as LegalLocale)}
              options={localeOptions}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Draft:</span>
            {currentDraft ? (
              <Badge variant="secondary">Saved {formatDate(currentDraft.updated_at)}</Badge>
            ) : (
              <Badge variant="outline">None</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Published:</span>
            {currentPublished ? (
              <Badge variant="default">v{currentPublished.version_int}</Badge>
            ) : (
              <Badge variant="outline">None</Badge>
            )}
          </div>
          {isDirty && (
            <Badge variant="outline">Unsaved changes</Badge>
          )}
        </CardContent>
      </Card>

      {notice && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{docTypeLabel} Draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Title</label>
              <Input
                value={currentForm.title}
                onChange={(event) => updateForm('title', event.target.value)}
                placeholder="Document title"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Change summary</label>
              <Input
                value={currentForm.changeSummary}
                onChange={(event) => updateForm('changeSummary', event.target.value)}
                placeholder="Describe what changed for this release"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={currentForm.requiresAcceptance}
                onCheckedChange={(checked) => updateForm('requiresAcceptance', checked)}
              />
              <span className="text-sm text-foreground">Requires acceptance</span>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">Content (Markdown)</label>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {t('formattingGuide')}
                  </summary>
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 text-muted-foreground space-y-1.5 max-w-md">
                    <p><strong>{t('markdownSectionsHint')}</strong>{' '}{t('markdownSectionsDesc')}:</p>
                    <pre className="text-[11px] bg-background/50 p-2 rounded overflow-x-auto">
{`## 1. Introduktion
Text for this section...

## 2. Next section
More text...

### 2.1 Subsection
Subsections stay within their parent.`}
                    </pre>
                    <p className="pt-1">Each <code className="text-xs bg-background px-1 rounded">##</code> creates a new accordion section.</p>
                  </div>
                </details>
              </div>
              <Textarea
                value={currentForm.contentMarkdown}
                onChange={(event) => updateForm('contentMarkdown', event.target.value)}
                rows={18}
                placeholder={`## 1. Introduktion
Your introduction text here...

## 2. Section title
Content for this section...

### 2.1 Subsection
Subsections are included in their parent section.`}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save draft'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                disabled={isPublishing || !canPublish}
              >
                {isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
              {currentDraft && (
                <Button
                  variant="ghost"
                  onClick={handleDeleteDraft}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete draft'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Published version</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Version</span>
                <span className="font-medium text-foreground">
                  {currentPublished ? `v${currentPublished.version_int}` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Published at</span>
                <span className="font-medium text-foreground">
                  {formatDate(currentPublished?.published_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Requires acceptance</span>
                <span className="font-medium text-foreground">
                  {currentPublished ? (currentPublished.requires_acceptance ? 'Yes' : 'No') : 'N/A'}
                </span>
              </div>
              {publicRoute && scope === 'global' && (
                <div className="flex items-center justify-between">
                  <span>Public route</span>
                  <a href={publicRoute} className="font-medium text-primary hover:underline">
                    {publicRoute}
                  </a>
                </div>
              )}
              {scope === 'tenant' && (
                <div className="flex items-center justify-between">
                  <span>Org acceptance</span>
                  <span className="font-medium text-foreground">
                    {acceptanceRecord ? formatDate(acceptanceRecord.accepted_at) : 'Pending'}
                  </span>
                </div>
              )}
              {scope === 'tenant' && !acceptanceRecord && currentPublished && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRecordAcceptance}
                  disabled={isRecording}
                >
                  {isRecording ? 'Recording...' : 'Record org acceptance'}
                </Button>
              )}
              {currentPublished && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewOpen(true)}
                  className="w-full mt-2"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AdminConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Publish document"
        description="This will create a new active version and require acceptance if enabled."
        confirmLabel="Publish"
        variant="warning"
        onConfirm={handlePublish}
      />

      {currentPublished && (
        <LegalPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          document={currentPublished}
        />
      )}
    </>
  )
}
