import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/subscription/my
 * Returns the current user's subscription and invoices for their active tenant
 */
export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Get user's active tenant membership
    const { data: memberships } = await supabaseAdmin
      .from('user_tenant_memberships')
      .select(`
        tenant_id,
        role,
        tenant:tenants(
          id,
          name,
          type,
          metadata
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({
        subscription: null,
        invoices: [],
        entitlements: [],
        tenant: null,
      })
    }

    // Use first (most recent) active tenant
    const membership = memberships[0]
    const tenantId = membership.tenant_id
    const tenant = membership.tenant as { id: string; name: string; type: string; metadata: Record<string, unknown> } | null

    // Get active entitlements for this tenant
    const { data: entitlements } = await supabaseAdmin
      .from('tenant_product_entitlements')
      .select(`
        id,
        status,
        quantity_seats,
        valid_from,
        valid_until,
        metadata,
        product:products(
          id,
          name,
          slug,
          description
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    // Get billing account to find Stripe customer ID
    const { data: billingAccount } = await supabaseAdmin
      .from('billing_accounts')
      .select('provider_customer_id')
      .eq('tenant_id', tenantId)
      .eq('provider', 'stripe')
      .maybeSingle()

    let subscription = null
    let invoices: Array<{
      id: string
      number: string | null
      status: string | null
      amount_due: number
      amount_paid: number
      currency: string
      created: number
      period_start: number
      period_end: number
      hosted_invoice_url: string | null
      invoice_pdf: string | null
    }> = []

    if (billingAccount?.provider_customer_id) {
      const customerId = billingAccount.provider_customer_id

      // Get active subscriptions from Stripe
      const stripeSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
        expand: ['data.default_payment_method'],
      })

      if (stripeSubscriptions.data.length > 0) {
        const sub = stripeSubscriptions.data[0]
        const paymentMethod = sub.default_payment_method as {
          card?: { brand: string; last4: string }
        } | null

        subscription = {
          id: sub.id,
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
          canceled_at: sub.canceled_at,
          plan: {
            id: sub.items.data[0]?.price.id,
            nickname: sub.items.data[0]?.price.nickname,
            amount: sub.items.data[0]?.price.unit_amount,
            currency: sub.items.data[0]?.price.currency,
            interval: sub.items.data[0]?.price.recurring?.interval,
            interval_count: sub.items.data[0]?.price.recurring?.interval_count,
            product: sub.items.data[0]?.price.product,
          },
          payment_method: paymentMethod?.card ? {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
          } : null,
        }
      }

      // Get recent invoices from Stripe
      const stripeInvoices = await stripe.invoices.list({
        customer: customerId,
        limit: 10,
      })

      invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount_due: inv.amount_due,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        period_start: inv.period_start || inv.created,
        period_end: inv.period_end || inv.created,
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
        invoice_pdf: inv.invoice_pdf ?? null,
      }))
    }

    return NextResponse.json({
      subscription,
      invoices,
      entitlements: entitlements || [],
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        type: tenant.type,
      } : null,
      membership: {
        role: membership.role,
      },
    })
  } catch (error) {
    console.error('[subscription/my API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}
