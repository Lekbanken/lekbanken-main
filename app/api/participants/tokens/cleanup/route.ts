/**
 * Token Cleanup API
 * 
 * POST /api/participants/tokens/cleanup
 * Background job to clean up expired tokens and disconnect inactive participants
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCronOrAdmin, AuthError } from '@/lib/api/auth-guard';

export async function POST() {
  try {
    // Auth: cron secret or system_admin
    await requireCronOrAdmin();

    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    // Get all participants with expired tokens in active/idle status
    const { data: expiredParticipants, error: fetchError } = await supabase
      .from('participants')
      .select('id, session_id, token_expires_at')
      .in('status', ['active', 'idle'])
      .lt('token_expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired participants:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch expired participants' },
        { status: 500 }
      );
    }

    const disconnectedCount = expiredParticipants?.length || 0;

    // Disconnect all expired participants
    if (expiredParticipants && expiredParticipants.length > 0) {
      const participantIds = expiredParticipants.map(p => p.id);

      const { error: updateError } = await supabase
        .from('participants')
        .update({
          status: 'disconnected',
          disconnected_at: now,
        })
        .in('id', participantIds);

      if (updateError) {
        console.error('Error updating participants:', updateError);
        return NextResponse.json(
          { error: 'Failed to disconnect participants' },
          { status: 500 }
        );
      }

      // Log disconnections
      const sessions = await supabase
        .from('participant_sessions')
        .select('id, tenant_id')
        .in('id', expiredParticipants.map(p => p.session_id));

      const sessionMap = new Map(sessions.data?.map(s => [s.id, s.tenant_id]));

      const activityLogs = expiredParticipants.map(p => ({
        tenant_id: sessionMap.get(p.session_id) || '',
        session_id: p.session_id,
        participant_id: p.id,
        event_type: 'token_expired',
        event_data: {
          expired_at: p.token_expires_at,
          reason: 'Token expired',
        },
      }));

      await supabase.from('participant_activity_log').insert(activityLogs);
    }

    // Clean up old ended/cancelled sessions (older than 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: oldSessions, error: oldSessionsError } = await supabase
      .from('participant_sessions')
      .select('id')
      .in('status', ['ended', 'cancelled'])
      .lt('ended_at', ninetyDaysAgo.toISOString())
      .is('archived_at', null);

    if (!oldSessionsError && oldSessions && oldSessions.length > 0) {
      const sessionIds = oldSessions.map(s => s.id);

      // Archive old sessions
      await supabase
        .from('participant_sessions')
        .update({
          status: 'archived',
          archived_at: now,
        })
        .in('id', sessionIds);
    }

    return NextResponse.json({
      success: true,
      disconnected_participants: disconnectedCount,
      archived_sessions: oldSessions?.length || 0,
      cleaned_at: now,
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error in token cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
