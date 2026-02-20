import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { resolveSessionViewer } from '@/lib/api/play-auth';

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
    console.warn('[play/sessions/[id]/decisions] Failed to broadcast play event:', error);
  }
}

type DecisionOption = { key: string; label: string };

function parseOptions(value: unknown): DecisionOption[] | null {
  if (!Array.isArray(value)) return null;
  const options: DecisionOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const rec = item as Record<string, unknown>;
    if (typeof rec.key !== 'string' || !rec.key.trim()) return null;
    if (typeof rec.label !== 'string' || !rec.label.trim()) return null;
    options.push({ key: rec.key.trim(), label: rec.label.trim() });
  }
  // keys must be unique
  const keys = new Set(options.map((o) => o.key));
  if (keys.size !== options.length) return null;
  return options;
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

  // current step == item step
  if (typeof itemPhase !== 'number') return true;
  return current.currentPhase >= itemPhase;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);

  const current = getCurrentStepPhase(session);

  const viewer = await resolveSessionViewer(sessionId, request);
  if (!viewer) return jsonError('Unauthorized', 401);

  const service = await createServiceRoleClient();

  const { data: decisions, error } = await service
    .from('session_decisions')
    .select(
      'id, session_id, title, prompt, decision_type, options, status, allow_anonymous, max_choices, opened_at, closed_at, revealed_at, step_index, phase_index, created_at, updated_at'
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) return jsonError('Failed to load decisions', 500);

  if (viewer.type === 'host') {
    return NextResponse.json({ decisions: decisions ?? [] }, { status: 200 });
  }

  const visible = (decisions ?? []).filter((d) => {
    const status = d.status as string;
    if (!(status === 'open' || status === 'revealed')) return false;

    const stepIndex = (d.step_index as number | null) ?? null;
    const phaseIndex = (d.phase_index as number | null) ?? null;
    return isUnlockedForPosition(stepIndex, phaseIndex, current);
  });

  return NextResponse.json({ decisions: visible }, { status: 200 });
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
  if (session.host_user_id !== user.id) return jsonError('Only host can manage decisions', 403);

  const current = getCurrentStepPhase(session);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError('Invalid body', 400);

  const action = typeof body.action === 'string' ? body.action : null;
  if (!action) return jsonError('Missing action', 400);

  const service = await createServiceRoleClient();

  if (action === 'create') {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return jsonError('Missing title', 400);

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : null;
    const options = parseOptions(body.options);
    if (!options || options.length < 2) return jsonError('Invalid options', 400);

    const allowAnonymous = Boolean(body.allow_anonymous);
    const maxChoices = typeof body.max_choices === 'number' ? Math.max(1, Math.floor(body.max_choices)) : 1;

    const { data, error } = await service
      .from('session_decisions')
      .insert({
        session_id: sessionId,
        title,
        prompt,
        decision_type: 'single_choice',
        options,
        status: 'draft',
        allow_anonymous: allowAnonymous,
        max_choices: maxChoices,
        step_index: current.currentStep,
        phase_index: current.currentPhase,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error || !data) return jsonError('Failed to create decision', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'decision_update',
      payload: { action: 'created', decision_id: data.id },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  }

  const decisionId = typeof body.decisionId === 'string' ? body.decisionId : null;
  if (!decisionId) return jsonError('Missing decisionId', 400);

  const { data: existing, error: eErr } = await service
    .from('session_decisions')
    .select('id, status')
    .eq('id', decisionId)
    .eq('session_id', sessionId)
    .single();

  if (eErr || !existing) return jsonError('Decision not found', 404);

  if (action === 'update') {
    const patch: Record<string, unknown> = {};
    if (typeof body.title === 'string') patch.title = body.title.trim();
    if (typeof body.prompt === 'string') patch.prompt = body.prompt.trim();
    if (body.options !== undefined) {
      const options = parseOptions(body.options);
      if (!options || options.length < 2) return jsonError('Invalid options', 400);
      patch.options = options;
    }
    if (typeof body.allow_anonymous === 'boolean') patch.allow_anonymous = body.allow_anonymous;
    if (typeof body.max_choices === 'number') patch.max_choices = Math.max(1, Math.floor(body.max_choices));

    const { error } = await service
      .from('session_decisions')
      .update(patch)
      .eq('id', decisionId)
      .eq('session_id', sessionId);

    if (error) return jsonError('Failed to update decision', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'decision_update',
      payload: { action: 'updated', decision_id: decisionId },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (action === 'open') {
    const { error } = await service
      .from('session_decisions')
      .update({ status: 'open', opened_at: new Date().toISOString() })
      .eq('id', decisionId)
      .eq('session_id', sessionId);

    if (error) return jsonError('Failed to open decision', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'decision_update',
      payload: { action: 'opened', decision_id: decisionId },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (action === 'close') {
    const { error } = await service
      .from('session_decisions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', decisionId)
      .eq('session_id', sessionId);

    if (error) return jsonError('Failed to close decision', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'decision_update',
      payload: { action: 'closed', decision_id: decisionId },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (action === 'reveal') {
    const { error } = await service
      .from('session_decisions')
      .update({ status: 'revealed', revealed_at: new Date().toISOString() })
      .eq('id', decisionId)
      .eq('session_id', sessionId);

    if (error) return jsonError('Failed to reveal decision', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'decision_update',
      payload: { action: 'revealed', decision_id: decisionId },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  return jsonError('Unknown action', 400);
}
