import type { NextRequest } from 'next/server'
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
    console.warn('[billing/subscription] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, tenantId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select('*, billing_product:billing_products(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[billing/subscription] select error', error)
    return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 })
  }

  return NextResponse.json({ subscription: data })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, tenantId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    billing_product_id: string
    seats_purchased?: number
    start_date?: string
    renewal_date?: string | null
    status?: 'trial' | 'active' | 'paused' | 'canceled'
  }

  if (!body.billing_product_id) return NextResponse.json({ error: 'billing_product_id is required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('tenant_subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const payload = {
    tenant_id: tenantId,
    billing_product_id: body.billing_product_id,
    seats_purchased: body.seats_purchased ?? 1,
    start_date: body.start_date ?? new Date().toISOString().slice(0, 10),
    renewal_date: body.renewal_date ?? null,
    status: body.status ?? 'trial',
  }

  let result
  if (existing?.id) {
    const { data, error } = await supabase
      .from('tenant_subscriptions')
      .update(payload)
      .eq('id', existing.id)
      .select('*, billing_product:billing_products(*)')
      .maybeSingle()
    if (error) {
      console.error('[billing/subscription] update error', error)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }
    result = data
  } else {
    const { data, error } = await supabase
      .from('tenant_subscriptions')
      .insert(payload)
      .select('*, billing_product:billing_products(*)')
      .maybeSingle()
    if (error) {
      console.error('[billing/subscription] insert error', error)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }
    result = data
  }

  return NextResponse.json({ subscription: result })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = await userTenantRole(supabase, tenantId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    subscription_id?: string
    status?: 'trial' | 'active' | 'paused' | 'canceled'
    seats_purchased?: number
    renewal_date?: string | null
    cancelled_at?: string | null
  }

  const subscriptionId = body.subscription_id
  if (!subscriptionId) return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.seats_purchased !== undefined) updates.seats_purchased = body.seats_purchased
  if (body.renewal_date !== undefined) updates.renewal_date = body.renewal_date
  if (body.cancelled_at !== undefined) updates.cancelled_at = body.cancelled_at

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .eq('tenant_id', tenantId)
    .select('*, billing_product:billing_products(*)')
    .maybeSingle()

  if (error) {
    console.error('[billing/subscription] patch error', error)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }

  return NextResponse.json({ subscription: data })
}
