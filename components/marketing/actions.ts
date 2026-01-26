'use server';

/**
 * Marketing Public Server Actions
 * 
 * Actions for fetching marketing data on the public site.
 */

import { getPublishedFeatures, getFeaturedFeatures, getPublishedUpdates } from '@/lib/marketing/api';
import type { FeatureFilters } from '@/lib/marketing/types';

/**
 * Fetch published features for the public marketing page
 */
export async function fetchPublishedFeaturesAction(filters?: FeatureFilters) {
  try {
    const result = await getPublishedFeatures(filters);
    return { success: true, data: result };
  } catch (error) {
    console.error('[fetchPublishedFeaturesAction] Error:', error);
    return { success: false, error: 'Failed to fetch features' };
  }
}

/**
 * Fetch featured features only (for homepage highlights)
 */
export async function fetchFeaturedFeaturesAction() {
  try {
    const features = await getFeaturedFeatures();
    return { success: true, data: features };
  } catch (error) {
    console.error('[fetchFeaturedFeaturesAction] Error:', error);
    return { success: false, error: 'Failed to fetch featured features' };
  }
}

/**
 * Fetch published updates for activity feed
 */
export async function fetchPublishedUpdatesAction(limit = 10) {
  try {
    const result = await getPublishedUpdates(limit);
    return { success: true, data: result };
  } catch (error) {
    console.error('[fetchPublishedUpdatesAction] Error:', error);
    return { success: false, error: 'Failed to fetch updates' };
  }
}
