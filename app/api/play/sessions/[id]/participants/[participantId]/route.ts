import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { PlayBroadcastEvent } from '@/types/play-runtime';

type ParticipantAction = 'kick' | 'block' | 'setNextStarter' | 'setPosition';

async function broadcastPlayEvent(sessionId: string, event: PlayBroadcastEvent) {
  try {
    const realtime = await createServiceRoleClient();
    const channel = realtime.channel(`play:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'play_event',
      payload: event,
    });
  } catch (err) {
    console.warn('[participants action] broadcast failed (best-effort):', err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const { id: sessionId, participantId } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is the host of this session
  const { data: session } = await supabase
    .from('participant_sessions')
    .select('host_user_id, status')
    .eq('id', sessionId)
    .single();

  if (!session || session.host_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as ParticipantAction;

  if (!action) {
    return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'kick': {
        const { error } = await supabase
          .from('participants')
          .update({ status: 'kicked' })
          .eq('id', participantId)
          .eq('session_id', sessionId);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Participant kicked' });
      }

      case 'block': {
        const { error } = await supabase
          .from('participants')
          .update({ status: 'blocked' })
          .eq('id', participantId)
          .eq('session_id', sessionId);

        if (error) throw error;
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

        // Set the new next starter
        const { data: participant } = await supabase
          .from('participants')
          .select('progress')
          .eq('id', participantId)
          .single();

        const currentProgress = (participant?.progress as Record<string, unknown>) || {};
        const { error } = await supabase
          .from('participants')
          .update({ progress: { ...currentProgress, isNextStarter: true } })
          .eq('id', participantId)
          .eq('session_id', sessionId);

        if (error) throw error;

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
}
