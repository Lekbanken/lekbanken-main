/**
 * Game Builder Validation Utilities
 * 
 * Validates artifact and trigger references to catch broken refs before publish.
 * Task 2.6 - Session Cockpit Architecture
 */

import type { ArtifactFormData } from '@/types/games';
import type { TriggerCondition, TriggerAction } from '@/types/trigger';

// =============================================================================
// Types
// =============================================================================

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationError {
  id: string;
  severity: ValidationSeverity;
  message: string;
  /** Which section the error belongs to */
  section: 'artifacts' | 'triggers' | 'steps' | 'roles' | 'phases';
  /** ID of the item with the error */
  itemId: string;
  /** Name of the item for display */
  itemName: string;
  /** Suggested fix action */
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  /** Summary counts */
  counts: {
    errors: number;
    warnings: number;
    artifactErrors: number;
    triggerErrors: number;
  };
}

export interface GameDataForValidation {
  artifacts: ArtifactFormData[];
  triggers: Array<{
    id: string;
    name: string;
    enabled: boolean;
    condition: TriggerCondition;
    actions: TriggerAction[];
  }>;
  steps: Array<{ id: string; title: string }>;
  phases: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
}

// =============================================================================
// Artifact ID extractors from trigger conditions/actions
// =============================================================================

function getArtifactIdsFromCondition(condition: TriggerCondition): string[] {
  const ids: string[] = [];
  
  switch (condition.type) {
    case 'artifact_unlocked':
      ids.push(condition.artifactId);
      break;
    case 'keypad_correct':
    case 'keypad_failed':
      ids.push(condition.keypadId);
      break;
    case 'riddle_correct':
      ids.push(condition.riddleId);
      break;
    case 'audio_acknowledged':
      ids.push(condition.audioId);
      break;
    case 'multi_answer_complete':
      ids.push(condition.multiAnswerId);
      break;
    case 'scan_verified':
      ids.push(condition.scanGateId);
      break;
    case 'hotspot_found':
    case 'hotspot_hunt_complete':
      ids.push(condition.hotspotHuntId);
      break;
    case 'tile_puzzle_complete':
      ids.push(condition.tilePuzzleId);
      break;
    case 'cipher_decoded':
      ids.push(condition.cipherId);
      break;
    case 'prop_confirmed':
    case 'prop_rejected':
      ids.push(condition.propId);
      break;
    case 'location_verified':
      ids.push(condition.locationId);
      break;
    case 'logic_grid_solved':
      ids.push(condition.gridId);
      break;
    case 'sound_level_triggered':
      ids.push(condition.soundMeterId);
      break;
    case 'signal_generator_triggered':
      ids.push(condition.signalGeneratorId);
      break;
    // Note: time_bank_expired may reference session-level time bank
    case 'time_bank_expired':
      if (condition.timeBankId) ids.push(condition.timeBankId);
      break;
  }
  
  return ids;
}

function getArtifactIdsFromAction(action: TriggerAction): string[] {
  const ids: string[] = [];
  
  switch (action.type) {
    case 'reveal_artifact':
    case 'hide_artifact':
      ids.push(action.artifactId);
      break;
    case 'reset_keypad':
      ids.push(action.keypadId);
      break;
    case 'reset_riddle':
      ids.push(action.riddleId);
      break;
    case 'reset_scan_gate':
      ids.push(action.scanGateId);
      break;
    case 'reset_hotspot_hunt':
      ids.push(action.hotspotHuntId);
      break;
    case 'reset_tile_puzzle':
      ids.push(action.tilePuzzleId);
      break;
    case 'reset_cipher':
      ids.push(action.cipherId);
      break;
    case 'reset_prop':
      ids.push(action.propId);
      break;
    case 'reset_location':
      ids.push(action.locationId);
      break;
    case 'reset_logic_grid':
      ids.push(action.gridId);
      break;
    case 'reset_sound_meter':
      ids.push(action.soundMeterId);
      break;
    case 'trigger_signal':
      ids.push(action.signalGeneratorId);
      break;
    case 'time_bank_pause':
      if (action.timeBankId) ids.push(action.timeBankId);
      break;
  }
  
  return ids;
}

