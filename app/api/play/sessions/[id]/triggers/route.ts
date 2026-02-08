/**
 * Session Triggers API (V2)
 * 
 * GET: List triggers with config from game_triggers + state from session_trigger_state
 * POST: DEPRECATED - returns 410 Gone (no snapshot needed in V2)
 * PATCH: Update trigger status (fire, disable, arm)
 * 
 * V2 Architecture:
 * - Config (condition, actions, execute_once, etc.) read from game_triggers
 * - Runtime state (status, fired_count, fired_at) stored in session_trigger_state
 * 
 * Host-only endpoint.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function broadcastPlayEvent(sessionId: string, event: unknown) {
  try {
    const supabase = createServiceRoleClient();
    await supabase.channel(`play:${sessionId}`).send({
      type: 'broadcast',
      event: 'play_event',
      payload: event,
    });
  } catch (err) {
    console.error('[broadcastPlayEvent] Failed:', err);
  }
}

// Types for V2
interface GameTriggerRow {
  id: string;
  name: string | null;
  description: string | null;
  enabled: boolean;
  condition: unknown;
  actions: unknown;
  execute_once: boolean;
  delay_seconds: number | null;
  sort_order: number | null;
}

interface TriggerStateRow {
  game_trigger_id: string;
  status: string;
  fired_count: number;
  fired_at: string | null;
}

/**
 * GET /api/play/sessions/[id]/triggers
 * V2: Returns triggers with config from game_triggers + state from session_trigger_state
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
  if (!session.game_id) return jsonError('Session has no associated game', 400);

  const service = createServiceRoleClient();

  // V2: Get game triggers (config)
  const { data: gameTriggers, error: gtErr } = await service
    .from('game_triggers')
    .select('id, name, description, enabled, condition, actions, execute_once, delay_seconds, sort_order')
    .eq('game_id', session.game_id)
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  if (gtErr) return jsonError('Failed to load triggers', 500);

  if (!gameTriggers || gameTriggers.length === 0) {
    return NextResponse.json({ triggers: [] });
  }

  const triggerIds = gameTriggers.map((t) => t.id);

  // V2: Get session trigger state (runtime state)
  const { data: triggerStates } = await service
    .from('session_trigger_state')
    .select('game_trigger_id, status, fired_count, fired_at')
    .eq('session_id', sessionId)
    .in('game_trigger_id', triggerIds);

  const stateMap = new Map<string, TriggerStateRow>();
  for (const s of (triggerStates ?? []) as TriggerStateRow[]) {
    stateMap.set(s.game_trigger_id, s);
  }

  // Combine config + state
  const triggers = (gameTriggers as GameTriggerRow[]).map((t) => {
    const state = stateMap.get(t.id);
    return {
      // Use game_trigger.id as the trigger ID
      id: t.id,
      session_id: sessionId, // For backward compatibility
      source_trigger_id: t.id, // For backward compatibility
      name: t.name,
      description: t.description,
      enabled: t.enabled, // enabled comes from game_triggers only
      condition: t.condition,
      actions: t.actions,
      execute_once: t.execute_once,
      delay_seconds: t.delay_seconds,
      sort_order: t.sort_order,
      // Runtime state (defaults if no state record exists)
      status: state?.status ?? 'armed',
      fired_count: state?.fired_count ?? 0,
      fired_at: state?.fired_at ?? null,
    };
  });

  return NextResponse.json({ triggers });
}

/**
 * POST /api/play/sessions/[id]/triggers
 * V2: DEPRECATED - Snapshot is no longer needed.
 * Triggers are read directly from game_triggers with state from session_trigger_state.
 */
