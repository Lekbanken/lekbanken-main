import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { unlockRuleCreateSchema } from '@/lib/journey/cosmetic-schemas';
import type { Json } from '@/types/supabase';

/**
 * GET /api/admin/cosmetics/:id/rules — List unlock rules for a cosmetic.
 * System-admin only.
 */
export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ params }) => {
    const { id } = params;
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('cosmetic_unlock_rules')
      .select('*')
      .eq('cosmetic_id', id)
      .order('priority', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rules: data });
  },
});

/**
 * POST /api/admin/cosmetics/:id/rules — Add an unlock rule to a cosmetic.
 * System-admin only.
 */
export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ req, params }) => {
    const { id } = params;

    const body = await req.json();
    // Override cosmeticId from URL param
    const parsed = unlockRuleCreateSchema.safeParse({ ...body, cosmeticId: id });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = await createServiceRoleClient();

    // Verify the cosmetic exists
    const { data: cosmetic, error: cosmeticError } = await supabase
      .from('cosmetics')
      .select('id')
      .eq('id', id)
      .single();

    if (cosmeticError || !cosmetic) {
      return NextResponse.json({ error: 'Cosmetic not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('cosmetic_unlock_rules')
      .insert({
        cosmetic_id: id,
        unlock_type: parsed.data.unlockType,
        unlock_config: parsed.data.unlockConfig as Json,
        priority: parsed.data.priority,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rule: data }, { status: 201 });
  },
});

/**
 * DELETE /api/admin/cosmetics/:id/rules — Delete a specific unlock rule.
 * Expects ?ruleId=<uuid> query parameter.
 * System-admin only.
 */
export const DELETE = apiHandler({
  auth: 'system_admin',
  handler: async ({ req, params }) => {
    const { id } = params;
    const url = new URL(req.url);
    const ruleId = url.searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json({ error: 'ruleId query parameter required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    const { error } = await supabase
      .from('cosmetic_unlock_rules')
      .delete()
      .eq('id', ruleId)
      .eq('cosmetic_id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  },
});
