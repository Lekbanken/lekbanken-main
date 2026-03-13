/**
 * GET /api/admin/products/exists?product_key=...
 *
 * Quick preflight check: does a product with this product_key already exist?
 * Returns { exists, product } where product has minimal info if found.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';

export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
  const supabase = await createServerRlsClient();

  const url = new URL(req.url);
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
  },
});