export async function POST(_request: Request, { params: _params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json(
    {
      deprecated: true,
      message: 'Trigger snapshot is deprecated in V2. Triggers are now read directly from game configuration.',
      migration: 'Remove snapshot calls from your client code. GET now returns triggers directly.',
    },
    { status: 410 }
  );
}

/**
 * RPC result type for fire_trigger_v2_safe
 */
interface FireTriggerRpcResult {
  ok: boolean;
  status: 'fired' | 'noop' | 'error';
  reason: string | null;
  replay: boolean;
  fired_count: number;
  fired_at: string | null;
  original_fired_at: string | null;
}

/**
 * PATCH /api/play/sessions/[id]/triggers
 * V2.1: Update trigger status with atomic guards.
 * 
 * For action='fire':
 * - Requires X-Idempotency-Key header
 * - Uses fire_trigger_v2_safe RPC with execute_once guard + idempotency
 * 
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

  // V2.1: For fire action, require idempotency key (C2.1)
  // Treat empty/whitespace-only key as missing
  const rawIdempotencyKey = request.headers.get('X-Idempotency-Key');
  const idempotencyKey = rawIdempotencyKey?.trim() || null;
  if (action === 'fire' && !idempotencyKey) {
    return NextResponse.json(
      { ok: false, error: 'TRIGGER_IDEMPOTENCY_KEY_REQUIRED' },
      { status: 400 }
    );
  }

  const service = createServiceRoleClient();

  // V2: Verify game trigger exists
  const { data: gameTrigger, error: gtErr } = await service
    .from('game_triggers')
    .select('id, name')
    .eq('id', triggerId)
    .single();

  if (gtErr || !gameTrigger) return jsonError('Trigger not found', 404);

  // Handle fire action via atomic RPC
  if (action === 'fire') {
    // TODO(post-merge): Remove cast after running `supabase gen types typescript`
    // fire_trigger_v2_safe is defined in migration 20260208000001 but not yet in generated types
    const { data: rpcResult, error: rpcErr } = await (service.rpc as Function)(
      'fire_trigger_v2_safe',
      {
        p_session_id: sessionId,
        p_game_trigger_id: triggerId,
        p_idempotency_key: idempotencyKey,
        p_actor_user_id: user.id,
      }
    );

    if (rpcErr) {
      console.error('[PATCH triggers] RPC error:', rpcErr);
      return jsonError('Failed to fire trigger', 500);
    }

    // RPC returns array, get first row
    const result = (Array.isArray(rpcResult) ? rpcResult[0] : rpcResult) as FireTriggerRpcResult;

    if (!result || !result.ok) {
      return NextResponse.json(
        { ok: false, error: result?.reason ?? 'TRIGGER_FIRE_FAILED' },
        { status: 500 }
      );
    }

    // Broadcast event
    await broadcastPlayEvent(sessionId, {
      type: 'trigger_update',
      payload: {
        action: 'fire',
        triggerId,
        name: gameTrigger.name,
        newStatus: result.status === 'fired' ? 'fired' : 'armed',
        noop: result.status === 'noop',
        reason: result.reason,
      },
      timestamp: new Date().toISOString(),
    });

    // Return contract-compliant response
    return NextResponse.json({
      ok: true,
      status: result.status,
      reason: result.reason,
      replay: result.replay,
      trigger: {
        id: triggerId,
        status: result.status === 'fired' ? 'fired' : 'armed',
        firedAt: result.fired_at,
        firedCount: result.fired_count,
      },
      ...(result.replay && result.original_fired_at ? { originalFiredAt: result.original_fired_at } : {}),
    });
  }

  // Handle disable/arm actions (non-atomic, simpler)
  const { data: currentState } = await service
    .from('session_trigger_state')
    .select('status, fired_count, fired_at')
    .eq('session_id', sessionId)
    .eq('game_trigger_id', triggerId)
    .single();

  let newStatus: 'armed' | 'disabled';
  let enabled: boolean;

  switch (action) {
    case 'disable':
      newStatus = 'disabled';
      enabled = false;
      break;
    case 'arm':
      newStatus = 'armed';
      enabled = true;
      break;
    default:
      return jsonError('Invalid action', 400);
  }

  // Upsert state record (preserve fired_count and fired_at)
  const { error: updateErr } = await service
    .from('session_trigger_state')
    .upsert(
      {
        session_id: sessionId,
        game_trigger_id: triggerId,
        status: newStatus,
        fired_at: currentState?.fired_at ?? null,
        fired_count: currentState?.fired_count ?? 0,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,game_trigger_id' }
    );

  if (updateErr) return jsonError('Failed to update trigger', 500);

  await broadcastPlayEvent(sessionId, {
    type: 'trigger_update',
    payload: {
      action,
      triggerId,
      name: gameTrigger.name,
      newStatus,
    },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    status: newStatus,
    reason: null,
    replay: false,
    trigger: {
      id: triggerId,
      status: newStatus,
      firedAt: currentState?.fired_at ?? null,
      firedCount: currentState?.fired_count ?? 0,
    },
  });
}
