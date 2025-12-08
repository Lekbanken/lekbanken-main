-- Fix RLS policy to allow reading published global games
-- The existing policy requires get_user_tenant_ids() which can fail for some auth states

-- Drop the existing policy
DROP POLICY IF EXISTS "users_can_select_games" ON games;

-- Create a simpler policy that allows:
-- 1. Anyone (including anon) to read published games with no owner
-- 2. Authenticated users to read games from their tenants
CREATE POLICY "anyone_can_read_published_global_games"
ON games FOR SELECT
USING (
  -- Published global games are readable by everyone
  (owner_tenant_id IS NULL AND status = 'published')
);

CREATE POLICY "authenticated_can_read_tenant_games"
ON games FOR SELECT
USING (
  -- Authenticated users can read games from their tenants
  auth.role() = 'authenticated' 
  AND owner_tenant_id = ANY(get_user_tenant_ids())
);
