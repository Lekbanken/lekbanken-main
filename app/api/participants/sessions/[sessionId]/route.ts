/**
 * Session Permanent Delete API
 * 
 * DELETE /api/participants/sessions/[sessionId]
 * Permanently deletes an archived session and all related data
 * WARNING: This action cannot be undone!
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get session
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

    // Only allow deletion of archived sessions
    if (session.status !== 'archived') {
      return NextResponse.json(
        { error: 'Only archived sessions can be permanently deleted' },
        { status: 400 }
      );
    }

    // Optional: Check if session has been archived for minimum period (e.g., 30 days)
    if (session.archived_at) {
      const archivedDate = new Date(session.archived_at);
      const daysSinceArchived = (Date.now() - archivedDate.getTime()) / (1000 * 60 * 60 * 24);
      const minimumArchiveDays = 7; // Configurable minimum archive period

      if (daysSinceArchived < minimumArchiveDays) {
        return NextResponse.json(
          { 
            error: `Session must be archived for at least ${minimumArchiveDays} days before permanent deletion`,
            days_remaining: Math.ceil(minimumArchiveDays - daysSinceArchived),
          },
          { status: 400 }
        );
      }
    }

    // Log final activity before deletion (for audit trail backup)
    await supabase.from('participant_activity_log').insert({
      tenant_id: session.tenant_id,
      session_id: sessionId,
      participant_id: null,
      event_type: 'session_deleted',
      event_data: {
        deleted_at: new Date().toISOString(),
        session_code: session.session_code,
        created_at: session.created_at,
        ended_at: session.ended_at,
        archived_at: session.archived_at,
        reason: 'Permanent deletion',
      },
    });

    // Delete related data (cascading deletes should handle this, but being explicit)
    // Note: activity_log is intentionally kept for audit trail
    
    // Delete game progress and achievements
    await supabase
      .from('participant_achievement_unlocks')
      .delete()
      .eq('session_id', sessionId);

    await supabase
      .from('participant_game_progress')
      .delete()
      .eq('session_id', sessionId);

    // Delete participants
    await supabase
      .from('participants')
      .delete()
      .eq('session_id', sessionId);

    // Finally, delete the session itself
    const { error: deleteError } = await supabase
      .from('participant_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Error deleting session:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_at: new Date().toISOString(),
      message: 'Session permanently deleted',
      note: 'Activity logs have been preserved for audit trail',
    });

  } catch (error) {
    console.error('Error in session deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
