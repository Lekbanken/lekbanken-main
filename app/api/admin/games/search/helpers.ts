import { z } from 'zod';
import type { GameAdminFilters, GameSortField, ValidationState } from '@/features/admin/games/v2/types';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * Classification filters schema
 */
export const classificationFiltersSchema = z.object({
  gameTypes: z.array(z.string()).optional(),
  mainPurposes: z.array(z.string().uuid()).optional(),
  subPurposes: z.array(z.string().uuid()).optional(),
  ageMin: z.number().int().min(0).max(120).optional(),
  ageMax: z.number().int().min(0).max(120).optional(),
  durationMin: z.number().int().min(0).optional(),
  durationMax: z.number().int().min(0).optional(),
});

/**
 * Play execution filters schema
 */
export const playExecutionFiltersSchema = z.object({
  playModes: z.array(z.enum(['basic', 'facilitated', 'participants'])).optional(),
  requiredMaterials: z.boolean().optional(),
  minPlayers: z.number().int().min(1).optional(),
  maxPlayers: z.number().int().min(1).optional(),
  locationType: z.array(z.enum(['indoor', 'outdoor', 'both'])).optional(),
  energyLevels: z.array(z.enum(['low', 'medium', 'high'])).optional(),
});

/**
 * Lifecycle filters schema
 */
export const lifecycleFiltersSchema = z.object({
  statuses: z.array(z.enum(['draft', 'published'])).optional(),
  hasPublishedVersion: z.boolean().optional(),
  validationStates: z.array(z.enum(['valid', 'warnings', 'errors', 'pending', 'outdated'])).optional(),
  needsReview: z.boolean().optional(),
  hasAssets: z.boolean().optional(),
});

/**
 * Ownership filters schema
 */
export const ownershipFiltersSchema = z.object({
  ownerSources: z.array(z.enum(['system', 'imported', 'tenant', 'ai_generated'])).optional(),
  tenantIds: z.array(z.string().uuid()).optional(),
  isGlobal: z.boolean().optional(),
  licenseTiers: z.array(z.string()).optional(),
});

/**
 * Technical filters schema
 */
export const technicalFiltersSchema = z.object({
  schemaVersions: z.array(z.string()).optional(),
  importSources: z.array(z.enum(['csv', 'json', 'manual', 'ai'])).optional(),
  hasMissingAssets: z.boolean().optional(),
  hasValidationErrors: z.boolean().optional(),
  gameContentVersions: z.array(z.string()).optional(),
});

/**
 * Complete admin search schema
 */
export const adminSearchSchema = z.object({
  // Free text search
  search: z.string().trim().max(500).optional(),
  
  // Filter groups
  classification: classificationFiltersSchema.optional(),
  playExecution: playExecutionFiltersSchema.optional(),
  lifecycle: lifecycleFiltersSchema.optional(),
  ownership: ownershipFiltersSchema.optional(),
  technical: technicalFiltersSchema.optional(),
  
  // Sorting
  sortBy: z.enum([
    'name',
    'created_at',
    'updated_at',
    'status',
    'play_mode',
    'step_count',
    'validation_state',
  ]).optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Pagination
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(25),
});

export type AdminSearchInput = z.infer<typeof adminSearchSchema>;

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Build filter clauses for the Supabase query
 */
