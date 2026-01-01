import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'
import { applyRateLimitMiddleware } from '@/lib/utils/rate-limiter'
import type { Json } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const schema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  eventType: z.string().min(1),
  source: z.enum(['planner', 'play', 'admin', 'system']),
  idempotencyKey: z.string().min(8),
  metadata: z.record(z.unknown()).optional(),
  rewardCoins: z.number().int().positive().optional(),
  rewardReasonCode: z.string().min(1).optional(),
})

/**
 * POST /api/gamification/events
 * Event Contract v1 ingestion endpoint.
 *
 * - Authenticated user required
 * - Requires that user is member of tenant (or system_admin)
 * - Writes via service role to append-only `public.gamification_events`
 * - Idempotent via unique index (tenant_id, source, idempotency_key)
 */
export async function POST(request: Request) {
  const rate = applyRateLimitMiddleware(request as NextRequest, 'api')
  if (rate) return rate

  const supabase = await createServerRlsClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId: rawTenantId, eventType, source, idempotencyKey, metadata, rewardCoins, rewardReasonCode } = parsed.data
  const tenantId = rawTenantId ?? null

  const isAdmin = isSystemAdmin(user) || (tenantId ? await isTenantAdmin(tenantId, user.id) : false)

  // Enterprise safety: product sources are server-emitted only.
  // This endpoint is reserved for admin/system operations and debugging.
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (source === 'planner' || source === 'play') {
    return NextResponse.json(
      { error: 'Invalid payload', details: { source: ['planner/play events must be emitted server-side'] } },
      { status: 400 }
    )
  }

  // Enterprise safety: minting coins via events is admin/system only.
  if (typeof rewardCoins === 'number' && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (typeof rewardCoins === 'number' && source !== 'admin' && source !== 'system') {
    return NextResponse.json(
      { error: 'Invalid payload', details: { rewardCoins: ['Coins are determined server-side for planner/play events'] } },
      { status: 400 }
    )
  }

  if (!tenantId && typeof rewardCoins === 'number') {
    return NextResponse.json({ error: 'Invalid payload', details: { rewardCoins: ['Global events cannot mint coins'] } }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  try {
    const insertPayload = {
      tenant_id: tenantId,
      actor_user_id: user.id,
      event_type: eventType,
      source,
      idempotency_key: idempotencyKey,
      metadata: (metadata ?? undefined) as unknown as Json | undefined,
    }

    const { data: inserted, error: insertError } = await admin
      .from('gamification_events')
      .insert(insertPayload)
      .select('id')
      .maybeSingle()

    if (insertError) {
      const code = String(insertError.code ?? '')

      // Unique violation → idempotent response
      if (code === '23505') {
        const existingQuery = admin
          .from('gamification_events')
          .select('id')
          .eq('source', source)
          .eq('idempotency_key', idempotencyKey)

        if (tenantId) {
          existingQuery.eq('tenant_id', tenantId)
        } else {
          existingQuery.is('tenant_id', null)
        }

        const { data: existing } = await existingQuery.maybeSingle()

        const existingEventId = existing?.id ?? null
        if (existingEventId && typeof rewardCoins === 'number' && tenantId) {
          const coinIdempotencyKey = `evt:${existingEventId}:coins`
          const { data: coinData, error: coinError } = await admin.rpc('apply_coin_transaction_v1', {
            p_user_id: user.id,
            p_tenant_id: tenantId,
            p_type: 'earn',
            p_amount: rewardCoins,
            p_reason_code: rewardReasonCode ?? `event:${eventType}`,
            p_idempotency_key: coinIdempotencyKey,
            p_description: `Reward for ${eventType}`,
            p_source: source,
            p_metadata: ({ eventId: existingEventId, eventType } as unknown as Json),
          })

          if (coinError) {
            return NextResponse.json(
              { error: 'Coin award failed', details: coinError.message ?? 'Unknown error' },
              { status: 500 }
            )
          }

          const row = Array.isArray(coinData) ? coinData[0] : coinData
          return NextResponse.json(
            {
              eventId: existingEventId,
              idempotent: true,
              coinTransactionId: row?.transaction_id ?? null,
              balance: row?.balance ?? null,
            },
            { status: 200 }
          )
        }

        return NextResponse.json({ eventId: existingEventId, idempotent: true }, { status: 200 })
      }

      return NextResponse.json(
        { error: 'Event insert failed', details: insertError.message ?? 'Unknown error' },
        { status: 500 }
      )
    }

    const eventId = inserted?.id ?? null
    if (eventId && typeof rewardCoins === 'number' && tenantId) {
      const coinIdempotencyKey = `evt:${eventId}:coins`
      const { data: coinData, error: coinError } = await admin.rpc('apply_coin_transaction_v1', {
        p_user_id: user.id,
        p_tenant_id: tenantId,
        p_type: 'earn',
        p_amount: rewardCoins,
        p_reason_code: rewardReasonCode ?? `event:${eventType}`,
        p_idempotency_key: coinIdempotencyKey,
        p_description: `Reward for ${eventType}`,
        p_source: source,
        p_metadata: ({ eventId, eventType } as unknown as Json),
      })

      if (coinError) {
        return NextResponse.json(
          { error: 'Coin award failed', details: coinError.message ?? 'Unknown error' },
          { status: 500 }
        )
      }

      const row = Array.isArray(coinData) ? coinData[0] : coinData
      return NextResponse.json(
        {
          eventId,
          idempotent: false,
          coinTransactionId: row?.transaction_id ?? null,
          balance: row?.balance ?? null,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ eventId, idempotent: false }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 })
  }
}
