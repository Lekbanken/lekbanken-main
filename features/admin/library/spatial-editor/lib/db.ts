import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Typed DB helper for spatial_artifacts
// =============================================================================
// The `spatial_artifacts` table is not yet in the auto-generated Database types.
// This helper isolates the `any` cast to a single location so inline casts
// don't proliferate across server actions.
//
// Remove this file after running `supabase gen types` with the migration applied.
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpatialArtifactsQuery = { from: (table: 'spatial_artifacts') => any };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fromSpatialArtifacts = (supabase: SupabaseClient): any =>
  (supabase as unknown as SpatialArtifactsQuery).from('spatial_artifacts');
