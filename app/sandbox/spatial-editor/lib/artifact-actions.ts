'use server';

// =============================================================================
// Spatial Artifacts – Server Actions (CRUD)
// =============================================================================
// 3-tier scope persistence for Spatial Editor documents:
//   - tenant-owned (tenant_id + visibility='tenant')
//   - user-private  (tenant_id=null + visibility='private')
//   - global/public (tenant_id=null + visibility='public')
// Uses RLS client — policies enforce access.
// =============================================================================

import { createServerRlsClient } from '@/lib/supabase/server';
import { fromSpatialArtifacts } from './db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Visibility / scope for an artifact */
export type ArtifactVisibility = 'private' | 'tenant' | 'public';

export interface SpatialArtifactRow {
  id: string;
  tenant_id: string | null;
  created_by: string;
  title: string;
  description: string;
  mode: string;
  visibility: ArtifactVisibility;
  document: unknown; // jsonb — SpatialDocumentV1
  preview_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpatialArtifactListItem {
  id: string;
  title: string;
  description: string;
  mode: string;
  visibility: ArtifactVisibility;
  tenant_id: string | null;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Save a new artifact or update an existing one */
export async function saveSpatialArtifact(params: {
  id?: string;                   // omit for new, provide for update
  tenantId?: string | null;      // null → personal / global
  title: string;
  description?: string;
  mode?: string;
  visibility?: ArtifactVisibility;
  document: unknown;             // SpatialDocumentV1 as JSON-serializable
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  // Derive visibility from tenantId if not explicitly set
  const visibility = params.visibility
    ?? (params.tenantId ? 'tenant' : 'private');

  // App-layer guard: regular users cannot create/update public artifacts.
  // Public templates must be created via service_role / admin RPC.
  if (visibility === 'public') {
    return { error: 'Public artifacts can only be created by administrators.' };
  }

  // Enforce scope coupling at app layer (belt-and-suspenders with DB CHECK)
  if (params.tenantId && visibility !== 'tenant') {
    return { error: 'Tenant artifacts must use visibility=tenant.' };
  }
  if (!params.tenantId && visibility === 'tenant') {
    return { error: 'Tenant visibility requires a tenantId.' };
  }

  if (params.id) {
    // Update existing
    const updatePayload: Record<string, unknown> = {
      title: params.title,
      description: params.description ?? '',
      mode: params.mode ?? 'free',
      visibility,
      document: params.document as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    };

    let query = fromSpatialArtifacts(supabase)
      .update(updatePayload)
      .eq('id', params.id);

    // Scope the update — tenant-owned vs personal
    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId);
    } else {
      query = query.is('tenant_id', null).eq('created_by', user.id);
    }

    const { error } = await query;
    if (error) return { error: error.message };
    return { id: params.id };
  }

  // Insert new
  const { data, error } = await fromSpatialArtifacts(supabase)
    .insert({
      tenant_id: params.tenantId ?? null,
      created_by: user.id,
      title: params.title,
      description: params.description ?? '',
      mode: params.mode ?? 'free',
      visibility,
      document: params.document as Record<string, unknown>,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message ?? 'Insert failed' };
  return { id: data.id };
}

/**
 * List artifacts visible to the current user.
 * Returns tenant-owned + global-public + own private artifacts.
 * RLS enforces access — we add OR filters for index usage.
 *
 * @param tenantId  Active tenant (null/undefined = no tenant context)
 */
export async function listSpatialArtifacts(
  tenantId?: string | null,
): Promise<SpatialArtifactListItem[]> {
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = fromSpatialArtifacts(supabase)
    .select('id, title, description, mode, visibility, tenant_id, preview_url, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (tenantId) {
    // Tenant context: tenant-owned OR global-public OR own private
    query = query.or(
      `tenant_id.eq.${tenantId},and(tenant_id.is.null,visibility.eq.public),and(tenant_id.is.null,visibility.eq.private,created_by.eq.${user.id})`,
    );
  } else {
    // No tenant: global-public + own private
    query = query
      .is('tenant_id', null)
      .or(`visibility.eq.public,and(visibility.eq.private,created_by.eq.${user.id})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[spatial-artifacts] list error:', error.message);
    return [];
  }

  return (data ?? []) as SpatialArtifactListItem[];
}

/** Load a single artifact with full document payload */
export async function loadSpatialArtifact(
  artifactId: string,
): Promise<SpatialArtifactRow | null> {
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await fromSpatialArtifacts(supabase)
    .select('*')
    .eq('id', artifactId)
    .single();

  if (error || !data) return null;
  return data as unknown as SpatialArtifactRow;
}

/** Delete an artifact (RLS enforces ownership) */
export async function deleteSpatialArtifact(
  artifactId: string,
  tenantId?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  let query = fromSpatialArtifacts(supabase)
    .delete()
    .eq('id', artifactId);

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  // RLS handles the rest

  const { error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Preview image upload
// ---------------------------------------------------------------------------

const PREVIEW_BUCKET = 'spatial-previews';

/**
 * Upload a preview PNG for an artifact and persist the public URL.
 *
 * @param artifactId  UUID of the artifact
 * @param base64Png   PNG encoded as base64 data-URL or raw base64
 * @returns           The public URL, or an error
 */
export async function uploadArtifactPreview(
  artifactId: string,
  base64Png: string,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  // Strip optional data-URL prefix
  const raw = base64Png.replace(/^data:image\/png;base64,/, '');

  // Decode to Uint8Array (works in Node / Edge)
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));

  // Path convention: {artifactId}/preview.png (extensible for @2x, thumb, pdf later)
  const path = `${artifactId}/preview.png`;

  // Upload (upsert so re-saves overwrite)
  const { error: uploadError } = await supabase.storage
    .from(PREVIEW_BUCKET)
    .upload(path, bytes, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[spatial-artifacts] preview upload error:', uploadError.message);
    return { error: uploadError.message };
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(path);

  // Persist the URL on the artifact row
  const { error: updateError } = await fromSpatialArtifacts(supabase)
    .update({ preview_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', artifactId);

  if (updateError) {
    console.error('[spatial-artifacts] preview_url update error:', updateError.message);
    // Upload succeeded but DB update failed — URL is still usable
  }

  return { url: publicUrl };
}
