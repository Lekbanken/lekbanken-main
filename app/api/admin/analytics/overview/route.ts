import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import type { DashboardOverview, SessionSummary } from '@/types/analytics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/overview
 * Fetch dashboard overview stats
 * 
 * @requires system_admin role
 */
export async function GET() {
  // Authentication check
  const authClient = await createServerRlsClient();
  const { data: { user }, error: userError } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check - only system_admin can view global analytics
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  // Use service role for cross-tenant queries
  const supabase = createServiceRoleClient();

  // Total games
  const { count: totalGames } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true });

  // Total sessions
  const { count: totalSessions } = await supabase
    .from('participant_sessions')
    .select('*', { count: 'exact', head: true });

  // Active sessions
  const { count: activeSessions } = await supabase
    .from('participant_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Total participants
  const { count: totalParticipants } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true });

  // Recent sessions
  const { data: recentSessionsData } = await supabase
    .from('participant_sessions')
    .select(`
      id,
      created_at,
      started_at,
      ended_at,
      status
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get participant counts for recent sessions
  const recentSessions: SessionSummary[] = [];
  for (const session of recentSessionsData || []) {
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);

    recentSessions.push({
      session_id: session.id,
      created_at: session.created_at,
      started_at: session.started_at,
      ended_at: session.ended_at,
      participant_count: count || 0,
      status: session.status as 'pending' | 'active' | 'ended',
    });
  }

  // Popular games (most sessions)
  const { data: popularGamesData } = await supabase
    .from('participant_sessions')
    .select('game_id, games!inner(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  const gameSessionCounts: Record<string, { game_id: string; game_name: string; count: number }> = {};
  for (const session of popularGamesData || []) {
    const gameId = session.game_id;
    if (!gameId) continue;
    const gameName = (session.games as { name: string } | null)?.name || 'Okänt spel';
    if (!gameSessionCounts[gameId]) {
      gameSessionCounts[gameId] = { game_id: gameId, game_name: gameName, count: 0 };
    }
    gameSessionCounts[gameId].count++;
  }

  const popularGames = Object.values(gameSessionCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(g => ({ game_id: g.game_id, game_name: g.game_name, session_count: g.count }));

  const overview: DashboardOverview = {
    total_games: totalGames || 0,
    total_sessions: totalSessions || 0,
    active_sessions: activeSessions || 0,
    total_participants: totalParticipants || 0,
    recent_sessions: recentSessions,
    popular_games: popularGames,
  };

  return NextResponse.json(overview);
}
