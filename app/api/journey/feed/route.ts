import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { JourneyActivity, JourneyFeed } from '@/features/journey/types';

export const dynamic = 'force-dynamic';

function parseLimit(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 20;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

function asIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');
  const limit = parseLimit(url.searchParams.get('limit'));

  const supabase = await createServerRlsClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // Query a little more than limit per source then merge-sort.
  const perSource = Math.min(50, Math.max(10, limit));

  const [txRes, uaRes, sessionsRes, planProgRes] = await Promise.all([
    supabase
      .from('coin_transactions')
      .select('id,type,amount,description,created_at')
      .eq('user_id', userId)
      .lt('created_at', cursor ?? new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(perSource),
    supabase
      .from('user_achievements')
      .select('id,achievement_id,unlocked_at')
      .eq('user_id', userId)
      .lt('unlocked_at', cursor ?? new Date().toISOString())
      .order('unlocked_at', { ascending: false })
      .limit(perSource),
    supabase
      .from('game_sessions')
      .select('id,game_id,score,duration_seconds,ended_at,started_at')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .lt('ended_at', cursor ?? new Date().toISOString())
      .order('ended_at', { ascending: false })
      .limit(perSource),
    supabase
      .from('plan_play_progress')
      .select('id,plan_id,updated_at')
      .eq('user_id', userId)
      .lt('updated_at', cursor ?? new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(perSource),
  ]);

  // Map achievements names
  const achievementIds = (uaRes.data ?? []).map((r) => r.achievement_id).filter(Boolean) as string[];
  const uniqueAchievementIds = Array.from(new Set(achievementIds));
  const achievementsById = new Map<string, { name?: string | null }>();
  if (uniqueAchievementIds.length > 0) {
    const achievementsRes = await supabase.from('achievements').select('id,name').in('id', uniqueAchievementIds);
    for (const row of achievementsRes.data ?? []) {
      achievementsById.set(row.id as string, { name: (row as { name?: string | null }).name ?? null });
    }
  }

  // Map games names
  const gameIds = (sessionsRes.data ?? []).map((r) => r.game_id).filter(Boolean) as string[];
  const uniqueGameIds = Array.from(new Set(gameIds));
  const gamesById = new Map<string, { name?: string | null }>();
  if (uniqueGameIds.length > 0) {
    const gamesRes = await supabase.from('games').select('id,name').in('id', uniqueGameIds);
    for (const row of gamesRes.data ?? []) {
      gamesById.set(row.id as string, { name: (row as { name?: string | null }).name ?? null });
    }
  }

  // Map plans names
  const planIds = (planProgRes.data ?? []).map((r) => r.plan_id).filter(Boolean) as string[];
  const uniquePlanIds = Array.from(new Set(planIds));
  const plansById = new Map<string, { name?: string | null }>();
  if (uniquePlanIds.length > 0) {
    const plansRes = await supabase.from('plans').select('id,name').in('id', uniquePlanIds);
    for (const row of plansRes.data ?? []) {
      plansById.set(row.id as string, { name: (row as { name?: string | null }).name ?? null });
    }
  }

  const items: JourneyActivity[] = [];

  for (const t of txRes.data ?? []) {
    const occurredAt = asIso(t.created_at) ?? new Date().toISOString();
    const type = t.type === 'spend' ? 'coin_spent' : 'coin_earned';
    const amount = (t.amount ?? 0) as number;
    items.push({
      id: `tx:${t.id}`,
      type,
      occurredAt,
      title: type === 'coin_spent' ? `Spenderade ${amount} mynt` : `Tjänade ${amount} mynt`,
      description: t.description ?? undefined,
      href: '/app/gamification',
      meta: { amount },
    });
  }

  for (const ua of uaRes.data ?? []) {
    const occurredAt = asIso(ua.unlocked_at) ?? new Date().toISOString();
    const name = achievementsById.get(ua.achievement_id)?.name ?? 'Ny prestation';
    items.push({
      id: `ach:${ua.id}`,
      type: 'achievement_unlocked',
      occurredAt,
      title: `Upplåste: ${name}`,
      href: '/app/profile/achievements',
      meta: { achievementId: ua.achievement_id },
    });
  }

  for (const s of sessionsRes.data ?? []) {
    const occurredAt = asIso(s.ended_at) ?? asIso(s.started_at) ?? new Date().toISOString();
    const gameName = gamesById.get(s.game_id)?.name ?? 'Lek';
    items.push({
      id: `session:${s.id}`,
      type: 'session_completed',
      occurredAt,
      title: `Spelade: ${gameName}`,
      description: typeof s.score === 'number' ? `Poäng: ${s.score}` : undefined,
      href: '/app/play',
      meta: { gameId: s.game_id, score: s.score, durationSeconds: s.duration_seconds },
    });
  }

  for (const p of planProgRes.data ?? []) {
    const occurredAt = asIso(p.updated_at) ?? new Date().toISOString();
    const planName = plansById.get(p.plan_id)?.name ?? 'Plan';
    items.push({
      id: `plan:${p.id}`,
      type: 'plan_progressed',
      occurredAt,
      title: `Fortsatte plan: ${planName}`,
      href: `/app/planner/${p.plan_id}`,
      meta: { planId: p.plan_id },
    });
  }

  items.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));
  const sliced = items.slice(0, limit);

  const nextCursor = sliced.length > 0 ? sliced[sliced.length - 1].occurredAt : undefined;
  const payload: JourneyFeed = { items: sliced, nextCursor };

  return NextResponse.json(payload, { status: 200 });
}
