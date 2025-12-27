/**
 * CSV Import API for Games
 * 
 * POST /api/games/csv-import
 * Imports games from CSV or JSON format.
 * 
 * Supports:
 * - dry_run mode for validation without database changes
 * - upsert mode for updating existing games by game_key
 * - All three play modes: basic, facilitated, participants
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { parseCsvGames } from '@/features/admin/games/utils/csv-parser';
import { validateGames } from '@/features/admin/games/utils/game-validator';
import type { ParsedGame, DryRunResult, DryRunGamePreview, ImportError } from '@/types/csv-import';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

type ImportPayload = {
  data: string;
  format: 'csv' | 'json';
  dry_run?: boolean;
  upsert?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportPayload;
    const { data, format, dry_run = false, upsert = true } = body;

    if (!data || typeof data !== 'string') {
      return NextResponse.json(
        { error: 'Ingen data skickades' },
        { status: 400 }
      );
    }

    // Parse input data
    let parsedGames: ParsedGame[];
    let parseErrors: ImportError[] = [];
    let parseWarnings: ImportError[] = [];

    if (format === 'csv') {
      const result = parseCsvGames(data);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Kunde inte tolka CSV-data', errors: result.errors },
          { status: 400 }
        );
      }
      parsedGames = result.games;
      parseErrors = result.errors;
      parseWarnings = result.warnings;
    } else {
      // JSON format
      try {
        const jsonData = JSON.parse(data);
        if (!Array.isArray(jsonData)) {
          return NextResponse.json(
            { error: 'JSON måste vara en array' },
            { status: 400 }
          );
        }
        // Convert JSON to ParsedGame format
        parsedGames = jsonData.map((item: AnySupabase) => ({
          game_key: item.game_key || null,
          name: item.name || '',
          short_description: item.short_description || '',
          description: item.description || null,
          play_mode: item.play_mode || 'basic',
          status: item.status || 'draft',
          locale: item.locale || 'sv-SE',
          energy_level: item.energy_level || null,
          location_type: item.location_type || null,
          time_estimate_min: item.time_estimate_min || null,
          duration_max: item.duration_max || null,
          min_players: item.min_players || null,
          max_players: item.max_players || null,
          players_recommended: item.players_recommended || null,
          age_min: item.age_min || null,
          age_max: item.age_max || null,
          difficulty: item.difficulty || null,
          accessibility_notes: item.accessibility_notes || null,
          space_requirements: item.space_requirements || null,
          leader_tips: item.leader_tips || null,
          main_purpose_id: item.main_purpose_id || null,
          sub_purpose_ids: Array.isArray(item.sub_purpose_ids) 
            ? item.sub_purpose_ids 
            : (item.sub_purpose_id ? [item.sub_purpose_id] : []),
          product_id: item.product_id || null,
          owner_tenant_id: item.owner_tenant_id || null,
          steps: item.steps || [],
          materials: item.materials || null,
          phases: item.phases || [],
          roles: item.roles || [],
          boardConfig: item.boardConfig || null,

          artifacts: item.artifacts || undefined,
          decisions: item.decisions || undefined,
          outcomes: item.outcomes || undefined,
          triggers: item.triggers || undefined,
        }));
      } catch {
        return NextResponse.json(
          { error: 'Kunde inte tolka JSON-data' },
          { status: 400 }
        );
      }
    }

    if (parsedGames.length === 0) {
      return NextResponse.json(
        { error: 'Inga giltiga spel hittades i datan' },
        { status: 400 }
      );
    }

    // Validate all games
    const defaultOptions = {
      mode: upsert ? 'upsert' as const : 'create' as const,
      validateOnly: dry_run,
      defaultStatus: 'draft' as const,
      defaultLocale: 'sv-SE',
    };
    
    const validationResult = validateGames(parsedGames, defaultOptions);

    // Dry run mode - return validation result without saving
    if (dry_run) {
      const dryRunGames: DryRunGamePreview[] = parsedGames.map((game, index) => ({
        row_number: index + 1,
        game_key: game.game_key,
        name: game.name,
        play_mode: game.play_mode,
        status: game.status,
        steps: game.steps,
      }));

      const allErrors = [...parseErrors, ...validationResult.allErrors];
      const allWarnings = [...parseWarnings, ...validationResult.allWarnings];

      const dryRunResult: DryRunResult = {
        valid: allErrors.length === 0,
        total_rows: parsedGames.length,
        valid_count: validationResult.validGames.length,
        warning_count: allWarnings.length,
        error_count: allErrors.length,
        errors: allErrors,
        warnings: allWarnings,
        games: dryRunGames,
      };
      
      return NextResponse.json(dryRunResult);
    }

    // If there are NO valid games, don't proceed with import
    if (validationResult.validGames.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Inga giltiga spel att importera',
        stats: {
          total: parsedGames.length,
          created: 0,
          updated: 0,
          skipped: validationResult.invalidGames.length,
        },
        errors: validationResult.allErrors,
        warnings: validationResult.allWarnings,
      }, { status: 400 });
    }

    // Proceed with actual import (only valid games)
    const supabase = await createServiceRoleClient();
    const db = supabase as AnySupabase;

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const importErrors: ImportError[] = [];

    for (let index = 0; index < validationResult.validGames.length; index++) {
      const game = validationResult.validGames[index];
      const rowNumber = index + 1;

      try {
        // Check if game exists by game_key
        let existingGameId: string | null = null;
        
        if (upsert && game.game_key) {
          const { data: existing } = await db
            .from('games')
            .select('id')
            .eq('game_key', game.game_key)
            .maybeSingle();
          
          if (existing && existing.id) {
            existingGameId = existing.id;
          }
        }

        // Prepare game data
        const gameData = {
          game_key: game.game_key,
          name: game.name,
          short_description: game.short_description,
          description: game.description,
          play_mode: game.play_mode,
          status: game.status,
          energy_level: game.energy_level,
          location_type: game.location_type,
          time_estimate_min: game.time_estimate_min,
          duration_max: game.duration_max,
          min_players: game.min_players,
          max_players: game.max_players,
          players_recommended: game.players_recommended,
          age_min: game.age_min,
          age_max: game.age_max,
          difficulty: game.difficulty,
          accessibility_notes: game.accessibility_notes,
          space_requirements: game.space_requirements,
          leader_tips: game.leader_tips,
          main_purpose_id: game.main_purpose_id,
          product_id: game.product_id,
          owner_tenant_id: game.owner_tenant_id,
        };

        let gameId: string;

        if (existingGameId) {
          // Update existing game
          const { error: updateError } = await db
            .from('games')
            .update(gameData)
            .eq('id', existingGameId);

          if (updateError) {
            throw new Error(updateError.message);
          }
          gameId = existingGameId;
          updatedCount++;
        } else {
          // Insert new game
          const { data: newGame, error: insertError } = await db
            .from('games')
            .insert(gameData)
            .select('id')
            .single();

          if (insertError || !newGame) {
            throw new Error(insertError?.message || 'Kunde inte skapa spel');
          }
          gameId = newGame.id;
          createdCount++;
        }

        // Handle related data (steps, materials, phases, roles, boardConfig)
        await importRelatedData(db, gameId, game, existingGameId !== null);

      } catch (err) {
        failedCount++;
        importErrors.push({
          row: rowNumber,
          column: 'general',
          message: err instanceof Error ? err.message : 'Okänt fel',
          severity: 'error',
        });
      }
    }

    return NextResponse.json({
      success: failedCount === 0,
      stats: {
        total: parsedGames.length,
        created: createdCount,
        updated: updatedCount,
        skipped: failedCount,
      },
      errors: importErrors,
      warnings: [...parseWarnings, ...validationResult.allWarnings],
    });

  } catch (error) {
    console.error('[csv-import] Error:', error);
    return NextResponse.json(
      { error: 'Servern kunde inte behandla förfrågan' },
      { status: 500 }
    );
  }
}

/**
 * Import related data for a game (steps, materials, phases, roles, boardConfig)
 */
