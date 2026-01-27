import { NextResponse } from 'next/server'
import { z } from 'zod'

import { stripe } from '@/lib/stripe/config'
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const portalSchema = z.object({
  tenantId: z.string().uuid(),
})

/**
 * Task 1.6: Create Stripe Customer Portal session
 * Allows users to manage their subscriptions (cancel, update payment, view invoices)
 */
export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = portalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { tenantId } = parsed.data

  // Verify user has access to this tenant (owner or admin)
  const { data: membership } = await supabaseAdmin
    .from('user_tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json(
      { error: 'Only organization owners and admins can access billing' },
      { status: 403 }
    )
  }

  // Look up Stripe customer ID from tenant metadata or billing_accounts
  // First try tenant metadata (simpler path)
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('metadata')
    .eq('id', tenantId)
    .single()

  let stripeCustomerId = (tenant?.metadata as Record<string, unknown>)?.stripe_customer_id as string | undefined

  // Fallback: check purchase_intents for this tenant
  if (!stripeCustomerId) {
    const { data: intent } = await supabaseAdmin
      .from('purchase_intents')
      .select('stripe_customer_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'provisioned')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    stripeCustomerId = intent?.stripe_customer_id ?? undefined
  }

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account found for this organization' },
      { status: 404 }
    )
  }

  // Create portal session
  const origin = new URL(request.url).origin
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/app/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/portal] stripe portal session error', err)
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}