function getStepIdsFromCondition(condition: TriggerCondition): string[] {
  switch (condition.type) {
    case 'step_started':
    case 'step_completed':
      return [condition.stepId];
    default:
      return [];
  }
}

function getPhaseIdsFromCondition(condition: TriggerCondition): string[] {
  switch (condition.type) {
    case 'phase_started':
    case 'phase_completed':
      return [condition.phaseId];
    default:
      return [];
  }
}

// =============================================================================
// Main Validation Function
// =============================================================================

export function validateGameRefs(data: GameDataForValidation): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Build lookup sets
  const artifactIds = new Set(data.artifacts.map((a) => a.id));
  const stepIds = new Set(data.steps.map((s) => s.id));
  const phaseIds = new Set(data.phases.map((p) => p.id));
  const roleIds = new Set(data.roles.map((r) => r.id));
  
  // ==========================================================================
  // Validate Triggers
  // ==========================================================================
  
  for (const trigger of data.triggers) {
    // Skip disabled triggers (warnings only)
    const severity: ValidationSeverity = trigger.enabled ? 'error' : 'warning';
    
    // Check condition artifact refs
    const conditionArtifactIds = getArtifactIdsFromCondition(trigger.condition);
    for (const artifactId of conditionArtifactIds) {
      if (!artifactIds.has(artifactId)) {
        const item: ValidationError = {
          id: `trigger-condition-artifact-${trigger.id}-${artifactId}`,
          severity,
          message: `Trigger "${trigger.name}" refererar till artefakt som inte finns`,
          section: 'triggers',
          itemId: trigger.id,
          itemName: trigger.name,
          suggestion: 'Ta bort triggern eller välj en annan artefakt',
        };
        if (severity === 'error') {
          errors.push(item);
        } else {
          warnings.push(item);
        }
      }
    }
    
    // Check condition step refs
    const conditionStepIds = getStepIdsFromCondition(trigger.condition);
    for (const stepId of conditionStepIds) {
      if (!stepIds.has(stepId)) {
        const item: ValidationError = {
          id: `trigger-condition-step-${trigger.id}-${stepId}`,
          severity,
          message: `Trigger "${trigger.name}" refererar till steg som inte finns`,
          section: 'triggers',
          itemId: trigger.id,
          itemName: trigger.name,
          suggestion: 'Ta bort triggern eller välj ett annat steg',
        };
        if (severity === 'error') {
          errors.push(item);
        } else {
          warnings.push(item);
        }
      }
    }
    
    // Check condition phase refs
    const conditionPhaseIds = getPhaseIdsFromCondition(trigger.condition);
    for (const phaseId of conditionPhaseIds) {
      if (!phaseIds.has(phaseId)) {
        const item: ValidationError = {
          id: `trigger-condition-phase-${trigger.id}-${phaseId}`,
          severity,
          message: `Trigger "${trigger.name}" refererar till fas som inte finns`,
          section: 'triggers',
          itemId: trigger.id,
          itemName: trigger.name,
          suggestion: 'Ta bort triggern eller välj en annan fas',
        };
        if (severity === 'error') {
          errors.push(item);
        } else {
          warnings.push(item);
        }
      }
    }
    
    // Check action artifact refs
    for (const action of trigger.actions) {
      const actionArtifactIds = getArtifactIdsFromAction(action);
      for (const artifactId of actionArtifactIds) {
        if (!artifactIds.has(artifactId)) {
          const item: ValidationError = {
            id: `trigger-action-artifact-${trigger.id}-${artifactId}`,
            severity,
            message: `Trigger "${trigger.name}" har action som refererar till artefakt som inte finns`,
            section: 'triggers',
            itemId: trigger.id,
            itemName: trigger.name,
            suggestion: 'Uppdatera action eller ta bort triggern',
          };
          if (severity === 'error') {
            errors.push(item);
          } else {
            warnings.push(item);
          }
        }
      }
    }
  }
  
  // ==========================================================================
  // Validate Artifact metadata refs
  // ==========================================================================
  
  for (const artifact of data.artifacts) {
    const metadata = artifact.metadata as Record<string, unknown> | null;
    if (!metadata) continue;
    
    // Check for promptArtifactId in riddle config
    if (metadata.promptArtifactId && typeof metadata.promptArtifactId === 'string') {
      if (!artifactIds.has(metadata.promptArtifactId)) {
        errors.push({
          id: `artifact-prompt-ref-${artifact.id}`,
          severity: 'error',
          message: `Artefakt "${artifact.title}" refererar till prompt-artefakt som inte finns`,
          section: 'artifacts',
          itemId: artifact.id,
          itemName: artifact.title,
          suggestion: 'Uppdatera promptArtifactId eller ta bort referensen',
        });
      }
    }
    
    // Check for audioArtifactId in audio config
    if (metadata.audioArtifactId && typeof metadata.audioArtifactId === 'string') {
      if (!artifactIds.has(metadata.audioArtifactId)) {
        errors.push({
          id: `artifact-audio-ref-${artifact.id}`,
          severity: 'error',
          message: `Artefakt "${artifact.title}" refererar till ljudartefakt som inte finns`,
          section: 'artifacts',
          itemId: artifact.id,
          itemName: artifact.title,
          suggestion: 'Uppdatera audioArtifactId eller ta bort referensen',
        });
      }
    }
    
    // Check for role visibility refs
    for (const variant of artifact.variants) {
      if (variant.visible_to_role_id && !roleIds.has(variant.visible_to_role_id)) {
        errors.push({
          id: `artifact-role-ref-${artifact.id}-${variant.id}`,
          severity: 'error',
          message: `Artefakt "${artifact.title}" har variant synlig för roll som inte finns`,
          section: 'artifacts',
          itemId: artifact.id,
          itemName: artifact.title,
          suggestion: 'Välj en annan roll eller ändra synlighet',
        });
      }
    }
  }
  
  // ==========================================================================
  // Warnings for orphaned artifacts
  // ==========================================================================
  
  // Find artifacts not referenced by any trigger
  const referencedArtifactIds = new Set<string>();
  for (const trigger of data.triggers) {
    for (const id of getArtifactIdsFromCondition(trigger.condition)) {
      referencedArtifactIds.add(id);
    }
    for (const action of trigger.actions) {
      for (const id of getArtifactIdsFromAction(action)) {
        referencedArtifactIds.add(id);
      }
    }
  }
  
  // Only warn for puzzle-type artifacts that should have triggers
  const puzzleTypes = new Set([
    'keypad', 'riddle', 'multi_answer', 'counter', 'qr_gate', 
    'hotspot', 'tile_puzzle', 'cipher', 'logic_grid', 
    'prop_confirmation', 'location_check', 'sound_level'
  ]);
  
  for (const artifact of data.artifacts) {
    if (puzzleTypes.has(artifact.artifact_type) && !referencedArtifactIds.has(artifact.id)) {
      warnings.push({
        id: `artifact-orphan-${artifact.id}`,
        severity: 'warning',
        message: `Pusselartefakt "${artifact.title}" refereras inte av någon trigger`,
        section: 'artifacts',
        itemId: artifact.id,
        itemName: artifact.title,
        suggestion: 'Lägg till en trigger som använder denna artefakt',
      });
    }
  }
  
  // ==========================================================================
  // Build result
  // ==========================================================================
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    counts: {
      errors: errors.length,
      warnings: warnings.length,
      artifactErrors: errors.filter((e) => e.section === 'artifacts').length,
      triggerErrors: errors.filter((e) => e.section === 'triggers').length,
    },
  };
}

/**
 * Quick check if there are any validation errors (for QualityChecklist)
 */
export function hasValidationErrors(data: GameDataForValidation): boolean {
  const result = validateGameRefs(data);
  return !result.isValid;
}
