/**
 * Debug: Investigate the specific failing game "test-lekbanken-mission"
 * 
 * Goals:
 * 1. Find the game in the database
 * 2. Check if RPC was ever called (look for import_run_id pattern)
 * 3. Check the games table for clues
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('=== INVESTIGATING "test-lekbanken-mission" ===\n');

  // 1. Find the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('game_key', 'test-lekbanken-mission')
    .maybeSingle();

  if (gameError) {
    console.error('Error finding game:', gameError.message);
    return;
  }

  if (!game) {
    console.log('❌ Game "test-lekbanken-mission" NOT FOUND');
    console.log('\nLet me search for similar games...\n');
    
    // Search for games with "test" in the key
    const { data: testGames } = await supabase
      .from('games')
      .select('id, game_key, name, created_at')
      .ilike('game_key', '%test%')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('Games with "test" in key:');
    if (testGames?.length) {
      testGames.forEach(g => console.log(`  - ${g.game_key} (${g.name}) - created ${g.created_at}`));
    } else {
      console.log('  None found');
    }
    
    // Search for recent games
    console.log('\nMost recent games:');
    const { data: recentGames } = await supabase
      .from('games')
      .select('id, game_key, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentGames?.length) {
      for (const g of recentGames) {
        // Check related data for each
        const [steps, phases] = await Promise.all([
          supabase.from('game_steps').select('id').eq('game_id', g.id),
          supabase.from('game_phases').select('id').eq('game_id', g.id),
        ]);
        console.log(`  - ${g.game_key} (steps: ${steps.data?.length ?? 0}, phases: ${phases.data?.length ?? 0}) - ${g.created_at}`);
      }
    }
    
    return;
  }

  console.log('✅ Game found:');
  console.log('   ID:', game.id);
  console.log('   Key:', game.game_key);
  console.log('   Name:', game.name);
  console.log('   Status:', game.status);
  console.log('   Play mode:', game.play_mode);
  console.log('   Created:', game.created_at);
  console.log('   Updated:', game.updated_at);

  // 2. Check related data
  console.log('\n=== Related Data ===');
  
  const [steps, phases, roles, artifacts, triggers, materials] = await Promise.all([
    supabase.from('game_steps').select('id, step_order, title').eq('game_id', game.id).order('step_order'),
    supabase.from('game_phases').select('id, phase_order, name').eq('game_id', game.id).order('phase_order'),
    supabase.from('game_roles').select('id, role_order, name').eq('game_id', game.id).order('role_order'),
    supabase.from('game_artifacts').select('id, artifact_order, title').eq('game_id', game.id).order('artifact_order'),
    supabase.from('game_triggers').select('id, name').eq('game_id', game.id),
    supabase.from('game_materials').select('id').eq('game_id', game.id),
  ]);

  console.log(`Steps (${steps.data?.length ?? 0}):`);
  steps.data?.forEach(s => console.log(`   ${s.step_order}. ${s.title}`));
  
  console.log(`\nPhases (${phases.data?.length ?? 0}):`);
  phases.data?.forEach(p => console.log(`   ${p.phase_order}. ${p.name}`));
  
  console.log(`\nRoles (${roles.data?.length ?? 0}):`);
  roles.data?.forEach(r => console.log(`   ${r.role_order}. ${r.name}`));
  
  console.log(`\nArtifacts (${artifacts.data?.length ?? 0}):`);
  artifacts.data?.forEach(a => console.log(`   ${a.artifact_order}. ${a.title}`));
  
  console.log(`\nTriggers (${triggers.data?.length ?? 0}):`);
  triggers.data?.forEach(t => console.log(`   - ${t.name}`));
  
  console.log(`\nMaterials (${materials.data?.length ?? 0})`);

  // Summary
  const totalRelated = 
    (steps.data?.length ?? 0) + 
    (phases.data?.length ?? 0) + 
    (roles.data?.length ?? 0) + 
    (artifacts.data?.length ?? 0) + 
    (triggers.data?.length ?? 0);

  console.log('\n=== CONCLUSION ===');
  if (totalRelated === 0) {
    console.log('❌ Game exists but has NO related data!');
    console.log('   This confirms the import created the game record');
    console.log('   but importRelatedData did NOT write any child records.');
    console.log('\n   Possible causes:');
    console.log('   1. importRelatedData was never called');
    console.log('   2. importRelatedData threw an error that was caught silently');
    console.log('   3. The game.steps/phases/etc arrays were empty');
  } else {
    console.log('✅ Game has related data. The import worked for this game.');
  }
}

main().catch(console.error);
