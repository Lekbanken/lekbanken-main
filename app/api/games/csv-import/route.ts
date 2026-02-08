/**
 * CSV Import API for Games
 * 
 * POST /api/games/csv-import
 * Imports games from CSV or JSON format.
 * 
 * @requires system_admin or tenant_admin role
 * 
 * Supports:
 * - dry_run mode for validation without database changes
 * - upsert mode for updating existing games by game_key
 * - All three play modes: basic, facilitated, participants
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin, assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth';
import { parseCsvGames } from '@/features/admin/games/utils/csv-parser';
import { parseGamesFromJsonPayload } from '@/features/admin/games/utils/json-game-import';
import { validateGames } from '@/features/admin/games/utils/game-validator';
import { actionOrderAliasesToIds, conditionOrderAliasesToIds } from '@/lib/games/trigger-order-alias';
import { normalizeAndValidate } from '@/lib/import/metadataSchemas';
import { rewriteAllTriggerRefs, type TriggerIdMap, type TriggerPayload } from '@/lib/import/triggerRefRewrite';
import { assignCoverFromTemplates, type AssignCoverResult } from '@/lib/import/assignCoverFromTemplates';
import type { ParsedGame, DryRunResult, DryRunGamePreview, ImportError } from '@/types/csv-import';
import type { Json } from '@/types/supabase';

/**
 * RPC result type for upsert_game_content_v1
 * Returned as JSONB from the atomic upsert function.
 */
interface UpsertRpcResult {
  ok: boolean;
  game_id?: string;
  code?: string;
  error?: string;
  counts?: {
    steps?: number;
    phases?: number;
    artifacts?: number;
    variants?: number;
    triggers?: number;
    roles?: number;
    materials?: number;
    board_config?: number;
    secondary_purposes?: number;
  };
}

/**
 * Custom error class for pre-flight validation failures.
 * Carries structured ImportError[] for consistent error reporting.
 */
class PreflightValidationError extends Error {
  public readonly errors: ImportError[];
  
  constructor(errors: ImportError[], message?: string) {
    super(message ?? `Pre-flight validation failed with ${errors.length} error(s)`);
    this.name = 'PreflightValidationError';
    this.errors = errors;
  }
}

type ImportPayload = {
  data: string;
  format: 'csv' | 'json';
  dry_run?: boolean;
  upsert?: boolean;
  tenant_id?: string;
};

// =============================================================================
// Cover Stats Helper
// =============================================================================

/**
 * Groups missing template entries by purpose ID for UI display.
 * Returns array of { purposeId, purposeName, count } for purposes without templates.
 */
