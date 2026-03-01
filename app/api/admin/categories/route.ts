/**
 * GET  /api/admin/categories — list all categories (admin)
 * POST /api/admin/categories — create a new category
 * PATCH /api/admin/categories — update a single category by id
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { slugify } from '@/lib/media/templateKey';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------
// Helper: validate bundle_product_id (shared by POST + PATCH)
// ---------------------------------------------------------------------------

type BundleResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; serverError?: boolean };

async function validateBundleProductId(
  supabase: Awaited<ReturnType<typeof createServerRlsClient>>,
  value: unknown,
): Promise<BundleResult> {
  if (value === undefined || value === null) return { ok: true, id: null };

  const trimmed = String(value).trim();
  if (trimmed.length === 0) return { ok: true, id: null };

  if (!UUID_RE.test(trimmed)) {
    return { ok: false, error: 'bundle_product_id must be a valid UUID' };
  }

  const { data: product, error: queryError } = await supabase
    .from('products')
    .select('id, status, is_bundle')
    .eq('id', trimmed)
    .maybeSingle();

  if (queryError) {
    console.error('[admin/categories] bundle lookup failed', {
      bundle_product_id: trimmed,
      code: queryError.code,
      message: queryError.message,
    });
    return { ok: false, error: 'Failed to validate bundle_product_id', serverError: true };
  }

  if (!product) return { ok: false, error: 'bundle_product_id does not match any product' };
  if (product.status !== 'active') return { ok: false, error: 'bundle product is not active' };
  if (!product.is_bundle) return { ok: false, error: 'product is not a bundle product' };

  return { ok: true, id: trimmed };
}

// ---------------------------------------------------------------------------
// GET — list all categories with product counts
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createServerRlsClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all categories (including non-public) + product counts
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[admin/categories] list error', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }

  // Product counts per category_slug
  const { data: products } = await supabase
    .from('products')
    .select('category_slug')
    .eq('status', 'active');

  const countBySlug = new Map<string, number>();
  for (const p of products ?? []) {
    if (p.category_slug) {
      countBySlug.set(p.category_slug, (countBySlug.get(p.category_slug) ?? 0) + 1);
    }
  }

  const result = (categories ?? []).map((c) => ({
    ...c,
    product_count: countBySlug.get(c.slug) ?? 0,
  }));

  return NextResponse.json({ categories: result });
}

// ---------------------------------------------------------------------------
// POST — create a new category
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const supabase = await createServerRlsClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // ── Validate name (required) ──────────────────────────────────────────────
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // ── Slug: use provided or generate from name ─────────────────────────────
  const slugWasProvided = typeof body.slug === 'string' && body.slug.trim().length > 0;
  let slug: string;
  if (slugWasProvided) {
    slug = body.slug.trim().toLowerCase();
  } else {
    slug = slugify(name);
  }
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      {
        error: slugWasProvided
          ? 'slug must be lowercase alphanumeric with dashes (e.g. "my-category")'
          : 'Unable to derive a valid slug from the provided name',
      },
      { status: 400 },
    );
  }

  // ── Optional fields ───────────────────────────────────────────────────────
  const description_short =
    typeof body.description_short === 'string' && body.description_short.trim().length > 0
      ? body.description_short.trim()
      : null;

  const icon_key =
    typeof body.icon_key === 'string' && body.icon_key.trim().length > 0
      ? body.icon_key.trim()
      : null;

  const sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;

  const is_public = typeof body.is_public === 'boolean' ? body.is_public : true;

  // ── bundle_product_id: validate via shared helper ──────────────────────
  const bundleResult = await validateBundleProductId(supabase, body.bundle_product_id);
  if (!bundleResult.ok) {
    return NextResponse.json(
      { error: bundleResult.error },
      { status: bundleResult.serverError ? 500 : 400 },
    );
  }
  const bundle_product_id = bundleResult.id;

  // ── Insert (use service role to bypass RLS) ───────────────────────────────
  const adminClient = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from('categories')
    .insert({
      slug,
      name,
      description_short,
      icon_key,
      sort_order,
      is_public,
      bundle_product_id,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('[admin/categories] create failed', { slug, code: error.code, message: error.message, details: error.details });

    // 23505 = unique_violation (slug already exists OR collision trigger)
    if (error.code === '23505') {
      const isCollision = error.message?.includes('collides with');
      return NextResponse.json(
        { error: isCollision ? error.message : `slug "${slug}" already exists` },
        { status: 409 },
      );
    }
    // 23503 = FK violation (race: bundle product changed between validation and insert)
    if (error.code === '23503') {
      return NextResponse.json({ error: 'bundle_product_id is no longer valid' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PATCH — update a single category
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  const supabase = await createServerRlsClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.id) {
    return NextResponse.json({ error: 'Missing category id' }, { status: 400 });
  }
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) {
    return NextResponse.json({ error: 'id must be a valid UUID' }, { status: 400 });
  }

  // Allowlist: only accept intended fields
  const ALLOWED_FIELDS = ['name', 'description_short', 'icon_key', 'sort_order', 'is_public', 'bundle_product_id'] as const;
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key];
  }

  const id = body.id as string;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  // Validate name is not empty if provided
  if (updates.name !== undefined && (!updates.name || String(updates.name).trim().length === 0)) {
    return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
  }

  // Sanitize sort_order: NaN → 0
  if (updates.sort_order !== undefined) {
    const n = Number(updates.sort_order);
    updates.sort_order = Number.isFinite(n) ? n : 0;
  }

  // Sanitize bundle_product_id: empty string → null, validate UUID format + existence
  if (updates.bundle_product_id !== undefined) {
    const bundleResult = await validateBundleProductId(supabase, updates.bundle_product_id);
    if (!bundleResult.ok) {
      return NextResponse.json(
        { error: bundleResult.error },
        { status: bundleResult.serverError ? 500 : 400 },
      );
    }
    updates.bundle_product_id = bundleResult.id;
  }

  // Use service role to bypass RLS for admin writes
  const adminClient = createServiceRoleClient();
  const { data, error } = await adminClient
    .from('categories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[admin/categories] patch failed', { categoryId: id, code: error.code, message: error.message, details: error.details });
    // PGRST116 = "JSON object requested, multiple (or no) rows returned" → id not found
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    // 23503 = FK violation (race: bundle product changed between validation and update)
    if (error.code === '23503') {
      return NextResponse.json({ error: 'bundle_product_id is no longer valid' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
