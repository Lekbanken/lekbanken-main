/**
 * Product Prices API
 * 
 * GET    /api/admin/products/[productId]/prices - List prices for product
 * POST   /api/admin/products/[productId]/prices - Create new price
 * 
 * Prices are synced to Stripe automatically when created.
 */

import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'
import { logPriceEvent } from '@/lib/services/productAudit.server'

// =============================================================================
// GET - List prices for product
// =============================================================================

export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ params }) => {
    const productId = params.productId
    // Use service role client for admin operations (bypasses RLS)
    const supabase = createServiceRoleClient()
    
    const { data: prices, error } = await supabase
      .from('product_prices')
      .select('*')
      .eq('product_id', productId)
      .order('currency', { ascending: true })
      .order('interval', { ascending: true })
    
    if (error) {
      console.error('Failed to fetch prices:', error)
      return NextResponse.json(
        { error: 'Failed to fetch prices' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: prices,
    })
  },
})

// =============================================================================
// POST - Create new price
// =============================================================================

interface CreatePriceBody {
  amount: number           // In smallest currency unit (øre/cent)
  currency: 'NOK' | 'SEK' | 'EUR'
  interval: 'month' | 'year' | 'one_time'
  interval_count?: number
  nickname?: string
  tax_behavior?: 'inclusive' | 'exclusive' | 'unspecified'
  billing_model?: 'per_seat' | 'per_tenant' | 'per_user' | 'flat'
  is_default?: boolean
  trial_period_days?: number  // Step 3: Trial period
  syncToStripe?: boolean   // Default true
}

export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ auth, params, req }) => {
    const productId = params.productId
    const body: CreatePriceBody = await req.json()
    
    // Validate required fields
    if (!body.amount || !body.currency || !body.interval) {
      return NextResponse.json(
        { error: 'amount, currency, and interval are required' },
        { status: 400 }
      )
    }
    
    // Use service role client for admin operations (bypasses RLS)
    const supabase = createServiceRoleClient()
    
    // Fetch product to get stripe_product_id
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, stripe_product_id, name')
      .eq('id', productId)
      .single()
    
    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // If this is set as default, unset other defaults for same product+currency+interval
    if (body.is_default) {
      await supabase
        .from('product_prices')
        .update({ is_default: false })
        .eq('product_id', productId)
        .eq('currency', body.currency)
        .eq('interval', body.interval)
    }
    
    // Create price in database
    const { data: newPrice, error: insertError } = await supabase
      .from('product_prices')
      .insert({
        product_id: productId,
        amount: body.amount,
        currency: body.currency,
        interval: body.interval,
        interval_count: body.interval_count ?? 1,
        nickname: body.nickname,
        tax_behavior: body.tax_behavior ?? 'exclusive',
        billing_model: body.billing_model ?? 'per_seat',
        is_default: body.is_default ?? false,
        trial_period_days: body.trial_period_days ?? 0,
        active: true,
      })
      .select()
      .single()
    
    if (insertError || !newPrice) {
      console.error('Failed to create price:', insertError)
      return NextResponse.json(
        { error: 'Failed to create price', details: insertError?.message },
        { status: 500 }
      )
    }
    
    // Sync to Stripe if product is already synced
    const shouldSync = body.syncToStripe !== false
    let stripePriceId: string | null = null
    
    if (shouldSync && product.stripe_product_id) {
      try {
        // Generate deterministic lookup_key: product_key:currency:interval:interval_count
        // We need to fetch the product_key for this
        const { data: productFull } = await supabase
          .from('products')
          .select('product_key')
          .eq('id', productId)
          .single()
        
        const productKey = productFull?.product_key || productId.replace(/-/g, '')
        const lookupKey = `${productKey}:${body.currency.toLowerCase()}:${body.interval}:${body.interval_count ?? 1}`
        
        const priceData: Parameters<typeof stripe.prices.create>[0] = {
          product: product.stripe_product_id,
          unit_amount: body.amount,
          currency: body.currency.toLowerCase(),
          nickname: body.nickname || `${product.name} - ${body.interval === 'one_time' ? 'Engångsköp' : body.interval === 'month' ? 'Månadsvis' : 'Årsvis'}`,
          tax_behavior: (body.tax_behavior ?? 'exclusive') as 'inclusive' | 'exclusive' | 'unspecified',
          lookup_key: lookupKey,
          metadata: {
            lekbanken_price_id: newPrice.id,
            lekbanken_product_id: productId,
            billing_model: body.billing_model ?? 'per_seat',
            trial_period_days: String(body.trial_period_days ?? 0),
            source: 'lekbanken',
          },
        }
        
        // Add recurring info if not one-time
        if (body.interval !== 'one_time') {
          priceData.recurring = {
            interval: body.interval as 'month' | 'year',
            interval_count: body.interval_count ?? 1,
          }
        }
        
        const stripePrice = await stripe.prices.create(priceData, {
          idempotencyKey: `create_price_${newPrice.id}`,
        })
        
        stripePriceId = stripePrice.id
        
        // Update local price with Stripe ID and lookup_key
        await supabase
          .from('product_prices')
          .update({ 
            stripe_price_id: stripePrice.id,
            lookup_key: lookupKey,
          })
          .eq('id', newPrice.id)
        
        // If this is default, update product's default price
        if (body.is_default) {
          await stripe.products.update(product.stripe_product_id, {
            default_price: stripePrice.id,
          })
          
          await supabase
            .from('products')
            .update({ stripe_default_price_id: stripePrice.id })
            .eq('id', productId)
        }
        
        console.log('Price synced to Stripe:', stripePrice.id)
        
      } catch (stripeError) {
        console.error('Failed to sync price to Stripe:', stripeError)
        // Don't fail the request - price is created locally
      }
    }
    
    // Log audit event for price creation
    await logPriceEvent(productId, 'price_created', {
      priceId: newPrice.id,
      amount: body.amount,
      currency: body.currency,
      interval: body.interval,
      stripePriceId: stripePriceId,
    }, auth!.user!.id)
    
    return NextResponse.json({
      success: true,
      data: {
        ...newPrice,
        stripe_price_id: stripePriceId,
      },
      synced: !!stripePriceId,
    })
  },
})
