import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'

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
export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'strict',
  input: schema,
  handler: async ({ auth, body }) => {
    const { tenantId, targetUserIds, amount, message, idempotencyKey } = body

    // Tenant admin or system admin required
    await requireTenantRole(['admin', 'owner'], tenantId)

    const admin = createServiceRoleClient()
    const userId = auth!.user!.id

    // Large awards require explicit approval unless actor is system_admin.
    if (Number.isFinite(APPROVAL_THRESHOLD) && amount >= APPROVAL_THRESHOLD && auth!.effectiveGlobalRole !== 'system_admin') {
      const { data, error } = await admin.rpc('admin_request_award_coins_v1', {
        p_tenant_id: tenantId,
        p_actor_user_id: userId,
        p_target_user_ids: targetUserIds,
        p_amount: amount,
        p_message: message ?? '',
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
      p_actor_user_id: userId,
      p_target_user_ids: targetUserIds,
      p_amount: amount,
      p_message: message ?? '',
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
  },
})
