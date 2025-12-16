import { NextResponse } from 'next/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code || code.length < 3) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  const normalized = normalizeSessionCode(code);
  const session = await ParticipantSessionService.getSessionByCode(normalized);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      sessionCode: session.session_code,
      displayName: session.display_name,
      description: session.description,
      status: session.status,
      participantCount: session.participant_count,
      maxParticipants: (session.settings as { max_participants?: number })?.max_participants,
      expiresAt: session.expires_at,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      gameId: session.game_id,
      planId: session.plan_id,
    },
  });
}
