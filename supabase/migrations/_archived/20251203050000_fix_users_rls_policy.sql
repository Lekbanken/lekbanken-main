-- Fix RLS policy on users table to allow users to read their own profile
-- The current policy has a circular dependency issue

-- Drop the existing policy
DROP POLICY IF EXISTS "tenant_members_can_select_users" ON users;

-- Create a simpler policy: users can always read their own row
CREATE POLICY "users_can_select_own"
ON users FOR SELECT
USING (id = auth.uid());

-- Separate policy for tenant members to see each other
CREATE POLICY "tenant_members_can_select_each_other"
ON users FOR SELECT
USING (
  id IN (
    SELECT user_id FROM user_tenant_memberships
    WHERE tenant_id = ANY(get_user_tenant_ids())
  )
);

-- Verify the admin user exists and has correct data
DO $$
DECLARE
  admin_record RECORD;
BEGIN
  SELECT id, email, role INTO admin_record
  FROM public.users
  WHERE email = 'admin@lekbanken.no';
  
  IF admin_record.id IS NOT NULL THEN
    RAISE NOTICE 'Admin user found: id=%, email=%, role=%', 
      admin_record.id, admin_record.email, admin_record.role;
  ELSE
    RAISE WARNING 'Admin user NOT found in public.users!';
  END IF;
END $$;
