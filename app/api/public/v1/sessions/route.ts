import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ApiResponse, PublicSessionSummary, ApiMeta } from '@/types/public-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/v1/sessions
 * List sessions (public, read-only)
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 20, max: 100)
 * - tenant_id: Filter by tenant (required)
 * - game_id: Filter by game (optional)
 * - status: Filter by status (optional: pending, active, ended)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10)));
  const tenantId = searchParams.get('tenant_id');
  const gameId = searchParams.get('game_id');
  const status = searchParams.get('status');

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

  // Build query - participant_sessions has tenant_id directly
  let query = supabase
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
      games(name)
    `)
    .eq('tenant_id', tenantId);

  if (gameId) {
    query = query.eq('game_id', gameId);
  }

  // Status mapping: active, paused, ended, locked, archived, cancelled
  if (status) {
    if (status === 'active') {
      query = query.eq('status', 'active');
    } else if (status === 'ended') {
      query = query.in('status', ['ended', 'archived']);
    } else if (status === 'pending') {
      query = query.eq('status', 'paused');
    }
  }

  // Get total count
  const countQuery = supabase
    .from('participant_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (gameId) {
    countQuery.eq('game_id', gameId);
  }

  const { count: total } = await countQuery;

  // Get paginated sessions
  const offset = (page - 1) * perPage;
  const { data: sessions, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'DB_ERROR',
        message: 'Failed to fetch sessions',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }

  const totalCount = total || 0;
  const meta: ApiMeta = {
    page,
    per_page: perPage,
    total: totalCount,
    total_pages: Math.ceil(totalCount / perPage),
  };

  // Map status to simplified API status
  const mapStatus = (s: string): 'pending' | 'active' | 'ended' => {
    if (s === 'active') return 'active';
    if (['ended', 'archived', 'cancelled'].includes(s)) return 'ended';
    return 'pending';
  };

  const sessionSummaries: PublicSessionSummary[] = (sessions || []).map((s) => ({
    id: s.id,
    game_id: s.game_id ?? '',
    game_name: (s.games as { name: string } | null)?.name || s.display_name || 'Session',
    status: mapStatus(s.status),
    created_at: s.created_at,
    started_at: s.started_at,
    ended_at: s.ended_at,
    participant_count: s.participant_count,
  }));

  const response: ApiResponse<PublicSessionSummary[]> = {
    success: true,
    data: sessionSummaries,
    meta,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
    },
  });
}
