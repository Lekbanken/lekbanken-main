/**
 * POST /api/admin/products/search
 *
 * Admin-only endpoint to search and filter products with full admin data.
 * Fetches live data from products, product_prices, and tenant_product_entitlements.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import type {
  ProductFilters,
  ProductAdminRow,
  ProductListResponse,
  HealthStatus,
  ProductType,
  ProductStatus,
  AvailabilityScope,
  ProductPrice,
  StripeLinkage,
  StripeLinkageStatus,
  UnitLabel,
  PriceInterval,
  TaxBehavior,
} from '@/features/admin/products/v2/types';

/** Return the most recent of updated_at and stripe_last_synced_at */
function effectiveUpdatedAt(updatedAt: string, syncedAt: string | null | undefined): string {
  if (!syncedAt) return updatedAt;
  return new Date(syncedAt) > new Date(updatedAt) ? syncedAt : updatedAt;
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient();
  const adminClient = createServiceRoleClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  // Parse filters
  const filters: ProductFilters = await request.json().catch(() => ({
    page: 1,
    pageSize: 25,
    sortBy: 'updated_at',
    sortOrder: 'desc',
  }));

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const offset = (page - 1) * pageSize;

  // ---------------------------------------------------------------------------
  // 1. Build products query
  // ---------------------------------------------------------------------------
  let query = supabase
    .from('products')
    .select('*, purposes:product_purposes(purpose:purposes(id, name))', { count: 'exact' });

  // Search filter
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,product_key.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Status filter (server-side — column exists)
  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses);
  }

  // Sorting
  const sortAsc = filters.sortOrder === 'asc';
  const columnMap: Record<string, string> = {
    name: 'name',
    status: 'status',
    updated_at: 'updated_at',
    stripe_linkage: 'stripe_sync_status',
    health_status: 'updated_at',
  };
  query = query.order(columnMap[filters.sortBy || 'updated_at'] || 'updated_at', { ascending: sortAsc });

  // Pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[api/admin/products/search] Query error:', error);
    return NextResponse.json({ error: 'Failed to search products' }, { status: 500 });
  }

  const rows = data || [];
  const productIds = rows.map((r) => r.id);

  // ---------------------------------------------------------------------------
  // 2. Fetch live prices for all products on this page
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pricesByProduct: Record<string, any[]> = {};

  if (productIds.length > 0) {
    const { data: pData, error: pError } = await adminClient
      .from('product_prices')
      .select('*')
      .in('product_id', productIds)
      .eq('active', true)
      .order('is_default', { ascending: false })
      .order('currency', { ascending: true })
      .order('interval', { ascending: true });

    if (pError) {
      console.error('[api/admin/products/search] Prices query error:', pError);
    }

    for (const p of pData ?? []) {
      if (!pricesByProduct[p.product_id]) {
        pricesByProduct[p.product_id] = [];
      }
      pricesByProduct[p.product_id].push(p);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Fetch live entitlement counts (unique tenants per product)
  // ---------------------------------------------------------------------------
  let tenantCounts: Record<string, number> = {};

  if (productIds.length > 0) {
    const { data: entData, error: entError } = await adminClient
      .from('tenant_product_entitlements')
      .select('product_id, tenant_id')
      .in('product_id', productIds)
      .eq('status', 'active');

    if (entError) {
      console.error('[api/admin/products/search] Entitlements query error:', entError);
    }

    // Count distinct tenants per product
    const tenantSets: Record<string, Set<string>> = {};
    for (const e of entData ?? []) {
      if (!tenantSets[e.product_id]) tenantSets[e.product_id] = new Set();
      tenantSets[e.product_id].add(e.tenant_id);
    }
    for (const [pid, set] of Object.entries(tenantSets)) {
      tenantCounts[pid] = set.size;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Transform to ProductAdminRow with live data
  // ---------------------------------------------------------------------------
  const products: ProductAdminRow[] = rows.map((row) => {
    const productPrices = pricesByProduct[row.id] ?? [];

    // Stripe linkage — use actual stripe_sync_status column
    const syncStatus = row.stripe_sync_status as string | null;
    let linkageStatus: StripeLinkageStatus = 'missing';
    if (row.stripe_product_id) {
      if (syncStatus === 'drift') linkageStatus = 'drift';
      else if (syncStatus === 'error') linkageStatus = 'error';
      else linkageStatus = 'connected';
    }

    const stripeLinkage: StripeLinkage = {
      status: linkageStatus,
      stripe_product_id: row.stripe_product_id ?? null,
      stripe_product_name: row.stripe_product_id ? row.name : null,
      last_synced_at: row.stripe_last_synced_at ?? null,
      drift_details: row.stripe_sync_error ?? null,
      active_prices_count: productPrices.length,
    };

    // Primary price — first default or first price
    const primaryPriceRaw = productPrices.find((p) => p.is_default) ?? productPrices[0] ?? null;
    const primaryPrice: ProductPrice | null = primaryPriceRaw
      ? {
          id: primaryPriceRaw.id,
          product_id: row.id,
          stripe_price_id: primaryPriceRaw.stripe_price_id,
          amount: primaryPriceRaw.amount,
          currency: primaryPriceRaw.currency,
          interval: primaryPriceRaw.interval as PriceInterval,
          interval_count: primaryPriceRaw.interval_count ?? 1,
          tax_behavior: (primaryPriceRaw.tax_behavior ?? 'exclusive') as TaxBehavior,
          billing_model: primaryPriceRaw.billing_model ?? 'per_seat',
          lookup_key: primaryPriceRaw.lookup_key ?? null,
          trial_period_days: primaryPriceRaw.trial_period_days ?? 0,
          nickname: primaryPriceRaw.nickname,
          is_default: primaryPriceRaw.is_default ?? false,
          active: primaryPriceRaw.active ?? true,
          created_at: primaryPriceRaw.created_at,
          updated_at: primaryPriceRaw.updated_at,
        }
      : null;

    // Health status — computed from actual data
    let healthStatus: HealthStatus = 'ok';
    const healthIssues: string[] = [];

    if (!row.name) {
      healthStatus = 'missing_fields';
      healthIssues.push('Namn saknas');
    }
    if (!row.customer_description) {
      healthIssues.push('Kundbeskrivning saknas');
    }
    if (productPrices.length === 0) {
      healthStatus = 'no_price';
      healthIssues.push('Inga aktiva priser');
    }
    if (syncStatus === 'drift') {
      healthStatus = 'stripe_drift';
      healthIssues.push('Stripe-synkfel');
    } else if (syncStatus === 'error') {
      healthStatus = 'stripe_drift';
      healthIssues.push('Stripe-fel: ' + (row.stripe_sync_error ?? 'okänt'));
    }

    // Use actual DB columns
    const status: ProductStatus = (row.status as ProductStatus) || 'active';
    const productType: ProductType = (row.product_type as ProductType) || 'license';
    const assignedTenants = tenantCounts[row.id] ?? 0;

    return {
      id: row.id,
      product_key: row.product_key,
      name: row.name,
      internal_description: row.description ?? row.internal_description,
      customer_description: row.customer_description ?? null,
      product_type: productType,
      category: row.category || 'general',
      is_bundle: row.is_bundle ?? false,
      category_slug: row.category_slug ?? null,
      tags: [],
      status,
      unit_label: (row.unit_label as UnitLabel) || 'seat',
      statement_descriptor: row.statement_descriptor ?? null,
      stripe_product_id: row.stripe_product_id ?? null,
      image_url: row.image_url ?? null,
      target_audience: (row.target_audience as ProductAdminRow['target_audience']) || 'all',
      feature_tier: (row.feature_tier as ProductAdminRow['feature_tier']) || 'standard',
      min_seats: row.min_seats ?? 1,
      max_seats: row.max_seats ?? 100,
      stripe_linkage: stripeLinkage,
      primary_price: primaryPrice,
      prices_count: productPrices.length,
      availability_scope: (assignedTenants > 0 ? 'per_tenant' : 'global') as AvailabilityScope,
      assigned_tenants_count: assignedTenants,
      health_status: healthStatus,
      health_issues: healthIssues,
      metadata: null,
      created_at: row.created_at,
      updated_at: effectiveUpdatedAt(row.updated_at, row.stripe_last_synced_at),
      created_by: null,
    };
  });

  // ---------------------------------------------------------------------------
  // 5. Client-side filters for computed fields
  // ---------------------------------------------------------------------------
  let filteredProducts = products;

  if (filters.stripeLinkageStatuses && filters.stripeLinkageStatuses.length > 0) {
    filteredProducts = filteredProducts.filter((p) =>
      filters.stripeLinkageStatuses!.includes(p.stripe_linkage.status)
    );
  }

  if (filters.healthStatuses && filters.healthStatuses.length > 0) {
    filteredProducts = filteredProducts.filter((p) =>
      filters.healthStatuses!.includes(p.health_status)
    );
  }

  // ---------------------------------------------------------------------------
  // 6. Global stats (across ALL products, not just current page)
  // ---------------------------------------------------------------------------
  const { count: activeCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: draftCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft');

  const { count: totalCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  const { count: missingStripeCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .is('stripe_product_id', null);

  const response: ProductListResponse = {
    products: filteredProducts,
    total: count || 0,
    page,
    pageSize,
    stats: {
      total: totalCount || 0,
      active: activeCount || 0,
      draft: draftCount || 0,
      missingStripe: missingStripeCount || 0,
    },
  };

  return NextResponse.json(response);
}
