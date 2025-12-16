/**
 * CSV Parser for Game Import
 * 
 * Parses CSV data into ParsedGame[] with validation.
 * Handles all three play modes: basic, facilitated, participants
 */

import {
  parseCSV,
  parseJsonCell,
  parseInteger,
  generateGameKey,
  stripHtml,
  truncate,
} from '@/lib/utils/csv';
import type {
  ParsedGame,
  ParsedStep,
  ParsedMaterials,
  ParsedPhase,
  ParsedRole,
  ParsedBoardConfig,
  ImportError,
} from '@/types/csv-import';
import type { PlayMode, PhaseType, TimerStyle, AssignmentStrategy } from '@/types/games';

// =============================================================================
// Types
// =============================================================================

export type CsvParseResult = {
  success: boolean;
  games: ParsedGame[];
  errors: ImportError[];
  warnings: ImportError[];
};

// =============================================================================
// Constants
// =============================================================================

const VALID_PLAY_MODES: PlayMode[] = ['basic', 'facilitated', 'participants'];
const VALID_ENERGY_LEVELS = ['low', 'medium', 'high'];
const VALID_LOCATION_TYPES = ['indoor', 'outdoor', 'both'];
const VALID_STATUSES = ['draft', 'published'];
const VALID_PHASE_TYPES: PhaseType[] = ['intro', 'round', 'finale', 'break'];
const VALID_TIMER_STYLES: TimerStyle[] = ['countdown', 'elapsed', 'trafficlight'];
const VALID_ASSIGNMENT_STRATEGIES: AssignmentStrategy[] = ['random', 'leader_picks', 'player_picks'];
const MAX_STEPS = 20;
const MAX_TEXT = 10000;

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse CSV string into ParsedGame array.
 */
export function parseCsvGames(csvContent: string): CsvParseResult {
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];
  const games: ParsedGame[] = [];
  
  // Step 1: Parse raw CSV (use generic Record type, cast later)
  const csvResult = parseCSV<Record<string, string>>(csvContent);
  
  if (!csvResult.success) {
    errors.push(...csvResult.errors.map(e => ({
      row: e.row,
      column: e.column,
      message: e.message,
      severity: 'error' as const,
    })));
    return { success: false, games: [], errors, warnings };
  }
  
  if (csvResult.data.length === 0) {
    errors.push({
      row: 0,
      message: 'Ingen data hittades i CSV-filen',
      severity: 'error',
    });
    return { success: false, games: [], errors, warnings };
  }
  
  // Step 2: Parse each row into ParsedGame
  for (let i = 0; i < csvResult.data.length; i++) {
    const rowNumber = i + 2; // +2 because row 1 is headers, arrays are 0-indexed
    const row = csvResult.data[i];
    
    const result = parseGameRow(row, rowNumber);
    
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    
    if (result.game) {
      games.push(result.game);
    }
  }
  
  // Check if any critical errors
  const hasErrors = errors.some(e => e.severity === 'error');
  
  return {
    success: !hasErrors,
    games,
    errors,
    warnings,
  };
}

// =============================================================================
// Row Parser
// =============================================================================

type RowParseResult = {
  game: ParsedGame | null;
  errors: ImportError[];
  warnings: ImportError[];
};

