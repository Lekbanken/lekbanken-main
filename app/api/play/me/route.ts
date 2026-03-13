import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';
import { apiHandler } from '@/lib/api/route-handler';

export const GET = apiHandler({
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

    const normalizedCode = normalizeSessionCode(sessionCode);
    const supabase = createServiceRoleClient();

    const { data: session, error: sessionError } = await supabase
      .from('participant_sessions')
      .select('*')
      .eq('session_code', normalizedCode)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify participant belongs to this session
    if (p!.sessionId !== session.id) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    // Fetch full participant row for response fields
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('id', p!.participantId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
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
  },
});
