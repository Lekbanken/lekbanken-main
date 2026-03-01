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
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { logFieldUpdates, getRecentAuditEvents } from '@/lib/services/productAudit.server';
import type {
  ProductDetail,
  ProductStatus,
  ProductType,
  AvailabilityScope,
  StripeLinkage,
  ProductAvailability,
  LifecycleState,
  PublishChecklist,
  UnitLabel,
  PriceInterval,
  TaxBehavior,
} from '@/features/admin/products/v2/types';

type RouteParams = {
  params: Promise<{ productId: string }>;
};

/** Return the most recent of updated_at and stripe_last_synced_at */
function effectiveUpdatedAt(updatedAt: string, syncedAt: string | null | undefined): string {
  if (!syncedAt) return updatedAt;
  return new Date(syncedAt) > new Date(updatedAt) ? syncedAt : updatedAt;
}

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

  // Fetch prices from product_prices table using service role client
  const adminClient = createServiceRoleClient();
  const { data: pricesData, error: pricesError } = await adminClient
    .from('product_prices')
    .select('*')
    .eq('product_id', productId)
    .order('currency', { ascending: true })
    .order('interval', { ascending: true });

  if (pricesError) {
    console.error('[api/admin/products/[productId]] Prices fetch error:', pricesError);
  }

  const prices = pricesData ?? [];
  const activePrices = prices.filter(p => p.active);

  // Build Stripe linkage with actual data
  const stripeLinkage: StripeLinkage = {
    status: row.stripe_product_id ? 'connected' : 'missing',
    stripe_product_id: row.stripe_product_id ?? null,
    stripe_product_name: row.stripe_product_id ? row.name : null,
    last_synced_at: row.stripe_last_synced_at ?? null,
    drift_details: null,
    active_prices_count: activePrices.length,
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
  // Note: Entitlements check disabled until feature is implemented
  const hasValidPrice = activePrices.length > 0;
  const stripeLinkageOk = !!row.stripe_product_id;
  const publishChecklist: PublishChecklist = {
    has_valid_price: hasValidPrice,
    has_entitlements: true, // Disabled - always passes until entitlements UI is implemented
    availability_rules_valid: true,
    stripe_linkage_ok: stripeLinkageOk,
    all_passed: hasValidPrice && stripeLinkageOk,
    waived_items: ['entitlements'], // Mark as waived
  };

  // Compute health
  let healthStatus: 'ok' | 'missing_fields' | 'stripe_drift' | 'no_price' | 'availability_misconfig' = 'ok';
  const healthIssues: string[] = [];

  if (!row.name) {
    healthStatus = 'missing_fields';
    healthIssues.push('Namn saknas');
  }
  if (!row.customer_description) {
    healthIssues.push('Kundbeskrivning saknas');
  }
  // Note: Would check stripe linkage here once column exists

  // Derive product type from is_bundle + legacy category
  const productType: ProductType = row.is_bundle
    ? 'addon' // bundles display as add-on type in legacy enum; real truth is is_bundle
    : row.category === 'subscription'
      ? 'subscription'
      : row.category === 'addon'
        ? 'addon'
        : 'license';

  const product: ProductDetail = {
    id: row.id,
    product_key: row.product_key,
    name: row.name,
    internal_description: row.description,
    customer_description: row.customer_description ?? null,
    product_type: productType,
    category: row.category || 'general',
    is_bundle: row.is_bundle ?? false,
    category_slug: row.category_slug ?? null,
    tags: [],
    status,
    // Critical Stripe fields (Step 1)
    unit_label: (row.unit_label ?? 'seat') as UnitLabel,
    statement_descriptor: row.statement_descriptor ?? null,
    stripe_product_id: row.stripe_product_id ?? null,
    // Step 2: Product image
    image_url: row.image_url ?? null,
    // Step 3: Strategic fields
    target_audience: (row.target_audience ?? 'all') as 'all' | 'schools' | 'kindergartens' | 'fritids' | 'enterprise',
    feature_tier: (row.feature_tier ?? 'standard') as 'free' | 'standard' | 'premium' | 'enterprise',
    min_seats: row.min_seats ?? 1,
    max_seats: row.max_seats ?? 100,
    stripe_linkage: stripeLinkage,
    primary_price: (() => {
      const found = activePrices.find(p => p.is_default) ?? activePrices[0];
      if (!found) return null;
      return {
        id: found.id,
        product_id: productId,
        stripe_price_id: found.stripe_price_id,
        amount: found.amount,
        currency: found.currency,
        interval: found.interval as PriceInterval,
        interval_count: found.interval_count ?? 1,
        tax_behavior: (found.tax_behavior ?? 'exclusive') as TaxBehavior,
        billing_model: found.billing_model ?? 'per_seat',
        lookup_key: found.lookup_key ?? null,
        trial_period_days: found.trial_period_days ?? 0,
        nickname: found.nickname,
        is_default: found.is_default ?? false,
        active: found.active ?? true,
        created_at: found.created_at ?? new Date().toISOString(),
        updated_at: found.updated_at ?? new Date().toISOString(),
      };
    })(),
    prices_count: activePrices.length,
    availability_scope: 'global' as AvailabilityScope,
    assigned_tenants_count: 0,
    health_status: healthStatus,
    health_issues: healthIssues,
    metadata: null,
    created_at: row.created_at,
    updated_at: effectiveUpdatedAt(row.updated_at, row.stripe_last_synced_at),
    created_by: null,
    prices: prices.map(p => ({
      id: p.id,
      product_id: productId,
      stripe_price_id: p.stripe_price_id,
      amount: p.amount,
      currency: p.currency,
      interval: p.interval as PriceInterval,
      interval_count: p.interval_count ?? 1,
      tax_behavior: (p.tax_behavior ?? 'exclusive') as TaxBehavior,
      billing_model: p.billing_model ?? 'per_seat',
      lookup_key: p.lookup_key ?? null,
      trial_period_days: p.trial_period_days ?? 0,
      nickname: p.nickname,
      is_default: p.is_default ?? false,
      active: p.active ?? true,
      created_at: p.created_at ?? new Date().toISOString(),
      updated_at: p.updated_at ?? new Date().toISOString(),
    })),
    entitlements: [],
    dependencies: [],
    availability,
    lifecycle,
    publish_checklist: publishChecklist,
    recent_audit_events: await getRecentAuditEvents(productId, 10),
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

  // Use service role client to bypass RLS for admin operations
  const adminClient = createServiceRoleClient();

  // Fetch current product state for change tracking
  const { data: currentProduct, error: fetchError } = await adminClient
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (fetchError || !currentProduct) {
    console.error('[api/admin/products/[productId]] Product not found:', fetchError);
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Build update payload - include both original and new fields
  const updatePayload: Record<string, unknown> = {};
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Helper to track changes
  const trackChange = (field: string, newValue: unknown) => {
    const oldValue = (currentProduct as Record<string, unknown>)[field];
    if (oldValue !== newValue) {
      updatePayload[field] = newValue;
      changes[field] = { old: oldValue, new: newValue };
    }
  };

  // Original fields
  if (body.name !== undefined) trackChange('name', body.name);
  if (body.description !== undefined) trackChange('description', body.description);
  if (body.category !== undefined) {
    trackChange('category', body.category);
    // Keep is_bundle in sync with category (single source of truth)
    const newIsBundle = body.category === 'bundle';
    if (newIsBundle !== currentProduct.is_bundle) {
      trackChange('is_bundle', newIsBundle);
    }
  }
  if (body.product_key !== undefined) trackChange('product_key', body.product_key);
  
  // Customer-facing description (syncs to Stripe)
  if (body.customer_description !== undefined) {
    trackChange('customer_description', body.customer_description);
  }
  
  // Track if any Stripe-synced field is being changed
  const stripeFieldsChanged = 
    body.customer_description !== undefined ||
    body.unit_label !== undefined ||
    body.statement_descriptor !== undefined ||
    body.image_url !== undefined ||
    body.name !== undefined ||
    body.target_audience !== undefined ||
    body.feature_tier !== undefined ||
    body.min_seats !== undefined ||
    body.max_seats !== undefined;
  
  // Critical Stripe fields (Step 1)
  if (body.unit_label !== undefined) {
    const validLabels = ['seat', 'license', 'user'];
    if (!validLabels.includes(body.unit_label)) {
      return NextResponse.json({ error: 'Invalid unit_label. Must be seat, license, or user.' }, { status: 400 });
    }
    trackChange('unit_label', body.unit_label);
  }
  if (body.statement_descriptor !== undefined) {
    if (body.statement_descriptor && body.statement_descriptor.length > 22) {
      return NextResponse.json({ error: 'statement_descriptor max 22 characters' }, { status: 400 });
    }
    trackChange('statement_descriptor', body.statement_descriptor || null);
  }
  
  // Step 2: Product image
  if (body.image_url !== undefined) {
    if (body.image_url && !body.image_url.startsWith('https://')) {
      return NextResponse.json({ error: 'image_url must start with https://' }, { status: 400 });
    }
    trackChange('image_url', body.image_url || null);
  }
  
  // Step 3: Strategic fields
  if (body.target_audience !== undefined) {
    const validAudiences = ['all', 'schools', 'kindergartens', 'fritids', 'enterprise'];
    if (!validAudiences.includes(body.target_audience)) {
      return NextResponse.json({ error: 'Invalid target_audience' }, { status: 400 });
    }
    trackChange('target_audience', body.target_audience);
  }
  if (body.feature_tier !== undefined) {
    const validTiers = ['free', 'standard', 'premium', 'enterprise'];
    if (!validTiers.includes(body.feature_tier)) {
      return NextResponse.json({ error: 'Invalid feature_tier' }, { status: 400 });
    }
    trackChange('feature_tier', body.feature_tier);
  }
  if (body.min_seats !== undefined) {
    const minSeats = parseInt(body.min_seats, 10);
    if (isNaN(minSeats) || minSeats < 1) {
      return NextResponse.json({ error: 'min_seats must be >= 1' }, { status: 400 });
    }
    trackChange('min_seats', minSeats);
  }
  if (body.max_seats !== undefined) {
    const maxSeats = parseInt(body.max_seats, 10);
    if (isNaN(maxSeats) || maxSeats < 1) {
      return NextResponse.json({ error: 'max_seats must be >= 1' }, { status: 400 });
    }
    trackChange('max_seats', maxSeats);
  }

  // Only update if there are actual changes
  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ product: currentProduct, message: 'No changes' });
  }

  updatePayload.updated_at = new Date().toISOString();
  
  // Mark as needing sync if any Stripe-related field changed
  // Use 'unsynced' since that's the valid value per CHECK constraint
  if (stripeFieldsChanged) {
    updatePayload.stripe_sync_status = 'unsynced';
  }
  
  const { data, error } = await adminClient
    .from('products')
    .update(updatePayload)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('[api/admin/products/[productId]] Update error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }

  // Log audit event for field changes
  if (Object.keys(changes).length > 0) {
    await logFieldUpdates(productId, changes, user.id);
  }

  return NextResponse.json({ product: data });
}
