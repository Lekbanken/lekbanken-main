import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ApiResponse, PublicGameSummary, ApiMeta } from '@/types/public-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/v1/games
 * List published games (public, read-only)
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 20, max: 100)
 * - tenant_id: Filter by tenant (required for scoped access)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10)));
  const tenantId = searchParams.get('tenant_id');

  // API key validation would go here
  // For now, we require tenant_id for scoped access
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

  // Get total count
  const { count: total } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('owner_tenant_id', tenantId)
    .eq('status', 'published');

  // Get paginated games
  const offset = (page - 1) * perPage;
  const { data: games, error } = await supabase
    .from('games')
    .select('id, name, description, short_description, play_mode, min_players, max_players, time_estimate_min, status, created_at, updated_at')
    .eq('owner_tenant_id', tenantId)
    .eq('status', 'published')
    .order('name', { ascending: true })
    .range(offset, offset + perPage - 1);

  if (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'DB_ERROR',
        message: 'Failed to fetch games',
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

  const gameSummaries: PublicGameSummary[] = (games || []).map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    short_description: g.short_description,
    play_mode: g.play_mode || 'basic',
    duration_minutes: g.time_estimate_min,
    min_participants: g.min_players,
    max_participants: g.max_players,
    thumbnail_url: null,
    status: g.status as 'draft' | 'published',
    created_at: g.created_at,
    updated_at: g.updated_at,
  }));

  const response: ApiResponse<PublicGameSummary[]> = {
    success: true,
    data: gameSummaries,
    meta,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
