import { type NextRequest, NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { COSMETIC_SLOTS, type CosmeticSlot } from '@/features/journey/cosmetic-types';

export const dynamic = 'force-dynamic';

const VALID_SLOTS = new Set<string>(COSMETIC_SLOTS);

export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
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

  // 2. Verify user owns the cosmetic (server-side ownership check)
  const { data: ownership, error: ownershipError } = await supabase
    .from('user_cosmetics')
    .select('id')
    .eq('user_id', userId)
    .eq('cosmetic_id', cosmeticId)
    .maybeSingle();

  if (ownershipError || !ownership) {
    return NextResponse.json({ error: 'You do not own this cosmetic' }, { status: 403 });
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
}