async function groupByPurposeWithNames(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  entries: { gameKey: string; purposeId: string | null }[]
): Promise<{ purposeId: string | null; purposeName?: string; count: number }[]> {
  // Count by purposeId
  const counts = new Map<string | null, number>();
  for (const entry of entries) {
    counts.set(entry.purposeId, (counts.get(entry.purposeId) ?? 0) + 1);
  }

  // Get unique non-null purposeIds
  const purposeIds = Array.from(counts.keys()).filter((id): id is string => id !== null);
  
  // Fetch purpose names if we have any IDs
  const purposeNames = new Map<string, string>();
  if (purposeIds.length > 0) {
    const { data: purposes } = await supabase
      .from('purposes')
      .select('id, name')
      .in('id', purposeIds);
    
    if (purposes) {
      for (const p of purposes) {
        purposeNames.set(p.id, p.name);
      }
    }
  }

  // Build result with names
  return Array.from(counts.entries())
    .map(([purposeId, count]) => ({
      purposeId,
      purposeName: purposeId ? purposeNames.get(purposeId) : undefined,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

// =============================================================================
// Metadata Validation Gate
// =============================================================================

interface MetadataValidationError {
  game_key: string;
  artifact_ref: string;
  artifact_type: string;
  errors: string[];
}

interface MetadataValidationWarning {
  game_key: string;
  artifact_ref: string;
  artifact_type: string;
  warnings: string[];
  appliedAliases: string[];
}

interface MetadataValidationResult {
  games: ParsedGame[];
  errors: MetadataValidationError[];
  warnings: MetadataValidationWarning[];
}

/**
 * Validates and normalizes all artifact metadata using normalizeAndValidate.
 * This is the SINGLE GATE for metadata validation - all artifacts must pass.
 * 
 * - Normalizes alias keys to canonical form
 * - Validates required fields per artifact_type
 * - Returns early with all errors if any validation fails
 */
function validateAndNormalizeMetadata(games: ParsedGame[]): MetadataValidationResult {
  const errors: MetadataValidationError[] = [];
  const warnings: MetadataValidationWarning[] = [];
  
  const normalizedGames = games.map((game) => {
    if (!game.artifacts?.length) return game;
    
    const normalizedArtifacts = game.artifacts.map((artifact, index) => {
      const artifactRef = (artifact as { id?: string }).id || `artifact_${index}`;
      const artifactType = (artifact as { artifact_type?: string }).artifact_type || 'unknown';
      const rawMetadata = (artifact as { metadata?: unknown }).metadata ?? {};
      
      // Parse metadata if it's a JSON string (common in CSV import)
      let parsedMetadata: unknown = rawMetadata;
      if (typeof rawMetadata === 'string') {
        // Handle empty string as empty object
        if (rawMetadata.trim() === '') {
          parsedMetadata = {};
        } else {
          try {
            parsedMetadata = JSON.parse(rawMetadata);
          } catch {
            errors.push({
              game_key: game.game_key,
              artifact_ref: artifactRef,
              artifact_type: artifactType,
              errors: [`Metadata är ogiltig JSON: ${rawMetadata.substring(0, 100)}...`],
            });
            // Continue with empty object to allow validation to report missing required fields
            parsedMetadata = {};
          }
        }
      }
      
      // Run through the validation gate
      const result = normalizeAndValidate(artifactType, parsedMetadata);
      
      // Collect errors
      if (!result.validation.ok) {
        errors.push({
          game_key: game.game_key,
          artifact_ref: artifactRef,
          artifact_type: artifactType,
          errors: result.validation.errors,
        });
      }
      
      // Collect warnings and alias info
      if (result.validation.warnings.length > 0 || result.appliedAliases.length > 0 || result.normalizeWarnings.length > 0) {
        warnings.push({
          game_key: game.game_key,
          artifact_ref: artifactRef,
          artifact_type: artifactType,
          warnings: [...result.normalizeWarnings, ...result.validation.warnings],
          appliedAliases: result.appliedAliases,
        });
      }
      
      // Return artifact with canonical metadata
      return { ...artifact, metadata: result.canonical };
    });
    
    return { ...game, artifacts: normalizedArtifacts };
  });
  
  return { games: normalizedGames, errors, warnings };
}

// =============================================================================
// Legacy Artifact Type Normalization
// =============================================================================

function normalizeLegacyArtifactTypesForImport(games: ParsedGame[]): {
  games: ParsedGame[];
  warnings: ImportError[];
} {
  const legacyAliases: Record<string, string> = {
    text: 'card',
    note: 'card',
  };

  // Intentionally silent: we normalize legacy values to keep imports smooth.
  const warnings: ImportError[] = [];

  const normalized = games.map((game) => {
    if (!game.artifacts?.length) return game;

    let changed = false;
    const artifacts = game.artifacts.map((artifact) => {
      const current = (artifact as { artifact_type?: unknown }).artifact_type;
      if (typeof current !== 'string') return artifact;

      const next = legacyAliases[current];
      if (!next) return artifact;

      changed = true;
      return { ...(artifact as object), artifact_type: next } as typeof artifact;
    });

    // No warning emitted for normalization.

    if (!changed) return game;
    return { ...game, artifacts };
  });

  return { games: normalized, warnings };
}

export async function POST(request: Request) {
  // Generate request-scoped import run ID for observability
  const importRunId = randomUUID();
  console.log(`[csv-import] import.start run=${importRunId}`);

  try {
    // Authentication check
    const authClient = await createServerRlsClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as ImportPayload;
    const { data, format, dry_run = false, upsert = true, tenant_id } = body;

    // Authorization: system_admin for global, tenant_admin for tenant-scoped
    if (tenant_id) {
      const hasAccess = await assertTenantAdminOrSystem(tenant_id, user);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden - tenant admin required' }, { status: 403 });
      }
    } else if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden - system_admin required for global import' }, { status: 403 });
    }

    if (!data || typeof data !== 'string') {
      return NextResponse.json(
        { error: 'Ingen data skickades' },
        { status: 400 }
      );
    }

    // Parse input data
    let parsedGames: ParsedGame[];
    let parseErrors: ImportError[] = [];
    let parseWarnings: ImportError[] = [];

    if (format === 'csv') {
      const result = parseCsvGames(data);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Kunde inte tolka CSV-data', errors: result.errors },
          { status: 400 }
        );
      }
      parsedGames = result.games;
      parseErrors = result.errors;
      parseWarnings = result.warnings;
    } else {
      // JSON format
      try {
        parsedGames = parseGamesFromJsonPayload(data);

        const normalized = normalizeLegacyArtifactTypesForImport(parsedGames);
        parsedGames = normalized.games;
        parseWarnings = [...parseWarnings, ...normalized.warnings];
      } catch {
        return NextResponse.json(
          { error: 'Kunde inte tolka JSON-data' },
          { status: 400 }
        );
      }
    }

    if (parsedGames.length === 0) {
      return NextResponse.json(
        { error: 'Inga giltiga spel hittades i datan' },
        { status: 400 }
      );
    }

    // =========================================================================
    // METADATA VALIDATION GATE
    // Single entry point for all artifact metadata validation.
    // This runs BEFORE game-level validation and ABORTS if any metadata is invalid.
    // =========================================================================
    const metadataValidation = validateAndNormalizeMetadata(parsedGames);
    
    if (metadataValidation.errors.length > 0) {
      // Convert to ImportError format for consistent response
      const metadataErrors: ImportError[] = metadataValidation.errors.map(e => ({
        row: 0, // Game-level errors don't have row numbers
        column: `${e.artifact_type}.metadata`,
        message: `[${e.game_key}/${e.artifact_ref}] ${e.errors.join('; ')}`,
        severity: 'error' as const,
      }));
      
      return NextResponse.json({
        success: false,
        error: 'Metadata-validering misslyckades',
        stats: {
          total: parsedGames.length,
          created: 0,
          updated: 0,
          skipped: parsedGames.length,
        },
        errors: metadataErrors,
        warnings: parseWarnings,
        metadata_errors: metadataValidation.errors, // Structured error info
      }, { status: 400 });
    }
    
    // Use normalized games with canonical metadata
    parsedGames = metadataValidation.games;
    
    // Log metadata warnings and applied aliases (for audit)
    for (const w of metadataValidation.warnings) {
      if (w.appliedAliases.length > 0) {
        console.log(`[csv-import] [${w.game_key}/${w.artifact_ref}] Aliases: ${w.appliedAliases.join(', ')}`);
      }
      if (w.warnings.length > 0) {
        console.warn(`[csv-import] [${w.game_key}/${w.artifact_ref}] Warnings: ${w.warnings.join('; ')}`);
      }
    }

    // =========================================================================
    // GAME-LEVEL VALIDATION
    // =========================================================================
    
    // Validate all games
    const defaultOptions = {
      mode: upsert ? 'upsert' as const : 'create' as const,
      validateOnly: dry_run,
      defaultStatus: 'draft' as const,
      defaultLocale: 'sv-SE',
    };
    
    const validationResult = validateGames(parsedGames, defaultOptions);

    // Dry run mode - return validation result without saving
    if (dry_run) {
      const dryRunGames: DryRunGamePreview[] = parsedGames.map((game, index) => {
        // Collect unique artifact types for quick inspection
        const artifactTypes = Array.from(
          new Set((game.artifacts ?? []).map(a => a.artifact_type).filter(Boolean))
        ).sort();

        return {
          row_number: index + 1,
          game_key: game.game_key,
          name: game.name,
          play_mode: game.play_mode,
          status: game.status,
          steps: game.steps,
          // Advanced data counts for UI preview
          phases_count: game.phases?.length ?? 0,
          artifacts_count: game.artifacts?.length ?? 0,
          triggers_count: game.triggers?.length ?? 0,
          roles_count: game.roles?.length ?? 0,
          artifact_types: artifactTypes,
        };
      });

      // Include metadata warnings in dry run response
      const metadataWarnings: ImportError[] = metadataValidation.warnings.flatMap(w => 
        w.warnings.map(msg => ({
          row: 0,
          column: `${w.artifact_type}.metadata`,
          message: `[${w.game_key}/${w.artifact_ref}] ${msg}`,
          severity: 'warning' as const,
        }))
      );

      const allErrors = [...parseErrors, ...validationResult.allErrors];
      const allWarnings = [...parseWarnings, ...metadataWarnings, ...validationResult.allWarnings];

      const dryRunResult: DryRunResult = {
        valid: allErrors.length === 0,
        total_rows: parsedGames.length,
        valid_count: validationResult.validGames.length,
        warning_count: allWarnings.length,
        error_count: allErrors.length,
        errors: allErrors,
        warnings: allWarnings,
        games: dryRunGames,
      };
      
      return NextResponse.json(dryRunResult);
    }

    // If there are NO valid games, don't proceed with import
    if (validationResult.validGames.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Inga giltiga spel att importera',
        stats: {
          total: parsedGames.length,
          created: 0,
          updated: 0,
          skipped: validationResult.invalidGames.length,
        },
        errors: validationResult.allErrors,
        warnings: validationResult.allWarnings,
      }, { status: 400 });
    }

    // Proceed with actual import (only valid games)
    const supabase = await createServiceRoleClient();
    const db = supabase;

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const importErrors: ImportError[] = [];

    // Cover assignment tracking
    let coverAssignedCount = 0;
    let coverSkippedExistingCount = 0;
    const coverMissingTemplates: { gameKey: string; purposeId: string | null }[] = [];

    for (let index = 0; index < validationResult.validGames.length; index++) {
      const game = validationResult.validGames[index];
      const rowNumber = index + 1;

      try {
        // Check if game exists by game_key
        let existingGameId: string | null = null;
        
        if (upsert && game.game_key) {
          const { data: existing } = await db
            .from('games')
            .select('id')
            .eq('game_key', game.game_key)
            .maybeSingle();
          
          if (existing && existing.id) {
            existingGameId = existing.id;
          }
        }

        // Prepare game data
        const gameData = {
          game_key: game.game_key,
          name: game.name,
          short_description: game.short_description,
          description: game.description,
          play_mode: game.play_mode,
          status: game.status,
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
          main_purpose_id: game.main_purpose_id,
          product_id: game.product_id,
          owner_tenant_id: game.owner_tenant_id,
        };

        let gameId: string;

        if (existingGameId) {
          // Update existing game
          const { error: updateError } = await db
            .from('games')
            .update(gameData)
            .eq('id', existingGameId);

          if (updateError) {
            throw new Error(updateError.message);
          }
          gameId = existingGameId;
          updatedCount++;
        } else {
          // Insert new game
          const { data: newGame, error: insertError } = await db
            .from('games')
            .insert(gameData)
            .select('id')
            .single();

          if (insertError || !newGame) {
            throw new Error(insertError?.message || 'Kunde inte skapa spel');
          }
          gameId = newGame.id;
          createdCount++;
        }

        // Handle related data (steps, materials, phases, roles, boardConfig)
        const coverResult = await importRelatedData(db, gameId, game, existingGameId !== null, importRunId);

        // Track cover assignment results
        if (coverResult.assigned) {
          coverAssignedCount++;
        } else if (coverResult.skipReason === 'already_has_cover') {
          coverSkippedExistingCount++;
        } else if (coverResult.skipReason === 'no_templates_found') {
          coverMissingTemplates.push({
            gameKey: game.game_key,
            purposeId: game.main_purpose_id ?? null,
          });
        }

      } catch (err) {
        failedCount++;
        
        // Handle structured pre-flight errors with full ImportError details
        if (err instanceof PreflightValidationError) {
          for (const preflightError of err.errors) {
            importErrors.push({
              row: rowNumber,
              column: preflightError.column,
              message: preflightError.message,
              severity: preflightError.severity,
            });
          }
        } else {
          importErrors.push({
            row: rowNumber,
            column: 'general',
            message: err instanceof Error ? err.message : 'Okänt fel',
            severity: 'error',
          });
        }
      }
    }

    // LOG: Import request completed
    console.log(`[csv-import] import.done run=${importRunId} total=${parsedGames.length} created=${createdCount} updated=${updatedCount} failed=${failedCount} errors=${importErrors.length} warnings=${parseWarnings.length + validationResult.allWarnings.length} covers_assigned=${coverAssignedCount} covers_missing_templates=${coverMissingTemplates.length}`);

    // Enrich missing templates with purpose names for better UI display
    const missingTemplatesByPurpose = await groupByPurposeWithNames(db, coverMissingTemplates);

    return NextResponse.json({
      success: failedCount === 0,
      importRunId,
      stats: {
        total: parsedGames.length,
        created: createdCount,
        updated: updatedCount,
        skipped: failedCount,
      },
      // Cover assignment stats for UI feedback
      coverStats: {
        assigned: coverAssignedCount,
        skippedExisting: coverSkippedExistingCount,
        missingTemplates: coverMissingTemplates.length,
        missingTemplatesByPurpose,
      },
      errors: importErrors,
      warnings: [...parseWarnings, ...validationResult.allWarnings],
    });

  } catch (error) {
    console.error(`[csv-import] import.fail run=${importRunId}`, error);
    return NextResponse.json(
      {
        success: false,
        importRunId,
        error: 'Servern kunde inte behandla förfrågan',
      },
      { status: 500 }
    );
  }
}

