/**
 * Auto-assign cover image from media_templates during import.
 * 
 * INVARIANT: Idempotent - never overwrites existing cover.
 * 
 * SELECTION STRATEGY (priority order):
 * 1. product_id + main_purpose_id match → prefer these
 * 2. product_id IS NULL + main_purpose_id match → fallback global templates
 * 3. No match → return warning (no cover assigned)
 * 
 * DETERMINISM: hash(game_key) % templates.length → same game always gets same image
 * 
 * @module lib/import/assignCoverFromTemplates
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export interface AssignCoverParams {
  gameId: string;
  gameKey: string;
  gameName: string;
  mainPurposeId: string | null;
  productId?: string | null;
  tenantId?: string | null;
}

export interface AssignCoverResult {
  assigned: boolean;
  skipped: boolean;
  skipReason?: 'already_has_cover' | 'no_templates_found';
  mediaId?: string;
  templateKey?: string;
}

/**
 * Simple string hash for deterministic template selection.
 * Same game_key always picks same index within template set.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Assign a cover image from media_templates if:
 * 1. Game doesn't already have a cover
 * 2. Templates exist for the game's purpose (optionally filtered by product)
 * 
 * @param supabase - Supabase client with appropriate permissions (service role recommended)
 * @param params - Game identifiers and purpose/product info
 * @returns Result object with assignment status and details
 */
export async function assignCoverFromTemplates(
  supabase: SupabaseClient<Database>,
  params: AssignCoverParams
): Promise<AssignCoverResult> {
  const { gameId, gameKey, gameName, mainPurposeId, productId, tenantId } = params;

  // Guard: No purpose means no templates to search
  if (!mainPurposeId) {
    return {
      assigned: false,
      skipped: true,
      skipReason: 'no_templates_found',
    };
  }

  // Step 1: Check if cover already exists (idempotent)
  const { data: existingCover } = await supabase
    .from('game_media')
    .select('id')
    .eq('game_id', gameId)
    .eq('kind', 'cover')
    .limit(1)
    .maybeSingle();

  if (existingCover) {
    return {
      assigned: false,
      skipped: true,
      skipReason: 'already_has_cover',
    };
  }

  // Step 2: Try product-specific templates first (if productId exists)
  let templates: { media_id: string; template_key: string | null }[] = [];

  if (productId) {
    const { data: productTemplates } = await supabase
      .from('media_templates')
      .select('media_id, template_key')
      .eq('main_purpose_id', mainPurposeId)
      .eq('product_id', productId)
      .is('sub_purpose_id', null)
      .order('priority', { ascending: false })
      .order('is_default', { ascending: false });

    if (productTemplates && productTemplates.length > 0) {
      templates = productTemplates;
    }
  }

  // Step 3: Fallback to global templates (product_id IS NULL)
  if (templates.length === 0) {
    const { data: globalTemplates } = await supabase
      .from('media_templates')
      .select('media_id, template_key')
      .eq('main_purpose_id', mainPurposeId)
      .is('product_id', null)
      .is('sub_purpose_id', null)
      .order('priority', { ascending: false })
      .order('is_default', { ascending: false });

    if (globalTemplates && globalTemplates.length > 0) {
      templates = globalTemplates;
    }
  }

  // Step 4: No templates found
  if (templates.length === 0) {
    return {
      assigned: false,
      skipped: true,
      skipReason: 'no_templates_found',
    };
  }

  // Step 5: Deterministic selection via hash
  const idx = hashCode(gameKey) % templates.length;
  const selected = templates[idx];

  // Step 6: Insert game_media row with kind='cover'
  const { error: insertError } = await supabase
    .from('game_media')
    .insert({
      game_id: gameId,
      media_id: selected.media_id,
      kind: 'cover',
      position: 0,
      alt_text: gameName.slice(0, 120), // Accessibility: use game name as default alt text (truncated)
      tenant_id: tenantId ?? null,
    });

  if (insertError) {
    // Check for unique constraint violation (race condition - another process already set cover)
    // PostgreSQL error code 23505 = unique_violation
    if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
      // Treat as skipped - cover already exists (race-safe)
      return {
        assigned: false,
        skipped: true,
        skipReason: 'already_has_cover',
      };
    }
    
    // Log other errors but don't fail the import - cover is non-critical
    console.error(`[assignCoverFromTemplates] Insert failed for game=${gameId}: ${insertError.message}`);
    return {
      assigned: false,
      skipped: true,
      skipReason: 'no_templates_found', // Treat insert error as skip
    };
  }

  return {
    assigned: true,
    skipped: false,
    mediaId: selected.media_id,
    templateKey: selected.template_key ?? undefined,
  };
}

/**
 * Batch version for efficiency when importing multiple games.
 * Aggregates results and logs summary.
 */
export async function assignCoverFromTemplatesBatch(
  supabase: SupabaseClient<Database>,
  games: AssignCoverParams[]
): Promise<{
  assigned: number;
  skipped: number;
  noTemplates: string[]; // game_keys without templates
}> {
  let assigned = 0;
  let skipped = 0;
  const noTemplates: string[] = [];

  for (const game of games) {
    const result = await assignCoverFromTemplates(supabase, game);
    
    if (result.assigned) {
      assigned++;
    } else {
      skipped++;
      if (result.skipReason === 'no_templates_found') {
        noTemplates.push(game.gameKey);
      }
    }
  }

  return { assigned, skipped, noTemplates };
}
