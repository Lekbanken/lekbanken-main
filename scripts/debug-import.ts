/**
 * Debug script for verifying import flow and database state
 * 
 * Run with: npx tsx scripts/debug-import.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
// fs import removed - not used in this script

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('\n🔍 LEKBANKEN IMPORT DEBUG AUDIT\n');
  console.log('=' .repeat(60));
  
  // 1. Check if RPC function exists
  console.log('\n📌 1. CHECKING RPC FUNCTION EXISTS...\n');
  
  const { data: funcData, error: funcError } = await supabase.rpc('upsert_game_content_v1', {
    p_payload: { game_id: '00000000-0000-0000-0000-000000000000' } // Invalid ID to test
  });
  
  if (funcError) {
    if (funcError.message.includes('function') && funcError.message.includes('does not exist')) {
      console.log('❌ RPC FUNCTION DOES NOT EXIST!');
      console.log('   This is the ROOT CAUSE. The upsert_game_content_v1 function is missing.');
      console.log('   Run: npx supabase db push');
      return;
    } else if (funcError.message.includes('Game not found') || funcError.code === 'PGRST202') {
      console.log('✅ RPC function exists (returned expected "Game not found" error)');
    } else {
      console.log('⚠️ RPC function returned unexpected error:', funcError.message);
    }
  } else {
    console.log('⚠️ RPC returned data (unexpected for invalid game_id):', funcData);
  }
  
  // 2. Check game_steps table structure
  console.log('\n📌 2. CHECKING GAME_STEPS TABLE...\n');
  
  const { data: stepsCount, error: stepsError } = await supabase
    .from('game_steps')
    .select('id', { count: 'exact', head: true });
  
  if (stepsError) {
    console.log('❌ Cannot access game_steps table:', stepsError.message);
  } else {
    console.log(`✅ game_steps table accessible. Total rows: ${stepsCount}`);
  }
  
  // 3. Get all games and their related data counts
  console.log('\n📌 3. GAMES WITH RELATED DATA COUNTS...\n');
  
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, game_key, name, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (gamesError) {
    console.log('❌ Cannot fetch games:', gamesError.message);
    return;
  }
  
  console.log(`Found ${games?.length || 0} recent games:\n`);
  
  for (const game of games || []) {
    // Get counts for each related table
    const [stepsRes, phasesRes, artifactsRes, triggersRes, rolesRes] = await Promise.all([
      supabase.from('game_steps').select('id', { count: 'exact', head: true }).eq('game_id', game.id),
      supabase.from('game_phases').select('id', { count: 'exact', head: true }).eq('game_id', game.id),
      supabase.from('game_artifacts').select('id', { count: 'exact', head: true }).eq('game_id', game.id),
      supabase.from('game_triggers').select('id', { count: 'exact', head: true }).eq('game_id', game.id),
      supabase.from('game_roles').select('id', { count: 'exact', head: true }).eq('game_id', game.id),
    ]);
    
    const stepsCount = stepsRes.count ?? 0;
    const phasesCount = phasesRes.count ?? 0;
    const artifactsCount = artifactsRes.count ?? 0;
    const triggersCount = triggersRes.count ?? 0;
    const rolesCount = rolesRes.count ?? 0;
    
    const hasRelatedData = stepsCount > 0 || phasesCount > 0 || artifactsCount > 0;
    const status = hasRelatedData ? '✅' : '❌';
    
    console.log(`${status} ${game.game_key || game.id}`);
    console.log(`   Name: ${game.name}`);
    console.log(`   ID: ${game.id}`);
    console.log(`   Steps: ${stepsCount} | Phases: ${phasesCount} | Artifacts: ${artifactsCount} | Triggers: ${triggersCount} | Roles: ${rolesCount}`);
    console.log('');
  }
  
  // 4. Check for orphaned related data (data without parent game)
  console.log('\n📌 4. CHECKING FOR ORPHANED DATA...\n');
  
  const { data: orphanSteps } = await supabase
    .from('game_steps')
    .select('id, game_id')
    .limit(5);
  
  if (orphanSteps && orphanSteps.length > 0) {
    console.log(`Found ${orphanSteps.length} step rows. Sample game_ids:`);
    const uniqueGameIds = [...new Set(orphanSteps.map(s => s.game_id))];
    for (const gid of uniqueGameIds) {
      const { data: gameExists } = await supabase
        .from('games')
        .select('id, game_key')
        .eq('id', gid)
        .maybeSingle();
      
      if (!gameExists) {
        console.log(`   ❌ Orphaned: ${gid} (game does not exist)`);
      } else {
        console.log(`   ✅ Valid: ${gid} -> ${gameExists.game_key}`);
      }
    }
  } else {
    console.log('No step rows found at all.');
  }
  
  // 5. Test a minimal RPC call with a real game
  console.log('\n📌 5. TESTING RPC WITH REAL GAME...\n');
  
  if (games && games.length > 0) {
    const testGame = games[0];
    console.log(`Testing with game: ${testGame.game_key} (${testGame.id})`);
    
    const testPayload = {
      game_id: testGame.id,
      is_update: true,
      import_run_id: '00000000-0000-0000-0000-000000000001',
      steps: [],
      phases: [],
      roles: [],
      artifacts: [],
      artifact_variants: [],
      triggers: [],
      materials: null,
      board_config: null,
      secondary_purpose_ids: [],
    };
    
    console.log('Calling RPC with empty arrays (should delete existing data)...');
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('upsert_game_content_v1', {
      p_payload: testPayload,
    });
    
    if (rpcError) {
      console.log('❌ RPC FAILED:', rpcError.message);
      console.log('   Code:', rpcError.code);
      console.log('   Details:', rpcError.details);
      console.log('   Hint:', rpcError.hint);
    } else {
      console.log('✅ RPC returned:', JSON.stringify(rpcResult, null, 2));
      
      if (rpcResult && typeof rpcResult === 'object' && 'ok' in rpcResult) {
        if (rpcResult.ok) {
          console.log('\n🎉 RPC FUNCTION WORKS!');
          console.log('   Counts:', JSON.stringify(rpcResult.counts));
        } else {
          console.log('\n⚠️ RPC returned ok=false:', rpcResult.error, rpcResult.code);
        }
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('DEBUG COMPLETE\n');
}

main().catch(console.error);
