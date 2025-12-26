/**
 * Session Triggers API
 * 
 * GET: List session triggers with current status
 * POST: Snapshot triggers from game_triggers to session_triggers
 * PATCH: Update trigger status (fire, disable, arm)
 * 
 * Host-only endpoint.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function broadcastPlayEvent(sessionId: string, event: unknown) {
  try {
    const supabase = await createServiceRoleClient();
    await supabase.channel(`play:${sessionId}`).send({
      type: 'broadcast',
      event: 'play_event',
      payload: event,
    });
  } catch (err) {
    console.error('[broadcastPlayEvent] Failed:', err);
  }
}

/**
 * GET /api/play/sessions/[id]/triggers
 * Returns all session triggers with their current status.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can view triggers', 403);

  const service = await createServiceRoleClient() as SupabaseAny;

  const { data: triggers, error } = await service
    .from('session_triggers')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true });

  if (error) return jsonError('Failed to load triggers', 500);

  return NextResponse.json({ triggers: triggers ?? [] });
}

/**
 * POST /api/play/sessions/[id]/triggers
 * Snapshot game_triggers → session_triggers for this session.
 * Idempotent: if triggers already exist, returns 409.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can snapshot triggers', 403);
  if (!session.game_id) return jsonError('Session has no associated game', 400);

  const service = await createServiceRoleClient() as SupabaseAny;

  // Prevent double-snapshot
  const { data: existing } = await service
    .from('session_triggers')
    .select('id')
    .eq('session_id', sessionId)
    .limit(1);

  if ((existing ?? []).length > 0) {
    return jsonError('Triggers already snapshotted for this session', 409);
  }

  // Fetch enabled game triggers
  const { data: gameTriggers, error: gtErr } = await service
    .from('game_triggers')
    .select('*')
    .eq('game_id', session.game_id)
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  if (gtErr) return jsonError('Failed to load game triggers', 500);

  if (!gameTriggers || gameTriggers.length === 0) {
    return NextResponse.json({ success: true, triggers: 0 }, { status: 201 });
  }

  // Create session_triggers copies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const triggerInserts = (gameTriggers as any[]).map((t: any) => ({
    session_id: sessionId,
    source_trigger_id: t.id,
    name: t.name,
    description: t.description,
    enabled: true,
    condition: t.condition,
    actions: t.actions,
    execute_once: t.execute_once,
    delay_seconds: t.delay_seconds,
    sort_order: t.sort_order,
    status: 'armed' as const,
    fired_count: 0,
  }));

  const { data: insertedTriggers, error: itErr } = await service
    .from('session_triggers')
    .insert(triggerInserts)
    .select('id, name, status');

  if (itErr) return jsonError('Failed to snapshot triggers', 500);

  await broadcastPlayEvent(sessionId, {
    type: 'trigger_update',
    payload: { action: 'snapshot', count: insertedTriggers?.length ?? 0 },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      success: true,
      triggers: insertedTriggers?.length ?? 0,
    },
    { status: 201 }
  );
}

/**
 * PATCH /api/play/sessions/[id]/triggers
 * Update a specific trigger's status.
 * Body: { triggerId: string, action: 'fire' | 'disable' | 'arm' }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can update triggers', 403);

  const body = await request.json().catch(() => ({}));
  const triggerId = body?.triggerId as string | undefined;
  const action = body?.action as 'fire' | 'disable' | 'arm' | undefined;

  if (!triggerId || !action) {
    return jsonError('triggerId and action are required', 400);
  }

  if (!['fire', 'disable', 'arm'].includes(action)) {
    return jsonError('Invalid action. Must be fire, disable, or arm', 400);
  }

  const service = await createServiceRoleClient() as SupabaseAny;

  // Get current trigger
  const { data: trigger, error: tErr } = await service
    .from('session_triggers')
    .select('*')
    .eq('id', triggerId)
    .eq('session_id', sessionId)
    .single();

  if (tErr || !trigger) return jsonError('Trigger not found', 404);

  // Determine new status
  let newStatus: 'armed' | 'fired' | 'disabled';
  let firedAt: string | null = trigger.fired_at;
  let firedCount = trigger.fired_count ?? 0;

  switch (action) {
    case 'fire':
      newStatus = 'fired';
      firedAt = new Date().toISOString();
      firedCount += 1;
      break;
    case 'disable':
      newStatus = 'disabled';
      break;
    case 'arm':
      newStatus = 'armed';
      break;
  }

  // Update trigger
  const { error: updateErr } = await service
    .from('session_triggers')
    .update({
      status: newStatus,
      fired_at: firedAt,
      fired_count: firedCount,
    })
    .eq('id', triggerId);

  if (updateErr) return jsonError('Failed to update trigger', 500);

  await broadcastPlayEvent(sessionId, {
    type: 'trigger_update',
    payload: {
      action,
      triggerId,
      name: trigger.name,
      newStatus,
    },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    trigger: {
      id: triggerId,
      status: newStatus,
      firedAt,
      firedCount,
    },
  });
}
