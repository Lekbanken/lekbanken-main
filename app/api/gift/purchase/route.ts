import { NextResponse } from 'next/server'
import { z } from 'zod'
import type Stripe from 'stripe'

import { stripe } from '@/lib/stripe/config'
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const purchaseGiftSchema = z.object({
  productPriceId: z.string().uuid(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().max(100).optional(),
  giftMessage: z.string().max(500).optional(),
})

function getOrigin(request: Request): string {
  try {
    return new URL(request.url).origin
  } catch {
    return 'http://localhost:3000'
  }
}

// Generate redemption code
interface GiftPurchaseRecord {
  id: string
}

// Generate gift code (server-side fallback if DB function unavailable)
function generateGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
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
      { error: 'Demo accounts cannot purchase gifts', code: 'DEMO_USER_BLOCKED' },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = purchaseGiftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { productPriceId, recipientEmail, recipientName, giftMessage } = parsed.data

  // Fetch price and product
  const { data: price, error: priceError } = await supabaseAdmin
    .from('product_prices')
    .select(`
      id,
      product_id,
      stripe_price_id,
      currency,
      amount,
      active,
      product:products(id, name, status)
    `)
    .eq('id', productPriceId)
    .maybeSingle()

  if (priceError) {
    console.error('[gift/purchase] price lookup error', priceError)
    return NextResponse.json({ error: 'Failed to load price' }, { status: 500 })
  }

  if (!price || !price.active || !price.product || price.product.status !== 'active') {
    return NextResponse.json({ error: 'Price is not available' }, { status: 400 })
  }

  if (!price.stripe_price_id) {
    return NextResponse.json({ error: 'Price not linked to Stripe' }, { status: 400 })
  }

  // Generate redemption code
  const redemptionCode = generateGiftCode()
  
  // Gift codes expire in 1 year
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  // Create gift purchase record (using 'as never' since types not yet generated)
  const { data, error: giftError } = await supabaseAdmin
    .from('gift_purchases' as never)
    .insert({
      purchaser_user_id: user.id,
      purchaser_email: user.email ?? '',
      product_id: price.product_id,
      product_price_id: price.id,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      gift_message: giftMessage,
      redemption_code: redemptionCode,
      redemption_code_expires_at: expiresAt.toISOString(),
      status: 'pending',
      amount: price.amount,
      currency: price.currency,
    } as never)
    .select('id' as never)
    .single()

  const gift = data as GiftPurchaseRecord | null

  if (giftError || !gift) {
    console.error('[gift/purchase] gift insert error', giftError)
    return NextResponse.json({ error: 'Failed to create gift' }, { status: 500 })
  }

  // Create Stripe checkout session for the gift
  const origin = getOrigin(request)
  const successUrl = `${origin}/gift/success?gift_id=${gift.id}&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${origin}/gift/purchase?canceled=1`

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment', // Gifts are always one-time payments
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price: price.stripe_price_id,
          quantity: 1,
        },
      ],
      metadata: {
        type: 'gift_purchase',
        gift_purchase_id: gift.id,
        user_id: user.id,
        redemption_code: redemptionCode,
      },
    })
  } catch (err) {
    console.error('[gift/purchase] stripe session error', err)
    await supabaseAdmin.from('gift_purchases' as never).update({ status: 'canceled' } as never).eq('id' as never, gift.id as never)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }

  // Update gift with session ID
  await supabaseAdmin
    .from('gift_purchases' as never)
    .update({ stripe_payment_intent_id: session.id } as never)
    .eq('id' as never, gift.id as never)

  return NextResponse.json({
    gift_id: gift.id,
    checkout_url: session.url,
    redemption_code: redemptionCode,
  })
}

// GET: List user's purchased gifts
export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: gifts, error } = await supabaseAdmin
    .from('gift_purchases' as never)
    .select(`
      *,
      product:products(id, name)
    ` as never)
    .eq('purchaser_user_id' as never, user.id as never)
    .order('created_at' as never, { ascending: false } as never)

  if (error) {
    console.error('[gift/purchase] list error', error)
    return NextResponse.json({ error: 'Failed to list gifts' }, { status: 500 })
  }

  return NextResponse.json({ gifts: gifts || [] })
}
