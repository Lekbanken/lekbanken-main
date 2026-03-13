-- ============================================================================
-- Migration: Fix achievements_scope_tenant_check constraint
-- Purpose: The constraint was checking scope_tenant_id which is a GENERATED column
--          that uses a sentinel UUID for NULL tenant_id. We need to check tenant_id instead.
-- ============================================================================

-- Drop the old constraint that incorrectly checks scope_tenant_id
ALTER TABLE public.achievements
  DROP CONSTRAINT IF EXISTS achievements_scope_tenant_check;

-- Create a new constraint that checks tenant_id (the actual source column)
-- scope_tenant_id is GENERATED ALWAYS AS (COALESCE(tenant_id, sentinel)) so we can't check it directly
ALTER TABLE public.achievements
  ADD CONSTRAINT achievements_scope_tenant_check
    CHECK (
      (scope = 'global' AND tenant_id IS NULL) OR
      (scope = 'tenant' AND tenant_id IS NOT NULL) OR
      (scope = 'private') -- Private scope can have any tenant_id
    ) NOT VALID;

-- Note: 'private' achievements are user-specific and don't require tenant association
-- They may optionally have a tenant_id if they're private within a tenant context
