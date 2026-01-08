/**
 * PATCH /api/admin/products/[productId]/status
 *
 * Admin-only endpoint to change product status (draft -> active -> archived).
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';

type RouteParams = {
  params: Promise<{ productId: string }>;
};

const VALID_STATUSES = ['draft', 'active', 'archived'];

export async function PATCH(request: Request, { params }: RouteParams) {
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

  const body = await request.json().catch(() => ({}));
  const newStatus = body.status;

  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
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

  // Validate state transition
  const currentStatus = product.status || 'draft';

  // Business rules for status transitions
  if (newStatus === 'active' && currentStatus !== 'draft') {
    return NextResponse.json(
      { error: 'Can only activate draft products' },
      { status: 400 }
    );
  }

  if (newStatus === 'archived' && currentStatus !== 'active') {
    return NextResponse.json(
      { error: 'Can only archive active products' },
      { status: 400 }
    );
  }

  // Additional validation for activation
  if (newStatus === 'active') {
    // Check if product has required fields
    if (!product.name) {
      return NextResponse.json(
        { error: 'Product must have a name before activation' },
        { status: 400 }
      );
    }

    // Note: In a real implementation, we would also check:
    // - At least one active price (for paid products)
    // - Stripe linkage status
    // - Entitlements configured
  }

  // Update status
  const { data, error } = await supabase
    .from('products')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('[api/admin/products/[productId]/status] Update error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }

  // TODO: Log audit event

  return NextResponse.json({ product: data, previousStatus: currentStatus });
}