export function buildFilterClauses(filters: GameAdminFilters): {
  where: string[];
  orGroups: string[];
  joins: string[];
} {
  const where: string[] = [];
  const orGroups: string[] = [];
  const joins: string[] = [];

  // Classification filters
  if (filters.classification) {
    const c = filters.classification;
    
    if (c.mainPurposes?.length) {
      where.push(`main_purpose_id.in.(${c.mainPurposes.join(',')})`);
    }
    
    if (c.ageMin !== undefined) {
      where.push(`age_min.gte.${c.ageMin}`);
    }
    
    if (c.ageMax !== undefined) {
      where.push(`age_max.lte.${c.ageMax}`);
    }
    
    if (c.durationMin !== undefined) {
      where.push(`time_estimate_min.gte.${c.durationMin}`);
    }
    
    if (c.durationMax !== undefined) {
      where.push(`time_estimate_min.lte.${c.durationMax}`);
    }
  }

  // Play execution filters
  if (filters.playExecution) {
    const p = filters.playExecution;
    
    if (p.playModes?.length) {
      where.push(`play_mode.in.(${p.playModes.join(',')})`);
    }
    
    if (p.minPlayers !== undefined) {
      where.push(`min_players.gte.${p.minPlayers}`);
    }
    
    if (p.maxPlayers !== undefined) {
      where.push(`max_players.lte.${p.maxPlayers}`);
    }
    
    if (p.locationType?.length) {
      where.push(`location_type.in.(${p.locationType.join(',')})`);
    }
    
    if (p.energyLevels?.length) {
      where.push(`energy_level.in.(${p.energyLevels.join(',')})`);
    }
  }

  // Lifecycle filters
  if (filters.lifecycle) {
    const l = filters.lifecycle;
    
    if (l.statuses?.length) {
      where.push(`status.in.(${l.statuses.join(',')})`);
    }
  }

  // Ownership filters
  if (filters.ownership) {
    const o = filters.ownership;
    
    if (o.tenantIds?.length) {
      where.push(`owner_tenant_id.in.(${o.tenantIds.join(',')})`);
    }
    
    if (o.isGlobal === true) {
      where.push('owner_tenant_id.is.null');
    } else if (o.isGlobal === false) {
      where.push('owner_tenant_id.not.is.null');
    }
  }

  // Technical filters
  if (filters.technical) {
    const t = filters.technical;
    
    if (t.gameContentVersions?.length) {
      where.push(`game_content_version.in.(${t.gameContentVersions.join(',')})`);
    }
  }

  return { where, orGroups, joins };
}

/**
 * Build sort clause
 */
export function buildSortClause(
  sortBy: GameSortField = 'updated_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): { column: string; ascending: boolean } {
  const columnMap: Record<GameSortField, string> = {
    name: 'name',
    created_at: 'created_at',
    updated_at: 'updated_at',
    status: 'status',
    play_mode: 'play_mode',
    step_count: 'step_count',
    validation_state: 'validation_state',
  };
  
  return {
    column: columnMap[sortBy] || 'updated_at',
    ascending: sortOrder === 'asc',
  };
}

/**
 * Compute validation state from game data
 */
export function computeValidationState(game: {
  name?: string | null;
  short_description?: string | null;
  main_purpose_id?: string | null;
  step_count?: number;
  media?: Array<{ kind: string; media?: { url?: string } | null }> | null;
  status?: string;
  play_mode?: string | null;
  phase_count?: number;
  role_count?: number;
}): { state: ValidationState; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Error checks
  if (!game.name || game.name.trim().length === 0) {
    errors.push('Spelet saknar namn');
  }
  
  // Warning checks
  if (!game.short_description || game.short_description.trim().length === 0) {
    warnings.push('Spelet saknar kort beskrivning');
  }
  
  if ((game.step_count ?? 0) === 0) {
    warnings.push('Spelet saknar steg');
  }
  
  if (!game.main_purpose_id) {
    warnings.push('Spelet saknar huvudsyfte');
  }
  
  const hasCover = game.media?.some(m => m.kind === 'cover' && m.media?.url);
  if (game.status === 'published' && !hasCover) {
    warnings.push('Publicerat spel saknar omslagsbild');
  }
  
  if (game.play_mode === 'facilitated' && (game.phase_count ?? 0) === 0) {
    warnings.push('Ledd aktivitet saknar faser');
  }
  
  if (game.play_mode === 'participants' && (game.role_count ?? 0) === 0) {
    warnings.push('Deltagarlek saknar roller');
  }
  
  // Determine state
  let state: ValidationState = 'valid';
  if (errors.length > 0) {
    state = 'errors';
  } else if (warnings.length > 0) {
    state = 'warnings';
  }
  
  return { state, errors, warnings };
}

/**
 * Serialize filters to URL-safe string
 */
export function serializeFilters(filters: GameAdminFilters): string {
  const clean = JSON.parse(JSON.stringify(filters, (_, v) => v ?? undefined));
  return btoa(JSON.stringify(clean));
}

/**
 * Deserialize filters from URL-safe string
 */
export function deserializeFilters(str: string): GameAdminFilters | null {
  try {
    const decoded = atob(str);
    return JSON.parse(decoded) as GameAdminFilters;
  } catch {
    return null;
  }
}
