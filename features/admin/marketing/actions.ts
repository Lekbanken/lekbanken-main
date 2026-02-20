'use server';

/**
 * Marketing Admin Server Actions
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireSystemAdmin } from '@/lib/api/auth-guard';

/** Immediately invalidate a cache tag (Next.js 16 requires a profile). */
const invalidateTag = (tag: string) => revalidateTag(tag, { expire: 0 });
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
    await requireSystemAdmin();
    const result = await getAllFeatures();
    return { success: true, data: result };
  } catch (error) {
    console.error('[fetchAllFeaturesAction] Error:', error);
    return { success: false, error: 'Failed to fetch features' };
  }
}

export async function fetchAllUpdatesAction() {
  try {
    await requireSystemAdmin();
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
    await requireSystemAdmin();
    const feature = await createFeature(input);
    invalidateTag('marketing-features');
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
    await requireSystemAdmin();
    const feature = await updateFeature(id, input);
    invalidateTag('marketing-features');
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
    await requireSystemAdmin();
    await deleteFeature(id);
    invalidateTag('marketing-features');
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
    await requireSystemAdmin();
    const update = await createUpdate(input);
    invalidateTag('marketing-updates');
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
    await requireSystemAdmin();
    const update = await updateUpdate(id, input);
    invalidateTag('marketing-updates');
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
    await requireSystemAdmin();
    await deleteUpdate(id);
    invalidateTag('marketing-updates');
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
    await requireSystemAdmin();
    const update = await publishUpdate(id);
    invalidateTag('marketing-updates');
    revalidatePath('/admin/marketing/updates');
    revalidatePath('/');
    return { success: true, data: update };
  } catch (error) {
    console.error('[publishUpdateAction] Error:', error);
    return { success: false, error: 'Failed to publish update' };
  }
}
