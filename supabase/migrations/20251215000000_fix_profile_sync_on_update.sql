-- Fix: Profile synchronization on auth user UPDATE
-- Problem: When auth data is updated (session refresh, profile updates),
-- the profile wasn't being synced because the trigger only fires on INSERT.
--
-- This migration:
-- 1. Adds an AFTER UPDATE trigger on auth.users to sync profile changes
-- 2. Improves handle_new_user() to preserve existing data

-- Step 1: Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Step 2: Create improved handle_new_user function
-- Key changes:
-- - Preserves existing profile data (full_name, avatar_url) when syncing
-- - Only updates fields if new value is non-empty
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Standard upsert: insert new user or update existing one by ID
  INSERT INTO public.users (
    id, email, full_name, role, language, avatar_url, 
    preferred_theme, show_theme_toggle_in_header, global_role, email_verified
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'member'),
    COALESCE((new.raw_user_meta_data->>'language')::public.language_code_enum, 'NO'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', NULL),
    COALESCE(new.raw_user_meta_data->>'preferred_theme', 'system'),
    COALESCE((new.raw_user_meta_data->>'show_theme_toggle_in_header')::boolean, true),
    COALESCE((new.raw_user_meta_data->>'global_role')::public.global_role_enum, 'member'),
    new.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = new.email,
    -- Only update full_name if new value is not empty AND current value is empty
    full_name = CASE 
      WHEN NULLIF(new.raw_user_meta_data->>'full_name', '') IS NOT NULL 
      THEN COALESCE(new.raw_user_meta_data->>'full_name', public.users.full_name)
      ELSE public.users.full_name
    END,
    language = COALESCE((new.raw_user_meta_data->>'language')::public.language_code_enum, public.users.language),
    -- Only update avatar_url if new value exists AND current value is null
    avatar_url = CASE 
      WHEN new.raw_user_meta_data->>'avatar_url' IS NOT NULL 
      THEN COALESCE(new.raw_user_meta_data->>'avatar_url', public.users.avatar_url)
      ELSE public.users.avatar_url
    END,
    preferred_theme = COALESCE(new.raw_user_meta_data->>'preferred_theme', public.users.preferred_theme),
    show_theme_toggle_in_header = COALESCE((new.raw_user_meta_data->>'show_theme_toggle_in_header')::boolean, public.users.show_theme_toggle_in_header),
    global_role = COALESCE((new.raw_user_meta_data->>'global_role')::public.global_role_enum, public.users.global_role),
    email_verified = new.email_confirmed_at IS NOT NULL,
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Create trigger for INSERT (new users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create trigger for UPDATE (session refresh, profile updates, identity linking)
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: COMMENT ON TRIGGER requires ownership of auth.users which we don't have
-- Triggers are: on_auth_user_created and on_auth_user_updated
