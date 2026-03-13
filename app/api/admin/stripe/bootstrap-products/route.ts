/**
 * Bootstrap Products to Stripe API
 * 
 * POST /api/admin/stripe/bootstrap-products
 * 
 * Syncs all active products to Stripe. Only accessible by system admins.
 * Supports dry-run mode for testing.
 */

import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'
import { bootstrapProductsToStripe, getSyncStatusSummary } from '@/lib/stripe/product-sync'
import { type BootstrapOptions, PRODUCT_STATUS } from '@/lib/stripe/product-sync-types'

// =============================================================================
// GET - Status overview
// =============================================================================

export const GET = apiHandler({
  auth: 'system_admin',
  handler: async () => {
    const summary = await getSyncStatusSummary()
    
    return NextResponse.json({
      success: true,
      data: summary,
    })
  },
})

// =============================================================================
// POST - Bootstrap products
// =============================================================================

export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    // Parse request body
    let body: { options?: BootstrapOptions } = {}
    try {
      body = await req.json()
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
  },
})
