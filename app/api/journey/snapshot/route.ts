import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { JourneySnapshot } from '@/features/journey/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerRlsClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  const [coinsRes, streakRes, progressRes, totalAchievementsRes, unlockedRes] = await Promise.all([
    supabase
      .from('user_coins')
      .select('balance,tenant_id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_streaks')
      .select('current_streak_days,tenant_id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_progress')
      .select('level,current_xp,next_level_xp,tenant_id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('achievements').select('id', { count: 'exact', head: true }),
    supabase.from('user_achievements').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  // Prefer tenant_id from the most specific tables if present.
  const tenantId =
    (progressRes.data as { tenant_id?: string | null } | null)?.tenant_id ??
    (streakRes.data as { tenant_id?: string | null } | null)?.tenant_id ??
    (coinsRes.data as { tenant_id?: string | null } | null)?.tenant_id ??
    null;

  const snapshot: JourneySnapshot = {
    userId,
    tenantId,
    coinsBalance: (coinsRes.data as { balance?: number | null } | null)?.balance ?? null,
    streakDays: (streakRes.data as { current_streak_days?: number | null } | null)?.current_streak_days ?? null,
    level: (progressRes.data as { level?: number | null } | null)?.level ?? null,
    currentXp: (progressRes.data as { current_xp?: number | null } | null)?.current_xp ?? null,
    nextLevelXp: (progressRes.data as { next_level_xp?: number | null } | null)?.next_level_xp ?? null,
    totalAchievements: totalAchievementsRes.count ?? null,
    unlockedAchievements: unlockedRes.count ?? null,
  };

  return NextResponse.json(snapshot, { status: 200 });
}
