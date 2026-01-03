# Tenant/Membership Naming Consolidation

## Summary
- Canonical table: `user_tenant_memberships`
- Compatibility view: `tenant_memberships`
- Goal: remove ambiguity in RLS/policies/functions and align types with actual schema.

## Current mismatches

### Migrations referencing `tenant_memberships`
- `supabase/migrations/20251209120000_accounts_domain.sql` (normalizes table/view but may choose either)
- `supabase/migrations/20251209103000_tenant_rls_hardening.sql` (policies written on view)
- `supabase/migrations/20251209100000_tenant_domain.sql` (ALTER TABLE on `tenant_memberships`)
- `supabase/migrations/20251228120000_game_snapshots.sql` (RLS uses `tenant_memberships`)

### Code references
- `app/api/plans/[planId]/publish/route.ts` now uses `.from('user_tenant_memberships')` (fixed).
- All other runtime code already uses `user_tenant_memberships`.

### Types mismatch
- `types/supabase.ts` and `lib/supabase/database.types.ts` now model:
  - `user_tenant_memberships` as a table
  - `tenant_memberships` as a view
- `types/tenant.ts` now uses `Database['public']['Tables']['user_tenant_memberships']`.

## RLS/policy issues to fix
- Policies in `20251209103000_tenant_rls_hardening.sql` target a view and use `tenant_memberships` in subqueries.
- Game snapshot policies reference `tenant_memberships` instead of the canonical table.
- System admin bypass policies exist in later migrations but do not guarantee the view/table ambiguity is resolved.

## Consolidation plan
1. Ensure `user_tenant_memberships` is the physical table.
2. Ensure `tenant_memberships` is a view over `user_tenant_memberships` with DML rules.
3. Recreate `is_tenant_member`, `get_user_tenant_ids`, `has_tenant_role` to target the canonical table and honor `is_system_admin()`.
4. Recreate RLS policies that referenced `tenant_memberships` to use `user_tenant_memberships` (or helper functions).
5. Update Supabase types to align with the canonical table and adjust `types/tenant.ts`.

## Implementation status
- Done:
  - Migration: `supabase/migrations/20260104120000_consolidate_tenant_naming.sql` ✅
  - Code: All TypeScript code uses `user_tenant_memberships` (canonical table)
  - Types: `types/supabase.ts`, `lib/supabase/database.types.ts`, `types/tenant.ts` aligned
  - RLS: `is_system_admin()` bypass on users, tenants, user_tenant_memberships
  - Functions: `is_tenant_member`, `get_user_tenant_ids`, `has_tenant_role` use canonical table
- Remaining:
  - Run `npx supabase db push --include-all` to apply migration
  - Run the test plan below (admin access + Playwright)

## Test plan
1. Run the Supabase SQL audit queries from the prompt (tables/views/policies/functions).
2. As `system_admin`, verify access to:
   - `/admin/organisations`
   - `/admin/users`
   - `/admin/licenses`
3. Run Playwright:
   - `npx playwright test tests/e2e/admin-auth.spec.ts`
