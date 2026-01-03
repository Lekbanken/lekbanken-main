'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
      if (!res.ok) throw new Error(data.error || 'Kunde inte ladda samling')

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
      setLoadError(e instanceof Error ? e.message : 'Kunde inte ladda samling')
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
      if (!res.ok) throw new Error(data.error || 'Kunde inte spara samling')

      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Kunde inte spara samling')
    } finally {
      setSaving(false)
    }
  }

  const deleteCollection = async () => {
    if (!collection) return
    if (!window.confirm('Ta bort samlingen? Detta tar även bort alla kort i samlingen.')) return

    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/toolbelt/conversation-cards/collections/${collectionId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kunde inte ta bort')
      router.push('/admin/toolbelt/conversation-cards')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Kunde inte ta bort')
    } finally {
      setSaving(false)
    }
  }

  const createCard = async () => {
    if (!newCard.primary_prompt.trim()) {
      setActionError('primary_prompt krävs')
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
      if (!res.ok) throw new Error(data.error || 'Kunde inte skapa kort')

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
      setActionError(e instanceof Error ? e.message : 'Kunde inte skapa kort')
    } finally {
      setSaving(false)
    }
  }

  const saveCard = async (cardId: string) => {
    const draft = cardEdits[cardId]
    if (!draft) return
    if (!draft.primary_prompt.trim()) {
      setActionError('primary_prompt krävs')
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
      if (!res.ok) throw new Error(data.error || 'Kunde inte spara kort')

      setEditingCardId(null)
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Kunde inte spara kort')
    } finally {
      setSaving(false)
    }
  }

  const deleteCard = async (cardId: string) => {
    if (!window.confirm('Ta bort kortet?')) return

    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/toolbelt/conversation-cards/cards/${cardId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Kunde inte ta bort kort')
      if (editingCardId === cardId) setEditingCardId(null)
      await load()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Kunde inte ta bort kort')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs
          items={[
            { label: 'Startsida', href: '/admin' },
            { label: 'Samtalskort', href: '/admin/toolbelt/conversation-cards' },
            { label: 'Laddar…' },
          ]}
        />
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Laddar…</p>
        </Card>
      </AdminPageLayout>
    )
  }

  if (loadError) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs
          items={[
            { label: 'Startsida', href: '/admin' },
            { label: 'Samtalskort', href: '/admin/toolbelt/conversation-cards' },
            { label: 'Samling' },
          ]}
        />
        <AdminErrorState title="Kunde inte ladda" description={loadError} />
      </AdminPageLayout>
    )
  }

  if (!collection || !form) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs
          items={[
            { label: 'Startsida', href: '/admin' },
            { label: 'Samtalskort', href: '/admin/toolbelt/conversation-cards' },
            { label: 'Samling' },
          ]}
        />
        <AdminEmptyState title="Hittades inte" description="Samlingen finns inte eller du saknar åtkomst." />
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Startsida', href: '/admin' },
          { label: 'Samtalskort', href: '/admin/toolbelt/conversation-cards' },
          { label: collection.title },
        ]}
      />

      <AdminPageHeader
        title={collection.title}
        description="Redigera samling och hantera kort."
        icon={<ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button href={`/admin/toolbelt/conversation-cards/${collectionId}/import`} variant="outline">
              Import (CSV)
            </Button>
            {canEditThisCollection ? (
              <Button variant="outline" onClick={deleteCollection} disabled={saving}>
                Ta bort
              </Button>
            ) : null}
            {canEditThisCollection ? (
              <Button onClick={saveCollection} disabled={saving || !form.title.trim()}>
                {saving ? 'Sparar…' : 'Spara'}
              </Button>
            ) : null}
          </div>
        }
      />

      {actionError ? <AdminErrorState title="Något gick fel" description={actionError} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{collection.scope_type}</Badge>
        {statusBadge(collection.status)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grundinfo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canEditThisCollection ? (
            <div className="text-sm text-muted-foreground">Du kan visa, men inte redigera, denna samling.</div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Titel</div>
              <Input
                value={form.title}
                disabled={!canEditThisCollection}
                onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Status</div>
              <Select
                value={form.status}
                disabled={!canEditThisCollection}
                onChange={(e) => setForm((f) => (f ? { ...f, status: e.target.value as CollectionForm['status'] } : f))}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                ]}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Språk</div>
              <Input
                value={form.language}
                disabled={!canEditThisCollection}
                onChange={(e) => setForm((f) => (f ? { ...f, language: e.target.value } : f))}
                placeholder="sv"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Målgrupp</div>
              <Input
                value={form.audience}
                disabled={!canEditThisCollection}
                onChange={(e) => setForm((f) => (f ? { ...f, audience: e.target.value } : f))}
                placeholder="t.ex. 10–12 år"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Beskrivning</div>
            <Textarea
              value={form.description}
              disabled={!canEditThisCollection}
              onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
              placeholder="Kort beskrivning (valfri)"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Syften</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Huvudsyfte</div>
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
                { value: '', label: loadingPurposes ? 'Laddar…' : '—' },
                ...mainPurposes.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Undersyften</div>
            <div className="flex flex-wrap gap-2">
              {subPurposes.length === 0 ? (
                <div className="text-sm text-muted-foreground">Inga undersyften att välja.</div>
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
          <CardTitle>Kort ({cards.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEditThisCollection ? (
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="text-sm font-medium">Lägg till kort</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Sortering</div>
                  <Input
                    type="number"
                    value={newCard.sort_order}
                    onChange={(e) => setNewCard((c) => ({ ...c, sort_order: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Titel (valfri)</div>
                  <Input value={newCard.card_title} onChange={(e) => setNewCard((c) => ({ ...c, card_title: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Primär fråga / prompt</div>
                <Textarea value={newCard.primary_prompt} onChange={(e) => setNewCard((c) => ({ ...c, primary_prompt: e.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Följdfråga 1</div>
                  <Input value={newCard.followup_1} onChange={(e) => setNewCard((c) => ({ ...c, followup_1: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Följdfråga 2</div>
                  <Input value={newCard.followup_2} onChange={(e) => setNewCard((c) => ({ ...c, followup_2: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Följdfråga 3</div>
                  <Input value={newCard.followup_3} onChange={(e) => setNewCard((c) => ({ ...c, followup_3: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Ledartips (valfri)</div>
                <Textarea value={newCard.leader_tip} onChange={(e) => setNewCard((c) => ({ ...c, leader_tip: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={createCard} disabled={saving || !newCard.primary_prompt.trim()}>
                  Lägg till
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNewCard((c) => ({ ...c, sort_order: nextSortOrder }))}
                  disabled={saving}
                >
                  Sätt sortering till slutet
                </Button>
              </div>
            </div>
          ) : null}

          {cards.length === 0 ? (
            <div className="text-sm text-muted-foreground">Inga kort än.</div>
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
                          <div className="font-medium truncate">{c.card_title || 'Kort'}</div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.primary_prompt}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCardId((id) => (id === c.id ? null : c.id))}
                        >
                          {isEditing ? 'Stäng' : 'Redigera'}
                        </Button>
                        {canEditThisCollection ? (
                          <Button variant="outline" size="sm" onClick={() => deleteCard(c.id)} disabled={saving}>
                            Ta bort
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {isEditing && draft ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Sortering</div>
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
                            <div className="text-xs text-muted-foreground">Titel</div>
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
                          <div className="text-xs text-muted-foreground">Primär fråga / prompt</div>
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
                            <div className="text-xs text-muted-foreground">Följdfråga 1</div>
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
                            <div className="text-xs text-muted-foreground">Följdfråga 2</div>
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
                            <div className="text-xs text-muted-foreground">Följdfråga 3</div>
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
                          <div className="text-xs text-muted-foreground">Ledartips</div>
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
                              Spara kort
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
          <CardTitle>Förhandsvisning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cards.length === 0 ? (
            <div className="text-sm text-muted-foreground">Inga kort att förhandsvisa.</div>
          ) : (
            <div className="space-y-4">
              {cards
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((c) => (
                  <div key={c.id} className="rounded-md border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{c.card_title || 'Kort'}</div>
                      <Badge variant="outline">#{c.sort_order}</Badge>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap">{c.primary_prompt}</div>
                    {c.followup_1 || c.followup_2 || c.followup_3 ? (
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {c.followup_1 ? <div>Följdfråga 1: {c.followup_1}</div> : null}
                        {c.followup_2 ? <div>Följdfråga 2: {c.followup_2}</div> : null}
                        {c.followup_3 ? <div>Följdfråga 3: {c.followup_3}</div> : null}
                      </div>
                    ) : null}
                    {c.leader_tip ? (
                      <div className="mt-3 text-sm">
                        <span className="font-medium">Ledartips:</span> {c.leader_tip}
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
