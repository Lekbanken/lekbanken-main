# Priority validation (Auth/RBAC, DB/migrations, Game Builder/CSV)

**Date:** 2025-12-17  
**Scope:** Auth/RBAC + tenant resolution, migrations/typegen, CSV import/export contract.

## Sources checked (repo = SoT)

- Auth proxy + helpers: [proxy.ts](../../proxy.ts), [lib/auth/middleware-helpers.ts](../../lib/auth/middleware-helpers.ts), [lib/auth/server-context.ts](../../lib/auth/server-context.ts)
- Tenant resolver: [lib/tenant/resolver.ts](../../lib/tenant/resolver.ts), [docs/auth/tenant.md](../auth/tenant.md)
- Client auth + RBAC: [lib/supabase/auth.tsx](../../lib/supabase/auth.tsx), [features/admin/shared/hooks/useRbac.ts](../../features/admin/shared/hooks/useRbac.ts)
- DB migrations: [supabase/migrations](../../supabase/migrations)
- CSV API + utils: [app/api/games/csv-import/route.ts](../../app/api/games/csv-import/route.ts), [app/api/games/csv-export/route.ts](../../app/api/games/csv-export/route.ts), [features/admin/games/utils/csv-parser.ts](../../features/admin/games/utils/csv-parser.ts), [features/admin/games/utils/csv-generator.ts](../../features/admin/games/utils/csv-generator.ts), [features/admin/games/utils/game-validator.ts](../../features/admin/games/utils/game-validator.ts)
- Docs: [docs/MIGRATIONS.md](../MIGRATIONS.md), [docs/CSV_IMPORT_FIELD_REFERENCE.md](../CSV_IMPORT_FIELD_REFERENCE.md), [docs/auth/roles.md](../auth/roles.md), [docs/auth/routes.md](../auth/routes.md), [docs/AUTH_SYSTEM_ANALYSIS.md](../AUTH_SYSTEM_ANALYSIS.md)

---

## Findings

### Auth/RBAC (high priority)

**F1 — Role derivation logic is duplicated (risk: drift).**
- `deriveEffectiveGlobalRole` exists in both server and client contexts.
- Proxy uses a separate claims-based derivation (`deriveEffectiveGlobalRoleFromClaims`).
- Action taken (2025-12-17): centralized derivation in `lib/auth/role.ts` and reused it from:
  - `lib/auth/middleware-helpers.ts`
  - `lib/auth/server-context.ts`
  - `lib/supabase/auth.tsx`
  (Build + type-check passed after the change.)

**F2 — Membership table naming is mixed across code (`tenant_memberships` vs `user_tenant_memberships`).**
- Server context + most UI uses `user_tenant_memberships`.
- Some APIs and utilities use `tenant_memberships`.
- DB migrations implement `tenant_memberships` as a compatibility layer that forwards to `user_tenant_memberships` (rules in `20251209120000_accounts_domain.sql`).
- Action taken (2025-12-17): standardized API/util usage to `user_tenant_memberships` and documented `tenant_memberships` as compatibility-only.

**F3 — Proxy tenant resolution is intentionally “membership-unknown”.**
- Proxy calls `resolveTenantForMiddlewareRequest(request, [])`, which suppresses `/app/no-access` redirects.
- This is consistent with the docs approach (avoid blocking when memberships aren’t known), but it should be explicitly documented as a design choice.
- Recommendation: keep as-is, but ensure downstream server actions/pages always resolve tenant using DB-backed memberships (server-context / TenantContext).

### DB/migrations (high priority)

**F4 — Migration guide had a stale overview section (fixed in this pass).**
- `docs/MIGRATIONS.md` claimed a fixed set of 14 migrations; repo now contains many more.
- Action taken: updated `docs/MIGRATIONS.md` to point to `supabase/migrations/` as the authoritative list.

**F5 — Role helpers exist at DB-level and should be the backbone for RLS reasoning.**
- `public.is_system_admin()` and `public.is_global_admin()` (alias) exist in migrations.
- `has_tenant_role` / `get_user_tenant_ids` depend on `user_tenant_memberships`.
- Recommendation: when documenting RLS/permissions, always reference these helper functions as invariants.

### Game Builder / CSV contract (high priority)

**F6 — Secondary purposes column name mismatch (docs vs code).**
- Docs described `sub_purpose_ids` (JSON array).
- CSV parser previously only supported `sub_purpose_id` (comma-separated) and export didn’t include secondary purposes.
- Action taken (this pass):
  - CSV import now supports both `sub_purpose_ids` (preferred JSON array string) and legacy `sub_purpose_id`.
  - CSV export now includes `sub_purpose_ids` populated from `game_secondary_purposes`.
  - Validator now rejects invalid UUIDs in `sub_purpose_ids` before DB insert.
  - Docs updated to document both formats.

**F7 — Types regeneration warning remains relevant for export route.**
- Export route still uses `any` for related tables due to potential type drift.
- Recommendation: keep the guide’s “regenerate types after migrations” rule strict, and ensure it is followed whenever schema changes (already emphasized in MIGRATIONS guide).

---

## Recommended next actions (ordered)

1) **CSV contract hardening:** add a short “CSV contract” section that is auto-verifiable (columns list + examples) and keep it in sync with generator/parser.
2) **Docs hygiene:** add `Owner` + `Last validated` to the Auth + CSV core docs once the above is stabilized.
