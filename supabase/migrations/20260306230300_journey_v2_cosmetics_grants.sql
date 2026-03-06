-- Journey v2.0 Steg 3: Grant table permissions for cosmetics tables
--
-- Migration 20260220232000_default_privileges_hardening.sql revoked default
-- privileges on new tables. The cosmetics tables created in 20260306230100
-- therefore need explicit GRANTs so that the `authenticated` role can access
-- them through RLS policies.
--
-- Service role (used by grant flows and admin) already has access via
-- the built-in supabase service_role permissions.

-- =============================================================================
-- 1. cosmetics (catalog) — read-only for authenticated users
-- =============================================================================
GRANT SELECT ON public.cosmetics TO authenticated;

-- =============================================================================
-- 2. cosmetic_unlock_rules — read-only for authenticated users
-- =============================================================================
GRANT SELECT ON public.cosmetic_unlock_rules TO authenticated;

-- =============================================================================
-- 3. user_cosmetics (ownership) — read-only via RLS for own rows
--    INSERT/DELETE handled by service role (grant flows), not user clients.
-- =============================================================================
GRANT SELECT ON public.user_cosmetics TO authenticated;

-- =============================================================================
-- 4. user_cosmetic_loadout — full CRUD for own rows via RLS
--    Users equip/unequip via the API which uses RLS client (not service role).
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_cosmetic_loadout TO authenticated;
