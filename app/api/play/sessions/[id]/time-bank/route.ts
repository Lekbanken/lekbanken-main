import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const ApplyDeltaSchema = z.object({
  deltaSeconds: z.number().int().min(-3600).max(3600),
  reason: z.string().trim().min(1).max(200),
  metadata: z.record(z.unknown()).optional(),
  minBalanceSeconds: z.number().int().optional(),
  maxBalanceSeconds: z.number().int().optional(),
});

/**
 * GET /api/play/sessions/[id]/time-bank
 * Host-only: Returns current balance + recent ledger rows.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can view time bank', 403);

  const service = (await createServiceRoleClient()) as SupabaseAny;

  const { data: bankRow, error: bankErr } = await service
    .from('session_time_bank')
    .select('session_id, balance_seconds, updated_at')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (bankErr) {
    console.error('[time-bank] select bank failed', bankErr);
    return jsonError('Failed to load time bank', 500);
  }

  const { data: ledger, error: ledgerErr } = await service
    .from('session_time_bank_ledger')
    .select('id, session_id, delta_seconds, reason, metadata, event_id, actor_user_id, actor_participant_id, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (ledgerErr) {
    console.error('[time-bank] select ledger failed', ledgerErr);
    return jsonError('Failed to load time bank ledger', 500);
  }

  return NextResponse.json(
    {
      success: true,
      timeBank: {
        balanceSeconds: bankRow?.balance_seconds ?? 0,
        updatedAt: bankRow?.updated_at ?? null,
      },
      ledger: ledger ?? [],
    },
    { status: 200 }
  );
}

/**
 * POST /api/play/sessions/[id]/time-bank
 * Host-only (initially): Calls public.time_bank_apply_delta via service role + broadcast.
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
  if (session.host_user_id !== user.id) return jsonError('Only host can update time bank', 403);

  const body = await request.json().catch(() => ({}));
  const parsed = ApplyDeltaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { deltaSeconds, reason, metadata, minBalanceSeconds, maxBalanceSeconds } = parsed.data;

  const service = (await createServiceRoleClient()) as SupabaseAny;

  const { data: result, error } = await service.rpc('time_bank_apply_delta', {
    p_session_id: sessionId,
    p_delta_seconds: deltaSeconds,
    p_reason: reason,
    p_metadata: metadata ?? null,
    p_event_id: null,
    p_actor_user_id: user.id,
    p_actor_participant_id: null,
    p_min_balance: minBalanceSeconds ?? null,
    p_max_balance: maxBalanceSeconds ?? null,
  });

  if (error) {
    console.error('[time-bank] rpc failed', error);
    return jsonError('Failed to apply time bank delta', 500);
  }

  // Audit: insert session_events row (best-effort)
  try {
    await service.from('session_events').insert({
      session_id: sessionId,
      event_type: 'time_bank_delta',
      event_data: {
        delta_seconds: deltaSeconds,
        reason,
        result,
      },
      actor_user_id: user.id,
      actor_participant_id: null,
    });
  } catch (e) {
    console.warn('[time-bank] session_events insert failed', e);
  }

  await broadcastPlayEvent(sessionId, {
    type: 'time_bank_changed',
    payload: {
      sessionId,
      result,
    },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, result }, { status: 200 });
}
