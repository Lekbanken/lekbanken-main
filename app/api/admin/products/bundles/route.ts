/**
 * GET /api/admin/products/bundles — list active bundle products for dropdown
 *
 * Returns a lightweight list of bundle products with optional yearly price,
 * designed for admin category forms (bundle_product_id picker).
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';

export type BundleOption = {
  id: string;
  name: string;
  product_key: string;
  yearlyPriceFormatted: string | null;
};

export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createServerRlsClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Fetch bundle products ────────────────────────────────────────────────
  const { data: bundles, error: bundleErr } = await supabase
    .from('products')
    .select('id,name,product_key')
    .eq('status', 'active')
    .eq('is_bundle', true)
    .order('name', { ascending: true });

  if (bundleErr) {
    console.error('[admin/products/bundles] Query error:', bundleErr);
    return NextResponse.json({ error: 'Failed to load bundles' }, { status: 500 });
  }

  if (!bundles || bundles.length === 0) {
    return NextResponse.json({ bundles: [] });
  }

  // ── Fetch yearly SEK prices for each bundle ──────────────────────────────
  const { data: prices } = await supabase
    .from('product_prices')
    .select('product_id,amount,currency')
    .eq('active', true)
    .eq('currency', 'SEK')
    .eq('interval', 'year')
    .in('product_id', bundles.map((b) => b.id))
    .order('is_default', { ascending: false })
    .order('amount', { ascending: true });

  // Best yearly price per bundle
  const bestPrice = new Map<string, { amount: number; currency: string }>();
  for (const pr of prices ?? []) {
    if (!bestPrice.has(pr.product_id)) {
      bestPrice.set(pr.product_id, { amount: pr.amount, currency: pr.currency });
    }
  }

  const result: BundleOption[] = bundles.map((b) => {
    const price = bestPrice.get(b.id);
    let yearlyPriceFormatted: string | null = null;
    if (price) {
      yearlyPriceFormatted = new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency: price.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price.amount / 100) + '/år';
    }
    return {
      id: b.id,
      name: b.name,
      product_key: b.product_key,
      yearlyPriceFormatted,
    };
  });

  return NextResponse.json({ bundles: result });
}
