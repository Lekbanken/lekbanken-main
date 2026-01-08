/**
 * Sync Single Product to Stripe API
 * 
 * POST /api/admin/stripe/sync-product
 * 
 * Syncs a single product to Stripe. Supports force sync and drift detection.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { 
  pushProductToStripe, 
  detectDrift, 
  forceSyncProduct,
  archiveProduct,
} from '@/lib/stripe/product-sync'
import { type SyncOptions } from '@/lib/stripe/product-sync-types'

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
// POST - Sync product
// =============================================================================

interface SyncProductBody {
  productId: string
  action?: 'sync' | 'force_sync' | 'detect_drift' | 'archive'
  options?: SyncOptions
}

export async function POST(request: NextRequest) {
  try {
    if (!await isSystemAdmin()) {
      return NextResponse.json(
        { error: 'Forbidden - system_admin required' },
        { status: 403 }
      )
    }
    
    // Parse request body
    let body: SyncProductBody
    try {
      body = await request.json()
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
    
  } catch (error) {
    console.error('Error syncing product:', error)
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
// GET - Get drift status for a product
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    if (!await isSystemAdmin()) {
      return NextResponse.json(
        { error: 'Forbidden - system_admin required' },
        { status: 403 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
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
    
  } catch (error) {
    console.error('Error detecting drift:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
