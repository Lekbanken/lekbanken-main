import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { adminSearchSchema, buildSortClause, computeValidationState } from './helpers';
import type { GameAdminRow, GameListResponse, PlayMode } from '@/features/admin/games/v2/types';

/**
 * POST /api/admin/games/search
 * 
 * Server-side paginated game search for admin panel.
 * Supports advanced filtering, sorting, and URL-persistable queries.
 * 
 * Requires system_admin or higher role.
 */
export async function POST(request: Request) {
  const supabase = await createServerRlsClient();
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const role = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
  const isAdmin = role === 'system_admin' || role === 'superadmin';
  
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
  }
  
  // Parse and validate body
  const body = await request.json().catch(() => ({}));
  const parsed = adminSearchSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  
  const {
    search,
    classification,
    playExecution,
    lifecycle,
    ownership,
    technical,
    sortBy = 'updated_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = 25,
  } = parsed.data;
  
  const offset = (page - 1) * pageSize;
  
  try {
    // Build the query with all relations
    let query = supabase
      .from('games')
      .select(
        `
          *,
          owner:tenants!owner_tenant_id(id, name),
          product:products!product_id(id, name),
          main_purpose:purposes!main_purpose_id(id, name, type),
          secondary_purposes:game_secondary_purposes(
            purpose:purposes(id, name, type)
          ),
          media:game_media(
            kind,
            media:media(id, url, alt_text)
          ),
          steps:game_steps(count),
          phases:game_phases(count),
          roles:game_roles(count)
        `,
        { count: 'exact' }
      );
    
    // Apply text search
    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(
        `name.ilike.%${term}%,short_description.ilike.%${term}%,description.ilike.%${term}%,game_key.ilike.%${term}%`
      );
    }
    
    // Apply classification filters
    if (classification) {
      if (classification.mainPurposes?.length) {
        query = query.in('main_purpose_id', classification.mainPurposes);
      }
      if (classification.ageMin !== undefined) {
        query = query.gte('age_min', classification.ageMin);
      }
      if (classification.ageMax !== undefined) {
        query = query.lte('age_max', classification.ageMax);
      }
      if (classification.durationMin !== undefined) {
        query = query.gte('time_estimate_min', classification.durationMin);
      }
      if (classification.durationMax !== undefined) {
        query = query.lte('time_estimate_min', classification.durationMax);
      }
    }
    
    // Apply play execution filters
    if (playExecution) {
      if (playExecution.playModes?.length) {
        query = query.in('play_mode', playExecution.playModes);
      }
      if (playExecution.minPlayers !== undefined) {
        query = query.gte('min_players', playExecution.minPlayers);
      }
      if (playExecution.maxPlayers !== undefined) {
        query = query.lte('max_players', playExecution.maxPlayers);
      }
      if (playExecution.locationType?.length) {
        query = query.in('location_type', playExecution.locationType);
      }
      if (playExecution.energyLevels?.length) {
        query = query.in('energy_level', playExecution.energyLevels);
      }
    }
    
    // Apply lifecycle filters
    if (lifecycle) {
      if (lifecycle.statuses?.length) {
        query = query.in('status', lifecycle.statuses);
      }
    }
    
    // Apply ownership filters
    if (ownership) {
      if (ownership.tenantIds?.length) {
        query = query.in('owner_tenant_id', ownership.tenantIds);
      }
      if (ownership.isGlobal === true) {
        query = query.is('owner_tenant_id', null);
      } else if (ownership.isGlobal === false) {
        query = query.not('owner_tenant_id', 'is', null);
      }
    }
    
    // Apply technical filters
    if (technical) {
      if (technical.gameContentVersions?.length) {
        query = query.in('game_content_version', technical.gameContentVersions);
      }
    }
    
    // Apply sorting
    const { column, ascending } = buildSortClause(sortBy, sortOrder);
    query = query.order(column, { ascending });
    
    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[api/admin/games/search] Query error:', error);
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }
    
    // Transform and enrich the results
    const games: GameAdminRow[] = (data || []).map((row) => {
      // Count related entities
      const stepCount = Array.isArray(row.steps) ? row.steps.length : 0;
      const phaseCount = Array.isArray(row.phases) ? row.phases.length : 0;
      const roleCount = Array.isArray(row.roles) ? row.roles.length : 0;
      
      // Compute validation state
      const { state, errors, warnings } = computeValidationState({
        name: row.name,
        short_description: row.short_description,
        main_purpose_id: row.main_purpose_id,
        step_count: stepCount,
        media: row.media,
        status: row.status,
        play_mode: row.play_mode,
        phase_count: phaseCount,
        role_count: roleCount,
      });
      
      return {
        id: row.id,
        game_key: row.game_key,
        name: row.name,
        short_description: row.short_description,
        description: row.description,
        status: row.status,
        play_mode: row.play_mode as PlayMode | null,
        category: row.category,
        energy_level: row.energy_level,
        location_type: row.location_type,
        min_players: row.min_players,
        max_players: row.max_players,
        age_min: row.age_min,
        age_max: row.age_max,
        time_estimate_min: row.time_estimate_min,
        duration_max: row.duration_max,
        owner_tenant_id: row.owner_tenant_id,
        product_id: row.product_id,
        main_purpose_id: row.main_purpose_id,
        game_content_version: row.game_content_version,
        created_at: row.created_at,
        updated_at: row.updated_at,
        owner: row.owner,
        product: row.product,
        main_purpose: row.main_purpose,
        secondary_purposes: row.secondary_purposes,
        media: row.media,
        step_count: stepCount,
        phase_count: phaseCount,
        role_count: roleCount,
        validation_state: state,
        validation_errors: errors,
        validation_warnings: warnings,
      };
    });
    
    const total = count || 0;
    const hasMore = page * pageSize < total;

    // Global stats across ALL games (unfiltered) for the overview cards
    const [publishedCount, draftCount, errorCount] = await Promise.all([
      supabase.from('games').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('games').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      // "errors" = games where name is null/empty (the only error-level check in computeValidationState)
      supabase.from('games').select('*', { count: 'exact', head: true }).or('name.is.null,name.eq.'),
    ]);

    const globalTotal = (publishedCount.count ?? 0) + (draftCount.count ?? 0);

    const response: GameListResponse = {
      games,
      total,
      page,
      pageSize,
      hasMore,
      globalStats: {
        total: globalTotal,
        published: publishedCount.count ?? 0,
        drafts: draftCount.count ?? 0,
        withErrors: errorCount.count ?? 0,
      },
      metadata: {
        appliedFilters: parsed.data,
      },
    };
    
    return NextResponse.json(response);
  } catch (err) {
    console.error('[api/admin/games/search] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
