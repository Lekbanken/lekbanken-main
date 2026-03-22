# Atlas & Admin Launch Audit (#11)

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed launch-readiness audit for Atlas tools and admin surfaces. Treat this as the bounded audit snapshot behind later remediation and verification work.

**Date:** 2026-03-13  
**Status:** ✅ GPT-calibrated (2026-03-12). No severity changes.  
**Scope:** Atlas sandbox tools, admin dashboard, user management, analytics, gamification admin, award builder, conversation cards, scheduled jobs, marketplace admin, coach diagrams, MFA admin, products admin, Stripe admin, licenses admin  
**Auditor:** Claude (automated deep-dive)

---

## GPT Calibration

> **Calibrated 2026-03-12.** All severities confirmed correct. ATLAS-001 P1 confirmed — `atlas/inventory` leaks system architecture (internal introspection endpoint), `atlas/annotations` is an unauthenticated write primitive. ATLAS-002 noted as borderline P1/P2 — kept P1 because it exposes reward economy (coin rewards, badge IDs, progression structure). All P2s confirmed as classic admin security problems. ATLAS-008 confirmed as systemic (cross-ref SEC-002b). Remediation: M1 = ATLAS-001 + ATLAS-002 only (2–4 files). M2 = hardening.

---

## 0. Domain Overview

**63 route files** audited (60 under `/api/admin/`, 2 under `/api/atlas/`, 1 admin-like). Organized into 16 subsystems:

| Subsystem | Routes | Description |
|-----------|--------|-------------|
| Atlas sandbox | 2 | Inventory viewer + annotations (dev tools) |
| Analytics | 2 | Admin analytics + engagement |
| Categories | 2 | Category CRUD |
| Cosmetics | 5 | Cosmetic items, grants, management |
| Award Builder | 5 | Presets, exports, rewards |
| Coach Diagrams | 2 | Diagram CRUD + SVG |
| Games admin | 2 | Bulk ops, search |
| Products admin | 12 | Product CRUD, variants, pricing, features, sync |
| Stripe admin | 2 | Product sync, bootstrap |
| Licenses admin | 2 | License listing, personal grant |
| Scheduled Jobs | 1 | Cron job management |
| Tenant / MFA | 4 | Tenant CRUD, MFA reset |
| Gamification admin | 14 | Awards, events, campaigns, automation, tokens, sinks, refund, analytics |
| Marketplace admin | 1 | Marketplace item CRUD |
| Conversation Cards | 6 | Card CRUD, collections, CSV import |
| Tokens cleanup | 1 | Dev token maintenance |

**Auth distribution:**
- ~40 handlers: `auth: 'system_admin'` (strongest)
- ~28 handlers: `auth: 'user'` + inline `requireTenantRole(['admin', 'owner'])` (tenant-scoped admin)
- ~6 handlers: `auth: 'user'` only
- 1 handler: `auth: 'cron_or_admin'`
- 1 handler: `auth: 'public'` (seed-test-badges GET)
- **2 routes: NO AUTH** (atlas/inventory, atlas/annotations)

**Rate limiting:** 4 of 63 routes have rate limiting. 59 unprotected.

---

## 1. Findings Summary

| Severity | Count | Resolved | Finding IDs |
|----------|-------|----------|-------------|
| P0 — Launch blocker | 0 | 0 | — |
| P1 — Must fix before launch | 2 | 2 | ~~ATLAS-001~~, ~~ATLAS-002~~ |
| P2 — Should fix, not blocker | 6 | 0 | ATLAS-003, ATLAS-004, ATLAS-005, ATLAS-006, ATLAS-007, ATLAS-008 |
| P3 — Nice to have | 3 | 0 | ATLAS-009, ATLAS-010, ATLAS-011 |
| **Total** | **11** | **2** | |

---

## 2. Detailed Findings

### P1 — Must Fix Before Launch

#### ATLAS-001 — Atlas sandbox routes have ZERO authentication (HIGH)

**Routes:** `app/api/atlas/inventory/route.ts` (GET, 203 lines), `app/api/atlas/annotations/route.ts` (GET+POST, 55 lines)

