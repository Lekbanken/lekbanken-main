import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'
import { apiHandler } from '@/lib/api/route-handler'

async function userTenantRole(supabase: Awaited<ReturnType<typeof createServerRlsClient>>, tenantId: string, userId: string) {
  const { data, error } = await supabase
     .from('user_tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.warn('[billing/stripe-customer] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'strict',
  handler: async ({ auth, req, params }) => {
  const { tenantId } = params
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const role = await userTenantRole(supabase, tenantId, userId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
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
  },
})
