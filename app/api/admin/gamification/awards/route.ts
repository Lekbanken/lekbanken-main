import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { assertTenantAdminOrSystem, isSystemAdmin } from '@/lib/utils/tenantAuth'
import { applyRateLimitMiddleware } from '@/lib/utils/rate-limiter'

export const dynamic = 'force-dynamic'

const APPROVAL_THRESHOLD = Number(process.env.GAMIFICATION_AWARD_APPROVAL_THRESHOLD ?? '500')

const schema = z.object({
  tenantId: z.string().uuid(),
  targetUserIds: z.array(z.string().uuid()).min(1).max(200),
  amount: z.number().int().positive(),
  message: z.string().max(1000).optional(),
  idempotencyKey: z.string().min(8),
})

/**
 * POST /api/admin/gamification/awards
 * Manual awards (MVP): award coins (+ optional message) to one or many users.
 *
 * - Requires tenant_admin or system_admin
 * - Uses service role + DB function for atomicity & idempotency
 */
export async function POST(request: NextRequest) {
  const rate = applyRateLimitMiddleware(request, 'strict')
  if (rate) return rate

  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, targetUserIds, amount, message, idempotencyKey } = parsed.data

  const allowed = await assertTenantAdminOrSystem(tenantId, user)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const admin = createServiceRoleClient()

    // Large awards require explicit approval unless actor is system_admin.
    if (Number.isFinite(APPROVAL_THRESHOLD) && amount >= APPROVAL_THRESHOLD && !isSystemAdmin(user)) {
      const { data, error } = await admin.rpc('admin_request_award_coins_v1', {
        p_tenant_id: tenantId,
        p_actor_user_id: user.id,
        p_target_user_ids: targetUserIds,
        p_amount: amount,
        p_message: message ?? null,
        p_idempotency_key: idempotencyKey,
      })

      if (error) {
        const msg = typeof error?.message === 'string' ? error.message : 'Unknown error'
        return NextResponse.json({ error: 'Award request failed', details: msg }, { status: 500 })
      }

      const rows = Array.isArray(data) ? data : []
      const requestId = rows[0]?.request_id ?? null

      return NextResponse.json(
        {
          status: 'pending',
          requestId,
          amount,
          recipientCount: rows[0]?.recipient_count ?? targetUserIds.length,
        },
        { status: 200 },
      )
    }

    const { data, error } = await admin.rpc('admin_award_coins_v1', {
      p_tenant_id: tenantId,
      p_actor_user_id: user.id,
      p_target_user_ids: targetUserIds,
      p_amount: amount,
      p_message: message ?? null,
      p_idempotency_key: idempotencyKey,
    })

    if (error) {
      const msg = typeof error?.message === 'string' ? error.message : 'Unknown error'
      return NextResponse.json({ error: 'Award failed', details: msg }, { status: 500 })
    }

    const rows = Array.isArray(data) ? data : []
    const awardId = rows[0]?.award_id ?? null

    return NextResponse.json(
      {
        status: 'awarded',
        awardId,
        amount,
        awardedCount: rows.length,
        results: rows,
      },
      { status: 200 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'Server error', details: msg }, { status: 500 })
  }
}
