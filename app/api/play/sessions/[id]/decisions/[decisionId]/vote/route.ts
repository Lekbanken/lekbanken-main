import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
    console.warn('[play/sessions/[id]/decisions/[decisionId]/vote] Failed to broadcast play event:', error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; decisionId: string }> }
) {
  const { id: sessionId, decisionId } = await params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);

  const token = request.headers.get('x-participant-token');
  if (!token) return jsonError('Unauthorized', 401);

  const service = await createServiceRoleClient();

  const { data: participant } = await service
    .from('participants')
    .select('id, token_expires_at')
    .eq('participant_token', token)
    .eq('session_id', sessionId)
    .single();

  if (!participant) return jsonError('Unauthorized', 401);
  if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
    return jsonError('Unauthorized', 401);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError('Invalid body', 400);

  const optionKey = typeof body.optionKey === 'string' ? body.optionKey.trim() : '';
  if (!optionKey) return jsonError('Missing optionKey', 400);

  const { data: decision, error: dErr } = await service
    .from('session_decisions')
    .select('id, session_id, status, options, max_choices')
    .eq('id', decisionId)
    .eq('session_id', sessionId)
    .single();

  if (dErr || !decision) return jsonError('Decision not found', 404);

  if ((decision.status as string) !== 'open') {
    return jsonError('Decision is not open', 409);
  }

  const maxChoices = (decision.max_choices as number | null) ?? 1;
  if (maxChoices !== 1) {
    // Multi-choice is future; keep API strict for MVP.
    return jsonError('Multi-choice is not supported yet', 400);
  }

  const options = (decision.options as Array<{ key?: string }> | null) ?? [];
  const valid = options.some((o) => o?.key === optionKey);
  if (!valid) return jsonError('Invalid optionKey', 400);

  // Enforce single-choice: clear previous votes for this decision + participant
  const participantId = participant.id as string;

  const { error: delErr } = await service
    .from('session_votes')
    .delete()
    .eq('decision_id', decisionId)
    .eq('participant_id', participantId);

  if (delErr) return jsonError('Failed to record vote', 500);

  const { error: insErr } = await service
    .from('session_votes')
    .insert({
      decision_id: decisionId,
      participant_id: participantId,
      option_key: optionKey,
      value: {},
    });

  if (insErr) return jsonError('Failed to record vote', 500);

  // Broadcast without participant identity
  await broadcastPlayEvent(sessionId, {
    type: 'decision_update',
    payload: { action: 'vote_cast', decision_id: decisionId },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
