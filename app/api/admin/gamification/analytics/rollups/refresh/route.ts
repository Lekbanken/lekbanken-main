import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  tenantId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(3650).optional(),
})

/**
 * POST /api/admin/gamification/analytics/rollups/refresh
 * Triggers refresh of gamification daily rollups for a tenant.
 *
 * - Requires tenant_admin or system_admin
 * - Executes via service role RPC
 */
export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = (await request.json().catch(() => null)) as unknown
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, days } = parsed.data

  const allowed = await assertTenantAdminOrSystem(tenantId, user)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin.rpc('refresh_gamification_daily_summaries_v1', {
    p_tenant_id: tenantId,
    p_days: days ?? 90,
  })

  if (error) {
    const msg = typeof error?.message === 'string' ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to refresh rollups', details: msg }, { status: 500 })
  }

  return NextResponse.json(
    {
      tenantId,
      days: days ?? 90,
      upsertedRows: typeof data === 'number' ? data : Number(data ?? 0),
      refreshedAt: new Date().toISOString(),
    },
    { status: 200 },
  )
}
