import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type Sender =
  | { type: 'host'; userId: string }
  | { type: 'participant'; participantId: string; participantName: string };

async function resolveSender(sessionId: string, request: Request): Promise<Sender | null> {
  const token = request.headers.get('x-participant-token');
  if (token) {
    const supabase = await createServiceRoleClient();
    const { data: participant } = await supabase
      .from('participants')
      .select('id, display_name, token_expires_at, status')
      .eq('participant_token', token)
      .eq('session_id', sessionId)
      .single();

    if (!participant) return null;
    if (participant.status === 'blocked' || participant.status === 'kicked') return null;
    if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) return null;

    return {
      type: 'participant',
      participantId: participant.id,
      participantName: participant.display_name,
    };
  }

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return null;
  if (session.host_user_id !== user.id) return null;

  return { type: 'host', userId: user.id };
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
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can view signals', 403);

  const service = (await createServiceRoleClient()) as SupabaseAny;

  const { data: signals, error } = await service
    .from('session_signals')
    .select('id, session_id, channel, payload, sender_user_id, sender_participant_id, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[signals] select failed', error);
    return jsonError('Failed to load signals', 500);
  }

  return NextResponse.json({ success: true, signals: signals ?? [] }, { status: 200 });
}

/**
 * POST /api/play/sessions/[id]/signals
 * Host-only (initially): Insert into session_signals + broadcast play_event.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);

  const sender = await resolveSender(sessionId, request);
  if (!sender) return jsonError('Unauthorized', 401);

  const body = await request.json().catch(() => ({}));
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
        return jsonError('Too many signals, try again shortly', 429);
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
    return jsonError('Failed to send signal', 500);
  }

  // Audit: insert session_events row (best-effort)
  try {
    await service.from('session_events').insert({
      session_id: sessionId,
      event_type: 'signal_sent',
      event_data: {
        signal_id: inserted.id,
        channel: inserted.channel,
        payload: inserted.payload,
      },
      actor_user_id: sender.type === 'host' ? sender.userId : null,
      actor_participant_id: sender.type === 'participant' ? sender.participantId : null,
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
}
