/**
 * Completeness Validator (Playable Gate)
 *
 * Validates that the game has minimum required content to be played/tested.
 * These errors block preview/test functionality.
 *
 * Checks:
 * - Game has a title
 * - Game has a purpose selected
 * - Game has at least one step OR a description
 * - Steps have content (not empty)
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

import {
  type BuilderError,
  createBuilderError,
  BUILDER_ERROR_CODES,
} from '@/types/builder-error';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Step data needed for completeness validation.
 */
export interface StepForCompleteness {
  id: string;
  title?: string | null;
  body?: string | null;
}

/**
 * Core data needed for completeness validation.
 */
export interface CoreForCompleteness {
  name?: string;
  description?: string;
  main_purpose_id?: string | null;
}

/**
 * Complete draft data for completeness validation.
 */
export interface DraftForCompletenessValidation {
  core?: CoreForCompleteness;
  steps?: StepForCompleteness[];
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate completeness of the draft (playable gate).
 *
 * @returns Array of BuilderError (empty if valid)
 */
export function validateCompleteness(
  draft: DraftForCompletenessValidation
): BuilderError[] {
  const errors: BuilderError[] = [];

  // Check game title
  if (!draft.core?.name?.trim()) {
    errors.push(
      createBuilderError(
        BUILDER_ERROR_CODES.MISSING_TITLE,
        'Spelet saknar titel',
        'playable',
        'error',
        'core.name',
        { entityType: 'core' }
      )
    );
  }

  // Check purpose
  if (!draft.core?.main_purpose_id) {
    errors.push(
      createBuilderError(
        BUILDER_ERROR_CODES.MISSING_PURPOSE,
        'Spelet saknar huvudsyfte',
        'playable',
        'error',
        'core.main_purpose_id',
        { entityType: 'core' }
      )
    );
  }

  // Check for steps OR description
  const hasSteps = (draft.steps?.length ?? 0) > 0;
  const hasDescription = Boolean(draft.core?.description?.trim());

  if (!hasSteps && !hasDescription) {
    errors.push(
      createBuilderError(
        BUILDER_ERROR_CODES.NO_STEPS,
        'Spelet saknar steg och beskrivning',
        'playable',
        'error',
        'steps',
        { entityType: 'core' }
      )
    );
  }

  // Check that steps have content
  draft.steps?.forEach((step, i) => {
    const hasTitle = Boolean(step.title?.trim());
    const hasBody = Boolean(step.body?.trim());

    if (!hasTitle && !hasBody) {
      errors.push(
        createBuilderError(
          BUILDER_ERROR_CODES.EMPTY_STEP,
          `Steg ${i + 1} saknar innehåll`,
          'playable',
          'error',
          `steps[${i}]`,
          {
            entityType: 'step',
            entityId: step.id,
            stepIndex: i,
          }
        )
      );
    }
  });

  return errors;
}
