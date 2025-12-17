/**
 * Game Validator for CSV Import
 * 
 * Validates parsed games before database insertion.
 * Distinguishes between hard errors (blocking) and soft warnings.
 */

import { isValidUUID } from '@/lib/utils/csv';
import type {
  ParsedGame,
  ImportError,
  ImportOptions,
  GamePreview,
  ImportResult,
  ImportStats,
} from '@/types/csv-import';

// =============================================================================
// Types
// =============================================================================

export type ValidationResult = {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
};

export type BatchValidationResult = {
  validGames: ParsedGame[];
  invalidGames: ParsedGame[];
  allErrors: ImportError[];
  allWarnings: ImportError[];
  preview: GamePreview[];
};

// =============================================================================
// Constants
// =============================================================================

// =============================================================================
// Single Game Validation
// =============================================================================

/**
 * Validate a single parsed game.
 */
export function validateGame(
  game: ParsedGame,
  rowNumber: number,
  _options: ImportOptions
): ValidationResult {
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];
  
  // ==========================================================================
  // Hard requirements (blocking errors)
  // ==========================================================================
  
  // Name is required
  if (!game.name || game.name.trim() === '') {
    errors.push({
      row: rowNumber,
      column: 'name',
      message: 'Namn saknas (obligatoriskt)',
      severity: 'error',
    });
  } else if (game.name.length > 200) {
    errors.push({
      row: rowNumber,
      column: 'name',
      message: `Namn för långt (${game.name.length} tecken, max 200)`,
      severity: 'error',
    });
  }
  
  // Short description is required
  if (!game.short_description || game.short_description.trim() === '') {
    errors.push({
      row: rowNumber,
      column: 'short_description',
      message: 'Kort beskrivning saknas (obligatoriskt)',
      severity: 'error',
    });
  } else if (game.short_description.length > 500) {
    errors.push({
      row: rowNumber,
      column: 'short_description',
      message: `Kort beskrivning för lång (${game.short_description.length} tecken, max 500)`,
      severity: 'error',
    });
  }
  
  // Game key - if missing the parser should have generated one (warning only)
  // This shouldn't happen since csv-parser generates game_key, but log warning
  if (!game.game_key || game.game_key.trim() === '') {
    warnings.push({
      row: rowNumber,
      column: 'game_key',
      message: 'game_key saknas (genereras automatiskt)',
      severity: 'warning',
    });
  }
  
  // Play mode must be valid
  if (!['basic', 'facilitated', 'participants'].includes(game.play_mode)) {
    errors.push({
      row: rowNumber,
      column: 'play_mode',
      message: `Ogiltigt play_mode: ${game.play_mode}`,
      severity: 'error',
    });
  }
  
  // At least one step is required
  if (!game.steps || game.steps.length === 0) {
    errors.push({
      row: rowNumber,
      column: 'steps',
      message: 'Minst ett steg krävs',
      severity: 'error',
    });
  }
  
  // ==========================================================================
  // Soft requirements (warnings)
  // ==========================================================================
  
  // main_purpose_id missing
  if (!game.main_purpose_id) {
    warnings.push({
      row: rowNumber,
      column: 'main_purpose_id',
      message: 'main_purpose_id saknas - leken kopplas inte till något syfte',
      severity: 'warning',
    });
  } else if (!isValidUUID(game.main_purpose_id)) {
    errors.push({
      row: rowNumber,
      column: 'main_purpose_id',
      message: 'main_purpose_id är inte ett giltigt UUID',
      severity: 'error',
    });
  }

  // sub_purpose_ids validation
  if (game.sub_purpose_ids && game.sub_purpose_ids.length > 0) {
    for (const purposeId of game.sub_purpose_ids) {
      if (!isValidUUID(purposeId)) {
        errors.push({
          row: rowNumber,
          column: 'sub_purpose_ids',
          message: 'sub_purpose_ids innehåller ogiltigt UUID',
          severity: 'error',
        })
        break
      }
    }
  }
  
  // product_id validation
  if (game.product_id && !isValidUUID(game.product_id)) {
    errors.push({
      row: rowNumber,
      column: 'product_id',
      message: 'product_id är inte ett giltigt UUID',
      severity: 'error',
    });
  }
  
  // owner_tenant_id validation
  if (game.owner_tenant_id && !isValidUUID(game.owner_tenant_id)) {
    errors.push({
      row: rowNumber,
      column: 'owner_tenant_id',
      message: 'owner_tenant_id är inte ett giltigt UUID',
      severity: 'error',
    });
  }
  
  // ==========================================================================
  // Logical validation
  // ==========================================================================
  
  // min_players <= max_players
  if (
    game.min_players !== null &&
    game.max_players !== null &&
    game.min_players > game.max_players
  ) {
    errors.push({
      row: rowNumber,
      column: 'min_players',
      message: `min_players (${game.min_players}) > max_players (${game.max_players})`,
      severity: 'error',
    });
  }
  
  // age_min <= age_max
  if (
    game.age_min !== null &&
    game.age_max !== null &&
    game.age_min > game.age_max
  ) {
    errors.push({
      row: rowNumber,
      column: 'age_min',
      message: `age_min (${game.age_min}) > age_max (${game.age_max})`,
      severity: 'error',
    });
  }
  
  // ==========================================================================
  // Play mode specific validation
  // ==========================================================================
  
  // Facilitated mode should have phases
  if (game.play_mode === 'facilitated' && (!game.phases || game.phases.length === 0)) {
    warnings.push({
      row: rowNumber,
      column: 'phases',
      message: "play_mode är 'facilitated' men inga faser definierade",
      severity: 'warning',
    });
  }
  
  // Participants mode should have roles
  if (game.play_mode === 'participants' && (!game.roles || game.roles.length === 0)) {
    warnings.push({
      row: rowNumber,
      column: 'roles',
      message: "play_mode är 'participants' men inga roller definierade",
      severity: 'warning',
    });
  }
  
  // ==========================================================================
  // Step validation
  // ==========================================================================
  
  if (game.steps) {
    for (let i = 0; i < game.steps.length; i++) {
      const step = game.steps[i];
      
      // Each step should have title and body
      if (!step.title || step.title.trim() === '') {
        warnings.push({
          row: rowNumber,
          column: `step_${i + 1}_title`,
          message: `Steg ${i + 1} saknar titel`,
          severity: 'warning',
        });
      }
      
      if (!step.body || step.body.trim() === '') {
        warnings.push({
          row: rowNumber,
          column: `step_${i + 1}_body`,
          message: `Steg ${i + 1} saknar brödtext`,
          severity: 'warning',
        });
      }
      
      // Duration should be positive
      if (step.duration_seconds !== null && step.duration_seconds < 0) {
        errors.push({
          row: rowNumber,
          column: `step_${i + 1}_duration`,
          message: `Steg ${i + 1} har negativ duration`,
          severity: 'error',
        });
      }
    }
  }
  
  // ==========================================================================
  // Role validation
  // ==========================================================================
  
  if (game.roles) {
    for (let i = 0; i < game.roles.length; i++) {
      const role = game.roles[i];
      
      if (!role.name || role.name.trim() === '') {
        errors.push({
          row: rowNumber,
          column: 'roles',
          message: `Roll ${i + 1} saknar namn`,
          severity: 'error',
        });
      }
      
      if (!role.private_instructions || role.private_instructions.trim() === '') {
        warnings.push({
          row: rowNumber,
          column: 'roles',
          message: `Roll ${i + 1} (${role.name}) saknar privata instruktioner`,
          severity: 'warning',
        });
      }
      
      if (role.min_count > (role.max_count ?? Infinity)) {
        errors.push({
          row: rowNumber,
          column: 'roles',
          message: `Roll ${role.name}: min_count > max_count`,
          severity: 'error',
        });
      }
    }
  }
  
  // ==========================================================================
  // Phase validation
  // ==========================================================================
  
  if (game.phases) {
    for (let i = 0; i < game.phases.length; i++) {
      const phase = game.phases[i];
      
      if (!phase.name || phase.name.trim() === '') {
        errors.push({
          row: rowNumber,
          column: 'phases',
          message: `Fas ${i + 1} saknar namn`,
          severity: 'error',
        });
      }
    }
  }
  
  const isValid = errors.length === 0;
  
  return { isValid, errors, warnings };
}

