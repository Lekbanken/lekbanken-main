import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import {
  cosmeticUpdateSchema,
  validateRenderConfig,
} from '@/lib/journey/cosmetic-schemas';
import type { Json } from '@/types/supabase';

/**
 * PUT /api/admin/cosmetics/:id — Update an existing cosmetic.
 * System-admin only. Validates render_config if render_type is provided.
 */
export const PUT = apiHandler({
  auth: 'system_admin',
  input: cosmeticUpdateSchema,
  handler: async ({ body, params }) => {
    const { id } = params;

    const { renderType, renderConfig, factionId, nameKey, descriptionKey, isActive, sortOrder, requiredLevel, ...rest } = body;

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

    // Upsert or delete level-based unlock rule if requiredLevel was provided
    if (requiredLevel !== undefined) {
      // Delete existing level rules for this cosmetic
      await supabase
        .from('cosmetic_unlock_rules')
        .delete()
        .eq('cosmetic_id', id)
        .eq('unlock_type', 'level');

      // Insert new rule if level is set
      if (requiredLevel !== null) {
        await supabase
          .from('cosmetic_unlock_rules')
          .insert({
            cosmetic_id: id,
            unlock_type: 'level',
            unlock_config: { required_level: requiredLevel },
          });
      }
    }

    return NextResponse.json({ cosmetic: data });
  },
});

/**
 * DELETE /api/admin/cosmetics/:id — Soft-delete (deactivate) a cosmetic.
 * System-admin only. Sets is_active = false.
 */
export const DELETE = apiHandler({
  auth: 'system_admin',
  handler: async ({ params }) => {
    const { id } = params;
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
  },
});
