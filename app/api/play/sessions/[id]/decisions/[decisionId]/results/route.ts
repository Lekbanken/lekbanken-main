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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; decisionId: string }> }
) {
  const { id: sessionId, decisionId } = await params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);

  const viewer = await resolveViewer(sessionId, request);
  if (!viewer) return jsonError('Unauthorized', 401);

  const service = await createServiceRoleClient();

  const { data: decision, error: dErr } = await service
    .from('session_decisions')
    .select('id, session_id, title, status, options, revealed_at')
    .eq('id', decisionId)
    .eq('session_id', sessionId)
    .single();

  if (dErr || !decision) return jsonError('Decision not found', 404);

  if (viewer.type === 'participant') {
    if (!decision.revealed_at && (decision.status as string) !== 'revealed') {
      return jsonError('Results not revealed', 403);
    }
  }

  const options = (decision.options as Array<{ key?: string; label?: string }> | null) ?? [];
  const counts: Record<string, number> = {};
  for (const opt of options) {
    if (opt?.key) counts[opt.key] = 0;
  }

  const { data: votes, error: vErr } = await service
    .from('session_votes')
    .select('option_key')
    .eq('decision_id', decisionId);

  if (vErr) return jsonError('Failed to load votes', 500);

  for (const v of votes ?? []) {
    const key = v.option_key as string;
    if (counts[key] !== undefined) counts[key] += 1;
  }

  const results = options.map((o) => ({
    key: o.key,
    label: o.label,
    count: counts[o.key ?? ''] ?? 0,
  }));

  return NextResponse.json(
    {
      decision: {
        id: decision.id,
        title: decision.title,
        status: decision.status,
        revealed_at: decision.revealed_at,
      },
      results,
    },
    { status: 200 }
  );
}
