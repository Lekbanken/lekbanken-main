import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' }) : null

type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'canceled'

function toMajorUnits(amount?: number | null) {
  if (typeof amount !== 'number') return null
  return amount / 100
}

async function logEvent(event: Stripe.Event) {
  return supabaseAdmin
    .from('billing_events')
    .upsert(
      {
        event_key: event.id,
        event_type: event.type,
        status: 'received',
        source: 'stripe',
        payload: event as unknown as Json,
        subscription_id: null,
        invoice_id: null,
        payment_id: null,
      },
      { onConflict: 'event_key' }
    )
}

async function getLocalInvoiceByStripeId(stripeInvoiceId: string) {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('id, tenant_id, status, currency, amount_total')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle()

  if (error) {
    console.error('[stripe-webhook] invoice lookup error', error)
    return null
  }
  return data
}

async function markInvoiceStatus(invoiceId: string, status: InvoiceStatus, paidAt?: string | null) {
  const updates: Record<string, unknown> = { status }
  if (paidAt) updates.paid_at = paidAt
  const { error } = await supabaseAdmin.from('invoices').update(updates).eq('id', invoiceId)
  if (error) console.error('[stripe-webhook] failed to update invoice status', error)
}

async function upsertPaymentForInvoice(params: {
  invoiceId: string
  amount: number
  currency: string
  reference: string | null
  status: 'pending' | 'confirmed' | 'failed' | 'refunded'
  paidAt?: string | null
}) {
  const { invoiceId, amount, currency, reference, status, paidAt } = params
  const lookup = supabaseAdmin
    .from('payments')
    .select('id')
    .eq('invoice_id', invoiceId)
    .eq('provider', 'stripe')

  const { data: existing, error: fetchError } = reference
    ? await lookup.eq('transaction_reference', reference).maybeSingle()
    : await lookup.is('transaction_reference', null).maybeSingle()

  if (fetchError) {
    console.error('[stripe-webhook] payment lookup error', fetchError)
    return
  }

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from('payments')
      .update({ status, paid_at: paidAt ?? null })
      .eq('id', existing.id)
    if (error) console.error('[stripe-webhook] payment update error', error)
    return
  }

  const { error } = await supabaseAdmin.from('payments').insert({
    invoice_id: invoiceId,
    name: `Stripe payment ${reference ?? ''}`.trim(),
    amount,
    currency,
    status,
    provider: 'stripe',
    transaction_reference: reference,
    paid_at: paidAt ?? null,
  })
  if (error) console.error('[stripe-webhook] payment insert error', error)
}

export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    console.error('[stripe-webhook] Missing Stripe secrets')
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  const rawBody = await request.text()

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] Invalid signature', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Persist raw event for audit/debugging; mapping to local IDs can be added later
  const { error } = await logEvent(event)

  if (error) {
    console.error('[stripe-webhook] Failed to log event', error)
    return NextResponse.json({ error: 'Failed to persist event' }, { status: 500 })
  }

  // Handle selected Stripe events → local billing tables
  try {
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoiceObj = event.data.object as Stripe.Invoice
        const local = await getLocalInvoiceByStripeId(invoiceObj.id)
        if (local) {
          await markInvoiceStatus(local.id, 'paid', new Date().toISOString())
          const amountMajor = toMajorUnits(invoiceObj.amount_paid) ?? toMajorUnits(invoiceObj.amount_due) ?? local.amount_total
          await upsertPaymentForInvoice({
            invoiceId: local.id,
            amount: amountMajor ?? 0,
            currency: (invoiceObj.currency || local.currency || 'NOK').toUpperCase(),
            reference: (invoiceObj.payment_intent as string | null) ?? null,
            status: 'confirmed',
            paidAt: new Date().toISOString(),
          })
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoiceObj = event.data.object as Stripe.Invoice
        const local = await getLocalInvoiceByStripeId(invoiceObj.id)
        if (local) {
          await markInvoiceStatus(local.id, 'overdue')
          const amountMajor = toMajorUnits(invoiceObj.amount_due) ?? local.amount_total
          await upsertPaymentForInvoice({
            invoiceId: local.id,
            amount: amountMajor ?? 0,
            currency: (invoiceObj.currency || local.currency || 'NOK').toUpperCase(),
            reference: (invoiceObj.payment_intent as string | null) ?? null,
            status: 'failed',
          })
        }
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const reference = charge.payment_intent as string | null
        if (reference) {
          const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('id, invoice_id, currency')
            .eq('provider', 'stripe')
            .eq('transaction_reference', reference)
          if (payments && payments.length > 0) {
            for (const p of payments) {
              await upsertPaymentForInvoice({
                invoiceId: p.invoice_id,
                amount: toMajorUnits(charge.amount_refunded) ?? 0,
                currency: (charge.currency || p.currency || 'NOK').toUpperCase(),
                reference,
                status: 'refunded',
              })
              await markInvoiceStatus(p.invoice_id, 'canceled')
            }
          }
        }
        break
      }
      default:
        break
    }
  } catch (handlerErr) {
    console.error('[stripe-webhook] handler error', handlerErr)
  }

  return NextResponse.json({ received: true })
}
