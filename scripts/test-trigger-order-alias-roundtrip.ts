import assert from 'node:assert/strict';

import {
  actionIdsToOrderAliases,
  actionOrderAliasesToIds,
  conditionIdsToOrderAliases,
  conditionOrderAliasesToIds,
} from '../lib/games/trigger-order-alias';

function mapFromEntries<K, V>(entries: Array<[K, V]>): Map<K, V> {
  return new Map(entries);
}

function roundTripCondition(condition: unknown, maps: {
  stepOrderById: Map<string, number>;
  phaseOrderById: Map<string, number>;
  artifactOrderById: Map<string, number>;
  stepIdByOrder: Map<number, string>;
  phaseIdByOrder: Map<number, string>;
  artifactIdByOrder: Map<number, string>;
}) {
  const orderBased = conditionIdsToOrderAliases(condition, {
    stepOrderById: maps.stepOrderById,
    phaseOrderById: maps.phaseOrderById,
    artifactOrderById: maps.artifactOrderById,
  });

  const resolved = conditionOrderAliasesToIds(orderBased, {
    stepIdByOrder: maps.stepIdByOrder,
    phaseIdByOrder: maps.phaseIdByOrder,
    artifactIdByOrder: maps.artifactIdByOrder,
  });

  assert.deepEqual(resolved, condition);
}

function roundTripAction(action: unknown, maps: {
  artifactOrderById: Map<string, number>;
  artifactIdByOrder: Map<number, string>;
}) {
  const orderBased = actionIdsToOrderAliases(action, {
    artifactOrderById: maps.artifactOrderById,
  });

  const resolved = actionOrderAliasesToIds(orderBased, {
    artifactIdByOrder: maps.artifactIdByOrder,
  });

  assert.deepEqual(resolved, action);
}

const stepOrderById = mapFromEntries<string, number>([
  ['step_1_id', 0],
  ['step_2_id', 1],
]);

const phaseOrderById = mapFromEntries<string, number>([
  ['phase_1_id', 0],
  ['phase_2_id', 1],
]);

const artifactOrderById = mapFromEntries<string, number>([
  ['artifact_keypad_id', 5],
  ['artifact_note_id', 2],
]);

const stepIdByOrder = mapFromEntries<number, string>([
  [0, 'step_1_id'],
  [1, 'step_2_id'],
]);

const phaseIdByOrder = mapFromEntries<number, string>([
  [0, 'phase_1_id'],
  [1, 'phase_2_id'],
]);

const artifactIdByOrder = mapFromEntries<number, string>([
  [5, 'artifact_keypad_id'],
  [2, 'artifact_note_id'],
]);

// Conditions
roundTripCondition(
  { type: 'step_started', stepId: 'step_2_id' },
  { stepOrderById, phaseOrderById, artifactOrderById, stepIdByOrder, phaseIdByOrder, artifactIdByOrder }
);
roundTripCondition(
  { type: 'phase_completed', phaseId: 'phase_1_id' },
  { stepOrderById, phaseOrderById, artifactOrderById, stepIdByOrder, phaseIdByOrder, artifactIdByOrder }
);
roundTripCondition(
  { type: 'artifact_unlocked', artifactId: 'artifact_note_id' },
  { stepOrderById, phaseOrderById, artifactOrderById, stepIdByOrder, phaseIdByOrder, artifactIdByOrder }
);
roundTripCondition(
  { type: 'keypad_correct', keypadId: 'artifact_keypad_id' },
  { stepOrderById, phaseOrderById, artifactOrderById, stepIdByOrder, phaseIdByOrder, artifactIdByOrder }
);

// Actions
roundTripAction(
  { type: 'reveal_artifact', artifactId: 'artifact_note_id' },
  { artifactOrderById, artifactIdByOrder }
);
roundTripAction(
  { type: 'hide_artifact', artifactId: 'artifact_note_id' },
  { artifactOrderById, artifactIdByOrder }
);

console.log('OK: trigger order-alias conversion roundtrip works for supported condition/action types.');
