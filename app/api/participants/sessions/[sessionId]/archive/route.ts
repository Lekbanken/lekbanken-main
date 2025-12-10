/**
 * Session Archive API
 * 
 * POST /api/participants/sessions/[sessionId]/archive
 * Manually archives a session (ended or cancelled sessions only)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(
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

    // Check if session can be archived (only ended or cancelled sessions)
    if (session.status !== 'ended' && session.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Only ended or cancelled sessions can be archived' },
        { status: 400 }
      );
    }

    // Archive session
    const archivedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('participant_sessions')
      .update({
        status: 'archived',
        archived_at: archivedAt,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error archiving session:', updateError);
      return NextResponse.json(
        { error: 'Failed to archive session' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('participant_activity_log').insert({
      tenant_id: session.tenant_id,
      session_id: sessionId,
      participant_id: null,
      event_type: 'session_archived',
      event_data: {
        archived_at: archivedAt,
        previous_status: session.status,
        reason: 'Manual archive',
      },
    });

    return NextResponse.json({
      success: true,
      session: updated,
      archived_at: archivedAt,
      message: 'Session archived successfully',
    });

  } catch (error) {
    console.error('Error in session archival:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
