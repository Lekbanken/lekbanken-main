'use server';

import { createServerRlsClient } from '@/lib/supabase/server';
import type { LicenseListItem, LicenseStats, LicenseListResponse } from './types';

interface FetchLicensesFilters {
  search?: string;
  type?: 'all' | 'private' | 'organization';
  status?: 'all' | 'active' | 'inactive' | 'revoked' | 'expired';
  productId?: string | null;
}

/**
 * Fetch licenses (entitlements) with filters for admin view
 */
export async function fetchLicenses(
  filters: FetchLicensesFilters = {},
  page = 1,
  pageSize = 25
): Promise<LicenseListResponse> {
  const supabase = await createServerRlsClient();
  
  // Base query for entitlements with tenant and product info
  let query = supabase
    .from('tenant_product_entitlements')
    .select(`
      id,
      tenant_id,
      product_id,
      status,
      quantity_seats,
      valid_from,
      created_at,
      tenant:tenants!inner(
        id,
        name,
        type
      ),
      product:products!inner(
        id,
        name,
        product_key
      )
    `, { count: 'exact' });

  // Apply type filter
  if (filters.type === 'private') {
    query = query.eq('tenant.type', 'private');
  } else if (filters.type === 'organization') {
    query = query.not('tenant.type', 'eq', 'private').not('tenant.type', 'eq', 'demo');
  }

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  // Apply product filter
  if (filters.productId) {
    query = query.eq('product_id', filters.productId);
  }

  // Apply search (tenant name or product name)
  if (filters.search) {
    query = query.or(`tenant.name.ilike.%${filters.search}%,product.name.ilike.%${filters.search}%`);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to).order('created_at', { ascending: false });

  const { data: entitlements, error, count } = await query;

  if (error) {
    console.error('[fetchLicenses] Error:', error);
    throw new Error(`Failed to fetch licenses: ${error.message}`);
  }

  // Now fetch owner info for private tenants
  interface EntitlementWithTenant {
    id: string;
    tenant_id: string;
    product_id: string;
    status: string;
    quantity_seats: number;
    valid_from: string;
    created_at: string;
    tenant: { id: string; name: string; type: string };
    product: { id: string; name: string; product_key: string };
  }
  
  const typedEntitlements = entitlements as unknown as EntitlementWithTenant[] | null;
  
  const privateTenantIds = typedEntitlements
    ?.filter((e) => e.tenant?.type === 'private')
    .map((e) => e.tenant_id) || [];

  const ownerMap: Record<string, { email: string; name: string | null }> = {};
  
  if (privateTenantIds.length > 0) {
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select(`
        tenant_id,
        user:users!inner(
          id,
          email,
          full_name
        )
      `)
      .in('tenant_id', privateTenantIds)
      .eq('role', 'owner');

    if (memberships) {
      for (const m of memberships) {
        const user = m.user as { email?: string; full_name?: string | null } | null;
        if (user?.email) {
          ownerMap[m.tenant_id] = {
            email: user.email,
            name: user.full_name || null,
          };
        }
      }
    }
  }

  // Fetch assigned seat counts
  const entitlementIds = typedEntitlements?.map((e) => e.id) || [];
  const seatCountMap: Record<string, number> = {};
  
  if (entitlementIds.length > 0) {
    const { data: seatCounts } = await supabase
      .from('tenant_entitlement_seat_assignments')
      .select('entitlement_id')
      .in('entitlement_id', entitlementIds)
      .eq('status', 'active');

    if (seatCounts) {
      for (const s of seatCounts) {
        seatCountMap[s.entitlement_id] = (seatCountMap[s.entitlement_id] || 0) + 1;
      }
    }
  }

  // Map to license list items
  const licenses: LicenseListItem[] = (typedEntitlements || []).map((e) => {
    const tenant = e.tenant;
    const product = e.product;
    const owner = ownerMap[e.tenant_id];
    
    return {
      id: e.id,
      tenantId: e.tenant_id,
      tenantName: tenant.name,
      tenantType: tenant.type as LicenseListItem['tenantType'],
      productId: e.product_id,
      productName: product.name,
      productSlug: product.product_key,
      status: e.status as LicenseListItem['status'],
      quantitySeats: e.quantity_seats,
      assignedSeats: seatCountMap[e.id] || 0,
      validFrom: e.valid_from,
      validUntil: null, // Column doesn't exist in current schema
      createdAt: e.created_at,
      ownerEmail: owner?.email || null,
      ownerName: owner?.name || null,
    };
  });

  // Fetch stats
  const stats = await fetchLicenseStats();

  return {
    licenses,
    stats,
    page,
    pageSize,
    totalCount: count || 0,
  };
}

/**
 * Fetch license statistics
 */
async function fetchLicenseStats(): Promise<LicenseStats> {
  const supabase = await createServerRlsClient();

  // Total count
  const { count: total } = await supabase
    .from('tenant_product_entitlements')
    .select('id', { count: 'exact', head: true });

  // Active count
  const { count: active } = await supabase
    .from('tenant_product_entitlements')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  // Private tenant count (need to join)
  const { data: privateData } = await supabase
    .from('tenant_product_entitlements')
    .select(`
      id,
      tenant:tenants!inner(type)
    `)
    .eq('tenant.type', 'private');

  const privateCount = privateData?.length || 0;

  // Org count (total - private - demo)
  const { data: orgData } = await supabase
    .from('tenant_product_entitlements')
    .select(`
      id,
      tenant:tenants!inner(type)
    `)
    .not('tenant.type', 'eq', 'private')
    .not('tenant.type', 'eq', 'demo');

  const orgCount = orgData?.length || 0;

  return {
    total: total || 0,
    active: active || 0,
    private: privateCount,
    organization: orgCount,
  };
}
