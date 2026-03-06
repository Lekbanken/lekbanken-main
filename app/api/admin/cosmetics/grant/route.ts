import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { grantSchema } from '@/lib/journey/cosmetic-schemas';

/**
 * POST /api/admin/cosmetics/grant — Grant a cosmetic to a specific user.
 * System-admin only. Logs the reason.
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
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { cosmeticId, userId, reason: _reason } = parsed.data;
  const supabase = await createServiceRoleClient();

  // Verify cosmetic exists and is active
  const { data: cosmetic, error: cosmeticError } = await supabase
    .from('cosmetics')
    .select('id, key')
    .eq('id', cosmeticId)
    .single();

  if (cosmeticError || !cosmetic) {
    return NextResponse.json({ error: 'Cosmetic not found' }, { status: 404 });
  }

  // Verify user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Upsert — idempotent grant (ON CONFLICT do nothing equivalent)
  const { data: granted, error: grantError } = await supabase
    .from('user_cosmetics')
    .upsert(
      {
        user_id: userId,
        cosmetic_id: cosmeticId,
        unlock_type: 'manual',
      },
      { onConflict: 'user_id,cosmetic_id' },
    )
    .select()
    .single();

  if (grantError || !granted) {
    return NextResponse.json({ error: grantError?.message ?? 'Grant failed' }, { status: 500 });
  }

  return NextResponse.json({
    grant: granted,
    message: `Cosmetic "${cosmetic.key}" granted to user ${user.email ?? userId}.`,
  }, { status: 201 });
}
