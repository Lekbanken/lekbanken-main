/**
 * Session Restore API
 * 
 * POST /api/participants/sessions/[sessionId]/restore
 * Restores an archived session back to its original status
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireSessionHost, AuthError } from '@/lib/api/auth-guard';

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

    // Auth: session host or system_admin
    await requireSessionHost(sessionId);

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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error in session restore:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
