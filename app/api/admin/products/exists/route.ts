/**
 * GET /api/admin/products/exists?product_key=...
 *
 * Quick preflight check: does a product with this product_key already exist?
 * Returns { exists, product } where product has minimal info if found.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';

export async function GET(request: Request) {
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const productKey = url.searchParams.get('product_key')?.trim().toLowerCase();

  if (!productKey) {
    return NextResponse.json({ error: 'product_key is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, product_key, is_bundle, status, category_slug')
    .eq('product_key', productKey)
    .maybeSingle();

  if (error) {
    console.error('[api/admin/products/exists] Query error:', error);
    return NextResponse.json({ error: 'Failed to check' }, { status: 500 });
  }

  return NextResponse.json({
    exists: !!data,
    product: data ?? null,
  });
}