/**
 * Import related data for a game (steps, materials, phases, roles, boardConfig)
 * 
 * IMPORTANT: Pre-flight validation strategy
 * - Pre-generate UUIDs for steps/phases/artifacts BEFORE any DB writes
 * - Build TriggerIdMap from pre-generated UUIDs
 * - Validate trigger refs BEFORE any DB writes
 * - If validation fails, throw immediately (no partial imports)
 * - Only proceed with DB writes if all validation passes
 * 
 * GUARANTEE: "No DB writes occur for a game if trigger rewrite fails."
 * 
 * @returns Cover assignment result for aggregation in parent
 */
async function importRelatedData(
  db: Awaited<ReturnType<typeof createServiceRoleClient>>,
  gameId: string,
  game: ParsedGame,
  isUpdate: boolean,
  importRunId: string
): Promise<AssignCoverResult> {
  // ==========================================================================
  // PHASE 1: Pre-generate UUIDs for entities that triggers may reference
  // ==========================================================================
  
  const preflightErrors: ImportError[] = [];

  // Pre-generate step IDs (with collision check)
  const stepIdByOrder = new Map<number, string>();
  const stepRows = (game.steps ?? []).map((step, index) => {
    const stepOrder = step.step_order ?? index + 1;
    
    // Collision check: detect duplicate step_order
    if (stepIdByOrder.has(stepOrder)) {
      preflightErrors.push({
        row: index + 1,
        column: `steps[${index}].step_order`,
        message: `Duplicate step_order=${stepOrder} detected. Each step must have unique order.`,
        severity: 'error',
      });
    }
    
    const id = randomUUID();
    stepIdByOrder.set(stepOrder, id);
    return {
      id,
      game_id: gameId,
      step_order: stepOrder,
      title: step.title,
      body: step.body,
      duration_seconds: step.duration_seconds,
      leader_script: step.leader_script,
      participant_prompt: step.participant_prompt,
      board_text: step.board_text,
      optional: step.optional ?? false,
    };
  });

  // Pre-generate phase IDs (with collision check)
  const phaseIdByOrder = new Map<number, string>();
  const phaseRows = (game.phases ?? []).map((phase, index) => {
    const phaseOrder = phase.phase_order ?? index + 1;
    
    // Collision check: detect duplicate phase_order
    if (phaseIdByOrder.has(phaseOrder)) {
      preflightErrors.push({
        row: index + 1,
        column: `phases[${index}].phase_order`,
        message: `Duplicate phase_order=${phaseOrder} detected. Each phase must have unique order.`,
        severity: 'error',
      });
    }
    
    const id = randomUUID();
    phaseIdByOrder.set(phaseOrder, id);
    return {
      id,
      game_id: gameId,
      phase_order: phaseOrder,
      name: phase.name,
      phase_type: phase.phase_type,
      duration_seconds: phase.duration_seconds,
      timer_visible: phase.timer_visible,
      timer_style: phase.timer_style,
      description: phase.description,
      board_message: phase.board_message,
      auto_advance: phase.auto_advance,
    };
  });

  // Pre-generate artifact IDs (with collision check)
  const artifactIdByOrder = new Map<number, string>();
  type ArtifactRowData = {
    id: string;
    game_id: string;
    locale: string | null;
    title: string;
    description: string | null;
    artifact_type: string;
    artifact_order: number;
    tags: string[] | null;
    metadata: Json;
  };
  const artifactRows: ArtifactRowData[] = (game.artifacts ?? []).map((artifact, index) => {
    const artifactOrder = artifact.artifact_order ?? index + 1;
    
    // Collision check: detect duplicate artifact_order
    if (artifactIdByOrder.has(artifactOrder)) {
      preflightErrors.push({
        row: index + 1,
        column: `artifacts[${index}].artifact_order`,
        message: `Duplicate artifact_order=${artifactOrder} detected. Each artifact must have unique order.`,
        severity: 'error',
      });
    }
    
    const id = randomUUID();
    artifactIdByOrder.set(artifactOrder, id);
    return {
      id,
      game_id: gameId,
      locale: artifact.locale ?? null,
      title: artifact.title,
      description: artifact.description ?? null,
      artifact_type: artifact.artifact_type,
      artifact_order: artifactOrder,
      tags: artifact.tags ?? null,
      metadata: (artifact.metadata ?? {}) as Json,
    };
  });

  // Pre-generate role IDs (REQUIRED for visible_to_role_id in variants)
  const roleIdByOrder = new Map<number, string>();
  const roleIdByName = new Map<string, string>();
  type RoleRowData = {
    id: string;
    game_id: string;
    role_order: number;
    name: string;
    icon: string | null;
    color: string | null;
    public_description: string | null;
    private_instructions: string;
    private_hints: string | null;
    min_count: number;
    max_count: number | null;
    assignment_strategy: string;
    scaling_rules: Json | null;
    conflicts_with: string[] | null;
    locale: string | null;
  };
  const roleRows: RoleRowData[] = (game.roles ?? []).map((role, index) => {
    const roleOrder = role.role_order ?? index + 1;
    
    // Collision check: detect duplicate role_order
    if (roleIdByOrder.has(roleOrder)) {
      preflightErrors.push({
        row: index + 1,
        column: `roles[${index}].role_order`,
        message: `Duplicate role_order=${roleOrder} detected. Each role must have unique order.`,
        severity: 'error',
      });
    }
    
    const id = randomUUID();
    roleIdByOrder.set(roleOrder, id);
    if (role.name) {
      roleIdByName.set(role.name.toLowerCase(), id);
    }
    return {
      id,
      game_id: gameId,
      role_order: roleOrder,
      name: role.name,
      icon: role.icon ?? null,
      color: role.color ?? null,
      public_description: role.public_description ?? null,
      private_instructions: role.private_instructions ?? '',
      private_hints: role.private_hints ?? null,
      min_count: role.min_count ?? 1,
      max_count: role.max_count ?? null,
      assignment_strategy: role.assignment_strategy ?? 'random',
      scaling_rules: (role.scaling_rules ?? null) as Json | null,
      conflicts_with: role.conflicts_with ?? null,
      locale: null, // Not in ParsedGame role type currently
    };
  });

  // Pre-resolve variant visible_to_role_id (BEFORE RPC)
  type VariantRowData = {
    artifact_id: string;
    visibility: string;
    visible_to_role_id: string | null;
    title: string | null;
    body: string | null;
    media_ref: string | null;
    variant_order: number;
    metadata: Json;
  };
  const variantRows: VariantRowData[] = [];
  for (let i = 0; i < (game.artifacts ?? []).length; i++) {
    const artifact = game.artifacts![i];
    const artifactId = artifactRows[i].id;

    if (artifact.variants && artifact.variants.length > 0) {
      for (const v of artifact.variants) {
        let visibleToRoleId = v.visible_to_role_id ?? null;
        // Resolve by order alias
        if (!visibleToRoleId && typeof v.visible_to_role_order === 'number') {
          visibleToRoleId = roleIdByOrder.get(v.visible_to_role_order) ?? null;
          if (!visibleToRoleId) {
            preflightErrors.push({
              row: i + 1,
              column: `artifacts[${i}].variants.visible_to_role_order`,
              message: `visible_to_role_order=${v.visible_to_role_order} references non-existent role.`,
              severity: 'error',
            });
          }
        }
        // Resolve by name alias
        if (!visibleToRoleId && typeof v.visible_to_role_name === 'string') {
          visibleToRoleId = roleIdByName.get(v.visible_to_role_name.toLowerCase()) ?? null;
          if (!visibleToRoleId) {
            preflightErrors.push({
              row: i + 1,
              column: `artifacts[${i}].variants.visible_to_role_name`,
              message: `visible_to_role_name="${v.visible_to_role_name}" references non-existent role.`,
              severity: 'error',
            });
          }
        }

        variantRows.push({
          artifact_id: artifactId,
          visibility: v.visibility ?? 'public',
          visible_to_role_id: visibleToRoleId,
          title: v.title ?? null,
          body: v.body ?? null,
          media_ref: v.media_ref ?? null,
          variant_order: v.variant_order ?? 0,
          metadata: (v.metadata ?? {}) as Json,
        });
      }
    }
  }

  // If there are order collision errors, abort BEFORE any DB writes
  if (preflightErrors.length > 0) {
    console.log(`[csv-import] preflight.fail game=${game.game_key} errors=${preflightErrors.length} reason=order_collision`);
    throw new PreflightValidationError(preflightErrors);
  }

  // ==========================================================================
  // PHASE 2: Pre-flight trigger validation (BEFORE any DB writes)
  // ==========================================================================
  
  let rewrittenTriggerRows: Array<{
    game_id: string;
    name: string;
    description: string | null;
    enabled: boolean;
    condition: Json;
    actions: Json;
    execute_once: boolean;
    delay_seconds: number;
    sort_order: number;
  }> = [];

  if (game.triggers && game.triggers.length > 0) {
    // Build ID map from pre-generated UUIDs (NOT from DB)
    const idMap: TriggerIdMap = {
      stepIdByOrder,
      phaseIdByOrder,
      artifactIdByOrder,
    };

    // Convert ParsedTrigger to TriggerPayload format
    const triggerPayloads: TriggerPayload[] = game.triggers.map(t => ({
      name: t.name,
      description: t.description,
      enabled: t.enabled,
      condition: t.condition as Record<string, unknown>,
      actions: t.actions as Record<string, unknown>[],
      execute_once: t.execute_once,
      delay_seconds: t.delay_seconds,
      sort_order: t.sort_order,
    }));

    // Rewrite trigger refs with validation - THIS IS PRE-FLIGHT
    const { triggers: rewrittenTriggers, errors: triggerErrors } = rewriteAllTriggerRefs(
      triggerPayloads,
      idMap,
      game.game_key,
    );

    // If there are trigger ref errors, abort BEFORE any DB writes
    if (triggerErrors.length > 0) {
      console.log(`[csv-import] preflight.fail game=${game.game_key} errors=${triggerErrors.length} reason=trigger_refs`);
      throw new PreflightValidationError(triggerErrors);
    }

    // Prepare trigger rows for later insertion
    rewrittenTriggerRows = rewrittenTriggers.map((trigger, index) => ({
      game_id: gameId,
      name: trigger.name,
      description: trigger.description ?? null,
      enabled: trigger.enabled ?? true,
      condition: trigger.condition as Json,
      actions: trigger.actions as Json,
      execute_once: trigger.execute_once ?? false,
      delay_seconds: trigger.delay_seconds ?? 0,
      sort_order: trigger.sort_order ?? index,
    }));

    // LOG: Pre-flight trigger validation passed
    console.log(`[csv-import] preflight.trigger_rewrite.ok game=${game.game_key} triggers=${rewrittenTriggerRows.length}`);
  }

  // ==========================================================================
  // PHASE 3: Atomic DB Write via RPC (single transaction)
  // ==========================================================================
  // GUARANTEE: Either all changes commit, or nothing changes.
  // Previously: 16+ sequential DB calls with partial-update risk.
  // Now: 1 atomic RPC call with automatic rollback on failure.

  // LOG: Starting atomic DB write
  console.log(`[csv-import] db.write.begin run=${importRunId} game=${game.game_key} steps=${stepRows.length} phases=${phaseRows.length} artifacts=${artifactRows.length} roles=${roleRows.length} triggers=${rewrittenTriggerRows.length}`);

  // Build payload for atomic RPC
  const payload = {
    game_id: gameId,
    is_update: isUpdate,
    import_run_id: importRunId,
    
    steps: stepRows.map(s => ({
      id: s.id,
      step_order: s.step_order,
      title: s.title,
      body: s.body,
      duration_seconds: s.duration_seconds,
      leader_script: s.leader_script,
      participant_prompt: s.participant_prompt,
      board_text: s.board_text,
      optional: s.optional,
      locale: null,
      phase_id: null,
      conditional: null,
      media_ref: null,
      display_mode: null,
    })),
    
    phases: phaseRows.map(p => ({
      id: p.id,
      phase_order: p.phase_order,
      name: p.name,
      phase_type: p.phase_type,
      duration_seconds: p.duration_seconds,
      timer_visible: p.timer_visible,
      timer_style: p.timer_style,
      description: p.description,
      board_message: p.board_message,
      auto_advance: p.auto_advance,
      locale: null,
    })),
    
    roles: roleRows.map(r => ({
      id: r.id,
      role_order: r.role_order,
      name: r.name,
      icon: r.icon,
      color: r.color,
      public_description: r.public_description,
      private_instructions: r.private_instructions,
      private_hints: r.private_hints,
      min_count: r.min_count,
      max_count: r.max_count,
      assignment_strategy: r.assignment_strategy,
      scaling_rules: r.scaling_rules,
      conflicts_with: r.conflicts_with,
      locale: r.locale,
    })),
    
    materials: game.materials ? {
      items: game.materials.items || [],
      safety_notes: game.materials.safety_notes ?? null,
      preparation: game.materials.preparation ?? null,
      locale: null,
    } : null,
    
    board_config: game.boardConfig ? {
      show_game_name: game.boardConfig.show_game_name,
      show_current_phase: game.boardConfig.show_current_phase,
      show_timer: game.boardConfig.show_timer,
      show_participants: game.boardConfig.show_participants,
      show_public_roles: game.boardConfig.show_public_roles,
      show_leaderboard: game.boardConfig.show_leaderboard,
      show_qr_code: game.boardConfig.show_qr_code,
      welcome_message: game.boardConfig.welcome_message ?? null,
      theme: game.boardConfig.theme ?? 'neutral',
      background_color: game.boardConfig.background_color ?? null,
      layout_variant: game.boardConfig.layout_variant ?? 'standard',
      locale: null,
      background_media_id: null,
    } : null,
    
    secondary_purpose_ids: game.sub_purpose_ids ?? [],
    
    artifacts: artifactRows.map(a => ({
      id: a.id,
      artifact_order: a.artifact_order,
      artifact_type: a.artifact_type,
      title: a.title,
      description: a.description,  // NOTE: DB column is 'description', not 'body'
      metadata: a.metadata,
      tags: a.tags ?? [],
      locale: a.locale,
    })),
    
    // Flat variant array (pre-resolved visible_to_role_id)
    artifact_variants: variantRows,
    
    triggers: rewrittenTriggerRows.map(t => ({
      id: randomUUID(),  // Generate trigger IDs
      name: t.name,
      description: t.description,
      enabled: t.enabled,
      condition: t.condition,  // singular, NOT 'conditions'
      actions: t.actions,
      execute_once: t.execute_once,
      delay_seconds: t.delay_seconds,
      sort_order: t.sort_order,
    })),
  };

  // Call atomic RPC
  const { data: rpcData, error: rpcError } = await db.rpc('upsert_game_content_v1', {
    p_payload: payload,
  });
  const rpcResult = rpcData as UpsertRpcResult | null;

  if (rpcError) {
    console.error(`[csv-import] db.write.rpc_error run=${importRunId} game=${game.game_key} error=${rpcError.message}`);
    throw new Error(`Atomic upsert RPC failed: ${rpcError.message}`);
  }

  if (!rpcResult?.ok) {
    const errMsg = rpcResult?.error ?? 'Unknown error';
    const errCode = rpcResult?.code ?? 'N/A';
    console.error(`[csv-import] db.write.fail run=${importRunId} game=${game.game_key} error=${errMsg} code=${errCode}`);
    throw new Error(`Atomic upsert failed: ${errMsg} (code: ${errCode})`);
  }

  // LOG: All DB writes completed successfully (atomic)
  const counts = rpcResult.counts ?? {};
  console.log(`[csv-import] db.write.done run=${importRunId} game=${game.game_key} counts=${JSON.stringify(counts)}`);

  // ==========================================================================
  // PHASE 4: Auto-assign cover image from templates (idempotent)
  // ==========================================================================
  const coverResult = await assignCoverFromTemplates(db, {
    gameId,
    gameKey: game.game_key,
    gameName: game.name,
    mainPurposeId: game.main_purpose_id ?? null,
    productId: game.product_id ?? null,
    tenantId: game.owner_tenant_id ?? null,
  });

  if (coverResult.assigned) {
    console.log(`[csv-import] cover.assigned run=${importRunId} game=${game.game_key} template=${coverResult.templateKey ?? 'N/A'}`);
  } else if (coverResult.skipReason === 'no_templates_found') {
    console.warn(`[csv-import] cover.no_templates run=${importRunId} game=${game.game_key} purpose=${game.main_purpose_id}`);
  }
  // skipReason='already_has_cover' is silent (expected for upserts)

  return coverResult;
}

