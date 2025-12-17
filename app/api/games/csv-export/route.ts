/**
 * CSV Export API for Games
 * 
 * GET /api/games/csv-export
 * Exports games to CSV or JSON format with optional filtering.
 * 
 * NOTE: Uses 'any' typing for related tables (game_steps, game_phases, etc.)
 * because Supabase types are not yet regenerated after migrations.
 * Run `supabase gen types typescript` to fix this.
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateGamesCsv, generateGamesJson } from '@/features/admin/games/utils/csv-generator';
import type { ExportableGame, ExportOptions } from '@/types/csv-import';

// Temporary type overrides until Supabase types are regenerated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Parse query parameters
  const idsParam = searchParams.get('ids');
  const format = (searchParams.get('format') || 'csv') as 'csv' | 'json';
  const includeSteps = searchParams.get('includeSteps') !== 'false';
  const includeMaterials = searchParams.get('includeMaterials') !== 'false';
  const includePhases = searchParams.get('includePhases') !== 'false';
  const includeRoles = searchParams.get('includeRoles') !== 'false';
  const includeBoardConfig = searchParams.get('includeBoardConfig') !== 'false';
  const tenantId = searchParams.get('tenantId');
  
  // Parse game IDs if provided
  const gameIds = idsParam ? idsParam.split(',').filter(Boolean) : null;
  
  try {
    const supabase = await createServiceRoleClient();
    
    // Build query for games
    let query = supabase
      .from('games')
      .select('*')
      .order('name', { ascending: true });
    
    // Filter by specific IDs if provided
    if (gameIds && gameIds.length > 0) {
      query = query.in('id', gameIds);
    }
    
    // Filter by tenant if provided
    if (tenantId) {
      if (tenantId === 'global') {
        query = query.is('owner_tenant_id', null);
      } else {
        query = query.eq('owner_tenant_id', tenantId);
      }
    }
    
    const { data: games, error: gamesError } = await query;
    
    if (gamesError) {
      console.error('[csv-export] Error fetching games:', gamesError);
      return NextResponse.json(
        { error: 'Kunde inte hämta spel' },
        { status: 500 }
      );
    }
    
    if (!games || games.length === 0) {
      return NextResponse.json(
        { error: 'Inga spel hittades' },
        { status: 404 }
      );
    }
    
    // Fetch related data for each game
    const exportableGames: ExportableGame[] = [];
    
    // Use 'any' cast for supabase client to bypass missing table types
    const db = supabase as AnySupabase;

    for (const game of games) {
      // Cast game to any to access properties that may not be in outdated types
      const g = game as AnySupabase;
      const exportGame: ExportableGame = {
        id: g.id,
        game_key: g.game_key || `game-${g.id.slice(0, 8)}`,
        name: g.name,
        short_description: g.short_description || '',
        description: g.description,
        play_mode: (g.play_mode as 'basic' | 'facilitated' | 'participants') || 'basic',
        status: g.status as 'draft' | 'published',
        locale: null,
        
        energy_level: g.energy_level as 'low' | 'medium' | 'high' | null,
        location_type: g.location_type as 'indoor' | 'outdoor' | 'both' | null,
        time_estimate_min: g.time_estimate_min,
        duration_max: g.duration_max || null,
        min_players: g.min_players,
        max_players: g.max_players,
        players_recommended: g.players_recommended || null,
        age_min: g.age_min,
        age_max: g.age_max,
        difficulty: g.difficulty || null,
        accessibility_notes: g.accessibility_notes || null,
        space_requirements: g.space_requirements || null,
        leader_tips: g.leader_tips || null,
        
        main_purpose_id: g.main_purpose_id,
        sub_purpose_ids: [],
        product_id: g.product_id,
        owner_tenant_id: g.owner_tenant_id,
        cover_media_url: null,
        
        steps: [],
        materials: null,
        phases: [],
        roles: [],
        boardConfig: null,
      };
      
      // Fetch steps if needed
      if (includeSteps) {
        const { data: steps } = await db
          .from('game_steps')
          .select('*')
          .eq('game_id', g.id)
          .order('step_order', { ascending: true });
        
        if (steps) {
          exportGame.steps = steps.map((s: AnySupabase) => ({
            step_order: s.step_order,
            title: s.title || '',
            body: s.body || '',
            duration_seconds: s.duration_seconds,
            leader_script: s.leader_script,
            participant_prompt: s.participant_prompt,
            board_text: s.board_text,
            optional: s.optional || false,
          }));
        }
      }

      // Fetch secondary purposes
      const { data: secondaryPurposes } = await db
        .from('game_secondary_purposes')
        .select('purpose_id')
        .eq('game_id', g.id);

      exportGame.sub_purpose_ids = (secondaryPurposes ?? [])
        .map((p: AnySupabase) => p.purpose_id)
        .filter(Boolean);
      
      // Fetch materials if needed
      if (includeMaterials) {
        const { data: materials } = await db
          .from('game_materials')
          .select('*')
          .eq('game_id', g.id)
          .maybeSingle();
        
        if (materials) {
          const m = materials as AnySupabase;
          exportGame.materials = {
            items: m.items || [],
            safety_notes: m.safety_notes,
            preparation: m.preparation,
          };
        }
      }
      
      // Fetch phases if needed
      if (includePhases) {
        const { data: phases } = await db
          .from('game_phases')
          .select('*')
          .eq('game_id', g.id)
          .order('phase_order', { ascending: true });
        
        if (phases) {
          exportGame.phases = phases.map((p: AnySupabase) => ({
            phase_order: p.phase_order,
            name: p.name,
            phase_type: p.phase_type as 'intro' | 'round' | 'finale' | 'break',
            duration_seconds: p.duration_seconds,
            timer_visible: p.timer_visible,
            timer_style: p.timer_style as 'countdown' | 'elapsed' | 'trafficlight',
            description: p.description,
            board_message: p.board_message,
            auto_advance: p.auto_advance,
          }));
        }
      }
      
      // Fetch roles if needed
      if (includeRoles) {
        const { data: roles } = await db
          .from('game_roles')
          .select('*')
          .eq('game_id', g.id)
          .order('role_order', { ascending: true });
        
        if (roles) {
          exportGame.roles = roles.map((r: AnySupabase) => ({
            role_order: r.role_order,
            name: r.name,
            icon: r.icon,
            color: r.color,
            public_description: r.public_description,
            private_instructions: r.private_instructions,
            private_hints: r.private_hints,
            min_count: r.min_count,
            max_count: r.max_count,
            assignment_strategy: r.assignment_strategy as 'random' | 'leader_picks' | 'player_picks',
            scaling_rules: r.scaling_rules as Record<string, number> | null,
            conflicts_with: r.conflicts_with || [],
          }));
        }
      }
      
      // Fetch board config if needed
      if (includeBoardConfig) {
        const { data: boardConfig } = await db
          .from('game_board_config')
          .select('*')
          .eq('game_id', g.id)
          .maybeSingle();
        
        if (boardConfig) {
          const bc = boardConfig as AnySupabase;
          exportGame.boardConfig = {
            show_game_name: bc.show_game_name,
            show_current_phase: bc.show_current_phase,
            show_timer: bc.show_timer,
            show_participants: bc.show_participants,
            show_public_roles: bc.show_public_roles,
            show_leaderboard: bc.show_leaderboard,
            show_qr_code: bc.show_qr_code,
            welcome_message: bc.welcome_message,
            theme: bc.theme as 'mystery' | 'party' | 'sport' | 'nature' | 'neutral',
            background_color: bc.background_color,
            layout_variant: bc.layout_variant as 'standard' | 'fullscreen',
          };
        }
      }
      
      exportableGames.push(exportGame);
    }
    
    // Generate export data
    const exportOptions: ExportOptions = {
      format,
      includeSteps,
      includeMaterials,
      includePhases,
      includeRoles,
      includeBoardConfig,
    };
    
    if (format === 'json') {
      const json = generateGamesJson(exportableGames);
      const filename = `games-export-${new Date().toISOString().split('T')[0]}.json`;
      
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
    
    // Default: CSV
    const csv = generateGamesCsv(exportableGames, exportOptions);
    const filename = `games-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    console.error('[csv-export] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Ett oväntat fel uppstod' },
      { status: 500 }
    );
  }
}
