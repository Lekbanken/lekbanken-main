'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTenant } from '@/lib/context/TenantContext'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'

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

type CampaignAnalyticsPayload = {
  tenantId: string
  campaignId: string
  windowDays: number
  since: string | null
  totals: { count: number; totalAmount: number; avgAmount: number }
  daily: Array<{ date: string; count: number; totalAmount: number }>
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('sv-SE').format(n)
}

export default function CampaignDetailAdminPage(props: { params: Promise<{ campaignId: string }> }) {
  const { currentTenant } = useTenant()
  const { campaignId } = use(props.params)

  const [campaign, setCampaign] = useState<CampaignRow | null>(null)
  const [analytics, setAnalytics] = useState<CampaignAnalyticsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)

  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30)

  const tenantId = currentTenant?.id ?? null

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)

    try {
      const [campaignsRes, analyticsRes] = await Promise.all([
        fetch(`/api/admin/gamification/campaigns?tenantId=${encodeURIComponent(tenantId)}`, { cache: 'no-store' }),
        fetch(
          `/api/admin/gamification/campaigns/${encodeURIComponent(campaignId)}/analytics?tenantId=${encodeURIComponent(tenantId)}&windowDays=${windowDays}`,
          { cache: 'no-store' }
        ),
      ])

      const campaignsJson = (await campaignsRes.json().catch(() => null)) as unknown
      if (!campaignsRes.ok) {
        const msg =
          typeof campaignsJson === 'object' && campaignsJson && 'error' in campaignsJson && typeof (campaignsJson as { error?: unknown }).error === 'string'
            ? (campaignsJson as { error: string }).error
            : 'Kunde inte ladda kampanjer'
        throw new Error(msg)
      }

      const rows =
        typeof campaignsJson === 'object' && campaignsJson && 'campaigns' in campaignsJson && Array.isArray((campaignsJson as { campaigns?: unknown }).campaigns)
          ? ((campaignsJson as { campaigns: CampaignRow[] }).campaigns ?? [])
          : []

      const found = rows.find((c) => c.id === campaignId) ?? null
      setCampaign(found)

      const analyticsJson = (await analyticsRes.json().catch(() => null)) as unknown
      if (!analyticsRes.ok) {
        const msg =
          typeof analyticsJson === 'object' && analyticsJson && 'error' in analyticsJson && typeof (analyticsJson as { error?: unknown }).error === 'string'
            ? (analyticsJson as { error: string }).error
            : 'Kunde inte ladda kampanjresultat'
        throw new Error(msg)
      }

      setAnalytics(analyticsJson as CampaignAnalyticsPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Okänt fel')
      setCampaign(null)
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }, [campaignId, tenantId, windowDays])

  useEffect(() => {
    if (!tenantId) return
    void load()
  }, [tenantId, windowDays, load])

  const toggleActive = useCallback(
    async (isActive: boolean) => {
      if (!tenantId) return
      setIsToggling(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/gamification/campaigns', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId, campaignId, isActive }),
        })

        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as unknown
          const msg =
            typeof json === 'object' && json && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
              ? (json as { error: string }).error
              : 'Kunde inte uppdatera kampanj'
          throw new Error(msg)
        }

        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Okänt fel')
      } finally {
        setIsToggling(false)
      }
    },
    [campaignId, load, tenantId]
  )

  const header = useMemo(() => {
    if (!campaign) return `Kampanj ${campaignId}`
    return campaign.name
  }, [campaign, campaignId])

  if (!currentTenant) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Gamification – Kampanj</h1>
        <p className="text-sm text-muted-foreground mt-2">Välj en tenant för att se kampanjer.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">Gamification – {header}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            <Link href="/admin/gamification/campaigns" className="hover:underline">
              ← Tillbaka till kampanjer
            </Link>
          </div>
        </div>

        {campaign ? (
          <div className="shrink-0 flex items-center gap-2">
            {campaign.is_active ? <Badge>Aktiv</Badge> : <Badge variant="secondary">Inaktiv</Badge>}
            <Button
              variant="outline"
              disabled={isToggling}
              onClick={() => void toggleActive(!campaign.is_active)}
            >
              {campaign.is_active ? 'Pausa' : 'Aktivera'}
            </Button>
          </div>
        ) : null}
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

      {loading ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground p-4">Laddar…</p>
          </CardContent>
        </Card>
      ) : campaign ? (
        <Card>
          <CardHeader>
            <CardTitle>Översikt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Event type</div>
                <div className="font-mono">{campaign.event_type}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Bonus</div>
                <div>+{formatNumber(campaign.bonus_amount)} coins</div>
              </div>
              <div>
                <div className="text-muted-foreground">Tidsfönster</div>
                <div>
                  {new Date(campaign.starts_at).toLocaleString('sv-SE')} → {new Date(campaign.ends_at).toLocaleString('sv-SE')}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Budget</div>
                <div>
                  {campaign.budget_amount === null ? '—' : formatNumber(campaign.budget_amount)} · Spent: {formatNumber(campaign.spent_amount)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground p-4">Kampanjen hittades inte i denna tenant.</p>
          </CardContent>
        </Card>
      )}

      {campaign && analytics ? (
        <div className="space-y-3">
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-sm font-medium">Period</div>
                  <div className="text-xs text-muted-foreground">
                    {analytics.since ? `Sedan ${new Date(analytics.since).toLocaleDateString('sv-SE')}` : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {([7, 30, 90] as const).map((d) => (
                    <Button key={d} variant={windowDays === d ? 'default' : 'outline'} onClick={() => setWindowDays(d)}>
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Bonus (senaste {windowDays} dagar)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatNumber(Number(analytics.totals.totalAmount ?? 0))}</div>
              <div className="text-xs text-muted-foreground mt-1">Coins totalt</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Transaktioner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatNumber(Number(analytics.totals.count ?? 0))}</div>
              <div className="text-xs text-muted-foreground mt-1">Antal kampanj-bonus</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Snitt per tx</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatNumber(Math.round(Number(analytics.totals.avgAmount ?? 0)))}</div>
              <div className="text-xs text-muted-foreground mt-1">Coins per transaktion</div>
            </CardContent>
          </Card>
          </div>
        </div>
      ) : null}

      {campaign && analytics ? (
        <Card>
          <CardHeader>
            <CardTitle>Dagsutfall (senaste {windowDays} dagar)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.daily.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga bonusutbetalningar under perioden.</p>
            ) : (
              <div className="space-y-2">
                {analytics.daily.map((d) => (
                  <div key={d.date} className="flex items-center justify-between gap-3 border rounded-md p-2">
                    <div className="text-sm font-mono">{d.date}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(d.count)} tx · {formatNumber(d.totalAmount)} coins
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