**Issue:**
- **Inventory GET:** No auth at all. Reads `.inventory/` filesystem to enumerate all domain inventory files. Path traversal mitigated (domain param compared against `readdir()` result, not interpolated into path), but endpoint leaks complete system architecture: all route files, domains, component counts, dependency graphs.
- **Annotations GET:** No auth. Returns all annotation data from filesystem.
- **Annotations POST:** Guarded by `NODE_ENV === 'production'` only — in non-production environments, any anonymous request can write arbitrary JSON to the filesystem via `writeFile`. In production, POST is blocked but GET remains fully open.

**Impact:** Information disclosure of complete system architecture. Any unauthenticated user can enumerate all 287 routes, all domains, all components. Annotations POST is an arbitrary file write in non-production.

**Root cause:** Dev/sandbox tooling deployed without auth gates.

**Fix:** Add `auth: 'system_admin'` to both routes via `apiHandler()`. Or block entirely in production via middleware / route removal.

---

#### ATLAS-002 — Seed-test-badges GET exposes admin data publicly (MEDIUM-HIGH)

**Route:** `app/api/admin/award-builder/seed-test-badges/route.ts` (GET, `auth: 'public'`)

**Issue:** GET handler is `auth: 'public'` — exposes all test badge data including internal IDs, titles, descriptions, themes, reward coins, image URLs, and creation metadata. POST correctly requires `system_admin`.

**Impact:** Information disclosure — any unauthenticated user can enumerate all badge definitions, including reward economy values (coins). Not a direct auth bypass but reveals internal gamification configuration.

**Root cause:** GET was likely intended for a preview/selection UI but lacks auth restriction.

**GPT-notering:** Borderline P1/P2 — exponerar reward economy (coin rewards, badge IDs, progression structure), inte ett integritetsproblem. Kept P1 inför launch.

**Fix:** Change GET to `auth: 'system_admin'` (or `auth: 'user'` + tenant role check if tenant admins need access).

---

### P2 — Should Fix, Not Blocker

#### ATLAS-003 — MFA reset lacks rate limiting, uses manual RBAC (MEDIUM-HIGH)

**Route:** `app/api/admin/tenant/[tenantId]/mfa/users/[userId]/reset/route.ts` (POST, 132 lines)

**Issue:**
1. No rate limiting on MFA reset — allows rapid-fire MFA resets.
2. `auth: 'user'` with manual RBAC check instead of `requireTenantRole()` — fragile pattern.
3. Path params `tenantId` and `userId` not UUID-validated (passed directly to DB queries; parameterized so no SQL injection, but no format validation).

**Impact:** Abuse potential — attacker with valid user session could spam MFA resets. Manual RBAC increases risk of authorization bugs.

**Fix:** Add `rateLimit: 'strict'`, migrate to `requireTenantRole()`, add UUID validation for path params.

---

#### ATLAS-004 — Bulk game operations lack rate limiting (MEDIUM)

**Route:** `app/api/admin/games/bulk/route.ts` (POST, 463 lines, `auth: 'system_admin'`)

**Issue:** No rate limit on bulk operations that can affect up to 500 games per request (Zod-validated `gameIds` max 500, `operation` enum). Uses `supabaseAdmin` (service role) for maximum DB access. Operations include delete, archive, publish, unpublish, feature, unfeature.

**Impact:** A compromised system_admin account could rapidly delete/archive massive amounts of content.

**Fix:** Add `rateLimit: 'strict'` to prevent abuse.

---

#### ATLAS-005 — License grant: no Zod, no transaction, no rate limit (MEDIUM)

**Route:** `app/api/admin/licenses/grant-personal/route.ts` (POST, 179 lines, `auth: 'system_admin'`)

**Issue:**
1. No Zod schema — input validated via manual `if (!email)` checks.
2. Multi-table writes (tenant + membership + entitlement + seat) without DB transaction — partial failure leaves orphaned records.
3. No rate limiting.

**Impact:** Manual validation is error-prone. Partial failures create inconsistent state (tenant created but no membership, etc.).

**Fix:** Add Zod schema, add `rateLimit: 'strict'`, consider wrapping multi-table writes in a transaction or RPC.

---

#### ATLAS-006 — CSV import routes lack size/row limits (MEDIUM)

**Routes:** `app/api/admin/toolbelt/conversation-cards/import/route.ts` (345 lines), `app/api/admin/toolbelt/conversation-cards/collections/[collectionId]/import/route.ts` (212 lines)

