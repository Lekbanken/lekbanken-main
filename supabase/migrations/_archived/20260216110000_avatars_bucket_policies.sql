-- Ensure the "avatars" storage bucket exists (public reads).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (bucket is public, but explicit policy makes RLS happy)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own custom/ folder
DROP POLICY IF EXISTS "avatars_custom_insert" ON storage.objects;
CREATE POLICY "avatars_custom_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND (storage.filename(name)) = (auth.uid()::text || '.png')
  );

-- Authenticated users can overwrite their own custom file (upsert)
DROP POLICY IF EXISTS "avatars_custom_update" ON storage.objects;
CREATE POLICY "avatars_custom_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND (storage.filename(name)) = (auth.uid()::text || '.png')
  );
