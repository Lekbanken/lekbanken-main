'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRbac } from '@/features/admin/shared/hooks/useRbac'
import { useTenant } from '@/lib/context/TenantContext'
import {
  AdminBreadcrumbs,
  AdminEmptyState,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
  AdminFilterSelect,
} from '@/components/admin/shared'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui'
import { ChatBubbleLeftRightIcon, ArrowUpTrayIcon, PlusIcon } from '@heroicons/react/24/outline'
import {
  ConversationCardsInfoDialog,
  ConversationCardsImportDialog,
} from '@/features/conversation-cards/components'

type Purpose = {
  id: string
  name: string
  type: 'main' | 'sub'
  parent_id: string | null
}

type CollectionListRow = {
  id: string
  scope_type: 'global' | 'tenant'
  tenant_id: string | null
  title: string
  description: string | null
  main_purpose_id: string | null
  status: 'draft' | 'published'
  conversation_cards?: Array<{ count: number }>
}

type ScopeType = 'global' | 'tenant'

type Filters = {
  scopeType: ScopeType
  mainPurposeId: string
  subPurposeId: string
  status: 'all' | 'draft' | 'published'
}

export default function ConversationCardsAdminPage() {
  const t = useTranslations('admin.conversationCards')
  const { can, isSystemAdmin, isTenantAdmin, currentTenantId } = useRbac()
  const { currentTenant } = useTenant()

  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [loadingPurposes, setLoadingPurposes] = useState(true)

  const [collections, setCollections] = useState<CollectionListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canManage = can('admin.conversation_cards.manage')

  const [filters, setFilters] = useState<Filters>({
    scopeType: isSystemAdmin ? 'global' : 'tenant',
    mainPurposeId: 'all',
    subPurposeId: 'all',
    status: 'all',
  })

  useEffect(() => {
    void (async () => {
      setLoadingPurposes(true)
      try {
        const res = await fetch('/api/purposes?includeStandard=true', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || t('errorLoadPurposes'))
        setPurposes((data.purposes ?? []) as Purpose[])
      } catch (e) {
        // Purposes are optional for list view; keep empty.
        console.error(e)
      } finally {
        setLoadingPurposes(false)
      }
    })()
  }, [t])

  const mainPurposes = useMemo(() => purposes.filter((p) => p.type === 'main'), [purposes])

  const subPurposes = useMemo(() => {
    const selectedMain = filters.mainPurposeId
    const subs = purposes.filter((p) => p.type === 'sub')
    if (selectedMain === 'all') return subs
    return subs.filter((p) => p.parent_id === selectedMain)
  }, [purposes, filters.mainPurposeId])

  const showCreate = canManage && (isSystemAdmin || isTenantAdmin)
  const [importOpen, setImportOpen] = useState(false)

  const loadCollections = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('scopeType', filters.scopeType)
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.mainPurposeId !== 'all') params.set('mainPurposeId', filters.mainPurposeId)
      if (filters.subPurposeId !== 'all') params.set('subPurposeId', filters.subPurposeId)

      if (filters.scopeType === 'tenant') {
        const tenantId = currentTenantId ?? currentTenant?.id ?? ''
        if (tenantId) params.set('tenantId', tenantId)
      }

      const res = await fetch(`/api/admin/toolbelt/conversation-cards/collections?${params.toString()}`, {
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('errorLoadCollections'))
      setCollections((data.collections ?? []) as CollectionListRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorLoadCollections'))
    } finally {
      setLoading(false)
    }
  }, [filters, currentTenantId, currentTenant?.id, t])

  useEffect(() => {
    void loadCollections()
  }, [loadCollections])

  const statusBadge = (status: 'draft' | 'published') => (
    <Badge variant={status === 'published' ? 'default' : 'secondary'}>{status === 'published' ? 'Published' : 'Draft'}</Badge>
  )

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: t('breadcrumbHome'), href: '/admin' }, { label: t('breadcrumbTitle') }]} />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <ConversationCardsInfoDialog />
            {showCreate && (
              <>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                  {t('importButton')}
                </Button>
                <Button size="sm" href="/admin/toolbelt/conversation-cards/new">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {t('createCollectionButton')}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Import Dialog */}
      <ConversationCardsImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => void loadCollections()}
        currentTenantId={currentTenantId ?? currentTenant?.id ?? null}
        isSystemAdmin={isSystemAdmin}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('filterTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t('filterScope')}</div>
              <Select
                value={filters.scopeType}
                onChange={(e) => setFilters((f) => ({ ...f, scopeType: e.target.value as ScopeType }))}
                options={[
                  { value: 'tenant', label: 'Tenant' },
                  { value: 'global', label: 'Global' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t('filterStatus')}</div>
              <Select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters['status'] }))}
                options={[
                  { value: 'all', label: t('statusAll') },
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t('filterMainPurpose')}</div>
              <AdminFilterSelect
                label={t('filterMainPurpose')}
                value={filters.mainPurposeId}
                onChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    mainPurposeId: value,
                    subPurposeId: 'all',
                  }))
                }
                options={[
                  { value: 'all', label: loadingPurposes ? t('loading') : t('statusAll') },
                  ...mainPurposes.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t('filterSubPurpose')}</div>
              <AdminFilterSelect
                label={t('filterSubPurpose')}
                value={filters.subPurposeId}
                onChange={(value) => setFilters((f) => ({ ...f, subPurposeId: value }))}
                options={[
                  { value: 'all', label: loadingPurposes ? t('loading') : t('statusAll') },
                  ...subPurposes.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </Card>
      ) : error ? (
        <AdminErrorState title={t('errorLoadTitle')} description={error} />
      ) : collections.length === 0 ? (
        <AdminEmptyState
          icon={<ChatBubbleLeftRightIcon className="h-6 w-6" />}
          title={t('noCollections')} 
          description={t('noCollectionsDescription')} 
        />
      ) : (
        <div className="grid gap-3">
          {collections.map((c) => {
            const cardCount = c.conversation_cards?.[0]?.count ?? 0
            const canEditThis =
              canManage &&
              ((c.scope_type === 'global' && isSystemAdmin) || (c.scope_type === 'tenant' && isTenantAdmin))

            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold truncate">{c.title}</div>
                      {statusBadge(c.status)}
                      <Badge variant="outline">{c.scope_type}</Badge>
                      <span className="text-xs text-muted-foreground">{t('cardsCount', { count: cardCount })}</span>
                    </div>
                    {c.description ? (
                      <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description}</div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button href={`/admin/toolbelt/conversation-cards/${c.id}`} size="sm" variant="outline">
                      {canEditThis ? t('editButton') : t('viewButton')}
                    </Button>
                    {canEditThis ? (
                      <Button href={`/admin/toolbelt/conversation-cards/${c.id}/import`} size="sm">
                        Import
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </AdminPageLayout>
  )
}
