import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ApiResponse, PublicSessionDetails } from '@/types/public-api';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/public/v1/sessions/[id]
 * Get detailed session information (public, read-only)
 * 
 * Query params:
 * - tenant_id: Required for authorization
 * - include_events: Include timeline events (default: false)
 * - include_participants: Include participant list (default: false)
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');
  const includeEvents = searchParams.get('include_events') === 'true';
  const includeParticipants = searchParams.get('include_participants') === 'true';

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

  // Fetch session - participant_sessions has tenant_id directly
  const { data: session, error: sessionError } = await supabase
    .from('participant_sessions')
    .select(`
      id,
      game_id,
      display_name,
      status,
      created_at,
      started_at,
      ended_at,
      participant_count,
      tenant_id,
      games(id, name)
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (sessionError || !session) {
    const error: ApiResponse<never> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Session not found',
      },
    };
    return NextResponse.json(error, { status: 404 });
  }

  const gameInfo = session.games as { id: string; name: string } | null;

  // Fetch participants if requested
  let participants: { id: string; display_name: string; joined_at: string }[] | undefined;
  if (includeParticipants) {
    const { data: participantData } = await supabase
      .from('participants')
      .select('id, display_name, joined_at')
      .eq('session_id', id);
    
    participants = (participantData || []).map((p) => ({
      id: p.id,
      display_name: p.display_name,
      joined_at: p.joined_at,
    }));
  }

  // Calculate duration
  let duration_seconds: number | null = null;
  if (session.started_at && session.ended_at) {
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.ended_at).getTime();
    duration_seconds = Math.round((end - start) / 1000);
  }

  // Map status to simplified API status
  const mapStatus = (s: string): 'pending' | 'active' | 'ended' => {
    if (s === 'active') return 'active';
    if (['ended', 'archived', 'cancelled'].includes(s)) return 'ended';
    return 'pending';
  };

  // Build response
  const details: PublicSessionDetails = {
    id: session.id,
    game_id: session.game_id ?? '',
    game_name: gameInfo?.name || session.display_name || 'Session',
    status: mapStatus(session.status),
    created_at: session.created_at,
    started_at: session.started_at,
    ended_at: session.ended_at,
    participant_count: session.participant_count,
    duration_seconds,
    participants: includeParticipants && participants
      ? participants.map((p) => ({
          id: p.id,
          team_name: null,
          display_name: p.display_name,
          joined_at: p.joined_at,
        }))
      : undefined,
    events: undefined,
  };

  // Fetch events if requested
  // Note: session_events table may not exist yet - this is a placeholder
  if (includeEvents) {
    // When session_events table is created, uncomment:
    // const { data: events } = await supabase
    //   .from('session_events')
    //   .select('*')
    //   .eq('session_id', id)
    //   .order('occurred_at', { ascending: true });
    
    // For now, return empty events array
    details.events = [];
  }

  const response: ApiResponse<PublicSessionDetails> = {
    success: true,
    data: details,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
    },
  });
}
