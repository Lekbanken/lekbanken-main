-- ============================================================================
-- FIX: ticket_routing_rules.match_tenant_id FK missing ON DELETE clause
-- ============================================================================
-- The match_tenant_id column references tenants(id) without ON DELETE,
-- defaulting to RESTRICT/NO ACTION, which blocks tenant deletion.
-- Since match_tenant_id is a nullable filter condition ("NULL = match any"),
-- SET NULL is the correct behavior when the referenced tenant is deleted.
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.ticket_routing_rules
  DROP CONSTRAINT IF EXISTS ticket_routing_rules_match_tenant_id_fkey;

ALTER TABLE IF EXISTS public.ticket_routing_rules
  ADD CONSTRAINT ticket_routing_rules_match_tenant_id_fkey
    FOREIGN KEY (match_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

COMMIT;
