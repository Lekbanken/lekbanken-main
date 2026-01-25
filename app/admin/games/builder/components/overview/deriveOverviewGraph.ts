/**
 * Overview Graph Derivation
 *
 * Derives nodes and edges from the game builder state for visualization.
 * This is a read-only view used by the GameOverview component.
 */

import type { GameBuilderState, StepData, PhaseData } from '@/types/game-builder-state';
import type { TriggerFormData, ArtifactFormData } from '@/types/games';
import type { TriggerCondition, TriggerAction } from '@/types/trigger';

// ============================================================================
// Types
// ============================================================================

export type NodeType = 'phase' | 'step' | 'artifact' | 'role' | 'trigger';

export interface OverviewNode {
  id: string;
  type: NodeType;
  label: string;
  /** Original entity data */
  entity: StepData | PhaseData | ArtifactFormData | TriggerFormData;
  /** For steps: which phase they belong to (null if orphan) */
  parentPhaseId: string | null;
  /** Position index within parent (for ordering) */
  order: number;
}

export type EdgeType = 'sequence' | 'contains' | 'unlocks' | 'reveals' | 'advances' | 'other';

export interface OverviewEdge {
  id: string;
  type: EdgeType;
  source: string;
  target: string;
  /** The trigger that creates this edge (if applicable) */
  triggerId?: string;
  triggerName?: string;
  /** If the reference couldn't be resolved */
  unresolved?: boolean;
  unresolvedReason?: string;
}

export interface OverviewGraph {
  nodes: OverviewNode[];
  edges: OverviewEdge[];
  /** Phases for container rendering */
  phases: PhaseData[];
  /** Steps grouped by phase (key: phaseId or 'orphan') */
  stepsByPhase: Map<string, StepData[]>;
}

// ============================================================================
// Condition/Action Reference Extraction
// ============================================================================

/**
 * Extract the source entity reference from a trigger condition.
 * Returns { type, id } or null if no reference found.
 */
function getConditionSource(condition: TriggerCondition): { type: NodeType; id: string } | null {
  switch (condition.type) {
    case 'step_started':
    case 'step_completed':
      return { type: 'step', id: condition.stepId };
    case 'phase_started':
    case 'phase_completed':
      return { type: 'phase', id: condition.phaseId };
    case 'artifact_unlocked':
      return { type: 'artifact', id: condition.artifactId };
    case 'keypad_correct':
    case 'keypad_failed':
      return { type: 'artifact', id: condition.keypadId };
    case 'riddle_correct':
      return { type: 'artifact', id: condition.riddleId };
    case 'audio_acknowledged':
      return { type: 'artifact', id: condition.audioId };
    case 'multi_answer_complete':
      return { type: 'artifact', id: condition.multiAnswerId };
    case 'scan_verified':
      return { type: 'artifact', id: condition.scanGateId };
    case 'hotspot_found':
    case 'hotspot_hunt_complete':
      return { type: 'artifact', id: condition.hotspotHuntId };
    case 'tile_puzzle_complete':
      return { type: 'artifact', id: condition.tilePuzzleId };
    case 'cipher_decoded':
      return { type: 'artifact', id: condition.cipherId };
    case 'prop_confirmed':
    case 'prop_rejected':
      return { type: 'artifact', id: condition.propId };
    case 'location_verified':
      return { type: 'artifact', id: condition.locationId };
    case 'logic_grid_solved':
      return { type: 'artifact', id: condition.gridId };
    case 'sound_level_triggered':
      return { type: 'artifact', id: condition.soundMeterId };
    case 'time_bank_expired':
      return condition.timeBankId ? { type: 'artifact', id: condition.timeBankId } : null;
    case 'signal_generator_triggered':
      return { type: 'artifact', id: condition.signalGeneratorId };
    case 'decision_resolved':
      return { type: 'artifact', id: condition.decisionId };
    case 'counter_reached':
      // Counter is by key, not ID - treat as unresolvable for now
      return null;
    case 'timer_ended':
      // Timer is created dynamically
      return null;
    case 'manual':
    case 'signal_received':
    case 'hint_requested':
    case 'replay_marker_added':
      // These don't reference specific entities
      return null;
    default:
      return null;
  }
}

