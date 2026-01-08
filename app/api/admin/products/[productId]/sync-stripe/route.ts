/**
 * POST /api/admin/products/[productId]/sync-stripe
 *
 * Admin-only endpoint to sync product with Stripe.
 * 
 * Note: This is a placeholder implementation. Full Stripe sync requires
 * additional schema columns (stripe_product_id, etc.) and Stripe API integration.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';

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

  // Fetch current product
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (fetchError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // TODO: Implement actual Stripe sync
  // This would:
  // 1. Fetch product from Stripe using stripe_product_id
  // 2. Compare fields (name, description, etc.)
  // 3. Fetch prices from Stripe
  // 4. Update local database with any changes
  // 5. Detect and report drift

  // For now, return a placeholder response
  // Note: stripe_product_id column doesn't exist yet in schema
  const syncResult = {
    synced: false,
    stripe_product_id: null,
    drift_detected: false,
    drift_details: [],
    prices_synced: 0,
    timestamp: new Date().toISOString(),
    message: 'Stripe sync not yet implemented - schema migration required',
  };

  // Update last_synced timestamp
  await supabase
    .from('products')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', productId);

  // TODO: Log audit event

  return NextResponse.json(syncResult);
}
