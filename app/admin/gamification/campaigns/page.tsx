'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTenant } from '@/lib/context/TenantContext'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui'

type CampaignRow = {
  id: string
  tenant_id: string
  name: string
  event_type: string
  bonus_amount: number
  starts_at: string
  ends_at: string
  is_active: boolean
  budget_amount: number | null
  spent_amount: number
  created_at: string
  updated_at: string
}

type CampaignTemplate = {
  id: string
  label: string
  defaults: {
    name: string
    eventType: string
    bonusAmount: number
    budgetAmount: string
    durationDays: number
    isActive: boolean
  }
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('sv-SE').format(n)
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocalValue(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export default function GamificationCampaignsAdminPage() {
  const { currentTenant } = useTenant()

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])

  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: 'Planner week',
    eventType: 'plan_published',
    bonusAmount: 5,
    budgetAmount: '',
    startsAt: toDatetimeLocalValue(now.toISOString()),
    endsAt: toDatetimeLocalValue(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    isActive: true,
  })

  const applyTemplate = useCallback((t: CampaignTemplate) => {
    setSelectedTemplateId(t.id)
    const base = new Date()
    const startIso = base.toISOString()
    const endIso = new Date(base.getTime() + t.defaults.durationDays * 24 * 60 * 60 * 1000).toISOString()

    setForm({
      name: t.defaults.name,
      eventType: t.defaults.eventType,
      bonusAmount: t.defaults.bonusAmount,
      budgetAmount: t.defaults.budgetAmount,
      startsAt: toDatetimeLocalValue(startIso),
      endsAt: toDatetimeLocalValue(endIso),
      isActive: t.defaults.isActive,
    })
  }, [])

  const onCreateFromTemplate = async () => {
    if (!currentTenant) return
    if (!selectedTemplateId) return

    const startsAtIso = fromDatetimeLocalValue(form.startsAt)
    if (!startsAtIso) {
      setError('Ogiltigt startdatum')
      return
    }

    setError(null)

    const res = await fetch('/api/admin/gamification/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenantId: currentTenant.id,
        templateId: selectedTemplateId,
        startsAt: startsAtIso,
      }),
    })

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown
      const msg =
        typeof json === 'object' && json && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
          ? (json as { error: string }).error
          : 'Kunde inte skapa kampanj från mall'
      setError(msg)
      return
    }

    await reload()
  }

  const reload = useCallback(async () => {
    if (!currentTenant) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/gamification/campaigns?tenantId=${encodeURIComponent(currentTenant.id)}`)
      const json = (await res.json().catch(() => null)) as unknown
      if (!res.ok) {
        const msg =
          typeof json === 'object' && json && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
            ? (json as { error: string }).error
            : 'Kunde inte ladda kampanjer'
        throw new Error(msg)
      }
      const rows =
        typeof json === 'object' && json && 'campaigns' in json && Array.isArray((json as { campaigns?: unknown }).campaigns)
          ? ((json as { campaigns: CampaignRow[] }).campaigns ?? [])
          : []
      setCampaigns(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Okänt fel')
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [currentTenant])

  const loadTemplates = useCallback(async () => {
    if (!currentTenant) return

    try {
      const res = await fetch(`/api/admin/gamification/campaign-templates?tenantId=${encodeURIComponent(currentTenant.id)}`)
      const json = (await res.json().catch(() => null)) as unknown
      if (!res.ok) {
        return
      }

      const rows =
        typeof json === 'object' && json && 'templates' in json && Array.isArray((json as { templates?: unknown }).templates)
          ? (((json as { templates?: unknown }).templates as unknown[]) ?? [])
          : []

      const mapped: CampaignTemplate[] = rows
        .map((row) => {
          const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : null
          if (!r) return null

          const id = typeof r.id === 'string' ? r.id : null
          const label = typeof r.label === 'string' ? r.label : null
          const name = typeof r.name === 'string' ? r.name : null
          const eventType = typeof r.event_type === 'string' ? r.event_type : null

          const bonusAmountRaw = r.bonus_amount
          const bonusAmount = typeof bonusAmountRaw === 'number' ? bonusAmountRaw : Number(bonusAmountRaw ?? NaN)

          const budgetAmountRaw = r.budget_amount
          const budgetAmount = budgetAmountRaw === null || budgetAmountRaw === undefined ? '' : String(Number(budgetAmountRaw ?? 0))

          const durationDaysRaw = r.duration_days
          const durationDays = typeof durationDaysRaw === 'number' ? durationDaysRaw : Number(durationDaysRaw ?? NaN)

          const isActive = typeof r.is_active_default === 'boolean' ? r.is_active_default : true

          if (!id || !label || !name || !eventType) return null
          if (!Number.isFinite(bonusAmount) || !Number.isFinite(durationDays)) return null

          return {
            id,
            label,
            defaults: {
              name,
              eventType,
              bonusAmount,
              budgetAmount,
              durationDays,
              isActive,
            },
          }
        })
        .filter((v): v is CampaignTemplate => Boolean(v))

      setTemplates(mapped)
    } catch {
      // best-effort
    }
  }, [currentTenant])

  useEffect(() => {
    if (!currentTenant) return
    void reload()
  }, [currentTenant, reload])

  useEffect(() => {
    if (!currentTenant) return
    void loadTemplates()
  }, [currentTenant, loadTemplates])

  const onCreate = async () => {
    if (!currentTenant) return

    const startsAtIso = fromDatetimeLocalValue(form.startsAt)
    const endsAtIso = fromDatetimeLocalValue(form.endsAt)
    if (!startsAtIso || !endsAtIso) {
      setError('Ogiltigt datumintervall')
      return
    }

    const budget = form.budgetAmount.trim().length ? Number(form.budgetAmount) : null
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      setError('Budget måste vara ett tal ≥ 0')
      return
    }

    setError(null)

    const res = await fetch('/api/admin/gamification/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenantId: currentTenant.id,
        name: form.name,
        eventType: form.eventType,
        bonusAmount: Number(form.bonusAmount),
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        budgetAmount: budget,
        isActive: form.isActive,
      }),
    })

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown
      const msg =
        typeof json === 'object' && json && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
          ? (json as { error: string }).error
          : 'Kunde inte skapa kampanj'
      setError(msg)
      return
    }

    await reload()
  }

  const toggleActive = async (campaignId: string, isActive: boolean) => {
    if (!currentTenant) return

    const res = await fetch('/api/admin/gamification/campaigns', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: currentTenant.id, campaignId, isActive }),
    })

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown
      const msg =
        typeof json === 'object' && json && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
          ? (json as { error: string }).error
          : 'Kunde inte uppdatera kampanj'
      setError(msg)
      return
    }

    await reload()
  }

  if (!currentTenant) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Gamification – Kampanjer</h1>
        <p className="text-sm text-muted-foreground mt-2">Välj en tenant för att hantera kampanjer.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Gamification – Kampanjer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tenant: <span className="font-mono">{currentTenant.id}</span>
        </p>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Fel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Skapa kampanj</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length ? (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="text-sm text-muted-foreground mr-2">Mallar:</div>
              {templates.map((t) => (
                <Button key={t.id} variant="outline" onClick={() => applyTemplate(t)}>
                  {t.label}
                </Button>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm mb-1">Namn</div>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <div className="text-sm mb-1">Event type</div>
              <Input value={form.eventType} onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))} />
            </div>
            <div>
              <div className="text-sm mb-1">Bonus (coins)</div>
              <Input
                type="number"
                value={String(form.bonusAmount)}
                onChange={(e) => setForm((p) => ({ ...p, bonusAmount: Number(e.target.value) }))}
              />
            </div>
            <div>
              <div className="text-sm mb-1">Budget (valfritt)</div>
              <Input
                placeholder="t.ex. 1000"
                value={form.budgetAmount}
                onChange={(e) => setForm((p) => ({ ...p, budgetAmount: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-sm mb-1">Start</div>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-sm mb-1">Slut</div>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={onCreate}>Skapa</Button>
            <Button variant="outline" disabled={!selectedTemplateId} onClick={onCreateFromTemplate}>
              Skapa från mall
            </Button>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Aktiv direkt
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktiva & historiska</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga kampanjer ännu.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3 border rounded-md p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/gamification/campaigns/${c.id}`} className="font-medium truncate hover:underline">
                        {c.name}
                      </Link>
                      {c.is_active ? <Badge>Aktiv</Badge> : <Badge variant="secondary">Inaktiv</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-mono">{c.event_type}</span> · +{formatNumber(c.bonus_amount)} coins
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(c.starts_at).toLocaleString('sv-SE')} → {new Date(c.ends_at).toLocaleString('sv-SE')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Budget: {c.budget_amount === null ? '—' : formatNumber(c.budget_amount)} · Spent: {formatNumber(c.spent_amount)}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button variant="outline" onClick={() => void toggleActive(c.id, !c.is_active)}>
                      {c.is_active ? 'Pausa' : 'Aktivera'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
