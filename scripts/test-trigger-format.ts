/**
 * Test that proves the trigger format issue causes the error
 */

import { rewriteAllTriggerRefs, type TriggerIdMap, type TriggerPayload } from '../lib/import/triggerRefRewrite';

// Simulating what the JSON parser returns for the exact payload
const parsedTriggers = [
  {
    name: 'Kodlås löst',
    condition_type: 'keypad_correct',  // Wrong format!
    condition_config: {
      artifactOrder: 2
    },
    actions: [
      {
        type: 'reveal_artifact',
        artifactOrder: 3
      }
    ],
    execute_once: true
  }
];

// Convert to TriggerPayload format (this is what the route does)
const triggerPayloads: TriggerPayload[] = parsedTriggers.map(t => ({
  name: t.name,
  description: undefined,
  enabled: true,
  condition: (t as unknown as { condition: Record<string, unknown> }).condition,  // This becomes undefined!
  actions: t.actions as Record<string, unknown>[],
  execute_once: t.execute_once,
  delay_seconds: 0,
  sort_order: 0,
}));

console.log('=== TRIGGER FORMAT TEST ===\n');
console.log('Parsed triggers:', JSON.stringify(parsedTriggers, null, 2));
console.log('\nConverted to TriggerPayload:');
console.log('  trigger.condition:', triggerPayloads[0].condition);  // undefined!

// Now run through rewriteAllTriggerRefs
const idMap: TriggerIdMap = {
  stepIdByOrder: new Map(),
  phaseIdByOrder: new Map(),
  artifactIdByOrder: new Map([[2, 'artifact-2-uuid'], [3, 'artifact-3-uuid']]),
};

const result = rewriteAllTriggerRefs(triggerPayloads, idMap, 'test-game');

console.log('\nRewrite result:');
console.log('  Errors:', result.errors.length);
if (result.errors.length > 0) {
  console.log('\n❌ ERRORS FOUND:');
  result.errors.forEach(e => console.log(`  - [${e.column}] ${e.message}`));
}

console.log('\n=== THIS IS THE ROOT CAUSE ===');
console.log('The trigger uses condition_type/condition_config format,');
console.log('but the import expects condition: { type: ... } format.');
console.log('This causes PreflightValidationError which aborts importRelatedData');
console.log('but the game has ALREADY BEEN CREATED at this point!');
