import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logGamificationEventV1 } from '@/lib/services/gamification-events.server';

type SessionStatus = 'draft' | 'lobby' | 'active' | 'paused' | 'locked' | 'ended' | 'archived' | 'cancelled';

async function broadcastPlayEvent(sessionId: string, event: unknown) {
  try {
    const supabase = await createServiceRoleClient();
    const channel = supabase.channel(`play:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'play_event',
      payload: event,
    });
  } catch (error) {
    // Best-effort: do not fail the request if realtime broadcast fails.
    console.warn('[play/sessions/[id]] Failed to broadcast play event:', error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session, error } = await supabase
    .from('participant_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.host_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      sessionCode: session.session_code,
      displayName: session.display_name,
      status: session.status,
      participantCount: session.participant_count,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      startedAt: session.started_at,
      pausedAt: session.paused_at,
      endedAt: session.ended_at,
      gameId: session.game_id,
      planId: session.plan_id,
      settings: session.settings,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = (body?.action || '').toString();

  const { data: session, error } = await supabase
    .from('participant_sessions')
    .select('id, host_user_id, status, tenant_id, game_id, plan_id, started_at')
    .eq('id', id)
    .single();

  if (error || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.host_user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let nextStatus: SessionStatus | null = null;
  if (action === 'publish') nextStatus = 'lobby';  // draft → lobby (open for participants)
  if (action === 'unpublish') nextStatus = 'draft'; // lobby → draft (take offline)
  if (action === 'start' || action === 'resume') nextStatus = 'active';
  if (action === 'pause') nextStatus = 'paused';
  if (action === 'end') nextStatus = 'ended';
  if (action === 'lock') nextStatus = 'locked';
  if (action === 'unlock') nextStatus = 'active';

  if (!nextStatus) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const shouldSetStartedAt = action === 'start' && !session.started_at;
  const { error: updateError } = await supabase
    .from('participant_sessions')
    .update({
      status: nextStatus,
      started_at: shouldSetStartedAt ? new Date().toISOString() : session.started_at,
      paused_at: nextStatus === 'paused' ? new Date().toISOString() : null,
      ended_at: nextStatus === 'ended' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }

  if (nextStatus === 'ended') {
    try {
      await logGamificationEventV1({
        tenantId: (session.tenant_id as string | null) ?? null,
        actorUserId: user.id,
        eventType: 'session_completed',
        source: 'play',
        idempotencyKey: `participant_session:${id}:ended`,
        metadata: {
          participantSessionId: id,
          gameId: (session.game_id as string | null) ?? null,
          planId: (session.plan_id as string | null) ?? null,
        },
      })
    } catch (e) {
      console.warn('[play/sessions/[id]] gamification event log failed', e)
    }
  }

  // Broadcast status change for immediate participant UI updates.
  await broadcastPlayEvent(id, {
    type: 'state_change',
    payload: {
      status: nextStatus,
    },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, status: nextStatus });
}
