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
  ParsedArtifact,
  ParsedArtifactVariant,
  ParsedDecisionsPayload,
  ParsedOutcomesPayload,
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
const VALID_ARTIFACT_VISIBILITY = ['public', 'leader_only', 'role_private'] as const;
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

  // Artifacts (Play primitives)
  const artifactsResult = parseJsonCell<unknown>(row.artifacts_json, rowNumber, 'artifacts_json');
  if (!artifactsResult.success) {
    errors.push({ ...artifactsResult.error, severity: 'error' });
  }
  const artifacts = validateArtifacts(
    artifactsResult.success ? artifactsResult.data : null,
    rowNumber,
    warnings
  );

  // Decisions / Outcomes (currently runtime-only in DB schema)
  const decisionsResult = parseJsonCell<ParsedDecisionsPayload>(row.decisions_json, rowNumber, 'decisions_json');
  if (!decisionsResult.success) {
    errors.push({ ...decisionsResult.error, severity: 'error' });
  }
  const outcomesResult = parseJsonCell<ParsedOutcomesPayload>(row.outcomes_json, rowNumber, 'outcomes_json');
  if (!outcomesResult.success) {
    errors.push({ ...outcomesResult.error, severity: 'error' });
  }

  // Secondary purposes
  const parseSecondaryPurposes = (): string[] => {
    const rawJson = row.sub_purpose_ids?.trim();
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v).trim()).filter(Boolean);
        }
        warnings.push({
          row: rowNumber,
          column: 'sub_purpose_ids',
          message: 'sub_purpose_ids måste vara en JSON-array, ignorerar värdet',
          severity: 'warning',
        });
        return [];
      } catch {
        // Fallback: treat as comma-separated list
        warnings.push({
          row: rowNumber,
          column: 'sub_purpose_ids',
          message: 'sub_purpose_ids kunde inte tolkas som JSON; tolkar som kommaseparerad lista',
          severity: 'warning',
        });
        return rawJson.split(',').map((id) => id.trim()).filter(Boolean);
      }
    }

    const legacy = row.sub_purpose_id?.trim();
    if (legacy) {
      return legacy.split(',').map((id) => id.trim()).filter(Boolean);
    }

    return [];
  };
  const boardConfig = boardConfigResult.success
    ? normalizeBoardConfig(boardConfigResult.data, rowNumber, warnings)
    : null;

  // ==========================================================================
  // Parse steps (inline) + fallback synthesis from phases
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

  // If no inline steps, synthesize steps from phases for facilitated/participants.
  // This allows phase-driven CSV rows without step_1_* columns.
  let steps = stepsResult.steps;
  if (steps.length === 0 && phases.length > 0 && (playMode === 'facilitated' || playMode === 'participants')) {
    steps = phases
      .slice()
      .sort((a, b) => (a.phase_order ?? 0) - (b.phase_order ?? 0))
      .map((p) => ({
        step_order: p.phase_order,
        title: p.name,
        body: p.description ?? '',
        duration_seconds: p.duration_seconds ?? null,
        leader_script: null,
        participant_prompt: null,
        board_text: p.board_message ?? null,
        optional: false,
      }));

    warnings.push({
      row: rowNumber,
      column: 'steps',
      message: 'Inga inline-steg hittades; skapade steg automatiskt från phases_json',
      severity: 'warning',
    });
  }

  // At least one step required
  if (steps.length === 0) {
    errors.push({
      row: rowNumber,
      column: 'step_1_title',
      message: 'Minst ett steg krävs (antingen inline step_1_* eller phases_json för att auto-generera)',
      severity: 'error',
    });
  }
  
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
    sub_purpose_ids: parseSecondaryPurposes(),
    product_id: row.product_id?.trim() || null,
    owner_tenant_id: row.owner_tenant_id?.trim() || null,
    
    steps,
    materials,
    phases,
    roles,
    boardConfig,

    artifacts: artifacts.length > 0 ? artifacts : undefined,
    decisions: decisionsResult.success ? decisionsResult.data : undefined,
    outcomes: outcomesResult.success ? outcomesResult.data : undefined,
  };

  // If decisions/outcomes are provided, validate shape lightly and warn that DB import doesn't persist them yet.
  if (row.decisions_json?.trim()) {
    const ok = validateAnyJsonCollection(decisionsResult.success ? decisionsResult.data : null);
    if (!ok) {
      warnings.push({
        row: rowNumber,
        column: 'decisions_json',
        message: 'decisions_json bör vara en array eller ett objekt; kontrollera exportformatet',
        severity: 'warning',
      });
    }
    warnings.push({
      row: rowNumber,
      column: 'decisions_json',
      message: 'decisions_json läses och valideras, men importeras inte till DB (endast runtime-tabeller finns idag)',
      severity: 'warning',
    });
  }

  if (row.outcomes_json?.trim()) {
    const ok = validateAnyJsonCollection(outcomesResult.success ? outcomesResult.data : null);
    if (!ok) {
      warnings.push({
        row: rowNumber,
        column: 'outcomes_json',
        message: 'outcomes_json bör vara en array eller ett objekt; kontrollera exportformatet',
        severity: 'warning',
      });
    }
    warnings.push({
      row: rowNumber,
      column: 'outcomes_json',
      message: 'outcomes_json läses och valideras, men importeras inte till DB (endast runtime-tabeller finns idag)',
      severity: 'warning',
    });
  }
  
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
  
  // Accept common aliases used in external CSV generators:
  // - phase_index (number) -> phase_order
  // - title (string) -> name
  return phases.map((phase, i) => {
    const rec = phase as unknown as Record<string, unknown>;
    const phaseOrder =
      typeof (rec.phase_order as unknown) === 'number'
        ? (rec.phase_order as number)
        : typeof rec.phase_index === 'number'
          ? (rec.phase_index as number)
          : i + 1;

    const name =
      (typeof rec.name === 'string' && rec.name.trim())
        ? rec.name.trim()
        : (typeof rec.title === 'string' && rec.title.trim())
          ? rec.title.trim()
          : `Fas ${i + 1}`;

    const phaseType =
      (typeof rec.phase_type === 'string' && VALID_PHASE_TYPES.includes(rec.phase_type as PhaseType))
        ? (rec.phase_type as PhaseType)
        : 'round';

    const durationSeconds = typeof rec.duration_seconds === 'number' ? (rec.duration_seconds as number) : null;
    const timerVisible = typeof rec.timer_visible === 'boolean' ? (rec.timer_visible as boolean) : true;
    const timerStyle =
      (typeof rec.timer_style === 'string' && VALID_TIMER_STYLES.includes(rec.timer_style as TimerStyle))
        ? (rec.timer_style as TimerStyle)
        : 'countdown';

    const description = typeof rec.description === 'string' ? (rec.description as string) : null;
    const boardMessage = typeof rec.board_message === 'string' ? (rec.board_message as string) : null;
    const autoAdvance = typeof rec.auto_advance === 'boolean' ? (rec.auto_advance as boolean) : false;

    return {
      phase_order: phaseOrder,
      name,
      phase_type: phaseType,
      duration_seconds: durationSeconds,
      timer_visible: timerVisible,
      timer_style: timerStyle,
      description,
      board_message: boardMessage,
      auto_advance: autoAdvance,
    };
  });
}

