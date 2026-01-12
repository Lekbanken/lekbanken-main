'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  AdminBreadcrumbs,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
} from '@/components/admin/shared'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '@/components/ui'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { useRbac } from '@/features/admin/shared/hooks/useRbac'

type Purpose = {
  id: string
  name: string
  type: 'main' | 'sub'
  parent_id: string | null
}

type ScopeType = 'global' | 'tenant'

type FormState = {
  scope_type: ScopeType
  tenant_id: string | null
  title: string
  description: string
  audience: string
  language: string
  status: 'draft' | 'published'
  main_purpose_id: string | null
  secondary_purpose_ids: string[]
}

export default function NewConversationCardCollectionPage() {
  const router = useRouter()
  const t = useTranslations('admin.conversationCards.new')
  const { can, isSystemAdmin, isTenantAdmin, currentTenantId } = useRbac()

  const canManage = can('admin.conversation_cards.manage')
  const canCreateGlobal = isSystemAdmin
  const canCreateTenant = isSystemAdmin || isTenantAdmin

  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [loadingPurposes, setLoadingPurposes] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(() => ({
    scope_type: canCreateGlobal ? 'global' : 'tenant',
    tenant_id: currentTenantId ?? null,
    title: '',
    description: '',
    audience: '',
    language: 'sv',
    status: 'draft',
    main_purpose_id: null,
    secondary_purpose_ids: [],
  }))

  useEffect(() => {
    void (async () => {
      setLoadingPurposes(true)
      try {
        const res = await fetch('/api/purposes?includeStandard=true', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || t('couldNotCreate'))
        setPurposes((data.purposes ?? []) as Purpose[])
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingPurposes(false)
      }
    })()
  }, [t])

  const mainPurposes = useMemo(() => purposes.filter((p) => p.type === 'main'), [purposes])
  const subPurposes = useMemo(() => {
    const subs = purposes.filter((p) => p.type === 'sub')
    if (!form.main_purpose_id) return subs
    return subs.filter((p) => p.parent_id === form.main_purpose_id)
  }, [purposes, form.main_purpose_id])

  const toggleSecondary = (purposeId: string) => {
    setForm((f) => {
      const set = new Set(f.secondary_purpose_ids)
      if (set.has(purposeId)) set.delete(purposeId)
      else set.add(purposeId)
      return { ...f, secondary_purpose_ids: Array.from(set) }
    })
  }

  const onSubmit = async () => {
    setError(null)
    if (!canManage || (!canCreateGlobal && !canCreateTenant)) {
      setError(t('noPermission'))
      return
    }

    if (form.scope_type === 'tenant' && !form.tenant_id) {
      setError(t('selectTenantError'))
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/toolbelt/conversation-cards/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          description: form.description || null,
          audience: form.audience || null,
          language: form.language || null,
          main_purpose_id: form.main_purpose_id,
          secondary_purpose_ids: form.secondary_purpose_ids,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('couldNotCreate'))

      const id = data.collection?.id as string | undefined
      if (!id) throw new Error('Missing collection id')

      router.push(`/admin/toolbelt/conversation-cards/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('couldNotCreate'))
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs items={[{ label: t('breadcrumbHome'), href: '/admin' }, { label: t('breadcrumbTitle'), href: '/admin/toolbelt/conversation-cards' }, { label: t('breadcrumbNew') }]} />
        <AdminErrorState title={t('noAccessTitle')} description={t('noAccessDescription')} />
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbHome'), href: '/admin' },
          { label: t('breadcrumbTitle'), href: '/admin/toolbelt/conversation-cards' },
          { label: t('breadcrumbCreate') },
        ]}
      />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/toolbelt/conversation-cards')}>
              {t('cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={saving || !form.title.trim()}>
              {saving ? t('creating') : t('create')}
            </Button>
          </div>
        }
      />

      {error ? <AdminErrorState title={t('couldNotSave')} description={error} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('scope')}</div>
              <Select
                value={form.scope_type}
                onChange={(e) => {
                  const next = e.target.value as ScopeType
                  setForm((f) => ({
                    ...f,
                    scope_type: next,
                    tenant_id: next === 'tenant' ? (currentTenantId ?? f.tenant_id) : null,
                  }))
                }}
                options={[
                  ...(canCreateTenant ? [{ value: 'tenant', label: t('scopeTenant') }] : []),
                  ...(canCreateGlobal ? [{ value: 'global', label: t('scopeGlobal') }] : []),
                ]}
              />
              {form.scope_type === 'tenant' && !currentTenantId ? (
                <div className="text-xs text-muted-foreground">{t('scopeHint')}</div>
              ) : null}
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">{t('status')}</div>
              <Select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState['status'] }))}
                options={[
                  { value: 'draft', label: t('statusDraft') },
                  { value: 'published', label: t('statusPublished') },
                ]}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('title')}</div>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t('titlePlaceholder')} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('language')}</div>
              <Input value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} placeholder={t('languagePlaceholder')} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">{t('description')}</div>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">{t('audience')}</div>
            <Input value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} placeholder={t('audiencePlaceholder')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('purposes')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">{t('mainPurpose')}</div>
            <Select
              value={form.main_purpose_id ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  main_purpose_id: e.target.value ? e.target.value : null,
                  secondary_purpose_ids: [],
                }))
              }
              options={[
                { value: '', label: loadingPurposes ? t('mainPurposeLoading') : t('mainPurposeNone') },
                ...mainPurposes.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">{t('subPurposes')}</div>
            <div className="flex flex-wrap gap-2">
              {subPurposes.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('noSubPurposes')}</div>
              ) : (
                subPurposes.map((p) => {
                  const active = form.secondary_purpose_ids.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={
                        active
                          ? 'rounded-full border border-border bg-muted px-3 py-1 text-sm'
                          : 'rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:bg-muted'
                      }
                      onClick={() => toggleSecondary(p.id)}
                    >
                      {p.name}
                      {active ? <Badge className="ml-2" variant="secondary">✓</Badge> : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
