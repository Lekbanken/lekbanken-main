import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'
import { applyRateLimitMiddleware } from '@/lib/utils/rate-limiter'

export const dynamic = 'force-dynamic'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
})

/**
 * PATCH /api/admin/gamification/awards/requests/:requestId
 * Approve/reject a pending award request.
 *
 * - Requires system_admin
 * - Uses service role + DB function for atomicity & idempotency
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const rate = applyRateLimitMiddleware(request, 'strict')
  if (rate) return rate

  const { requestId } = await context.params

  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  const { data, error } = await admin.rpc('admin_decide_award_request_v1', {
    p_request_id: requestId,
    p_decider_user_id: user.id,
    p_action: parsed.data.action,
  })

  if (error) {
    const msg = typeof error?.message === 'string' ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Decision failed', details: msg }, { status: 500 })
  }

  const rows = Array.isArray(data) ? data : []
  const row = rows[0] ?? null

  return NextResponse.json(
    {
      requestId,
      status: row?.status ?? null,
      awardId: row?.award_id ?? null,
      awardedCount: row?.awarded_count ?? 0,
    },
    { status: 200 },
  )
}
