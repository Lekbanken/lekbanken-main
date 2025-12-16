-- Fix RLS policy to allow admins to read all games (including drafts)
-- This is needed for the admin panel and CSV import functionality

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "admins_can_read_all_games" ON games;

-- Create policy for admins to read all games
-- Admins (system_admin, superadmin, admin) can read all games regardless of status or owner
CREATE POLICY "admins_can_read_all_games"
ON games FOR SELECT
USING (
  -- System admins, superadmins and admins can read all games
  (auth.jwt() ->> 'role') IN ('system_admin', 'superadmin', 'admin')
  OR 
  -- Also check app_metadata for role (some auth flows use this)
  ((auth.jwt() -> 'app_metadata') ->> 'role') IN ('system_admin', 'superadmin', 'admin')
);
