import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';

/**
 * GET /api/gamification/achievement/[id]
 * Fetch a specific achievement by ID with icon_config
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantId = request.nextUrl.searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  const supabase = await createServerRlsClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch achievement with icon_config
  const { data: achievement, error } = await supabase
    .from('achievements')
    .select('id, name, description, icon_config')
    .eq('id', id)
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
}
