-- Fix orphaned user profiles and ensure proper sync between auth.users and public.users
-- This migration:
-- 1. Updates public.users with mismatched IDs to use the correct auth.users ID
-- 2. Removes completely orphaned profiles (no matching auth user at all)
-- 3. Creates missing profiles for auth users that don't have one
-- 4. Improves the on_auth_user_created trigger to be more robust

-- ============================================
-- Step 1: Find and fix users where public.users.id != auth.users.id but email matches
-- ============================================
DO $$
DECLARE
  v_record RECORD;
  v_fixed_count INTEGER := 0;
BEGIN
  FOR v_record IN
    SELECT 
      pu.id as public_id,
      pu.email,
      au.id as auth_id,
      au.raw_user_meta_data->>'full_name' as auth_name
    FROM public.users pu
    JOIN auth.users au ON au.email = pu.email
    WHERE pu.id != au.id
  LOOP
    -- Check if the auth_id already exists in public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_record.auth_id) THEN
      -- Update the public user to use the correct auth ID
      UPDATE public.users 
      SET id = v_record.auth_id, updated_at = now()
      WHERE id = v_record.public_id;
      
      -- Also update memberships to point to new ID
      UPDATE public.user_tenant_memberships 
      SET user_id = v_record.auth_id
      WHERE user_id = v_record.public_id;
      
      v_fixed_count := v_fixed_count + 1;
      RAISE NOTICE 'Fixed user %: updated public ID from % to %', v_record.email, v_record.public_id, v_record.auth_id;
    ELSE
      -- Both IDs exist - this is a duplicate, mark the old one for deletion
      RAISE NOTICE 'Duplicate found for %: public ID % conflicts with existing auth ID %', v_record.email, v_record.public_id, v_record.auth_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Fixed % users with mismatched IDs', v_fixed_count;
END $$;

-- ============================================
-- Step 2: Remove completely orphaned profiles (no auth user exists)
-- ============================================
DELETE FROM public.users pu
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = pu.id
);

-- ============================================
-- Step 3: Create missing profiles for auth users
-- ============================================
INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  ),
  au.created_at,
  now()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Step 4: Improve the auth trigger to handle edge cases
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update the public.users row
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    NEW.created_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();
  
  -- If there was an orphaned profile with same email but different ID, migrate it
  -- (This handles the case where a user signs up, deletes account, and signs up again)
  UPDATE public.user_tenant_memberships
  SET user_id = NEW.id
  WHERE user_id IN (
    SELECT id FROM public.users 
    WHERE email = NEW.email AND id != NEW.id
  );
  
  -- Remove orphaned profiles with same email
  DELETE FROM public.users 
  WHERE email = NEW.email AND id != NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates (for when user changes email or profile via OAuth)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Syncs auth.users to public.users and cleans up orphaned profiles';
