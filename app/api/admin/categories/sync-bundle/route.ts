/**
 * POST /api/admin/categories/sync-bundle
 *
 * Calls sync_category_bundle(slug) RPC and returns the result.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';

export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
  const supabase = await createServerRlsClient();

  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
  if (!slug) {
    return NextResponse.json({ error: 'Missing category slug' }, { status: 400 });
  }

  // Verify category exists before calling RPC
  const { data: cat } = await supabase
    .from('categories')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();
  if (!cat) {
    return NextResponse.json({ error: `Category "${slug}" not found` }, { status: 404 });
  }

  const { data, error } = await supabase.rpc('sync_category_bundle', {
    p_category_slug: slug,
  });

  if (error) {
    console.error('[admin/categories/sync-bundle] RPC error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // RPC returns TABLE → data is an array with one row
  const result = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({ result });
  },
});
