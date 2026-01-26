'use server';

/**
 * Marketing Admin Server Actions
 */

import { revalidatePath } from 'next/cache';
import {
  createFeature,
  updateFeature,
  deleteFeature,
  createUpdate,
  updateUpdate,
  deleteUpdate,
  publishUpdate,
  getAllFeatures,
  getAllUpdates,
} from '@/lib/marketing/api';
import type { MarketingFeatureInput, MarketingUpdateInput } from '@/lib/marketing/types';

// =============================================================================
// Fetch Actions (for client components)
// =============================================================================

export async function fetchAllFeaturesAction() {
  try {
    const result = await getAllFeatures();
    return { success: true, data: result };
  } catch (error) {
    console.error('[fetchAllFeaturesAction] Error:', error);
    return { success: false, error: 'Failed to fetch features' };
  }
}

export async function fetchAllUpdatesAction() {
  try {
    const result = await getAllUpdates();
    return { success: true, data: result };
  } catch (error) {
    console.error('[fetchAllUpdatesAction] Error:', error);
    return { success: false, error: 'Failed to fetch updates' };
  }
}

// =============================================================================
// Feature Actions
// =============================================================================

export async function createFeatureAction(input: MarketingFeatureInput) {
  try {
    const feature = await createFeature(input);
    revalidatePath('/admin/marketing/features');
    revalidatePath('/'); // Revalidate marketing page
    revalidatePath('/features');
    return { success: true, data: feature };
  } catch (error) {
    console.error('[createFeatureAction] Error:', error);
    return { success: false, error: 'Failed to create feature' };
  }
}

export async function updateFeatureAction(id: string, input: Partial<MarketingFeatureInput>) {
  try {
    const feature = await updateFeature(id, input);
    revalidatePath('/admin/marketing/features');
    revalidatePath('/');
    revalidatePath('/features');
    return { success: true, data: feature };
  } catch (error) {
    console.error('[updateFeatureAction] Error:', error);
    return { success: false, error: 'Failed to update feature' };
  }
}

export async function deleteFeatureAction(id: string) {
  try {
    await deleteFeature(id);
    revalidatePath('/admin/marketing/features');
    revalidatePath('/');
    revalidatePath('/features');
    return { success: true };
  } catch (error) {
    console.error('[deleteFeatureAction] Error:', error);
    return { success: false, error: 'Failed to delete feature' };
  }
}

// =============================================================================
// Update Actions
// =============================================================================

export async function createUpdateAction(input: MarketingUpdateInput) {
  try {
    const update = await createUpdate(input);
    revalidatePath('/admin/marketing/updates');
    revalidatePath('/');
    return { success: true, data: update };
  } catch (error) {
    console.error('[createUpdateAction] Error:', error);
    return { success: false, error: 'Failed to create update' };
  }
}

export async function updateUpdateAction(id: string, input: Partial<MarketingUpdateInput>) {
  try {
    const update = await updateUpdate(id, input);
    revalidatePath('/admin/marketing/updates');
    revalidatePath('/');
    return { success: true, data: update };
  } catch (error) {
    console.error('[updateUpdateAction] Error:', error);
    return { success: false, error: 'Failed to update update' };
  }
}

export async function deleteUpdateAction(id: string) {
  try {
    await deleteUpdate(id);
    revalidatePath('/admin/marketing/updates');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[deleteUpdateAction] Error:', error);
    return { success: false, error: 'Failed to delete update' };
  }
}

export async function publishUpdateAction(id: string) {
  try {
    const update = await publishUpdate(id);
    revalidatePath('/admin/marketing/updates');
    revalidatePath('/');
    return { success: true, data: update };
  } catch (error) {
    console.error('[publishUpdateAction] Error:', error);
    return { success: false, error: 'Failed to publish update' };
  }
}
