import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { applySessionCommand, type SessionCommandType } from '@/lib/play/session-command';

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
  const { id } = params;
  const userId = auth!.user!.id;

  const supabase = await createServerRlsClient();
  const { data: session, error } = await supabase
    .from('participant_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.host_user_id !== userId) {
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
  },
});

export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { id } = params;
  const userId = auth!.user!.id;

  const supabase = await createServerRlsClient();
  const body = await req.json().catch(() => ({}));
  const action = (body?.action || '').toString();

  // Verify host ownership before delegating to pipeline
  const { data: session, error } = await supabase
    .from('participant_sessions')
    .select('id, host_user_id')
    .eq('id', id)
    .single();

  if (error || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.host_user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Map legacy action to command type — 'resume' maps to 'resume' in the pipeline
  const validActions = new Set(['publish', 'unpublish', 'start', 'pause', 'resume', 'end', 'lock', 'unlock']);
  if (!validActions.has(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Delegate to the command pipeline (state machine + side effects + broadcast)
  const result = await applySessionCommand({
    sessionId: id,
    issuedBy: userId,
    commandType: action as SessionCommandType,
    payload: {},
    clientId: 'legacy-patch',
    clientSeq: Date.now(),
  });

  if (!result.success) {
    // State machine rejection → 409 Conflict
    if (result.error?.startsWith('Cannot ') || result.error?.startsWith('Conflict:')) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ error: result.error || 'Failed to update status' }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: result.state?.status ?? action });
  },
});
