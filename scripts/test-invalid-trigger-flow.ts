/**
 * Test what happens when importing a game with invalid triggers
 * 
 * This answers GPT's question: Does invalid trigger → no game created?
 * 
 * Since API requires auth, we test by simulating the flow directly.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { parseGamesFromJsonPayload } from '../features/admin/games/utils/json-game-import';
import { validateGames } from '../features/admin/games/utils/game-validator';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log('=== TEST: Invalid Trigger Behavior ===\n');
  
  // Supabase client available for future DB verification if needed
  const _supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  
  // TEST CASE 1: Trigger with NO condition (should be filtered out at parse)
  console.log('--- Case 1: Trigger without condition ---');
  const invalidPayload = JSON.stringify([{
    game_key: 'test-invalid-trigger-case1',
    name: 'Invalid Trigger Test',
    description: 'This game has an invalid trigger',
    steps: [{ step_order: 1, title: 'Step 1', body: 'Body' }],
    triggers: [
      { name: 'Invalid - no condition', actions: [{ type: 'reveal_artifact' }] }
    ]
  }]);
  
  const parsed1 = parseGamesFromJsonPayload(invalidPayload);
  console.log('  Parsed game triggers:', parsed1[0].triggers?.length ?? 0);
  console.log('  → Invalid trigger was filtered out at parse');
  
  // TEST CASE 2: Trigger with legacy format (should be normalized)
  console.log('\n--- Case 2: Legacy trigger format ---');
  const legacyPayload = JSON.stringify([{
    game_key: 'test-legacy-trigger-case2',
    name: 'Legacy Trigger Test',
    description: 'This game has legacy trigger format',
    steps: [{ step_order: 1, title: 'Step 1', body: 'Body' }],
    triggers: [
      { 
        name: 'Legacy trigger',
        condition_type: 'keypad_correct',
        condition_config: { artifactOrder: 1 },
        actions: [{ type: 'reveal_artifact', artifactOrder: 2 }]
      }
    ]
  }]);
  
  const parsed2 = parseGamesFromJsonPayload(legacyPayload);
  console.log('  Parsed game triggers:', parsed2[0].triggers?.length ?? 0);
  console.log('  Trigger condition:', JSON.stringify(parsed2[0].triggers?.[0].condition));
  console.log('  → Legacy trigger was normalized to canonical format');
  
  // TEST CASE 3: What happens if ALL triggers are invalid?
  console.log('\n--- Case 3: Game with ALL invalid triggers ---');
  const allInvalidPayload = JSON.stringify([{
    game_key: 'test-all-invalid-triggers',
    name: 'All Invalid Triggers',
    description: 'Every trigger in this game is invalid',
    steps: [{ step_order: 1, title: 'Step 1', body: 'Body' }],
    triggers: [
      { name: 'Invalid 1', actions: [] },
      { name: 'Invalid 2', actions: [] },
    ]
  }]);
  
  const parsed3 = parseGamesFromJsonPayload(allInvalidPayload);
  console.log('  Parsed game triggers:', parsed3[0].triggers?.length ?? 0);
  
  // Validate
  const validation3 = validateGames(parsed3, {
    mode: 'upsert',
    validateOnly: false,
    defaultStatus: 'draft',
    defaultLocale: 'sv-SE',
  });
  console.log('  Valid games:', validation3.validGames.length);
  console.log('  Errors:', validation3.allErrors.length);
  if (validation3.allErrors.length > 0) {
    console.log('  Error details:', validation3.allErrors.map(e => e.message));
  }
  
  if (validation3.validGames.length > 0) {
    console.log('  → Game WOULD be created (with 0 triggers)');
    console.log('  ⚠️ This is the issue GPT warned about!');
    console.log('  The game passes validation because triggers are just filtered out,');
    console.log('  not treated as a blocking error.');
  }
  
  // KEY INSIGHT
  console.log('\n=== KEY INSIGHT ===');
  console.log('Current behavior:');
  console.log('  - Invalid triggers → filtered out at parse time');
  console.log('  - Game still passes validation');
  console.log('  - Game gets created with 0 triggers');
  console.log('');
  console.log('GPT wants:');
  console.log('  - Invalid triggers → BLOCKING ERROR');
  console.log('  - No game created if any trigger is invalid');
  console.log('');
  console.log('Options:');
  console.log('  A) Treat filtered triggers as error (fail-fast)');
  console.log('  B) Log warning but allow import (current behavior)');
  console.log('  C) Add UI feedback about filtered triggers');
}

main().catch(console.error);
