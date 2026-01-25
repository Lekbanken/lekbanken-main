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
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
 * PATCH /api/play/sessions/[id]/triggers
 * V2: Update trigger status in session_trigger_state.
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

  const service = createServiceRoleClient();

  // V2: Verify game trigger exists
  const { data: gameTrigger, error: gtErr } = await service
    .from('game_triggers')
    .select('id, name')
    .eq('id', triggerId)
    .single();

  if (gtErr || !gameTrigger) return jsonError('Trigger not found', 404);

  // V2: Get current state (may not exist yet)
  const { data: currentState } = await service
    .from('session_trigger_state')
    .select('status, fired_count, fired_at')
    .eq('session_id', sessionId)
    .eq('game_trigger_id', triggerId)
    .single();

  // Determine new values
  let newStatus: 'armed' | 'fired' | 'disabled';
  let firedAt: string | null = currentState?.fired_at ?? null;
  let firedCount = currentState?.fired_count ?? 0;
  let enabled = true;

  switch (action) {
    case 'fire':
      newStatus = 'fired';
      firedAt = new Date().toISOString();
      firedCount += 1;
      break;
    case 'disable':
      newStatus = 'disabled';
      enabled = false;
      break;
    case 'arm':
      newStatus = 'armed';
      enabled = true;
      break;
  }

  // V2: Upsert state record
  const { error: updateErr } = await service
    .from('session_trigger_state')
    .upsert(
      {
        session_id: sessionId,
        game_trigger_id: triggerId,
        status: newStatus,
        fired_at: firedAt,
        fired_count: firedCount,
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
    success: true,
    trigger: {
      id: triggerId,
      status: newStatus,
      firedAt,
      firedCount,
    },
  });
}
