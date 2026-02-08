/**
 * Test helper for building TriggerIdMap with correct shape.
 *
 * Use this helper in tests to avoid accidentally introducing
 * non-existent properties (like `roleIdsInBatch`, `artifactIdsInBatch`, etc.)
 *
 * The TriggerIdMap interface is intentionally "thin" with a single
 * `importBatchUuids` set instead of per-type sets.
 *
 * @see lib/import/triggerRefRewrite.ts for the contract
 */

import type { TriggerIdMap } from '@/lib/import/triggerRefRewrite';

export interface BuildTriggerIdMapOptions {
  /** Map of step order → UUID */
  steps?: Map<number, string> | Array<[number, string]>;
  /** Map of phase order → UUID */
  phases?: Map<number, string> | Array<[number, string]>;
  /** Map of artifact order → UUID */
  artifacts?: Map<number, string> | Array<[number, string]>;
  /** Map of artifact sourceId → UUID (for string-based refs) */
  artifactsBySourceId?: Map<string, string> | Array<[string, string]>;
  /** Map of step sourceId → UUID (for string-based refs) */
  stepsBySourceId?: Map<string, string> | Array<[string, string]>;
  /** Map of phase sourceId → UUID (for string-based refs) */
  phasesBySourceId?: Map<string, string> | Array<[string, string]>;
}

/**
 * Build a TriggerIdMap for tests with correct shape.
 *
 * Automatically populates `importBatchUuids` from all provided UUIDs.
 *
 * @example
 * const idMap = buildTriggerIdMap({
 *   phases: [[1, 'phase-uuid-1'], [2, 'phase-uuid-2']],
 *   artifacts: [[1, 'artifact-uuid-1']],
 * });
 */
export function buildTriggerIdMap(options: BuildTriggerIdMapOptions = {}): TriggerIdMap {
  const stepIdByOrder = options.steps instanceof Map
    ? options.steps
    : new Map(options.steps ?? []);

  const phaseIdByOrder = options.phases instanceof Map
    ? options.phases
    : new Map(options.phases ?? []);

  const artifactIdByOrder = options.artifacts instanceof Map
    ? options.artifacts
    : new Map(options.artifacts ?? []);

  const artifactIdBySourceId = options.artifactsBySourceId instanceof Map
    ? options.artifactsBySourceId
    : options.artifactsBySourceId
      ? new Map(options.artifactsBySourceId)
      : undefined;

  const stepIdBySourceId = options.stepsBySourceId instanceof Map
    ? options.stepsBySourceId
    : options.stepsBySourceId
      ? new Map(options.stepsBySourceId)
      : undefined;

  const phaseIdBySourceId = options.phasesBySourceId instanceof Map
    ? options.phasesBySourceId
    : options.phasesBySourceId
      ? new Map(options.phasesBySourceId)
      : undefined;

  // Collect ALL UUIDs into a single set (the "thin" design)
  const importBatchUuids = new Set<string>([
    ...stepIdByOrder.values(),
    ...phaseIdByOrder.values(),
    ...artifactIdByOrder.values(),
    ...(artifactIdBySourceId?.values() ?? []),
    ...(stepIdBySourceId?.values() ?? []),
    ...(phaseIdBySourceId?.values() ?? []),
  ]);

  const idMap: TriggerIdMap = {
    stepIdByOrder,
    phaseIdByOrder,
    artifactIdByOrder,
  };

  // Only add optional properties if they have values
  if (artifactIdBySourceId) idMap.artifactIdBySourceId = artifactIdBySourceId;
  if (stepIdBySourceId) idMap.stepIdBySourceId = stepIdBySourceId;
  if (phaseIdBySourceId) idMap.phaseIdBySourceId = phaseIdBySourceId;
  if (importBatchUuids.size > 0) idMap.importBatchUuids = importBatchUuids;

  return idMap;
}

/**
 * Build a TriggerIdMap from parsed game data.
 *
 * Generates test UUIDs based on order numbers (pattern: `{entity}-uuid-{order}`).
 *
 * This is a pure wrapper around `buildTriggerIdMap` - it only extracts
 * options from the game structure, then delegates. No custom logic here.
 *
 * @example
 * const games = parseGamesFromJsonPayload(fixtureRaw);
 * const idMap = buildTriggerIdMapFromGame(games[0]);
 */
export function buildTriggerIdMapFromGame(game: {
  phases?: Array<{ phase_order?: number }>;
  steps?: Array<{ step_order?: number }>;
  artifacts?: Array<{ artifact_order?: number }>;
}): TriggerIdMap {
  // Extract options from game structure - NO custom logic, just data extraction
  const extractEntries = <T extends { [K in OrderKey]?: number }, OrderKey extends string>(
    entities: T[] | undefined,
    orderKey: OrderKey,
    prefix: string
  ): Array<[number, string]> => {
    return (entities ?? []).map((e, i) => {
      const order = (e as Record<string, number | undefined>)[orderKey] ?? i + 1;
      return [order, `${prefix}-uuid-${order}`] as [number, string];
    });
  };

  // Delegate entirely to buildTriggerIdMap
  return buildTriggerIdMap({
    phases: extractEntries(game.phases, 'phase_order', 'phase'),
    steps: extractEntries(game.steps, 'step_order', 'step'),
    artifacts: extractEntries(game.artifacts, 'artifact_order', 'artifact'),
  });
}
