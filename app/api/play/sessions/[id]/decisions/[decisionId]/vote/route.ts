import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { resolveParticipant } from '@/lib/api/play-auth';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getCurrentStepPhase(session: {
  current_step_index?: number | null;
  current_phase_index?: number | null;
}) {
  const currentStep = typeof session.current_step_index === 'number' ? session.current_step_index : 0;
  const currentPhase = typeof session.current_phase_index === 'number' ? session.current_phase_index : 0;
  return { currentStep, currentPhase };
}

function isUnlockedForPosition(
  itemStep: number | null | undefined,
  itemPhase: number | null | undefined,
  current: { currentStep: number; currentPhase: number }
) {
  if (typeof itemStep !== 'number') return true;
  if (current.currentStep > itemStep) return true;
  if (current.currentStep < itemStep) return false;
  if (typeof itemPhase !== 'number') return true;
  return current.currentPhase >= itemPhase;
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

  const current = getCurrentStepPhase(session);

  const resolved = await resolveParticipant(request, sessionId);
  if (!resolved) return jsonError('Unauthorized', 401);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError('Invalid body', 400);

  const optionKey = typeof body.optionKey === 'string' ? body.optionKey.trim() : '';
  if (!optionKey) return jsonError('Missing optionKey', 400);

  const service = await createServiceRoleClient();

  const { data: decision, error: dErr } = await service
    .from('session_decisions')
    .select('id, session_id, status, options, max_choices, step_index, phase_index')
    .eq('id', decisionId)
    .eq('session_id', sessionId)
    .single();

  if (dErr || !decision) return jsonError('Decision not found', 404);

  if ((decision.status as string) !== 'open') {
    return jsonError('Decision is not open', 409);
  }

  const stepIndex = (decision.step_index as number | null) ?? null;
  const phaseIndex = (decision.phase_index as number | null) ?? null;
  if (!isUnlockedForPosition(stepIndex, phaseIndex, current)) {
    return jsonError('Decision is not available yet', 403);
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
  const participantId = resolved.participantId;

  const { error: upsertErr } = await service
    .from('session_votes')
    .upsert(
      {
        decision_id: decisionId,
        participant_id: participantId,
        option_key: optionKey,
        value: {},
      },
      {
        onConflict: 'decision_id,participant_id',
      }
    );

  if (upsertErr) return jsonError('Failed to record vote', 500);

  // Broadcast without participant identity
  await broadcastPlayEvent(sessionId, {
    type: 'decision_update',
    payload: { action: 'vote_cast', decision_id: decisionId },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
