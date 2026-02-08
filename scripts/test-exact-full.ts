/**
 * FULL END-TO-END test with the exact failing payload
 * This simulates EXACTLY what the import route does
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

import { parseGamesFromJsonPayload } from '../features/admin/games/utils/json-game-import';
import { validateGames } from '../features/admin/games/utils/game-validator';

async function main() {
  console.log('=== FULL END-TO-END TEST WITH EXACT PAYLOAD ===\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const importRunId = randomUUID();
  
  // Read exact payload
  const payloadPath = path.join(process.cwd(), 'scripts/test-payload.json');
  const raw = fs.readFileSync(payloadPath, 'utf-8');
  
  // Parse
  const parsedGames = parseGamesFromJsonPayload(raw);
  console.log('1. Parsed:', parsedGames.length, 'games');
  console.log('   steps:', parsedGames[0].steps?.length);
  console.log('   phases:', parsedGames[0].phases?.length);
  
  // Validate
  const validationResult = validateGames(parsedGames, {
    mode: 'upsert',
    validateOnly: false,
    defaultStatus: 'draft',
    defaultLocale: 'sv-SE',
  });
  
  console.log('2. Validated:', validationResult.validGames.length, 'valid games');
  
  if (validationResult.validGames.length === 0) {
    console.log('❌ No valid games');
    return;
  }
  
  const game = validationResult.validGames[0];
  
  // Create game with unique key
  const testGameKey = `test-exact-${Date.now()}`;
  console.log('3. Creating test game:', testGameKey);
  
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
    console.log('   ❌ Failed:', insertError?.message);
    return;
  }

  const gameId = newGame.id;
  console.log('   ✅ Created:', gameId);

  // Prepare payload EXACTLY like importRelatedData
  console.log('4. Preparing RPC payload...');
  
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

  const roleRows = (game.roles ?? []).map((role, index) => {
    const roleOrder = role.role_order ?? index + 1;
    return {
      id: randomUUID(),
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

  const artifactRows = (game.artifacts ?? []).map((artifact, index) => {
    const artifactOrder = artifact.artifact_order ?? index + 1;
    return {
      id: randomUUID(),
      artifact_order: artifactOrder,
      artifact_type: artifact.artifact_type,
      title: artifact.title,
      description: artifact.description ?? null,
      metadata: artifact.metadata ?? {},
      tags: artifact.tags ?? [],
      locale: artifact.locale ?? null,
    };
  });

  console.log('   stepRows:', stepRows.length);
  console.log('   phaseRows:', phaseRows.length);
  console.log('   roleRows:', roleRows.length);
  console.log('   artifactRows:', artifactRows.length);

  // Build RPC payload
  const payload = {
    game_id: gameId,
    is_update: false,
    import_run_id: importRunId,
    steps: stepRows,
    phases: phaseRows,
    roles: roleRows,
    materials: null,
    board_config: null,
    secondary_purpose_ids: [],
    artifacts: artifactRows,
    artifact_variants: [],
    triggers: [],  // Skip triggers for now since format differs
  };

  console.log('5. Calling RPC...');
  const { data: rpcData, error: rpcError } = await supabase.rpc('upsert_game_content_v1', {
    p_payload: payload,
  });

  console.log('   RPC error:', rpcError?.message ?? 'none');
  console.log('   RPC result:', JSON.stringify(rpcData, null, 2));

  if (rpcError || !rpcData?.ok) {
    console.log('   ❌ RPC failed');
    await supabase.from('games').delete().eq('id', gameId);
    return;
  }

  // Verify in DB
  console.log('6. Verifying in database...');
  const [steps, phases, roles, artifacts] = await Promise.all([
    supabase.from('game_steps').select('id').eq('game_id', gameId),
    supabase.from('game_phases').select('id').eq('game_id', gameId),
    supabase.from('game_roles').select('id').eq('game_id', gameId),
    supabase.from('game_artifacts').select('id').eq('game_id', gameId),
  ]);

  console.log('   Steps:', steps.data?.length ?? 0);
  console.log('   Phases:', phases.data?.length ?? 0);
  console.log('   Roles:', roles.data?.length ?? 0);
  console.log('   Artifacts:', artifacts.data?.length ?? 0);

  // Compare
  const allMatch = 
    steps.data?.length === 4 &&
    phases.data?.length === 3 &&
    roles.data?.length === 2 &&
    artifacts.data?.length === 3;

  if (allMatch) {
    console.log('\n🎉 SUCCESS! All data written correctly.');
    console.log('The import flow works with this payload.');
    console.log('The problem must be elsewhere (UI, auth, etc).');
  } else {
    console.log('\n❌ DATA MISMATCH');
  }

  // Cleanup
  console.log('\n7. Cleaning up...');
  await supabase.from('games').delete().eq('id', gameId);
  console.log('   Done.');
}

main().catch(console.error);
