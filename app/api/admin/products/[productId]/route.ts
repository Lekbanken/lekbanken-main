/**
 * GET /api/admin/products/[productId]
 * PATCH /api/admin/products/[productId]
 *
 * Admin-only endpoint to get/update product details.
 * 
 * Note: The current products table has minimal schema. Many fields are computed
 * or mocked until the full admin schema is implemented.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import type {
  ProductDetail,
  ProductStatus,
  ProductType,
  AvailabilityScope,
  StripeLinkage,
  ProductAvailability,
  LifecycleState,
  PublishChecklist,
} from '@/features/admin/products/v2/types';

type RouteParams = {
  params: Promise<{ productId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
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

  // Fetch product with relations
  // Current schema: id, product_key, name, category, description, capabilities, created_at, updated_at
  const { data: row, error } = await supabase
    .from('products')
    .select('*, purposes:product_purposes(purpose:purposes(id, name))')
    .eq('id', productId)
    .single();

  if (error || !row) {
    console.error('[api/admin/products/[productId]] Fetch error:', error);
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Build Stripe linkage (mock - no stripe_product_id column yet)
  const stripeLinkage: StripeLinkage = {
    status: 'missing',
    stripe_product_id: null,
    stripe_product_name: null,
    last_synced_at: null,
    drift_details: null,
    active_prices_count: 0,
  };

  // Build availability (placeholder)
  const availability: ProductAvailability = {
    scope: 'global',
    license_model: 'per_tenant',
    tenant_assignments: [],
    total_assigned_tenants: 0,
  };

  // Infer status - default to 'active' for existing products (no status column yet)
  const status: ProductStatus = 'active';
  
  // Build lifecycle - since we default to 'active', can_activate=false, can_archive=true
  const lifecycle: LifecycleState = {
    status,
    can_activate: false, // Already active
    can_archive: true,   // Active products can be archived
    activation_blockers: [],
    archive_warnings: [],
    soft_delete_policy: 'allowed',
  };

  // Build publish checklist
  const hasEntitlements = Array.isArray(row.capabilities) && (row.capabilities as unknown[]).length > 0;
  const publishChecklist: PublishChecklist = {
    has_valid_price: false, // No stripe integration yet
    has_entitlements: hasEntitlements,
    availability_rules_valid: true,
    stripe_linkage_ok: false, // No stripe integration yet
    all_passed: false,
    waived_items: [],
  };

  // Compute health
  let healthStatus: 'ok' | 'missing_fields' | 'stripe_drift' | 'no_price' | 'availability_misconfig' = 'ok';
  const healthIssues: string[] = [];

  if (!row.name) {
    healthStatus = 'missing_fields';
    healthIssues.push('Namn saknas');
  }
  if (!row.description) {
    healthIssues.push('Beskrivning saknas');
  }
  // Note: Would check stripe linkage here once column exists

  // Infer product type from category
  const productType: ProductType = row.category === 'subscription' ? 'subscription' : 'license';

  const product: ProductDetail = {
    id: row.id,
    product_key: row.product_key,
    name: row.name,
    internal_description: row.description,
    customer_description: null,
    product_type: productType,
    category: row.category || 'general',
    tags: [],
    status,
    stripe_linkage: stripeLinkage,
    primary_price: null,
    prices_count: 0,
    availability_scope: 'global' as AvailabilityScope,
    assigned_tenants_count: 0,
    health_status: healthStatus,
    health_issues: healthIssues,
    metadata: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: null,
    prices: [],
    entitlements: [],
    dependencies: [],
    availability,
    lifecycle,
    publish_checklist: publishChecklist,
    recent_audit_events: [],
  };

  return NextResponse.json({ product });
}

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

  // Build update payload - only update columns that exist in current schema
  const updatePayload: Record<string, unknown> = {};

  if (body.name !== undefined) updatePayload.name = body.name;
  if (body.description !== undefined) updatePayload.description = body.description;
  if (body.category !== undefined) updatePayload.category = body.category;
  if (body.product_key !== undefined) updatePayload.product_key = body.product_key;
  // Note: status and product_type columns don't exist yet in schema

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('[api/admin/products/[productId]] Update error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