function parseGameRow(row: Record<string, string>, rowNumber: number): RowParseResult {
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];
  
  // ==========================================================================
  // Validate required fields
  // ==========================================================================
  
  const name = sanitizeText(row.name);
  if (!name) {
    errors.push({
      row: rowNumber,
      column: 'name',
      message: 'Namn saknas (obligatoriskt)',
      severity: 'error',
    });
  }
  
  const shortDescription = sanitizeText(row.short_description);
  if (!shortDescription) {
    errors.push({
      row: rowNumber,
      column: 'short_description',
      message: 'Kort beskrivning saknas (obligatoriskt)',
      severity: 'error',
    });
  }
  
  // Play mode
  const playModeRaw = row.play_mode?.toLowerCase().trim() || 'basic';
  const playMode = VALID_PLAY_MODES.includes(playModeRaw as PlayMode) 
    ? (playModeRaw as PlayMode) 
    : 'basic';
  
  if (row.play_mode && !VALID_PLAY_MODES.includes(playModeRaw as PlayMode)) {
    warnings.push({
      row: rowNumber,
      column: 'play_mode',
      message: `Ogiltigt play_mode "${row.play_mode}", använder 'basic'`,
      severity: 'warning',
    });
  }
  
  // Game key
  const gameKey = row.game_key?.trim() || generateGameKey(name || 'unnamed');
  if (!row.game_key?.trim()) {
    warnings.push({
      row: rowNumber,
      column: 'game_key',
      message: `game_key saknas, genererade: ${gameKey}`,
      severity: 'warning',
    });
  }
  
  // ==========================================================================
  // Parse steps
  // ==========================================================================
  
  const stepsResult = parseInlineSteps(row, rowNumber);
  errors.push(...stepsResult.errors);
  warnings.push(...stepsResult.warnings);
  
  // Validate step count
  const declaredStepCount = parseInteger(row.step_count);
  if (declaredStepCount !== null && declaredStepCount > MAX_STEPS) {
    errors.push({
      row: rowNumber,
      column: 'step_count',
      message: `För många steg (${declaredStepCount}). Max ${MAX_STEPS} inline steg stöds. Använd JSON-format för fler.`,
      severity: 'error',
    });
  }
  
  // At least one step required
  if (stepsResult.steps.length === 0) {
    errors.push({
      row: rowNumber,
      column: 'step_1_title',
      message: 'Minst ett steg krävs (step_1_title och step_1_body)',
      severity: 'error',
    });
  }
  
  // ==========================================================================
  // Parse JSON columns
  // ==========================================================================
  
  // Materials
  const materialsResult = parseJsonCell<ParsedMaterials>(
    row.materials_json,
    rowNumber,
    'materials_json'
  );
  if (!materialsResult.success) {
    errors.push({ ...materialsResult.error, severity: 'error' });
  }
  const materials = materialsResult.success ? materialsResult.data : null;
  
  // Phases
  const phasesResult = parseJsonCell<ParsedPhase[]>(
    row.phases_json,
    rowNumber,
    'phases_json'
  );
  if (!phasesResult.success) {
    errors.push({ ...phasesResult.error, severity: 'error' });
  }
  const phases = validatePhases(
    phasesResult.success ? phasesResult.data : null,
    rowNumber,
    playMode,
    warnings
  );
  
  // Roles
  const rolesResult = parseJsonCell<ParsedRole[]>(
    row.roles_json,
    rowNumber,
    'roles_json'
  );
  if (!rolesResult.success) {
    errors.push({ ...rolesResult.error, severity: 'error' });
  }
  const roles = validateRoles(
    rolesResult.success ? rolesResult.data : null,
    rowNumber,
    playMode,
    warnings
  );
  
  // Board config
  const boardConfigResult = parseJsonCell<ParsedBoardConfig>(
    row.board_config_json,
    rowNumber,
    'board_config_json'
  );
  if (!boardConfigResult.success) {
    errors.push({ ...boardConfigResult.error, severity: 'error' });
  }
  const boardConfig = boardConfigResult.success ? boardConfigResult.data : null;
  
  // ==========================================================================
  // Parse optional fields
  // ==========================================================================
  
  // Soft warning for main_purpose_id
  if (!row.main_purpose_id?.trim()) {
    warnings.push({
      row: rowNumber,
      column: 'main_purpose_id',
      message: 'main_purpose_id saknas - leken kopplas inte till något syfte',
      severity: 'warning',
    });
  }
  
  // Energy level
  const energyLevel = VALID_ENERGY_LEVELS.includes(row.energy_level?.toLowerCase() || '')
    ? (row.energy_level!.toLowerCase() as 'low' | 'medium' | 'high')
    : null;
  
  // Location type
  const locationType = VALID_LOCATION_TYPES.includes(row.location_type?.toLowerCase() || '')
    ? (row.location_type!.toLowerCase() as 'indoor' | 'outdoor' | 'both')
    : null;
  
  // Status
  const status = VALID_STATUSES.includes(row.status?.toLowerCase() || '')
    ? (row.status!.toLowerCase() as 'draft' | 'published')
    : 'draft';
  
  // ==========================================================================
  // Build ParsedGame
  // ==========================================================================
  
  // If critical errors, don't return a game
  if (errors.some(e => e.severity === 'error')) {
    return { game: null, errors, warnings };
  }
  
  const game: ParsedGame = {
    game_key: gameKey,
    name: name!,
    short_description: shortDescription!,
    description: sanitizeText(row.description),
    play_mode: playMode,
    status,
    locale: row.locale?.trim() || null,
    
    energy_level: energyLevel,
    location_type: locationType,
    time_estimate_min: parseInteger(row.time_estimate_min),
    duration_max: parseInteger(row.duration_max),
    min_players: parseInteger(row.min_players),
    max_players: parseInteger(row.max_players),
    players_recommended: parseInteger(row.players_recommended),
    age_min: parseInteger(row.age_min),
    age_max: parseInteger(row.age_max),
    difficulty: row.difficulty?.trim() || null,
    accessibility_notes: sanitizeText(row.accessibility_notes),
    space_requirements: sanitizeText(row.space_requirements),
    leader_tips: sanitizeText(row.leader_tips),
    
    main_purpose_id: row.main_purpose_id?.trim() || null,
    product_id: row.product_id?.trim() || null,
    owner_tenant_id: row.owner_tenant_id?.trim() || null,
    
    steps: stepsResult.steps,
    materials,
    phases,
    roles,
    boardConfig,
  };
  
  return { game, errors, warnings };
}

