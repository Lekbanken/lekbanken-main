/**
 * Session Export API
 * 
 * GET /api/participants/sessions/[sessionId]/export
 * Exports session data as CSV
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

    const exportType = request.nextUrl.searchParams.get('type') || 'participants';

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

    let csv = '';

    if (exportType === 'participants') {
      // Export participant data
      const { data: participants } = await supabase
        .from('participants')
        .select(`
          *,
          game_progress:participant_game_progress(*)
        `)
        .eq('session_id', sessionId);

      // CSV header
      csv = 'Display Name,role,Status,Joined At,Last Seen At,Total Score,Total Achievements,Games Played\n';

      // CSV rows
      participants?.forEach(p => {
        const totalScore = p.game_progress?.reduce((sum: number, gp) => sum + (gp.score || 0), 0) || 0;
        const totalAchievements = p.game_progress?.reduce((sum: number, gp) => sum + (gp.achievement_count || 0), 0) || 0;
        const gamesPlayed = p.game_progress?.length || 0;

        csv += `"${p.display_name}","${p.role}","${p.status}","${p.joined_at}","${p.last_seen_at || 'N/A'}",${totalScore},${totalAchievements},${gamesPlayed}\n`;
      });

    } else if (exportType === 'activity') {
      // Export activity log
      const { data: activityLogs } = await supabase
        .from('participant_activity_log')
        .select(`
          *,
          participant:participants(display_name)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      // CSV header
      csv = 'Timestamp,Participant,Event Type,Event Data\n';

      // CSV rows
      activityLogs?.forEach(log => {
        const participantName = (log.participant as { display_name?: string } | null)?.display_name || 'Unknown';
        const eventData = JSON.stringify(log.event_data || {}).replace(/"/g, '""');
        
        csv += `"${log.created_at}","${participantName}","${log.event_type}","${eventData}"\n`;
      });

    } else if (exportType === 'achievements') {
      // Export achievement unlocks
      const { data: unlocks } = await supabase
        .from('participant_achievement_unlocks')
        .select(`
          *,
          participant:participants(display_name)
        `)
        .eq('session_id', sessionId)
        .order('unlocked_at', { ascending: true });

      // CSV header
      csv = 'Timestamp,Participant,Achievement Name,Points,Rarity,Context\n';

      // CSV rows
      unlocks?.forEach(unlock => {
        const participantName = (unlock.participant as { display_name?: string } | null)?.display_name || 'Unknown';
        const context = JSON.stringify(unlock.unlock_context || {}).replace(/"/g, '""');
        
        csv += `"${unlock.unlocked_at}","${participantName}","${unlock.achievement_name}",${unlock.achievement_points || 0},"${unlock.rarity || 'N/A'}","${context}"\n`;
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid export type. Use: participants, activity, or achievements' },
        { status: 400 }
      );
    }

    // Return CSV with appropriate headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="session_${session.session_code}_${exportType}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error in session export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
