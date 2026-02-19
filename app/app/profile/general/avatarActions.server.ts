'use server';

import { createServerRlsClient } from '@/lib/supabase/server';

/**
 * Upload a custom avatar PNG to Supabase Storage.
 * Overwrites any previous custom avatar for the user.
 *
 * Returns the public URL (with cache-busting query param).
 */
export async function uploadCustomAvatar(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
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

  // Upload with upsert so it always overwrites the existing file
  const { error: uploadError } = await supabase.storage
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
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(storagePath);

  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  return { url: publicUrl };
}
