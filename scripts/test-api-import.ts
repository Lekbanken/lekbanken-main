/**
 * Test script to call the csv-import API endpoint exactly like the UI does
 * 
 * This will help identify if the problem is:
 * 1. In the API route itself
 * 2. In how the UI calls the API
 * 3. Something else
 */

// fs and path imports removed - not used in this script

const API_URL = 'http://localhost:3000/api/games/csv-import';

// Test JSON payload
const testJson = {
  games: [
    {
      game_key: 'api-test-game-' + Date.now(),
      name: 'API Test Game',
      short_description: 'Testing API import',
      play_mode: 'basic',
      status: 'draft',
      steps: [
        { step_order: 1, title: 'Step 1', body: 'First step' },
        { step_order: 2, title: 'Step 2', body: 'Second step' },
        { step_order: 3, title: 'Step 3', body: 'Third step' },
      ],
      phases: [
        { phase_order: 1, name: 'Phase 1', phase_type: 'timed' },
        { phase_order: 2, name: 'Phase 2', phase_type: 'untimed' },
      ],
      roles: [
        { role_order: 1, name: 'Player', private_instructions: 'Play the game' },
        { role_order: 2, name: 'Observer', private_instructions: 'Watch' },
      ],
      artifacts: [
        { artifact_order: 1, artifact_type: 'card', title: 'Test Card' },
      ],
      triggers: [
        {
          name: 'Start trigger',
          enabled: true,
          execute_once: true,
          delay_seconds: 0,
          sort_order: 1,
          condition: { type: 'game_started' },
          actions: [{ type: 'log', message: 'Game started' }],
        },
      ],
    },
  ],
};

async function testDryRun() {
  console.log('=== Testing DRY RUN ===');
  console.log('Sending to:', API_URL);
  console.log('Payload preview:', JSON.stringify(testJson.games[0], null, 2).slice(0, 500) + '...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: JSON.stringify(testJson),
        format: 'json',
        dry_run: true,
        upsert: true,
      }),
    });
    
    const result = await response.json();
    console.log('\nDry Run Response status:', response.status);
    console.log('Dry Run Result:', JSON.stringify(result, null, 2));
    
    if (result.valid) {
      console.log('\n✅ Validation PASSED');
      console.log('Total games:', result.total_rows);
      console.log('Valid count:', result.valid_count);
      
      if (result.games?.[0]) {
        const g = result.games[0];
        console.log('\nPreview counts:');
        console.log('  - steps:', g.steps?.length ?? 'N/A (steps is array:', Array.isArray(g.steps), ')');
        console.log('  - phases_count:', g.phases_count);
        console.log('  - artifacts_count:', g.artifacts_count);
        console.log('  - triggers_count:', g.triggers_count);
        console.log('  - roles_count:', g.roles_count);
      }
    } else {
      console.log('\n❌ Validation FAILED');
      console.log('Errors:', result.errors);
    }
    
    return result.valid;
  } catch (err) {
    console.error('Dry run request failed:', err);
    return false;
  }
}

async function testActualImport() {
  console.log('\n=== Testing ACTUAL IMPORT ===');
  console.log('Sending to:', API_URL);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: JSON.stringify(testJson),
        format: 'json',
        dry_run: false,
        upsert: true,
      }),
    });
    
    const result = await response.json();
    console.log('\nImport Response status:', response.status);
    console.log('Import Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Import SUCCEEDED');
      console.log('Stats:', result.stats);
      console.log('Cover stats:', result.coverStats);
    } else {
      console.log('\n❌ Import FAILED');
      console.log('Error:', result.error);
      console.log('Errors:', result.errors);
    }
    
    return result;
  } catch (err) {
    console.error('Import request failed:', err);
    return null;
  }
}

async function verifyInDatabase(gameKey: string) {
  // Import supabase client
  const { createServiceRoleClient } = await import('../lib/supabase/server');
  const supabase = await createServiceRoleClient();
  
  console.log('\n=== Verifying in Database ===');
  console.log('Looking for game_key:', gameKey);
  
  // Find the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, game_key, name')
    .eq('game_key', gameKey)
    .maybeSingle();
    
  if (gameError) {
    console.error('Error finding game:', gameError.message);
    return;
  }
  
  if (!game) {
    console.log('❌ Game NOT FOUND in database!');
    return;
  }
  
  console.log('✅ Game found:', game);
  
  // Check related data
  const [steps, phases, roles, artifacts, triggers] = await Promise.all([
    supabase.from('game_steps').select('id').eq('game_id', game.id),
    supabase.from('game_phases').select('id').eq('game_id', game.id),
    supabase.from('game_roles').select('id').eq('game_id', game.id),
    supabase.from('game_artifacts').select('id').eq('game_id', game.id),
    supabase.from('game_triggers').select('id').eq('game_id', game.id),
  ]);
  
  console.log('\nActual database counts:');
  console.log('  - Steps:', steps.data?.length ?? 0, steps.error ? `(error: ${steps.error.message})` : '');
  console.log('  - Phases:', phases.data?.length ?? 0, phases.error ? `(error: ${phases.error.message})` : '');
  console.log('  - Roles:', roles.data?.length ?? 0, roles.error ? `(error: ${roles.error.message})` : '');
  console.log('  - Artifacts:', artifacts.data?.length ?? 0, artifacts.error ? `(error: ${artifacts.error.message})` : '');
  console.log('  - Triggers:', triggers.data?.length ?? 0, triggers.error ? `(error: ${triggers.error.message})` : '');
  
  // Verify counts match expected
  const expected = {
    steps: 3,
    phases: 2,
    roles: 2,
    artifacts: 1,
    triggers: 1,
  };
  
  const actual = {
    steps: steps.data?.length ?? 0,
    phases: phases.data?.length ?? 0,
    roles: roles.data?.length ?? 0,
    artifacts: artifacts.data?.length ?? 0,
    triggers: triggers.data?.length ?? 0,
  };
  
  let allMatch = true;
  for (const [key, expectedCount] of Object.entries(expected)) {
    const actualCount = actual[key as keyof typeof actual];
    if (actualCount !== expectedCount) {
      console.log(`\n❌ MISMATCH: ${key} expected ${expectedCount}, got ${actualCount}`);
      allMatch = false;
    }
  }
  
  if (allMatch) {
    console.log('\n✅ ALL COUNTS MATCH EXPECTED!');
  } else {
    console.log('\n❌ SOME COUNTS DO NOT MATCH!');
  }
}

async function main() {
  console.log('Starting API import test...\n');
  
  // First, test dry run
  const dryRunValid = await testDryRun();
  
  if (!dryRunValid) {
    console.log('\nAborting: Dry run failed');
    process.exit(1);
  }
  
  // Then test actual import
  const importResult = await testActualImport();
  
  if (!importResult?.success) {
    console.log('\nImport failed');
    process.exit(1);
  }
  
  // Finally verify in database
  const gameKey = testJson.games[0].game_key;
  await verifyInDatabase(gameKey);
  
  console.log('\n=== TEST COMPLETE ===');
}

main().catch(console.error);
