/**
 * Test the NEW server-side fail-fast behavior
 * 
 * This verifies that:
 * 1. Invalid trigger → preflight fails → game NOT created
 * 2. Legacy trigger → normalized → game created successfully
 */

import { runPreflightValidation } from '../lib/import/preflight-validation';
import type { ParsedGame } from '../types/csv-import';

function mockUUID() {
  let counter = 0;
  return () => `mock-uuid-${++counter}`;
}

console.log('=== TEST: Server-side Fail-Fast Behavior ===\n');

// TEST 1: Invalid trigger should BLOCK import
console.log('--- Test 1: Invalid trigger (no condition) ---');
const invalidGame = {
  game_key: 'test-invalid-trigger',
  name: 'Invalid Trigger Test',
  short_description: 'Test with invalid trigger',
  description: null,
  play_mode: 'facilitated',
  status: 'draft',
  locale: 'sv-SE',
  steps: [{ step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null }],
  triggers: [{ name: 'Invalid', actions: [] }],  // No condition!
} as unknown as ParsedGame;

const invalidResult = runPreflightValidation(invalidGame, mockUUID());
console.log('  Preflight OK:', invalidResult.ok);
console.log('  Blocking errors:', invalidResult.blockingErrors.length);
if (invalidResult.blockingErrors.length > 0) {
  console.log('  Error messages:');
  invalidResult.blockingErrors.forEach(e => console.log(`    - ${e.message}`));
}
console.log('  → Game would be:', invalidResult.ok ? 'CREATED ❌' : 'BLOCKED ✅');

// TEST 2: Legacy trigger should be NORMALIZED and PASS
console.log('\n--- Test 2: Legacy trigger format ---');
const legacyGame = {
  game_key: 'test-legacy-trigger',
  name: 'Legacy Trigger Test',
  short_description: 'Test with legacy trigger',
  description: null,
  play_mode: 'facilitated',
  status: 'draft',
  locale: 'sv-SE',
  steps: [{ step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null }],
  triggers: [{
    name: 'Legacy Trigger',
    condition_type: 'keypad_correct',
    condition_config: { artifactOrder: 1 },
    actions: [{ type: 'reveal_artifact', artifactOrder: 2 }],
  }],
} as unknown as ParsedGame;

const legacyResult = runPreflightValidation(legacyGame, mockUUID());
console.log('  Preflight OK:', legacyResult.ok);
console.log('  Blocking errors:', legacyResult.blockingErrors.length);
console.log('  Normalized triggers:', legacyResult.precomputed.normalizedTriggers.length);
if (legacyResult.precomputed.normalizedTriggers.length > 0) {
  const t = legacyResult.precomputed.normalizedTriggers[0];
  console.log('  Trigger condition.type:', t.condition.type);
}
console.log('  → Game would be:', legacyResult.ok ? 'CREATED ✅' : 'BLOCKED ❌');

// TEST 3: Mixed valid + invalid triggers should BLOCK ALL
console.log('\n--- Test 3: Mixed valid + invalid triggers ---');
const mixedGame = {
  game_key: 'test-mixed-triggers',
  name: 'Mixed Trigger Test',
  short_description: 'Test with mixed triggers',
  description: null,
  play_mode: 'facilitated',
  status: 'draft',
  locale: 'sv-SE',
  steps: [{ step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null }],
  triggers: [
    { name: 'Valid', condition: { type: 'manual' }, actions: [], execute_once: false },
    { name: 'Invalid', actions: [] },  // No condition!
  ],
} as unknown as ParsedGame;

const mixedResult = runPreflightValidation(mixedGame, mockUUID());
console.log('  Preflight OK:', mixedResult.ok);
console.log('  Blocking errors:', mixedResult.blockingErrors.length);
console.log('  → Game would be:', mixedResult.ok ? 'CREATED (with 1 trigger) ⚠️' : 'BLOCKED ✅');

// SUMMARY
console.log('\n=== SUMMARY ===');
console.log('Test 1 (Invalid trigger):', !invalidResult.ok ? 'PASS ✅ Blocked' : 'FAIL ❌ Not blocked');
console.log('Test 2 (Legacy trigger):', legacyResult.ok ? 'PASS ✅ Normalized and allowed' : 'FAIL ❌ Blocked');
console.log('Test 3 (Mixed triggers):', !mixedResult.ok ? 'PASS ✅ Fail-fast (blocked)' : 'FAIL ❌ Allowed (not fail-fast)');

console.log('\n=== CONTRACT CHECK ===');
console.log('DoD-1: Legacy triggers normalized:', legacyResult.ok && legacyResult.precomputed.normalizedTriggers.length > 0 ? '✅' : '❌');
console.log('DoD-2: Invalid trigger → no game:', !invalidResult.ok ? '✅' : '❌');
console.log('DoD-3: Fail-fast (any invalid blocks all):', !mixedResult.ok ? '✅' : '❌');
