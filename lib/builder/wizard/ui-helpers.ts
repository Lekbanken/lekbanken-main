/**
 * Wizard UI Helpers
 *
 * Safe wrappers for wizard actions that normalize inputs from UI.
 * These are "forgiving" versions that won't crash if given node IDs.
 *
 * DESIGN PRINCIPLE:
 * - Core actions (actions.ts) are STRICT - throw on invalid input
 * - UI helpers (ui-helpers.ts) are FORGIVING - normalize or skip
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

import type { BuilderAction } from '@/types/game-builder-state';
import { attachArtifactToStep, assignStepToPhase } from './actions';

// =============================================================================
// NODE ID NORMALIZATION
// =============================================================================

/**
 * Extract raw UUID from a node ID or pass through if already raw.
 *
 * @example
 * normalizeToRawId('step-abc123') // 'abc123'
 * normalizeToRawId('phase-xyz')   // 'xyz'
 * normalizeToRawId('abc123')      // 'abc123'
 * normalizeToRawId(null)          // null
 */
export function normalizeToRawId(nodeIdOrRawId: string | null): string | null {
  if (!nodeIdOrRawId) return null;

  // Strip known prefixes
  if (nodeIdOrRawId.startsWith('step-')) {
    return nodeIdOrRawId.slice(5);
  }
  if (nodeIdOrRawId.startsWith('phase-')) {
    return nodeIdOrRawId.slice(6);
  }
  if (nodeIdOrRawId.startsWith('artifact-')) {
    return nodeIdOrRawId.slice(9);
  }
  if (nodeIdOrRawId.startsWith('trigger-')) {
    return nodeIdOrRawId.slice(8);
  }
  if (nodeIdOrRawId.startsWith('role-')) {
    return nodeIdOrRawId.slice(5);
  }

  // Already raw
  return nodeIdOrRawId;
}

/**
 * Check if a string looks like a node ID (has a known prefix).
 */
export function isNodeId(value: string): boolean {
  return (
    value.startsWith('step-') ||
    value.startsWith('phase-') ||
    value.startsWith('artifact-') ||
    value.startsWith('trigger-') ||
    value.startsWith('role-')
  );
}

// =============================================================================
// SAFE UI WRAPPERS
// =============================================================================

/**
 * Safe wrapper for attachArtifactToStep.
 * Normalizes node IDs to raw UUIDs. Never throws.
 *
 * @param artifactId - Artifact ID (can be node ID or raw UUID)
 * @param stepId - Step ID (can be node ID or raw UUID, or null)
 * @returns BuilderAction or null if normalization failed
 */
export function safeAttachArtifactToStep(
  artifactId: string,
  stepId: string | null
): BuilderAction | null {
  try {
    const normalizedArtifactId = normalizeToRawId(artifactId);
    const normalizedStepId = normalizeToRawId(stepId);

    if (!normalizedArtifactId) {
      console.warn('[Wizard] safeAttachArtifactToStep: invalid artifactId', artifactId);
      return null;
    }

    return attachArtifactToStep(normalizedArtifactId, normalizedStepId);
  } catch (error) {
    console.error('[Wizard] safeAttachArtifactToStep failed:', error);
    return null;
  }
}

/**
 * Safe wrapper for assignStepToPhase.
 * Normalizes node IDs to raw UUIDs. Never throws.
 *
 * @param stepId - Step ID (can be node ID or raw UUID)
 * @param phaseId - Phase ID (can be node ID or raw UUID, or null)
 * @returns BuilderAction or null if normalization failed
 */
export function safeAssignStepToPhase(
  stepId: string,
  phaseId: string | null
): BuilderAction | null {
  try {
    const normalizedStepId = normalizeToRawId(stepId);
    const normalizedPhaseId = normalizeToRawId(phaseId);

    if (!normalizedStepId) {
      console.warn('[Wizard] safeAssignStepToPhase: invalid stepId', stepId);
      return null;
    }

    return assignStepToPhase(normalizedStepId, normalizedPhaseId);
  } catch (error) {
    console.error('[Wizard] safeAssignStepToPhase failed:', error);
    return null;
  }
}

/**
 * Dispatch multiple actions, filtering out nulls.
 * Useful when using safe wrappers that might return null.
 *
 * @param actions - Array of actions or nulls
 * @param dispatch - Dispatcher function
 */
export function dispatchSafeActions(
  actions: (BuilderAction | null)[],
  dispatch: (action: BuilderAction) => void
): void {
  for (const action of actions) {
    if (action) {
      dispatch(action);
    }
  }
}
