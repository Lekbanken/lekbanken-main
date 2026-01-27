import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { supabaseAdmin, createServerRlsClient } from '@/lib/supabase/server'

/**
 * GET /api/billing/invoices/my
 * 
 * Get invoices for the current user's tenant(s).
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)

  // Get user's tenant memberships
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('user_tenant_memberships')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (membershipError) {
    console.error('[invoices-my] membership error:', membershipError)
    return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 })
  }

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ invoices: [] })
  }

  // If tenantId specified, verify access
  const tenantIds = tenantId 
    ? memberships.some(m => m.tenant_id === tenantId) 
      ? [tenantId]
      : []
    : memberships.map(m => m.tenant_id)

  if (tenantIds.length === 0) {
    return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 })
  }

  // Get Stripe customer IDs for these tenants
  const { data: tenants, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name, metadata')
    .in('id', tenantIds)

  if (tenantError) {
    console.error('[invoices-my] tenant error:', tenantError)
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
  }

  // Collect Stripe customer IDs
  const customerIds: { customerId: string; tenantId: string; tenantName: string }[] = []
  for (const tenant of tenants || []) {
    const stripeCustomerId = (tenant.metadata as Record<string, unknown>)?.stripe_customer_id as string | undefined
    if (stripeCustomerId) {
      customerIds.push({
        customerId: stripeCustomerId,
        tenantId: tenant.id,
        tenantName: tenant.name,
      })
    }
  }

  if (customerIds.length === 0) {
    return NextResponse.json({ invoices: [] })
  }

  try {
    // Fetch invoices from Stripe for each customer
    const allInvoices: Array<{
      id: string
      number: string | null
      status: string | null
      amountDue: number
      amountPaid: number
      currency: string
      createdAt: string
      dueDate: string | null
      paidAt: string | null
      invoicePdfUrl: string | null
      hostedInvoiceUrl: string | null
      tenantId: string
      tenantName: string
    }> = []

    for (const { customerId, tenantId, tenantName } of customerIds) {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
      })

      for (const invoice of invoices.data) {
        allInvoices.push({
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          amountDue: invoice.amount_due / 100,
          amountPaid: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          createdAt: new Date(invoice.created * 1000).toISOString(),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
          paidAt: invoice.status_transitions?.paid_at 
            ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
            : null,
          invoicePdfUrl: invoice.invoice_pdf ?? null,
          hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
          tenantId,
          tenantName,
        })
      }
    }

    // Sort by creation date, newest first
    allInvoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ invoices: allInvoices })
  } catch (error) {
    console.error('[invoices-my] Stripe error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices from Stripe' },
      { status: 500 }
    )
  }
}
