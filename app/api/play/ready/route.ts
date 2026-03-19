/**
 * POST /api/play/ready
 *
 * Toggles participant readiness in the lobby.
 * Sets `progress.isReady` to true/false on the participants row.
 *
 * Body: { isReady: boolean }
 * Headers: x-participant-token
 * Query: session_code
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';
import { apiHandler } from '@/lib/api/route-handler';
import { requireActiveParticipant } from '@/lib/api/play-auth';

export const POST = apiHandler({
  auth: 'participant',
  handler: async ({ req, participant: p }) => {
    const url = new URL(req.url);
    const sessionCode = url.searchParams.get('session_code');

    if (!sessionCode) {
      return NextResponse.json(
        { error: 'Missing session_code' },
        { status: 400 }
      );
    }

    let body: { isReady?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body.isReady !== 'boolean') {
      return NextResponse.json(
        { error: 'isReady must be a boolean' },
        { status: 400 }
      );
    }

    const normalizedCode = normalizeSessionCode(sessionCode);
    const supabase = createServiceRoleClient();

    // Find session
    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('id, status')
      .eq('session_code', normalizedCode)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify participant belongs to this session
    if (p!.sessionId !== session.id) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    // BUG-083 FIX: idle participants must not toggle readiness
    const activeGuard = requireActiveParticipant(p!.status);
    if (activeGuard) return activeGuard;

    // Only allow readiness toggle in lobby state
    if (session.status !== 'lobby' && session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not accepting readiness changes' },
        { status: 409 }
      );
    }

    // Fetch participant's progress for merge
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, progress')
      .eq('id', p!.participantId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Merge isReady into existing progress JSON
    const currentProgress = (participant.progress as Record<string, unknown>) ?? {};
    const updatedProgress = { ...currentProgress, isReady: body.isReady };

    const { error: updateError } = await supabase
      .from('participants')
      .update({ progress: updatedProgress as unknown as Record<string, never> })
      .eq('id', participant.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update readiness' },
        { status: 500 }
      );
    }

    await broadcastPlayEvent(session.id, {
      type: 'participants_changed',
      payload: {
        action: 'readiness_changed',
        participant_id: participant.id,
        is_ready: body.isReady,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, isReady: body.isReady });
  },
});
