import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  cosmeticUpdateSchema,
  validateRenderConfig,
} from '@/lib/journey/cosmetic-schemas';
import type { Json } from '@/types/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/cosmetics/:id — Update an existing cosmetic.
 * System-admin only. Validates render_config if render_type is provided.
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await requireSystemAdmin();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const { id } = await context.params;

  const body = await req.json();
  const parsed = cosmeticUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { renderType, renderConfig, factionId, nameKey, descriptionKey, isActive, sortOrder, ...rest } = parsed.data;

  // If both renderType and renderConfig are provided, validate config against type
  if (renderType && renderConfig) {
    const configResult = validateRenderConfig(renderType, renderConfig);
    if (!configResult.success) {
      return NextResponse.json(
        { error: 'Invalid render_config', details: configResult.error },
        { status: 400 },
      );
    }
  }

  // Build DB update object — only include fields that were actually provided
  const updateData: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
  if (renderType !== undefined) updateData.render_type = renderType;
  if (renderConfig !== undefined) updateData.render_config = renderConfig as Json;
  if (factionId !== undefined) updateData.faction_id = factionId ?? null;
  if (nameKey !== undefined) updateData.name_key = nameKey;
  if (descriptionKey !== undefined) updateData.description_key = descriptionKey;
  if (isActive !== undefined) updateData.is_active = isActive;
  if (sortOrder !== undefined) updateData.sort_order = sortOrder;

  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('cosmetics')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Cosmetic not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cosmetic: data });
}

/**
 * DELETE /api/admin/cosmetics/:id — Soft-delete (deactivate) a cosmetic.
 * System-admin only. Sets is_active = false.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    await requireSystemAdmin();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  const { id } = await context.params;
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('cosmetics')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, is_active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Cosmetic not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cosmetic: data });
}
