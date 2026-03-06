import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  cosmeticCreateSchema,
  validateRenderConfig,
} from '@/lib/journey/cosmetic-schemas';
import type { Json } from '@/types/supabase';

/**
 * GET /api/admin/cosmetics — List all cosmetics with optional filters.
 * System-admin only.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSystemAdmin();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const factionId = url.searchParams.get('factionId');
  const rarity = url.searchParams.get('rarity');
  const search = url.searchParams.get('search');

  const supabase = await createServiceRoleClient();

  let query = supabase
    .from('cosmetics')
    .select('*, cosmetic_unlock_rules(id, unlock_type, unlock_config, priority)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (factionId) query = query.eq('faction_id', factionId);
  if (rarity) query = query.eq('rarity', rarity);
  if (search) query = query.ilike('key', `%${search}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cosmetics: data });
}

/**
 * POST /api/admin/cosmetics — Create a new cosmetic.
 * System-admin only. Validates render_config against render_type schema.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSystemAdmin();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const body = await req.json();
  const parsed = cosmeticCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { renderType, renderConfig, factionId, nameKey, descriptionKey, isActive, sortOrder, ...rest } = parsed.data;

  // Validate render_config against render_type-specific schema
  const configResult = validateRenderConfig(renderType, renderConfig);
  if (!configResult.success) {
    return NextResponse.json(
      { error: 'Invalid render_config', details: configResult.error },
      { status: 400 },
    );
  }

  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('cosmetics')
    .insert({
      ...rest,
      faction_id: factionId ?? null,
      name_key: nameKey,
      description_key: descriptionKey,
      render_type: renderType,
      render_config: configResult.data as Json,
      sort_order: sortOrder,
      is_active: isActive,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A cosmetic with this key already exists.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cosmetic: data }, { status: 201 });
}
