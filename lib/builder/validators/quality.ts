/**
 * Quality Validator (Publish Gate)
 *
 * Validates quality recommendations for publishing.
 * All items at this gate are WARNINGS - they never block any action.
 *
 * Checks:
 * - Cover image present
 * - Description length adequate
 * - Age range specified
 * - Player count specified
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
 * Core data needed for quality validation.
 */
export interface CoreForQuality {
  description?: string;
  age_min?: number | null;
  age_max?: number | null;
  min_players?: number | null;
  max_players?: number | null;
}

/**
 * Cover data needed for quality validation.
 */
export interface CoverForQuality {
  mediaId?: string | null;
}

/**
 * Public board config for beta validation.
 */
export interface PublicBoardForQuality {
  enabled?: boolean;
  // Add more fields as board config evolves
}

/**
 * Complete draft data for quality validation.
 */
export interface DraftForQualityValidation {
  core?: CoreForQuality;
  cover?: CoverForQuality;
  boardConfig?: {
    publicBoard?: PublicBoardForQuality;
  };
  // Demo content flag
  is_demo_content?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Minimum recommended description length.
 */
const MIN_DESCRIPTION_LENGTH = 50;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate quality of the draft (publish gate).
 *
 * All items returned are WARNINGS - they are shown to the user
 * but NEVER block any action including publish.
 *
 * @returns Array of BuilderError (all with severity: 'warning')
 */
export function validateQuality(
  draft: DraftForQualityValidation
): BuilderError[] {
  const warnings: BuilderError[] = [];

  // Check cover image
  if (!draft.cover?.mediaId) {
    warnings.push(
      createBuilderError(
        BUILDER_ERROR_CODES.NO_COVER,
        'Spelet saknar omslagsbild',
        'publish',
        'warning',
        'cover.mediaId',
        { entityType: 'core' }
      )
    );
  }

  // Check description length
  const descriptionLength = draft.core?.description?.trim().length ?? 0;
  if (descriptionLength < MIN_DESCRIPTION_LENGTH) {
    warnings.push(
      createBuilderError(
        BUILDER_ERROR_CODES.SHORT_DESCRIPTION,
        `Beskrivningen är kort (${descriptionLength} tecken, rekommenderat: minst ${MIN_DESCRIPTION_LENGTH})`,
        'publish',
        'warning',
        'core.description',
        {
          entityType: 'core',
          currentLength: descriptionLength,
          recommendedLength: MIN_DESCRIPTION_LENGTH,
        }
      )
    );
  }

  // Check age range
  if (draft.core?.age_min == null && draft.core?.age_max == null) {
    warnings.push(
      createBuilderError(
        BUILDER_ERROR_CODES.MISSING_AGE_RANGE,
        'Åldersrekommendation saknas',
        'publish',
        'warning',
        'core.age_min',
        { entityType: 'core' }
      )
    );
  }

  // Check player count
  if (draft.core?.min_players == null && draft.core?.max_players == null) {
    warnings.push(
      createBuilderError(
        BUILDER_ERROR_CODES.MISSING_PLAYER_COUNT,
        'Antal spelare saknas',
        'publish',
        'warning',
        'core.min_players',
        { entityType: 'core' }
      )
    );
  }

  // ==========================================================================
  // BETA FEATURE WARNINGS (SPRINT 3 P1)
  // These are informational - they never block any action.
  // ==========================================================================

  // Public Board beta warning
  if (draft.boardConfig?.publicBoard?.enabled) {
    warnings.push(
      createBuilderError(
        BUILDER_ERROR_CODES.PUBLIC_BOARD_BETA,
        'Beta: Publik tavla är aktiverad men valideras inte fullt ännu',
        'publish',
        'warning',
        'boardConfig.publicBoard',
        { 
          entityType: 'core',
          isBetaFeature: true,
        }
      )
    );
  }

  // Demo content without cover warning
  // NOTE: isDemoContent is separate from isBetaFeature (demo is a content policy, not a beta feature)
  if (draft.is_demo_content && !draft.cover?.mediaId) {
    warnings.push(
      createBuilderError(
        BUILDER_ERROR_CODES.DEMO_MISSING_COVER,
        'Demo-lek saknar omslagsbild',
        'publish',
        'warning',
        'cover.mediaId',
        { 
          entityType: 'core',
          isDemoContent: true,
        }
      )
    );
  }

  return warnings;
}
