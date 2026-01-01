import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  tenantId: z.string().uuid(),
})

/**
 * GET /api/admin/gamification/campaign-templates?tenantId=...
 * Lists campaign templates available for a tenant.
 *
 * - Requires tenant_admin or system_admin
 * - Reads via service role
 */
export async function GET(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({ tenantId: url.searchParams.get('tenantId') })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId } = parsed.data
  const allowed = await assertTenantAdminOrSystem(tenantId, user)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('gamification_campaign_templates')
    .select('*')
    .is('tenant_id', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: 'Failed to load campaign templates', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data ?? [] }, { status: 200 })
}
