import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

const stripeSecret = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' }) : null

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
    console.warn('[billing/stripe-customer] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  if (process.env.STRIPE_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Stripe integration temporarily disabled' }, { status: 501 })
  }
  if (!stripe) {
    console.error('[billing/stripe-customer] Missing STRIPE_SECRET_KEY')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, tenantId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    email?: string
  }

  // Check if account already exists
  const { data: existing } = await supabase
    .from('billing_accounts')
    .select('id, provider_customer_id')
    .eq('tenant_id', tenantId)
    .eq('provider', 'stripe')
    .maybeSingle()

  if (existing?.provider_customer_id) {
    return NextResponse.json({ customer_id: existing.provider_customer_id })
  }

  // Create Stripe customer
  const customer = await stripe.customers.create({
    name: body.name || undefined,
    email: body.email || undefined,
    metadata: { tenant_id: tenantId },
  })

  // Insert billing_accounts
  const { error } = await supabase
    .from('billing_accounts')
    .insert({
      tenant_id: tenantId,
      provider: 'stripe',
      provider_customer_id: customer.id,
    })

  if (error) {
    console.error('[billing/stripe-customer] insert error', error)
    return NextResponse.json({ error: 'Stripe customer created but local insert failed' }, { status: 500 })
  }

  return NextResponse.json({ customer_id: customer.id })
}
