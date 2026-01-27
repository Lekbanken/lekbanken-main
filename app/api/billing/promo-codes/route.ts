import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe/config'
import { createServerRlsClient } from '@/lib/supabase/server'

const createPromoSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric with dashes/underscores'),
  percentOff: z.number().min(1).max(100).optional(),
  amountOff: z.number().min(1).optional(),
  currency: z.string().length(3).default('sek'),
  maxRedemptions: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  firstTimeTransaction: z.boolean().default(true),
  minimumAmount: z.number().int().optional(),
  appliesTo: z.object({
    products: z.array(z.string()).optional(),
  }).optional(),
})

/**
 * GET /api/billing/promo-codes
 * 
 * List all promotion codes from Stripe.
 */
export async function GET(_request: NextRequest) {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is system admin using RPC
  const { data: isAdmin } = await supabase.rpc('is_system_admin')
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    // Fetch promo codes from Stripe
    const promoCodes = await stripe.promotionCodes.list({
      limit: 100,
      expand: ['data.coupon'],
    })

    const formattedCodes = promoCodes.data.map((promo) => ({
      id: promo.id,
      code: promo.code,
      active: promo.active,
      couponId: promo.coupon.id,
      percentOff: promo.coupon.percent_off,
      amountOff: promo.coupon.amount_off ? promo.coupon.amount_off / 100 : null,
      currency: promo.coupon.currency,
      maxRedemptions: promo.max_redemptions,
      timesRedeemed: promo.times_redeemed,
      expiresAt: promo.expires_at ? new Date(promo.expires_at * 1000).toISOString() : null,
      createdAt: new Date(promo.created * 1000).toISOString(),
      firstTimeTransaction: promo.restrictions?.first_time_transaction ?? false,
      minimumAmount: promo.restrictions?.minimum_amount ? promo.restrictions.minimum_amount / 100 : null,
      metadata: promo.metadata,
    }))

    return NextResponse.json({ promoCodes: formattedCodes })
  } catch (error) {
    console.error('[promo-codes] Stripe error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch promo codes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/billing/promo-codes
 * 
 * Create a new promotion code in Stripe.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is system admin using RPC
  const { data: isAdminPost } = await supabase.rpc('is_system_admin')
  if (!isAdminPost) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createPromoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { code, percentOff, amountOff, currency, maxRedemptions, expiresAt, firstTimeTransaction, minimumAmount, appliesTo } = parsed.data

  if (!percentOff && !amountOff) {
    return NextResponse.json({ error: 'Either percentOff or amountOff is required' }, { status: 400 })
  }

  try {
    // First create a coupon
    const couponData: Record<string, unknown> = {
      duration: 'once',
    }

    if (percentOff) {
      couponData.percent_off = percentOff
    } else if (amountOff) {
      couponData.amount_off = Math.round(amountOff * 100)
      couponData.currency = currency.toLowerCase()
    }

    if (appliesTo?.products && appliesTo.products.length > 0) {
      couponData.applies_to = { products: appliesTo.products }
    }

    const coupon = await stripe.coupons.create(couponData as Parameters<typeof stripe.coupons.create>[0])

    // Then create the promo code
    const promoData: Parameters<typeof stripe.promotionCodes.create>[0] = {
      coupon: coupon.id,
      code: code.toUpperCase(),
      restrictions: {
        first_time_transaction: firstTimeTransaction,
      },
      metadata: {
        created_by: user.id,
        created_at: new Date().toISOString(),
      },
    }

    if (maxRedemptions) {
      promoData.max_redemptions = maxRedemptions
    }

    if (expiresAt) {
      promoData.expires_at = Math.floor(new Date(expiresAt).getTime() / 1000)
    }

    if (minimumAmount) {
      promoData.restrictions!.minimum_amount = Math.round(minimumAmount * 100)
      promoData.restrictions!.minimum_amount_currency = currency.toLowerCase()
    }

    const promoCode = await stripe.promotionCodes.create(promoData)

    return NextResponse.json({
      success: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        couponId: coupon.id,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
        currency: coupon.currency,
      },
    })
  } catch (error) {
    console.error('[promo-codes] Stripe error:', error)
    
    if (error instanceof Error && 'type' in error) {
      const stripeError = error as { type: string; message: string }
      return NextResponse.json(
        { error: stripeError.message, code: 'STRIPE_ERROR' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create promo code' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/billing/promo-codes?id=xxx
 * 
 * Deactivate a promotion code in Stripe.
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is system admin using RPC
  const { data: isAdminDelete } = await supabase.rpc('is_system_admin')
  if (!isAdminDelete) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const promoCodeId = searchParams.get('id')

  if (!promoCodeId) {
    return NextResponse.json({ error: 'Missing promo code ID' }, { status: 400 })
  }

  try {
    // Deactivate the promo code
    await stripe.promotionCodes.update(promoCodeId, {
      active: false,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[promo-codes] Stripe error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate promo code' },
      { status: 500 }
    )
  }
}