**Issue:**
1. `csv` field validated as `z.string().min(1)` with no max length — unbounded CSV payload.
2. No limit on number of rows — each row triggers a DB query (linear scaling).
3. Collection import: `collectionId` from URL params not UUID-validated (safe from SQL injection due to parameterized queries, but no format check).
4. Collection import replaces all secondary purposes on import — destructive operation without explicit confirmation.

**Impact:** DoS potential — very large CSV payloads can overwhelm the server with linear DB queries.

**Fix:** Add `.max()` on CSV string length, add row count limit, add UUID validation for collectionId.

---

#### ATLAS-007 — Campaign budget allows extremely large values (LOW-MEDIUM)

**Route:** `app/api/admin/gamification/campaigns/route.ts` (173 lines)

**Issue:** Zod schema allows `max_total_budget` up to `1_000_000_000` (1 billion) and individual reward amounts up to `1_000_000`. Well-structured auth (`requireTenantRole`) and audit logging, but very large budget values could impact the economy system.

**Impact:** Low — requires admin access and audit-logged. But accidental or malicious budget inflation could disrupt gamification economy.

**Fix:** Review and potentially lower max budget constants based on business requirements.

---

#### ATLAS-008 — 59 of 63 admin routes lack rate limiting (SYSTEMIC)

**Issue:** Only 4 of 63 routes in the Atlas/Admin domain have rate limiting. While most routes require `system_admin` auth (reducing attack surface significantly), the remaining ~28 tenant-admin routes are exposed to any authenticated tenant admin.

**Impact:** Tenant-admin accessible routes are vulnerable to abuse by compromised tenant accounts. System-admin routes have lower risk (harder to compromise) but still benefit from rate limiting as defense-in-depth.

**Fix:** Add `rateLimit: 'strict'` to all mutation endpoints. Add `rateLimit: 'auth'` to read endpoints. Prioritize tenant-admin accessible routes.

**Note:** This is part of the systemic rate limiting gap tracked in SEC-002b. Not a new finding — scoping here for Atlas-specific remediation.

---

### P3 — Nice to Have

#### ATLAS-009 — Scheduled jobs trigger lacks Zod validation (LOW)

**Route:** `app/api/admin/scheduled-jobs/route.ts` (87 lines, `auth: 'system_admin'`)

**Issue:** POST parses body via `req.json()` without Zod schema. Job name is validated against hardcoded allowlist (good), but no structured validation.

**Impact:** Minimal — allowlist prevents arbitrary job execution. Zod would add consistency with other routes.

---

#### ATLAS-010 — Marketplace metadata allows arbitrary nested data (LOW)

**Route:** `app/api/admin/marketplace/items/route.ts` (120 lines)

**Issue:** `metadata` field uses `z.record(z.unknown())` — can store arbitrary nested data. No schema constraints on metadata shape.

**Impact:** Minimal — tenant-scoped, admin-only. Could allow unexpected data shapes in marketplace items.

---

#### ATLAS-011 — No rate limiting on gamification admin mutation routes (LOW)

**Routes:** Campaigns (POST/PATCH), automation (POST/PATCH), marketplace items (POST/PATCH), awards (POST), events (POST)

**Issue:** All gamification admin mutation routes lack rate limiting. All require `auth: 'user'` + `requireTenantRole(['admin', 'owner'])` with audit logging.

**Impact:** Low — tenant-scoped with audit logging. Subsumed under ATLAS-008 systemic finding.

---

## 3. Route Inventory

### Atlas Sandbox Routes

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `/api/atlas/inventory` | GET | ✅ `system_admin` | ✅ apiHandler | domain param vs readdir | ❌ | ~~**ATLAS-001**~~ ✅ |
| `/api/atlas/annotations` | GET, POST | ✅ `system_admin` | ✅ apiHandler | POST: NODE_ENV guard + auth | ❌ | ~~**ATLAS-001**~~ ✅ |

