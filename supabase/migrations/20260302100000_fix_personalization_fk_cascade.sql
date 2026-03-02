-- ============================================================================
-- FIX: Duplicate FK constraints on personalization tables missing ON DELETE CASCADE
-- ============================================================================
-- The personalization_domain migration (20251129000013) created tables with BOTH
-- an inline FK (ON DELETE CASCADE) and a named CONSTRAINT fk_tenant (no cascade).
-- PostgreSQL enforces ALL constraints, so the non-cascade one blocks tenant deletion.
--
-- This migration drops the duplicate named constraints and re-adds them with CASCADE.
-- Also fixes translation_audit_log which has a bare FK without cascade.
-- ============================================================================

BEGIN;

-- user_preferences: drop duplicate fk_tenant, re-add with CASCADE
ALTER TABLE IF EXISTS public.user_preferences
  DROP CONSTRAINT IF EXISTS fk_tenant;
ALTER TABLE IF EXISTS public.user_preferences
  ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- saved_items
ALTER TABLE IF EXISTS public.saved_items
  DROP CONSTRAINT IF EXISTS fk_tenant;
ALTER TABLE IF EXISTS public.saved_items
  ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- personalization_events
ALTER TABLE IF EXISTS public.personalization_events
  DROP CONSTRAINT IF EXISTS fk_tenant;
ALTER TABLE IF EXISTS public.personalization_events
  ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- recommendation_history
ALTER TABLE IF EXISTS public.recommendation_history
  DROP CONSTRAINT IF EXISTS fk_tenant;
ALTER TABLE IF EXISTS public.recommendation_history
  ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- interest_profiles
ALTER TABLE IF EXISTS public.interest_profiles
  DROP CONSTRAINT IF EXISTS fk_tenant;
ALTER TABLE IF EXISTS public.interest_profiles
  ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- content_preferences
ALTER TABLE IF EXISTS public.content_preferences
  DROP CONSTRAINT IF EXISTS fk_tenant;
ALTER TABLE IF EXISTS public.content_preferences
  ADD CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- translation_audit_log: tenant_id REFERENCES tenants(id) without any ON DELETE
ALTER TABLE IF EXISTS public.translation_audit_log
  DROP CONSTRAINT IF EXISTS translation_audit_log_tenant_id_fkey;
ALTER TABLE IF EXISTS public.translation_audit_log
  ADD CONSTRAINT translation_audit_log_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

COMMIT;
