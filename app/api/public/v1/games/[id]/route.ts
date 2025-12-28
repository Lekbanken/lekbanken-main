import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ApiResponse, PublicGameSummary } from '@/types/public-api';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/public/v1/games/[id]
 * Get detailed game information (public, read-only)
 * 
 * Query params:
 * - tenant_id: Required for authorization
 * - include_stats: Include session statistics (default: false)
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');
  const includeStats = searchParams.get('include_stats') === 'true';

  if (!tenantId) {
    const error: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_TENANT',
        message: 'tenant_id query parameter is required',
      },
    };
    return NextResponse.json(error, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Fetch game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .eq('owner_tenant_id', tenantId)
    .eq('status', 'published')
    .single();

  if (gameError || !game) {
    const error: ApiResponse<never> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Game not found',
      },
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Build base response
  const gameDetails: PublicGameSummary & {
    stats?: {
      total_sessions: number;
      active_sessions: number;
      completed_sessions: number;
      avg_duration_minutes: number | null;
    };
  } = {
    id: game.id,
    name: game.name,
    description: game.description,
    duration_minutes: game.time_estimate_min,
    min_participants: game.min_players,
    max_participants: game.max_players,
    thumbnail_url: null,
    created_at: game.created_at,
    updated_at: game.updated_at,
  };

  // Fetch stats if requested
  if (includeStats) {
    const { data: sessions } = await supabase
      .from('participant_sessions')
      .select('id, status, started_at, ended_at')
      .eq('game_id', id);

    if (sessions) {
      const completedSessions = sessions.filter((s) => s.status === 'ended');
      const durations = completedSessions
        .filter((s) => s.started_at && s.ended_at)
        .map((s) => {
          const start = new Date(s.started_at!).getTime();
          const end = new Date(s.ended_at!).getTime();
          return (end - start) / 1000 / 60; // minutes
        });

      gameDetails.stats = {
        total_sessions: sessions.length,
        active_sessions: sessions.filter((s) => s.status === 'active').length,
        completed_sessions: completedSessions.length,
        avg_duration_minutes:
          durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : null,
      };
    }
  }

  const response: ApiResponse<typeof gameDetails> = {
    success: true,
    data: gameDetails,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
    },
  });
}
