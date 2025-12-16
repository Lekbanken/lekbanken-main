/**
 * CSV Generator for Game Export
 * 
 * Generates CSV data from games for export.
 * Handles all three play modes: basic, facilitated, participants
 */

import { generateCSV } from '@/lib/utils/csv';
import type { ExportableGame, ExportOptions } from '@/types/csv-import';

// =============================================================================
// Constants
// =============================================================================

const MAX_STEPS = 20;

// Column definitions in order
const CORE_COLUMNS = [
  'id',
  'game_key',
  'name',
  'short_description',
  'description',
  'play_mode',
  'status',
  'locale',
];

const METADATA_COLUMNS = [
  'energy_level',
  'location_type',
  'time_estimate_min',
  'duration_max',
  'min_players',
  'max_players',
  'players_recommended',
  'age_min',
  'age_max',
  'difficulty',
  'accessibility_notes',
  'space_requirements',
  'leader_tips',
];

const REFERENCE_COLUMNS = [
  'main_purpose_id',
  'product_id',
  'owner_tenant_id',
  'cover_media_url',
];

const VALIDATION_COLUMNS = [
  'step_count',
];

// =============================================================================
// Column Generators
// =============================================================================

function getStepColumns(maxSteps: number = MAX_STEPS): string[] {
  const columns: string[] = [];
  for (let i = 1; i <= maxSteps; i++) {
    columns.push(`step_${i}_title`, `step_${i}_body`, `step_${i}_duration`);
  }
  return columns;
}

function getAllColumns(options: ExportOptions): string[] {
  const columns = [...CORE_COLUMNS, ...METADATA_COLUMNS, ...REFERENCE_COLUMNS];
  
  if (options.includeSteps) {
    columns.push(...VALIDATION_COLUMNS);
    columns.push(...getStepColumns());
  }
  
  if (options.includeMaterials) {
    columns.push('materials_json');
  }
  
  if (options.includePhases) {
    columns.push('phases_json');
  }
  
  if (options.includeRoles) {
    columns.push('roles_json');
  }
  
  if (options.includeBoardConfig) {
    columns.push('board_config_json');
  }
  
  return columns;
}

// =============================================================================
// Game to Row Conversion
// =============================================================================

type CsvRow = Record<string, string | number | null>;

function gameToRow(game: ExportableGame, options: ExportOptions): CsvRow {
  const row: CsvRow = {
    // Core
    id: game.id,
    game_key: game.game_key,
    name: game.name,
    short_description: game.short_description,
    description: game.description,
    play_mode: game.play_mode,
    status: game.status,
    locale: game.locale,
    
    // Metadata
    energy_level: game.energy_level,
    location_type: game.location_type,
    time_estimate_min: game.time_estimate_min,
    duration_max: game.duration_max,
    min_players: game.min_players,
    max_players: game.max_players,
    players_recommended: game.players_recommended,
    age_min: game.age_min,
    age_max: game.age_max,
    difficulty: game.difficulty,
    accessibility_notes: game.accessibility_notes,
    space_requirements: game.space_requirements,
    leader_tips: game.leader_tips,
    
    // References
    main_purpose_id: game.main_purpose_id,
    product_id: game.product_id,
    owner_tenant_id: game.owner_tenant_id,
    cover_media_url: game.cover_media_url || null,
  };
  
  // Add steps
  if (options.includeSteps && game.steps) {
    row.step_count = game.steps.length;
    
    // Sort steps by order
    const sortedSteps = [...game.steps].sort((a, b) => a.step_order - b.step_order);
    
    for (let i = 0; i < MAX_STEPS; i++) {
      const step = sortedSteps[i];
      const stepNum = i + 1;
      
      row[`step_${stepNum}_title`] = step?.title || null;
      row[`step_${stepNum}_body`] = step?.body || null;
      row[`step_${stepNum}_duration`] = step?.duration_seconds || null;
    }
  }
  
  // Add JSON columns
  if (options.includeMaterials && game.materials) {
    row.materials_json = JSON.stringify(game.materials);
  }
  
  if (options.includePhases && game.phases && game.phases.length > 0) {
    row.phases_json = JSON.stringify(game.phases);
  }
  
  if (options.includeRoles && game.roles && game.roles.length > 0) {
    row.roles_json = JSON.stringify(game.roles);
  }
  
  if (options.includeBoardConfig && game.boardConfig) {
    row.board_config_json = JSON.stringify(game.boardConfig);
  }
  
  return row;
}

// =============================================================================
// Main Export Functions
// =============================================================================

/**
 * Generate CSV string from games array.
 */
export function generateGamesCsv(
  games: ExportableGame[],
  options: ExportOptions = {
    format: 'csv',
    includeSteps: true,
    includeMaterials: true,
    includePhases: true,
    includeRoles: true,
    includeBoardConfig: true,
  }
): string {
  const columns = getAllColumns(options);
  const rows = games.map(game => gameToRow(game, options));
  
  return generateCSV(rows, columns, { includeHeaders: true, addBom: true });
}

/**
 * Generate JSON string from games array.
 */
export function generateGamesJson(games: ExportableGame[]): string {
  return JSON.stringify(games, null, 2);
}

/**
 * Export games to the specified format.
 */
export function exportGames(
  games: ExportableGame[],
  options: ExportOptions
): string {
  if (options.format === 'json') {
    return generateGamesJson(games);
  }
  
  return generateGamesCsv(games, options);
}

// =============================================================================
// Download Helpers (Client-side)
// =============================================================================

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Download games as CSV file.
 */
export function downloadGamesCsv(
  games: ExportableGame[],
  filename: string,
  options?: Partial<ExportOptions>
): void {
  const fullOptions: ExportOptions = {
    format: 'csv',
    includeSteps: true,
    includeMaterials: true,
    includePhases: true,
    includeRoles: true,
    includeBoardConfig: true,
    ...options,
  };
  
  const csv = generateGamesCsv(games, fullOptions);
  const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  
  downloadFile(csv, finalFilename, 'text/csv;charset=utf-8');
}

/**
 * Download games as JSON file.
 */
export function downloadGamesJson(games: ExportableGame[], filename: string): void {
  const json = generateGamesJson(games);
  const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
  
  downloadFile(json, finalFilename, 'application/json');
}

// =============================================================================
// Filename Generator
// =============================================================================

/**
 * Generate an export filename with date.
 */
export function getExportFilename(baseName: string = 'games-export'): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${baseName}_${date}`;
}
