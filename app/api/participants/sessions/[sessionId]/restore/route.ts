/**
 * Session Restore API
 * 
 * POST /api/participants/sessions/[sessionId]/restore
 * Restores an archived session back to its original status
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

    // Check if session is archived
    if (session.status !== 'archived') {
      return NextResponse.json(
        { error: 'Only archived sessions can be restored' },
        { status: 400 }
      );
    }

    // Determine restore status based on ended_at
    // If session was ended, restore to 'ended', otherwise 'cancelled'
    const restoreStatus = session.ended_at ? 'ended' : 'cancelled';

    // Restore session
    const { data: updated, error: updateError } = await supabase
      .from('participant_sessions')
      .update({
        status: restoreStatus,
        archived_at: null,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error restoring session:', updateError);
      return NextResponse.json(
        { error: 'Failed to restore session' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('participant_activity_log').insert({
      tenant_id: session.tenant_id,
      session_id: sessionId,
      participant_id: null,
      event_type: 'session_restored',
      event_data: {
        restored_at: new Date().toISOString(),
        previous_status: 'archived',
        new_status: restoreStatus,
        reason: 'Manual restore',
      },
    });

    return NextResponse.json({
      success: true,
      session: updated,
      restored_status: restoreStatus,
      message: 'Session restored successfully',
    });

  } catch (error) {
    console.error('Error in session restore:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
