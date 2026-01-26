/**
 * Marketing Domain - API Functions
 * 
 * Server-side functions for fetching and managing marketing features and updates.
 * 
 * NOTE: The marketing_features and marketing_updates tables are defined in migration
 * 20260126100000_marketing_domain.sql. After running the migration and regenerating
 * types with `supabase gen types typescript`, the type casts below can be removed.
 */

import 'server-only';

import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { transformFeatureRow, transformUpdateRow, transformFeatureInput, transformUpdateInput } from './transformers';
import type {
  MarketingFeature,
  MarketingUpdate,
  MarketingFeatureInput,
  MarketingUpdateInput,
  FeatureFilters,
  UpdateFilters,
  FeaturesResponse,
  UpdatesResponse,
  MarketingFeatureRow,
  MarketingUpdateRow,
} from './types';

// =============================================================================
// Type-safe table accessors (workaround until types are regenerated)
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

const FEATURES_TABLE = 'marketing_features' as const;
const UPDATES_TABLE = 'marketing_updates' as const;

// =============================================================================
// Public Read Functions (uses RLS client - returns only published)
// =============================================================================

/**
 * Fetch published features for public display
 */
export async function getPublishedFeatures(filters?: FeatureFilters): Promise<FeaturesResponse> {
  const supabase = await createServerRlsClient() as AnySupabaseClient;
  
  let query = supabase
    .from(FEATURES_TABLE)
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('priority', { ascending: false });

  if (filters?.audience && filters.audience !== 'all') {
    query = query.or(`audience.eq.${filters.audience},audience.eq.all`);
  }
  if (filters?.useCase) {
    query = query.eq('use_case', filters.useCase);
  }
  if (filters?.context && filters.context !== 'any') {
    query = query.or(`context.eq.${filters.context},context.eq.any`);
  }
  if (filters?.isFeatured !== undefined) {
    query = query.eq('is_featured', filters.isFeatured);
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,subtitle.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[getPublishedFeatures] Error:', error);
    throw new Error('Failed to fetch features');
  }

  return {
    features: (data as MarketingFeatureRow[]).map(transformFeatureRow),
    total: count ?? 0,
  };
}

/**
 * Fetch featured features only (for homepage grid)
 */
export async function getFeaturedFeatures(): Promise<MarketingFeature[]> {
  const { features } = await getPublishedFeatures({ isFeatured: true });
  return features;
}

/**
 * Fetch published updates for public display
 */
export async function getPublishedUpdates(limit = 10): Promise<UpdatesResponse> {
  const supabase = await createServerRlsClient() as AnySupabaseClient;
  
  const { data, error, count } = await supabase
    .from(UPDATES_TABLE)
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getPublishedUpdates] Error:', error);
    throw new Error('Failed to fetch updates');
  }

  return {
    updates: (data as MarketingUpdateRow[]).map(transformUpdateRow),
    total: count ?? 0,
  };
}

// =============================================================================
// Admin Functions (uses service role client - full access)
// =============================================================================

/**
 * Fetch all features for admin (includes draft/archived)
 */
export async function getAllFeatures(filters?: FeatureFilters): Promise<FeaturesResponse> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  let query = supabase
    .from(FEATURES_TABLE)
    .select('*', { count: 'exact' })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.audience && filters.audience !== 'all') {
    query = query.eq('audience', filters.audience);
  }
  if (filters?.useCase) {
    query = query.eq('use_case', filters.useCase);
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,subtitle.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[getAllFeatures] Error:', error);
    throw new Error('Failed to fetch features');
  }

  return {
    features: (data as MarketingFeatureRow[]).map(transformFeatureRow),
    total: count ?? 0,
  };
}

/**
 * Get single feature by ID
 */
export async function getFeatureById(id: string): Promise<MarketingFeature | null> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from(FEATURES_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('[getFeatureById] Error:', error);
    throw new Error('Failed to fetch feature');
  }

  return transformFeatureRow(data as MarketingFeatureRow);
}

/**
 * Create a new feature
 */
export async function createFeature(input: MarketingFeatureInput): Promise<MarketingFeature> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from(FEATURES_TABLE)
    .insert(transformFeatureInput(input))
    .select()
    .single();

  if (error) {
    console.error('[createFeature] Error:', error);
    throw new Error('Failed to create feature');
  }

  return transformFeatureRow(data as MarketingFeatureRow);
}

/**
 * Update an existing feature
 */
export async function updateFeature(id: string, input: Partial<MarketingFeatureInput>): Promise<MarketingFeature> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  const updateData = transformFeatureInput(input as MarketingFeatureInput);
  // Remove undefined values
  const cleanData = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from(FEATURES_TABLE)
    .update(cleanData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateFeature] Error:', error);
    throw new Error('Failed to update feature');
  }

  return transformFeatureRow(data as MarketingFeatureRow);
}

/**
 * Delete a feature
 */
export async function deleteFeature(id: string): Promise<void> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  const { error } = await supabase
    .from(FEATURES_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteFeature] Error:', error);
    throw new Error('Failed to delete feature');
  }
}

/**
 * Fetch all updates for admin
 */
export async function getAllUpdates(filters?: UpdateFilters): Promise<UpdatesResponse> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  let query = supabase
    .from(UPDATES_TABLE)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[getAllUpdates] Error:', error);
    throw new Error('Failed to fetch updates');
  }

  return {
    updates: (data as MarketingUpdateRow[]).map(transformUpdateRow),
    total: count ?? 0,
  };
}

/**
 * Get single update by ID
 */
export async function getUpdateById(id: string): Promise<MarketingUpdate | null> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from(UPDATES_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[getUpdateById] Error:', error);
    throw new Error('Failed to fetch update');
  }

  return transformUpdateRow(data as MarketingUpdateRow);
}

/**
 * Create a new update
 */
export async function createUpdate(input: MarketingUpdateInput): Promise<MarketingUpdate> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from(UPDATES_TABLE)
    .insert(transformUpdateInput(input))
    .select()
    .single();

  if (error) {
    console.error('[createUpdate] Error:', error);
    throw new Error('Failed to create update');
  }

  return transformUpdateRow(data as MarketingUpdateRow);
}

/**
 * Update an existing update
 */
export async function updateUpdate(id: string, input: Partial<MarketingUpdateInput>): Promise<MarketingUpdate> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  const updateData = transformUpdateInput(input as MarketingUpdateInput);
  const cleanData = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from(UPDATES_TABLE)
    .update(cleanData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateUpdate] Error:', error);
    throw new Error('Failed to update update');
  }

  return transformUpdateRow(data as MarketingUpdateRow);
}

/**
 * Delete an update
 */
export async function deleteUpdate(id: string): Promise<void> {
  const supabase = createServiceRoleClient() as AnySupabaseClient;
  
  const { error } = await supabase
    .from(UPDATES_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteUpdate] Error:', error);
    throw new Error('Failed to delete update');
  }
}

/**
 * Publish an update (set status to published and published_at to now)
 */
export async function publishUpdate(id: string): Promise<MarketingUpdate> {
  return updateUpdate(id, {
    status: 'published',
    publishedAt: new Date(),
  });
}
