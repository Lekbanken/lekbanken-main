/**
 * Session Analytics API
 * 
 * GET /api/participants/sessions/[sessionId]/analytics
 * Fetches detailed analytics for a specific session
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const supabase = await createServerRlsClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get session and verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.host_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get all participants with their progress
    const { data: participants } = await supabase
      .from('participants')
      .select(`
        *,
        game_progress:participant_game_progress(*)
      `)
      .eq('session_id', sessionId);

    // Get all activity logs
    const { data: activityLogs } = await supabase
      .from('participant_activity_log')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get all achievement unlocks
    const { data: achievementUnlocks } = await supabase
      .from('participant_achievement_unlocks')
      .select('*')
      .eq('session_id', sessionId)
      .order('unlocked_at', { ascending: false });

    // Calculate statistics
    const stats = {
      total_participants: participants?.length || 0,
      active_participants: participants?.filter(p => p.status === 'active').length || 0,
      idle_participants: participants?.filter(p => p.status === 'idle').length || 0,
      disconnected_participants: participants?.filter(p => p.status === 'disconnected').length || 0,
      kicked_participants: participants?.filter(p => p.status === 'kicked').length || 0,
      blocked_participants: participants?.filter(p => p.status === 'blocked').length || 0,
      
      // Progress stats
      total_score: 0,
      average_score: 0,
      highest_score: 0,
      total_achievements: achievementUnlocks?.length || 0,
      unique_achievements: new Set(achievementUnlocks?.map(a => a.achievement_id)).size,
      
      // Time stats
      total_time_played: 0,
      average_time_per_participant: 0,
      
      // Activity stats
      total_events: activityLogs?.length || 0,
      event_breakdown: {} as Record<string, number>,
    };

    // Calculate progress stats
    participants?.forEach(participant => {
      if (participant.game_progress && Array.isArray(participant.game_progress)) {
        participant.game_progress.forEach((progress) => {
          const score = progress.score || 0;
          stats.total_score += score;
          stats.highest_score = Math.max(stats.highest_score, score);
          stats.total_time_played += progress.time_spent_seconds || 0;
        });
      }
    });

    if (stats.total_participants > 0) {
      stats.average_score = Math.round(stats.total_score / stats.total_participants);
      stats.average_time_per_participant = Math.round(stats.total_time_played / stats.total_participants);
    }

    // Event breakdown
    activityLogs?.forEach(log => {
      const eventType = log.event_type;
      stats.event_breakdown[eventType] = (stats.event_breakdown[eventType] || 0) + 1;
    });

    // Top performers
    const participantScores = participants?.map(p => {
      const gameProgress = (p.game_progress || []) as Array<{ score?: number | null; achievement_count?: number | null }>;
      const totalScore = gameProgress.reduce((sum, gp) => sum + (gp.score || 0), 0);
      const totalAchievements = gameProgress.reduce((sum, gp) => sum + (gp.achievement_count || 0), 0);
      
      return {
        participant_id: p.id,
        display_name: p.display_name,
        total_score: totalScore,
        total_achievements: totalAchievements,
        role: p.role,
        status: p.status,
      };
    }) || [];

    const topScorers = participantScores
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 5);

    const topAchievers = participantScores
      .sort((a, b) => b.total_achievements - a.total_achievements)
      .slice(0, 5);

    return NextResponse.json({
      session,
      stats,
      top_scorers: topScorers,
      top_achievers: topAchievers,
      participants: participants?.map(p => {
        const gameProgress = (p.game_progress || []) as Array<{ score?: number | null; achievement_count?: number | null }>;
        return {
          id: p.id,
          display_name: p.display_name,
          role: p.role,
          status: p.status,
          joined_at: p.joined_at,
          last_seen_at: p.last_seen_at,
          total_score: gameProgress.reduce((sum, gp) => sum + (gp.score || 0), 0),
          total_achievements: gameProgress.reduce((sum, gp) => sum + (gp.achievement_count || 0), 0),
        };
      }),
      recent_activity: activityLogs?.slice(0, 20),
      recent_achievements: achievementUnlocks?.slice(0, 20),
    });

  } catch (error) {
    console.error('Error in session analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
