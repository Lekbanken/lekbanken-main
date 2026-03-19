import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';
import { apiHandler } from '@/lib/api/route-handler';
import { assertSessionStatus } from '@/lib/play/session-guards';

type ParticipantAction = 'kick' | 'block' | 'approve' | 'setNextStarter' | 'setPosition';

export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { id: sessionId, participantId } = params;
  const userId = auth!.user!.id;
  const supabase = await createServerRlsClient();

  // Verify user is the host of this session
  const { data: session } = await supabase
    .from('participant_sessions')
    .select('host_user_id, status')
    .eq('id', sessionId)
    .single();

  if (!session || session.host_user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const statusError = assertSessionStatus(session.status, 'kick-block');
  if (statusError) return statusError;

  const body = await req.json();
  const action = body.action as ParticipantAction;

  if (!action) {
    return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'approve': {
        // BUG-061: Only approve participants in 'idle' (pending approval) state
        // BUG-060: Use .select() to verify a row was actually updated
        const { data: approvedRows, error } = await supabase
          .from('participants')
          .update({ status: 'active' })
          .eq('id', participantId)
          .eq('session_id', sessionId)
          .eq('status', 'idle')
          .select('id');

        if (error) throw error;

        if (!approvedRows || approvedRows.length === 0) {
          return NextResponse.json(
            { error: 'Participant not found or not in pending state' },
            { status: 404 },
          );
        }

        await broadcastPlayEvent(sessionId, {
          type: 'participants_changed',
          payload: { action: 'approved', participant_id: participantId },
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, message: 'Participant approved' });
      }
      case 'kick': {
        // BUG-060: Use .select() to verify a row was actually updated
        const { data: kickedRows, error } = await supabase
          .from('participants')
          .update({ status: 'kicked' })
          .eq('id', participantId)
          .eq('session_id', sessionId)
          .select('id');

        if (error) throw error;

        if (!kickedRows || kickedRows.length === 0) {
          return NextResponse.json(
            { error: 'Participant not found' },
            { status: 404 },
          );
        }

        await broadcastPlayEvent(sessionId, {
          type: 'participants_changed',
          payload: { action: 'kicked', participant_id: participantId },
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, message: 'Participant kicked' });
      }

      case 'block': {
        // BUG-060: Use .select() to verify a row was actually updated
        const { data: blockedRows, error } = await supabase
          .from('participants')
          .update({ status: 'blocked' })
          .eq('id', participantId)
          .eq('session_id', sessionId)
          .select('id');

        if (error) throw error;

        if (!blockedRows || blockedRows.length === 0) {
          return NextResponse.json(
            { error: 'Participant not found' },
            { status: 404 },
          );
        }

        await broadcastPlayEvent(sessionId, {
          type: 'participants_changed',
          payload: { action: 'blocked', participant_id: participantId },
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, message: 'Participant blocked' });
      }

      case 'setNextStarter': {
        // TODO: Add is_next_starter column to participants table
        // For now, we'll store this in the progress JSON field
        
        // First, clear any existing next starter by updating all participants' progress
        const { data: allParticipants } = await supabase
          .from('participants')
          .select('id, progress')
          .eq('session_id', sessionId);
        
        if (allParticipants) {
          for (const p of allParticipants) {
            const progress = (p.progress as Record<string, unknown>) || {};
            if (progress.isNextStarter) {
              await supabase
                .from('participants')
                .update({ progress: { ...progress, isNextStarter: false } })
                .eq('id', p.id);
            }
          }
        }

        // BUG-085: Scope progress read by session_id to prevent cross-session leak
        const { data: participant } = await supabase
          .from('participants')
          .select('progress')
          .eq('id', participantId)
          .eq('session_id', sessionId)
          .single();

        if (!participant) {
          return NextResponse.json(
            { error: 'Participant not found' },
            { status: 404 },
          );
        }

        const currentProgress = (participant.progress as Record<string, unknown>) || {};
        // BUG-060: Use .select() to verify mutation + gate broadcast on real row
        const { data: starterRows, error } = await supabase
          .from('participants')
          .update({ progress: { ...currentProgress, isNextStarter: true } })
          .eq('id', participantId)
          .eq('session_id', sessionId)
          .select('id');

        if (error) throw error;

        if (!starterRows || starterRows.length === 0) {
          return NextResponse.json(
            { error: 'Participant not found' },
            { status: 404 },
          );
        }

        await broadcastPlayEvent(sessionId, {
          type: 'turn_update',
          payload: { next_starter_participant_id: participantId },
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, message: 'Next starter set' });
      }

      case 'setPosition': {
        const position = body.position as number;
        if (typeof position !== 'number' || position < 1) {
          return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }

        // Only allow setting position for ended sessions
        if (session.status !== 'ended') {
          return NextResponse.json(
            { error: 'Can only set position for ended sessions' },
            { status: 400 }
          );
        }

        // Store position in progress JSON field until we add a dedicated column
        const { data: participant } = await supabase
          .from('participants')
          .select('progress')
          .eq('id', participantId)
          .single();

        const currentProgress = (participant?.progress as Record<string, unknown>) || {};
        const { error } = await supabase
          .from('participants')
          .update({ progress: { ...currentProgress, position } })
          .eq('id', participantId)
          .eq('session_id', sessionId);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Position set' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Action failed', details: message }, { status: 500 });
  }
  },
})
