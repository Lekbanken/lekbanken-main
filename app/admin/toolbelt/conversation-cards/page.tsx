'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

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
        if (!res.ok) throw new Error(data.error || 'Kunde inte ladda syften')
        setPurposes((data.purposes ?? []) as Purpose[])
      } catch (e) {
        // Purposes are optional for list view; keep empty.
        console.error(e)
      } finally {
        setLoadingPurposes(false)
      }
    })()
  }, [])

  const mainPurposes = useMemo(() => purposes.filter((p) => p.type === 'main'), [purposes])

  const subPurposes = useMemo(() => {
    const selectedMain = filters.mainPurposeId
    const subs = purposes.filter((p) => p.type === 'sub')
    if (selectedMain === 'all') return subs
    return subs.filter((p) => p.parent_id === selectedMain)
  }, [purposes, filters.mainPurposeId])

  useEffect(() => {
    void (async () => {
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
        if (!res.ok) throw new Error(data.error || 'Kunde inte ladda samlingar')
        setCollections((data.collections ?? []) as CollectionListRow[])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kunde inte ladda samlingar')
      } finally {
        setLoading(false)
      }
    })()
  }, [filters, currentTenantId, currentTenant?.id])

  const showCreate = canManage && (isSystemAdmin || isTenantAdmin)

  const statusBadge = (status: 'draft' | 'published') => (
    <Badge variant={status === 'published' ? 'default' : 'secondary'}>{status === 'published' ? 'Published' : 'Draft'}</Badge>
  )

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: 'Startsida', href: '/admin' }, { label: 'Samtalskort' }]} />

      <AdminPageHeader
        title="Samtalskort"
        description="Hantera samtalskortssamlingar (Toolbelt) och importera kort via CSV."
        icon={<ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />}
        actions={
          showCreate ? (
            <Button href="/admin/toolbelt/conversation-cards/new">Skapa samling</Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Scope</div>
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
              <div className="text-xs text-muted-foreground">Status</div>
              <Select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters['status'] }))}
                options={[
                  { value: 'all', label: 'Alla' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Huvudsyfte</div>
              <AdminFilterSelect
                label="Huvudsyfte"
                value={filters.mainPurposeId}
                onChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    mainPurposeId: value,
                    subPurposeId: 'all',
                  }))
                }
                options={[
                  { value: 'all', label: loadingPurposes ? 'Laddar…' : 'Alla' },
                  ...mainPurposes.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Undersyfte</div>
              <AdminFilterSelect
                label="Undersyfte"
                value={filters.subPurposeId}
                onChange={(value) => setFilters((f) => ({ ...f, subPurposeId: value }))}
                options={[
                  { value: 'all', label: loadingPurposes ? 'Laddar…' : 'Alla' },
                  ...subPurposes.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Laddar…</p>
        </Card>
      ) : error ? (
        <AdminErrorState title="Kunde inte ladda" description={error} />
      ) : collections.length === 0 ? (
        <AdminEmptyState
          icon={<ChatBubbleLeftRightIcon className="h-6 w-6" />}
          title="Inga samlingar" 
          description="Skapa en samling eller byt filter." 
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
                      <span className="text-xs text-muted-foreground">{cardCount} kort</span>
                    </div>
                    {c.description ? (
                      <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description}</div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button href={`/admin/toolbelt/conversation-cards/${c.id}`} size="sm" variant="outline">
                      {canEditThis ? 'Redigera' : 'Visa'}
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
