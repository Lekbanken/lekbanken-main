import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  tenantId: z.string().uuid(),
  windowDays: z.coerce.number().int().min(1).max(365).optional(),
})

export async function GET(request: Request, ctx: { params: Promise<{ campaignId: string }> }) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { campaignId } = await ctx.params
  if (!campaignId || !z.string().uuid().safeParse(campaignId).success) {
    return NextResponse.json({ error: 'Invalid campaignId' }, { status: 400 })
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    tenantId: url.searchParams.get('tenantId'),
    windowDays: url.searchParams.get('windowDays') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, windowDays } = parsed.data

  const allowed = await assertTenantAdminOrSystem(tenantId, user)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin.rpc('admin_get_campaign_analytics_v1', {
    p_tenant_id: tenantId,
    p_campaign_id: campaignId,
    p_window_days: windowDays ?? 30,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to load campaign analytics', details: error.message }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  return NextResponse.json(
    {
      tenantId,
      campaignId,
      windowDays: row?.window_days ?? windowDays ?? 30,
      since: row?.since ?? null,
      totals: row?.totals ?? { count: 0, totalAmount: 0, avgAmount: 0 },
      daily: row?.daily ?? [],
    },
    { status: 200 }
  )
}
