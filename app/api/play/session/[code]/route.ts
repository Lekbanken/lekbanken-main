import { NextResponse, type NextRequest } from 'next/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import {
  normalizeSessionCode,
  isValidSessionCodeFormat,
} from '@/lib/services/participants/session-code-generator';
import { applyRateLimitMiddleware } from '@/lib/utils/rate-limiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const rate = applyRateLimitMiddleware(request, 'api');
  if (rate) return rate;

  const { code } = await params;
  const normalized = normalizeSessionCode(code ?? '');

  // Uniform 404 for both invalid format and non-existent codes (anti-enumeration)
  if (!isValidSessionCodeFormat(normalized)) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

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
    },
  });
}
