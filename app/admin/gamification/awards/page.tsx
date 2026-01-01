'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui'

type AwardRow = {
  id: string
  tenant_id: string
  actor_user_id: string | null
  actor?: { id: string; email: string; full_name: string | null } | null
  amount: number
  message: string | null
  idempotency_key: string
  created_at: string
}

type AuditRow = {
  id: string
  tenant_id: string
  actor_user_id: string | null
  actor?: { id: string; email: string; full_name: string | null } | null
  event_type: string
  payload: unknown | null
  created_at: string
}

type RecipientRow = {
  award_id: string
  user_id: string
  balance_after: number | null
  coin_transaction_id: string | null
}

type AwardRequestRow = {
  id: string
  tenant_id: string
  requester_user_id: string | null
  amount: number
  message: string | null
  idempotency_key: string
  status: 'pending' | 'approved' | 'rejected' | string
  award_id: string | null
  decided_by_user_id: string | null
  decided_at: string | null
  created_at: string
}

type _AwardRequestRecipientRow = {
  request_id: string
  user_id: string
}

function generateIdempotencyKey(prefix: string) {
  // zod requires min length 8
  return `${prefix}-${crypto.randomUUID()}`
}

function parseUuidList(input: string): { ids: string[]; invalid: string[] } {
  const tokens = input
    .split(/[^0-9a-fA-F-]+/g)
    .map((t) => t.trim())
    .filter(Boolean)

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const ids: string[] = []
  const invalid: string[] = []

  for (const t of tokens) {
    if (uuidRe.test(t)) ids.push(t)
    else invalid.push(t)
  }

  return { ids: Array.from(new Set(ids)), invalid }
}

