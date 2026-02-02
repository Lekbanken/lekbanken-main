/**
 * Wizard Components
 *
 * UI components for the game builder wizard.
 * All components use:
 * - Reducer actions via dispatch (no shadow state)
 * - ResolveResult for validation (no duplicate validation)
 * - Wizard module for actions/templates/suggestions
 */

export { WizardPanel, type WizardPanelProps } from './WizardPanel';
export { WizardModeToggle, type WizardModeToggleProps } from './WizardModeToggle';
export { GameTemplatePicker, type GameTemplatePickerProps } from './GameTemplatePicker';
export { SuggestedNextActions, type SuggestedNextActionsProps, type SuggestedAction } from './SuggestedNextActions';
