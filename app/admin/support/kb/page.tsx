'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent, Badge, Input, Textarea, Select } from '@/components/ui'
import {
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronLeftIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { AdminPageLayout, AdminPageHeader, AdminEmptyState, AdminErrorState } from '@/components/admin/shared'
import {
  listFAQEntries,
  getFAQEntry,
  createFAQEntry,
  updateFAQEntry,
  deleteFAQEntry,
  listFAQCategories,
  type FAQEntry,
} from '@/app/actions/support-kb'
import { checkSupportHubAccess, listTenantsForSupportHub } from '@/app/actions/support-hub'

export default function KnowledgeBaseAdminPage() {
  const t = useTranslations('admin.support.kb')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  
  // List state
  const [entries, setEntries] = useState<FAQEntry[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showUnpublished, setShowUnpublished] = useState(true)
  
  // Editor state
  const [editingEntry, setEditingEntry] = useState<FAQEntry | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Form state
  const [formQuestion, setFormQuestion] = useState('')
  const [formAnswer, setFormAnswer] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formIsPublished, setFormIsPublished] = useState(false)
  const [formTenantId, setFormTenantId] = useState<string | null>(null)

  // Manual reload function for use after CRUD operations
  async function loadData() {
    setLoading(true)
    
    const [entriesResult, categoriesResult] = await Promise.all([
      listFAQEntries({
        tenantId: selectedTenantId,
        includeUnpublished: showUnpublished,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
        limit: 100,
      }),
      listFAQCategories({ tenantId: selectedTenantId }),
    ])
    
    if (entriesResult.success && entriesResult.data) {
      setEntries(entriesResult.data)
    }
    if (categoriesResult.success && categoriesResult.data) {
      setCategories(categoriesResult.data)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      const result = await checkSupportHubAccess()
      if (!result.hasAccess) {
        setError(result.error || t('noAccess'))
        setLoading(false)
        return
      }
      setHasAccess(true)
      setIsSystemAdmin(result.isSystemAdmin)
      
      if (result.isSystemAdmin) {
        const tenantsResult = await listTenantsForSupportHub()
        if (tenantsResult.success && tenantsResult.data) {
          setTenants(tenantsResult.data)
        }
      } else if (result.tenantIds.length > 0) {
        setSelectedTenantId(result.tenantIds[0])
      }
    })()
  }, [t])

  useEffect(() => {
    if (!hasAccess) return
    void (async () => {
      setLoading(true)
      
      const [entriesResult, categoriesResult] = await Promise.all([
        listFAQEntries({
          tenantId: selectedTenantId,
          includeUnpublished: showUnpublished,
          category: categoryFilter || undefined,
          search: searchQuery || undefined,
          limit: 100,
        }),
        listFAQCategories({ tenantId: selectedTenantId }),
      ])
      
      if (entriesResult.success && entriesResult.data) {
        setEntries(entriesResult.data)
      }
      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data)
      }
      
      setLoading(false)
    })()
  }, [hasAccess, selectedTenantId, showUnpublished, categoryFilter, searchQuery])

  function openCreateForm() {
    setFormQuestion('')
    setFormAnswer('')
    setFormCategory('')
    setFormIsPublished(false)
    setFormTenantId(selectedTenantId ?? null)
    setEditingEntry(null)
    setIsCreating(true)
  }

  async function openEditForm(entry: FAQEntry) {
    const result = await getFAQEntry(entry.id)
    if (result.success && result.data) {
      setFormQuestion(result.data.question)
      setFormAnswer(result.data.answer_markdown)
      setFormCategory(result.data.category ?? '')
      setFormIsPublished(result.data.is_published)
      setFormTenantId(result.data.tenant_id)
      setEditingEntry(result.data)
      setIsCreating(false)
    }
  }

  function closeForm() {
    setEditingEntry(null)
    setIsCreating(false)
  }

  async function handleSave() {
    if (!formQuestion.trim() || !formAnswer.trim()) return
    
    setIsSaving(true)
    
    if (isCreating) {
      const result = await createFAQEntry({
        tenantId: formTenantId,
        question: formQuestion.trim(),
        answerMarkdown: formAnswer.trim(),
        category: formCategory.trim() || undefined,
        isPublished: formIsPublished,
      })
      
      if (result.success) {
        closeForm()
        loadData()
      } else {
        setError(result.error || t('errors.createFailed'))
      }
    } else if (editingEntry) {
      const result = await updateFAQEntry({
        id: editingEntry.id,
        question: formQuestion.trim(),
        answerMarkdown: formAnswer.trim(),
        category: formCategory.trim() || undefined,
        isPublished: formIsPublished,
      })
      
      if (result.success) {
        closeForm()
        loadData()
      } else {
        setError(result.error || t('errors.updateFailed'))
      }
    }
    
    setIsSaving(false)
  }

  async function handleDelete() {
    if (!editingEntry) return
    
    setIsDeleting(true)
    
    const result = await deleteFAQEntry(editingEntry.id)
    
    if (result.success) {
      closeForm()
      loadData()
    } else {
      setError(result.error || t('errors.deleteFailed'))
    }
    
    setIsDeleting(false)
  }

  async function togglePublished(entry: FAQEntry) {
    const result = await updateFAQEntry({
      id: entry.id,
      isPublished: !entry.is_published,
    })
    
    if (result.success) {
      loadData()
    }
  }

  if (error && !hasAccess) {
    return (
      <AdminPageLayout>
        <AdminErrorState
          title={t('noAccess')}
          description={error}
          onRetry={() => window.location.reload()}
        />
      </AdminPageLayout>
    )
  }

  const tenantOptions = [
    { value: '', label: t('allOrganizations') },
    ...tenants.map(t => ({ value: t.id, label: t.name })),
  ]

  const categoryOptions = [
    { value: '', label: t('allCategories') },
    ...categories.map(c => ({ value: c, label: c })),
  ]

  const formTenantOptions = [
    { value: '', label: t('globalOption') },
    ...tenants.map(t => ({ value: t.id, label: t.name })),
  ]

  // Editor view
  if (isCreating || editingEntry) {
    return (
      <AdminPageLayout>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={closeForm}>
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              {t('back')}
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {isCreating ? t('createFaq') : t('editFaq')}
            </h1>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              {isSystemAdmin && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('form.organization')}
                  </label>
                  <Select
                    value={formTenantId ?? ''}
                    onChange={(e) => setFormTenantId(e.target.value || null)}
                    options={formTenantOptions}
                    disabled={!isCreating}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('form.globalHelp')}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('form.questionLabel')}
                </label>
                <Input
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder={t('form.questionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('form.answerLabel')}
                </label>
                <Textarea
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  placeholder={t('form.answerPlaceholder')}
                  rows={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('form.categoryLabel')}
                </label>
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder={t('form.categoryPlaceholder')}
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormIsPublished(!formIsPublished)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formIsPublished ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formIsPublished ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-foreground">
                  {formIsPublished ? t('status.published') : t('status.draft')}
                </span>
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  {editingEntry && (
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? t('actions.deleting') : t('actions.delete')}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={closeForm}>
                    {t('actions.cancel')}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !formQuestion.trim() || !formAnswer.trim()}
                  >
                    {isSaving ? t('actions.saving') : t('actions.save')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminPageLayout>
    )
  }

  // List view
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<BookOpenIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-3">
            {isSystemAdmin && tenants.length > 0 && (
              <Select
                value={selectedTenantId || ''}
                onChange={(e) => setSelectedTenantId(e.target.value || undefined)}
                options={tenantOptions}
                className="w-48"
              />
            )}
            <Button onClick={openCreateForm}>
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('newFaq')}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('filters.searchPlaceholder')}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={categoryOptions}
              className="w-48"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showUnpublished}
                onChange={(e) => setShowUnpublished(e.target.checked)}
                className="rounded border-muted"
              />
              {t('filters.showDrafts')}
            </label>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <AdminEmptyState
          icon={<BookOpenIcon className="h-12 w-12" />}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{
            label: t('createFaq'),
            onClick: openCreateForm,
            icon: <PlusIcon className="h-4 w-4" />
          }}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} className={!entry.is_published ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {entry.tenant_id === null && (
                        <Badge variant="outline" className="text-xs">
                          <GlobeAltIcon className="h-3 w-3 mr-1" />
                          {t('list.global')}
                        </Badge>
                      )}
                      {entry.category && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.category}
                        </Badge>
                      )}
                      {!entry.is_published && (
                        <Badge variant="outline" className="text-xs">
                          {t('status.draft')}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-foreground">{entry.question}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {entry.answer_markdown}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{entry.view_count} {t('list.views')}</span>
                      <span>👍 {entry.helpful_count}</span>
                      <span>👎 {entry.not_helpful_count}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePublished(entry)}
                      title={entry.is_published ? t('actions.unpublish') : t('actions.publish')}
                    >
                      {entry.is_published ? (
                        <EyeIcon className="h-4 w-4" />
                      ) : (
                        <EyeSlashIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditForm(entry)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPageLayout>
  )
}