/**
 * Extract target entity references from a trigger action.
 * Returns array of { type, id, edgeType }.
 */
function getActionTargets(action: TriggerAction): Array<{ type: NodeType; id: string; edgeType: EdgeType }> {
  const targets: Array<{ type: NodeType; id: string; edgeType: EdgeType }> = [];

  switch (action.type) {
    case 'reveal_artifact':
      targets.push({ type: 'artifact', id: action.artifactId, edgeType: 'reveals' });
      break;
    case 'hide_artifact':
      targets.push({ type: 'artifact', id: action.artifactId, edgeType: 'other' });
      break;
    case 'unlock_decision':
    case 'lock_decision':
      targets.push({ type: 'artifact', id: action.decisionId, edgeType: 'unlocks' });
      break;
    case 'advance_step':
      // No specific target - advances to next step
      break;
    case 'advance_phase':
      // No specific target - advances to next phase
      break;
    case 'reset_keypad':
      targets.push({ type: 'artifact', id: action.keypadId, edgeType: 'other' });
      break;
    case 'reset_riddle':
      targets.push({ type: 'artifact', id: action.riddleId, edgeType: 'other' });
      break;
    case 'reset_scan_gate':
      targets.push({ type: 'artifact', id: action.scanGateId, edgeType: 'other' });
      break;
    case 'reset_hotspot_hunt':
      targets.push({ type: 'artifact', id: action.hotspotHuntId, edgeType: 'other' });
      break;
    case 'reset_tile_puzzle':
      targets.push({ type: 'artifact', id: action.tilePuzzleId, edgeType: 'other' });
      break;
    case 'reset_cipher':
      targets.push({ type: 'artifact', id: action.cipherId, edgeType: 'other' });
      break;
    case 'reset_prop':
      targets.push({ type: 'artifact', id: action.propId, edgeType: 'other' });
      break;
    case 'reset_location':
      targets.push({ type: 'artifact', id: action.locationId, edgeType: 'other' });
      break;
    case 'reset_logic_grid':
      targets.push({ type: 'artifact', id: action.gridId, edgeType: 'other' });
      break;
    case 'reset_sound_meter':
      targets.push({ type: 'artifact', id: action.soundMeterId, edgeType: 'other' });
      break;
    case 'trigger_signal':
      targets.push({ type: 'artifact', id: action.signalGeneratorId, edgeType: 'other' });
      break;
    case 'show_leader_script':
      if (action.stepId) {
        targets.push({ type: 'step', id: action.stepId, edgeType: 'other' });
      }
      break;
    // Actions without entity targets:
    case 'start_timer':
    case 'send_message':
    case 'play_sound':
    case 'show_countdown':
    case 'send_signal':
    case 'time_bank_apply_delta':
    case 'time_bank_pause':
    case 'increment_counter':
    case 'reset_counter':
    case 'send_hint':
    case 'add_replay_marker':
      break;
  }

  return targets;
}

// ============================================================================
// Main Derivation Function
// ============================================================================

/**
 * Derive an overview graph from the game builder state.
 * This creates nodes for phases, steps, and artifacts, plus edges for
 * sequence (step order) and triggers.
 */
