/**
 * SIMULATION: Trace the entire import flow step-by-step
 * 
 * This script simulates EXACTLY what the csv-import route does,
 * with detailed logging at each step to find where data is lost.
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

// Import the actual functions used by the route
import { parseGamesFromJsonPayload } from '../features/admin/games/utils/json-game-import';
import { validateGames } from '../features/admin/games/utils/game-validator';

async function main() {
  console.log('=== FULL IMPORT SIMULATION ===\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const importRunId = randomUUID();
  
  // Use the actual fixture file
  const fixturePath = path.join(process.cwd(), 'tests/fixtures/games/arkivets-sista-signal.json');
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  
  console.log('Step 1: Read raw JSON file');
  console.log('  File:', fixturePath);
  console.log('  Size:', raw.length, 'bytes');
  console.log('');

  // Step 2: Parse JSON (like route does)
  console.log('Step 2: Parse JSON using parseGamesFromJsonPayload');
  const parsedGames = parseGamesFromJsonPayload(raw);
  console.log('  Parsed games count:', parsedGames.length);
  
  if (parsedGames.length > 0) {
    const game = parsedGames[0];
    console.log('  First game:');
    console.log('    game_key:', game.game_key);
    console.log('    name:', game.name);
    console.log('    steps:', game.steps?.length ?? 'undefined');
    console.log('    phases:', game.phases?.length ?? 'undefined');
    console.log('    roles:', game.roles?.length ?? 'undefined');
    console.log('    artifacts:', game.artifacts?.length ?? 'undefined');
    console.log('    triggers:', game.triggers?.length ?? 'undefined');
    
    // Show actual steps content
    if (game.steps && game.steps.length > 0) {
      console.log('    Steps detail:');
      game.steps.forEach((s, i) => console.log(`      ${i+1}. ${s.title}`));
    }
  }
  console.log('');

  // Step 3: Validate games (like route does)
  console.log('Step 3: Validate games using validateGames');
  const validationResult = validateGames(parsedGames, {
    mode: 'upsert',
    validateOnly: false,
    defaultStatus: 'draft',
    defaultLocale: 'sv-SE',
  });
  
  console.log('  Valid games:', validationResult.validGames.length);
  console.log('  Invalid games:', validationResult.invalidGames.length);
  console.log('  Errors:', validationResult.allErrors.length);
  
  if (validationResult.allErrors.length > 0) {
    console.log('  Error details:');
    validationResult.allErrors.slice(0, 5).forEach(e => 
      console.log(`    - ${e.column}: ${e.message}`)
    );
  }
  
  // Check if steps survived validation
  if (validationResult.validGames.length > 0) {
    const validGame = validationResult.validGames[0];
    console.log('  Valid game after validation:');
    console.log('    steps:', validGame.steps?.length ?? 'undefined');
    console.log('    phases:', validGame.phases?.length ?? 'undefined');
    console.log('    roles:', validGame.roles?.length ?? 'undefined');
    console.log('    artifacts:', validGame.artifacts?.length ?? 'undefined');
    console.log('    triggers:', validGame.triggers?.length ?? 'undefined');
  }
  console.log('');

  if (validationResult.validGames.length === 0) {
    console.log('❌ No valid games - stopping here');
    return;
  }

  // Step 4: Create test game in database
  console.log('Step 4: Create test game in database');
  const game = validationResult.validGames[0];
  const testGameKey = `sim-import-${Date.now()}`;
  
  const { data: newGame, error: insertError } = await supabase
    .from('games')
    .insert({
      game_key: testGameKey,
      name: game.name,
      play_mode: game.play_mode,
      status: game.status,
    })
    .select('id')
    .single();

  if (insertError || !newGame) {
    console.log('  ❌ Failed to create game:', insertError?.message);
    return;
  }

  const gameId = newGame.id;
  console.log('  ✅ Game created:', gameId);
  console.log('');

  // Step 5: Prepare payload for RPC (exactly like importRelatedData)
  console.log('Step 5: Prepare RPC payload');
  
  // Pre-generate step IDs
  const stepIdByOrder = new Map<number, string>();
  const stepRows = (game.steps ?? []).map((step, index) => {
    const stepOrder = step.step_order ?? index + 1;
    const id = randomUUID();
    stepIdByOrder.set(stepOrder, id);
    return {
      id,
      step_order: stepOrder,
      title: step.title,
      body: step.body,
      duration_seconds: step.duration_seconds ?? null,
      leader_script: step.leader_script ?? null,
      participant_prompt: step.participant_prompt ?? null,
      board_text: step.board_text ?? null,
      optional: step.optional ?? false,
      locale: null,
      phase_id: null,
      conditional: null,
      media_ref: null,
      display_mode: null,
    };
  });

  console.log('  stepRows prepared:', stepRows.length);
  if (stepRows.length > 0) {
    console.log('    First step:', stepRows[0].title);
  }

  // Pre-generate phase IDs
  const phaseIdByOrder = new Map<number, string>();
  const phaseRows = (game.phases ?? []).map((phase, index) => {
    const phaseOrder = phase.phase_order ?? index + 1;
    const id = randomUUID();
    phaseIdByOrder.set(phaseOrder, id);
    return {
      id,
      phase_order: phaseOrder,
      name: phase.name,
      phase_type: phase.phase_type ?? 'round',
      duration_seconds: phase.duration_seconds ?? null,
      timer_visible: phase.timer_visible ?? true,
      timer_style: phase.timer_style ?? 'countdown',
      description: phase.description ?? null,
      board_message: phase.board_message ?? null,
      auto_advance: phase.auto_advance ?? false,
      locale: null,
    };
  });

  console.log('  phaseRows prepared:', phaseRows.length);

  // Pre-generate role IDs
  const roleRows = (game.roles ?? []).map((role, index) => {
    const roleOrder = role.role_order ?? index + 1;
    const id = randomUUID();
    return {
      id,
      role_order: roleOrder,
      name: role.name,
      icon: role.icon ?? null,
      color: role.color ?? null,
      public_description: role.public_description ?? null,
      private_instructions: role.private_instructions ?? '',
      private_hints: role.private_hints ?? null,
      min_count: role.min_count ?? 1,
      max_count: role.max_count ?? null,
      assignment_strategy: role.assignment_strategy ?? 'random',
      scaling_rules: role.scaling_rules ?? null,
      conflicts_with: role.conflicts_with ?? null,
      locale: null,
    };
  });

  console.log('  roleRows prepared:', roleRows.length);

  // Pre-generate artifact IDs
  const artifactRows = (game.artifacts ?? []).map((artifact, index) => {
    const artifactOrder = artifact.artifact_order ?? index + 1;
    const id = randomUUID();
    return {
      id,
      artifact_order: artifactOrder,
      artifact_type: artifact.artifact_type,
      title: artifact.title,
      description: artifact.description ?? null,
      metadata: artifact.metadata ?? {},
      tags: artifact.tags ?? [],
      locale: artifact.locale ?? null,
    };
  });

  console.log('  artifactRows prepared:', artifactRows.length);

  // Build payload
  const payload = {
    game_id: gameId,
    is_update: false,
    import_run_id: importRunId,
    
    steps: stepRows.map(s => ({
      id: s.id,
      step_order: s.step_order,
      title: s.title,
      body: s.body,
      duration_seconds: s.duration_seconds,
      leader_script: s.leader_script,
      participant_prompt: s.participant_prompt,
      board_text: s.board_text,
      optional: s.optional,
      locale: s.locale,
      phase_id: s.phase_id,
      conditional: s.conditional,
      media_ref: s.media_ref,
      display_mode: s.display_mode,
    })),
    
    phases: phaseRows.map(p => ({
      id: p.id,
      phase_order: p.phase_order,
      name: p.name,
      phase_type: p.phase_type,
      duration_seconds: p.duration_seconds,
      timer_visible: p.timer_visible,
      timer_style: p.timer_style,
      description: p.description,
      board_message: p.board_message,
      auto_advance: p.auto_advance,
      locale: p.locale,
    })),
    
    roles: roleRows.map(r => ({
      id: r.id,
      role_order: r.role_order,
      name: r.name,
      icon: r.icon,
      color: r.color,
      public_description: r.public_description,
      private_instructions: r.private_instructions,
      private_hints: r.private_hints,
      min_count: r.min_count,
      max_count: r.max_count,
      assignment_strategy: r.assignment_strategy,
      scaling_rules: r.scaling_rules,
      conflicts_with: r.conflicts_with,
      locale: r.locale,
    })),
    
    materials: game.materials ? {
      items: game.materials.items || [],
      safety_notes: game.materials.safety_notes ?? null,
      preparation: game.materials.preparation ?? null,
      locale: null,
    } : null,
    
    board_config: game.boardConfig ? {
      show_game_name: game.boardConfig.show_game_name,
      show_current_phase: game.boardConfig.show_current_phase,
      show_timer: game.boardConfig.show_timer,
      show_participants: game.boardConfig.show_participants,
      show_public_roles: game.boardConfig.show_public_roles,
      show_leaderboard: game.boardConfig.show_leaderboard,
      show_qr_code: game.boardConfig.show_qr_code,
      welcome_message: game.boardConfig.welcome_message ?? null,
      theme: game.boardConfig.theme ?? 'neutral',
      background_color: game.boardConfig.background_color ?? null,
      layout_variant: game.boardConfig.layout_variant ?? 'standard',
      locale: null,
      background_media_id: null,
    } : null,
    
    secondary_purpose_ids: game.sub_purpose_ids ?? [],
    
    artifacts: artifactRows.map(a => ({
      id: a.id,
      artifact_order: a.artifact_order,
      artifact_type: a.artifact_type,
      title: a.title,
      description: a.description,
      metadata: a.metadata,
      tags: a.tags,
      locale: a.locale,
    })),
    
    artifact_variants: [],
    
    triggers: (game.triggers ?? []).map((t, index) => ({
      id: randomUUID(),
      name: t.name,
      description: t.description ?? null,
      enabled: t.enabled ?? true,
      condition: t.condition,
      actions: t.actions,
      execute_once: t.execute_once ?? false,
      delay_seconds: t.delay_seconds ?? 0,
      sort_order: t.sort_order ?? index,
    })),
  };

  console.log('');
  console.log('  Final payload counts:');
  console.log('    steps:', payload.steps.length);
  console.log('    phases:', payload.phases.length);
  console.log('    roles:', payload.roles.length);
  console.log('    artifacts:', payload.artifacts.length);
  console.log('    triggers:', payload.triggers.length);
  console.log('');

  // Step 6: Call RPC
  console.log('Step 6: Call RPC upsert_game_content_v1');
  
  const { data: rpcData, error: rpcError } = await supabase.rpc('upsert_game_content_v1', {
    p_payload: payload,
  });

  console.log('  RPC Error:', rpcError?.message ?? 'none');
  console.log('  RPC Result:', JSON.stringify(rpcData, null, 2));
  console.log('');

  if (rpcError || !rpcData?.ok) {
    console.log('  ❌ RPC failed');
    // Cleanup
    await supabase.from('games').delete().eq('id', gameId);
    return;
  }

  // Step 7: Verify data in database
  console.log('Step 7: Verify data in database');
  
  const [steps, phases, roles, artifacts, triggers] = await Promise.all([
    supabase.from('game_steps').select('id, step_order, title').eq('game_id', gameId).order('step_order'),
    supabase.from('game_phases').select('id, phase_order, name').eq('game_id', gameId).order('phase_order'),
    supabase.from('game_roles').select('id, role_order, name').eq('game_id', gameId).order('role_order'),
    supabase.from('game_artifacts').select('id, artifact_order, title').eq('game_id', gameId).order('artifact_order'),
    supabase.from('game_triggers').select('id, name').eq('game_id', gameId),
  ]);

  console.log('  Steps in DB:', steps.data?.length ?? 0);
  steps.data?.forEach(s => console.log(`    ${s.step_order}. ${s.title}`));
  
  console.log('  Phases in DB:', phases.data?.length ?? 0);
  phases.data?.forEach(p => console.log(`    ${p.phase_order}. ${p.name}`));
  
  console.log('  Roles in DB:', roles.data?.length ?? 0);
  roles.data?.forEach(r => console.log(`    ${r.role_order}. ${r.name}`));
  
  console.log('  Artifacts in DB:', artifacts.data?.length ?? 0);
  artifacts.data?.forEach(a => console.log(`    ${a.artifact_order}. ${a.title}`));
  
  console.log('  Triggers in DB:', triggers.data?.length ?? 0);
  triggers.data?.forEach(t => console.log(`    - ${t.name}`));

  // Compare expected vs actual
  console.log('\n=== COMPARISON ===');
  const expected = {
    steps: payload.steps.length,
    phases: payload.phases.length,
    roles: payload.roles.length,
    artifacts: payload.artifacts.length,
    triggers: payload.triggers.length,
  };
  
  const actual = {
    steps: steps.data?.length ?? 0,
    phases: phases.data?.length ?? 0,
    roles: roles.data?.length ?? 0,
    artifacts: artifacts.data?.length ?? 0,
    triggers: triggers.data?.length ?? 0,
  };

  let allMatch = true;
  for (const [key, exp] of Object.entries(expected)) {
    const act = actual[key as keyof typeof actual];
    const match = act === exp;
    console.log(`${match ? '✅' : '❌'} ${key}: expected ${exp}, got ${act}`);
    if (!match) allMatch = false;
  }

  if (allMatch) {
    console.log('\n🎉 SIMULATION SUCCESSFUL!');
    console.log('All data was written correctly.');
    console.log('The problem is NOT in the parsing/validation/RPC flow.');
    console.log('The problem might be in how the UI calls the API.');
  } else {
    console.log('\n💔 DATA MISMATCH FOUND!');
  }

  // Cleanup
  console.log('\nCleaning up test game...');
  await supabase.from('games').delete().eq('id', gameId);
  console.log('Done.');
}

main().catch(console.error);