// =============================================================================
// Batch Validation
// =============================================================================

/**
 * Validate a batch of parsed games.
 */
export function validateGames(
  games: ParsedGame[],
  options: ImportOptions
): BatchValidationResult {
  const validGames: ParsedGame[] = [];
  const invalidGames: ParsedGame[] = [];
  const allErrors: ImportError[] = [];
  const allWarnings: ImportError[] = [];
  const preview: GamePreview[] = [];
  
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const rowNumber = i + 2; // +2 for header row and 0-indexing
    
    const result = validateGame(game, rowNumber, options);
    
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    
    const gamePreview: GamePreview = {
      row: rowNumber,
      game_key: game.game_key,
      name: game.name,
      playMode: game.play_mode,
      stepsCount: game.steps?.length ?? 0,
      phasesCount: game.phases?.length ?? 0,
      rolesCount: game.roles?.length ?? 0,
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
    };
    
    preview.push(gamePreview);
    
    if (result.isValid) {
      validGames.push(game);
    } else {
      invalidGames.push(game);
    }
  }
  
  return {
    validGames,
    invalidGames,
    allErrors,
    allWarnings,
    preview,
  };
}

// =============================================================================
// Import Result Builder
// =============================================================================

/**
 * Build an ImportResult from validation results.
 */
export function buildImportResult(
  validation: BatchValidationResult,
  stats: ImportStats,
  options: ImportOptions
): ImportResult {
  const hasErrors = validation.allErrors.length > 0;
  
  return {
    success: !hasErrors || (hasErrors && validation.validGames.length > 0),
    stats,
    errors: validation.allErrors,
    warnings: validation.allWarnings,
    preview: options.validateOnly ? validation.preview : undefined,
  };
}

/**
 * Build a dry-run result (validation only, no inserts).
 */
export function buildDryRunResult(
  validation: BatchValidationResult
): ImportResult {
  return {
    success: validation.allErrors.length === 0,
    stats: {
      total: validation.validGames.length + validation.invalidGames.length,
      created: 0,
      updated: 0,
      skipped: validation.invalidGames.length,
    },
    errors: validation.allErrors,
    warnings: validation.allWarnings,
    preview: validation.preview,
  };
}
