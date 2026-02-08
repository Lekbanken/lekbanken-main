/**
 * Test what happens when importing a game with invalid triggers
 * 
 * This answers GPT's question: Does invalid trigger → no game created?
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Payload with INVALID trigger (no condition or condition_type)
const INVALID_TRIGGER_PAYLOAD = JSON.stringify([{
  game_key: 'test-invalid-trigger-' + Date.now(),
  name: 'Test Invalid Trigger',
  description: 'This game has an invalid trigger',
  game_type: 'mission',
  min_players: 1,
  max_players: 4,
  difficulty: 'medium',
  play_duration_minutes: 15,
  steps: [
    { step_order: 1, title: 'Step 1', body: 'First step' }
  ],
  triggers: [
    {
      name: 'Invalid - no condition',
      actions: [{ type: 'reveal_artifact', artifactOrder: 1 }]
    }
  ]
}]);

async function main() {
  console.log('=== TEST: Invalid Trigger → No Game Created? ===\n');
  
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  
  // Extract game_key from payload
  const parsed = JSON.parse(INVALID_TRIGGER_PAYLOAD);
  const gameKey = parsed[0].game_key;
  console.log('Game key:', gameKey);
  
  // Check game doesn't exist before
  const { data: beforeGame } = await supabase
    .from('games')
    .select('id')
    .eq('game_key', gameKey)
    .single();
  
  console.log('Before import - game exists:', !!beforeGame);
  
  // Call the API
  console.log('\nCalling /api/games/csv-import...');
  
  const response = await fetch('http://localhost:3000/api/games/csv-import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rawPayload: INVALID_TRIGGER_PAYLOAD,
      format: 'json',
      mode: 'upsert',
      validateOnly: false,
      defaultStatus: 'draft',
    }),
  });
  
  console.log('Response status:', response.status);
  
  const result = await response.json();
  console.log('\nResponse body:');
  console.log(JSON.stringify(result, null, 2));
  
  // Check game after
  const { data: afterGame } = await supabase
    .from('games')
    .select('id')
    .eq('game_key', gameKey)
    .single();
  
  console.log('\n=== RESULT ===');
  console.log('After import - game exists:', !!afterGame);
  
  if (afterGame) {
    console.log('❌ FAIL: Game was created even with invalid trigger!');
    console.log('   This is the "partial write" bug GPT warned about.');
    
    // Clean up
    await supabase.from('games').delete().eq('id', afterGame.id);
    console.log('   (Cleaned up test game)');
  } else {
    console.log('✅ PASS: Game was NOT created (fail-fast working)');
  }
}

main().catch(console.error);
