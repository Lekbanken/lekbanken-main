'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '@/components/ui'

type TopEventType = { eventType: string; count: number }

type TopShopItem = {
  shopItemId: string
  name: string
  category: string
  count: number
  revenue: number
}

type TopCampaign = {
  campaignId: string
  name: string
  count: number
  totalAmount: number
}

type TopAutomationRule = {
  ruleId: string
  name: string
  count: number
  totalAmount: number
}

type AnomalyItem = {
  code: string
  severity: 'info' | 'warn' | 'error'
  title: string
  details: string
}

type AnalyticsResponse = {
  generatedAt: string
  tenantId: string
  windowDays: number
  since: string
  economy: {
    earned: number
    spent: number
    net: number
    transactionsCount: number
    usedRollup: boolean
    isSampled: boolean
    sampledRows: number | null
  }
  events: {
    total: number
    isSampled: boolean
    sampledRows: number | null
    topTypes: TopEventType[]
  }
  awards: {
    awardsCount: number
    totalAmount: number
    isSampled: boolean
    sampledRows: number | null
  }
  shop: {
    purchasesCount: number
    totalSpent: number
    isSampled: boolean
    sampledRows: number | null
    topItems: TopShopItem[]
  }
  campaigns: {
    bonusTotalAmount: number
    topCampaigns: TopCampaign[]
  }
  automations: {
    rewardTotalAmount: number
    topRules: TopAutomationRule[]
  }
  anomalies: {
    items: AnomalyItem[]
  }
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('sv-SE').format(n)
}

