/**
 * Deep investigation of the failing game import
 * 
 * Questions to answer:
 * 1. Was materials created via RPC or via builder?
 * 2. What is the import_run_id pattern?
 * 3. Are there server logs we can look at?
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('=== DEEP INVESTIGATION ===\n');

  // Get the game
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('game_key', 'test-lekbanken-mission')
    .single();

  if (!game) {
    console.log('Game not found');
    return;
  }

  console.log('Game details:');
  console.log('  ID:', game.id);
  console.log('  Created:', game.created_at);
  console.log('  Updated:', game.updated_at);
  console.log('  Same timestamp?', game.created_at === game.updated_at);
  console.log('');

  // Get the materials record
  const { data: materials } = await supabase
    .from('game_materials')
    .select('*')
    .eq('game_id', game.id);

  console.log('Materials records:');
  if (materials?.length) {
    materials.forEach(m => {
      console.log('  ID:', m.id);
      console.log('  Created:', m.created_at);
      console.log('  Items:', m.items);
      console.log('  Safety notes:', m.safety_notes?.slice(0, 50));
    });
  } else {
    console.log('  No materials found');
  }

  // Check if this game was created BEFORE or AFTER the RPC migration
  console.log('\nTimeline analysis:');
  const rpcMigrationDate = new Date('2026-02-01T00:00:00Z');
  const gameCreatedDate = new Date(game.created_at);
  
  if (gameCreatedDate < rpcMigrationDate) {
    console.log('  ⚠️ Game was created BEFORE RPC migration (legacy import used)');
  } else {
    console.log('  ✅ Game was created AFTER RPC migration (should use new RPC)');
  }

  // Look at the JSON payload that would have been used
  console.log('\n--- Checking for patterns ---\n');

  // Does the game have any JSON-imported-looking data?
  console.log('Game metadata fields:');
  console.log('  main_purpose_id:', game.main_purpose_id);
  console.log('  product_id:', game.product_id);
  console.log('  owner_tenant_id:', game.owner_tenant_id);
  console.log('  difficulty:', game.difficulty);

  // Check if there's a pattern - maybe the JSON parser returns empty arrays?
  console.log('\n--- Testing JSON parser with test-lekbanken-mission data ---\n');
  
  // Let's look at what the user imported
  console.log('CONCLUSION:');
  console.log('Since materials were created but steps/phases/etc were NOT,');
  console.log('either:');
  console.log('  1. RPC was called with empty arrays for steps/phases/etc');
  console.log('  2. RPC returned ok:true but data wasn\'t actually inserted');
  console.log('  3. A different code path was used that only inserts materials');
  console.log('');
  console.log('NEXT STEP: Need to see the actual JSON that was imported');
  console.log('to understand if the data was present in the payload.');
}

main().catch(console.error);
