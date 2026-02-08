/**
 * Test the EXACT JSON payload that was used in the failing import
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

// Import the actual functions used by the route
import { parseGamesFromJsonPayload } from '../features/admin/games/utils/json-game-import';
import { validateGames } from '../features/admin/games/utils/game-validator';

async function main() {
  console.log('=== TESTING EXACT FAILING PAYLOAD ===\n');
  
  // Read the exact JSON that was used
  const payloadPath = path.join(process.cwd(), 'scripts/test-payload.json');
  const raw = fs.readFileSync(payloadPath, 'utf-8');
  
  console.log('Step 1: Parse with parseGamesFromJsonPayload');
  console.log('  Raw JSON size:', raw.length, 'bytes');
  
  try {
    const parsedGames = parseGamesFromJsonPayload(raw);
    
    console.log('  ✅ Parsing succeeded');
    console.log('  Parsed games:', parsedGames.length);
    
    if (parsedGames.length > 0) {
      const game = parsedGames[0];
      console.log('\n  Game data:');
      console.log('    game_key:', game.game_key);
      console.log('    name:', game.name);
      console.log('    play_mode:', game.play_mode);
      console.log('');
      console.log('    steps:', game.steps?.length ?? 'undefined/null');
      console.log('    phases:', game.phases?.length ?? 'undefined/null');
      console.log('    roles:', game.roles?.length ?? 'undefined/null');
      console.log('    artifacts:', game.artifacts?.length ?? 'undefined/null');
      console.log('    triggers:', game.triggers?.length ?? 'undefined/null');
      
      // Show steps detail
      if (game.steps && game.steps.length > 0) {
        console.log('\n    Steps detail:');
        game.steps.forEach((s, i) => console.log(`      ${i+1}. [order=${s.step_order}] ${s.title}`));
      } else {
        console.log('\n    ❌ NO STEPS FOUND!');
      }
      
      // Show phases detail
      if (game.phases && game.phases.length > 0) {
        console.log('\n    Phases detail:');
        game.phases.forEach((p, i) => console.log(`      ${i+1}. [order=${p.phase_order}] ${p.name}`));
      }
      
      // Show roles detail  
      if (game.roles && game.roles.length > 0) {
        console.log('\n    Roles detail:');
        game.roles.forEach((r, i) => console.log(`      ${i+1}. [order=${r.role_order}] ${r.name}`));
      }
      
      // Show artifacts detail
      if (game.artifacts && game.artifacts.length > 0) {
        console.log('\n    Artifacts detail:');
        game.artifacts.forEach((a, i) => console.log(`      ${i+1}. [order=${a.artifact_order}] ${a.title} (${a.artifact_type})`));
      }
      
      // Show triggers detail
      if (game.triggers && game.triggers.length > 0) {
        console.log('\n    Triggers detail:');
        game.triggers.forEach((t, i) => {
          console.log(`      ${i+1}. ${t.name}`);
          console.log(`         condition:`, JSON.stringify(t.condition));
          console.log(`         actions:`, JSON.stringify(t.actions));
        });
      } else {
        console.log('\n    Triggers: none found (check format)');
      }
      
      // Now validate
      console.log('\n\nStep 2: Validate with validateGames');
      const validationResult = validateGames(parsedGames, {
        mode: 'upsert',
        validateOnly: false,
        defaultStatus: 'draft',
        defaultLocale: 'sv-SE',
      });
      
      console.log('  Valid games:', validationResult.validGames.length);
      console.log('  Invalid games:', validationResult.invalidGames.length);
      console.log('  Errors:', validationResult.allErrors.length);
      console.log('  Warnings:', validationResult.allWarnings.length);
      
      if (validationResult.allErrors.length > 0) {
        console.log('\n  ❌ VALIDATION ERRORS:');
        validationResult.allErrors.forEach(e => console.log(`    - [${e.column}] ${e.message}`));
      }
      
      if (validationResult.allWarnings.length > 0) {
        console.log('\n  ⚠️ WARNINGS:');
        validationResult.allWarnings.forEach(w => console.log(`    - [${w.column}] ${w.message}`));
      }
      
      // Check valid game data
      if (validationResult.validGames.length > 0) {
        const validGame = validationResult.validGames[0];
        console.log('\n  After validation:');
        console.log('    steps:', validGame.steps?.length ?? 'undefined/null');
        console.log('    phases:', validGame.phases?.length ?? 'undefined/null');
        console.log('    roles:', validGame.roles?.length ?? 'undefined/null');
        console.log('    artifacts:', validGame.artifacts?.length ?? 'undefined/null');
        console.log('    triggers:', validGame.triggers?.length ?? 'undefined/null');
      }
    }
    
  } catch (err) {
    console.log('  ❌ PARSING FAILED:', err);
  }
  
  console.log('\n=== DONE ===');
}

main().catch(console.error);
