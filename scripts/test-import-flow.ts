/**
 * Test script that imports a game via the API and verifies DB state
 * 
 * Run with: npx tsx scripts/test-import-flow.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const _API_URL = 'http://localhost:3000';

// Test game JSON (simple version with steps and phases)
const testGameJson = [
  {
    game_key: 'debug-test-game-001',
    name: 'Debug Test Game',
    short_description: 'A test game for debugging import',
    description: 'This is a test game to verify the import flow writes steps, phases, etc.',
    play_mode: 'facilitated',
    status: 'draft',
    energy_level: 'medium',
    location_type: 'indoor',
    min_players: 4,
    max_players: 8,
    time_estimate_min: 30,
    steps: [
      { step_order: 1, title: 'Step 1', body: 'First step body' },
      { step_order: 2, title: 'Step 2', body: 'Second step body' },
      { step_order: 3, title: 'Step 3', body: 'Third step body' },
    ],
    phases: [
      { phase_order: 1, name: 'Intro Phase', phase_type: 'intro', timer_visible: false },
      { phase_order: 2, name: 'Main Phase', phase_type: 'round', timer_visible: true, duration_seconds: 300 },
    ],
    roles: [
      { role_order: 1, name: 'Leader', private_instructions: 'You lead the game' },
      { role_order: 2, name: 'Observer', private_instructions: 'You observe' },
    ],
    artifacts: [
      { 
        artifact_order: 1, 
        title: 'Test Card', 
        artifact_type: 'card',
        variants: [{ visibility: 'public', title: 'Card Variant', body: 'Card content' }]
      }
    ],
    triggers: [
      {
        name: 'Start trigger',
        condition: { type: 'manual' },
        actions: [{ type: 'advance_step' }],
        execute_once: true
      }
    ]
  }
];

async function main() {
  console.log('\n🧪 TEST IMPORT FLOW\n');
  console.log('=' .repeat(60));
  
  // Get auth token (we need to login first or use service key)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  // For testing, we'll use the Supabase client directly
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // First, delete any existing test game
  console.log('\n📌 1. CLEANING UP EXISTING TEST GAME...\n');
  
  const { data: existingGame } = await supabase
    .from('games')
    .select('id')
    .eq('game_key', 'debug-test-game-001')
    .maybeSingle();
  
  if (existingGame) {
    console.log(`Found existing game: ${existingGame.id}, deleting...`);
    
    // Delete related data first
    await supabase.from('game_artifact_variants').delete().in('artifact_id', 
      (await supabase.from('game_artifacts').select('id').eq('game_id', existingGame.id)).data?.map(a => a.id) || []
    );
    await supabase.from('game_artifacts').delete().eq('game_id', existingGame.id);
    await supabase.from('game_triggers').delete().eq('game_id', existingGame.id);
    await supabase.from('game_steps').delete().eq('game_id', existingGame.id);
    await supabase.from('game_phases').delete().eq('game_id', existingGame.id);
    await supabase.from('game_roles').delete().eq('game_id', existingGame.id);
    await supabase.from('game_materials').delete().eq('game_id', existingGame.id);
    await supabase.from('game_board_config').delete().eq('game_id', existingGame.id);
    await supabase.from('game_secondary_purposes').delete().eq('game_id', existingGame.id);
    await supabase.from('games').delete().eq('id', existingGame.id);
    
    console.log('✅ Deleted existing game and related data');
  } else {
    console.log('No existing test game found');
  }
  
  // Now simulate what the import API does
  console.log('\n📌 2. SIMULATING IMPORT (STEP BY STEP)...\n');
  
  const game = testGameJson[0];
  
  // Step 2a: Insert game into games table
  console.log('2a. Inserting game into games table...');
  
  const gameData = {
    game_key: game.game_key,
    name: game.name,
    short_description: game.short_description,
    description: game.description,
    play_mode: game.play_mode,
    status: game.status,
    energy_level: game.energy_level,
    location_type: game.location_type,
    min_players: game.min_players,
    max_players: game.max_players,
    time_estimate_min: game.time_estimate_min,
  };
  
  const { data: newGame, error: insertError } = await supabase
    .from('games')
    .insert(gameData)
    .select('id')
    .single();
  
  if (insertError || !newGame) {
    console.log('❌ Failed to insert game:', insertError?.message);
    return;
  }
  
  console.log(`✅ Game inserted: ${newGame.id}`);
  
  // Step 2b: Call RPC with related data
  console.log('\n2b. Calling upsert_game_content_v1 RPC...');
  
  const { randomUUID } = await import('crypto');
  
  // Prepare step rows with UUIDs
  const stepRows = game.steps.map((step, index) => ({
    id: randomUUID(),
    step_order: step.step_order ?? index + 1,
    title: step.title,
    body: step.body,
    duration_seconds: null,
    leader_script: null,
    participant_prompt: null,
    board_text: null,
    optional: false,
    locale: null,
    phase_id: null,
    conditional: null,
    media_ref: null,
    display_mode: null,
  }));
  
  // Prepare phase rows with UUIDs
  const phaseRows = game.phases.map((phase, index) => ({
    id: randomUUID(),
    phase_order: phase.phase_order ?? index + 1,
    name: phase.name,
    phase_type: phase.phase_type ?? 'round',
    duration_seconds: phase.duration_seconds ?? null,
    timer_visible: phase.timer_visible ?? true,
    timer_style: 'countdown',
    description: null,
    board_message: null,
    auto_advance: false,
    locale: null,
  }));
  
  // Prepare role rows with UUIDs
  const roleRows = game.roles.map((role, index) => ({
    id: randomUUID(),
    role_order: role.role_order ?? index + 1,
    name: role.name,
    icon: null,
    color: null,
    public_description: null,
    private_instructions: role.private_instructions ?? '',
    private_hints: null,
    min_count: 1,
    max_count: null,
    assignment_strategy: 'random',
    scaling_rules: null,
    conflicts_with: null,
    locale: null,
  }));
  
  // Prepare artifact rows with UUIDs
  const artifactRows = game.artifacts.map((artifact, index) => ({
    id: randomUUID(),
    artifact_order: artifact.artifact_order ?? index + 1,
    artifact_type: artifact.artifact_type,
    title: artifact.title,
    description: null,
    metadata: {},
    tags: [],
    locale: null,
  }));
  
  // Prepare variant rows
  const variantRows = game.artifacts.flatMap((artifact, i) => 
    (artifact.variants || []).map((v, j) => ({
      artifact_id: artifactRows[i].id,
      visibility: v.visibility ?? 'public',
      visible_to_role_id: null,
      title: v.title ?? null,
      body: v.body ?? null,
      media_ref: null,
      variant_order: j,
      metadata: {},
    }))
  );
  
  // Prepare trigger rows
  const triggerRows = game.triggers.map((trigger, index) => ({
    id: randomUUID(),
    name: trigger.name,
    description: null,
    enabled: true,
    condition: trigger.condition,
    actions: trigger.actions,
    execute_once: trigger.execute_once ?? false,
    delay_seconds: 0,
    sort_order: index,
  }));
  
  const payload = {
    game_id: newGame.id,
    is_update: false,
    import_run_id: randomUUID(),
    steps: stepRows,
    phases: phaseRows,
    roles: roleRows,
    artifacts: artifactRows,
    artifact_variants: variantRows,
    triggers: triggerRows,
    materials: null,
    board_config: null,
    secondary_purpose_ids: [],
  };
  
  console.log('\nPayload preview:');
  console.log(`  - game_id: ${payload.game_id}`);
  console.log(`  - is_update: ${payload.is_update}`);
  console.log(`  - steps: ${payload.steps.length}`);
  console.log(`  - phases: ${payload.phases.length}`);
  console.log(`  - roles: ${payload.roles.length}`);
  console.log(`  - artifacts: ${payload.artifacts.length}`);
  console.log(`  - artifact_variants: ${payload.artifact_variants.length}`);
  console.log(`  - triggers: ${payload.triggers.length}`);
  
  const { data: rpcResult, error: rpcError } = await supabase.rpc('upsert_game_content_v1', {
    p_payload: payload,
  });
  
  if (rpcError) {
    console.log('\n❌ RPC FAILED:', rpcError.message);
    console.log('   Code:', rpcError.code);
    console.log('   Details:', rpcError.details);
    return;
  }
  
  console.log('\n✅ RPC returned:', JSON.stringify(rpcResult, null, 2));
  
  // Step 3: Verify data was written
  console.log('\n📌 3. VERIFYING DATA IN DATABASE...\n');
  
  const [stepsRes, phasesRes, rolesRes, artifactsRes, triggersRes] = await Promise.all([
    supabase.from('game_steps').select('id, title').eq('game_id', newGame.id),
    supabase.from('game_phases').select('id, name').eq('game_id', newGame.id),
    supabase.from('game_roles').select('id, name').eq('game_id', newGame.id),
    supabase.from('game_artifacts').select('id, title').eq('game_id', newGame.id),
    supabase.from('game_triggers').select('id, name').eq('game_id', newGame.id),
  ]);
  
  console.log(`Steps in DB: ${stepsRes.data?.length ?? 0}`);
  stepsRes.data?.forEach(s => console.log(`  - ${s.title}`));
  
  console.log(`\nPhases in DB: ${phasesRes.data?.length ?? 0}`);
  phasesRes.data?.forEach(p => console.log(`  - ${p.name}`));
  
  console.log(`\nRoles in DB: ${rolesRes.data?.length ?? 0}`);
  rolesRes.data?.forEach(r => console.log(`  - ${r.name}`));
  
  console.log(`\nArtifacts in DB: ${artifactsRes.data?.length ?? 0}`);
  artifactsRes.data?.forEach(a => console.log(`  - ${a.title}`));
  
  console.log(`\nTriggers in DB: ${triggersRes.data?.length ?? 0}`);
  triggersRes.data?.forEach(t => console.log(`  - ${t.name}`));
  
  console.log('\n' + '=' .repeat(60));
  console.log('TEST COMPLETE\n');
}

main().catch(console.error);
