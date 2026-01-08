/**
 * POST /api/admin/products/[productId]/sync-stripe
 *
 * Admin-only endpoint to sync product with Stripe.
 * 
 * Uses pushProductToStripe() to create/update product and prices in Stripe.
 * Supports force option to re-sync even if already synced.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { pushProductToStripe } from '@/lib/stripe/product-sync';
import { logStripeSync } from '@/lib/services/productAudit.server';

type RouteParams = {
  params: Promise<{ productId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { productId } = await params;
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  // Parse options from request body (optional)
  let options: { force?: boolean; dryRun?: boolean } = {};
  try {
    const body = await request.json();
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
      user.id
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
    await logStripeSync(productId, result.stripeProductId || '', true, undefined, user.id);
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
}
