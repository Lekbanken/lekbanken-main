import type Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'
import { stripe, stripeWebhookSecret } from '@/lib/stripe/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'canceled'

function slugifyTenant(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

async function provisionFromPurchaseIntent(params: {
  intentId: string
  stripeSession: Stripe.Checkout.Session
}) {
  const { intentId, stripeSession } = params

  const { data: intent, error: intentError } = await supabaseAdmin
    .from('purchase_intents')
    .select(
      'id,status,user_id,email,tenant_id,tenant_name,product_id,product_price_id,quantity_seats,stripe_checkout_session_id,stripe_customer_id,stripe_subscription_id'
    )
    .eq('id', intentId)
    .maybeSingle()

  if (intentError) {
    console.error('[stripe-webhook] purchase_intent lookup error', intentError)
    return
  }
  if (!intent) {
    console.warn('[stripe-webhook] purchase_intent not found', intentId)
    return
  }

  if (intent.status === 'provisioned' && intent.tenant_id) {
    return
  }

  const stripeCustomerId = typeof stripeSession.customer === 'string' ? stripeSession.customer : null
  const stripeSubscriptionId = typeof stripeSession.subscription === 'string' ? stripeSession.subscription : null
  const stripeCheckoutSessionId = stripeSession.id

  const nextPaidStatus =
    intent.status === 'draft' || intent.status === 'awaiting_payment' ? 'paid' : intent.status

  // Mark paid (best-effort) before provisioning
  const { error: paidUpdateError } = await supabaseAdmin
    .from('purchase_intents')
    .update({
      status: nextPaidStatus,
      stripe_customer_id: stripeCustomerId ?? intent.stripe_customer_id,
      stripe_subscription_id: stripeSubscriptionId ?? intent.stripe_subscription_id,
      stripe_checkout_session_id: stripeCheckoutSessionId ?? intent.stripe_checkout_session_id,
    })
    .eq('id', intent.id)

  if (paidUpdateError) {
    console.error('[stripe-webhook] purchase_intent paid update error', paidUpdateError)
  }

  if (!intent.user_id) {
    console.error('[stripe-webhook] purchase_intent missing user_id', intent.id)
    await supabaseAdmin.from('purchase_intents').update({ status: 'failed' }).eq('id', intent.id)
    return
  }
  if (!intent.product_id) {
    console.error('[stripe-webhook] purchase_intent missing product_id', intent.id)
    await supabaseAdmin.from('purchase_intents').update({ status: 'failed' }).eq('id', intent.id)
    return
  }

  let tenantId = intent.tenant_id

  if (!tenantId) {
    const tenantName = (intent.tenant_name || '').trim() || 'Organisation'
    const slug = slugifyTenant(tenantName) || null

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: tenantName,
        slug,
        type: 'organisation',
        status: 'active',
        created_by: intent.user_id,
        updated_by: intent.user_id,
        metadata: {
          purchase_intent_id: intent.id,
          stripe_checkout_session_id: stripeCheckoutSessionId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
        } as unknown as Json,
      })
      .select('id')
      .single()

    if (tenantError || !tenant) {
      console.error('[stripe-webhook] tenant create error', tenantError)
      await supabaseAdmin.from('purchase_intents').update({ status: 'failed' }).eq('id', intent.id)
      return
    }

    tenantId = tenant.id

    const { error: membershipError } = await supabaseAdmin
      .from('user_tenant_memberships')
      .insert({
        tenant_id: tenantId,
        user_id: intent.user_id,
        role: 'owner',
        is_primary: true,
        status: 'active',
      })

    if (membershipError && membershipError.code !== '23505') {
      console.error('[stripe-webhook] membership insert error', membershipError)
      // Non-fatal: entitlement gating may still work if membership exists via other path.
    }
  }

  // Ensure entitlement exists (idempotent-ish)
  const { data: existingEntitlement, error: entitlementLookupError } = await supabaseAdmin
    .from('tenant_product_entitlements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('product_id', intent.product_id)
    .eq('status', 'active')
    .maybeSingle()

  if (entitlementLookupError) {
    console.error('[stripe-webhook] entitlement lookup error', entitlementLookupError)
  }

  if (!existingEntitlement) {
    const source = stripeSubscriptionId ? 'stripe_subscription' : 'stripe_checkout'
    const { error: entitlementInsertError } = await supabaseAdmin
      .from('tenant_product_entitlements')
      .insert({
        tenant_id: tenantId,
        product_id: intent.product_id,
        status: 'active',
        source,
        quantity_seats: intent.quantity_seats ?? 1,
        created_by: intent.user_id,
        metadata: {
          purchase_intent_id: intent.id,
          stripe_checkout_session_id: stripeCheckoutSessionId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          product_price_id: intent.product_price_id,
        } as unknown as Json,
      })

    if (entitlementInsertError) {
      console.error('[stripe-webhook] entitlement insert error', entitlementInsertError)
      await supabaseAdmin.from('purchase_intents').update({ status: 'failed' }).eq('id', intent.id)
      return
    }
  }

  const { error: finalUpdateError } = await supabaseAdmin
    .from('purchase_intents')
    .update({
      status: 'provisioned',
      tenant_id: tenantId,
      stripe_customer_id: stripeCustomerId ?? intent.stripe_customer_id,
      stripe_subscription_id: stripeSubscriptionId ?? intent.stripe_subscription_id,
      stripe_checkout_session_id: stripeCheckoutSessionId ?? intent.stripe_checkout_session_id,
    })
    .eq('id', intent.id)

  if (finalUpdateError) {
    console.error('[stripe-webhook] purchase_intent final update error', finalUpdateError)
  }
}

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
  if (!stripe || !stripeWebhookSecret) {
    console.error('[stripe-webhook] Missing Stripe secrets')
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  const rawBody = await request.text()

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret)
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
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Only proceed once Stripe considers the session paid/complete.
        const paymentStatus = (session.payment_status || '').toLowerCase()
        const sessionStatus = (session.status || '').toLowerCase()
        const isConfirmed = paymentStatus === 'paid' || paymentStatus === 'no_payment_required' || sessionStatus === 'complete'

        if (!isConfirmed) {
          break
        }

        const metadataIntentId = session.metadata?.purchase_intent_id
        let intentId = metadataIntentId || null

        if (!intentId) {
          const { data: intent } = await supabaseAdmin
            .from('purchase_intents')
            .select('id')
            .eq('stripe_checkout_session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          intentId = intent?.id ?? null
        }

        if (intentId) {
          await provisionFromPurchaseIntent({ intentId, stripeSession: session })
        }

        break
      }

      // Subscription events
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const tenantId = subscription.metadata.tenant_id
        
        if (tenantId) {
          // Find existing subscription by stripe_subscription_id
          const { data: existing } = await supabaseAdmin
            .from('tenant_subscriptions')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .maybeSingle()

          const statusMap: Record<string, 'trial' | 'active' | 'canceled' | 'paused'> = {
            active: 'active',
            trialing: 'trial',
            canceled: 'canceled',
            past_due: 'paused',
            unpaid: 'paused',
            incomplete: 'paused',
            incomplete_expired: 'canceled',
            paused: 'paused',
          }

          const dbStatus = statusMap[subscription.status] || 'paused'

          if (existing) {
            // Update existing subscription
            await supabaseAdmin
              .from('tenant_subscriptions')
              .update({
                status: dbStatus,
                renewal_date: subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
                  : null,
                cancelled_at: subscription.canceled_at
                  ? new Date(subscription.canceled_at * 1000).toISOString()
                  : null,
              })
              .eq('id', existing.id)
          }
          // Note: If subscription doesn't exist, it was likely just created via API
          // and the database record was already inserted
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        const { data: existing } = await supabaseAdmin
          .from('tenant_subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        if (existing) {
          await supabaseAdmin
            .from('tenant_subscriptions')
            .update({
              status: 'canceled',
              cancelled_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
        }
        break
      }

      // Invoice events
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
