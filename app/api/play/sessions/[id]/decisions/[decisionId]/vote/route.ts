import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';
import { assertSessionStatus } from '@/lib/play/session-guards';
import { apiHandler } from '@/lib/api/route-handler';
import { requireActiveParticipant } from '@/lib/api/play-auth';

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

export const POST = apiHandler({
  auth: 'participant',
  handler: async ({ req, participant: p, params }) => {
    const sessionId = params.id;
    const decisionId = params.decisionId;

    // Verify participant belongs to this session
    if (p!.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // BUG-083 FIX: idle participants must not vote
    const activeGuard = requireActiveParticipant(p!.status);
    if (activeGuard) return activeGuard;

    const session = await ParticipantSessionService.getSessionById(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const statusError = assertSessionStatus(session.status, 'vote');
    if (statusError) return statusError;

    const current = getCurrentStepPhase(session);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const optionKey = typeof body.optionKey === 'string' ? body.optionKey.trim() : '';
    if (!optionKey) return NextResponse.json({ error: 'Missing optionKey' }, { status: 400 });

    const service = await createServiceRoleClient();

    const { data: decision, error: dErr } = await service
    .from('session_decisions')
    .select('id, session_id, status, options, max_choices, step_index, phase_index')
    .eq('id', decisionId)
    .eq('session_id', sessionId)
    .single();

  if (dErr || !decision) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });

  if ((decision.status as string) !== 'open') {
    return NextResponse.json({ error: 'Decision is not open' }, { status: 409 });
  }

  const stepIndex = (decision.step_index as number | null) ?? null;
  const phaseIndex = (decision.phase_index as number | null) ?? null;
  if (!isUnlockedForPosition(stepIndex, phaseIndex, current)) {
    return NextResponse.json({ error: 'Decision is not available yet' }, { status: 403 });
  }

  const maxChoices = (decision.max_choices as number | null) ?? 1;
  if (maxChoices !== 1) {
    // Multi-choice is future; keep API strict for MVP.
    return NextResponse.json({ error: 'Multi-choice is not supported yet' }, { status: 400 });
  }

  const options = (decision.options as Array<{ key?: string }> | null) ?? [];
  const valid = options.some((o) => o?.key === optionKey);
  if (!valid) return NextResponse.json({ error: 'Invalid optionKey' }, { status: 400 });

  // Enforce single-choice: clear previous votes for this decision + participant
  const participantId = p!.participantId;

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

  if (upsertErr) return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });

  // Broadcast without participant identity
  await broadcastPlayEvent(sessionId, {
    type: 'decision_update',
    payload: { action: 'vote_cast', decision_id: decisionId },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true }, { status: 200 });
  },
});
