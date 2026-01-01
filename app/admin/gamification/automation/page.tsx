'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui'

type AutomationRuleRow = {
  id: string
  tenant_id: string
  name: string
  event_type: string
  reward_amount: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function GamificationAutomationAdminPage() {
  const { user } = useAuth()
  const { currentTenant } = useTenant()

  const searchParams = useSearchParams()
  const ruleIdFilter = useMemo(() => searchParams.get('ruleId')?.trim() || null, [searchParams])

  const [name, setName] = useState('')
  const [eventType, setEventType] = useState('')
  const [rewardAmount, setRewardAmount] = useState(10)
  const [isActive, setIsActive] = useState(true)

  const [rules, setRules] = useState<AutomationRuleRow[]>([])
  const [loading, setLoading] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const parsedEventType = useMemo(() => eventType.trim(), [eventType])
  const parsedName = useMemo(() => name.trim(), [name])

  const visibleRules = useMemo(() => {
    if (!ruleIdFilter) return rules
    return rules.filter((r) => r.id === ruleIdFilter)
  }, [ruleIdFilter, rules])

  const reload = useCallback(async () => {
    if (!currentTenant) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/gamification/automation?tenantId=${encodeURIComponent(currentTenant.id)}`, {
        cache: 'no-store',
      })
      const json = (await res.json().catch(() => ({}))) as unknown
      if (!res.ok) {
        const errMsg =
          typeof (json as { error?: unknown })?.error === 'string'
            ? ((json as { error: string }).error as string)
            : 'Kunde inte ladda regler'
        setSubmitError(errMsg)
        return
      }

      const rows = (json as { rules?: unknown })?.rules
      setRules(Array.isArray(rows) ? (rows as AutomationRuleRow[]) : [])
    } finally {
      setLoading(false)
    }
  }, [currentTenant])

  useEffect(() => {
    if (!currentTenant) return
    void reload()
  }, [currentTenant, reload])

  const handleCreate = async () => {
    if (!user || !currentTenant) return

    setSubmitError(null)

    if (!parsedName) {
      setSubmitError('Ange ett namn.')
      return
    }

    if (!parsedEventType) {
      setSubmitError('Ange eventType.')
      return
    }

    if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
      setSubmitError('Belopp måste vara ett positivt heltal.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/gamification/automation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          name: parsedName,
          eventType: parsedEventType,
          rewardAmount: Math.floor(rewardAmount),
          isActive,
        }),
      })

      const json = (await res.json().catch(() => ({}))) as unknown
      if (!res.ok) {
        const errMsg =
          typeof (json as { error?: unknown })?.error === 'string'
            ? ((json as { error: string }).error as string)
            : 'Kunde inte skapa regel'
        setSubmitError(errMsg)
        return
      }

      setName('')
      setEventType('')
      setRewardAmount(10)
      setIsActive(true)

      await reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Okänt fel'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleRule = async (ruleId: string, nextActive: boolean) => {
    if (!user || !currentTenant) return

    setToggleError(null)
    setTogglingRuleId(ruleId)
    try {
      const res = await fetch('/api/admin/gamification/automation', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId: currentTenant.id, ruleId, isActive: nextActive }),
      })

      const json = (await res.json().catch(() => ({}))) as unknown
      if (!res.ok) {
        const errMsg =
          typeof (json as { error?: unknown })?.error === 'string'
            ? ((json as { error: string }).error as string)
            : 'Kunde inte uppdatera regel'
        setToggleError(errMsg)
        return
      }

      await reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Okänt fel'
      setToggleError(msg)
    } finally {
      setTogglingRuleId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Automation rules</h1>
          <p className="text-muted-foreground">Tenant-scopade regler: när eventType loggas → dela ut coins.</p>
        </div>
        <Button onClick={reload} disabled={loading || !currentTenant}>
          Uppdatera
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ny regel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Tenant</div>
              <div className="text-sm text-muted-foreground">
                {currentTenant ? `${currentTenant.name ?? 'Tenant'} (${currentTenant.id})` : 'Ingen tenant vald'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Status</div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => setIsActive(true)}
                  disabled={submitting}
                >
                  Aktiv
                </Button>
                <Button
                  type="button"
                  variant={!isActive ? 'default' : 'outline'}
                  onClick={() => setIsActive(false)}
                  disabled={submitting}
                >
                  Pausad
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Namn</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Belöna publicerade planer" />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Event type</div>
              <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Ex: plan_published" />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Coins per event</div>
              <Input type="number" value={rewardAmount} onChange={(e) => setRewardAmount(Number(e.target.value))} min={1} step={1} />
            </div>

            <div className="md:col-span-2">
              <Button onClick={handleCreate} disabled={!user || !currentTenant || submitting}>
                {submitting ? 'Skapar…' : 'Skapa regel'}
              </Button>
              {submitError ? <div className="mt-3 text-sm text-destructive">{submitError}</div> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regler</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Laddar…</div>
          ) : ruleIdFilter && visibleRules.length === 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">
                  Filtrerar på regel: <span className="font-mono">{ruleIdFilter}</span>
                </div>
                <Button href="/admin/gamification/automation" variant="outline" size="sm">
                  Visa alla
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">Ingen regel matchar filtret.</div>
            </div>
          ) : !ruleIdFilter && rules.length === 0 ? (
            <div className="text-sm text-muted-foreground">Inga regler ännu.</div>
          ) : (
            <div className="space-y-3">
              {toggleError ? <div className="text-sm text-destructive">{toggleError}</div> : null}

              {ruleIdFilter ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3">
                  <div className="text-xs text-muted-foreground">
                    Filtrerar på regel: <span className="font-mono">{ruleIdFilter}</span>
                  </div>
                  <Button href="/admin/gamification/automation" variant="outline" size="sm">
                    Visa alla
                  </Button>
                </div>
              ) : null}

              {visibleRules.map((r) => (
                <div key={r.id} className="rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{r.name}</div>
                      <Badge variant={r.is_active ? 'secondary' : 'outline'}>{r.is_active ? 'active' : 'paused'}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">eventType: {r.event_type}</div>
                  <div className="mt-1 text-xs text-muted-foreground">reward: +{r.reward_amount} coins</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      variant={r.is_active ? 'outline' : 'default'}
                      onClick={() => toggleRule(r.id, true)}
                      disabled={togglingRuleId === r.id}
                    >
                      Aktivera
                    </Button>
                    <Button
                      variant={r.is_active ? 'destructive' : 'outline'}
                      onClick={() => toggleRule(r.id, false)}
                      disabled={togglingRuleId === r.id}
                    >
                      Pausa
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">RuleId: {r.id}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
