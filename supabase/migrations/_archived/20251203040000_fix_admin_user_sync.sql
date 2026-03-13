-- Fix: Ensure admin@lekbanken.no exists in public.users with correct id from auth.users
-- The trigger may not have fired or the user was created before the trigger existed

-- Insert or update the user in public.users based on auth.users data
INSERT INTO public.users (id, email, full_name, role, language)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'Admin'),
  'superadmin',
  'NO'
FROM auth.users au
WHERE au.email = 'admin@lekbanken.no'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = 'superadmin',
  updated_at = now();

-- Also ensure tenant membership exists
INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, is_primary)
SELECT 
  au.id,
  '00000000-0000-0000-0000-000000000001',
  'owner',
  true
FROM auth.users au
WHERE au.email = 'admin@lekbanken.no'
ON CONFLICT (user_id, tenant_id) DO UPDATE SET
  role = 'owner',
  is_primary = true,
  updated_at = now();

-- Verify
DO $$
DECLARE
  user_count int;
  membership_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users WHERE email = 'admin@lekbanken.no';
  SELECT COUNT(*) INTO membership_count FROM public.user_tenant_memberships m 
    JOIN public.users u ON u.id = m.user_id 
    WHERE u.email = 'admin@lekbanken.no';
  
  RAISE NOTICE 'Admin user records: %, memberships: %', user_count, membership_count;
END $$;
