/**
 * Bootstrap Products to Stripe API
 * 
 * POST /api/admin/stripe/bootstrap-products
 * 
 * Syncs all active products to Stripe. Only accessible by system admins.
 * Supports dry-run mode for testing.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { bootstrapProductsToStripe, getSyncStatusSummary } from '@/lib/stripe/product-sync'
import { type BootstrapOptions, PRODUCT_STATUS } from '@/lib/stripe/product-sync-types'

// =============================================================================
// AUTH HELPER
// =============================================================================

async function isSystemAdmin(): Promise<boolean> {
  const supabase = await createServerRlsClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  // Check multiple locations for system_admin role
  const appMetadataRole = user.app_metadata?.role as string | undefined
  const appMetadataGlobalRole = user.app_metadata?.global_role as string | undefined
  const userMetadataGlobalRole = user.user_metadata?.global_role as string | undefined
  
  const effectiveRole = appMetadataRole || appMetadataGlobalRole || userMetadataGlobalRole
  
  return effectiveRole === 'system_admin' || 
         effectiveRole === 'superadmin' || 
         effectiveRole === 'admin'
}

// =============================================================================
// GET - Status overview
// =============================================================================

export async function GET() {
  try {
    if (!await isSystemAdmin()) {
      return NextResponse.json(
        { error: 'Forbidden - system_admin required' },
        { status: 403 }
      )
    }
    
    const summary = await getSyncStatusSummary()
    
    return NextResponse.json({
      success: true,
      data: summary,
    })
    
  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Bootstrap products
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    if (!await isSystemAdmin()) {
      return NextResponse.json(
        { error: 'Forbidden - system_admin required' },
        { status: 403 }
      )
    }
    
    // Parse request body
    let body: { options?: BootstrapOptions } = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is fine, use defaults
    }
    
    const options: BootstrapOptions = {
      statuses: body.options?.statuses || [PRODUCT_STATUS.ACTIVE],
      batchSize: body.options?.batchSize || 10,
      batchDelay: body.options?.batchDelay || 500,
      dryRun: body.options?.dryRun || false,
      force: body.options?.force || false,
    }
    
    console.log('Starting bootstrap with options:', options)
    
    // Run bootstrap
    const result = await bootstrapProductsToStripe(options)
    
    console.log('Bootstrap completed:', {
      success: result.success,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      duration: `${result.duration}ms`,
    })
    
    return NextResponse.json({
      success: result.success,
      data: result,
    })
    
  } catch (error) {
    console.error('Error bootstrapping products:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
