/**
 * Single Price API
 * 
 * PATCH  /api/admin/products/[productId]/prices/[priceId] - Update price (creates new in Stripe)
 * DELETE /api/admin/products/[productId]/prices/[priceId] - Archive price
 * 
 * Note: Stripe prices are immutable. Changes create new prices and archive old ones.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'
import { logPriceEvent } from '@/lib/services/productAudit.server'

// =============================================================================
// AUTH HELPER
// =============================================================================

async function isSystemAdmin(): Promise<boolean> {
  const supabase = await createServerRlsClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  const appMetadataRole = user.app_metadata?.role as string | undefined
  const appMetadataGlobalRole = user.app_metadata?.global_role as string | undefined
  const userMetadataGlobalRole = user.user_metadata?.global_role as string | undefined
  
  const effectiveRole = appMetadataRole || appMetadataGlobalRole || userMetadataGlobalRole
  
  return effectiveRole === 'system_admin' || 
         effectiveRole === 'superadmin' || 
         effectiveRole === 'admin'
}

// =============================================================================
// PATCH - Update price (creates new Stripe price if amount changed)
// =============================================================================

interface UpdatePriceBody {
  amount?: number
  nickname?: string
  is_default?: boolean
  active?: boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; priceId: string }> }
) {
  try {
    const rlsClient = await createServerRlsClient()
    const { data: { user } } = await rlsClient.auth.getUser()
    
    if (!await isSystemAdmin()) {
      return NextResponse.json(
        { error: 'Forbidden - system_admin required' },
        { status: 403 }
      )
    }
    
    const { productId, priceId } = await params
    const body: UpdatePriceBody = await request.json()
    // Use service role client for admin operations (bypasses RLS)
    const supabase = createServiceRoleClient()
    
    // Fetch current price
    const { data: currentPrice, error: fetchError } = await supabase
      .from('product_prices')
      .select('*, products(id, stripe_product_id, name)')
      .eq('id', priceId)
      .eq('product_id', productId)
      .single()
    
    if (fetchError || !currentPrice) {
      return NextResponse.json(
        { error: 'Price not found' },
        { status: 404 }
      )
    }
    
    const product = currentPrice.products as { id: string; stripe_product_id: string | null; name: string }
    
    // Check if amount changed (requires new Stripe price)
    const amountChanged = body.amount !== undefined && body.amount !== currentPrice.amount
    
    if (amountChanged && currentPrice.stripe_price_id && product.stripe_product_id) {
      // Archive old Stripe price
      await stripe.prices.update(currentPrice.stripe_price_id, { active: false })
      
      // Create new Stripe price
      const priceData: Parameters<typeof stripe.prices.create>[0] = {
        product: product.stripe_product_id,
        unit_amount: body.amount!,
        currency: currentPrice.currency.toLowerCase(),
        nickname: body.nickname || currentPrice.nickname || undefined,
        tax_behavior: currentPrice.tax_behavior as 'inclusive' | 'exclusive' | 'unspecified',
        metadata: {
          lekbanken_price_id: priceId,
          lekbanken_product_id: productId,
          billing_model: currentPrice.billing_model,
          source: 'lekbanken',
          replaces_price: currentPrice.stripe_price_id,
        },
      }
      
      if (currentPrice.interval !== 'one_time') {
        priceData.recurring = {
          interval: currentPrice.interval as 'month' | 'year',
          interval_count: currentPrice.interval_count ?? 1,
        }
      }
      
      const newStripePrice = await stripe.prices.create(priceData, {
        idempotencyKey: `update_price_${priceId}_${Date.now()}`,
      })
      
      // Update local price with new Stripe ID
      const { error: updateError } = await supabase
        .from('product_prices')
        .update({
          amount: body.amount,
          nickname: body.nickname ?? currentPrice.nickname,
          stripe_price_id: newStripePrice.id,
          is_default: body.is_default ?? currentPrice.is_default,
          active: body.active ?? currentPrice.active,
        })
        .eq('id', priceId)
      
      if (updateError) {
        throw new Error(`Failed to update price: ${updateError.message}`)
      }
      
      // Update default price if needed
      if (body.is_default) {
        await stripe.products.update(product.stripe_product_id, {
          default_price: newStripePrice.id,
        })
        
        await supabase
          .from('products')
          .update({ stripe_default_price_id: newStripePrice.id })
          .eq('id', productId)
      }
      
      // Log audit event for price update
      await logPriceEvent(productId, 'price_updated', {
        priceId,
        amount: body.amount,
        currency: currentPrice.currency,
        interval: currentPrice.interval,
        stripePriceId: newStripePrice.id,
      }, user?.id)
      
      return NextResponse.json({
        success: true,
        message: 'Price updated with new Stripe price',
        data: {
          priceId,
          oldStripePriceId: currentPrice.stripe_price_id,
          newStripePriceId: newStripePrice.id,
        },
      })
    }
    
    // No amount change - just update local fields
    const updateData: Record<string, unknown> = {}
    if (body.nickname !== undefined) updateData.nickname = body.nickname
    if (body.is_default !== undefined) updateData.is_default = body.is_default
    if (body.active !== undefined) updateData.active = body.active
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes to apply',
      })
    }
    
    // If setting as default, unset other defaults
    if (body.is_default) {
      await supabase
        .from('product_prices')
        .update({ is_default: false })
        .eq('product_id', productId)
        .eq('currency', currentPrice.currency)
        .eq('interval', currentPrice.interval)
        .neq('id', priceId)
      
      // Update Stripe default price
      if (currentPrice.stripe_price_id && product.stripe_product_id) {
        await stripe.products.update(product.stripe_product_id, {
          default_price: currentPrice.stripe_price_id,
        })
        
        await supabase
          .from('products')
          .update({ stripe_default_price_id: currentPrice.stripe_price_id })
          .eq('id', productId)
      }
    }
    
    const { error: updateError } = await supabase
      .from('product_prices')
      .update(updateData)
      .eq('id', priceId)
    
    if (updateError) {
      throw new Error(`Failed to update price: ${updateError.message}`)
    }
    
    // Log audit event for default price change
    if (body.is_default) {
      await logPriceEvent(productId, 'default_price_changed', {
        priceId,
        newDefault: priceId,
        currency: currentPrice.currency,
        interval: currentPrice.interval,
      }, user?.id)
    } else if (Object.keys(updateData).length > 0) {
      // For other updates, use logProductEvent directly for flexibility
      const { logProductEvent } = await import('@/lib/services/productAudit.server')
      await logProductEvent({
        productId,
        eventType: 'price_updated',
        eventData: {
          price_id: priceId,
          updated_fields: Object.keys(updateData),
          ...updateData,
        },
        actorId: user?.id,
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Price updated',
    })
    
  } catch (error) {
    console.error('Error updating price:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Archive price (sets active=false)
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; priceId: string }> }
) {
  try {
    const rlsClient = await createServerRlsClient()
    const { data: { user } } = await rlsClient.auth.getUser()
    
    if (!await isSystemAdmin()) {
      return NextResponse.json(
        { error: 'Forbidden - system_admin required' },
        { status: 403 }
      )
    }
    
    const { productId, priceId } = await params
    // Use service role client for admin operations (bypasses RLS)
    const supabase = createServiceRoleClient()
    
    // Fetch price to get Stripe ID and details for audit
    const { data: price, error: fetchError } = await supabase
      .from('product_prices')
      .select('stripe_price_id, amount, currency, interval')
      .eq('id', priceId)
      .eq('product_id', productId)
      .single()
    
    if (fetchError || !price) {
      return NextResponse.json(
        { error: 'Price not found' },
        { status: 404 }
      )
    }
    
    // Archive in Stripe
    if (price.stripe_price_id) {
      try {
        await stripe.prices.update(price.stripe_price_id, { active: false })
      } catch (stripeError) {
        console.error('Failed to archive price in Stripe:', stripeError)
        // Continue - still archive locally
      }
    }
    
    // Archive locally (soft delete)
    const { error: updateError } = await supabase
      .from('product_prices')
      .update({ active: false, is_default: false })
      .eq('id', priceId)
    
    if (updateError) {
      throw new Error(`Failed to archive price: ${updateError.message}`)
    }
    
    // Log audit event for price deletion
    await logPriceEvent(productId, 'price_deleted', {
      priceId,
      amount: price.amount,
      currency: price.currency,
      interval: price.interval,
      stripePriceId: price.stripe_price_id,
    }, user?.id)
    
    return NextResponse.json({
      success: true,
      message: 'Price archived',
    })
    
  } catch (error) {
    console.error('Error archiving price:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
