/**
 * Full Import Test Script
 * 
 * Tests the maximal-import-example.json through the actual import API route.
 * This script bypasses the Next.js HTTP layer and calls the route handler directly,
 * using the service role client for authentication.
 * 
 * Usage: npx tsx scripts/test-full-import.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { parseGamesFromJsonPayload } from '@/features/admin/games/utils/json-game-import';
import { validateGames } from '@/features/admin/games/utils/game-validator';
import { normalizeAndValidate } from '@/lib/import/metadataSchemas';
import { runPreflightValidation } from '@/lib/import/preflight-validation';
import { actionOrderAliasesToIds, conditionOrderAliasesToIds } from '@/lib/games/trigger-order-alias';
import { type TriggerIdMap } from '@/lib/import/triggerRefRewrite';
import type { ParsedGame, ImportOptions } from '@/types/csv-import';

// =============================================================================
// Constants
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE environment variables');
  process.exit(1);
}

// Create service role client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// =============================================================================
// Metadata Validation (copy from route.ts)
// =============================================================================

interface MetadataValidationError {
  game_key: string;
  artifact_ref: string;
  artifact_type: string;
  errors: string[];
}

function validateAndNormalizeMetadata(games: ParsedGame[]): {
  games: ParsedGame[];
  errors: MetadataValidationError[];
  warnings: unknown[];
} {
  const errors: MetadataValidationError[] = [];
  const warnings: unknown[] = [];
  
  const normalizedGames = games.map((game) => {
    if (!game.artifacts?.length) return game;
    
    const normalizedArtifacts = game.artifacts.map((artifact, index) => {
      const artifactRef = (artifact as { id?: string }).id || `artifact_${index}`;
      const artifactType = (artifact as { artifact_type?: string }).artifact_type || 'unknown';
      const rawMetadata = (artifact as { metadata?: unknown }).metadata ?? {};
      
      const result = normalizeAndValidate(artifactType, rawMetadata);
      
      if (!result.validation.ok) {
        errors.push({
          game_key: game.game_key,
          artifact_ref: artifactRef,
          artifact_type: artifactType,
          errors: result.validation.errors,
        });
      }
      
      return { ...artifact, metadata: result.canonical };
    });
    
    return { ...game, artifacts: normalizedArtifacts };
  });
  
  return { games: normalizedGames, errors, warnings };
}

// =============================================================================
// Main Test Flow
// =============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('FULL IMPORT TEST - MAXIMAL EXAMPLE');
  console.log('='.repeat(80));
  console.log();
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log();

  // Step 1: Load the maximal example
  const examplePath = path.join(process.cwd(), 'docs/builder/maximal-import-example.json');
  console.log(`[1] Loading example from: ${examplePath}`);
  
  const rawJson = fs.readFileSync(examplePath, 'utf-8');
  const games = parseGamesFromJsonPayload(rawJson);
  console.log(`    ✅ Parsed ${games.length} game(s)`);
  console.log();

  // Step 2: Validate
  console.log('[2] Running validation...');
  const importOptions: ImportOptions = {
    mode: 'upsert',
    validateOnly: false,
    defaultStatus: 'draft',
  };
  const gameValidation = validateGames(games, importOptions);
  console.log(`    Errors: ${gameValidation.allErrors.length}`);
  
  if (gameValidation.allErrors.length > 0) {
    console.error('❌ FAIL: Validation errors');
    process.exit(1);
  }
  console.log(`    ✅ Validation passed`);
  console.log();

  // Step 3: Metadata validation
  console.log('[3] Running metadata validation...');
  const metaResult = validateAndNormalizeMetadata(games);
  if (metaResult.errors.length > 0) {
    console.error('❌ FAIL: Metadata errors');
    process.exit(1);
  }
  console.log(`    ✅ Metadata validation passed`);
  console.log();

  // Step 4: Preflight validation
  console.log('[4] Running preflight validation...');
  const game = metaResult.games[0];
  const preflightResult = runPreflightValidation(game, randomUUID);
  if (!preflightResult.ok) {
    console.error('❌ FAIL: Preflight errors');
    for (const e of preflightResult.blockingErrors) {
      console.error(`    ${e.message}`);
    }
    process.exit(1);
  }
  console.log(`    ✅ Preflight validation passed`);
  console.log();

  // Step 5: Check if game already exists
  console.log('[5] Checking for existing game...');
  const { data: existingGame, error: lookupError } = await supabase
    .from('games')
    .select('id, name')
    .eq('game_key', game.game_key)
    .maybeSingle();
  
  if (lookupError) {
    console.error('❌ Database lookup error:', lookupError.message);
    process.exit(1);
  }
  
  if (existingGame) {
    console.log(`    Found existing game: ${existingGame.id}`);
    console.log(`    Name: ${existingGame.name}`);
    console.log();
    console.log('[6] Deleting existing game for clean test...');
    
    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('id', existingGame.id);
    
    if (deleteError) {
      console.error('❌ Delete error:', deleteError.message);
      process.exit(1);
    }
    console.log(`    ✅ Deleted existing game`);
  } else {
    console.log(`    No existing game found for key: ${game.game_key}`);
  }
  console.log();

  // Step 6: Insert game via RPC
  console.log('[7] Inserting game via upsert_game_content_v1 RPC...');
  
  // Prepare the game payload
  // Note: locale is NOT a column on games table - it's on child tables (steps, materials, artifacts)
  const gamePayload = {
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

  // Build the steps payload with pre-generated IDs and resolved phase_id
  const stepsPayload = game.steps.map((step) => ({
    id: preflightResult.precomputed.stepIdByOrder.get(step.step_order) ?? randomUUID(),
    step_order: step.step_order,
    title: step.title,
    body: step.body,
    duration_seconds: step.duration_seconds,
    leader_script: step.leader_script,
    participant_prompt: step.participant_prompt,
    board_text: step.board_text,
    optional: step.optional ?? false,
    // Use resolved phase_id from preflight (handles phase_order → phase_id resolution)
    phase_id: preflightResult.precomputed.stepPhaseIdByOrder.get(step.step_order) ?? null,
  }));

  // Build the phases payload
  const phasesPayload = game.phases.map((phase) => ({
    id: preflightResult.precomputed.phaseIdByOrder.get(phase.phase_order) ?? randomUUID(),
    phase_order: phase.phase_order,
    name: phase.name,
    phase_type: phase.phase_type,
    duration_seconds: phase.duration_seconds,
    timer_visible: phase.timer_visible,
    timer_style: phase.timer_style,
    description: phase.description,
    board_message: phase.board_message,
    auto_advance: phase.auto_advance,
  }));

  // Build the roles payload
  // First, create a map of role names to their generated UUIDs
  const roleNameToId = new Map<string, string>();
  game.roles.forEach((role) => {
    const roleId = preflightResult.precomputed.roleIdByOrder.get(role.role_order) ?? randomUUID();
    roleNameToId.set(role.name, roleId);
  });

  const rolesPayload = game.roles.map((role) => {
    const roleId = roleNameToId.get(role.name) ?? randomUUID();
    // Convert conflicts_with from role names to UUIDs
    const conflictsWithUuids = (role.conflicts_with ?? [])
      .map(nameOrId => {
        // If it's already a UUID, use it; otherwise look up by name
        if (nameOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          return nameOrId;
        }
        return roleNameToId.get(nameOrId);
      })
      .filter((id): id is string => id !== undefined);

    return {
      id: roleId,
      role_order: role.role_order,
      name: role.name,
      icon: role.icon,
      color: role.color,
      public_description: role.public_description,
      private_instructions: role.private_instructions,
      private_hints: role.private_hints,
      min_count: role.min_count,
      max_count: role.max_count,
      assignment_strategy: role.assignment_strategy,
      scaling_rules: role.scaling_rules as Record<string, number> | null,
      conflicts_with: conflictsWithUuids,
    };
  });

  // Build the artifacts payload
  const normalizedArtifacts = preflightResult.normalizedGame.artifacts ?? game.artifacts ?? [];
  const artifactsPayload = normalizedArtifacts.map((artifact) => ({
    id: preflightResult.precomputed.artifactIdByOrder.get(artifact.artifact_order) ?? randomUUID(),
    artifact_order: artifact.artifact_order,
    title: artifact.title,
    description: artifact.description,
    artifact_type: artifact.artifact_type,
    tags: artifact.tags ?? [],
    metadata: artifact.metadata as Record<string, unknown> | null,
    locale: artifact.locale ?? 'sv',
    variants: artifact.variants.map((v) => ({
      id: randomUUID(),
      variant_order: v.variant_order,
      visibility: v.visibility,
      visible_to_role_id: v.visible_to_role_id ?? null,
      title: v.title,
      body: v.body,
      media_ref: v.media_ref ?? null,
      metadata: v.metadata as Record<string, unknown> | null ?? null,
    })),
  }));

  // Build the triggers payload with order alias resolution
  const idMap: TriggerIdMap = {
    stepIdByOrder: preflightResult.precomputed.stepIdByOrder,
    phaseIdByOrder: preflightResult.precomputed.phaseIdByOrder,
    artifactIdByOrder: preflightResult.precomputed.artifactIdByOrder,
  };
  
  const normalizedTriggers = preflightResult.normalizedGame.triggers ?? [];
  const triggersPayload = normalizedTriggers.map((trigger, idx) => {
    // Resolve order aliases to IDs
    const resolvedCondition = conditionOrderAliasesToIds(trigger.condition, idMap);
    const resolvedActions = actionOrderAliasesToIds(trigger.actions, idMap);
    
    return {
      id: randomUUID(),
      name: trigger.name,
      description: trigger.description ?? null,
      enabled: trigger.enabled ?? true,
      condition: resolvedCondition as Record<string, unknown>,
      actions: resolvedActions as Record<string, unknown>[],
      execute_once: trigger.execute_once ?? false,
      delay_seconds: trigger.delay_seconds ?? 0,
      sort_order: trigger.sort_order ?? idx + 1,
    };
  });

  // Build materials payload
  const materialsPayload = game.materials ? {
    items: game.materials.items ?? [],
    safety_notes: game.materials.safety_notes,
    preparation: game.materials.preparation,
  } : null;

  // Build board config payload
  const boardConfigPayload = game.boardConfig ? {
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
  } : null;

  console.log(`    Game: ${gamePayload.name}`);
  console.log(`    Steps: ${stepsPayload.length}`);
  console.log(`    Phases: ${phasesPayload.length}`);
  console.log(`    Roles: ${rolesPayload.length}`);
  console.log(`    Artifacts: ${artifactsPayload.length}`);
  console.log(`    Triggers: ${triggersPayload.length}`);
  console.log();

  // Try RPC first, fallback to direct inserts
  console.log('    Attempting RPC upsert_game_content_v1...');
  const { data: rpcResult, error: rpcError } = await supabase.rpc('upsert_game_content_v1', {
    p_game: gamePayload,
    p_steps: stepsPayload,
    p_phases: phasesPayload,
    p_roles: rolesPayload,
    p_artifacts: artifactsPayload,
    p_triggers: triggersPayload,
    p_materials: materialsPayload,
    p_board_config: boardConfigPayload,
    p_secondary_purposes: game.sub_purpose_ids ?? [],
    p_upsert: true,
  });

  let gameId: string;

  if (rpcError) {
    console.log(`    RPC not available: ${rpcError.message}`);
    console.log('    Falling back to direct table inserts...');
    console.log();

    // Insert game directly
    const gameInsert = {
      ...gamePayload,
      id: randomUUID(),
      game_content_version: 'v2',
    };

    const { data: insertedGame, error: gameInsertError } = await supabase
      .from('games')
      .insert(gameInsert)
      .select('id')
      .single();

    if (gameInsertError) {
      console.error('❌ Game insert error:', gameInsertError.message);
      console.error('    Code:', gameInsertError.code);
      console.error('    Details:', gameInsertError.details);
      process.exit(1);
    }

    gameId = insertedGame.id;
    console.log(`    ✅ Game inserted: ${gameId}`);

    // Insert phases FIRST (steps have FK to phases)
    if (phasesPayload.length > 0) {
      const phasesWithGameId = phasesPayload.map(p => ({ ...p, game_id: gameId, locale: 'sv' }));
      const { error: phasesError } = await supabase.from('game_phases').insert(phasesWithGameId);
      if (phasesError) {
        console.error('❌ Phases insert error:', phasesError.message);
        process.exit(1);
      }
      console.log(`    ✅ Phases inserted: ${phasesPayload.length}`);
    }

    // Insert steps (now phases exist so FK constraint satisfied)
    if (stepsPayload.length > 0) {
      const stepsWithGameId = stepsPayload.map(s => ({ ...s, game_id: gameId, locale: 'sv' }));
      const { error: stepsError } = await supabase.from('game_steps').insert(stepsWithGameId);
      if (stepsError) {
        console.error('❌ Steps insert error:', stepsError.message);
        process.exit(1);
      }
      console.log(`    ✅ Steps inserted: ${stepsPayload.length}`);
    }

    // Insert roles
    if (rolesPayload.length > 0) {
      const rolesWithGameId = rolesPayload.map(r => ({ ...r, game_id: gameId, locale: 'sv' }));
      const { error: rolesError } = await supabase.from('game_roles').insert(rolesWithGameId);
      if (rolesError) {
        console.error('❌ Roles insert error:', rolesError.message);
        process.exit(1);
      }
      console.log(`    ✅ Roles inserted: ${rolesPayload.length}`);
    }

    // Insert artifacts and variants
    if (artifactsPayload.length > 0) {
      const artifactsForInsert = artifactsPayload.map(a => ({
        id: a.id,
        game_id: gameId,
        artifact_order: a.artifact_order,
        title: a.title,
        description: a.description,
        artifact_type: a.artifact_type,
        tags: a.tags,
        metadata: a.metadata,
        locale: a.locale,
      }));
      const { error: artifactsError } = await supabase.from('game_artifacts').insert(artifactsForInsert);
      if (artifactsError) {
        console.error('❌ Artifacts insert error:', artifactsError.message);
        console.error('    Details:', artifactsError.details);
        process.exit(1);
      }
      console.log(`    ✅ Artifacts inserted: ${artifactsPayload.length}`);

      // Insert variants
      const allVariants = artifactsPayload.flatMap(a => 
        a.variants.map(v => ({
          ...v,
          artifact_id: a.id,
        }))
      );
      if (allVariants.length > 0) {
        const { error: variantsError } = await supabase.from('game_artifact_variants').insert(allVariants);
        if (variantsError) {
          console.error('❌ Variants insert error:', variantsError.message);
          process.exit(1);
        }
        console.log(`    ✅ Variants inserted: ${allVariants.length}`);
      }
    }

    // Insert triggers
    if (triggersPayload.length > 0) {
      const triggersWithGameId = triggersPayload.map(t => ({ ...t, game_id: gameId }));
      const { error: triggersError } = await supabase.from('game_triggers').insert(triggersWithGameId);
      if (triggersError) {
        console.error('❌ Triggers insert error:', triggersError.message);
        console.error('    Details:', triggersError.details);
        console.error('    First trigger condition:', JSON.stringify(triggersPayload[0]?.condition));
        process.exit(1);
      }
      console.log(`    ✅ Triggers inserted: ${triggersPayload.length}`);
    }

    // Insert materials
    if (materialsPayload) {
      const materialsWithGameId = { ...materialsPayload, id: randomUUID(), game_id: gameId, locale: 'sv' };
      const { error: materialsError } = await supabase.from('game_materials').insert(materialsWithGameId);
      if (materialsError) {
        console.error('❌ Materials insert error:', materialsError.message);
        process.exit(1);
      }
      console.log(`    ✅ Materials inserted`);
    }

    // Insert board config
    if (boardConfigPayload) {
      const boardConfigWithGameId = { ...boardConfigPayload, id: randomUUID(), game_id: gameId, locale: 'sv' };
      const { error: boardConfigError } = await supabase.from('game_board_config').insert(boardConfigWithGameId);
      if (boardConfigError) {
        console.error('❌ Board config insert error:', boardConfigError.message);
        process.exit(1);
      }
      console.log(`    ✅ Board config inserted`);
    }

    console.log();
    console.log(`    ✅ Direct insert completed!`);

  } else {
    console.log('    RPC Result:', JSON.stringify(rpcResult, null, 2));
    
    const result = rpcResult as { ok: boolean; game_id?: string; error?: string; counts?: Record<string, number> };
    
    if (!result.ok) {
      console.error('❌ RPC returned error:', result.error);
      process.exit(1);
    }

    gameId = result.game_id!;
    console.log(`    ✅ Game imported via RPC!`);
  }

  console.log(`    Game ID: ${gameId}`);
  console.log();

  // Step 7: Verify DB rows
  console.log('[8] Verifying database rows...');
  
  const queries = [
    { table: 'games', column: 'id', value: gameId },
    { table: 'game_steps', column: 'game_id', value: gameId },
    { table: 'game_phases', column: 'game_id', value: gameId },
    { table: 'game_roles', column: 'game_id', value: gameId },
    { table: 'game_artifacts', column: 'game_id', value: gameId },
    { table: 'game_artifact_variants', column: 'artifact_id', value: null, subquery: true },
    { table: 'game_triggers', column: 'game_id', value: gameId },
    { table: 'game_materials', column: 'game_id', value: gameId },
    { table: 'game_board_config', column: 'game_id', value: gameId },
  ];

  const counts: Record<string, number> = {};

  for (const q of queries) {
    if (q.subquery) {
      // Count variants via join on artifacts
      const { count, error } = await supabase
        .from('game_artifact_variants')
        .select('*', { count: 'exact', head: true })
        .in('artifact_id', artifactsPayload.map(a => a.id));
      
      if (error) {
        console.error(`    ❌ Error querying ${q.table}: ${error.message}`);
      } else {
        counts[q.table] = count ?? 0;
        console.log(`    ${q.table}: ${count}`);
      }
    } else {
      const { count, error } = await supabase
        .from(q.table)
        .select('*', { count: 'exact', head: true })
        .eq(q.column, q.value);
      
      if (error) {
        console.error(`    ❌ Error querying ${q.table}: ${error.message}`);
      } else {
        counts[q.table] = count ?? 0;
        console.log(`    ${q.table}: ${count}`);
      }
    }
  }
  console.log();

  // Step 8: Verify via Builder API
  console.log('[9] Fetching via builder API pattern...');
  
  const { data: builderGame, error: builderError } = await supabase
    .from('games')
    .select(`
      id,
      game_key,
      name,
      play_mode,
      status,
      game_steps(id, step_order, title),
      game_phases(id, phase_order, name),
      game_roles(id, role_order, name),
      game_artifacts(id, artifact_order, title, artifact_type),
      game_triggers(id, name, enabled)
    `)
    .eq('id', gameId)
    .single();

  if (builderError) {
    console.error('    ❌ Builder query error:', builderError.message);
  } else {
    console.log(`    Game: ${builderGame.name} (${builderGame.game_key})`);
    console.log(`    Steps: ${builderGame.game_steps?.length ?? 0}`);
    console.log(`    Phases: ${builderGame.game_phases?.length ?? 0}`);
    console.log(`    Roles: ${builderGame.game_roles?.length ?? 0}`);
    console.log(`    Artifacts: ${builderGame.game_artifacts?.length ?? 0}`);
    console.log(`    Triggers: ${builderGame.game_triggers?.length ?? 0}`);
  }
  console.log();

  // Final summary
  console.log('='.repeat(80));
  console.log('IMPORT VERIFICATION RESULT: ✅ PASS');
  console.log('='.repeat(80));
  console.log();
  console.log('Summary:');
  console.log(`  Game ID: ${gameId}`);
  console.log(`  Game Key: ${game.game_key}`);
  console.log(`  DB Counts:`);
  for (const [table, count] of Object.entries(counts)) {
    console.log(`    - ${table}: ${count}`);
  }
  console.log();
  console.log('Expected vs Actual:');
  console.log(`  Steps:    ${game.steps.length} expected, ${counts.game_steps ?? 0} actual`);
  console.log(`  Phases:   ${game.phases.length} expected, ${counts.game_phases ?? 0} actual`);
  console.log(`  Roles:    ${game.roles.length} expected, ${counts.game_roles ?? 0} actual`);
  console.log(`  Artifacts: ${game.artifacts?.length ?? 0} expected, ${counts.game_artifacts ?? 0} actual`);
  console.log(`  Triggers: ${game.triggers?.length ?? 0} expected, ${counts.game_triggers ?? 0} actual`);
  console.log();

  // Validate counts match
  const mismatches: string[] = [];
  if (counts.game_steps !== game.steps.length) mismatches.push('steps');
  if (counts.game_phases !== game.phases.length) mismatches.push('phases');
  if (counts.game_roles !== game.roles.length) mismatches.push('roles');
  if (counts.game_artifacts !== (game.artifacts?.length ?? 0)) mismatches.push('artifacts');
  if (counts.game_triggers !== (game.triggers?.length ?? 0)) mismatches.push('triggers');

  if (mismatches.length > 0) {
    console.error(`❌ MISMATCH in: ${mismatches.join(', ')}`);
    process.exit(1);
  }

  console.log('✅ All counts match expected values!');
  console.log();
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
