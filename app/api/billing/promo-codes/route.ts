import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe/config'
import { apiHandler } from '@/lib/api/route-handler'

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
export const GET = apiHandler({
  auth: 'system_admin',
  handler: async () => {
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
  },
})

/**
 * POST /api/billing/promo-codes
 * 
 * Create a new promotion code in Stripe.
 */
export const POST = apiHandler({
  auth: 'system_admin',
  input: createPromoSchema,
  handler: async ({ auth, body }) => {
    const { code, percentOff, amountOff, currency, maxRedemptions, expiresAt, firstTimeTransaction, minimumAmount, appliesTo } = body

    if (!percentOff && !amountOff) {
      return NextResponse.json({ error: 'Either percentOff or amountOff is required' }, { status: 400 })
    }

    // First create a coupon
    const couponData: Record<string, unknown> = {
      duration: 'once',
    }

    if (percentOff) {
      couponData.percent_off = percentOff
    } else if (amountOff) {
      couponData.amount_off = Math.round(amountOff * 100)
      couponData.currency = (currency ?? 'sek').toLowerCase()
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
        created_by: auth!.user!.id,
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
      promoData.restrictions!.minimum_amount_currency = (currency ?? 'sek').toLowerCase()
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
  },
})

/**
 * DELETE /api/billing/promo-codes?id=xxx
 * 
 * Deactivate a promotion code in Stripe.
 */
export const DELETE = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    const { searchParams } = new URL(req.url)
    const promoCodeId = searchParams.get('id')

    if (!promoCodeId) {
      return NextResponse.json({ error: 'Missing promo code ID' }, { status: 400 })
    }

    // Deactivate the promo code
    await stripe.promotionCodes.update(promoCodeId, {
      active: false,
    })

    return NextResponse.json({ success: true })
  },
})
