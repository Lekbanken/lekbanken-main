/**
 * POST /api/admin/products/search
 *
 * Admin-only endpoint to search and filter products with full admin data.
 * 
 * Note: The current products table has minimal schema. Many fields are computed
 * or mocked until the full admin schema is implemented.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import type { ProductFilters, ProductAdminRow, ProductListResponse, HealthStatus, ProductType, ProductStatus, AvailabilityScope, ProductPrice, StripeLinkage } from '@/features/admin/products/v2/types';

export async function POST(request: Request) {
  const supabase = await createServerRlsClient();

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

  // Build query - current schema only has: id, product_key, name, category, description, created_at, updated_at
  let query = supabase
    .from('products')
    .select('*, purposes:product_purposes(purpose:purposes(id, name))', { count: 'exact' });

  // Apply search filter
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,product_key.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Note: status filter cannot be applied at DB level until schema is updated
  // For now, we'll filter client-side after mapping

  // Apply sorting
  const sortColumn = filters.sortBy || 'updated_at';
  const sortAsc = filters.sortOrder === 'asc';

  // Map sortBy to actual column (only name and updated_at exist)
  const columnMap: Record<string, string> = {
    name: 'name',
    status: 'updated_at', // Fallback - status column doesn't exist yet
    updated_at: 'updated_at',
    stripe_linkage: 'updated_at', // Fallback since we compute this
    health_status: 'updated_at', // Fallback since we compute this
  };

  query = query.order(columnMap[sortColumn] || 'updated_at', { ascending: sortAsc });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[api/admin/products/search] Query error:', error);
    return NextResponse.json({ error: 'Failed to search products' }, { status: 500 });
  }

  // Transform to ProductAdminRow format
  // Note: Many fields are computed/mocked since the current schema is minimal
  const products: ProductAdminRow[] = (data || []).map((row) => {
    // Stripe linkage - mock as 'missing' until we have stripe_product_id column
    const stripeLinkage: StripeLinkage = {
      status: 'missing',
      stripe_product_id: null,
      stripe_product_name: null,
      last_synced_at: null,
      drift_details: null,
      active_prices_count: 0,
    };

    // Compute health status based on available data
    let healthStatus: HealthStatus = 'ok';
    const healthIssues: string[] = [];

    if (!row.name) {
      healthStatus = 'missing_fields';
      healthIssues.push('Namn saknas');
    }
    if (!row.customer_description) {
      healthIssues.push('Kundbeskrivning saknas');
    }

    // Primary price - mock as null until pricing table is implemented
    const primaryPrice: ProductPrice | null = null;

    // Infer product type from category
    const productType: ProductType = row.category === 'subscription' ? 'subscription' : 'license';

    // Infer status - default to 'active' for existing products
    const status: ProductStatus = 'active';

    return {
      id: row.id,
      product_key: row.product_key,
      name: row.name,
      internal_description: row.description,
      customer_description: null,
      product_type: productType,
      category: row.category || 'general',
      tags: [],
      status: status,
      stripe_linkage: stripeLinkage,
      primary_price: primaryPrice,
      prices_count: 0,
      availability_scope: 'global' as AvailabilityScope,
      assigned_tenants_count: 0,
      health_status: healthStatus,
      health_issues: healthIssues,
      metadata: null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: null,
    };
  });

  // Apply client-side filters for computed fields
  let filteredProducts = products;

  // Filter by status (client-side until schema is updated)
  if (filters.statuses && filters.statuses.length > 0) {
    filteredProducts = filteredProducts.filter((p) =>
      filters.statuses!.includes(p.status)
    );
  }

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

  const response: ProductListResponse = {
    products: filteredProducts,
    total: count || 0,
    page,
    pageSize,
  };

  return NextResponse.json(response);
}