export default function GamificationAwardsAdminPage() {
  const { user } = useAuth()
  const { currentTenant } = useTenant()

  const isSystem = (user?.app_metadata as { role?: string } | undefined)?.role === 'system_admin'

  const [targetUserIdsText, setTargetUserIdsText] = useState('')
  const [amount, setAmount] = useState(10)
  const [message, setMessage] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey('admin-award'))

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<
    | {
        status: 'awarded' | 'pending'
        awardId: string | null
        requestId: string | null
        count: number
      }
    | null
  >(null)

  const [awards, setAwards] = useState<AwardRow[]>([])
  const [recipientCountByAwardId, setRecipientCountByAwardId] = useState<Record<string, number>>({})
  const [recipientRowsByAwardId, setRecipientRowsByAwardId] = useState<Record<string, RecipientRow[]>>({})
  const [expandedAwardIds, setExpandedAwardIds] = useState<Record<string, boolean>>({})
  const [auditEvents, setAuditEvents] = useState<AuditRow[]>([])

  const [awardRequests, setAwardRequests] = useState<AwardRequestRow[]>([])
  const [requestRecipientCountByRequestId, setRequestRecipientCountByRequestId] = useState<Record<string, number>>({})
  const [requestRecipientIdsByRequestId, setRequestRecipientIdsByRequestId] = useState<Record<string, string[]>>({})
  const [decidingRequestId, setDecidingRequestId] = useState<string | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const parsedTargets = useMemo(() => parseUuidList(targetUserIdsText), [targetUserIdsText])

  const reload = useCallback(async () => {
    if (!currentTenant) return

    setLoading(true)
    try {
      const [awardsRes, auditRes, requestsRes] = await Promise.all([
        supabase
          .from('gamification_admin_awards')
          .select('id, tenant_id, actor_user_id, amount, message, idempotency_key, created_at, actor:users(id, email, full_name)')
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('tenant_audit_logs')
          .select('id, tenant_id, actor_user_id, event_type, payload, created_at, actor:users(id, email, full_name)')
          .eq('tenant_id', currentTenant.id)
          .eq('event_type', 'gamification.admin_award_coins.v1')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('gamification_admin_award_requests')
          .select(
            'id, tenant_id, requester_user_id, amount, message, idempotency_key, status, award_id, decided_by_user_id, decided_at, created_at',
          )
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const awardsRows = (awardsRes.data ?? []) as AwardRow[]
      setAwards(awardsRows)
      setAuditEvents((auditRes.data ?? []) as AuditRow[])

      const requestRows = (requestsRes.data ?? []) as AwardRequestRow[]
      setAwardRequests(requestRows)

      const awardIds = awardsRows.map((a) => a.id).filter(Boolean)
      if (awardIds.length > 0) {
        const { data: recipientRows } = await supabase
          .from('gamification_admin_award_recipients')
          .select('award_id, user_id, balance_after, coin_transaction_id')
          .in('award_id', awardIds)

        const counts: Record<string, number> = {}
        const rowsByAward: Record<string, RecipientRow[]> = {}
        for (const row of (recipientRows ?? []) as Array<Record<string, unknown>>) {
          const awardId = row?.award_id
          const userId = row?.user_id
          if (typeof awardId !== 'string' || !awardId) continue
          if (typeof userId !== 'string' || !userId) continue

          const balanceAfter = row?.balance_after
          const coinTxId = row?.coin_transaction_id

          const normalized: RecipientRow = {
            award_id: awardId,
            user_id: userId,
            balance_after: typeof balanceAfter === 'number' ? balanceAfter : null,
            coin_transaction_id: typeof coinTxId === 'string' ? coinTxId : null,
          }

          rowsByAward[awardId] = rowsByAward[awardId] ?? []
          rowsByAward[awardId].push(normalized)
          counts[awardId] = (counts[awardId] ?? 0) + 1
        }
        setRecipientCountByAwardId(counts)
        setRecipientRowsByAwardId(rowsByAward)
      } else {
        setRecipientCountByAwardId({})
        setRecipientRowsByAwardId({})
      }

      const requestIds = requestRows.map((r) => r.id).filter(Boolean)
      if (requestIds.length > 0) {
        const { data: requestRecipientRows } = await supabase
          .from('gamification_admin_award_request_recipients')
          .select('request_id, user_id')
          .in('request_id', requestIds)

        const counts: Record<string, number> = {}
        const idsBy: Record<string, string[]> = {}
        for (const row of (requestRecipientRows ?? []) as Array<Record<string, unknown>>) {
          const requestId = row?.request_id
          const userId = row?.user_id
          if (typeof requestId !== 'string' || !requestId) continue
          if (typeof userId !== 'string' || !userId) continue

          idsBy[requestId] = idsBy[requestId] ?? []
          idsBy[requestId].push(userId)
          counts[requestId] = (counts[requestId] ?? 0) + 1
        }

        setRequestRecipientCountByRequestId(counts)
        setRequestRecipientIdsByRequestId(idsBy)
      } else {
        setRequestRecipientCountByRequestId({})
        setRequestRecipientIdsByRequestId({})
      }
    } finally {
      setLoading(false)
    }
  }, [currentTenant])

  useEffect(() => {
    if (!currentTenant) return
    void reload()
  }, [currentTenant, reload])

  const handleSubmit = async () => {
    if (!user || !currentTenant) return

    setSubmitError(null)
    setSubmitResult(null)

    const { ids, invalid } = parsedTargets
    if (invalid.length > 0) {
      setSubmitError(`Ogiltiga UUID: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '…' : ''}`)
      return
    }

    if (ids.length === 0) {
      setSubmitError('Ange minst 1 mottagare (UUID).')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setSubmitError('Belopp måste vara ett positivt heltal.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/gamification/awards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          targetUserIds: ids,
          amount: Math.floor(amount),
          message: message.trim() ? message.trim() : undefined,
          idempotencyKey,
        }),
      })

      const json = (await res.json().catch(() => ({}))) as unknown
      if (!res.ok) {
        const errMsg =
          typeof (json as { error?: unknown })?.error === 'string'
            ? ((json as { error: string }).error as string)
            : 'Award misslyckades'
        setSubmitError(errMsg)
        return
      }

      const status = (json as { status?: unknown })?.status
      if (status === 'pending') {
        const requestId = (json as { requestId?: unknown })?.requestId
        const recipientCount = (json as { recipientCount?: unknown })?.recipientCount
        setSubmitResult({
          status: 'pending',
          awardId: null,
          requestId: typeof requestId === 'string' ? requestId : null,
          count: typeof recipientCount === 'number' ? recipientCount : ids.length,
        })
      } else {
        const awardId = (json as { awardId?: unknown })?.awardId
        const awardedCount = (json as { awardedCount?: unknown })?.awardedCount
        setSubmitResult({
          status: 'awarded',
          awardId: typeof awardId === 'string' ? awardId : null,
          requestId: null,
          count: typeof awardedCount === 'number' ? awardedCount : ids.length,
        })
      }

      setIdempotencyKey(generateIdempotencyKey('admin-award'))
      setTargetUserIdsText('')
      setMessage('')

      await reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Okänt fel'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const decideRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!currentTenant) return
    setDecisionError(null)
    setDecidingRequestId(requestId)

    try {
      const res = await fetch(`/api/admin/gamification/awards/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const json = (await res.json().catch(() => ({}))) as unknown
      if (!res.ok) {
        const errMsg =
          typeof (json as { error?: unknown })?.error === 'string'
            ? ((json as { error: string }).error as string)
            : 'Kunde inte uppdatera request'
        setDecisionError(errMsg)
        return
      }

      await reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Okänt fel'
      setDecisionError(msg)
    } finally {
      setDecidingRequestId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Manual awards</h1>
          <p className="text-muted-foreground">Dela ut coins manuellt (+ valfritt meddelande) och få audit-spår.</p>
        </div>
        <Button onClick={reload} disabled={loading || !currentTenant}>
          Uppdatera
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ny utdelning</CardTitle>
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
              <div className="text-sm font-medium">Idempotency key</div>
              <Input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} />
              <div className="text-xs text-muted-foreground">Återanvänd samma key för att göra requesten idempotent.</div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium">Mottagare (UUID)</div>
              <Input
                placeholder="uuid1, uuid2, uuid3"
                value={targetUserIdsText}
                onChange={(e) => setTargetUserIdsText(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Antal: {parsedTargets.ids.length}</span>
                {parsedTargets.invalid.length > 0 ? (
                  <Badge variant="destructive">Ogiltiga: {parsedTargets.invalid.length}</Badge>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Belopp</div>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={1}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Meddelande (valfritt)</div>
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tack för insatsen!" />
            </div>

            <div className="md:col-span-2">
              <Button onClick={handleSubmit} disabled={!user || !currentTenant || submitting}>
                {submitting ? 'Skickar…' : 'Dela ut'}
              </Button>

              {submitError ? <div className="mt-3 text-sm text-destructive">{submitError}</div> : null}
              {submitResult ? (
                <div className="mt-3 text-sm text-muted-foreground">
                  {submitResult.status === 'pending'
                    ? `Skickat för godkännande: ${submitResult.count} mottagare.${submitResult.requestId ? ` RequestId: ${submitResult.requestId}` : ''}`
                    : `Klart: ${submitResult.count} mottagare. ${submitResult.awardId ? `AwardId: ${submitResult.awardId}` : ''}`}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utdelningar för godkännande</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Laddar…</div>
          ) : awardRequests.length === 0 ? (
            <div className="text-sm text-muted-foreground">Inga requests ännu.</div>
          ) : (
            <div className="space-y-3">
              {decisionError ? <div className="text-sm text-destructive">{decisionError}</div> : null}
              {awardRequests.map((r) => {
                const recipientCount = requestRecipientCountByRequestId[r.id] ?? 0
                const recipientIds = requestRecipientIdsByRequestId[r.id] ?? []
                return (
                  <div key={r.id} className="rounded-md border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="text-sm font-medium">
                        +{r.amount} coins <Badge className="ml-2" variant={r.status === 'pending' ? 'secondary' : 'outline'}>
                          {r.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Requester:{' '}
                      {r.requester_user_id ?? '—'}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Mottagare: {recipientCount}</div>
                    {r.message ? <div className="mt-1 text-sm text-muted-foreground">{r.message}</div> : null}
                    <div className="mt-2 text-xs text-muted-foreground">RequestId: {r.id}</div>
                    {recipientIds.length > 0 ? (
                      <div className="mt-2 rounded bg-muted p-2 text-xs">
                        <div className="mb-2 text-muted-foreground">Mottagare (max 25)</div>
                        <div className="space-y-1">
                          {recipientIds.slice(0, 25).map((uid) => (
                            <div key={uid} className="font-mono">
                              {uid}
                            </div>
                          ))}
                        </div>
                        {recipientIds.length > 25 ? (
                          <div className="mt-2 text-muted-foreground">… +{recipientIds.length - 25} till</div>
                        ) : null}
                      </div>
                    ) : null}

                    {isSystem && r.status === 'pending' ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          onClick={() => decideRequest(r.id, 'approve')}
                          disabled={decidingRequestId === r.id}
                        >
                          {decidingRequestId === r.id ? 'Jobbar…' : 'Godkänn'}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => decideRequest(r.id, 'reject')}
                          disabled={decidingRequestId === r.id}
                        >
                          {decidingRequestId === r.id ? 'Jobbar…' : 'Avslå'}
                        </Button>
                      </div>
                    ) : null}

                    {r.award_id ? <div className="mt-2 text-xs text-muted-foreground">AwardId: {r.award_id}</div> : null}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Senaste awards</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Laddar…</div>
            ) : awards.length === 0 ? (
              <div className="text-sm text-muted-foreground">Inga awards ännu.</div>
            ) : (
              <div className="space-y-3">
                {awards.map((a) => (
                  <div key={a.id} className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-medium">+{a.amount} coins</div>
                      <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Utdelat av:{' '}
                      {a.actor?.full_name ? a.actor.full_name : a.actor?.email ? a.actor.email : a.actor_user_id ?? '—'}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span>Mottagare: {recipientCountByAwardId[a.id] ?? 0}</span>
                      <Button
                        variant="ghost"
                        className="ml-2 h-6 px-2 text-xs"
                        onClick={() =>
                          setExpandedAwardIds((prev) => ({
                            ...prev,
                            [a.id]: !prev[a.id],
                          }))
                        }
                      >
                        {expandedAwardIds[a.id] ? 'Dölj' : 'Visa'}
                      </Button>
                    </div>

                    {expandedAwardIds[a.id] ? (
                      <div className="mt-2 rounded bg-muted p-2 text-xs">
                        {(() => {
                          const rows = recipientRowsByAwardId[a.id] ?? []
                          if (rows.length === 0) return <div className="text-muted-foreground">Inga mottagare hittades.</div>
                          const MAX = 50
                          const shown = rows.slice(0, MAX)
                          return (
                            <>
                              <div className="mb-2 text-muted-foreground">Mottagare</div>
                              <div className="space-y-1">
                                {shown.map((r) => (
                                  <div key={r.user_id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-mono">{r.user_id}</span>
                                    {typeof r.balance_after === 'number' ? (
                                      <span className="text-muted-foreground">saldo: {r.balance_after}</span>
                                    ) : null}
                                    {r.coin_transaction_id ? (
                                      <span className="text-muted-foreground">tx: {r.coin_transaction_id}</span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                              {rows.length > MAX ? (
                                <div className="mt-2 text-muted-foreground">… +{rows.length - MAX} till</div>
                              ) : null}
                            </>
                          )
                        })()}
                      </div>
                    ) : null}

                    {a.message ? <div className="mt-1 text-sm text-muted-foreground">{a.message}</div> : null}
                    <div className="mt-2 text-xs text-muted-foreground">Idempotency: {a.idempotency_key}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit (tenant_audit_logs)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Laddar…</div>
            ) : auditEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground">Inga audit events ännu.</div>
            ) : (
              <div className="space-y-3">
                {auditEvents.map((e) => (
                  <div key={e.id} className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs text-muted-foreground">{e.event_type}</div>
                      <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Aktör:{' '}
                      {e.actor?.full_name ? e.actor.full_name : e.actor?.email ? e.actor.email : e.actor_user_id ?? '—'}
                    </div>
                    {e.payload ? (
                      <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
