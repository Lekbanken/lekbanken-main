import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { grantSchema } from '@/lib/journey/cosmetic-schemas';
import { apiHandler } from '@/lib/api/route-handler';

export const POST = apiHandler({
  auth: 'system_admin',
  input: grantSchema,
  handler: async ({ body }) => {
    const { cosmeticId, userId, reason: _reason } = body;
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
  },
});
