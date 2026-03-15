import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

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

export const POST = apiHandler({
  auth: 'user',
  input: postSchema,
  handler: async ({ auth, body }) => {
    const { tenantId, itemId, idempotencyKey } = body

    const supabase = await createServerRlsClient()

    if (auth!.effectiveGlobalRole !== 'system_admin') {
      const ok = await requireTenantMembership(supabase, tenantId, auth!.user!.id)
      if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = auth!.user!.id

    try {
      const admin = createServiceRoleClient()

      const { data, error } = await admin.rpc('consume_powerup_v1', {
        p_user_id: userId,
        p_tenant_id: tenantId,
        p_shop_item_id: itemId,
        p_idempotency_key: idempotencyKey,
      })

      if (error) {
        const message = typeof error?.message === 'string' ? error.message : 'Unknown error'
        const status = message.toLowerCase().includes('insufficient') ? 409 : 500
        return NextResponse.json({ error: 'Consume failed' }, { status })
      }

      const row = Array.isArray(data) ? data[0] : data
      return NextResponse.json({ remainingQuantity: row?.remaining_quantity ?? 0 }, { status: 200 })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      console.error('[shop/powerups/consume] unexpected error:', message)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
  },
})