### Award Builder Routes

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `admin/award-builder/presets` | GET, POST | `user` + `requireTenantRole` / `system_admin` | ✅ | ✅ Zod | ❌ | |
| `admin/award-builder/presets/[presetId]` | GET, PUT, DELETE, POST | scope-based `authorizeScope` | ✅ | ✅ Zod | ❌ | |
| `admin/award-builder/exports` | GET, POST | `user` + `requireTenantRole` / `system_admin` | ✅ | ✅ Zod | ❌ | |
| `admin/award-builder/exports/[exportId]` | GET, PUT, DELETE | scope-based `authorizeScope` | ✅ | ✅ Zod | ❌ | |
| `admin/award-builder/seed-test-badges` | GET, POST | GET: ✅ `system_admin`, POST: `system_admin` | ✅ | ✅ Zod (POST) | ❌ | ~~**ATLAS-002**~~ ✅ |

### Gamification Admin Routes

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `admin/gamification/awards` | POST | `user` + `requireTenantRole` | ✅ | ✅ Zod | ✅ | |
| `admin/gamification/events` | POST | `user` + `requireTenantRole` | ✅ | ✅ Zod | ❌ | |
| `admin/gamification/campaigns` | GET, POST, PATCH | `user` + `requireTenantRole` | ✅ | ✅ Zod | ❌ | ATLAS-007 |
| `admin/gamification/automation` | GET, POST, PATCH | `user` + `requireTenantRole` | ✅ | ✅ Zod | ❌ | |
| `admin/gamification/tokens/cleanup` | POST | `cron_or_admin` | ✅ | ✅ | ❌ | |
| `admin/gamification/analytics/overview` | GET | `system_admin` | ✅ | — | ❌ | |
| `admin/gamification/analytics/sessions/[sessionId]` | GET | `system_admin` | ✅ | — | ❌ | |
| `admin/gamification/analytics/rollups/refresh` | POST | `system_admin` | ✅ | ✅ Zod | ✅ `strict` | |
| `admin/gamification/refund` | POST | `system_admin` | ✅ | ✅ Zod | ✅ `strict` | |
| `admin/gamification/sinks` | POST, PATCH | `system_admin` | ✅ | ✅ Zod | ❌ | |
| `admin/gamification/dashboard` | GET | `user` + `requireTenantRole` | ✅ | — | ❌ | |
| `admin/gamification/rules` | GET, PATCH | `user` + `requireTenantRole` | ✅ | ✅ Zod | ❌ | |
| `admin/gamification/pins` | GET, POST | `user` + `requireTenantRole` | ✅ | ✅ Zod | ❌ | |
| `admin/gamification/leaderboard` | GET | `user` + `requireTenantRole` | ✅ | — | ❌ | |

### Tenant / MFA Routes

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `admin/tenant/[tenantId]/mfa/status` | GET | `user` + manual RBAC | ❌ raw | — | ❌ | |
| `admin/tenant/[tenantId]/mfa/enforce` | POST | `user` + manual RBAC | ❌ raw | — | ❌ | |
| `admin/tenant/[tenantId]/mfa/users` | GET | `user` + manual RBAC | ❌ raw | — | ❌ | |
| `admin/tenant/[tenantId]/mfa/users/[userId]/reset` | POST | `user` + manual RBAC | ❌ raw | — | ❌ | **ATLAS-003** |

### Games Admin Routes

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `admin/games/bulk` | POST | `system_admin` | ✅ | ✅ Zod (max 500) | ❌ | **ATLAS-004** |
| `admin/games/search` | GET | `system_admin` | ✅ | — | ❌ | |

### Products Admin Routes (12 files)

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `admin/products/*` | Various | `system_admin` | ✅ | ✅ Zod | ❌ | |

### Licenses Admin Routes

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `admin/licenses` | GET | `system_admin` | ✅ | — | ❌ | |
| `admin/licenses/grant-personal` | POST | `system_admin` | ✅ | ❌ manual | ❌ | **ATLAS-005** |

### Conversation Cards Routes

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `admin/toolbelt/conversation-cards/*` | Various | `system_admin` / scope-based | ✅ | ✅ Zod | ❌ | |
| `admin/toolbelt/conversation-cards/import` | POST | `user` + scope-based | ✅ | ✅ Zod | ❌ | **ATLAS-006** |
| `admin/toolbelt/conversation-cards/collections/[collectionId]/import` | POST | `user` + scope-based | ✅ | ✅ Zod | ❌ | **ATLAS-006** |

