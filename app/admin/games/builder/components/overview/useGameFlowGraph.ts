/**
 * useGameFlowGraph Hook
 *
 * Derives React Flow nodes and edges from GameBuilderState.
 * This hook transforms the builder state into a format suitable for React Flow visualization.
 *
 * SPRINT 2: Migrated from validateGameRefs to resolveDraft
 * @see docs/builder/SPRINT2_WIRING_PLAN.md
 */

import { useMemo } from 'react';
import type { GameBuilderState, StepData, PhaseData } from '@/types/game-builder-state';
import type { ArtifactFormData } from '@/types/games';
import type { TriggerCondition, TriggerAction } from '@/types/trigger';
import {
  resolveDraft,
  errorsForEntity,
  type ResolveResult,
} from '@/lib/builder/resolver';
import type { BuilderError } from '@/types/builder-error';
import { getArtifactStepId } from '@/lib/builder/normalize';

// ============================================================================
// Types
// ============================================================================

// React Flow node/edge types (simplified to avoid strict typing issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FlowNode = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FlowEdge = any;

/** Validation info attached to nodes - using BuilderError from resolver */
export interface NodeValidation {
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: BuilderError[];
  warnings: BuilderError[];
}

export interface PhaseNodeData {
  type: 'phase';
  phase: PhaseData;
  label: string;
  phaseIndex: number;
  stepCount: number;
  validation: NodeValidation;
}

export interface StepNodeData {
  type: 'step';
  step: StepData;
  label: string;
  stepIndex: number;
  phaseId: string | null;
  validation: NodeValidation;
}

export interface ArtifactNodeData {
  type: 'artifact';
  artifact: ArtifactFormData;
  label: string;
  artifactIndex: number;
  validation: NodeValidation;
}

export interface TriggerNodeData {
  type: 'trigger';
  triggerId: string;
  label: string;
  enabled: boolean;
  validation: NodeValidation;
}

export type FlowNodeData = PhaseNodeData | StepNodeData | ArtifactNodeData | TriggerNodeData;

