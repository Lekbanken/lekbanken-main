import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';
import { REJECTED_PARTICIPANT_STATUSES } from '@/lib/api/play-auth';

export async function GET(request: Request) {
  const token = request.headers.get('x-participant-token');
  const url = new URL(request.url);
  const sessionCode = url.searchParams.get('session_code');

  if (!token || !sessionCode) {
    return NextResponse.json(
      { error: 'Missing participant token or session_code' },
      { status: 400 }
    );
  }

  const normalizedCode = normalizeSessionCode(sessionCode);
  const supabase = await createServiceRoleClient();

  const { data: session, error: sessionError } = await supabase
    .from('participant_sessions')
    .select('*')
    .eq('session_code', normalizedCode)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('*')
    .eq('participant_token', token)
    .eq('session_id', session.id)
    .single();

  if (participantError || !participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  if (REJECTED_PARTICIPANT_STATUSES.has(participant.status ?? '')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  return NextResponse.json({
    participant: {
      id: participant.id,
      displayName: participant.display_name,
      role: participant.role,
      status: participant.status,
      joinedAt: participant.joined_at,
      lastSeenAt: participant.last_seen_at,
      isNextStarter: Boolean((participant.progress as Record<string, unknown> | null | undefined)?.isNextStarter),
    },
    session: {
      id: session.id,
      sessionCode: session.session_code,
      displayName: session.display_name,
      description: session.description,
      status: session.status,
      gameId: session.game_id,
      participantCount: session.participant_count,
      createdAt: session.created_at,
      startedAt: session.started_at,
      pausedAt: session.paused_at,
      endedAt: session.ended_at,
      currentStepIndex: session.current_step_index,
      currentPhaseIndex: session.current_phase_index,
      timerState: session.timer_state,
      boardState: session.board_state,
      secretInstructionsUnlockedAt:
        (session as Record<string, unknown>).secret_instructions_unlocked_at ?? null,
      secretInstructionsUnlockedBy:
        (session as Record<string, unknown>).secret_instructions_unlocked_by ?? null,
      settings: session.settings,
      expiresAt: session.expires_at,
    },
  });
}
