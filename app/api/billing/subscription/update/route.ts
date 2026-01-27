import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe/config'
import { supabaseAdmin, createServerRlsClient } from '@/lib/supabase/server'

const subscriptionUpdateSchema = z.object({
  tenantId: z.string().uuid(),
  newPriceId: z.string(), // Stripe price ID
  prorationBehavior: z.enum(['create_prorations', 'none', 'always_invoice']).default('create_prorations'),
})

/**
 * POST /api/billing/subscription/update
 * 
 * Updates an existing subscription to a new price (upgrade/downgrade).
 * Handles Stripe proration automatically.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = subscriptionUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, newPriceId, prorationBehavior } = parsed.data

  // Verify user has owner/admin role for this tenant
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('user_tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json(
      { error: 'Only organization owners and admins can update subscriptions', code: 'INSUFFICIENT_ROLE' },
      { status: 403 }
    )
  }

  // Get the tenant's Stripe customer ID
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('metadata')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const stripeCustomerId = (tenant.metadata as Record<string, unknown>)?.stripe_customer_id as string | undefined

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: 'No Stripe customer found for this organization', code: 'NO_STRIPE_CUSTOMER' },
      { status: 400 }
    )
  }

  // Get the customer's active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
    limit: 10,
  })

  if (subscriptions.data.length === 0) {
    return NextResponse.json(
      { error: 'No active subscription found', code: 'NO_ACTIVE_SUBSCRIPTION' },
      { status: 400 }
    )
  }

  // For simplicity, we update the first subscription's first item
  // In a more complex setup, you'd need to identify which subscription/item to update
  const subscription = subscriptions.data[0]
  const subscriptionItem = subscription.items.data[0]

  if (!subscriptionItem) {
    return NextResponse.json(
      { error: 'Subscription has no items', code: 'NO_SUBSCRIPTION_ITEMS' },
      { status: 400 }
    )
  }

  try {
    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscriptionItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: prorationBehavior,
    })

    // Update local records if needed
    const { error: updateError } = await supabaseAdmin
      .from('purchase_intents')
      .update({
        product_price_id: newPriceId,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)
      .eq('status', 'provisioned')

    if (updateError) {
      console.warn('[subscription-update] Failed to update purchase_intent', updateError)
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodEnd: updatedSubscription.current_period_end,
        items: updatedSubscription.items.data.map((item) => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity,
        })),
      },
    })
  } catch (error) {
    console.error('[subscription-update] Stripe error:', error)
    
    if (error instanceof Error && 'type' in error) {
      const stripeError = error as { type: string; message: string }
      return NextResponse.json(
        { error: stripeError.message, code: 'STRIPE_ERROR' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update subscription', code: 'UPDATE_FAILED' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/billing/subscription/update?tenantId=xxx&newPriceId=yyy
 * 
 * Preview proration for a subscription change without applying it.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const newPriceId = searchParams.get('newPriceId')

  if (!tenantId || !newPriceId) {
    return NextResponse.json({ error: 'Missing tenantId or newPriceId' }, { status: 400 })
  }

  // Verify user has access to this tenant
  const { data: membership } = await supabaseAdmin
    .from('user_tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Get tenant's Stripe customer ID
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('metadata')
    .eq('id', tenantId)
    .single()

  const stripeCustomerId = (tenant?.metadata as Record<string, unknown>)?.stripe_customer_id as string | undefined

  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
  }

  // Get active subscription
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
    limit: 1,
  })

  if (subscriptions.data.length === 0) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
  }

  const subscription = subscriptions.data[0]
  const subscriptionItem = subscription.items.data[0]

  if (!subscriptionItem) {
    return NextResponse.json({ error: 'Subscription has no items' }, { status: 400 })
  }

  try {
    // Create an upcoming invoice preview with the new price
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: stripeCustomerId,
      subscription: subscription.id,
      subscription_items: [
        {
          id: subscriptionItem.id,
          price: newPriceId,
        },
      ],
      subscription_proration_behavior: 'create_prorations',
    })

    // Calculate proration details
    const prorationItems = upcomingInvoice.lines.data.filter(
      (line) => line.proration
    )

    const totalProration = prorationItems.reduce((sum, item) => sum + item.amount, 0)
    const newMonthlyAmount = upcomingInvoice.lines.data
      .filter((line) => !line.proration)
      .reduce((sum, item) => sum + item.amount, 0)

    return NextResponse.json({
      preview: {
        currentPriceId: subscriptionItem.price.id,
        newPriceId,
        prorationAmount: totalProration / 100,
        prorationCredit: totalProration < 0 ? Math.abs(totalProration) / 100 : 0,
        prorationCharge: totalProration > 0 ? totalProration / 100 : 0,
        newMonthlyAmount: newMonthlyAmount / 100,
        currency: upcomingInvoice.currency,
        effectiveDate: subscription.current_period_end,
        billingPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      },
    })
  } catch (error) {
    console.error('[subscription-preview] Stripe error:', error)
    return NextResponse.json(
      { error: 'Failed to preview subscription change' },
      { status: 500 }
    )
  }
}
