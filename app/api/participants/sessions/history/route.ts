/**
 * Session History API
 * 
 * GET /api/participants/sessions/history
 * Fetches all sessions for the authenticated user with filtering and pagination
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerRlsClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // active, paused, locked, ended, cancelled, archived
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'created_at'; // created_at, ended_at, participant_count
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc, desc

    // Build query
    let query = supabase
      .from('participant_sessions')
      .select(`
        *,
        participants:participants(count)
      `, { count: 'exact' })
      .eq('host_user_id', user.id);

    // Filter by status
    if (status && ['active', 'paused', 'locked', 'ended', 'cancelled', 'archived'].includes(status)) {
      query = query.eq('status', status as 'active' | 'paused' | 'locked' | 'ended' | 'cancelled' | 'archived');
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: sessions, error: sessionsError, count } = await query;

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    // Enrich with participant counts and stats
    const enrichedSessions = await Promise.all(
      (sessions || []).map(async (session) => {
        // Get participant count by status
        const { data: participants } = await supabase
          .from('participants')
          .select('status')
          .eq('session_id', session.id);

        const statusCounts = {
          active: 0,
          idle: 0,
          disconnected: 0,
          kicked: 0,
          blocked: 0,
        };

        participants?.forEach(p => {
          statusCounts[p.status as keyof typeof statusCounts]++;
        });

        // Get total score and achievements
        const { data: progressData } = await supabase
          .from('participant_game_progress')
          .select('score, achievement_count')
          .eq('session_id', session.id);

        const totalScore = progressData?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
        const totalAchievements = progressData?.reduce((sum, p) => sum + (p.achievement_count || 0), 0) || 0;

        return {
          ...session,
          participant_counts: statusCounts,
          total_participants: participants?.length || 0,
          total_score: totalScore,
          total_achievements: totalAchievements,
        };
      })
    );

    return NextResponse.json({
      sessions: enrichedSessions,
      total_count: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Error in session history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
