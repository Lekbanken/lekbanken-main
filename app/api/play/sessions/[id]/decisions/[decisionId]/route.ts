import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
  const keys = new Set(options.map((o) => o.key));
  if (keys.size !== options.length) return null;
  return options;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; decisionId: string }> }
) {
  const { id: sessionId, decisionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can manage decisions', 403);

  const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!rawBody || typeof rawBody !== 'object') return jsonError('Invalid body', 400);

  const action = typeof rawBody.action === 'string' ? rawBody.action : null;
  const status = typeof rawBody.status === 'string' ? rawBody.status : null;

  const service = await createServiceRoleClient();

  const { data: existing, error: eErr } = await service
    .from('session_decisions')
    .select('id, status')
    .eq('id', decisionId)
    .eq('session_id', sessionId)
    .single();

  if (eErr || !existing) return jsonError('Decision not found', 404);

  const now = new Date().toISOString();

  // Compatibility:
  // - action-based: { action: 'open'|'close'|'reveal'|'update' }
  // - status-based: { status: 'open'|'closed'|'revealed'|'draft' }
  const desired = action ?? status;

  if (desired === 'open') {
    const { error } = await service
      .from('session_decisions')
      .update({ status: 'open', opened_at: now })
      .eq('id', decisionId)
      .eq('session_id', sessionId);

    if (error) return jsonError('Failed to open decision', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'decision_update',
      payload: { action: 'opened', decision_id: decisionId },
      timestamp: now,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (desired === 'close' || desired === 'closed') {
    const { error } = await service
      .from('session_decisions')
      .update({ status: 'closed', closed_at: now })
      .eq('id', decisionId)
      .eq('session_id', sessionId);

    if (error) return jsonError('Failed to close decision', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'decision_update',
      payload: { action: 'closed', decision_id: decisionId },
      timestamp: now,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (desired === 'reveal' || desired === 'revealed') {
    const { error } = await service
      .from('session_decisions')
      .update({ status: 'revealed', revealed_at: now })
      .eq('id', decisionId)
      .eq('session_id', sessionId);

    if (error) return jsonError('Failed to reveal decision', 500);

    await broadcastPlayEvent(sessionId, {
      type: 'decision_update',
      payload: { action: 'revealed', decision_id: decisionId },
      timestamp: now,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  // Default: treat as partial update.
  const patch: Record<string, unknown> = {};
  if (typeof rawBody.title === 'string') patch.title = rawBody.title.trim();
  if (typeof rawBody.prompt === 'string') patch.prompt = rawBody.prompt.trim();

  if (rawBody.options !== undefined) {
    const options = parseOptions(rawBody.options);
    if (!options || options.length < 2) return jsonError('Invalid options', 400);
    patch.options = options;
  }

  if (typeof rawBody.allow_anonymous === 'boolean') patch.allow_anonymous = rawBody.allow_anonymous;
  if (typeof rawBody.max_choices === 'number') patch.max_choices = Math.max(1, Math.floor(rawBody.max_choices));

  if (Object.keys(patch).length === 0) {
    return jsonError('No changes', 400);
  }

  const { error } = await service
    .from('session_decisions')
    .update(patch)
    .eq('id', decisionId)
    .eq('session_id', sessionId);

  if (error) return jsonError('Failed to update decision', 500);

  await broadcastPlayEvent(sessionId, {
    type: 'decision_update',
    payload: { action: 'updated', decision_id: decisionId },
    timestamp: now,
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
