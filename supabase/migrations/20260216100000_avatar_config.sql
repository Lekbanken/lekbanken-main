-- Avatar Builder config storage
-- Stores the layered avatar configuration JSON so users can re-edit their
-- custom avatar on any device. The rendered PNG is stored in Supabase Storage
-- at avatars/custom/{userId}.png and referenced via the existing avatar_url column.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_config jsonb,
  ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;

COMMENT ON COLUMN public.users.avatar_config IS 'Avatar Builder v2 layer configuration JSON. Null when using a preset avatar.';
COMMENT ON COLUMN public.users.avatar_updated_at IS 'Timestamp of last avatar change (preset or custom).';
