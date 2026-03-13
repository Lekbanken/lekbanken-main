-- ============================================================================
-- Migration: Fix achievements_scope_tenant_check constraint v2
-- Purpose: The previous constraint checked scope_tenant_id which is a GENERATED column.
--          scope_tenant_id uses COALESCE(tenant_id, sentinel_uuid) so it's NEVER null.
--          We need to check tenant_id instead.
-- ============================================================================

-- Drop the old constraint
ALTER TABLE public.achievements
  DROP CONSTRAINT IF EXISTS achievements_scope_tenant_check;

-- Create constraint that checks tenant_id (the actual source column, not the generated one)
ALTER TABLE public.achievements
  ADD CONSTRAINT achievements_scope_tenant_check
    CHECK (
      (scope = 'global' AND tenant_id IS NULL) OR
      (scope = 'tenant' AND tenant_id IS NOT NULL) OR
      (scope = 'private') -- Private scope allows any tenant_id value
    ) NOT VALID;
