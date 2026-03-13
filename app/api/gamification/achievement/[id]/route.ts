import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { assertTenantMembership } from '@/lib/planner/require-plan-access';

/**
 * GET /api/gamification/achievement/[id]
 * Fetch a specific achievement by ID with icon_config
 */
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ req, auth, params }) => {
    const { id } = params;
    const tenantId = req.nextUrl.searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    const user = auth!.user!;
    const supabase = await createServerRlsClient();

    // JOUR-004: Validate tenant membership — tenantId from query must be validated
    const tenantCheck = await assertTenantMembership(supabase, user, tenantId);
    if (!tenantCheck.allowed) return tenantCheck.response;

    // JOUR-005: Add tenant filter — only show global or tenant-specific achievements
    const { data: achievement, error } = await supabase
      .from('achievements')
      .select('id, name, description, icon_config')
      .eq('id', id)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .single();

    if (error || !achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    // Fetch user's unlock status
    const { data: userAchievement } = await supabase
      .from('user_achievements')
      .select('unlocked_at')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('achievement_id', id)
      .single();

    return NextResponse.json({
      achievement: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon_config: achievement.icon_config,
        status: userAchievement ? 'unlocked' : 'locked',
        unlockedAt: userAchievement?.unlocked_at,
      },
    });
  },
});
