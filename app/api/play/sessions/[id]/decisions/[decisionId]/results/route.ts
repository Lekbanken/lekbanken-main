import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { resolveSessionViewer } from '@/lib/api/play-auth';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; decisionId: string }> }
) {
  const { id: sessionId, decisionId } = await params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);

  const current = getCurrentStepPhase(session);

  const viewer = await resolveSessionViewer(sessionId, request);
  if (!viewer) return jsonError('Unauthorized', 401);

  const service = await createServiceRoleClient();

  const { data: decision, error: dErr } = await service
    .from('session_decisions')
    .select('id, session_id, title, status, options, revealed_at, step_index, phase_index')
    .eq('id', decisionId)
    .eq('session_id', sessionId)
    .single();

  if (dErr || !decision) return jsonError('Decision not found', 404);

  if (viewer.type === 'participant') {
    if (!decision.revealed_at && (decision.status as string) !== 'revealed') {
      return jsonError('Results not revealed', 403);
    }

    const stepIndex = (decision.step_index as number | null) ?? null;
    const phaseIndex = (decision.phase_index as number | null) ?? null;
    if (!isUnlockedForPosition(stepIndex, phaseIndex, current)) {
      return jsonError('Results not available yet', 403);
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
