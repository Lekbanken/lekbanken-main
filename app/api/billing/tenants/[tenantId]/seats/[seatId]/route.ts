import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

async function userTenantRole(supabase: Awaited<ReturnType<typeof createServerRlsClient>>, tenantId: string, userId: string) {
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.warn('[billing/seat] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { tenantId, seatId } = params
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()
  const role = await userTenantRole(supabase, tenantId, userId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    status?: 'pending' | 'active' | 'released' | 'revoked'
  }

  if (!body.status) return NextResponse.json({ error: 'status is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tenant_seat_assignments')
    .update({ status: body.status, released_at: body.status === 'released' ? new Date().toISOString() : null })
    .eq('id', seatId)
    .eq('tenant_id', tenantId)
    .select('*, user:users(id,email,full_name), subscription:tenant_subscriptions(*), billing_product:billing_products(*)')
    .maybeSingle()

  if (error) {
    console.error('[billing/seat] patch error', error)
    return NextResponse.json({ error: 'Failed to update seat' }, { status: 500 })
  }

  return NextResponse.json({ seat: data })
  },
})
