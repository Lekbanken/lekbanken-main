import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  tenantId: z.string().uuid(),
  itemId: z.string().uuid(),
  idempotencyKey: z.string().min(8),
})

async function requireTenantMembership(
  supabase: Awaited<ReturnType<typeof createServerRlsClient>>,
  tenantId: string,
  userId: string
) {
  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return Boolean(membership)
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, itemId, idempotencyKey } = parsed.data

  if (!isSystemAdmin(user)) {
    const ok = await requireTenantMembership(supabase, tenantId, user.id)
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const admin = createServiceRoleClient()

    const { data, error } = await admin.rpc('consume_powerup_v1', {
      p_user_id: user.id,
      p_tenant_id: tenantId,
      p_shop_item_id: itemId,
      p_idempotency_key: idempotencyKey,
    })

    if (error) {
      const message = typeof error?.message === 'string' ? error.message : 'Unknown error'
      const status = message.toLowerCase().includes('insufficient') ? 409 : 500
      return NextResponse.json({ error: 'Consume failed', details: message }, { status })
    }

    const row = Array.isArray(data) ? data[0] : data
    return NextResponse.json({ remainingQuantity: row?.remaining_quantity ?? 0 }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 })
  }
}
