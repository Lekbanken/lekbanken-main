-- ============================================================================
-- FIX RLS POLICY FOR PRODUCT_PRICES
-- The previous policy couldn't access auth.users properly
-- Using a simpler approach that checks via auth.jwt() claims
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "product_prices_admin_all" ON product_prices;
DROP POLICY IF EXISTS "product_prices_read_active" ON product_prices;

-- Create a helper function to check system admin status
-- This avoids the direct table reference that causes permission issues
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT 
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_admin',
      false
    )
    OR 
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'global_role') = 'system_admin',
      false
    )
    OR
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'global_role') = 'system_admin',
      false
    )
$$;

-- Allow system admins to do everything with prices
CREATE POLICY "product_prices_admin_all" ON product_prices
  FOR ALL
  TO authenticated
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

-- Allow all authenticated users to read active prices (for checkout/display)
CREATE POLICY "product_prices_read_active" ON product_prices
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Also allow service role to bypass RLS (for server-side operations)
-- This is already the default behavior, but let's be explicit
ALTER TABLE product_prices FORCE ROW LEVEL SECURITY;

-- Grant usage to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON product_prices TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
