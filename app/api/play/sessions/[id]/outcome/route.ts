import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type Viewer =
  | { type: 'host'; userId: string }
  | { type: 'participant'; participantId: string };

async function resolveViewer(sessionId: string, request: Request): Promise<Viewer | null> {
  const token = request.headers.get('x-participant-token');
  if (token) {
    const supabase = await createServiceRoleClient();
    const { data: participant } = await supabase
      .from('participants')
      .select('id, token_expires_at')
      .eq('participant_token', token)
      .eq('session_id', sessionId)
      .single();

    if (!participant) return null;
    if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) return null;

    return { type: 'participant', participantId: participant.id };
  }

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = await createServiceRoleClient();
  const { data: session } = await service
    .from('participant_sessions')
    .select('host_user_id')
    .eq('id', sessionId)
    .single();

  if (!session) return null;
  if (session.host_user_id !== user.id) return null;

  return { type: 'host', userId: user.id };
}

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
    console.warn('[play/sessions/[id]/outcome] Failed to broadcast play event:', error);
  }
}

type OutcomeBody =
  | { action: 'set'; title: string; body?: string | null; outcome_type?: string; related_decision_id?: string | null }
  | { action: 'reveal'; outcomeId: string }
  | { action: 'hide'; outcomeId: string };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);

  const viewer = await resolveViewer(sessionId, request);
  if (!viewer) return jsonError('Unauthorized', 401);

  const service = await createServiceRoleClient();
  const { data: outcomes, error } = await service
    .from('session_outcomes')
    .select('id, session_id, title, body, outcome_type, related_decision_id, revealed_at, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) return jsonError('Failed to load outcomes', 500);

  if (viewer.type === 'host') {
    return NextResponse.json({ outcomes: outcomes ?? [] }, { status: 200 });
  }

  const visible = (outcomes ?? []).filter((o) => Boolean(o.revealed_at));
  return NextResponse.json({ outcomes: visible }, { status: 200 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can manage outcomes', 403);

  const body = (await request.json().catch(() => null)) as OutcomeBody | null;
  if (!body || typeof body !== 'object') return jsonError('Invalid body', 400);

  const service = await createServiceRoleClient();

  if (body.action === 'set') {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return jsonError('Missing title', 400);

    const outcomeType = typeof body.outcome_type === 'string' ? body.outcome_type : 'text';
    const outcomeBody = typeof body.body === 'string' ? body.body : null;

    const { data, error } = await service
      .from('session_outcomes')
      .insert({
        session_id: sessionId,
        title,
        body: outcomeBody,
        outcome_type: outcomeType,
        related_decision_id: body.related_decision_id ?? null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error || !data) return jsonError('Failed to create outcome', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'outcome_update',
      payload: { action: 'created', outcome_id: data.id },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  }

  if (body.action === 'reveal') {
    const { error } = await service
      .from('session_outcomes')
      .update({ revealed_at: new Date().toISOString() })
      .eq('id', body.outcomeId)
      .eq('session_id', sessionId);

    if (error) return jsonError('Failed to reveal outcome', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'outcome_update',
      payload: { action: 'revealed', outcome_id: body.outcomeId },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (body.action === 'hide') {
    const { error } = await service
      .from('session_outcomes')
      .update({ revealed_at: null })
      .eq('id', body.outcomeId)
      .eq('session_id', sessionId);

    if (error) return jsonError('Failed to hide outcome', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'outcome_update',
      payload: { action: 'hidden', outcome_id: body.outcomeId },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  return jsonError('Unknown action', 400);
}
