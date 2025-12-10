-- Migrate achievements to use media table
-- Replaces icon_url text field with icon_media_id FK

-- 1) Add new column
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS icon_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL;

-- 2) Create index
CREATE INDEX IF NOT EXISTS idx_achievements_icon_media ON public.achievements(icon_media_id);

-- 3) Optionally migrate existing icon_url values to media table (manual or via script)
-- This requires external images to be uploaded to media table first
-- For now, we just add the column and keep icon_url for backward compatibility

-- 4) Comment the deprecated field
COMMENT ON COLUMN public.achievements.icon_url IS 'DEPRECATED: Use icon_media_id instead. Will be removed after data migration.';
