/**
 * Test script to verify JSON parsing works correctly
 * 
 * Run with: npx tsx scripts/test-json-parser.ts
 */

import { parseGamesFromJsonPayload } from '../features/admin/games/utils/json-game-import';
import * as fs from 'fs';
import * as path from 'path';

// Test game JSON (same as used in UI import)
const testGameJson = JSON.stringify([
  {
    game_key: 'test-parser-game',
    name: 'Test Parser Game',
    short_description: 'A test game',
    description: 'Description',
    play_mode: 'facilitated',
    status: 'draft',
    steps: [
      { step_order: 1, title: 'Step 1', body: 'First step' },
      { step_order: 2, title: 'Step 2', body: 'Second step' },
    ],
    phases: [
      { phase_order: 1, name: 'Phase 1', phase_type: 'intro' },
    ],
    roles: [
      { role_order: 1, name: 'Role 1', private_instructions: 'Instructions' },
    ],
    artifacts: [
      { 
        artifact_order: 1, 
        title: 'Artifact 1', 
        artifact_type: 'card',
        variants: [{ visibility: 'public', body: 'Content' }]
      }
    ],
    triggers: [
      { name: 'Trigger 1', condition: { type: 'manual' }, actions: [] }
    ]
  }
]);

console.log('\n🧪 TEST JSON PARSER\n');
console.log('=' .repeat(60));

console.log('\n📌 INPUT JSON:\n');
console.log(testGameJson.substring(0, 500) + '...');

console.log('\n📌 PARSING...\n');

try {
  const parsed = parseGamesFromJsonPayload(testGameJson);
  
  console.log('✅ Parsing successful!\n');
  console.log(`Number of games: ${parsed.length}`);
  
  for (const game of parsed) {
    console.log(`\nGame: ${game.name} (${game.game_key})`);
    console.log(`  - steps: ${game.steps?.length ?? 0}`);
    console.log(`  - phases: ${game.phases?.length ?? 0}`);
    console.log(`  - roles: ${game.roles?.length ?? 0}`);
    console.log(`  - artifacts: ${game.artifacts?.length ?? 0}`);
    console.log(`  - triggers: ${game.triggers?.length ?? 0}`);
    
    // Check step content
    if (game.steps && game.steps.length > 0) {
      console.log('\n  Steps detail:');
      for (const step of game.steps) {
        console.log(`    - [${step.step_order}] ${step.title}: ${step.body?.substring(0, 30)}`);
      }
    } else {
      console.log('\n  ❌ NO STEPS PARSED!');
    }
  }
  
} catch (error) {
  console.log('❌ Parsing failed:', error);
}

console.log('\n' + '=' .repeat(60));

// Now test with actual fixture file
console.log('\n📌 TESTING WITH FIXTURE FILE...\n');

const fixturePath = path.join(process.cwd(), 'tests/fixtures/games/arkivets-sista-signal.json');

if (fs.existsSync(fixturePath)) {
  const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
  
  try {
    const parsed = parseGamesFromJsonPayload(fixtureContent);
    
    console.log('✅ Fixture parsing successful!\n');
    
    for (const game of parsed) {
      console.log(`Game: ${game.name} (${game.game_key})`);
      console.log(`  - steps: ${game.steps?.length ?? 0}`);
      console.log(`  - phases: ${game.phases?.length ?? 0}`);
      console.log(`  - roles: ${game.roles?.length ?? 0}`);
      console.log(`  - artifacts: ${game.artifacts?.length ?? 0}`);
      console.log(`  - triggers: ${game.triggers?.length ?? 0}`);
    }
  } catch (error) {
    console.log('❌ Fixture parsing failed:', error);
  }
} else {
  console.log('Fixture file not found:', fixturePath);
}

console.log('\nDONE\n');
