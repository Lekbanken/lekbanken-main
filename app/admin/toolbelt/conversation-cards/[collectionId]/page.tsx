'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  AdminBreadcrumbs,
  AdminEmptyState,
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

type Collection = {
  id: string
  scope_type: 'global' | 'tenant'
  tenant_id: string | null
  title: string
  description: string | null
  audience: string | null
  language: string | null
  main_purpose_id: string | null
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

type CardRow = {
  id: string
  collection_id: string
  sort_order: number
  card_title: string | null
  primary_prompt: string
  followup_1: string | null
  followup_2: string | null
  followup_3: string | null
  leader_tip: string | null
}

type CollectionForm = {
  title: string
  description: string
  audience: string
  language: string
  status: 'draft' | 'published'
  main_purpose_id: string | null
  secondary_purpose_ids: string[]
}

type CardDraft = {
  sort_order: number
  card_title: string
  primary_prompt: string
  followup_1: string
  followup_2: string
  followup_3: string
  leader_tip: string
}

function statusBadge(status: 'draft' | 'published') {
  return (
    <Badge variant={status === 'published' ? 'default' : 'secondary'}>
      {status === 'published' ? 'Published' : 'Draft'}
    </Badge>
  )
}

export default function ConversationCardCollectionDetailPage() {
  const params = useParams<{ collectionId: string }>()
  const collectionId = params.collectionId
  const router = useRouter()
  const t = useTranslations('admin.conversationCards.edit')

  const { can, isSystemAdmin, isTenantAdmin } = useRbac()
  const canManage = can('admin.conversation_cards.manage')

  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [loadingPurposes, setLoadingPurposes] = useState(true)

  const [collection, setCollection] = useState<Collection | null>(null)
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [form, setForm] = useState<CollectionForm | null>(null)
  const [saving, setSaving] = useState(false)

  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [cardEdits, setCardEdits] = useState<Record<string, CardDraft>>({})

  const [newCard, setNewCard] = useState<CardDraft>({
    sort_order: 0,
    card_title: '',
    primary_prompt: '',
    followup_1: '',
    followup_2: '',
    followup_3: '',
    leader_tip: '',
  })

  useEffect(() => {
    void (async () => {
      setLoadingPurposes(true)
      try {
        const res = await fetch('/api/purposes?includeStandard=true', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (res.ok) setPurposes((data.purposes ?? []) as Purpose[])
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingPurposes(false)
      }
    })()
  }, [])

  const mainPurposes = useMemo(() => purposes.filter((p) => p.type === 'main'), [purposes])

  const subPurposes = useMemo(() => {
    const subs = purposes.filter((p) => p.type === 'sub')
    if (!form?.main_purpose_id) return subs
    return subs.filter((p) => p.parent_id === form.main_purpose_id)
  }, [purposes, form?.main_purpose_id])

  const canEditThisCollection = useMemo(() => {
    if (!canManage || !collection) return false
    if (collection.scope_type === 'global') return isSystemAdmin
    return isSystemAdmin || isTenantAdmin
  }, [canManage, collection, isSystemAdmin, isTenantAdmin])

  const nextSortOrder = useMemo(() => {
    if (!cards.length) return 0
    return Math.max(...cards.map((c) => c.sort_order ?? 0)) + 1
  }, [cards])

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/admin/toolbelt/conversation-cards/collections/${collectionId}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('couldNotLoadCollection'))

      const col = data.collection as Collection
      const cardRows = (data.cards ?? []) as CardRow[]
      const secondary = (data.secondary_purpose_ids ?? []) as string[]

      setCollection(col)
      setCards(cardRows)
      setForm({
        title: col.title,
        description: col.description ?? '',
        audience: col.audience ?? '',
        language: col.language ?? '',
        status: col.status,
        main_purpose_id: col.main_purpose_id,
        secondary_purpose_ids: secondary,
      })

      // Reset new card sort order to end
      setNewCard((c) => ({ ...c, sort_order: cardRows.length ? Math.max(...cardRows.map((r) => r.sort_order ?? 0)) + 1 : 0 }))

      // Initialize card edits snapshot
      const initialEdits: Record<string, CardDraft> = {}
      for (const c of cardRows) {
        initialEdits[c.id] = {
          sort_order: c.sort_order,
          card_title: c.card_title ?? '',
          primary_prompt: c.primary_prompt ?? '',
          followup_1: c.followup_1 ?? '',
          followup_2: c.followup_2 ?? '',
          followup_3: c.followup_3 ?? '',
          leader_tip: c.leader_tip ?? '',
        }
      }
      setCardEdits(initialEdits)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t('couldNotLoadCollection'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId])

  const toggleSecondary = (purposeId: string) => {
    if (!form) return
    setForm((f) => {
      if (!f) return f
      const set = new Set(f.secondary_purpose_ids)
      if (set.has(purposeId)) set.delete(purposeId)
      else set.add(purposeId)
      return { ...f, secondary_purpose_ids: Array.from(set) }
    })
  }

  const saveCollection = async () => {
    if (!form) return
    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/toolbelt/conversation-cards/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          audience: form.audience || null,
          language: form.language || null,
          status: form.status,
          main_purpose_id: form.main_purpose_id,
          secondary_purpose_ids: form.secondary_purpose_ids,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('couldNotSaveCollection'))

      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('couldNotSaveCollection'))
    } finally {
      setSaving(false)
    }
  }

  const deleteCollection = async () => {
    if (!collection) return
    if (!window.confirm(t('confirmDeleteCollection'))) return

    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/toolbelt/conversation-cards/collections/${collectionId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('couldNotDeleteCollection'))
      router.push('/admin/toolbelt/conversation-cards')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('couldNotDeleteCollection'))
    } finally {
      setSaving(false)
    }
  }

  const createCard = async () => {
    if (!newCard.primary_prompt.trim()) {
      setActionError(t('primaryPromptRequired'))
      return
    }
    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/toolbelt/conversation-cards/collections/${collectionId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sort_order: newCard.sort_order,
          card_title: newCard.card_title || null,
          primary_prompt: newCard.primary_prompt,
          followup_1: newCard.followup_1 || null,
          followup_2: newCard.followup_2 || null,
          followup_3: newCard.followup_3 || null,
          leader_tip: newCard.leader_tip || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('couldNotCreateCard'))

      setNewCard({
        sort_order: nextSortOrder + 1,
        card_title: '',
        primary_prompt: '',
        followup_1: '',
        followup_2: '',
        followup_3: '',
        leader_tip: '',
      })

      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('couldNotCreateCard'))
    } finally {
      setSaving(false)
    }
  }

  const saveCard = async (cardId: string) => {
    const draft = cardEdits[cardId]
    if (!draft) return
    if (!draft.primary_prompt.trim()) {
      setActionError(t('primaryPromptRequired'))
      return
    }

    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/toolbelt/conversation-cards/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sort_order: draft.sort_order,
          card_title: draft.card_title || null,
          primary_prompt: draft.primary_prompt,
          followup_1: draft.followup_1 || null,
          followup_2: draft.followup_2 || null,
          followup_3: draft.followup_3 || null,
          leader_tip: draft.leader_tip || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('couldNotSaveCard'))

      setEditingCardId(null)
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('couldNotSaveCard'))
    } finally {
      setSaving(false)
    }
  }

  const deleteCard = async (cardId: string) => {
    if (!window.confirm(t('confirmDeleteCard'))) return

    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/toolbelt/conversation-cards/cards/${cardId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('couldNotDeleteCard'))
      if (editingCardId === cardId) setEditingCardId(null)
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('couldNotDeleteCard'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs
          items={[
            { label: t('breadcrumbHome'), href: '/admin' },
            { label: t('breadcrumbCards'), href: '/admin/toolbelt/conversation-cards' },
            { label: t('breadcrumbLoading') },
          ]}
        />
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </Card>
      </AdminPageLayout>
    )
  }

  if (loadError) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs
          items={[
            { label: t('breadcrumbHome'), href: '/admin' },
            { label: t('breadcrumbCards'), href: '/admin/toolbelt/conversation-cards' },
            { label: t('breadcrumbCollection') },
          ]}
        />
        <AdminErrorState title={t('loadError')} description={loadError} />
      </AdminPageLayout>
    )
  }

  if (!collection || !form) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs
          items={[
            { label: t('breadcrumbHome'), href: '/admin' },
            { label: t('breadcrumbCards'), href: '/admin/toolbelt/conversation-cards' },
            { label: t('breadcrumbCollection') },
          ]}
        />
        <AdminEmptyState title={t('notFoundTitle')} description={t('notFoundDescription')} />
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbHome'), href: '/admin' },
          { label: t('breadcrumbCards'), href: '/admin/toolbelt/conversation-cards' },
          { label: collection.title },
        ]}
      />

      <AdminPageHeader
        title={collection.title}
        description={t('pageDescription')}
        icon={<ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button href={`/admin/toolbelt/conversation-cards/${collectionId}/import`} variant="outline">
              {t('importCsv')}
            </Button>
            {canEditThisCollection ? (
              <Button variant="outline" onClick={deleteCollection} disabled={saving}>
                {t('delete')}
              </Button>
            ) : null}
            {canEditThisCollection ? (
              <Button onClick={saveCollection} disabled={saving || !form.title.trim()}>
                {saving ? t('saving') : t('save')}
              </Button>
            ) : null}
          </div>
        }
      />

      {actionError ? <AdminErrorState title={t('errorTitle')} description={actionError} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{collection.scope_type}</Badge>
        {statusBadge(collection.status)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canEditThisCollection ? (
            <div className="text-sm text-muted-foreground">{t('viewOnlyNotice')}</div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('title')}</div>
              <Input
                value={form.title}
                disabled={!canEditThisCollection}
                onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('status')}</div>
              <Select
                value={form.status}
                disabled={!canEditThisCollection}
                onChange={(e) => setForm((f) => (f ? { ...f, status: e.target.value as CollectionForm['status'] } : f))}
                options={[
                  { value: 'draft', label: t('statusDraft') },
                  { value: 'published', label: t('statusPublished') },
                ]}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('language')}</div>
              <Input
                value={form.language}
                disabled={!canEditThisCollection}
                onChange={(e) => setForm((f) => (f ? { ...f, language: e.target.value } : f))}
                placeholder={t('languagePlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('audience')}</div>
              <Input
                value={form.audience}
                disabled={!canEditThisCollection}
                onChange={(e) => setForm((f) => (f ? { ...f, audience: e.target.value } : f))}
                placeholder={t('audiencePlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">{t('description')}</div>
            <Textarea
              value={form.description}
              disabled={!canEditThisCollection}
              onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
              placeholder={t('descriptionPlaceholder')}
            />
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
              disabled={!canEditThisCollection}
              onChange={(e) =>
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        main_purpose_id: e.target.value ? e.target.value : null,
                        secondary_purpose_ids: [],
                      }
                    : f
                )
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
                      disabled={!canEditThisCollection}
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

      <Card>
        <CardHeader>
          <CardTitle>{t('cardsTitle')} ({cards.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEditThisCollection ? (
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="text-sm font-medium">{t('addCardSection')}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('sortOrder')}</div>
                  <Input
                    type="number"
                    value={newCard.sort_order}
                    onChange={(e) => setNewCard((c) => ({ ...c, sort_order: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('cardTitleOptional')}</div>
                  <Input value={newCard.card_title} onChange={(e) => setNewCard((c) => ({ ...c, card_title: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('primaryPrompt')}</div>
                <Textarea value={newCard.primary_prompt} onChange={(e) => setNewCard((c) => ({ ...c, primary_prompt: e.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('followup1')}</div>
                  <Input value={newCard.followup_1} onChange={(e) => setNewCard((c) => ({ ...c, followup_1: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('followup2')}</div>
                  <Input value={newCard.followup_2} onChange={(e) => setNewCard((c) => ({ ...c, followup_2: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('followup3')}</div>
                  <Input value={newCard.followup_3} onChange={(e) => setNewCard((c) => ({ ...c, followup_3: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('leaderTip')}</div>
                <Textarea value={newCard.leader_tip} onChange={(e) => setNewCard((c) => ({ ...c, leader_tip: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={createCard} disabled={saving || !newCard.primary_prompt.trim()}>
                  {t('addButton')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNewCard((c) => ({ ...c, sort_order: nextSortOrder }))}
                  disabled={saving}
                >
                  {t('setSortToEnd')}
                </Button>
              </div>
            </div>
          ) : null}

          {cards.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('noCardsYet')}</div>
          ) : (
            <div className="space-y-3">
              {cards.map((c) => {
                const isEditing = editingCardId === c.id
                const draft = cardEdits[c.id]

                return (
                  <div key={c.id} className="rounded-md border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">#{c.sort_order}</Badge>
                          <div className="font-medium truncate">{c.card_title || t('cardLabel')}</div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.primary_prompt}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCardId((id) => (id === c.id ? null : c.id))}
                        >
                          {isEditing ? t('close') : t('edit')}
                        </Button>
                        {canEditThisCollection ? (
                          <Button variant="outline" size="sm" onClick={() => deleteCard(c.id)} disabled={saving}>
                            {t('deleteCard')}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {isEditing && draft ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{t('sortOrder')}</div>
                            <Input
                              type="number"
                              value={draft.sort_order}
                              disabled={!canEditThisCollection}
                              onChange={(e) =>
                                setCardEdits((m) => ({
                                  ...m,
                                  [c.id]: { ...m[c.id], sort_order: Number(e.target.value) },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{t('cardTitle')}</div>
                            <Input
                              value={draft.card_title}
                              disabled={!canEditThisCollection}
                              onChange={(e) =>
                                setCardEdits((m) => ({
                                  ...m,
                                  [c.id]: { ...m[c.id], card_title: e.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{t('primaryPrompt')}</div>
                          <Textarea
                            value={draft.primary_prompt}
                            disabled={!canEditThisCollection}
                            onChange={(e) =>
                              setCardEdits((m) => ({
                                ...m,
                                [c.id]: { ...m[c.id], primary_prompt: e.target.value },
                              }))
                            }
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{t('followup1')}</div>
                            <Input
                              value={draft.followup_1}
                              disabled={!canEditThisCollection}
                              onChange={(e) =>
                                setCardEdits((m) => ({
                                  ...m,
                                  [c.id]: { ...m[c.id], followup_1: e.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{t('followup2')}</div>
                            <Input
                              value={draft.followup_2}
                              disabled={!canEditThisCollection}
                              onChange={(e) =>
                                setCardEdits((m) => ({
                                  ...m,
                                  [c.id]: { ...m[c.id], followup_2: e.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{t('followup3')}</div>
                            <Input
                              value={draft.followup_3}
                              disabled={!canEditThisCollection}
                              onChange={(e) =>
                                setCardEdits((m) => ({
                                  ...m,
                                  [c.id]: { ...m[c.id], followup_3: e.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{t('leaderTipLabel')}</div>
                          <Textarea
                            value={draft.leader_tip}
                            disabled={!canEditThisCollection}
                            onChange={(e) =>
                              setCardEdits((m) => ({
                                ...m,
                                [c.id]: { ...m[c.id], leader_tip: e.target.value },
                              }))
                            }
                          />
                        </div>

                        {canEditThisCollection ? (
                          <div className="flex items-center gap-2">
                            <Button onClick={() => saveCard(c.id)} disabled={saving || !draft.primary_prompt.trim()}>
                              {t('saveCard')}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('preview')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cards.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('noCardsToPreview')}</div>
          ) : (
            <div className="space-y-4">
              {cards
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((c) => (
                  <div key={c.id} className="rounded-md border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{c.card_title || t('cardLabel')}</div>
                      <Badge variant="outline">#{c.sort_order}</Badge>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap">{c.primary_prompt}</div>
                    {c.followup_1 || c.followup_2 || c.followup_3 ? (
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {c.followup_1 ? <div>{t('followup1')}: {c.followup_1}</div> : null}
                        {c.followup_2 ? <div>{t('followup2')}: {c.followup_2}</div> : null}
                        {c.followup_3 ? <div>{t('followup3')}: {c.followup_3}</div> : null}
                      </div>
                    ) : null}
                    {c.leader_tip ? (
                      <div className="mt-3 text-sm">
                        <span className="font-medium">{t('leaderTipLabel')}:</span> {c.leader_tip}
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
