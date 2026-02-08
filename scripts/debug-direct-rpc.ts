/**
 * Debug script: Direct RPC call matching EXACTLY what importRelatedData sends
 * 
 * This uses the exact same payload structure as the import route
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

async function main() {
  console.log('=== DIRECT RPC DEBUG ===\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.log('Loading from .env.local...');
  }
  
  // Load env from .env.local
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const importRunId = randomUUID();
  
  // First, create a test game
  const gameKey = `direct-rpc-test-${Date.now()}`;
  console.log('1. Creating test game:', gameKey);
  
  const { data: newGame, error: insertError } = await supabase
    .from('games')
    .insert({
      game_key: gameKey,
      name: 'Direct RPC Test Game',
      play_mode: 'basic',
      status: 'draft',
    })
    .select('id')
    .single();

  if (insertError || !newGame) {
    console.error('Failed to create game:', insertError?.message);
    return;
  }

  const gameId = newGame.id;
  console.log('   Game created with ID:', gameId);

  // Build EXACT same payload structure as importRelatedData
  console.log('\n2. Building payload (exactly like importRelatedData)...');
  
  // Pre-generate UUIDs like importRelatedData does
  const stepIdByOrder = new Map<number, string>();
  const stepRows = [
    { step_order: 1, title: 'Step 1', body: 'First step' },
    { step_order: 2, title: 'Step 2', body: 'Second step' },
    { step_order: 3, title: 'Step 3', body: 'Third step' },
  ].map((step) => {
    const id = randomUUID();
    stepIdByOrder.set(step.step_order, id);
    return {
      id,
      game_id: gameId,
      step_order: step.step_order,
      title: step.title,
      body: step.body,
      duration_seconds: null,
      leader_script: null,
      participant_prompt: null,
      board_text: null,
      optional: false,
    };
  });

  const phaseIdByOrder = new Map<number, string>();
  const phaseRows = [
    { phase_order: 1, name: 'Phase 1', phase_type: 'timed' },
    { phase_order: 2, name: 'Phase 2', phase_type: 'untimed' },
  ].map((phase) => {
    const id = randomUUID();
    phaseIdByOrder.set(phase.phase_order, id);
    return {
      id,
      game_id: gameId,
      phase_order: phase.phase_order,
      name: phase.name,
      phase_type: phase.phase_type,
      duration_seconds: null,
      timer_visible: true,
      timer_style: 'countdown',
      description: null,
      board_message: null,
      auto_advance: false,
    };
  });

  const roleIdByOrder = new Map<number, string>();
  const roleRows = [
    { role_order: 1, name: 'Player', private_instructions: 'Play' },
    { role_order: 2, name: 'Observer', private_instructions: 'Watch' },
  ].map((role) => {
    const id = randomUUID();
    roleIdByOrder.set(role.role_order, id);
    return {
      id,
      game_id: gameId,
      role_order: role.role_order,
      name: role.name,
      icon: null,
      color: null,
      public_description: null,
      private_instructions: role.private_instructions,
      private_hints: null,
      min_count: 1,
      max_count: null,
      assignment_strategy: 'random',
      scaling_rules: null,
      conflicts_with: null,
      locale: null,
    };
  });

  const artifactIdByOrder = new Map<number, string>();
  const artifactRows = [
    { artifact_order: 1, artifact_type: 'card', title: 'Test Card' },
  ].map((artifact) => {
    const id = randomUUID();
    artifactIdByOrder.set(artifact.artifact_order, id);
    return {
      id,
      game_id: gameId,
      locale: null,
      title: artifact.title,
      description: null,
      artifact_type: artifact.artifact_type,
      artifact_order: artifact.artifact_order,
      tags: null,
      metadata: {},
    };
  });

  // Build EXACT payload structure (copied from route.ts lines 960-1050)
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
      locale: null,
      phase_id: null,
      conditional: null,
      media_ref: null,
      display_mode: null,
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
      locale: null,
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
    
    materials: null,
    board_config: null,
    secondary_purpose_ids: [],
    
    artifacts: artifactRows.map(a => ({
      id: a.id,
      artifact_order: a.artifact_order,
      artifact_type: a.artifact_type,
      title: a.title,
      description: a.description,
      metadata: a.metadata,
      tags: a.tags ?? [],
      locale: a.locale,
    })),
    
    artifact_variants: [],
    
    triggers: [
      {
        id: randomUUID(),
        name: 'Start trigger',
        description: null,
        enabled: true,
        condition: { type: 'game_started' },
        actions: [{ type: 'log', message: 'Game started' }],
        execute_once: true,
        delay_seconds: 0,
        sort_order: 1,
      },
    ],
  };

  console.log('   Payload built:');
  console.log('   - steps:', payload.steps.length);
  console.log('   - phases:', payload.phases.length);
  console.log('   - roles:', payload.roles.length);
  console.log('   - artifacts:', payload.artifacts.length);
  console.log('   - triggers:', payload.triggers.length);

  // Call RPC exactly like importRelatedData does
  console.log('\n3. Calling RPC upsert_game_content_v1...');
  
  const { data: rpcData, error: rpcError } = await supabase.rpc('upsert_game_content_v1', {
    p_payload: payload,
  });

  console.log('   RPC Response:');
  console.log('   - Error:', rpcError?.message ?? 'none');
  console.log('   - Data:', JSON.stringify(rpcData, null, 2));

  if (rpcError) {
    console.error('\n❌ RPC FAILED:', rpcError.message);
    return;
  }

  if (!rpcData?.ok) {
    console.error('\n❌ RPC returned ok=false:', rpcData?.error ?? 'unknown');
    return;
  }

  console.log('\n4. Verifying data in database...');
  
  const [steps, phases, roles, artifacts, triggers] = await Promise.all([
    supabase.from('game_steps').select('id, step_order, title').eq('game_id', gameId),
    supabase.from('game_phases').select('id, phase_order, name').eq('game_id', gameId),
    supabase.from('game_roles').select('id, role_order, name').eq('game_id', gameId),
    supabase.from('game_artifacts').select('id, artifact_order, title').eq('game_id', gameId),
    supabase.from('game_triggers').select('id, name').eq('game_id', gameId),
  ]);

  console.log('   Steps in DB:', steps.data?.length ?? 0, steps.error ? `(error: ${steps.error.message})` : '');
  if (steps.data) steps.data.forEach(s => console.log('     -', s.step_order, s.title));
  
  console.log('   Phases in DB:', phases.data?.length ?? 0, phases.error ? `(error: ${phases.error.message})` : '');
  if (phases.data) phases.data.forEach(p => console.log('     -', p.phase_order, p.name));
  
  console.log('   Roles in DB:', roles.data?.length ?? 0, roles.error ? `(error: ${roles.error.message})` : '');
  if (roles.data) roles.data.forEach(r => console.log('     -', r.role_order, r.name));
  
  console.log('   Artifacts in DB:', artifacts.data?.length ?? 0, artifacts.error ? `(error: ${artifacts.error.message})` : '');
  if (artifacts.data) artifacts.data.forEach(a => console.log('     -', a.artifact_order, a.title));
  
  console.log('   Triggers in DB:', triggers.data?.length ?? 0, triggers.error ? `(error: ${triggers.error.message})` : '');
  if (triggers.data) triggers.data.forEach(t => console.log('     -', t.name));

  // Summary
  const expected = { steps: 3, phases: 2, roles: 2, artifacts: 1, triggers: 1 };
  const actual = {
    steps: steps.data?.length ?? 0,
    phases: phases.data?.length ?? 0,
    roles: roles.data?.length ?? 0,
    artifacts: artifacts.data?.length ?? 0,
    triggers: triggers.data?.length ?? 0,
  };

  console.log('\n=== SUMMARY ===');
  let allMatch = true;
  for (const [key, exp] of Object.entries(expected)) {
    const act = actual[key as keyof typeof actual];
    const match = act === exp;
    console.log(`${match ? '✅' : '❌'} ${key}: expected ${exp}, got ${act}`);
    if (!match) allMatch = false;
  }

  if (allMatch) {
    console.log('\n🎉 ALL DATA WRITTEN CORRECTLY!');
    console.log('The RPC works perfectly when called with the correct payload.');
    console.log('The problem must be in how the import route calls it.');
  } else {
    console.log('\n💔 SOME DATA MISSING - there is a problem with the RPC!');
  }

  // Cleanup
  console.log('\n5. Cleaning up test game...');
  await supabase.from('games').delete().eq('id', gameId);
  console.log('   Done.');
}

main().catch(console.error);
