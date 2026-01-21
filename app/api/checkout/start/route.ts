import { NextResponse } from 'next/server'
import { z } from 'zod'
import type Stripe from 'stripe'

import { stripe } from '@/lib/stripe/config'
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const startCheckoutSchema = z.object({
  productPriceId: z.string().uuid(),
  tenantName: z.string().min(2).max(120),
  quantitySeats: z.number().int().min(1).max(100000).optional(),
})

function getOrigin(request: Request): string {
  // Prefer request.url origin; Next will include full URL.
  try {
    return new URL(request.url).origin
  } catch {
    return 'http://localhost:3000'
  }
}

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

  const parsed = startCheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { productPriceId, tenantName } = parsed.data
  const quantitySeats = parsed.data.quantitySeats ?? 1

  const { data: price, error: priceError } = await supabaseAdmin
    .from('product_prices')
    .select(
      `
      id,
      product_id,
      stripe_price_id,
      currency,
      interval,
      amount,
      active,
      product:products(
        id,
        name,
        status
      )
    `
    )
    .eq('id', productPriceId)
    .maybeSingle()

  if (priceError) {
    console.error('[checkout/start] price lookup error', priceError)
    return NextResponse.json({ error: 'Failed to load price' }, { status: 500 })
  }

  if (!price || !price.active || !price.product || price.product.status !== 'active') {
    return NextResponse.json({ error: 'Price is not available' }, { status: 400 })
  }

  if (!price.stripe_price_id) {
    return NextResponse.json({ error: 'Price not linked to Stripe' }, { status: 400 })
  }

  const { data: intent, error: intentError } = await supabaseAdmin
    .from('purchase_intents')
    .insert({
      kind: 'organisation_subscription',
      status: 'awaiting_payment',
      email: user.email ?? null,
      user_id: user.id,
      tenant_name: tenantName,
      product_id: price.product_id,
      product_price_id: price.id,
      quantity_seats: quantitySeats,
      metadata: {
        currency: price.currency,
        price_amount: price.amount,
        created_via: 'api/checkout/start',
      },
    })
    .select('id')
    .single()

  if (intentError || !intent) {
    console.error('[checkout/start] intent insert error', intentError)
    return NextResponse.json({ error: 'Failed to create purchase intent' }, { status: 500 })
  }

  const origin = getOrigin(request)
  const successUrl = `${origin}/checkout/return?purchase_intent_id=${intent.id}&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${origin}/checkout/start?canceled=1`

  const isOneTime = (price.interval || '').toLowerCase() === 'one_time'
  const mode: Stripe.Checkout.SessionCreateParams.Mode = isOneTime ? 'payment' : 'subscription'

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create({
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? undefined,
      allow_promotion_codes: true,
      line_items: [
        {
          price: price.stripe_price_id,
          quantity: quantitySeats,
        },
      ],
      metadata: {
        purchase_intent_id: intent.id,
        user_id: user.id,
        product_price_id: price.id,
        product_id: price.product_id,
        quantity_seats: String(quantitySeats),
        tenant_name: tenantName,
      },
    })
  } catch (err) {
    console.error('[checkout/start] stripe session create error', err)
    await supabaseAdmin.from('purchase_intents').update({ status: 'failed' }).eq('id', intent.id)
    return NextResponse.json({ error: 'Failed to create Stripe checkout session' }, { status: 500 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('purchase_intents')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', intent.id)

  if (updateError) {
    console.error('[checkout/start] intent update error', updateError)
  }

  return NextResponse.json({
    purchase_intent_id: intent.id,
    checkout_url: session.url,
  })
}
