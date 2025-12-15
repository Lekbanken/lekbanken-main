-- Diagnostic queries for profile sync issues
-- Run these queries in Supabase SQL Editor to diagnose the problem

-- ============================================
-- 1. Check for multiple auth users with same email
-- ============================================
SELECT 
  email, 
  COUNT(*) as count,
  array_agg(id) as auth_user_ids
FROM auth.users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- ============================================
-- 2. Check for auth users without matching public.users row
-- These users will have profile issues after refresh
-- ============================================
SELECT 
  au.id as auth_user_id, 
  au.email,
  au.created_at as auth_created,
  au.raw_user_meta_data->>'full_name' as meta_name,
  u.id as public_user_id,
  u.full_name as profile_name
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

-- ============================================
-- 3. Check for public.users with orphaned/mismatched auth users
-- ============================================
SELECT 
  u.id as public_user_id, 
  u.email,
  u.full_name,
  u.avatar_url,
  au.id as auth_user_id
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
WHERE au.id IS NULL;

-- ============================================
-- 4. Specific check for johan@formgiver.no
-- ============================================
SELECT 
  'auth.users' as source,
  id,
  email,
  created_at,
  raw_user_meta_data->>'full_name' as name,
  raw_user_meta_data->>'avatar_url' as avatar
FROM auth.users 
WHERE email = 'johan@formgiver.no'

UNION ALL

SELECT 
  'public.users' as source,
  id,
  email,
  created_at,
  full_name as name,
  avatar_url as avatar
FROM public.users 
WHERE email = 'johan@formgiver.no';

-- ============================================
-- 5. Check auth identities (for OAuth linking issues)
-- ============================================
SELECT 
  au.email,
  au.id as auth_user_id,
  i.provider,
  i.id as identity_id,
  i.created_at as identity_created
FROM auth.users au
JOIN auth.identities i ON i.user_id = au.id
WHERE au.email = 'johan@formgiver.no'
ORDER BY i.created_at;

-- ============================================
-- 6. Fix: Manually sync a specific user (if needed)
-- Uncomment and run if you need to manually fix johan@formgiver.no
-- ============================================
/*
DO $$
DECLARE
  v_auth_user RECORD;
BEGIN
  -- Get the most recent auth user for this email
  SELECT * INTO v_auth_user
  FROM auth.users
  WHERE email = 'johan@formgiver.no'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_auth_user IS NOT NULL THEN
    -- Update public.users to match auth user ID
    UPDATE public.users
    SET 
      id = v_auth_user.id,
      updated_at = now()
    WHERE email = 'johan@formgiver.no' AND id != v_auth_user.id;
    
    -- Also update memberships if needed
    UPDATE public.user_tenant_memberships
    SET user_id = v_auth_user.id
    WHERE user_id IN (
      SELECT id FROM public.users WHERE email = 'johan@formgiver.no' AND id != v_auth_user.id
    );
    
    RAISE NOTICE 'Updated user % to auth ID %', 'johan@formgiver.no', v_auth_user.id;
  END IF;
END $$;
*/
