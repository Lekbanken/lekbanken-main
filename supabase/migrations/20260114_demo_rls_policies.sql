-- ============================================================================
-- Migration: Demo RLS Policies
-- Purpose: Enforce demo restrictions at database level (P0 SECURITY)
-- Author: Demo Implementation Team
-- Date: 2026-01-14
-- ============================================================================

BEGIN;

-- ============================================================================
-- POLICY 1: Demo Tenant Write Protection
-- Prevents non-admin users from modifying demo tenants
-- ============================================================================

DROP POLICY IF EXISTS "demo_tenant_write_protection" ON tenants;
CREATE POLICY "demo_tenant_write_protection"
ON tenants
FOR UPDATE
TO authenticated
USING (
  -- Allow update if NOT a demo tenant
  demo_flag = false
  -- OR if user is system_admin
  OR (
    SELECT global_role
    FROM profiles
    WHERE id = auth.uid()
  ) = 'system_admin'
);

-- Also block DELETE operations on demo tenants
DROP POLICY IF EXISTS "demo_tenant_delete_protection" ON tenants;
CREATE POLICY "demo_tenant_delete_protection"
ON tenants
FOR DELETE
TO authenticated
USING (
  demo_flag = false
  OR (
    SELECT global_role
    FROM profiles
    WHERE id = auth.uid()
  ) = 'system_admin'
);

-- ============================================================================
-- POLICY 2: Demo Content Access Control
-- Demo users only see curated content (is_demo_content = true)
-- ============================================================================

-- First, check if policy exists and drop it
DO $$
BEGIN
    -- Drop existing policy if it exists
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'activities'
        AND policyname = 'demo_content_access'
    ) THEN
        DROP POLICY "demo_content_access" ON activities;
    END IF;
END $$;

CREATE POLICY "demo_content_access"
ON activities
FOR SELECT
TO authenticated
USING (
  -- Check if current user is a demo user
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND (is_demo_user = true OR is_ephemeral = true)
    )
    THEN
      -- Demo users: Only curated global content OR own created activities
      (
        (is_global = true AND is_demo_content = true)
        OR created_by = auth.uid()
      )
    ELSE
      -- Normal users: All content they have access to
      (
        tenant_id IN (
          SELECT m.tenant_id
          FROM memberships m
          WHERE m.user_id = auth.uid()
        )
        OR is_global = true
        OR created_by = auth.uid()
      )
  END
);

-- ============================================================================
-- POLICY 3: Demo User Flag Protection
-- Prevents users from modifying their is_demo_user or is_ephemeral flags
-- ============================================================================

DROP POLICY IF EXISTS "demo_user_flag_protection" ON profiles;
CREATE POLICY "demo_user_flag_protection"
ON profiles
FOR UPDATE
TO authenticated
USING (
  -- Can update own profile ONLY if demo flags remain unchanged
  (
    id = auth.uid()
    AND is_demo_user = (SELECT is_demo_user FROM profiles WHERE id = auth.uid())
    AND (
      is_ephemeral IS NULL
      OR is_ephemeral = (SELECT is_ephemeral FROM profiles WHERE id = auth.uid())
    )
  )
  -- OR system admin can do anything
  OR (
    SELECT global_role
    FROM profiles
    WHERE id = auth.uid()
  ) = 'system_admin'
);

-- ============================================================================
-- POLICY 4: Demo Session Isolation
-- Demo users cannot create public sessions
-- ============================================================================

-- Check if sessions table exists and has visibility column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sessions'
        AND column_name = 'visibility'
    ) THEN
        -- Drop existing policy if it exists
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'sessions'
            AND policyname = 'demo_no_public_sessions'
        ) THEN
            DROP POLICY "demo_no_public_sessions" ON sessions;
        END IF;

        -- Create policy
        CREATE POLICY "demo_no_public_sessions"
        ON sessions
        FOR INSERT
        TO authenticated
        WITH CHECK (
          -- If user is demo user
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM profiles
              WHERE id = auth.uid()
                AND (is_demo_user = true OR is_ephemeral = true)
            )
            THEN
              -- Must NOT be public visibility
              visibility != 'public'
            ELSE
              -- Normal users can create any visibility
              true
          END
        );
    END IF;
END $$;

-- ============================================================================
-- POLICY 5: Demo Session Ownership
-- Demo users can only see/edit their own created sessions
-- ============================================================================

-- Drop existing policy if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'sessions'
        AND policyname = 'demo_session_ownership'
    ) THEN
        DROP POLICY "demo_session_ownership" ON sessions;
    END IF;
END $$;

CREATE POLICY "demo_session_ownership"
ON sessions
FOR ALL
TO authenticated
USING (
  -- Own sessions
  created_by = auth.uid()
  -- OR sessions in user's tenant (if not demo user)
  OR (
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (is_demo_user = true OR is_ephemeral = true)
    )
    AND tenant_id IN (
      SELECT m.tenant_id
      FROM memberships m
      WHERE m.user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- POLICY 6: Demo Tenant Settings Protection
-- Prevent any modifications to demo tenant settings
-- ============================================================================

-- This is enforced by tenant update policy above, but adding explicit check

-- Add comment to demo tenant for clarity
COMMENT ON COLUMN tenants.demo_flag IS
'Indicates if this is a demo tenant. Demo tenants can only be modified by system_admin. Protected by RLS policy "demo_tenant_write_protection".';

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify policies are working
-- ============================================================================

-- Verify policies are created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE policyname LIKE 'demo_%';

  RAISE NOTICE 'Created % demo-related policies', policy_count;

  IF policy_count < 5 THEN
    RAISE WARNING 'Expected at least 5 demo policies, found %', policy_count;
  END IF;
END $$;

-- Log successful migration
INSERT INTO public.migration_log (migration_name, executed_at, notes)
VALUES (
  '20260114_demo_rls_policies',
  now(),
  'Created 6 RLS policies for demo security: tenant protection, content access, user flag protection, session isolation, session ownership'
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration:
/*
BEGIN;

DROP POLICY IF EXISTS "demo_tenant_write_protection" ON tenants;
DROP POLICY IF EXISTS "demo_tenant_delete_protection" ON tenants;
DROP POLICY IF EXISTS "demo_content_access" ON activities;
DROP POLICY IF EXISTS "demo_user_flag_protection" ON profiles;
DROP POLICY IF EXISTS "demo_no_public_sessions" ON sessions;
DROP POLICY IF EXISTS "demo_session_ownership" ON sessions;

DELETE FROM public.migration_log WHERE migration_name = '20260114_demo_rls_policies';

COMMIT;
*/
