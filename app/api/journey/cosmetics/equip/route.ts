import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { COSMETIC_SLOTS, type CosmeticSlot } from '@/features/journey/cosmetic-types';

export const dynamic = 'force-dynamic';

const VALID_SLOTS = new Set<string>(COSMETIC_SLOTS);

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, req }) => {
    const userId = auth!.user!.id;
    const supabase = await createServerRlsClient();

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

  const { slot, cosmeticId } = body as { slot?: string; cosmeticId?: string | null };

  if (!slot || !VALID_SLOTS.has(slot)) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
  }

  const typedSlot = slot as CosmeticSlot;

  // ── Unequip ──
  if (cosmeticId === null || cosmeticId === undefined) {
    const { error } = await supabase
      .from('user_cosmetic_loadout')
      .delete()
      .eq('user_id', userId)
      .eq('slot', typedSlot);

    if (error) {
      return NextResponse.json({ error: 'Failed to unequip' }, { status: 500 });
    }
    return NextResponse.json({ success: true, slot: typedSlot, cosmeticId: null }, { status: 200 });
  }

  // ── Equip ──
  // Validate cosmeticId is a non-empty string (basic UUID shape check)
  if (typeof cosmeticId !== 'string' || cosmeticId.length < 10) {
    return NextResponse.json({ error: 'Invalid cosmeticId' }, { status: 400 });
  }

  // 1. Verify cosmetic exists and category matches slot
  const { data: cosmetic, error: cosmeticError } = await supabase
    .from('cosmetics')
    .select('id,category')
    .eq('id', cosmeticId)
    .eq('is_active', true)
    .maybeSingle();

  if (cosmeticError || !cosmetic) {
    return NextResponse.json({ error: 'Cosmetic not found' }, { status: 404 });
  }

  if (cosmetic.category !== typedSlot) {
    return NextResponse.json({ error: 'Cosmetic category does not match slot' }, { status: 400 });
  }

  // 2. Verify user has access: explicit grant OR dynamic level eligibility
  const { data: ownership } = await supabase
    .from('user_cosmetics')
    .select('id')
    .eq('user_id', userId)
    .eq('cosmetic_id', cosmeticId)
    .maybeSingle();

  if (!ownership) {
    // No explicit grant — check dynamic level eligibility
    const [ruleRes, levelRes] = await Promise.all([
      supabase
        .from('cosmetic_unlock_rules')
        .select('unlock_config')
        .eq('cosmetic_id', cosmeticId)
        .eq('unlock_type', 'level')
        .limit(1),
      supabase
        .from('user_progress')
        .select('level')
        .eq('user_id', userId)
        .order('level', { ascending: false })
        .limit(1),
    ]);

    const config = (ruleRes.data?.[0]?.unlock_config ?? {}) as Record<string, unknown>;
    const requiredLevel = Number(config.required_level ?? 0);
    const userLevel = levelRes.data?.[0]?.level ?? 0;

    if (!requiredLevel || userLevel < requiredLevel) {
      return NextResponse.json({ error: 'You do not own this cosmetic' }, { status: 403 });
    }
  }

  // 3. Upsert loadout — RLS loadout_insert policy also validates ownership as defense-in-depth
  const { error: upsertError } = await supabase
    .from('user_cosmetic_loadout')
    .upsert(
      { user_id: userId, slot: typedSlot, cosmetic_id: cosmeticId },
      { onConflict: 'user_id,slot' },
    );

  if (upsertError) {
    console.error('[equip] Loadout upsert failed:', upsertError.message);
    return NextResponse.json({ error: 'Failed to equip cosmetic' }, { status: 500 });
  }

  return NextResponse.json({ success: true, slot: typedSlot, cosmeticId }, { status: 200 });
  },
})
