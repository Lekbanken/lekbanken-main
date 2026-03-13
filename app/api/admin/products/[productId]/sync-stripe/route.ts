/**
 * POST /api/admin/products/[productId]/sync-stripe
 *
 * Admin-only endpoint to sync product with Stripe.
 * 
 * Uses pushProductToStripe() to create/update product and prices in Stripe.
 * Supports force option to re-sync even if already synced.
 */

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/route-handler';
import { pushProductToStripe } from '@/lib/stripe/product-sync';
import { logStripeSync } from '@/lib/services/productAudit.server';

export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ req, params, auth }) => {
  const { productId } = params;
  const userId = auth!.user!.id;

  // Parse options from request body (optional)
  let options: { force?: boolean; dryRun?: boolean } = {};
  try {
    const body = await req.json();
    options = {
      force: body?.force ?? true, // Default to force sync from UI
      dryRun: body?.dryRun ?? false,
    };
  } catch {
    // No body or invalid JSON - use defaults (force: true)
    options = { force: true };
  }

  // Sync product to Stripe using the real sync function
  const result = await pushProductToStripe(productId, options);

  if (!result.success) {
    // Log failed sync attempt
    await logStripeSync(
      productId, 
      result.stripeProductId || '', 
      false, 
      result.error || 'Unknown error', 
      userId
    );
    
    return NextResponse.json(
      { 
        error: result.error || 'Sync failed',
        details: result,
      }, 
      { status: 500 }
    );
  }

  // Log successful sync
  if (result.operation !== 'skipped') {
    await logStripeSync(productId, result.stripeProductId || '', true, undefined, userId);
  }

  // Return sync result
  return NextResponse.json({
    synced: true,
    stripe_product_id: result.stripeProductId,
    operation: result.operation,
    timestamp: result.timestamp,
    message: result.operation === 'skipped' 
      ? 'Product already synced (use force: true to re-sync)'
      : `Product ${result.operation} successfully`,
  });
  },
});