// =============================================================================
// Step Parser
// =============================================================================

type StepsParseResult = {
  steps: ParsedStep[];
  errors: ImportError[];
  warnings: ImportError[];
};

function parseInlineSteps(row: Record<string, string>, rowNumber: number): StepsParseResult {
  const steps: ParsedStep[] = [];
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];
  
  for (let i = 1; i <= MAX_STEPS; i++) {
    const titleKey = `step_${i}_title`;
    const bodyKey = `step_${i}_body`;
    const durationKey = `step_${i}_duration`;
    
    const title = row[titleKey]?.trim();
    const body = row[bodyKey]?.trim();
    const duration = parseInteger(row[durationKey]);
    
    // Skip empty steps
    if (!title && !body) {
      continue;
    }
    
    // Validate step has both title and body
    if (title && !body) {
      warnings.push({
        row: rowNumber,
        column: bodyKey,
        message: `Steg ${i} har titel men ingen brödtext`,
        severity: 'warning',
      });
    }
    
    if (!title && body) {
      warnings.push({
        row: rowNumber,
        column: titleKey,
        message: `Steg ${i} har brödtext men ingen titel`,
        severity: 'warning',
      });
    }
    
    steps.push({
      step_order: i,
      title: sanitizeText(title) || `Steg ${i}`,
      body: sanitizeText(body) || '',
      duration_seconds: duration,
      leader_script: null,
      participant_prompt: null,
      board_text: null,
      optional: false,
    });
  }
  
  return { steps, errors, warnings };
}

// =============================================================================
// Validation Helpers
// =============================================================================

function validatePhases(
  phases: ParsedPhase[] | null,
  rowNumber: number,
  playMode: PlayMode,
  warnings: ImportError[]
): ParsedPhase[] {
  if (!phases || !Array.isArray(phases)) {
    // Warn if facilitated mode without phases
    if (playMode === 'facilitated' || playMode === 'participants') {
      warnings.push({
        row: rowNumber,
        column: 'phases_json',
        message: `play_mode är '${playMode}' men inga faser definierade`,
        severity: 'warning',
      });
    }
    return [];
  }
  
  return phases.map((phase, i) => ({
    phase_order: phase.phase_order ?? i + 1,
    name: phase.name || `Fas ${i + 1}`,
    phase_type: VALID_PHASE_TYPES.includes(phase.phase_type) ? phase.phase_type : 'round',
    duration_seconds: phase.duration_seconds ?? null,
    timer_visible: phase.timer_visible ?? true,
    timer_style: VALID_TIMER_STYLES.includes(phase.timer_style) ? phase.timer_style : 'countdown',
    description: phase.description ?? null,
    board_message: phase.board_message ?? null,
    auto_advance: phase.auto_advance ?? false,
  }));
}

function validateRoles(
  roles: ParsedRole[] | null,
  rowNumber: number,
  playMode: PlayMode,
  warnings: ImportError[]
): ParsedRole[] {
  if (!roles || !Array.isArray(roles)) {
    // Warn if participants mode without roles
    if (playMode === 'participants') {
      warnings.push({
        row: rowNumber,
        column: 'roles_json',
        message: "play_mode är 'participants' men inga roller definierade",
        severity: 'warning',
      });
    }
    return [];
  }
  
  return roles.map((role, i) => ({
    role_order: role.role_order ?? i + 1,
    name: role.name || `Roll ${i + 1}`,
    icon: role.icon ?? null,
    color: role.color ?? null,
    public_description: role.public_description ?? null,
    private_instructions: role.private_instructions || '',
    private_hints: role.private_hints ?? null,
    min_count: role.min_count ?? 1,
    max_count: role.max_count ?? null,
    assignment_strategy: VALID_ASSIGNMENT_STRATEGIES.includes(role.assignment_strategy) 
      ? role.assignment_strategy 
      : 'random',
    scaling_rules: role.scaling_rules ?? null,
    conflicts_with: Array.isArray(role.conflicts_with) ? role.conflicts_with : [],
  }));
}

// =============================================================================
// Sanitization
// =============================================================================

function sanitizeText(value: string | undefined): string | null {
  if (!value || value.trim() === '') {
    return null;
  }
  
  // Strip HTML, truncate to max length
  let sanitized = stripHtml(value.trim());
  sanitized = truncate(sanitized, MAX_TEXT);
  
  return sanitized;
}