async function importRelatedData(
  db: AnySupabase,
  gameId: string,
  game: ParsedGame,
  isUpdate: boolean
) {
  // If updating, delete old related data first
  if (isUpdate) {
    await db.from('game_steps').delete().eq('game_id', gameId);
    await db.from('game_materials').delete().eq('game_id', gameId);
    await db.from('game_phases').delete().eq('game_id', gameId);
    await db.from('game_roles').delete().eq('game_id', gameId);
    await db.from('game_board_config').delete().eq('game_id', gameId);
    await db.from('game_secondary_purposes').delete().eq('game_id', gameId);

    // Play primitives (artifacts) - delete artifacts by game_id (variants cascade)
    await db.from('game_artifacts').delete().eq('game_id', gameId);
    
    // Triggers - delete existing triggers
    await db.from('game_triggers').delete().eq('game_id', gameId);
  }

  // Insert secondary purposes (sub-purposes)
  if (game.sub_purpose_ids && game.sub_purpose_ids.length > 0) {
    const purposeRows = game.sub_purpose_ids.map(purposeId => ({
      game_id: gameId,
      purpose_id: purposeId,
    }));
    await db.from('game_secondary_purposes').insert(purposeRows);
  }

  // Insert steps
  if (game.steps && game.steps.length > 0) {
    const stepRows = game.steps.map((step, index) => ({
      game_id: gameId,
      step_order: step.step_order ?? index + 1,
      title: step.title,
      body: step.body,
      duration_seconds: step.duration_seconds,
      leader_script: step.leader_script,
      participant_prompt: step.participant_prompt,
      board_text: step.board_text,
      optional: step.optional ?? false,
    }));
    await db.from('game_steps').insert(stepRows);
  }

  // Insert materials
  if (game.materials) {
    await db.from('game_materials').insert({
      game_id: gameId,
      items: game.materials.items || [],
      safety_notes: game.materials.safety_notes,
      preparation: game.materials.preparation,
    });
  }

  // Insert phases (for participants play mode)
  if (game.phases && game.phases.length > 0) {
    const phaseRows = game.phases.map((phase, index) => ({
      game_id: gameId,
      phase_order: phase.phase_order ?? index + 1,
      name: phase.name,
      phase_type: phase.phase_type,
      duration_seconds: phase.duration_seconds,
      timer_visible: phase.timer_visible,
      timer_style: phase.timer_style,
      description: phase.description,
      board_message: phase.board_message,
      auto_advance: phase.auto_advance,
    }));
    await db.from('game_phases').insert(phaseRows);
  }

  // Insert roles (for participants play mode)
  if (game.roles && game.roles.length > 0) {
    const roleRows = game.roles.map((role, index) => ({
      game_id: gameId,
      role_order: role.role_order ?? index + 1,
      name: role.name,
      icon: role.icon,
      color: role.color,
      public_description: role.public_description,
      private_instructions: role.private_instructions,
      private_hints: role.private_hints,
      min_count: role.min_count,
      max_count: role.max_count,
      assignment_strategy: role.assignment_strategy,
      scaling_rules: role.scaling_rules,
      conflicts_with: role.conflicts_with,
    }));
    await db.from('game_roles').insert(roleRows);
  }

  // Insert board config
  if (game.boardConfig) {
    await db.from('game_board_config').insert({
      game_id: gameId,
      show_game_name: game.boardConfig.show_game_name,
      show_current_phase: game.boardConfig.show_current_phase,
      show_timer: game.boardConfig.show_timer,
      show_participants: game.boardConfig.show_participants,
      show_public_roles: game.boardConfig.show_public_roles,
      show_leaderboard: game.boardConfig.show_leaderboard,
      show_qr_code: game.boardConfig.show_qr_code,
      welcome_message: game.boardConfig.welcome_message,
      theme: game.boardConfig.theme,
      background_color: game.boardConfig.background_color,
      layout_variant: game.boardConfig.layout_variant,
    });
  }

  // Insert artifacts (author-time primitives)
  if (game.artifacts && game.artifacts.length > 0) {
    // Build a role map for resolving visible_to_role_* aliases
    const { data: roleRows } = await db
      .from('game_roles')
      .select('id, role_order, name')
      .eq('game_id', gameId);

    const roleByOrder = new Map<number, string>();
    const roleByName = new Map<string, string>();
    for (const r of roleRows ?? []) {
      if (typeof r.role_order === 'number' && r.id) roleByOrder.set(r.role_order as number, r.id as string);
      if (typeof r.name === 'string' && r.id) roleByName.set((r.name as string).toLowerCase(), r.id as string);
    }

    for (const artifact of game.artifacts) {
      const { data: insertedArtifact, error: aErr } = await db
        .from('game_artifacts')
        .insert({
          game_id: gameId,
          locale: artifact.locale,
          title: artifact.title,
          description: artifact.description,
          artifact_type: artifact.artifact_type,
          artifact_order: artifact.artifact_order,
          tags: artifact.tags,
          metadata: artifact.metadata ?? {},
        })
        .select('id')
        .single();

      if (aErr || !insertedArtifact?.id) {
        throw new Error(aErr?.message || 'Kunde inte skapa game_artifact');
      }

      const artifactId = insertedArtifact.id as string;

      if (artifact.variants && artifact.variants.length > 0) {
        const variantRows = artifact.variants.map((v) => {
          let visibleToRoleId = v.visible_to_role_id ?? null;
          if (!visibleToRoleId && typeof v.visible_to_role_order === 'number') {
            visibleToRoleId = roleByOrder.get(v.visible_to_role_order) ?? null;
          }
          if (!visibleToRoleId && typeof v.visible_to_role_name === 'string') {
            visibleToRoleId = roleByName.get(v.visible_to_role_name.toLowerCase()) ?? null;
          }

          return {
            artifact_id: artifactId,
            visibility: v.visibility,
            visible_to_role_id: visibleToRoleId,
            title: v.title,
            body: v.body,
            media_ref: v.media_ref ?? null,
            variant_order: v.variant_order,
            metadata: v.metadata ?? {},
          };
        });

        const { error: vErr } = await db.from('game_artifact_variants').insert(variantRows);
        if (vErr) throw new Error(vErr.message);
      }
    }
  }

  // Insert triggers (automation rules)
  if (game.triggers && game.triggers.length > 0) {
    // Build lookup maps for resolving order-based aliases to IDs
    const { data: stepRows } = await db
      .from('game_steps')
      .select('id, step_order')
      .eq('game_id', gameId);
    
    const { data: phaseRows } = await db
      .from('game_phases')
      .select('id, phase_order')
      .eq('game_id', gameId);
    
    const { data: artifactRows } = await db
      .from('game_artifacts')
      .select('id, artifact_order')
      .eq('game_id', gameId);

    const stepByOrder = new Map<number, string>();
    for (const s of stepRows ?? []) {
      if (typeof s.step_order === 'number' && s.id) {
        stepByOrder.set(s.step_order as number, s.id as string);
      }
    }

    const phaseByOrder = new Map<number, string>();
    for (const p of phaseRows ?? []) {
      if (typeof p.phase_order === 'number' && p.id) {
        phaseByOrder.set(p.phase_order as number, p.id as string);
      }
    }

    const artifactByOrder = new Map<number, string>();
    for (const a of artifactRows ?? []) {
      if (typeof a.artifact_order === 'number' && a.id) {
        artifactByOrder.set(a.artifact_order as number, a.id as string);
      }
    }

    const triggerRows = game.triggers.map((trigger, index) => {
      // Resolve condition IDs from order aliases
      const resolvedCondition = resolveConditionIds(
        trigger.condition,
        stepByOrder,
        phaseByOrder,
        artifactByOrder
      );

      // Resolve action IDs from order aliases
      const resolvedActions = trigger.actions.map(action => 
        resolveActionIds(action, artifactByOrder)
      );

      return {
        game_id: gameId,
        name: trigger.name,
        description: trigger.description ?? null,
        enabled: trigger.enabled ?? true,
        condition: resolvedCondition,
        actions: resolvedActions,
        execute_once: trigger.execute_once ?? false,
        delay_seconds: trigger.delay_seconds ?? 0,
        sort_order: trigger.sort_order ?? index,
      };
    });

    const { error: triggerErr } = await db.from('game_triggers').insert(triggerRows);
    if (triggerErr) throw new Error(triggerErr.message);
  }
}