function normalizeBoardConfig(
  raw: ParsedBoardConfig | null,
  rowNumber: number,
  warnings: ImportError[]
): ParsedBoardConfig | null {
  if (!raw || typeof raw !== 'object') return null;

  const rec = raw as unknown as Record<string, unknown>;

  // Map legacy keys -> current schema
  const showCurrentPhase =
    typeof rec.show_current_phase === 'boolean'
      ? (rec.show_current_phase as boolean)
      : typeof rec.show_phase === 'boolean'
        ? (rec.show_phase as boolean)
        : true;

  const showTimer = typeof rec.show_timer === 'boolean' ? (rec.show_timer as boolean) : true;

  // Theme: accept anything but coerce to known themes
  const themeRaw = typeof rec.theme === 'string' ? rec.theme : 'neutral';
  const allowedThemes = new Set(['mystery', 'party', 'sport', 'nature', 'neutral']);
  const theme = allowedThemes.has(themeRaw) ? (themeRaw as ParsedBoardConfig['theme']) : 'neutral';
  if (theme !== themeRaw) {
    warnings.push({
      row: rowNumber,
      column: 'board_config_json',
      message: `Okänt board theme "${themeRaw}"; använder 'neutral'`,
      severity: 'warning',
    });
  }

  return {
    show_game_name: typeof rec.show_game_name === 'boolean' ? (rec.show_game_name as boolean) : true,
    show_current_phase: showCurrentPhase,
    show_timer: showTimer,
    show_participants: typeof rec.show_participants === 'boolean' ? (rec.show_participants as boolean) : true,
    show_public_roles: typeof rec.show_public_roles === 'boolean' ? (rec.show_public_roles as boolean) : true,
    show_leaderboard: typeof rec.show_leaderboard === 'boolean' ? (rec.show_leaderboard as boolean) : false,
    show_qr_code: typeof rec.show_qr_code === 'boolean' ? (rec.show_qr_code as boolean) : false,
    welcome_message: typeof rec.welcome_message === 'string' ? (rec.welcome_message as string) : null,
    theme,
    background_color: typeof rec.background_color === 'string' ? (rec.background_color as string) : null,
    layout_variant: typeof rec.layout_variant === 'string' ? (rec.layout_variant as ParsedBoardConfig['layout_variant']) : 'standard',
  };
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

function validateArtifacts(
  raw: unknown,
  rowNumber: number,
  warnings: ImportError[]
): ParsedArtifact[] {
  if (raw === null || raw === undefined) return [];

  const artifactsArray: unknown[] =
    Array.isArray(raw)
      ? raw
      : (typeof raw === 'object' && raw !== null && Array.isArray((raw as Record<string, unknown>).artifacts))
        ? ((raw as Record<string, unknown>).artifacts as unknown[])
        : [];

  if (artifactsArray.length === 0) {
    warnings.push({
      row: rowNumber,
      column: 'artifacts_json',
      message: 'artifacts_json finns men kunde inte tolkas som en array (förväntar array eller { artifacts: [...] })',
      severity: 'warning',
    });
    return [];
  }

  const artifacts: ParsedArtifact[] = [];

  for (let i = 0; i < artifactsArray.length; i++) {
    const item = artifactsArray[i];
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;

    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    if (!title) {
      warnings.push({
        row: rowNumber,
        column: 'artifacts_json',
        message: `Artefakt #${i + 1} saknar title; ignorerar`,
        severity: 'warning',
      });
      continue;
    }

    const artifactOrder =
      typeof rec.artifact_order === 'number'
        ? (rec.artifact_order as number)
        : typeof rec.order === 'number'
          ? (rec.order as number)
          : i + 1;

    const locale = typeof rec.locale === 'string' ? rec.locale : null;
    const description = typeof rec.description === 'string' ? rec.description : null;
    const artifactType = typeof rec.artifact_type === 'string' ? rec.artifact_type : 'card';
    const tags = Array.isArray(rec.tags) ? (rec.tags.map((t) => String(t)).filter(Boolean) as string[]) : [];

    const variantsRaw =
      Array.isArray(rec.variants)
        ? (rec.variants as unknown[])
        : Array.isArray(rec.items)
          ? (rec.items as unknown[])
          : [];

    const variants: ParsedArtifactVariant[] = [];
    for (let j = 0; j < variantsRaw.length; j++) {
      const v = variantsRaw[j];
      if (typeof v !== 'object' || v === null) continue;
      const vrec = v as Record<string, unknown>;

      const variantOrder =
        typeof vrec.variant_order === 'number'
          ? (vrec.variant_order as number)
          : typeof vrec.order === 'number'
            ? (vrec.order as number)
            : j + 1;

      const visibilityRaw = typeof vrec.visibility === 'string' ? vrec.visibility : 'public';
      const visibility = (VALID_ARTIFACT_VISIBILITY as readonly string[]).includes(visibilityRaw)
        ? (visibilityRaw as (typeof VALID_ARTIFACT_VISIBILITY)[number])
        : 'public';

      if (visibility !== visibilityRaw) {
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Variant #${j + 1} i artefakt "${title}": okänd visibility "${visibilityRaw}"; använder 'public'`,
          severity: 'warning',
        });
      }

      const variantTitle = typeof vrec.title === 'string' ? vrec.title : null;
      const body = typeof vrec.body === 'string' ? vrec.body : null;
      const mediaRef = typeof vrec.media_ref === 'string' ? vrec.media_ref : null;

      // Check for role_private visibility requiring a role reference
      const hasRoleRef = vrec.visible_to_role_id || vrec.visible_to_role_order || vrec.visible_to_role_name;
      if (visibility === 'role_private' && !hasRoleRef) {
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Variant #${j + 1} i artefakt "${title}": visibility är 'role_private' men saknar visible_to_role_id/order/name. Varianten kommer inte visas för någon.`,
          severity: 'warning',
        });
      }

      const visibleToRoleId = typeof vrec.visible_to_role_id === 'string' ? vrec.visible_to_role_id : null;
      const visibleToRoleOrder = typeof vrec.visible_to_role_order === 'number' ? vrec.visible_to_role_order : null;
      const visibleToRoleName = typeof vrec.visible_to_role_name === 'string' ? vrec.visible_to_role_name : null;

      let metadata = (typeof vrec.metadata === 'object' && vrec.metadata !== null)
        ? (vrec.metadata as Record<string, unknown>)
        : null;

      const stepIndexRaw = vrec.step_index;
      const phaseIndexRaw = vrec.phase_index;

      const stepIndex =
        typeof stepIndexRaw === 'number' && Number.isFinite(stepIndexRaw)
          ? Math.max(0, Math.floor(stepIndexRaw))
          : null;

      const phaseIndex =
        typeof phaseIndexRaw === 'number' && Number.isFinite(phaseIndexRaw)
          ? Math.max(0, Math.floor(phaseIndexRaw))
          : null;

      if (stepIndexRaw !== undefined && stepIndex === null) {
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Variant #${j + 1} i artefakt "${title}": ogiltigt step_index; ignorerar`,
          severity: 'warning',
        });
      }

      if (phaseIndexRaw !== undefined && phaseIndex === null) {
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Variant #${j + 1} i artefakt "${title}": ogiltigt phase_index; ignorerar`,
          severity: 'warning',
        });
      }

      if (stepIndex !== null || phaseIndex !== null) {
        metadata = {
          ...(metadata ?? {}),
          ...(stepIndex !== null ? { step_index: stepIndex } : null),
          ...(phaseIndex !== null ? { phase_index: phaseIndex } : null),
        };
      }

      variants.push({
        variant_order: variantOrder,
        visibility,
        visible_to_role_id: visibleToRoleId,
        visible_to_role_order: visibleToRoleOrder,
        visible_to_role_name: visibleToRoleName,
        title: variantTitle,
        body,
        media_ref: mediaRef,
        metadata,
      });
    }

    if (variants.length === 0) {
      warnings.push({
        row: rowNumber,
        column: 'artifacts_json',
        message: `Artefakt "${title}" saknar variants; importerar artefakten utan variants`,
        severity: 'warning',
      });
    }

    const metadata = (typeof rec.metadata === 'object' && rec.metadata !== null) ? (rec.metadata as Record<string, unknown>) : null;

    // Keypad-specific validation
    if (artifactType === 'keypad' && metadata) {
      const correctCode = metadata.correctCode;
      
      // Validate correctCode exists
      if (correctCode === undefined || correctCode === null) {
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Keypad-artefakt "${title}" saknar correctCode i metadata; keypaden kommer inte fungera`,
          severity: 'warning',
        });
      } else if (typeof correctCode === 'number') {
        // CRITICAL: correctCode should be string to preserve leading zeros
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Keypad "${title}": correctCode är ett tal (${correctCode}). Använd sträng för att bevara leading zeros, t.ex. "0451" istället för 0451`,
          severity: 'warning',
        });
        // Convert to string to prevent data loss
        metadata.correctCode = String(correctCode);
      } else if (typeof correctCode !== 'string') {
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Keypad "${title}": correctCode måste vara en sträng`,
          severity: 'warning',
        });
      }

      // Validate codeLength if present
      const codeLength = metadata.codeLength;
      if (codeLength !== undefined && typeof codeLength !== 'number') {
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Keypad "${title}": codeLength bör vara ett tal`,
          severity: 'warning',
        });
      }

      // Validate maxAttempts if present
      const maxAttempts = metadata.maxAttempts;
      if (maxAttempts !== undefined && maxAttempts !== null && typeof maxAttempts !== 'number') {
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Keypad "${title}": maxAttempts bör vara ett tal eller null`,
          severity: 'warning',
        });
      }

      // Validate lockOnFail if present
      const lockOnFail = metadata.lockOnFail;
      if (lockOnFail !== undefined && typeof lockOnFail !== 'boolean') {
        warnings.push({
          row: rowNumber,
          column: 'artifacts_json',
          message: `Keypad "${title}": lockOnFail bör vara true/false`,
          severity: 'warning',
        });
      }
    }

    artifacts.push({
      artifact_order: artifactOrder,
      locale,
      title,
      description,
      artifact_type: artifactType,
      tags,
      metadata,
      variants,
    });
  }

  return artifacts;
}

function validateAnyJsonCollection(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return true;
  if (typeof value === 'object') return true;
  return false;
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
