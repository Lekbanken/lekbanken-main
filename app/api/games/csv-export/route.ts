/**
 * CSV Export API for Games
 * 
 * GET /api/games/csv-export
 * Exports games to CSV or JSON format with optional filtering.
 * 
 * @requires system_admin or tenant_admin role
 * 
 * NOTE: Uses 'any' typing for related tables (game_steps, game_phases, etc.)
 * because Supabase types are not yet regenerated after migrations.
 * Run `supabase gen types typescript` to fix this.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin, assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth';
import { generateGamesCsv, generateGamesJson } from '@/features/admin/games/utils/csv-generator';
import { actionIdsToOrderAliases, conditionIdsToOrderAliases } from '@/lib/games/trigger-order-alias';
import type { ExportableGame, ExportOptions, ParsedArtifactVisibility, ParsedTriggerAction, ParsedTriggerCondition } from '@/types/csv-import';
import type { Database } from '@/types/supabase';

type GameArtifactVariantRow = Database['public']['Tables']['game_artifact_variants']['Row'];

function asParsedVisibility(value: string | null | undefined): ParsedArtifactVisibility {
  if (value === 'leader_only' || value === 'role_private' || value === 'public') return value;
  return 'public';
}

export async function GET(request: Request) {
  // Authentication check
  const authClient = await createServerRlsClient();
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // Authorization: system_admin for global, tenant_admin for tenant-scoped
  if (tenantId && tenantId !== 'global') {
    const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - tenant admin required' }, { status: 403 });
    }
  } else if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required for global export' }, { status: 403 });
  }
  
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

    for (const game of games) {
      const g = game;
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
        const { data: steps } = await supabase
          .from('game_steps')
          .select('*')
          .eq('game_id', g.id)
          .order('step_order', { ascending: true });
        
        if (steps) {
          exportGame.steps = steps.map((s) => ({
            step_order: s.step_order,
            title: s.title || '',
            body: s.body || '',
            duration_seconds: s.duration_seconds,
            leader_script: s.leader_script,
            participant_prompt: s.participant_prompt,
            board_text: s.board_text,
            optional: s.optional ?? false,
          }));
        }
      }

      // Fetch secondary purposes
      const { data: secondaryPurposes } = await supabase
        .from('game_secondary_purposes')
        .select('purpose_id')
        .eq('game_id', g.id);

      exportGame.sub_purpose_ids = (secondaryPurposes ?? [])
        .map((p) => p.purpose_id)
        .filter(Boolean);
      
      // Fetch materials if needed
      if (includeMaterials) {
        const { data: materials } = await supabase
          .from('game_materials')
          .select('*')
          .eq('game_id', g.id)
          .maybeSingle();
        
        if (materials) {
          exportGame.materials = {
            items: materials.items || [],
            safety_notes: materials.safety_notes,
            preparation: materials.preparation,
          };
        }
      }
      
      // Fetch phases if needed
      if (includePhases) {
        const { data: phases } = await supabase
          .from('game_phases')
          .select('*')
          .eq('game_id', g.id)
          .order('phase_order', { ascending: true });
        
        if (phases) {
          exportGame.phases = phases.map((p) => ({
            phase_order: p.phase_order,
            name: p.name,
            phase_type: p.phase_type as 'intro' | 'round' | 'finale' | 'break',
            duration_seconds: p.duration_seconds,
            timer_visible: p.timer_visible ?? true,
            timer_style: p.timer_style as 'countdown' | 'elapsed' | 'trafficlight',
            description: p.description,
            board_message: p.board_message,
            auto_advance: p.auto_advance ?? false,
          }));
        }
      }
      
      // Fetch roles if needed
      if (includeRoles) {
        const { data: roles } = await supabase
          .from('game_roles')
          .select('*')
          .eq('game_id', g.id)
          .order('role_order', { ascending: true });
        
        if (roles) {
          exportGame.roles = roles.map((r) => ({
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
            scaling_rules: r.scaling_rules as unknown as Record<string, number> | null,
            conflicts_with: r.conflicts_with || [],
          }));
        }
      }
      
      // Fetch board config if needed
      if (includeBoardConfig) {
        const { data: boardConfig } = await supabase
          .from('game_board_config')
          .select('*')
          .eq('game_id', g.id)
          .maybeSingle();
        
        if (boardConfig) {
          exportGame.boardConfig = {
            show_game_name: boardConfig.show_game_name ?? true,
            show_current_phase: boardConfig.show_current_phase ?? true,
            show_timer: boardConfig.show_timer ?? true,
            show_participants: boardConfig.show_participants ?? true,
            show_public_roles: boardConfig.show_public_roles ?? true,
            show_leaderboard: boardConfig.show_leaderboard ?? false,
            show_qr_code: boardConfig.show_qr_code ?? false,
            welcome_message: boardConfig.welcome_message,
            theme: boardConfig.theme as 'mystery' | 'party' | 'sport' | 'nature' | 'neutral',
            background_color: boardConfig.background_color,
            layout_variant: boardConfig.layout_variant as 'standard' | 'fullscreen',
          };
        }
      }

      // Full-fidelity (Legendary) export for JSON format
      if (format === 'json') {
        // Build lookup maps for converting trigger references into order-based aliases
        const { data: stepOrderRows } = await supabase
          .from('game_steps')
          .select('id, step_order')
          .eq('game_id', g.id);
        const { data: phaseOrderRows } = await supabase
          .from('game_phases')
          .select('id, phase_order')
          .eq('game_id', g.id);

        const stepOrderById = new Map<string, number>();
        for (const s of stepOrderRows ?? []) {
          if (s?.id && typeof s.step_order === 'number') stepOrderById.set(s.id, s.step_order);
        }
        const phaseOrderById = new Map<string, number>();
        for (const p of phaseOrderRows ?? []) {
          if (p?.id && typeof p.phase_order === 'number') phaseOrderById.set(p.id, p.phase_order);
        }

        // Artifacts + variants
        const { data: artifacts } = await supabase
          .from('game_artifacts')
          .select('*')
          .eq('game_id', g.id)
          .order('artifact_order', { ascending: true });

        const artifactOrderById = new Map<string, number>();
        for (const a of artifacts ?? []) {
          if (a?.id && typeof a.artifact_order === 'number') artifactOrderById.set(a.id, a.artifact_order);
        }

        if (artifacts && artifacts.length > 0) {
          const artifactIds = artifacts.map((a) => a.id).filter(Boolean);

          let variants: GameArtifactVariantRow[] = [];
          if (artifactIds.length) {
            const { data } = await supabase
              .from('game_artifact_variants')
              .select('*')
              .in('artifact_id', artifactIds)
              .order('variant_order', { ascending: true });
            variants = data ?? [];
          }

          const variantsByArtifactId = new Map<string, GameArtifactVariantRow[]>();
          for (const v of variants ?? []) {
            if (!v?.artifact_id) continue;
            const list = variantsByArtifactId.get(v.artifact_id) ?? [];
            list.push(v);
            variantsByArtifactId.set(v.artifact_id, list);
          }

          exportGame.artifacts = artifacts.map((a) => {
            const artifactId = a.id;
            const artifactVariants = variantsByArtifactId.get(artifactId) ?? [];
            return {
              artifact_order: a.artifact_order,
              locale: a.locale ?? null,
              title: a.title,
              description: a.description ?? null,
              artifact_type: a.artifact_type,
              tags: a.tags ?? [],
              metadata: (a.metadata ?? {}) as unknown as Record<string, unknown>,
              variants: artifactVariants.map((v) => ({
                variant_order: v.variant_order,
                visibility: asParsedVisibility(v.visibility),
                visible_to_role_id: v.visible_to_role_id ?? null,
                title: v.title ?? null,
                body: v.body ?? null,
                media_ref: v.media_ref ?? null,
                metadata: (v.metadata ?? {}) as unknown as Record<string, unknown>,
              })),
            };
          });
        } else {
          exportGame.artifacts = [];
        }

        // Triggers
        const { data: triggers } = await supabase
          .from('game_triggers')
          .select('*')
          .eq('game_id', g.id)
          .order('sort_order', { ascending: true });

        exportGame.triggers = (triggers ?? []).map((t) => {
          const condition = conditionIdsToOrderAliases(t.condition, { stepOrderById, phaseOrderById, artifactOrderById }) as unknown as ParsedTriggerCondition;
          const actions = Array.isArray(t.actions)
            ? (t.actions.map((a) => actionIdsToOrderAliases(a, { artifactOrderById })) as unknown as ParsedTriggerAction[])
            : ([] as ParsedTriggerAction[]);
          return {
            name: t.name,
            description: t.description ?? null,
            enabled: t.enabled ?? true,
            condition,
            actions,
            execute_once: t.execute_once ?? false,
            delay_seconds: t.delay_seconds ?? 0,
            sort_order: t.sort_order ?? 0,
          };
        });
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
