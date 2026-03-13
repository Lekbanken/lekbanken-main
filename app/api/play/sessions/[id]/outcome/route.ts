import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { resolveSessionViewer } from '@/lib/api/play-auth';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';
import { apiHandler } from '@/lib/api/route-handler';
import { assertSessionStatus } from '@/lib/play/session-guards';

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

type OutcomeBody =
  | { action: 'set'; title: string; body?: string | null; outcome_type?: string; related_decision_id?: string | null }
  | { action: 'reveal'; outcomeId: string }
  | { action: 'hide'; outcomeId: string };

export const GET = apiHandler({
  auth: 'public',
  handler: async ({ req, params }) => {
  const { id: sessionId } = params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const current = getCurrentStepPhase(session);

  const viewer = await resolveSessionViewer(sessionId, req);
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = await createServiceRoleClient();
  const { data: outcomes, error } = await service
    .from('session_outcomes')
    .select(
      'id, session_id, title, body, outcome_type, related_decision_id, revealed_at, step_index, phase_index, created_at'
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Failed to load outcomes' }, { status: 500 });

  if (viewer.type === 'host') {
    return NextResponse.json({ outcomes: outcomes ?? [] }, { status: 200 });
  }

  const visible = (outcomes ?? []).filter((o) => {
    if (!o.revealed_at) return false;
    const stepIndex = (o.step_index as number | null) ?? null;
    const phaseIndex = (o.phase_index as number | null) ?? null;
    return isUnlockedForPosition(stepIndex, phaseIndex, current);
  });
  return NextResponse.json({ outcomes: visible }, { status: 200 });
  },
});

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { id: sessionId } = params;
  const userId = auth!.user!.id;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.host_user_id !== userId) return NextResponse.json({ error: 'Only host can manage outcomes' }, { status: 403 });

  const statusError = assertSessionStatus(session.status, 'outcome');
  if (statusError) return statusError;

  const current = getCurrentStepPhase(session);

  const body = (await req.json().catch(() => null)) as OutcomeBody | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const service = await createServiceRoleClient();

  if (body.action === 'set') {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

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
        step_index: current.currentStep,
        phase_index: current.currentPhase,
        created_by: userId,
      })
      .select('id')
      .single();

    if (error || !data) return NextResponse.json({ error: 'Failed to create outcome' }, { status: 500 });

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

    if (error) return NextResponse.json({ error: 'Failed to reveal outcome' }, { status: 500 });

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

    if (error) return NextResponse.json({ error: 'Failed to hide outcome' }, { status: 500 });

    await broadcastPlayEvent(sessionId, {
      type: 'outcome_update',
      payload: { action: 'hidden', outcome_id: body.outcomeId },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  },
});

type OutcomePutBody = {
  id?: string;
  title: string;
  body?: string | null;
  outcome_type?: string;
  related_decision_id?: string | null;
  revealed?: boolean;
};

export const PUT = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { id: sessionId } = params;
  const userId = auth!.user!.id;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.host_user_id !== userId) return NextResponse.json({ error: 'Only host can manage outcomes' }, { status: 403 });

  const current = getCurrentStepPhase(session);

  const raw = (await req.json().catch(() => null)) as OutcomePutBody | null;
  if (!raw || typeof raw !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

  const outcomeType = typeof raw.outcome_type === 'string' ? raw.outcome_type : 'text';
  const outcomeBody = typeof raw.body === 'string' ? raw.body : null;
  const revealedAt = raw.revealed ? new Date().toISOString() : null;

  const service = await createServiceRoleClient();

  if (raw.id) {
    const { error } = await service
      .from('session_outcomes')
      .update({
        title,
        body: outcomeBody,
        outcome_type: outcomeType,
        related_decision_id: raw.related_decision_id ?? null,
        revealed_at: revealedAt,
      })
      .eq('id', raw.id)
      .eq('session_id', sessionId);

    if (error) return NextResponse.json({ error: 'Failed to update outcome' }, { status: 500 });

    await broadcastPlayEvent(sessionId, {
      type: 'outcome_update',
      payload: { action: 'updated', outcome_id: raw.id },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: raw.id }, { status: 200 });
  }

  const { data, error } = await service
    .from('session_outcomes')
    .insert({
      session_id: sessionId,
      title,
      body: outcomeBody,
      outcome_type: outcomeType,
      related_decision_id: raw.related_decision_id ?? null,
      revealed_at: revealedAt,
      step_index: current.currentStep,
      phase_index: current.currentPhase,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Failed to create outcome' }, { status: 500 });

  await broadcastPlayEvent(sessionId, {
    type: 'outcome_update',
    payload: { action: 'created', outcome_id: data.id },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  },
});
