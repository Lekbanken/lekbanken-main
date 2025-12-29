export type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export type TriggerOrderMapsToOrder = {
  stepOrderById: Map<string, number>;
  phaseOrderById: Map<string, number>;
  artifactOrderById: Map<string, number>;
};

export type TriggerOrderMapsToIds = {
  stepIdByOrder: Map<number, string>;
  phaseIdByOrder: Map<number, string>;
  artifactIdByOrder: Map<number, string>;
};

export function conditionIdsToOrderAliases(condition: unknown, maps: TriggerOrderMapsToOrder): unknown {
  if (!isJsonRecord(condition)) return condition;
  const c: JsonRecord = { ...condition };

  const type = c['type'];
  if (typeof type !== 'string') return c;

  // Step
  if ((type === 'step_started' || type === 'step_completed') && typeof c['stepId'] === 'string' && typeof c['stepOrder'] !== 'number') {
    const order = maps.stepOrderById.get(c['stepId']);
    if (typeof order === 'number') {
      c['stepOrder'] = order;
      delete c['stepId'];
    }
  }

  // Phase
  if ((type === 'phase_started' || type === 'phase_completed') && typeof c['phaseId'] === 'string' && typeof c['phaseOrder'] !== 'number') {
    const order = maps.phaseOrderById.get(c['phaseId']);
    if (typeof order === 'number') {
      c['phaseOrder'] = order;
      delete c['phaseId'];
    }
  }

  // Artifact
  if (type === 'artifact_unlocked' && typeof c['artifactId'] === 'string' && typeof c['artifactOrder'] !== 'number') {
    const order = maps.artifactOrderById.get(c['artifactId']);
    if (typeof order === 'number') {
      c['artifactOrder'] = order;
      delete c['artifactId'];
    }
  }

  // Keypad (stored as keypadId which is typically artifact id)
  if ((type === 'keypad_correct' || type === 'keypad_failed') && typeof c['keypadId'] === 'string' && typeof c['artifactOrder'] !== 'number') {
    const order = maps.artifactOrderById.get(c['keypadId']);
    if (typeof order === 'number') {
      c['artifactOrder'] = order;
      delete c['keypadId'];
    }
  }

  return c;
}

export function actionIdsToOrderAliases(action: unknown, maps: Pick<TriggerOrderMapsToOrder, 'artifactOrderById'>): unknown {
  if (!isJsonRecord(action)) return action;
  const a: JsonRecord = { ...action };

  const type = a['type'];
  if (typeof type !== 'string') return a;

  if ((type === 'reveal_artifact' || type === 'hide_artifact') && typeof a['artifactId'] === 'string' && typeof a['artifactOrder'] !== 'number') {
    const order = maps.artifactOrderById.get(a['artifactId']);
    if (typeof order === 'number') {
      a['artifactOrder'] = order;
      delete a['artifactId'];
    }
  }

  return a;
}

export function conditionOrderAliasesToIds(condition: unknown, maps: TriggerOrderMapsToIds): unknown {
  if (!isJsonRecord(condition)) return condition;
  const resolved: JsonRecord = { ...condition };

  const type = resolved['type'];
  if (typeof type !== 'string') return resolved;

  // Step-related conditions
  if ((type === 'step_started' || type === 'step_completed') && typeof resolved['stepId'] !== 'string' && typeof resolved['stepOrder'] === 'number') {
    const order = resolved['stepOrder'];
    resolved['stepId'] = maps.stepIdByOrder.get(order) ?? null;
    delete resolved['stepOrder'];
  }

  // Phase-related conditions
  if ((type === 'phase_started' || type === 'phase_completed') && typeof resolved['phaseId'] !== 'string' && typeof resolved['phaseOrder'] === 'number') {
    const order = resolved['phaseOrder'];
    resolved['phaseId'] = maps.phaseIdByOrder.get(order) ?? null;
    delete resolved['phaseOrder'];
  }

  // Artifact-related conditions
  if (type === 'artifact_unlocked' && typeof resolved['artifactId'] !== 'string' && typeof resolved['artifactOrder'] === 'number') {
    const order = resolved['artifactOrder'];
    resolved['artifactId'] = maps.artifactIdByOrder.get(order) ?? null;
    delete resolved['artifactOrder'];
  }

  // Keypad conditions (keypadId is typically an artifact ID)
  if ((type === 'keypad_correct' || type === 'keypad_failed') && typeof resolved['keypadId'] !== 'string' && typeof resolved['artifactOrder'] === 'number') {
    const order = resolved['artifactOrder'];
    resolved['keypadId'] = maps.artifactIdByOrder.get(order) ?? null;
    delete resolved['artifactOrder'];
  }

  return resolved;
}

export function actionOrderAliasesToIds(action: unknown, maps: Pick<TriggerOrderMapsToIds, 'artifactIdByOrder'>): unknown {
  if (!isJsonRecord(action)) return action;
  const resolved: JsonRecord = { ...action };

  const type = resolved['type'];
  if (typeof type !== 'string') return resolved;

  // Artifact-related actions
  if ((type === 'reveal_artifact' || type === 'hide_artifact') && typeof resolved['artifactId'] !== 'string' && typeof resolved['artifactOrder'] === 'number') {
    const order = resolved['artifactOrder'];
    resolved['artifactId'] = maps.artifactIdByOrder.get(order) ?? null;
    delete resolved['artifactOrder'];
  }

  return resolved;
}
