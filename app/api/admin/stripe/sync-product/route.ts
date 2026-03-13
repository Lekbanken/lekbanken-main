/**
 * Sync Single Product to Stripe API
 * 
 * POST /api/admin/stripe/sync-product
 * 
 * Syncs a single product to Stripe. Supports force sync and drift detection.
 */

import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'
import { 
  pushProductToStripe, 
  detectDrift, 
  forceSyncProduct,
  archiveProduct,
} from '@/lib/stripe/product-sync'
import { type SyncOptions } from '@/lib/stripe/product-sync-types'

// =============================================================================
// POST - Sync product
// =============================================================================

interface SyncProductBody {
  productId: string
  action?: 'sync' | 'force_sync' | 'detect_drift' | 'archive'
  options?: SyncOptions
}

export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    // Parse request body
    let body: SyncProductBody
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    const { productId, action = 'sync', options = {} } = body
    
    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }
    
    console.log(`Sync product action: ${action}`, { productId, options })
    
    // Execute action
    let result
    switch (action) {
      case 'sync':
        result = await pushProductToStripe(productId, options)
        break
        
      case 'force_sync':
        result = await forceSyncProduct(productId)
        break
        
      case 'detect_drift':
        const driftResult = await detectDrift(productId)
        return NextResponse.json({
          success: true,
          data: driftResult,
        })
        
      case 'archive':
        result = await archiveProduct(productId)
        break
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
    
    console.log(`Sync product completed:`, result)
    
    return NextResponse.json({
      success: result.success,
      data: result,
    })
  },
})

// =============================================================================
// GET - Get drift status for a product
// =============================================================================

export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    const searchParams = req.nextUrl.searchParams
    const productId = searchParams.get('productId')
    
    if (!productId) {
      return NextResponse.json(
        { error: 'productId query parameter is required' },
        { status: 400 }
      )
    }
    
    const driftResult = await detectDrift(productId)
    
    return NextResponse.json({
      success: true,
      data: driftResult,
    })
  },
})
