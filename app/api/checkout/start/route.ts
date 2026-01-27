import { NextResponse } from 'next/server'
import { z } from 'zod'
import type Stripe from 'stripe'

import { stripe } from '@/lib/stripe/config'
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const startCheckoutSchema = z.object({
  productPriceId: z.string().uuid(),
  tenantId: z.string().uuid().optional(), // For existing org purchases
  tenantName: z.string().min(2).max(120).optional(), // Required for new orgs, optional for private
  quantitySeats: z.number().int().min(1).max(100000).optional(),
  kind: z.enum(['organisation_subscription', 'user_subscription']).default('organisation_subscription'),
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

  // Task 1.1: Block demo users from checkout
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

  const parsed = startCheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { productPriceId, tenantId, kind } = parsed.data
  const tenantName = parsed.data.tenantName?.trim() || ''
  // Private purchases always have 1 seat
  const quantitySeats = kind === 'user_subscription' ? 1 : (parsed.data.quantitySeats ?? 1)

  // Task 1.3: Validate tenantName for new org purchases
  if (kind === 'organisation_subscription' && !tenantId && !tenantName) {
    return NextResponse.json(
      { error: 'Organization name is required for new organizations' },
      { status: 400 }
    )
  }

  // Task 1.2: Ownership check for existing tenant purchases
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

  // Task 1.5: Check existing entitlements before allowing purchase
  if (tenantId) {
    // Check if this tenant already owns the product
    const { data: existingEntitlement } = await supabaseAdmin
      .from('tenant_product_entitlements')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('product_id', price.product_id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingEntitlement) {
      return NextResponse.json(
        {
          error: 'Your organization already owns this product',
          code: 'ALREADY_OWNED',
          entitlement_id: existingEntitlement.id,
        },
        { status: 409 }
      )
    }
  }

  // For personal purchases, check all user's tenants for existing entitlement
  if (kind === 'user_subscription') {
    const { data: userTenants } = await supabaseAdmin
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (userTenants?.length) {
      const tenantIds = userTenants.map((t) => t.tenant_id)
      const { data: existingEntitlement } = await supabaseAdmin
        .from('tenant_product_entitlements')
        .select('id, tenant_id')
        .in('tenant_id', tenantIds)
        .eq('product_id', price.product_id)
        .eq('status', 'active')
        .maybeSingle()

      if (existingEntitlement) {
        return NextResponse.json(
          {
            error: 'You already own this product',
            code: 'ALREADY_OWNED',
            tenant_id: existingEntitlement.tenant_id,
          },
          { status: 409 }
        )
      }
    }
  }

  const { data: intent, error: intentError } = await supabaseAdmin
    .from('purchase_intents')
    .insert({
      kind, // Task 1.3: Use dynamic kind instead of hardcoded
      status: 'awaiting_payment',
      email: user.email ?? null,
      user_id: user.id,
      tenant_id: tenantId || null, // Store existing tenant if provided
      tenant_name: tenantName || null,
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

  // Task 1.4: Handle duplicate pending purchase intent gracefully
  if (intentError) {
    // Check for unique constraint violation (code 23505)
    if (intentError.code === '23505' && intentError.message?.includes('purchase_intents_pending_unique')) {
      // Find existing pending intent and return its checkout session
      const { data: existingIntent } = await supabaseAdmin
        .from('purchase_intents')
        .select('id, stripe_checkout_session_id')
        .eq('user_id', user.id)
        .eq('product_id', price.product_id)
        .in('status', ['draft', 'awaiting_payment'])
        .single()

      if (existingIntent?.stripe_checkout_session_id) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(existingIntent.stripe_checkout_session_id)
          if (existingSession.url && existingSession.status === 'open') {
            return NextResponse.json({
              purchase_intent_id: existingIntent.id,
              checkout_url: existingSession.url,
              reused_session: true,
            })
          }
        } catch {
          // Session expired or invalid, continue to create new one
        }
      }
    }
    console.error('[checkout/start] intent insert error', intentError)
    return NextResponse.json({ error: 'Failed to create purchase intent' }, { status: 500 })
  }

  if (!intent) {
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
        tenant_name: tenantName || '',
        tenant_id: tenantId || '', // Existing tenant for B2B
        kind, // Task 1.3: Include kind for webhook processing
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
