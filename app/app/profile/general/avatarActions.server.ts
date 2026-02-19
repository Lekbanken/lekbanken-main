'use server';

import { createServerRlsClient, supabaseAdmin } from '@/lib/supabase/server';

/**
 * Upload a custom avatar PNG to Supabase Storage.
 * Overwrites any previous custom avatar for the user.
 *
 * Uses supabaseAdmin for the storage upload because the avatars bucket
 * has no DELETE policy, and Supabase upsert internally does delete+insert.
 * Auth is validated via the RLS client first.
 *
 * Returns the public URL (with cache-busting query param).
 */
export async function uploadCustomAvatar(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  // Authenticate via RLS client (uses request cookies)
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const blob = formData.get('file') as File | null;
  if (!blob || blob.size === 0) {
    return { error: 'No file provided' };
  }

  if (blob.size > 5 * 1024 * 1024) {
    return { error: 'File too large (max 5 MB)' };
  }

  const storagePath = `custom/${user.id}.png`;

  // Use admin client for storage — the bucket lacks a DELETE policy,
  // and Supabase upsert does delete+insert internally which fails with RLS.
  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(storagePath, blob, {
      upsert: true,
      contentType: 'image/png',
    });

  if (uploadError) {
    console.error('[uploadCustomAvatar] Storage upload failed:', uploadError);
    return { error: uploadError.message || 'Upload failed' };
  }

  // Build public URL with cache-busting
  const { data: urlData } = supabaseAdmin.storage
    .from('avatars')
    .getPublicUrl(storagePath);

  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  return { url: publicUrl };
}
