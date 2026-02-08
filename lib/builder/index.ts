/**
 * Builder Module Index
 *
 * Re-exports all builder utilities.
 */

// Normalization
export {
  normalizeStepId,
  getArtifactStepId,
  setArtifactStepId,
  normalizeOrder,
  normalizeString,
  normalizeStringToNull,
  isValidUuid,
} from './normalize';

// Resolver
export {
  resolveDraft,
  isDraftValid,
  isPlayable,
  isPublishable,
  // Error routing helpers
  errorsForEntity,
  errorsForPath,
  firstErrorForPath,
  hasErrorsForEntity,
  entitySeverity,
} from './resolver';
export type { GameDraft, ResolveResult } from './resolver';

// Validators
export {
  validateStructure,
  validateCompleteness,
  validateQuality,
} from './validators';
export type {
  DraftForStructureValidation,
  DraftForCompletenessValidation,
  DraftForQualityValidation,
  StepForValidation,
  PhaseForValidation,
  RoleForValidation,
  ArtifactForValidation,
  TriggerForValidation,
} from './validators';