### Other Routes

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `admin/categories/*` | Various | `system_admin` | ✅ | ✅ Zod | ❌ | |
| `admin/cosmetics/*` | Various | `system_admin` / scope-based | ✅ | ✅ Zod | ❌ | |
| `admin/coach-diagrams/*` | Various | `system_admin` / scope-based | ✅ | ✅ Zod | ❌ | |
| `admin/marketplace/items` | POST, PATCH | `user` + `requireTenantRole` | ✅ | ✅ Zod | ❌ | ATLAS-010 |
| `admin/scheduled-jobs` | GET, POST | `system_admin` | ✅ | Manual allowlist | ❌ | ATLAS-009 |
| `admin/stripe/*` | Various | `system_admin` | ✅ | ✅ Zod | ❌ | |

---

## 4. Strengths

1. **Strong system_admin auth coverage** — ~40 of ~80+ handlers require system_admin, the highest auth level
2. **Consistent wrapper adoption** — 60 of 63 route files use `apiHandler()` (95.2%)
3. **Good Zod validation coverage** — most wrapped routes have schema validation
4. **Tenant-scoped admin routes use `requireTenantRole`** — establishes proper tenant boundary
5. **Audit logging** — gamification admin routes write to `tenant_audit_logs` (best-effort)
6. **Award builder uses scope-based auth** — `authorizeScope()` helper handles dual global/tenant access cleanly
7. **Scheduled jobs use allowlist** — job name validated against hardcoded list, preventing arbitrary RPC execution
8. **Bulk operations have Zod limits** — `gameIds` max 500, `operation` enum-restricted

---

## 5. Remediation Plan

### M1 — Critical Auth Gaps (2 P1) ✅ KLAR (2026-03-12)

| Finding | Route | Fix | Effort | Status |
|---------|-------|-----|--------|--------|
| ATLAS-001 | atlas/inventory + atlas/annotations | Wrap in `apiHandler({ auth: 'system_admin' })` | ~30 min | ✅ |
| ATLAS-002 | seed-test-badges GET | Change `auth: 'public'` → `auth: 'system_admin'` | ~10 min | ✅ |

**Noteringar:**
- `atlas/inventory`: GET handler wrapped in `apiHandler({ auth: 'system_admin' })`. Internal helper functions unchanged.
- `atlas/annotations`: Both GET and POST wrapped in `apiHandler({ auth: 'system_admin' })`. POST retains `NODE_ENV === 'production'` guard as defense-in-depth.
- `seed-test-badges`: GET changed from `auth: 'public'` to `auth: 'system_admin'`. POST already had `system_admin`.
- Sandbox Atlas UI callers (`useAnnotations.ts`, `inventory-adapter.ts`) use same-origin fetch — cookies forwarded automatically. System-admin login required in dev to use Atlas.
- `tsc --noEmit` = 0 errors.

### M2 — Security Hardening (P2, launch-recommended)

| Finding | Route | Fix | Effort |
|---------|-------|-----|--------|
| ATLAS-003 | MFA reset | Add `rateLimit: 'strict'`, migrate to `apiHandler` + `requireTenantRole` | ~45 min |
| ATLAS-004 | games/bulk | Add `rateLimit: 'strict'` | ~5 min |
| ATLAS-005 | grant-personal | Add Zod schema + `rateLimit: 'strict'` | ~20 min |

### M3 — Hardening (post-launch)

| Finding | Route | Fix |
|---------|-------|-----|
| ATLAS-006 | CSV import routes | Add `.max()` + row count limit |
| ATLAS-007 | Campaigns | Review max budget constants |
| ATLAS-008 | 59 routes | Systemic rate limiting (tracked in SEC-002b) |

### M4 — Cleanup (post-launch)

| Finding | Route | Fix |
|---------|-------|-----|
| ATLAS-009 | Scheduled jobs POST | Add Zod schema |
| ATLAS-010 | Marketplace metadata | Add metadata shape constraints |
| ATLAS-011 | Gamification admin | Subsumed under ATLAS-008 |

---

## 6. Cross-References

| Finding | Related | Notes |
|---------|---------|-------|
| ATLAS-008 | SEC-002b | Systemic rate limiting gap across all domains |
| ATLAS-001 | — | Unique to Atlas — only routes in entire codebase with zero auth |
| ATLAS-003 | — | Manual RBAC antipattern — only remaining MFA routes not using `requireTenantRole` |
| ATLAS-005 | BILL-009 | Similar pattern: multi-table writes without transaction (billing checkout has same issue) |
