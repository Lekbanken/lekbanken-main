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
import { REJECTED_PARTICIPANT_STATUSES } from '@/lib/api/play-auth';

export async function POST(request: Request) {
  const token = request.headers.get('x-participant-token');
  const url = new URL(request.url);
  const sessionCode = url.searchParams.get('session_code');

  if (!token || !sessionCode) {
    return NextResponse.json(
      { error: 'Missing participant token or session_code' },
      { status: 400 }
    );
  }

  let body: { isReady?: boolean };
  try {
    body = await request.json();
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
  const supabase = await createServiceRoleClient();

  // Find session
  const { data: session, error: sessionError } = await supabase
    .from('participant_sessions')
    .select('id, status')
    .eq('session_code', normalizedCode)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Only allow readiness toggle in lobby state
  if (session.status !== 'lobby' && session.status !== 'active') {
    return NextResponse.json(
      { error: 'Session is not accepting readiness changes' },
      { status: 409 }
    );
  }

  // Verify participant
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, progress, status')
    .eq('participant_token', token)
    .eq('session_id', session.id)
    .single();

  if (participantError || !participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  if (REJECTED_PARTICIPANT_STATUSES.has(participant.status ?? '')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
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

  return NextResponse.json({ ok: true, isReady: body.isReady });
}
