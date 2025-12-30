-- Create private buckets for artifact media (enterprise: store refs, serve via signed URLs)
-- Buckets: media-images, media-audio

-- Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-images', 'media-images', FALSE)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('media-audio', 'media-audio', FALSE)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

-- RLS policies for authenticated app users.
-- Note: These policies are intentionally minimal to unblock Sandbox/Admin uploads.
--       Tighten later (e.g., tenant scoping, path constraints) when tenant auth claims are finalized.

-- media-images
DROP POLICY IF EXISTS "media_images_authenticated_read" ON storage.objects;
CREATE POLICY "media_images_authenticated_read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'media-images');

DROP POLICY IF EXISTS "media_images_authenticated_insert" ON storage.objects;
CREATE POLICY "media_images_authenticated_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media-images');

DROP POLICY IF EXISTS "media_images_authenticated_update" ON storage.objects;
CREATE POLICY "media_images_authenticated_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'media-images')
WITH CHECK (bucket_id = 'media-images');

DROP POLICY IF EXISTS "media_images_authenticated_delete" ON storage.objects;
CREATE POLICY "media_images_authenticated_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'media-images');

-- media-audio
DROP POLICY IF EXISTS "media_audio_authenticated_read" ON storage.objects;
CREATE POLICY "media_audio_authenticated_read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'media-audio');

DROP POLICY IF EXISTS "media_audio_authenticated_insert" ON storage.objects;
CREATE POLICY "media_audio_authenticated_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media-audio');

DROP POLICY IF EXISTS "media_audio_authenticated_update" ON storage.objects;
CREATE POLICY "media_audio_authenticated_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'media-audio')
WITH CHECK (bucket_id = 'media-audio');

DROP POLICY IF EXISTS "media_audio_authenticated_delete" ON storage.objects;
CREATE POLICY "media_audio_authenticated_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'media-audio');
