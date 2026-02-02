/**
 * Wizard Module Index
 *
 * Public exports for the wizard system.
 * Wizard dispatches standard reducer actions - NO shadow state.
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

// Types
export type {
  WizardMode,
  WizardStep,
  WizardUIState,
  TemplateId,
  TemplateMetadata,
} from './types';

export {
  DEFAULT_WIZARD_UI_STATE,
} from './types';

// Actions (strict - throw on invalid input)
export {
  switchToAdvancedMode,
  switchToSimpleMode,
  createStep,
  attachArtifactToStep,
  assignStepToPhase,
} from './actions';

// UI Helpers (forgiving - normalize or skip)
export {
  normalizeToRawId,
  isNodeId,
  safeAttachArtifactToStep,
  safeAssignStepToPhase,
  dispatchSafeActions,
} from './ui-helpers';

// Templates
export {
  TEMPLATE_METADATA,
  applyTemplate,
  getAvailableTemplates,
  getTemplatesForMode,
} from './templates';

// Suggestions
export {
  getSuggestedActionsForCondition,
  getSuggestedConditionsForAction,
  getAllConditionTypes,
  getAllActionTypes,
  isPuzzleCondition,
  isResetAction,
  getConditionLabel,
  getActionLabel,
  getBeginnerConditions,
  getBeginnerActions,
  suggestTriggerTemplate,
} from './suggestions';
