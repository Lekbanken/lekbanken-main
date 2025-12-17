import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'

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
    .from('user_tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
    .maybeSingle()
  if (error) {
    console.warn('[billing/stripe-invoice] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params

  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await userTenantRole(supabase, tenantId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    amount?: number
    currency?: string
    due_date?: string | null
    description?: string | null
  }

  if (!body.name || typeof body.amount !== 'number' || body.amount <= 0) {
    return NextResponse.json({ error: 'name and positive amount are required' }, { status: 400 })
  }

  const currency = (body.currency || 'NOK').toUpperCase()
  const amountCents = Math.round(body.amount * 100)
  const dueDate = body.due_date ? new Date(body.due_date) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: 'Invalid due_date' }, { status: 400 })
  }
  const dueDateUnix = Math.floor(dueDate.getTime() / 1000)

  // Look up Stripe customer for tenant
  const { data: billingAccount, error: acctError } = await supabase
    .from('billing_accounts')
    .select('provider_customer_id')
    .eq('tenant_id', tenantId)
    .eq('provider', 'stripe')
    .maybeSingle()

  if (acctError || !billingAccount?.provider_customer_id) {
    console.error('[billing/stripe-invoice] missing stripe customer', acctError)
    return NextResponse.json({ error: 'Stripe customer not found for tenant' }, { status: 400 })
  }

  const customerId = billingAccount.provider_customer_id

  try {
    // Create invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      currency,
      amount: amountCents,
      description: body.description || body.name,
    })

    // Create invoice set to send
    const stripeInvoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      due_date: dueDateUnix,
      metadata: {
        tenant_id: tenantId,
        name: body.name,
      },
    })

    // Finalize and send the invoice
    const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id)
    await stripe.invoices.sendInvoice(finalized.id)

    // Insert local invoice record (manual fallback stays as existing endpoint)
    const { data: localInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        amount: body.amount,
        amount_subtotal: body.amount,
        amount_tax: 0,
        amount_total: body.amount,
        currency,
        due_date: dueDate.toISOString().slice(0, 10),
        status: 'sent',
        stripe_invoice_id: finalized.id,
        notes: body.description || null,
      })
      .select('*')
      .maybeSingle()

    if (insertError) {
      console.error('[billing/stripe-invoice] local insert error', insertError)
      return NextResponse.json({ error: 'Stripe invoice created, but local insert failed' }, { status: 500 })
    }

    return NextResponse.json({ invoice: localInvoice, stripe_invoice: finalized })
  } catch (err) {
    console.error('[billing/stripe-invoice] Stripe error', err)
    return NextResponse.json({ error: 'Failed to create Stripe invoice' }, { status: 500 })
  }
}
