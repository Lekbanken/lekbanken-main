import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null }
  return { supabase, user }
}

async function userTenantRole(supabase: Awaited<ReturnType<typeof createServerRlsClient>>, tenantId: string) {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
    .maybeSingle()
  if (error) {
    console.warn('[billing/seats] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

export async function GET(_: Request, { params }: { params: { tenantId: string } }) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, params.tenantId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('tenant_seat_assignments')
    .select('*, user:users(id,email,full_name), subscription:tenant_subscriptions(*), billing_product:billing_products(*)')
    .eq('tenant_id', params.tenantId)
    .order('assigned_at', { ascending: false })

  if (error) {
    console.error('[billing/seats] select error', error)
    return NextResponse.json({ error: 'Failed to load seats' }, { status: 500 })
  }

  return NextResponse.json({ seats: data ?? [] })
}

export async function POST(request: Request, { params }: { params: { tenantId: string } }) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, params.tenantId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    user_id: string
    subscription_id: string
    billing_product_id: string
    name?: string
  }

  if (!body.user_id || !body.subscription_id || !body.billing_product_id) {
    return NextResponse.json({ error: 'user_id, subscription_id and billing_product_id are required' }, { status: 400 })
  }

  const { data: subscription, error: subError } = await supabase
    .from('tenant_subscriptions')
    .select('id, seats_purchased, status, tenant_id')
    .eq('id', body.subscription_id)
    .maybeSingle()

  if (subError || !subscription || subscription.tenant_id !== params.tenantId) {
    console.error('[billing/seats] subscription fetch error', subError)
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  if (subscription.status === 'canceled') {
    return NextResponse.json({ error: 'Subscription is canceled' }, { status: 400 })
  }

  const { count, error: countError } = await supabase
    .from('tenant_seat_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_id', body.subscription_id)
    .not('status', 'in', '(released,revoked)')

  if (countError) {
    console.error('[billing/seats] count error', countError)
    return NextResponse.json({ error: 'Failed to validate seats' }, { status: 500 })
  }

  if (typeof count === 'number' && count >= subscription.seats_purchased) {
    return NextResponse.json({ error: 'No seats available on this subscription' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tenant_seat_assignments')
    .insert({
      tenant_id: params.tenantId,
      user_id: body.user_id,
      subscription_id: body.subscription_id,
      billing_product_id: body.billing_product_id,
      name: body.name || '',
      status: 'active',
    })
    .select('*, user:users(id,email,full_name), subscription:tenant_subscriptions(*), billing_product:billing_products(*)')
    .maybeSingle()

  if (error) {
    console.error('[billing/seats] insert error', error)
    return NextResponse.json({ error: 'Failed to assign seat' }, { status: 500 })
  }

  return NextResponse.json({ seat: data })
}