/**
 * Resolve order-based aliases in trigger conditions to actual IDs
 */
function resolveConditionIds(
  condition: AnySupabase,
  stepByOrder: Map<number, string>,
  phaseByOrder: Map<number, string>,
  artifactByOrder: Map<number, string>
): AnySupabase {
  const resolved = { ...condition };
  
  // Step-related conditions
  if ((condition.type === 'step_started' || condition.type === 'step_completed') && !condition.stepId && typeof condition.stepOrder === 'number') {
    resolved.stepId = stepByOrder.get(condition.stepOrder) ?? null;
    delete resolved.stepOrder;
  }
  
  // Phase-related conditions
  if ((condition.type === 'phase_started' || condition.type === 'phase_completed') && !condition.phaseId && typeof condition.phaseOrder === 'number') {
    resolved.phaseId = phaseByOrder.get(condition.phaseOrder) ?? null;
    delete resolved.phaseOrder;
  }
  
  // Artifact-related conditions
  if (condition.type === 'artifact_unlocked' && !condition.artifactId && typeof condition.artifactOrder === 'number') {
    resolved.artifactId = artifactByOrder.get(condition.artifactOrder) ?? null;
    delete resolved.artifactOrder;
  }
  
  // Keypad conditions (keypadId is typically an artifact ID)
  if ((condition.type === 'keypad_correct' || condition.type === 'keypad_failed') && !condition.keypadId && typeof condition.artifactOrder === 'number') {
    resolved.keypadId = artifactByOrder.get(condition.artifactOrder) ?? null;
    delete resolved.artifactOrder;
  }
  
  return resolved;
}

/**
 * Resolve order-based aliases in trigger actions to actual IDs
 */
function resolveActionIds(
  action: AnySupabase,
  artifactByOrder: Map<number, string>
): AnySupabase {
  const resolved = { ...action };
  
  // Artifact-related actions
  if ((action.type === 'reveal_artifact' || action.type === 'hide_artifact') && !action.artifactId && typeof action.artifactOrder === 'number') {
    resolved.artifactId = artifactByOrder.get(action.artifactOrder) ?? null;
    delete resolved.artifactOrder;
  }
  
  return resolved;
}
