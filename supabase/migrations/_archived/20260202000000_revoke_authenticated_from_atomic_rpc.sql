-- =============================================================================
-- Migration: 20260202000000_revoke_authenticated_from_atomic_rpc.sql
-- Purpose: Security hardening - remove authenticated grant from upsert RPC
--
-- Reason:
--   The upsert_game_content_v1 function should ONLY be callable via service_role.
--   The CSV import route uses createServiceRoleClient(), so this is safe.
--   Removing authenticated grant prevents any logged-in user from calling
--   the RPC directly, even if the SQL auth guard would reject them.
--
-- Defense in depth:
--   1. GRANT: Only service_role can execute
--   2. SQL guard: Checks auth.uid() OR service_role JWT
--   3. Tenant guard: expected_tenant_id must match owner_tenant_id
-- =============================================================================

-- Remove public's default execute (if any)
revoke all on function public.upsert_game_content_v1(jsonb) from public;

-- Remove authenticated role's execute permission
revoke execute on function public.upsert_game_content_v1(jsonb) from authenticated;

-- Ensure only service_role can execute
grant execute on function public.upsert_game_content_v1(jsonb) to service_role;

comment on function public.upsert_game_content_v1(jsonb)
  is 'Atomic game content upsert (v1). All-or-nothing via subtransaction. RESTRICTED: service_role only.';
