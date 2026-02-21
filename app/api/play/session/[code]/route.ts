import { NextResponse, type NextRequest } from 'next/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import {
  normalizeSessionCode,
  isValidSessionCodeFormat,
} from '@/lib/services/participants/session-code-generator';
import { applyRateLimitMiddleware } from '@/lib/utils/rate-limiter';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

  // ---------------------------------------------------------------------------
  // Resolve game name + cover image (if a game is linked)
  // ---------------------------------------------------------------------------
  let gameName: string | null = null;
  let gameCoverUrl: string | null = null;

  if (session.game_id) {
    try {
      const supabase = await createServiceRoleClient();
      const { data: game } = await supabase
        .from('games')
        .select('name, game_media(kind, media(url))')
        .eq('id', session.game_id)
        .single();

      if (game) {
        gameName = game.name ?? null;
        const mediaArr = game.game_media as Array<{
          kind: string;
          media: { url: string } | null;
        }> | null;
        const cover = mediaArr?.find((m) => m.kind === 'cover') ?? mediaArr?.[0];
        gameCoverUrl = cover?.media?.url ?? null;
      }
    } catch {
      // Non-critical — lobby still works without game metadata
    }
  }

  // ---------------------------------------------------------------------------
  // Lightweight participant list (id, displayName, isReady)
  // No auth required — this is the public lobby view
  // ---------------------------------------------------------------------------
  let participants: Array<{
    id: string;
    displayName: string;
    isReady: boolean;
  }> = [];

  try {
    const supabase = await createServiceRoleClient();
    const { data: rows } = await supabase
      .from('participants')
      .select('id, display_name, progress, status')
      .eq('session_id', session.id)
      .in('status', ['active', 'idle'])
      .order('joined_at', { ascending: true });

    if (rows) {
      participants = rows.map((p) => ({
        id: p.id,
        displayName: p.display_name,
        isReady: Boolean(
          (p.progress as Record<string, unknown> | null)?.isReady
        ),
      }));
    }
  } catch {
    // Non-critical — participant list fails silently
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
      gameName,
      gameCoverUrl,
    },
    participants,
  });
}