export function deriveOverviewGraph(state: GameBuilderState): OverviewGraph {
  const nodes: OverviewNode[] = [];
  const edges: OverviewEdge[] = [];

  // Build lookup sets for validation
  const stepIds = new Set(state.steps.map((s) => s.id));
  const phaseIds = new Set(state.phases.map((p) => p.id));
  const artifactIds = new Set(state.artifacts.map((a) => a.id));
  const roleIds = new Set(state.roles.map((r) => r.id));

  function entityExists(type: NodeType, id: string): boolean {
    switch (type) {
      case 'step':
        return stepIds.has(id);
      case 'phase':
        return phaseIds.has(id);
      case 'artifact':
        return artifactIds.has(id);
      case 'role':
        return roleIds.has(id);
      case 'trigger':
        return false; // Triggers aren't targets
    }
  }

  // Group steps by phase
  const stepsByPhase = new Map<string, StepData[]>();
  stepsByPhase.set('orphan', []);

  for (const phase of state.phases) {
    stepsByPhase.set(phase.id, []);
  }

  for (const step of state.steps) {
    const phaseId = step.phase_id || 'orphan';
    const group = stepsByPhase.get(phaseId);
    if (group) {
      group.push(step);
    } else {
      // Step references non-existent phase - treat as orphan
      stepsByPhase.get('orphan')!.push(step);
    }
  }

  // Create phase nodes
  for (let i = 0; i < state.phases.length; i++) {
    const phase = state.phases[i];
    nodes.push({
      id: `phase-${phase.id}`,
      type: 'phase',
      label: phase.name || `Fas ${i + 1}`,
      entity: phase,
      parentPhaseId: null,
      order: i,
    });
  }

  // Create step nodes
  for (let i = 0; i < state.steps.length; i++) {
    const step = state.steps[i];
    nodes.push({
      id: `step-${step.id}`,
      type: 'step',
      label: step.title || `Steg ${i + 1}`,
      entity: step,
      parentPhaseId: step.phase_id || null,
      order: i,
    });
  }

  // Create artifact nodes (for visualization)
  for (let i = 0; i < state.artifacts.length; i++) {
    const artifact = state.artifacts[i];
    nodes.push({
      id: `artifact-${artifact.id}`,
      type: 'artifact',
      label: artifact.title || `Artifakt ${i + 1}`,
      entity: artifact,
      parentPhaseId: null,
      order: i,
    });
  }

  // Create sequence edges between steps (within same phase)
  for (const [_phaseId, phaseSteps] of stepsByPhase) {
    for (let i = 0; i < phaseSteps.length - 1; i++) {
      edges.push({
        id: `seq-${phaseSteps[i].id}-${phaseSteps[i + 1].id}`,
        type: 'sequence',
        source: `step-${phaseSteps[i].id}`,
        target: `step-${phaseSteps[i + 1].id}`,
      });
    }
  }

  // Create sequence edges between phases
  for (let i = 0; i < state.phases.length - 1; i++) {
    edges.push({
      id: `phase-seq-${state.phases[i].id}-${state.phases[i + 1].id}`,
      type: 'sequence',
      source: `phase-${state.phases[i].id}`,
      target: `phase-${state.phases[i + 1].id}`,
    });
  }

  // Create trigger edges
  for (const trigger of state.triggers) {
    if (!trigger.enabled) continue;
    if (!trigger.id) continue;

    const source = getConditionSource(trigger.condition);
    if (!source) continue;

    // Validate source exists
    const sourceNodeId = `${source.type}-${source.id}`;
    const sourceExists = entityExists(source.type, source.id);

    for (const action of trigger.actions) {
      const targets = getActionTargets(action);

      for (const target of targets) {
        const targetNodeId = `${target.type}-${target.id}`;
        const targetExists = entityExists(target.type, target.id);

        edges.push({
          id: `trigger-${trigger.id}-${sourceNodeId}-${targetNodeId}`,
          type: target.edgeType,
          source: sourceNodeId,
          target: targetNodeId,
          triggerId: trigger.id,
          triggerName: trigger.name,
          unresolved: !sourceExists || !targetExists,
          unresolvedReason: !sourceExists
            ? `Source ${source.type} not found`
            : !targetExists
              ? `Target ${target.type} not found`
              : undefined,
        });
      }
    }
  }

  return {
    nodes,
    edges,
    phases: state.phases,
    stepsByPhase,
  };
}

/**
 * Get edge color based on type.
 */
export function getEdgeColor(type: EdgeType): string {
  switch (type) {
    case 'sequence':
      return '#94a3b8'; // slate-400
    case 'contains':
      return '#64748b'; // slate-500
    case 'unlocks':
      return '#22c55e'; // green-500
    case 'reveals':
      return '#3b82f6'; // blue-500
    case 'advances':
      return '#f97316'; // orange-500
    case 'other':
      return '#a855f7'; // purple-500
  }
}

/**
 * Get node color based on type.
 */
export function getNodeColor(type: NodeType): { bg: string; border: string; text: string } {
  switch (type) {
    case 'phase':
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
    case 'step':
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
    case 'artifact':
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
    case 'role':
      return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' };
    case 'trigger':
      return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' };
  }
}
