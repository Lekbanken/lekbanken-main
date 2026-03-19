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
    console.warn('[billing/seats] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
  const { tenantId } = params
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const role = await userTenantRole(supabase, tenantId, userId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('tenant_seat_assignments')
    .select('*, user:users(id,email,full_name), subscription:tenant_subscriptions(*), billing_product:billing_products(*)')
    .eq('tenant_id', tenantId)
    .order('assigned_at', { ascending: false })

  if (error) {
    console.error('[billing/seats] select error', error)
    return NextResponse.json({ error: 'Failed to load seats' }, { status: 500 })
  }

  return NextResponse.json({ seats: data ?? [] })
  },
})

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { tenantId } = params
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const role = await userTenantRole(supabase, tenantId, userId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    user_id: string
    subscription_id: string
    billing_product_id: string
    name?: string
  }

  if (!body.user_id || !body.subscription_id || !body.billing_product_id) {
    return NextResponse.json({ error: 'user_id, subscription_id and billing_product_id are required' }, { status: 400 })
  }

  // Atomic seat assignment via RPC — prevents TOCTOU race (BUG-020 / DD-RACE-1)
  const { data: newId, error: rpcError } = await supabase.rpc(
    'assign_seat_if_available' as never,
    {
      p_tenant_id: tenantId,
      p_user_id: body.user_id,
      p_subscription_id: body.subscription_id,
      p_billing_product_id: body.billing_product_id,
      p_name: body.name || '',
      p_assigned_by: userId,
    } as never
  )

  if (rpcError) {
    const msg = rpcError.message ?? ''
    if (msg.includes('no_seats_available')) {
      return NextResponse.json({ error: 'No seats available on this subscription' }, { status: 400 })
    }
    if (msg.includes('subscription_not_found') || msg.includes('subscription_tenant_mismatch')) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }
    if (msg.includes('subscription_canceled')) {
      return NextResponse.json({ error: 'Subscription is canceled' }, { status: 400 })
    }
    console.error('[billing/seats] rpc error', rpcError)
    return NextResponse.json({ error: 'Failed to assign seat' }, { status: 500 })
  }

  // Fetch the full seat record with relations for the response
  const { data, error } = await supabase
    .from('tenant_seat_assignments')
    .select('*, user:users(id,email,full_name), subscription:tenant_subscriptions(*), billing_product:billing_products(*)')
    .eq('id', newId as string)
    .maybeSingle()

  if (error) {
    console.error('[billing/seats] insert error', error)
    return NextResponse.json({ error: 'Failed to assign seat' }, { status: 500 })
  }

  return NextResponse.json({ seat: data })
  },
})
