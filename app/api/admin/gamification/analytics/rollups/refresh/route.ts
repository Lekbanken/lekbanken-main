import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  tenantId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(365).optional(),
})

/**
 * POST /api/admin/gamification/analytics/rollups/refresh
 * Triggers refresh of gamification daily rollups for a tenant.
 *
 * - Requires tenant_admin or system_admin
 * - Executes via service role RPC
 */
export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'strict',
  input: bodySchema,
  handler: async ({ body }) => {
    const { tenantId, days } = body
    await requireTenantRole(['admin', 'owner'], tenantId)

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
  },
})
