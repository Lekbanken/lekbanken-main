import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { resolveSessionViewer } from '@/lib/api/play-auth';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';
import { apiHandler } from '@/lib/api/route-handler';
import { assertSessionStatus } from '@/lib/play/session-guards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const SendSignalSchema = z
  .object({
    channel: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(2000).optional(),
    payload: z.unknown().optional(),
  })
  .refine((v) => v.message || v.payload, {
    message: 'Either message or payload is required',
  });

/**
 * GET /api/play/sessions/[id]/signals
 * Host-only: Returns recent session signals.
 */
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
  const { id: sessionId } = params;
  const userId = auth!.user!.id;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.host_user_id !== userId) return NextResponse.json({ error: 'Only host can view signals' }, { status: 403 });

  const service = (await createServiceRoleClient()) as SupabaseAny;

  const { data: signals, error } = await service
    .from('session_signals')
    .select('id, session_id, channel, payload, sender_user_id, sender_participant_id, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[signals] select failed', error);
    return NextResponse.json({ error: 'Failed to load signals' }, { status: 500 });
  }

  return NextResponse.json({ success: true, signals: signals ?? [] }, { status: 200 });
  },
});

/**
 * POST /api/play/sessions/[id]/signals
 * Host or participant: Insert into session_signals + broadcast play_event.
 */
export const POST = apiHandler({
  auth: 'public',
  rateLimit: 'api',
  handler: async ({ req, params }) => {
  const { id: sessionId } = params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const statusError = assertSessionStatus(session.status, 'signals');
  if (statusError) return statusError;

  const sender = await resolveSessionViewer(sessionId, req);
  if (!sender) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = SendSignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { channel, message, payload } = parsed.data;
  const normalizedPayload = payload ?? (message ? { message } : null);

  const service = (await createServiceRoleClient()) as SupabaseAny;

  // Lightweight rate limit: 1 signal per second per sender per session
  try {
    let query = service
      .from('session_signals')
      .select('created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (sender.type === 'host') {
      query = query.eq('sender_user_id', sender.userId);
    } else {
      query = query.eq('sender_participant_id', sender.participantId);
    }

    const { data: lastRow } = await query.maybeSingle();

    if (lastRow?.created_at) {
      const lastMs = new Date(lastRow.created_at as string).getTime();
      if (Number.isFinite(lastMs) && Date.now() - lastMs < 1000) {
        return NextResponse.json({ error: 'Too many signals, try again shortly' }, { status: 429 });
      }
    }
  } catch {
    // Best-effort; do not block on rate limit failures
  }

  const { data: inserted, error } = await service
    .from('session_signals')
    .insert({
      session_id: sessionId,
      channel,
      payload: normalizedPayload,
      sender_user_id: sender.type === 'host' ? sender.userId : null,
      sender_participant_id: sender.type === 'participant' ? sender.participantId : null,
    })
    .select('id, session_id, channel, payload, sender_user_id, sender_participant_id, created_at')
    .single();

  if (error || !inserted) {
    console.error('[signals] insert failed', error);
    return NextResponse.json({ error: 'Failed to send signal' }, { status: 500 });
  }

  // Audit: insert session_events row (best-effort, V2 schema)
  try {
    await service.from('session_events').insert({
      session_id: sessionId,
      event_type: 'signal_sent',
      event_category: 'signal',
      actor_type: sender.type === 'host' ? 'host' : 'participant',
      actor_id: sender.type === 'host' ? sender.userId : sender.participantId,
      target_type: 'signal',
      target_id: inserted.id,
      target_name: inserted.channel,
      payload: {
        signal_id: inserted.id,
        channel: inserted.channel,
        payload: inserted.payload,
      },
      severity: 'info',
    });
  } catch (e) {
    console.warn('[signals] session_events insert failed', e);
  }

  await broadcastPlayEvent(sessionId, {
    type: 'signal_received',
    payload: {
      id: inserted.id,
      channel: inserted.channel,
      payload: inserted.payload,
      sender_user_id: inserted.sender_user_id,
      sender_participant_id: inserted.sender_participant_id,
      created_at: inserted.created_at,
    },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, signal: inserted }, { status: 201 });
  },
});
