/**
 * Marketing Domain - API Functions
 * 
 * Server-side functions for fetching and managing marketing features and updates.
 */

import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { unstable_cache } from 'next/cache';
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

const FEATURES_TABLE = 'marketing_features' as const;
const UPDATES_TABLE = 'marketing_updates' as const;

type MarketingFeatureDbRow = Tables<'marketing_features'>;
type MarketingFeatureDbInsert = TablesInsert<'marketing_features'>;
type MarketingFeatureDbUpdate = TablesUpdate<'marketing_features'>;
type MarketingUpdateDbRow = Tables<'marketing_updates'>;
type MarketingUpdateDbInsert = TablesInsert<'marketing_updates'>;
type MarketingUpdateDbUpdate = TablesUpdate<'marketing_updates'>;

function asMarketingFeatureRow(row: MarketingFeatureDbRow): MarketingFeatureRow {
  return row as MarketingFeatureRow;
}

function asMarketingUpdateRow(row: MarketingUpdateDbRow): MarketingUpdateRow {
  return row as MarketingUpdateRow;
}

// =============================================================================
// Public Read Functions (cached — data is public so safe to share across requests)
// Uses unstable_cache with 5-min TTL to eliminate redundant DB queries.
// Admin publish actions should call revalidateTag('marketing-features') / 'marketing-updates'.
// =============================================================================

/**
 * Fetch published features for public display (cached 5 min)
 */
export async function getPublishedFeatures(filters?: FeatureFilters): Promise<FeaturesResponse> {
  // Serialize filters to a stable string for cache key
  const filterKey = filters ? JSON.stringify(filters, Object.keys(filters).sort()) : 'none';
  return getPublishedFeaturesCached(filterKey);
}

const getPublishedFeaturesCached = unstable_cache(
  async (filterKey: string): Promise<FeaturesResponse> => {
    const filters: FeatureFilters | undefined = filterKey === 'none' ? undefined : JSON.parse(filterKey);
    const supabase = createServiceRoleClient();
    
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
      features: (data ?? []).map((row) => transformFeatureRow(asMarketingFeatureRow(row))),
      total: count ?? 0,
    };
  },
  ['marketing-published-features'],
  { revalidate: 300, tags: ['marketing-features'] }
);

/**
 * Fetch featured features only (for homepage grid)
 */
export async function getFeaturedFeatures(): Promise<MarketingFeature[]> {
  const { features } = await getPublishedFeatures({ isFeatured: true });
  return features;
}

/**
 * Fetch published updates for public display (cached 5 min)
 */
export async function getPublishedUpdates(limit = 10): Promise<UpdatesResponse> {
  return getPublishedUpdatesCached(limit);
}

const getPublishedUpdatesCached = unstable_cache(
  async (limit: number): Promise<UpdatesResponse> => {
    const supabase = createServiceRoleClient();
    
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
      updates: (data ?? []).map((row) => transformUpdateRow(asMarketingUpdateRow(row))),
      total: count ?? 0,
    };
  },
  ['marketing-published-updates'],
  { revalidate: 300, tags: ['marketing-updates'] }
);

// =============================================================================
// Admin Functions (uses service role client - full access)
// =============================================================================

/**
 * Fetch all features for admin (includes draft/archived)
 */
export async function getAllFeatures(filters?: FeatureFilters): Promise<FeaturesResponse> {
  const supabase = createServiceRoleClient();
  
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
    features: (data ?? []).map((row) => transformFeatureRow(asMarketingFeatureRow(row))),
    total: count ?? 0,
  };
}

/**
 * Get single feature by ID
 */
export async function getFeatureById(id: string): Promise<MarketingFeature | null> {
  const supabase = createServiceRoleClient();
  
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

  return transformFeatureRow(asMarketingFeatureRow(data));
}

/**
 * Create a new feature
 */
export async function createFeature(input: MarketingFeatureInput): Promise<MarketingFeature> {
  const supabase = createServiceRoleClient();
  const featurePayload = transformFeatureInput(input) as MarketingFeatureDbInsert;
  
  const { data, error } = await supabase
    .from(FEATURES_TABLE)
    .insert(featurePayload)
    .select()
    .single();

  if (error) {
    console.error('[createFeature] Error:', error);
    throw new Error('Failed to create feature');
  }

  return transformFeatureRow(asMarketingFeatureRow(data));
}

/**
 * Update an existing feature
 */
export async function updateFeature(id: string, input: Partial<MarketingFeatureInput>): Promise<MarketingFeature> {
  const supabase = createServiceRoleClient();
  
  const updateData = transformFeatureInput(input as MarketingFeatureInput);
  const cleanData = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  ) as MarketingFeatureDbUpdate;

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

  return transformFeatureRow(asMarketingFeatureRow(data));
}

/**
 * Delete a feature
 */
export async function deleteFeature(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  
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
  const supabase = createServiceRoleClient();
  
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
    updates: (data ?? []).map((row) => transformUpdateRow(asMarketingUpdateRow(row))),
    total: count ?? 0,
  };
}

/**
 * Get single update by ID
 */
export async function getUpdateById(id: string): Promise<MarketingUpdate | null> {
  const supabase = createServiceRoleClient();
  
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

  return transformUpdateRow(asMarketingUpdateRow(data));
}

/**
 * Create a new update
 */
export async function createUpdate(input: MarketingUpdateInput): Promise<MarketingUpdate> {
  const supabase = createServiceRoleClient();
  const updatePayload = transformUpdateInput(input) as MarketingUpdateDbInsert;
  
  const { data, error } = await supabase
    .from(UPDATES_TABLE)
    .insert(updatePayload)
    .select()
    .single();

  if (error) {
    console.error('[createUpdate] Error:', error);
    throw new Error('Failed to create update');
  }

  return transformUpdateRow(asMarketingUpdateRow(data));
}

/**
 * Update an existing update
 */
export async function updateUpdate(id: string, input: Partial<MarketingUpdateInput>): Promise<MarketingUpdate> {
  const supabase = createServiceRoleClient();
  
  const updateData = transformUpdateInput(input as MarketingUpdateInput);
  const cleanData = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  ) as MarketingUpdateDbUpdate;

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

  return transformUpdateRow(asMarketingUpdateRow(data));
}

/**
 * Delete an update
 */
export async function deleteUpdate(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  
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