export interface TriggerEdgeData {
  triggerId: string;
  triggerName: string;
  edgeType: 'unlocks' | 'reveals' | 'advances' | 'other';
  unresolved: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PHASE_WIDTH = 280;
const PHASE_GAP = 100;
const STEP_HEIGHT = 50;
const STEP_GAP = 10;
const PHASE_HEADER_HEIGHT = 60;
const PHASE_PADDING = 20;
const ARTIFACT_ROW_Y = 500;
const ARTIFACT_WIDTH = 180;
const ARTIFACT_GAP = 20;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract source entity ID from a trigger condition
 */
function getConditionSourceId(condition: TriggerCondition): string | null {
  switch (condition.type) {
    case 'step_started':
    case 'step_completed':
      return `step-${condition.stepId}`;
    case 'phase_started':
    case 'phase_completed':
      return `phase-${condition.phaseId}`;
    case 'artifact_unlocked':
      return `artifact-${condition.artifactId}`;
    case 'keypad_correct':
    case 'keypad_failed':
      return `artifact-${condition.keypadId}`;
    case 'riddle_correct':
      return `artifact-${condition.riddleId}`;
    case 'manual':
    case 'timer_ended':
    case 'signal_received':
      return null; // These don't have a source entity
    default:
      return null;
  }
}

/**
 * Extract target entity IDs and types from a trigger action
 */
function getActionTarget(
  action: TriggerAction
): { id: string; type: 'unlocks' | 'reveals' | 'advances' | 'other' } | null {
  switch (action.type) {
    case 'reveal_artifact':
    case 'hide_artifact':
      return { id: `artifact-${action.artifactId}`, type: 'reveals' };
    case 'advance_step':
      return { id: 'next-step', type: 'advances' };
    case 'advance_phase':
      return { id: 'next-phase', type: 'advances' };
    case 'show_countdown':
    case 'send_message':
    case 'send_signal':
    case 'play_sound':
    case 'start_timer':
    case 'unlock_decision':
    case 'lock_decision':
      return null; // These don't target specific entities
    default:
      return null;
  }
}

/**
 * Check if an entity ID exists in the state
 */
function entityExists(
  id: string,
  state: GameBuilderState
): boolean {
  if (id.startsWith('step-')) {
    const stepId = id.replace('step-', '');
    return state.steps.some((s) => s.id === stepId);
  }
  if (id.startsWith('phase-')) {
    const phaseId = id.replace('phase-', '');
    return state.phases.some((p) => p.id === phaseId);
  }
  if (id.startsWith('artifact-')) {
    const artifactId = id.replace('artifact-', '');
    return state.artifacts.some((a) => a.id === artifactId);
  }
  return false;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useGameFlowGraph(state: GameBuilderState): {
  nodes: FlowNode[];
  edges: FlowEdge[];
  resolverResult: ResolveResult;
} {
  return useMemo(() => {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    // Run validation using resolveDraft (single source of truth)
    // Filter triggers to only include those with id (TriggerFormData has id?: string)
    const triggersWithId = state.triggers.filter((t): t is typeof t & { id: string } => !!t.id);
    const resolverResult = resolveDraft({
      core: {
        name: '', // Not needed for graph validation
        main_purpose_id: '',
      },
      steps: state.steps,
      phases: state.phases,
      artifacts: state.artifacts,
      triggers: triggersWithId,
      roles: state.roles,
    });

    /** Get validation for a specific entity using resolver helpers */
    const getValidation = (entityType: 'step' | 'phase' | 'artifact' | 'trigger' | 'role', entityId: string): NodeValidation => {
      const entityErrors = errorsForEntity(resolverResult.errors, entityType, entityId);
      const errors = entityErrors.filter(e => e.severity === 'error');
      const warnings = entityErrors.filter(e => e.severity === 'warning');
      return {
        hasErrors: errors.length > 0,
        hasWarnings: warnings.length > 0,
        errors,
        warnings,
      };
    };

    /** Empty validation for entities without issues */
    const emptyValidation: NodeValidation = {
      hasErrors: false,
      hasWarnings: false,
      errors: [],
      warnings: [],
    };

    // Group steps by phase
    const stepsByPhase = new Map<string | null, StepData[]>();
    state.steps.forEach((step) => {
      const phaseId = step.phase_id || null;
      if (!stepsByPhase.has(phaseId)) {
        stepsByPhase.set(phaseId, []);
      }
      stepsByPhase.get(phaseId)!.push(step);
    });

    // Calculate orphan steps (steps without a phase)
    const orphanSteps = stepsByPhase.get(null) || [];
    let currentX = 0;

    // Add orphan steps container if any
    if (orphanSteps.length > 0) {
      // Add a virtual "orphan" phase node
      nodes.push({
        id: 'phase-orphan',
        type: 'phaseNode',
        position: { x: currentX, y: 0 },
        data: {
          type: 'phase',
          phase: {
            id: 'orphan',
            name: 'Steg utan fas',
            phase_type: 'round',
            phase_order: -1,
            duration_seconds: null,
            timer_visible: false,
            timer_style: 'countdown',
            description: '',
            board_message: '',
            auto_advance: false,
          } as PhaseData,
          label: 'Steg utan fas',
          phaseIndex: -1,
          stepCount: orphanSteps.length,
          validation: emptyValidation, // orphan container never has errors
        },
        style: {
          width: PHASE_WIDTH,
          height: PHASE_HEADER_HEIGHT + orphanSteps.length * (STEP_HEIGHT + STEP_GAP) + PHASE_PADDING,
        },
      });

      // Add orphan steps as child nodes
      orphanSteps.forEach((step, idx) => {
        nodes.push({
          id: `step-${step.id}`,
          type: 'stepNode',
          position: {
            x: PHASE_PADDING,
            y: PHASE_HEADER_HEIGHT + idx * (STEP_HEIGHT + STEP_GAP),
          },
          parentId: 'phase-orphan',
          extent: 'parent',
          data: {
            type: 'step',
            step,
            label: step.title || `Steg ${idx + 1}`,
            stepIndex: idx,
            phaseId: null,
            validation: getValidation('step', step.id),
          },
          style: { width: PHASE_WIDTH - PHASE_PADDING * 2 },
        });
      });

      currentX += PHASE_WIDTH + PHASE_GAP;
    }

    // Add phase nodes with their steps
    state.phases.forEach((phase, phaseIdx) => {
      const phaseSteps = stepsByPhase.get(phase.id) || [];
      const phaseHeight =
        PHASE_HEADER_HEIGHT +
        Math.max(1, phaseSteps.length) * (STEP_HEIGHT + STEP_GAP) +
        PHASE_PADDING;

      // Phase container node
      nodes.push({
        id: `phase-${phase.id}`,
        type: 'phaseNode',
        position: { x: currentX, y: 0 },
        data: {
          type: 'phase',
          phase,
          label: phase.name || `Fas ${phaseIdx + 1}`,
          phaseIndex: phaseIdx,
          stepCount: phaseSteps.length,
          validation: getValidation('phase', phase.id),
        },
        style: {
          width: PHASE_WIDTH,
          height: phaseHeight,
        },
      });

      // Step nodes inside the phase
      phaseSteps.forEach((step, stepIdx) => {
        nodes.push({
          id: `step-${step.id}`,
          type: 'stepNode',
          position: {
            x: PHASE_PADDING,
            y: PHASE_HEADER_HEIGHT + stepIdx * (STEP_HEIGHT + STEP_GAP),
          },
          parentId: `phase-${phase.id}`,
          extent: 'parent',
          data: {
            type: 'step',
            step,
            label: step.title || `Steg ${stepIdx + 1}`,
            stepIndex: stepIdx,
            phaseId: phase.id,
            validation: getValidation('step', step.id),
          },
          style: { width: PHASE_WIDTH - PHASE_PADDING * 2 },
        });
      });

      currentX += PHASE_WIDTH + PHASE_GAP;
    });

    // Add artifact nodes in a row below phases
    state.artifacts.forEach((artifact, idx) => {
      nodes.push({
        id: `artifact-${artifact.id}`,
        type: 'artifactNode',
        position: {
          x: idx * (ARTIFACT_WIDTH + ARTIFACT_GAP),
          y: ARTIFACT_ROW_Y,
        },
        data: {
          type: 'artifact',
          artifact,
          label: artifact.title || `Artefakt ${idx + 1}`,
          artifactIndex: idx,
          validation: getValidation('artifact', artifact.id),
        },
        style: { width: ARTIFACT_WIDTH },
      });

      // Create Artifact→Step edge if artifact has metadata.step_id
      const stepId = getArtifactStepId(artifact);
      if (stepId) {
        const stepExists = state.steps.some((s) => s.id === stepId);
        edges.push({
          id: `artifact-step-${artifact.id}-${stepId}`,
          source: `artifact-${artifact.id}`,
          target: `step-${stepId}`,
          type: 'artifactStepEdge',
          animated: false,
          data: {
            artifactId: artifact.id,
            stepId,
            unresolved: !stepExists,
          },
          style: {
            stroke: stepExists ? '#6366f1' : '#ef4444', // indigo or red
            strokeDasharray: stepExists ? '3,3' : '5,5',
            strokeWidth: 1,
          },
        });
      }
    });

    // Create edges from triggers
    state.triggers.forEach((trigger) => {
      const sourceId = getConditionSourceId(trigger.condition);
      if (!sourceId) return;

      trigger.actions.forEach((action, actionIdx) => {
        const target = getActionTarget(action);
        if (!target) return;

        // Check if source and target exist
        const sourceExists = entityExists(sourceId, state) || sourceId === 'phase-orphan';
        const targetExists =
          target.id === 'next-step' ||
          target.id === 'next-phase' ||
          entityExists(target.id, state);
        const unresolved = !sourceExists || !targetExists;

        edges.push({
          id: `trigger-${trigger.id}-${actionIdx}`,
          source: sourceId,
          target: target.id === 'next-step' || target.id === 'next-phase' ? sourceId : target.id,
          type: 'triggerEdge',
          animated: trigger.enabled,
          data: {
            triggerId: trigger.id,
            triggerName: trigger.name,
            edgeType: target.type,
            unresolved,
          },
          style: {
            stroke: unresolved ? '#ef4444' : getEdgeColor(target.type),
            strokeDasharray: unresolved ? '5,5' : undefined,
          },
        });
      });
    });

    return { nodes, edges, resolverResult };
  }, [state]);
}

// ============================================================================
// Edge Color Helper
// ============================================================================

function getEdgeColor(type: 'unlocks' | 'reveals' | 'advances' | 'other'): string {
  switch (type) {
    case 'unlocks':
      return '#22c55e'; // green
    case 'reveals':
      return '#3b82f6'; // blue
    case 'advances':
      return '#a855f7'; // purple
    default:
      return '#6b7280'; // gray
  }
}
