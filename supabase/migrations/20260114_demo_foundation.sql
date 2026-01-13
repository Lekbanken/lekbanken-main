-- ============================================================================
-- Migration: Demo Foundation
-- Purpose: Add columns and tables required for demo functionality
-- Author: Demo Implementation Team
-- Date: 2026-01-14
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Extend Activities Table
-- Add is_demo_content flag for content curation
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activities'
        AND column_name = 'is_demo_content'
    ) THEN
        ALTER TABLE activities
        ADD COLUMN is_demo_content BOOLEAN DEFAULT false;

        RAISE NOTICE 'Added is_demo_content column to activities table';
    ELSE
        RAISE NOTICE 'Column is_demo_content already exists on activities table';
    END IF;
END $$;

-- Create index for efficient demo content queries
CREATE INDEX IF NOT EXISTS idx_activities_demo_content
ON activities(is_demo_content)
WHERE is_demo_content = true;

-- Add comment for documentation
COMMENT ON COLUMN activities.is_demo_content IS
'Indicates if this activity should be visible in demo mode. Only activities with this flag set to true are shown to demo users.';

-- ============================================================================
-- PART 2: Extend Profiles Table
-- Add demo user tracking columns
-- ============================================================================

DO $$
BEGIN
    -- Add is_demo_user column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'is_demo_user'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN is_demo_user BOOLEAN DEFAULT false;

        RAISE NOTICE 'Added is_demo_user column to profiles table';
    ELSE
        RAISE NOTICE 'Column is_demo_user already exists on profiles table';
    END IF;

    -- Add is_ephemeral column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'is_ephemeral'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN is_ephemeral BOOLEAN DEFAULT false;

        RAISE NOTICE 'Added is_ephemeral column to profiles table';
    ELSE
        RAISE NOTICE 'Column is_ephemeral already exists on profiles table';
    END IF;

    -- Add demo_last_used_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'demo_last_used_at'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN demo_last_used_at TIMESTAMPTZ;

        RAISE NOTICE 'Added demo_last_used_at column to profiles table';
    ELSE
        RAISE NOTICE 'Column demo_last_used_at already exists on profiles table';
    END IF;

    -- Add demo_session_count column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'demo_session_count'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN demo_session_count INTEGER DEFAULT 0;

        RAISE NOTICE 'Added demo_session_count column to profiles table';
    ELSE
        RAISE NOTICE 'Column demo_session_count already exists on profiles table';
    END IF;
END $$;

-- Create index for finding available demo users
CREATE INDEX IF NOT EXISTS idx_profiles_demo_users
ON profiles(is_demo_user, demo_last_used_at)
WHERE is_demo_user = true;

-- Create index for ephemeral users (for cleanup)
CREATE INDEX IF NOT EXISTS idx_profiles_ephemeral_users
ON profiles(is_ephemeral, created_at)
WHERE is_ephemeral = true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.is_demo_user IS
'Indicates if this profile is part of the demo user system (includes both pre-created pool and ephemeral users)';

COMMENT ON COLUMN profiles.is_ephemeral IS
'Indicates if this user was created on-demand for a demo session and should be auto-deleted after 24h';

COMMENT ON COLUMN profiles.demo_last_used_at IS
'Timestamp of when this demo user was last assigned to a demo session (for rotation logic)';

COMMENT ON COLUMN profiles.demo_session_count IS
'Total number of times this demo user has been used (for analytics)';

-- ============================================================================
-- PART 3: Create Demo Sessions Table
-- Track demo sessions for analytics and lifecycle management
-- ============================================================================

CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  demo_tier TEXT NOT NULL DEFAULT 'free' CHECK (demo_tier IN ('free', 'premium')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours'),
  ended_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  conversion_type TEXT CHECK (conversion_type IN ('signup', 'contact_sales', NULL)),
  conversion_plan TEXT,
  features_used JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for demo_sessions
CREATE INDEX IF NOT EXISTS idx_demo_sessions_user_id
ON demo_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_tenant_id
ON demo_sessions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires
ON demo_sessions(expires_at)
WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_demo_sessions_converted
ON demo_sessions(converted, created_at);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_ended
ON demo_sessions(ended_at)
WHERE ended_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_demo_sessions_tier
ON demo_sessions(demo_tier, created_at);

-- Enable RLS on demo_sessions
ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own demo sessions
DROP POLICY IF EXISTS "users_view_own_demo_sessions" ON demo_sessions;
CREATE POLICY "users_view_own_demo_sessions"
ON demo_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Service role has full access (for cleanup)
DROP POLICY IF EXISTS "service_role_full_demo_sessions_access" ON demo_sessions;
CREATE POLICY "service_role_full_demo_sessions_access"
ON demo_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments
COMMENT ON TABLE demo_sessions IS
'Tracks demo sessions for analytics, lifecycle management, and conversion tracking';

COMMENT ON COLUMN demo_sessions.demo_tier IS
'Tier of demo access: free (public self-service) or premium (sales-assisted)';

COMMENT ON COLUMN demo_sessions.features_used IS
'JSONB array of features used during demo session for analytics';

COMMENT ON COLUMN demo_sessions.conversion_type IS
'How the user converted: signup (self-service) or contact_sales (lead generation)';

-- ============================================================================
-- PART 4: Create Helper Functions
-- Functions for demo user management
-- ============================================================================

-- Function to track feature usage in demo session
CREATE OR REPLACE FUNCTION add_demo_feature_usage(
  session_id UUID,
  feature_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE demo_sessions
  SET
    features_used = features_used || jsonb_build_object(
      'feature', feature_name,
      'timestamp', now(),
      'iso_timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    updated_at = now()
  WHERE id = session_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_demo_feature_usage(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION add_demo_feature_usage IS
'Adds a feature usage event to a demo session for analytics tracking';

-- Function to mark demo session as converted
CREATE OR REPLACE FUNCTION mark_demo_session_converted(
  session_id UUID,
  conversion_type_param TEXT DEFAULT 'signup',
  conversion_plan_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE demo_sessions
  SET
    converted = true,
    conversion_type = conversion_type_param,
    conversion_plan = conversion_plan_param,
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
  WHERE id = session_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_demo_session_converted(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION mark_demo_session_converted IS
'Marks a demo session as successfully converted (signup or sales contact)';

-- Function to get current demo session
CREATE OR REPLACE FUNCTION get_current_demo_session_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Get most recent non-expired demo session for current user
  SELECT id INTO session_id
  FROM demo_sessions
  WHERE user_id = auth.uid()
    AND expires_at > now()
    AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN session_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_demo_session_id() TO authenticated;

COMMENT ON FUNCTION get_current_demo_session_id IS
'Returns the current active demo session ID for the authenticated user';

-- ============================================================================
-- PART 5: Create Trigger for Updated_at
-- Auto-update updated_at timestamp on demo_sessions
-- ============================================================================

CREATE OR REPLACE FUNCTION update_demo_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demo_sessions_updated_at ON demo_sessions;
CREATE TRIGGER demo_sessions_updated_at
BEFORE UPDATE ON demo_sessions
FOR EACH ROW
EXECUTE FUNCTION update_demo_sessions_updated_at();

-- ============================================================================
-- PART 6: Create Migration Log Table (if not exists)
-- For tracking migrations
-- ============================================================================

CREATE TABLE IF NOT EXISTS migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Log this migration
INSERT INTO migration_log (migration_name, executed_at, notes)
VALUES (
  '20260114_demo_foundation',
  now(),
  'Added demo foundation: is_demo_content on activities, demo tracking columns on profiles, demo_sessions table with RLS, helper functions'
)
ON CONFLICT (migration_name) DO UPDATE SET
  executed_at = now(),
  notes = EXCLUDED.notes;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  activities_col_count INTEGER;
  profiles_col_count INTEGER;
  sessions_table_exists BOOLEAN;
BEGIN
  -- Check activities columns
  SELECT COUNT(*) INTO activities_col_count
  FROM information_schema.columns
  WHERE table_name = 'activities'
    AND column_name IN ('is_demo_content');

  -- Check profiles columns
  SELECT COUNT(*) INTO profiles_col_count
  FROM information_schema.columns
  WHERE table_name = 'profiles'
    AND column_name IN ('is_demo_user', 'is_ephemeral', 'demo_last_used_at', 'demo_session_count');

  -- Check demo_sessions table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'demo_sessions'
  ) INTO sessions_table_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Foundation Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Activities columns added: %', activities_col_count;
  RAISE NOTICE 'Profiles columns added: %', profiles_col_count;
  RAISE NOTICE 'Demo_sessions table created: %', sessions_table_exists;
  RAISE NOTICE '========================================';

  IF activities_col_count < 1 THEN
    RAISE WARNING 'Missing is_demo_content column on activities';
  END IF;

  IF profiles_col_count < 4 THEN
    RAISE WARNING 'Missing demo tracking columns on profiles (expected 4, found %)', profiles_col_count;
  END IF;

  IF NOT sessions_table_exists THEN
    RAISE WARNING 'demo_sessions table was not created';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration:
/*
BEGIN;

-- Drop functions
DROP FUNCTION IF EXISTS add_demo_feature_usage(UUID, TEXT);
DROP FUNCTION IF EXISTS mark_demo_session_converted(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_current_demo_session_id();
DROP FUNCTION IF EXISTS update_demo_sessions_updated_at();

-- Drop trigger
DROP TRIGGER IF EXISTS demo_sessions_updated_at ON demo_sessions;

-- Drop table
DROP TABLE IF EXISTS demo_sessions CASCADE;

-- Remove columns from profiles
ALTER TABLE profiles
  DROP COLUMN IF EXISTS is_demo_user,
  DROP COLUMN IF EXISTS is_ephemeral,
  DROP COLUMN IF EXISTS demo_last_used_at,
  DROP COLUMN IF EXISTS demo_session_count;

-- Remove column from activities
ALTER TABLE activities
  DROP COLUMN IF EXISTS is_demo_content;

-- Remove from migration log
DELETE FROM migration_log WHERE migration_name = '20260114_demo_foundation';

COMMIT;
*/
