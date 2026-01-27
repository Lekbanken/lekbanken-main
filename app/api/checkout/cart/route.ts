import { NextResponse } from 'next/server'
import { z } from 'zod'
import type Stripe from 'stripe'

import { stripe } from '@/lib/stripe/config'
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const cartItemSchema = z.object({
  productPriceId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
})

const cartCheckoutSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  tenantId: z.string().uuid().optional(),
  tenantName: z.string().min(2).max(120).optional(),
  kind: z.enum(['organisation_subscription', 'user_subscription']).default('organisation_subscription'),
})

function getOrigin(request: Request): string {
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

  // Block demo users
  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('is_demo_user, is_ephemeral')
    .eq('id', user.id)
    .single()

  if (userProfile?.is_demo_user || userProfile?.is_ephemeral) {
    return NextResponse.json(
      {
        error: 'Demo accounts cannot make purchases',
        code: 'DEMO_USER_BLOCKED',
        action: 'convert_account',
      },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = cartCheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { items, tenantId, kind } = parsed.data
  const tenantName = parsed.data.tenantName?.trim() || ''

  // Validate tenant name for new org purchases
  if (kind === 'organisation_subscription' && !tenantId && !tenantName) {
    return NextResponse.json(
      { error: 'Organization name is required for new organizations' },
      { status: 400 }
    )
  }

  // Ownership check for existing tenant
  if (tenantId && kind === 'organisation_subscription') {
    const { data: membership } = await supabaseAdmin
      .from('user_tenant_memberships')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        {
          error: 'Only organization owners and admins can make purchases',
          code: 'INSUFFICIENT_ROLE',
        },
        { status: 403 }
      )
    }
  }

  // Fetch all prices with their products
  const priceIds = items.map((i) => i.productPriceId)
  const { data: prices, error: pricesError } = await supabaseAdmin
    .from('product_prices')
    .select(`
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
    `)
    .in('id', priceIds)

  if (pricesError) {
    console.error('[checkout/cart] prices lookup error', pricesError)
    return NextResponse.json({ error: 'Failed to load prices' }, { status: 500 })
  }

  // Validate all prices exist and are active
  const priceMap = new Map(prices?.map((p) => [p.id, p]) || [])
  const invalidPrices: string[] = []
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
  const productIds: string[] = []
  const currencies = new Set<string>()
  const intervals = new Set<string>()

  for (const item of items) {
    const price = priceMap.get(item.productPriceId)
    if (!price || !price.active || !price.product || price.product.status !== 'active') {
      invalidPrices.push(item.productPriceId)
      continue
    }

    if (!price.stripe_price_id) {
      invalidPrices.push(item.productPriceId)
      continue
    }

    lineItems.push({
      price: price.stripe_price_id,
      quantity: kind === 'user_subscription' ? 1 : item.quantity,
    })
    productIds.push(price.product_id)
    currencies.add(price.currency)
    intervals.add(price.interval || 'one_time')
  }

  if (invalidPrices.length > 0) {
    return NextResponse.json(
      { error: 'Some prices are not available', invalid_prices: invalidPrices },
      { status: 400 }
    )
  }

  // Stripe doesn't allow mixing currencies
  if (currencies.size > 1) {
    return NextResponse.json(
      { error: 'All items must use the same currency' },
      { status: 400 }
    )
  }

  // Stripe doesn't allow mixing subscriptions with one-time payments in same session
  const hasSubscription = intervals.has('month') || intervals.has('year')
  const hasOneTime = intervals.has('one_time')
  if (hasSubscription && hasOneTime) {
    return NextResponse.json(
      { error: 'Cannot mix subscriptions and one-time purchases. Please checkout separately.' },
      { status: 400 }
    )
  }

  // Check existing entitlements
  if (tenantId) {
    const { data: existingEntitlements } = await supabaseAdmin
      .from('tenant_product_entitlements')
      .select('product_id')
      .eq('tenant_id', tenantId)
      .in('product_id', productIds)
      .eq('status', 'active')

    if (existingEntitlements && existingEntitlements.length > 0) {
      const ownedIds = existingEntitlements.map((e) => e.product_id)
      return NextResponse.json(
        {
          error: 'Some products are already owned',
          code: 'ALREADY_OWNED',
          owned_product_ids: ownedIds,
        },
        { status: 409 }
      )
    }
  }

  // Create a single purchase intent for the cart
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)
  const firstPrice = prices?.[0]

  const { data: intent, error: intentError } = await supabaseAdmin
    .from('purchase_intents')
    .insert({
      kind,
      status: 'awaiting_payment',
      email: user.email ?? null,
      user_id: user.id,
      tenant_id: tenantId || null,
      tenant_name: tenantName || null,
      product_id: productIds[0], // Primary product
      product_price_id: priceIds[0], // Primary price
      quantity_seats: totalQuantity,
      metadata: {
        cart_items: items,
        product_ids: productIds,
        price_ids: priceIds,
        currency: firstPrice?.currency,
        created_via: 'api/checkout/cart',
      },
    })
    .select('id')
    .single()

  if (intentError) {
    console.error('[checkout/cart] intent insert error', intentError)
    return NextResponse.json({ error: 'Failed to create purchase intent' }, { status: 500 })
  }

  if (!intent) {
    return NextResponse.json({ error: 'Failed to create purchase intent' }, { status: 500 })
  }

  const origin = getOrigin(request)
  const successUrl = `${origin}/checkout/return?purchase_intent_id=${intent.id}&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${origin}/checkout/start?canceled=1`

  const mode: Stripe.Checkout.SessionCreateParams.Mode = hasSubscription ? 'subscription' : 'payment'

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create({
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? undefined,
      allow_promotion_codes: true,
      line_items: lineItems,
      metadata: {
        purchase_intent_id: intent.id,
        user_id: user.id,
        product_ids: productIds.join(','),
        price_ids: priceIds.join(','),
        tenant_name: tenantName || '',
        tenant_id: tenantId || '',
        kind,
        is_cart: 'true',
      },
    })
  } catch (err) {
    console.error('[checkout/cart] stripe session create error', err)
    await supabaseAdmin.from('purchase_intents').update({ status: 'failed' }).eq('id', intent.id)
    return NextResponse.json({ error: 'Failed to create Stripe checkout session' }, { status: 500 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('purchase_intents')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', intent.id)

  if (updateError) {
    console.error('[checkout/cart] intent update error', updateError)
  }

  return NextResponse.json({
    purchase_intent_id: intent.id,
    checkout_url: session.url,
    items_count: lineItems.length,
  })
}
