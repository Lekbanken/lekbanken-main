-- =============================================================================
-- CLEANUP USER METADATA - Reduce JWT Token Size
-- =============================================================================
-- 
-- PURPOSE:
-- Remove redundant fields from auth.users.raw_user_meta_data to reduce JWT 
-- token size and prevent cookie chunking (.0, .1 cookies).
--
-- FIELDS TO REMOVE:
-- - avatar_url (stored in public.users and user_profiles)
-- - language (stored in public.users)
-- - preferred_theme (stored in public.users)
-- - show_theme_toggle_in_header (stored in public.users)
--
-- FIELDS TO KEEP:
-- - full_name (used in RLS policies)
-- - name (OAuth provider data)
-- - picture (OAuth provider data - fallback for avatar)
-- - global_role (used in RLS policies)
-- - is_demo_user (used in RLS policies)
-- - email_verified, email (OAuth data)
-- - provider, sub (OAuth identifiers)
--
-- SAFETY:
-- - This script is idempotent (safe to run multiple times)
-- - Creates a backup of affected metadata before cleaning
-- - Only modifies users that have the redundant fields
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- =============================================================================

-- Step 1: Preview what will be cleaned (DRY RUN)
-- Uncomment the SELECT below to see affected users before running the UPDATE

/*
SELECT 
  id,
  email,
  raw_user_meta_data->>'avatar_url' as avatar_url,
  raw_user_meta_data->>'language' as language,
  raw_user_meta_data->>'preferred_theme' as preferred_theme,
  raw_user_meta_data->>'show_theme_toggle_in_header' as show_theme_toggle,
  pg_column_size(raw_user_meta_data) as metadata_bytes
FROM auth.users
WHERE 
  raw_user_meta_data ? 'avatar_url' OR
  raw_user_meta_data ? 'language' OR
  raw_user_meta_data ? 'preferred_theme' OR
  raw_user_meta_data ? 'show_theme_toggle_in_header'
ORDER BY pg_column_size(raw_user_meta_data) DESC
LIMIT 50;
*/

-- Step 2: Create backup table (run once)
CREATE TABLE IF NOT EXISTS public.user_metadata_backup (
  id uuid PRIMARY KEY,
  email text,
  original_metadata jsonb,
  cleaned_at timestamptz DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.user_metadata_backup IS 
  'Backup of user_metadata before cleanup to reduce JWT size. Created 2026-01-31.';

-- Step 3: Backup affected users
INSERT INTO public.user_metadata_backup (id, email, original_metadata)
SELECT 
  id,
  email,
  raw_user_meta_data
FROM auth.users
WHERE 
  (raw_user_meta_data ? 'avatar_url' OR
   raw_user_meta_data ? 'language' OR
   raw_user_meta_data ? 'preferred_theme' OR
   raw_user_meta_data ? 'show_theme_toggle_in_header')
  AND id NOT IN (SELECT id FROM public.user_metadata_backup)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Remove redundant fields from user_metadata
-- This uses JSONB operators to remove specific keys while preserving others
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data 
  - 'avatar_url' 
  - 'language' 
  - 'preferred_theme' 
  - 'show_theme_toggle_in_header'
WHERE 
  raw_user_meta_data ? 'avatar_url' OR
  raw_user_meta_data ? 'language' OR
  raw_user_meta_data ? 'preferred_theme' OR
  raw_user_meta_data ? 'show_theme_toggle_in_header';

-- Step 5: Report results
SELECT 
  'Cleanup complete' as status,
  (SELECT COUNT(*) FROM public.user_metadata_backup) as users_backed_up,
  (SELECT COUNT(*) FROM auth.users 
   WHERE raw_user_meta_data ? 'avatar_url' 
      OR raw_user_meta_data ? 'language'
      OR raw_user_meta_data ? 'preferred_theme'
      OR raw_user_meta_data ? 'show_theme_toggle_in_header'
  ) as users_still_with_redundant_fields;

-- Step 6: Verify token size reduction
-- Run this after cleanup to see the improvement
SELECT 
  'Token size analysis' as report,
  COUNT(*) as total_users,
  AVG(pg_column_size(raw_user_meta_data))::int as avg_metadata_bytes,
  MAX(pg_column_size(raw_user_meta_data)) as max_metadata_bytes,
  MIN(pg_column_size(raw_user_meta_data)) as min_metadata_bytes
FROM auth.users;

-- =============================================================================
-- NOTES:
-- 
-- After running this script:
-- 1. Users will get smaller JWT tokens on next login/token refresh
-- 2. Tokens should fit in single cookie (no more .0, .1 chunking)
-- 3. "Invalid Refresh Token" errors should decrease significantly
--
-- To restore a specific user's metadata (if needed):
-- UPDATE auth.users u
-- SET raw_user_meta_data = b.original_metadata
-- FROM public.user_metadata_backup b
-- WHERE u.id = b.id AND u.id = 'USER_UUID_HERE';
--
-- To drop backup table after confirming everything works (wait ~1 week):
-- DROP TABLE public.user_metadata_backup;
-- =============================================================================