export default function GamificationAnalyticsAdminPage() {
  useAuth() // ensure auth context is initialized
  const { currentTenant } = useTenant()

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlWindowDays = useMemo((): 7 | 30 | 90 | null => {
    const raw = searchParams.get('windowDays')
    const n = raw ? Number(raw) : NaN
    if (n === 7 || n === 30 || n === 90) return n
    return null
  }, [searchParams])

  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(() => urlWindowDays ?? 30)

  const [rollupDays, setRollupDays] = useState(90)
  const [rollupRefreshing, setRollupRefreshing] = useState(false)
  const [rollupError, setRollupError] = useState<string | null>(null)
  const [rollupResult, setRollupResult] = useState<
    | {
        days: number
        upsertedRows: number
        refreshedAt: string
      }
    | null
  >(null)

  useEffect(() => {
    if (!urlWindowDays) return
    setWindowDays((prev) => (prev === urlWindowDays ? prev : urlWindowDays))
  }, [urlWindowDays])

  const setWindowDaysInUrl = useCallback(
    (days: 7 | 30 | 90) => {
      const next = new URLSearchParams(searchParams.toString())
      next.set('windowDays', String(days))
      router.replace(`${pathname}?${next.toString()}`)
    },
    [pathname, router, searchParams]
  )

  const reload = useCallback(async () => {
    if (!currentTenant) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/admin/gamification/analytics?tenantId=${encodeURIComponent(currentTenant.id)}&windowDays=${windowDays}`
      )
      const json = (await res.json().catch(() => null)) as unknown

      if (!res.ok) {
        const msg =
          typeof json === 'object' && json && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
            ? (json as { error: string }).error
            : 'Kunde inte ladda analytics'
        throw new Error(msg)
      }

      setData(json as AnalyticsResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Okänt fel')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [currentTenant, windowDays])

  const refreshRollups = useCallback(async () => {
    if (!currentTenant) return

    setRollupRefreshing(true)
    setRollupError(null)
    setRollupResult(null)

    try {
      const res = await fetch('/api/admin/gamification/analytics/rollups/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: currentTenant.id, days: rollupDays }),
      })

      const json = (await res.json().catch(() => null)) as unknown
      if (!res.ok) {
        const msg =
          typeof json === 'object' && json && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
            ? (json as { error: string }).error
            : 'Kunde inte uppdatera rollups'
        throw new Error(msg)
      }

      const obj = (typeof json === 'object' && json ? (json as Record<string, unknown>) : {}) as Record<string, unknown>
      const upsertedRows = typeof obj.upsertedRows === 'number' ? obj.upsertedRows : Number(obj.upsertedRows ?? 0)
      const refreshedAt = typeof obj.refreshedAt === 'string' ? obj.refreshedAt : new Date().toISOString()
      const days = typeof obj.days === 'number' ? obj.days : Number(obj.days ?? rollupDays)

      setRollupResult({ days, upsertedRows, refreshedAt })
      await reload()
    } catch (e) {
      setRollupError(e instanceof Error ? e.message : 'Okänt fel')
    } finally {
      setRollupRefreshing(false)
    }
  }, [currentTenant, reload, rollupDays])

  useEffect(() => {
    if (!currentTenant) return
    void reload()
  }, [currentTenant, windowDays, reload])

  if (!currentTenant) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Gamification – Analys</h1>
        <p className="text-sm text-muted-foreground mt-2">Välj en tenant för att se analytics.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Gamification – Analys</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tenant: <span className="font-mono">{currentTenant.id}</span>
        </p>
        {data?.generatedAt ? (
          <p className="text-xs text-muted-foreground mt-1">Uppdaterad: {new Date(data.generatedAt).toLocaleString('sv-SE')}</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Rollups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <div className="text-sm font-medium">Dagar</div>
                <div className="mt-1">
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={rollupDays}
                    onChange={(e) => {
                      const next = Number(e.target.value)
                      if (!Number.isFinite(next)) return
                      setRollupDays(Math.max(1, Math.min(3650, next)))
                    }}
                    className="w-28"
                  />
                </div>
              </div>
              <Button onClick={refreshRollups} disabled={rollupRefreshing}>
                {rollupRefreshing ? 'Uppdaterar…' : 'Uppdatera rollups'}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              {rollupError ? <span className="text-red-600">{rollupError}</span> : null}
              {!rollupError && rollupResult ? (
                <span>
                  Upserted {formatNumber(rollupResult.upsertedRows)} rader ({rollupResult.days}d) –{' '}
                  {new Date(rollupResult.refreshedAt).toLocaleString('sv-SE')}
                </span>
              ) : null}
              {!rollupError && !rollupResult && !rollupRefreshing ? <span>—</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-medium">Period</div>
              <div className="text-xs text-muted-foreground">
                {data?.since ? `Sedan ${new Date(data.since).toLocaleDateString('sv-SE')}` : '—'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!loading && data ? (
                <Badge variant={data.economy.usedRollup ? 'secondary' : 'outline'}>
                  {data.economy.usedRollup ? 'Rollup' : 'Live'}
                </Badge>
              ) : null}
              {([7, 30, 90] as const).map((d) => (
                <Button
                  key={d}
                  variant={windowDays === d ? 'default' : 'outline'}
                  onClick={() => {
                    setWindowDays(d)
                    setWindowDaysInUrl(d)
                  }}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Coins minted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.economy.earned ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Sista {data?.windowDays ?? 30} dagar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coins spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.economy.spent ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Sista {data?.windowDays ?? 30} dagar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.economy.net ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Earn - spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.events.total ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Sista {data?.windowDays ?? 30} dagar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin awards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.awards.totalAmount ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Totalt utdelat (coins)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Awards count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.awards.awardsCount ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Antal award-actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shop purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.shop.purchasesCount ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Sista {data?.windowDays ?? 30} dagar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shop spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.shop.totalSpent ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Summa price_paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign bonus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.campaigns.bonusTotalAmount ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Totalt minted via kampanjer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading ? '…' : formatNumber(data?.automations.rewardTotalAmount ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Totalt minted via automation rules</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Top event types
              {data?.events.isSampled ? <Badge variant="secondary">Sampled</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Laddar…</p>
            ) : data?.events.topTypes?.length ? (
              <div className="space-y-2">
                {data.events.topTypes.map((row) => (
                  <div key={row.eventType} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{row.eventType}</span>
                    <span className="tabular-nums">{formatNumber(row.count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Inga events i perioden.</p>
            )}

            {data?.events.isSampled && typeof data.events.sampledRows === 'number' ? (
              <p className="text-xs text-muted-foreground mt-3">
                Topplistan beräknas från ett urval (max {formatNumber(data.events.sampledRows)} rader).
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Top shop items
              {data?.shop.isSampled ? <Badge variant="secondary">Sampled</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Laddar…</p>
            ) : data?.shop.topItems?.length ? (
              <div className="space-y-2">
                {data.shop.topItems.map((row) => (
                  <div key={row.shopItemId} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.category}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div>{formatNumber(row.count)} st</div>
                      <div className="text-xs text-muted-foreground">{formatNumber(row.revenue)} spent</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Inga purchases i perioden.</p>
            )}

            {data?.shop.isSampled && typeof data.shop.sampledRows === 'number' ? (
              <p className="text-xs text-muted-foreground mt-3">
                Topplistan beräknas från ett urval (max {formatNumber(data.shop.sampledRows)} rader).
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : data?.campaigns.topCampaigns?.length ? (
            <div className="space-y-2">
              {data.campaigns.topCampaigns.map((row) => (
                <div key={row.campaignId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">
                      <Link href={`/admin/gamification/campaigns/${row.campaignId}`} className="hover:underline">
                        {row.name}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{row.campaignId}</div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div>{formatNumber(row.totalAmount)} coins</div>
                    <div className="text-xs text-muted-foreground">{formatNumber(row.count)} tx</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inga campaign bonus-transaktioner i perioden.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top automation rules</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : data?.automations.topRules?.length ? (
            <div className="space-y-2">
              {data.automations.topRules.map((row) => (
                <div key={row.ruleId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">
                      <Link
                        href={`/admin/gamification/automation?ruleId=${encodeURIComponent(row.ruleId)}`}
                        className="hover:underline"
                      >
                        {row.name}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      <Link
                        href={`/admin/gamification/automation?ruleId=${encodeURIComponent(row.ruleId)}`}
                        className="hover:underline"
                      >
                        {row.ruleId}
                      </Link>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div>{formatNumber(row.totalAmount)} coins</div>
                    <div className="text-xs text-muted-foreground">{formatNumber(row.count)} tx</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inga automation_rule-transaktioner i perioden.</p>
          )}

          {!loading ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Hantera regler i <Link href="/admin/gamification/automation" className="hover:underline">Automation</Link>.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avvikelser</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : data?.anomalies.items?.length ? (
            <div className="space-y-2">
              {data.anomalies.items.map((a) => (
                <div key={a.code} className="rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{a.title}</div>
                    <Badge variant={a.severity === 'error' ? 'destructive' : 'secondary'}>
                      {a.severity}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{a.details}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inga avvikelser detekterade i nuläget.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
