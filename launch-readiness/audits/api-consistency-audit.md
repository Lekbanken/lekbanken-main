# API Consistency Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Closed cross-cutting audit of API wrapper adoption, auth consistency, validation, and error-format patterns across `app/api/**/route.ts`. Use `launch-readiness/audits/README.md` as the folder entrypoint and `launch-readiness/launch-control.md` for the current launch verdict.

> **2026-03-22 verification note:** This file remains a frozen snapshot of the original findings. Current code and launch-control state match the expected follow-up: APC-003/APC-011 are resolved, Batches 1-6d are complete, and the remaining mixed/public/special-case routes are intentionally deferred to per-domain audits.

> **Date:** 2026-03-10  
> **Auditor:** Claude (automated scan + targeted code reads)  
> **Scope:** All 287 `app/api/**/route.ts` files — auth, validation, error format, rate limiting, wrapper adoption  
> **Source:** `launch-readiness/audits/launch-readiness-audit-program.md` audit #4  
> **Prerequisites:** Security & Auth Audit (#2), Tenant Isolation Audit (#3), `lib/api/route-handler.ts` wrapper  

---

## Executive Summary

| Metric | Count | % |
|--------|-------|---|
| Total API route files | **287** | 100% |
| Using `apiHandler()` wrapper | **36** | 12.5% |
| Non-wrapper (manual patterns) | **251** | 87.5% |
| With Zod `safeParse` validation | **52** | 18.1% |
| With rate limiting | **21** | 7.3% |
| Using `errorResponse()` helper | **0** | 0% |
| Using `createServiceRoleClient` | **96** | 33.4% |

**Findings:** 14 confirmed issues, 0 P0, 4 P1, 7 P2, 3 P3

| Severity | Count | Nature |
|----------|-------|--------|
| P0 🔴 | 0 | — |
| P1 🟠 | 4 | Auth gaps, service role without auth, error format fragmentation |
| P2 🟡 | 7 | Validation gaps, rate limiting gaps, migration debt |
| P3 🔵 | 3 | Cleanup, deprecation, cosmetic |

---

## 1. Auth Pattern Inventory

### 1.1 Auth Mechanisms in Use (non-wrapper routes)

| Auth Pattern | Route Count | Wrapper-Ready? | Notes |
|-------------|-------------|----------------|-------|
| `apiHandler()` wrapper | 36 | ✅ Already wrapped | auth: user/system_admin/public/cron_or_admin |
| Inline `supabase.auth.getUser()` | 164 | ✅ Easy | Largest pool — direct conversion to `auth: 'user'` |
| `tenantAuth` / `isSystemAdmin` | 72 | 🟡 DD-1 needed | `assertTenantAdmin`, `isSystemAdmin`, `isTenantAdmin` |
| `requireAuth()` direct | 14 | ✅ Easy | Already use auth-guard, trivial wrapper wrap |
| `requireSystemAdmin()` direct | 6 | ✅ Easy | Direct conversion to `auth: 'system_admin'` |
| `requireTenantRole()` direct | 6 | ✅ Easy | Already use auth-guard, maps to `auth: { tenantRole }` |
| `requireSessionHost()` direct | 5 | ✅ Easy | Maps to `auth: { sessionHost }` (deferred enforcement) |
| `requireCronOrAdmin()` direct | 2 | ✅ Easy | Maps to `auth: 'cron_or_admin'` |
| `participant_token` / `verifyParticipant` | 14 | 🟡 DD-2 needed | Custom auth flow — needs wrapper mode design |
| `getServerAuthContext()` hidden | 5 | 🟡 Custom | Requires understanding of context shape |
| `resolveSessionViewer()` hidden | 7 | 🟡 Custom | Play-mode session auth — custom helper |
| `requireGameAuth()` hidden | 3 | 🟡 Custom | Game permission check — custom helper |
| `getAuthUser()` hidden | 9 | 🟡 Custom | Billing utility — maps to user auth |
| RLS-only (no app-level auth) | 13 | ⚠️ Defense-in-depth gap | Client creates RLS session, no explicit check |
| Truly no auth (intentional public) | 9 | ✅ OK | Leaderboard, sinks, geocode, join, atlas/sandbox assets |
| Deprecated (410 Gone stubs) | 3 | ⬜ Remove | Dead code stubs |

### 1.2 Hidden Auth Patterns (not caught by standard regex)

These routes were initially classified as "no auth" but have non-standard auth mechanisms:

| Route | Actual Auth | Mechanism |
|-------|-------------|-----------|
| `admin/scheduled-jobs` | system_admin | `getServerAuthContext()` + role check |
| `billing/portal` | user + role | `getAuthUser()` + tenant membership role check |
| `billing/subscription/my` | user | `getAuthUser()` |
| `billing/usage/aggregate` | API key / system_admin | `x-api-key` header or `getAuthUser()` + `is_system_admin` RPC |
| `billing/usage/meters` | user | `getAuthUser()` + `is_system_admin` RPC for POST |
| `checkout/my-orgs` | user | `getAuthUser()` + filters by user.id |
| `demo/convert` | cookie-based | Validates `demo_session_id` cookie |
| `demo/track` | cookie-based | Validates `demo_session_id` cookie |
| `games/[gameId]/artifacts` | custom | `requireGameAuth()` + `canViewGame` |
| `games/[gameId]/roles` | custom | `requireGameAuth()` + `canViewGame` |
| `games/[gameId]/triggers` | custom | `requireGameAuth()` + `canViewGame` |
| `play/rejoin` | token-based | Validates `participantToken` + sessionId |
| `gamification/leaderboard/preferences` | user | Service layer enforces auth internally |
| `play/sessions/[id]/chat` etc. (7 routes) | session-based | `resolveSessionViewer()` |

---

## 2. Findings

### APC-001: 4 different error response formats coexist

- **Typ:** ARCH
- **Severity:** P1
- **Fil(er):** All 287 route files
- **Beskrivning:** The codebase uses 4 distinct error response patterns with no convergence:

| Pattern | Count | Shape | Example |
|---------|-------|-------|---------|
| `NextResponse.json({ error: msg }, { status: N })` | **266** | `{ error: string }` | Most common |
| `NextResponse.json({ error: msg, ...extra }, { status: N })` | subset | `{ error: string, code?: string, details?: any }` | Some routes add extra fields |
| `NextResponse.json({ message: msg }, { status: N })` | **2** | `{ message: string }` | award-builder/seed-test-badges, billing/usage/aggregate |
| `throw new Error(...)` caught externally | **5** | Varies | billing routes, games/csv-import |

The `errorResponse()` helper from `lib/api/errors.ts` produces a standardized `{ error: string, code?: string, requestId: string }` shape — but **0 routes** use it directly (only the wrapper does).

- **Förslag:** Phase 3+ wrapper adoption will converge this automatically. Until then, document the canonical shape and avoid `{ message: }` in new routes.
- **Kopplat till:** SEC-005

---

### APC-002: 13 RLS-only routes with no app-level auth guard (defense-in-depth gap)

- **Typ:** AUTH
- **Severity:** P2 (defense-in-depth)
- **Fil(er):** See table below
- **Beskrivning:** These routes create an RLS-scoped Supabase client (`createServerRlsClient`) without any explicit auth check. RLS policies are the only defense layer. If RLS is ever misconfigured, these routes expose data without fallback.

| Route | Methods | Data Sensitivity | RLS Verified? |
|-------|---------|-----------------|---------------|
| `game-reactions/batch` | POST | Low (reactions) | Not verified |
| `participants` | GET | Medium (participant list) | Not verified |
| `participants/[participantId]` | GET | Medium (participant detail) | Not verified |
| `sessions` | GET | Medium (session list) — **also uses supabaseAdmin fallback** | ⚠️ Mixed |
| `sessions/[sessionId]` | GET | Medium (session detail) | Not verified |
| `billing/products` | GET | Low (product catalog) | Not verified |
| `plans/[planId]/play` | GET | Low (plan data) | Not verified |
| `toolbelt/conversation-cards/collections` | GET | Low (published collections) | Not verified |
| `toolbelt/conversation-cards/collections/[collectionId]` | GET | Low (published collection detail) | Not verified |
| `tenants/invitations/[token]` | GET | Low (invitation lookup) | Not verified |
| `media/fallback` | GET | Low (fallback media) | Not verified |
| `billing/usage` | GET,POST | Medium (usage data) | Not verified |
| `gamification/leaderboard/preferences` | GET,POST | Low (preferences) | Not verified |

- **Förslag:** Add `getUser()` check to medium-sensitivity routes (sessions, participants). Low-sensitivity routes can remain RLS-only but should be documented as intentional.
- **Kopplat till:** TI-004, SEC-011

---

### APC-003: `sessions/route.ts` mixes RLS client with service role (supabaseAdmin) fallback

- **Typ:** AUTH
- **Severity:** P1 (confirmed — security finding)
- **Fil(er):** `app/api/sessions/route.ts`
- **Beskrivning:** This route uses `createServerRlsClient` for the primary query but falls back to `supabaseAdmin` (service role) under certain conditions. A user-facing list endpoint should never escalate to service role. If the fallback path is triggered, it bypasses all RLS policies.
- **Bevis:** Verified by code inspection — route contains both `createServerRlsClient` and `supabaseAdmin` references.
- **Förslag:** Remove `supabaseAdmin` fallback. Use RLS client exclusively. If admin-level access is needed, gate it behind an auth check.
- **Kopplat till:** TI-001 (same service role bypass pattern)
- **Status:** ✅ **RESOLVED (2026-03-14)** — RLS policy `tenant_admin_view_sessions` created (migration `20260314000000`). Route migrated from `createServiceRoleClient()` → `createServerRlsClient()`. Tenant admins access sessions via RLS; system admins via `is_system_admin()` policy.

---

### APC-004: 235 mutation routes have no input validation

- **Typ:** ARCH
- **Severity:** P2 (migration debt)
- **Fil(er):** All POST/PUT/PATCH routes without Zod safeParse
- **Beskrivning:** Only 52/287 routes (18.1%) use Zod `safeParse()` for input validation. The wrapper provides built-in `input` schema support, but 251 routes don't use the wrapper and most of those lack any validation.

**Mutation routes by validation status:**

| Category | Count | Notes |
|----------|-------|-------|
| POST/PUT/PATCH routes total | ~210 | Many routes export multiple methods |
| With Zod safeParse | 52 | Both wrapper and manual |
| Without any validation | ~158 | Trust request body directly |

- **Förslag:** Prioritize validation for routes that accept user-generated content or financial data. The wrapper `input` parameter makes this easy for migrated routes.

---

### APC-005: Only 21/287 routes (7.3%) have rate limiting

- **Typ:** AUTH
- **Severity:** P2 (known — SEC-002b)
- **Fil(er):** 266 routes without any rate limiting
- **Beskrivning:** Rate limiting coverage remains at 7.3%. The wrapper provides `rateLimit` tier support, but only 21 routes use it (some via wrapper, some manual `applyRateLimit()`).

**Current rate-limited routes:**

| Tier | Routes | Examples |
|------|--------|---------|
| `auth` | 4 | email/change, password/change, GDPR routes |
| `api` | ~12 | admin gamification awards, checkout, play heartbeat |
| `strict` | 2 | participant progress |
| Unknown/manual | 3 | Various |

**Priority routes still unprotected:**

| Route | Reason |
|-------|--------|
| `billing/create-subscription` | Financial mutation |
| `billing/subscription/update` | Financial mutation |
| `enterprise/quote` | External-facing, abuse vector |
| `consent/log` | Unauthenticated, service role — abuse vector |
| `tenants/.../invitations` | Invitation enumeration |
| `media/upload` | Storage abuse |
| `games/builder` | Heavy mutation |

- **Förslag:** Already tracked under SEC-002b. Next wrapper migration batch should include `rateLimit` tier for all mutations.
- **Kopplat till:** SEC-002b, DD-3

---

### APC-006: `consent/log` route is unauthenticated with service role client

- **Typ:** AUTH
- **Severity:** P1 (confirmed — security finding)
- **Fil(er):** `app/api/consent/log/route.ts`
- **Beskrivning:** This POST route has zero authentication and uses `createServiceRoleClient()` to write consent records. While the intent is to log GDPR consent from anonymous users, the combination of no auth + service role + no rate limiting creates an abuse vector:
  - Unlimited writes to the consent log table
  - Service role bypasses RLS — any data written goes directly to the table
  - No validation reported by the scan (no safeParse)
- **Förslag:** Add rate limiting (`strict` tier). Validate input with Zod schema. Consider whether anonymous consent needs service role or whether RLS can handle it.
- **Kopplat till:** TI-005 (consent log hardening)

---

### APC-007: `billing/usage/aggregate` uses x-api-key header auth — non-standard

- **Typ:** ARCH
- **Severity:** P2 (product decision)
- **Fil(er):** `app/api/billing/usage/aggregate/route.ts`
- **Beskrivning:** POST uses `x-api-key` header verification against an environment variable. GET uses `getAuthUser()` + `is_system_admin` RPC. This is a unique auth pattern not supported by the wrapper. The API key check may lack timing-safe comparison.
- **Förslag:** Document as special-case. Verify timing-safe comparison for the API key. Consider converting GET to `auth: 'system_admin'` wrapper route.
- **Kopplat till:** SEC-012

---

### APC-008: 72 tenantAuth routes need DD-1 canonical admin check migration

- **Typ:** ARCH
- **Severity:** P2 (migration debt — known)
- **Fil(er):** 72 routes using `tenantAuth`, `isSystemAdmin`, `isTenantAdmin`, or `assertTenantAdmin`
- **Beskrivning:** These routes use the legacy `tenantAuth` utility which has been superseded by `deriveEffectiveGlobalRole()` (DD-1). The wrapper supports `auth: 'system_admin'` and `auth: { tenantRole }` which map to the canonical auth-guard functions.

**Domain distribution:**

| Domain | Count | Typical Pattern |
|--------|-------|----------------|
| `admin/*` | 45 | `isSystemAdmin()` |
| `tenants/*` | 13 | `isTenantAdmin()` or `isSystemAdmin \|\| isTenantAdmin` |
| `games/*` | 5 | `assertTenantAdminOrSystem` |
| `products/*` | 3 | `isSystemAdmin()` |
| Other | 6 | Mixed |

- **Förslag:** Phase 3 wrapper migration. Group by auth pattern for batch conversion. `isSystemAdmin`-only routes → `auth: 'system_admin'`. Tenant admin routes → `auth: { tenantRole: ['admin', 'owner'] }`.
- **Kopplat till:** DD-1

---

### APC-009: 14 participant-token routes use custom auth not yet supported by wrapper

- **Typ:** ARCH
- **Severity:** P2 (migration debt — known)
- **Fil(er):** 14 routes using `participant_token` / `verifyParticipant`
- **Beskrivning:** Participant routes use a custom token validation flow (`participant_token` cookie → lookup → verify). The wrapper has a reserved `sessionHost` interface but no `participant` mode yet (DD-2 approved in principle, exact contract deferred to Phase 3).

**Routes:**

| Route | Pattern |
|-------|---------|
| `participants/progress/update` | participant_token |
| `participants/progress/unlock-achievement` | participant_token |
| `participants/sessions/join` | participant_token (creates token) |
| `participants/sessions/rejoin` | participant_token |
| `play/heartbeat` | participant_token |
| `play/me` | participant_token |
| `play/me/role` | participant_token |
| `play/me/role/reveal` | participant_token |
| `play/ready` | participant_token |
| `play/sessions/[id]/game` | participant_token (mixed with getUser) |
| `participants/tokens/extend` | requireSessionHost |
| `participants/tokens/revoke` | requireSessionHost |
| `participants/tokens/cleanup` | requireCronOrAdmin |
| `participants/sessions/[sessionId]` | requireSessionHost |

- **Förslag:** DD-2 Phase 3 design needed. Define `auth: 'participant'` wrapper mode with clear contract.
- **Kopplat till:** DD-2, SEC-004

---

### APC-010: 15+ hidden auth patterns make wrapper migration harder

- **Typ:** ARCH
- **Severity:** P2 (migration friction)
- **Fil(er):** Routes using `getServerAuthContext`, `resolveSessionViewer`, `requireGameAuth`, `getAuthUser`, cookie-based auth
- **Beskrivning:** Beyond the standard auth-guard functions, the codebase has 5+ additional auth utilities:

| Utility | Routes | Origin | Wrapper Support |
|---------|--------|--------|-----------------|
| `getServerAuthContext()` | 5 | Custom server auth | ❌ No |
| `resolveSessionViewer()` | 7 | Play mode | ❌ No |
| `requireGameAuth()` | 3 | Game permissions | ❌ No |
| `getAuthUser()` | 9 | Billing utility | ❌ No |
| Cookie-based (`demo_session_id`) | 2 | Demo flow | ❌ No |

Each of these would need either:
1. Inline auth inside the handler (wrapper `auth: 'user'` + manual check), or
2. New wrapper auth modes (increases wrapper complexity)

- **Förslag:** Option 1 for most routes. `resolveSessionViewer` routes (7) are best kept as special-case until play system is stable. `getAuthUser`-based billing routes (9) can use `auth: 'user'` + inline billing logic.

---

### APC-011: `sessions/route.ts` GET + service role admin fallback pattern

- **Typ:** AUTH
- **Severity:** P1 (confirmed — already noted in APC-003, reinforced as separate finding)
- **Fil(er):** `app/api/sessions/route.ts`
- **Beskrivning:** This route creates an RLS client first, then under certain conditions switches to `supabaseAdmin` (service role). The admin client creation bypasses RLS. This is the same anti-pattern that caused TI-001. In a list endpoint, this means any authenticated user could potentially see all sessions if the admin fallback triggers.
- **Förslag:** Remove admin fallback entirely. If admin listing is needed, create a separate `admin/sessions` route with proper `auth: 'system_admin'`.
- **Kopplat till:** TI-001 pattern
- **Status:** ✅ **RESOLVED (2026-03-14)** — Resolved together with APC-003. Service role eliminated.

---

### APC-012: 3 deprecated 410 Gone stub routes still exist

- **Typ:** ARCH
- **Severity:** P3 (cleanup)
- **Fil(er):**
  - `app/api/participants/[participantId]/actions/route.ts`
  - `app/api/sessions/[sessionId]/actions/route.ts`
  - `app/api/play/sessions/[id]/artifacts/snapshot/route.ts`
- **Beskrivning:** These routes return only `410 Gone`. They are dead code that should be removed to reduce inventory noise.
- **Förslag:** Delete after verifying no clients still call them.

---

### APC-013: Multi-method routes with asymmetric auth (GET public, POST authenticated)

- **Typ:** AUTH
- **Severity:** P2 (defense-in-depth)
- **Fil(er):** Multiple routes with GET + POST/PATCH/DELETE where GET has weaker auth
- **Beskrivning:** Several routes export multiple HTTP methods where GET has a different (typically weaker) auth check than mutation methods. This is sometimes intentional (e.g., read vs write) but creates a surface where GET is one RLS misconfiguration away from data leak.

**Examples verified:**

| Route | GET Auth | Mutation Auth | Risk |
|-------|----------|---------------|------|
| `tenants/[tenantId]/settings` | RLS-only | `isSystemAdmin \|\| isTenantAdmin` | Medium |
| `tenants/[tenantId]/branding` | RLS-only | `isSystemAdmin \|\| isTenantAdmin` | Medium |
| `tenants/[tenantId]/members` | RLS-only | `isSystemAdmin \|\| isTenantAdmin` | Medium |
| `plans/[planId]` | getUser (read) | getUser (write) | Low |

- **Förslag:** This is the same finding as TI-004 (recalibrated P2). Not a separate fix — will resolve with wrapper migration that enforces auth per handler.
- **Kopplat till:** TI-004

---

### APC-014: Wrapper `apiHandler()` produces one export per method — files with multiple HTTP methods need multiple `apiHandler()` calls

- **Typ:** DOC
- **Severity:** P3 (documentation)
- **Fil(er):** `lib/api/route-handler.ts`
- **Beskrivning:** The current wrapper design produces a single NextRouteHandler per `apiHandler()` call. Routes that export multiple HTTP methods (85+ files have 2+ methods) must call `apiHandler()` once per method with potentially different `auth`/`input`/`rateLimit` configs. This is correct by design but not documented in the wrapper JSDoc.
- **Förslag:** Add a multi-method example to the wrapper JSDoc:
  ```ts
  export const GET = apiHandler({ auth: 'user', handler: getHandler })
  export const POST = apiHandler({ auth: 'user', input: schema, handler: postHandler })
  ```

---

## 3. Supabase Client Usage

| Client Type | Non-Wrapper Routes | Risk Level |
|-------------|-------------------|------------|
| `createServerRlsClient` | 183 | ✅ Safe — RLS enforced |
| `createServiceRoleClient` | 90 | ⚠️ Bypasses RLS — requires app-level auth |
| `supabaseAdmin` (billing alias) | 23 | ⚠️ Same as service role |
| `createClient` | 1 | ❓ Unknown client type |

**Service role routes requiring verification:**

| Category | Count | Auth Gate Present? |
|----------|-------|--------------------|
| admin/* routes + isSystemAdmin | ~50 | ✅ Yes |
| games/builder (TI-001 fixed) | 2 | ✅ Yes (post-fix) |
| play/sessions/* (resolveSessionViewer) | ~15 | ✅ Yes (session-based) |
| consent/log | 1 | ❌ No auth — APC-006 |
| sessions/route.ts (admin fallback) | 1 | ⚠️ Partial — APC-003 |
| participants/sessions/* (token-based) | ~5 | ✅ Token-verified |
| public/v1/* | 4 | ❌ No auth — TI-NEW-1 (known) |

---

## 4. Handler Export Patterns

| Pattern | Count | Notes |
|---------|-------|-------|
| `export async function GET/POST/...` | **249** | Standard named function export |
| `export const GET = apiHandler({...})` | **36** | Wrapper pattern |
| Other | **2** | Edge cases |

All non-wrapper routes use `export async function` — consistent. No inline arrow exports. Handler signatures are uniform except for param handling.

---

## 5. Wrapper Migration Matrix

### Easy Now (117 routes) — Direct conversion, no design decisions needed

| Category | Count | Pattern | Wrapper Config |
|----------|-------|---------|----------------|
| `getUser()` inline → `auth: 'user'` | 98 | `supabase.auth.getUser()` | `auth: 'user'` |
| `requireAuth()` direct | 14 | `await requireAuth()` | `auth: 'user'` |
| `requireSystemAdmin()` direct | 6 | `await requireSystemAdmin()` | `auth: 'system_admin'` |
| `requireTenantRole()` direct | 6 | `await requireTenantRole(...)` | `auth: { tenantRole }` |
| `requireSessionHost()` direct | 5 | `await requireSessionHost()` | `auth: { sessionHost }` |
| `requireCronOrAdmin()` direct | 2 | `await requireCronOrAdmin()` | `auth: 'cron_or_admin'` |

**Best next batch candidates (low risk, high coverage):**

| Batch | Routes | Description |
|-------|--------|-------------|
| Phase 3A | 14 | `requireAuth()` direct — trivial 1:1 rename |
| Phase 3B | 6 | `requireSystemAdmin()` direct — trivial |
| Phase 3C | 6 | `requireTenantRole()` direct |
| Phase 3D | 5 | `requireSessionHost()` — wrapper already has deferred support |
| Phase 3E | 2 | `requireCronOrAdmin()` |

**After Phase 3A-E:** 33 more routes wrapped → **69/287 = 24%** coverage

### Needs Design Decision (86 routes)

| Category | Count | Decision Needed |
|----------|-------|-----------------|
| `tenantAuth` / `isSystemAdmin` | 72 | DD-1: How to map tenantAuth utility to wrapper auth modes |
| `participant_token` | 14 | DD-2: Define `auth: 'participant'` wrapper mode |

### Keep as Special-Case (18 routes)

| Category | Count | Reason |
|----------|-------|--------|
| `resolveSessionViewer` | 7 | Play-mode session auth — complex, unstable domain |
| `getAuthUser` billing | 9 | Billing utilities with Stripe integration |
| Cookie-based demo | 2 | Demo flow with `demo_session_id` cookie |

### Intentionally Public (9 routes)

| Route | Reason |
|-------|--------|
| `gamification/leaderboard` | DD-4: confirmed public |
| `gamification/sinks` | DD-4: confirmed public |
| `geocode` | Nominatim proxy — no sensitive data |
| `public/categories` | Public catalog |
| `public/pricing` | Public pricing page |
| `public/v1/*` (4 routes) | TI-NEW-1: Documented, product decisions pending |
| `atlas/inventory` | Dev tooling — file read only |

### Remove (6 routes)

| Route | Reason |
|-------|--------|
| `participants/[participantId]/actions` | 410 Gone stub |
| `sessions/[sessionId]/actions` | 410 Gone stub |
| `play/sessions/[id]/artifacts/snapshot` | 410 Gone stub |
| `atlas/annotations` | SEC-009: should be dev-only |
| `sandbox/inventory` | Dev tooling |
| `health` | Already wrapped, but included for completeness |

---

## 6. Regression Impact

### What later audits become easier if these findings are fixed first:

| Finding | Domains Unblocked |
|---------|-------------------|
| **APC-001 (error format)** | Every domain audit can skip error format checking if wrapper is the standard |
| **APC-003/011 (sessions admin fallback)** | Sessions & Participants audit — removes a major risk vector |
| **APC-006 (consent/log)** | Abuse & Privacy audit — one less unprotected write endpoint |
| **APC-008 (tenantAuth migration)** | Every admin domain audit benefits from consistent auth pattern |
| **APC-004 (validation)** | Every domain audit can skip validation checking for migrated routes |
| **Phase 3A-E wrapper migration** | Increases coverage to 24%, giving consistent auth/validation/error for those routes |

---

## 7. Priority Remediation Order

1. **APC-006** (P1) — Add rate limiting + Zod validation to `consent/log`. Quick fix, high impact.
2. **APC-003/011** (P1) — Remove `supabaseAdmin` fallback from `sessions/route.ts`. Security fix.
3. **Phase 3A-E batch** — Migrate 33 `requireAuth/SystemAdmin/TenantRole/SessionHost/CronOrAdmin` routes. Low risk, high coverage gain.
4. **APC-004** — Add Zod validation to highest-risk mutation routes (financial, GDPR, admin operations).
5. **APC-005** — Add rate limiting to unprotected mutation routes (billing, media/upload, enterprise/quote).
6. **APC-008** — DD-1 design finalization + tenantAuth batch migration (Phase 3 proper).

---

## 8. Connection to Prior Audits

| Prior Finding | API Consistency Status |
|---------------|----------------------|
| SEC-001 (snapshots auth) | ✅ Fixed |
| SEC-002a (critical route rate limiting) | ✅ Fixed |
| SEC-002b (long-tail rate limiting) | ⬜ Open — confirmed as APC-005 (7.3% coverage) |
| SEC-003 (tenant-auth wrapper mode) | ⬜ Open — confirmed as APC-008 (72 routes) |
| SEC-004 (participant token auth) | ⬜ Open — confirmed as APC-009 (14 routes) |
| SEC-005 (error response formats) | ⬜ Open — confirmed as APC-001 (4 formats) |
| SEC-008 (game-reactions/batch no auth) | ⬜ Open — confirmed RLS-only in APC-002 |
| SEC-009 (atlas/annotations GET in prod) | ⬜ Open — in removal list |
| SEC-011 (RLS-only routes) | ⬜ Open — confirmed as APC-002 (13 routes) |
| TI-001 (games builder) | ✅ Fixed |
| TI-004 (tenant GET auth gap) | ⬜ Deferred P2 — confirmed as APC-013 |
| TI-005 (consent log hardening) | ⬜ Open — confirmed as APC-006 |
| DD-1 (canonical admin check) | ✅ Decided — migration tracked as APC-008 |
| DD-2 (participant auth) | ✅ Approved in principle — tracked as APC-009 |
| DD-3 (rate limiting defaults) | ✅ Decided — tracked as APC-005 |
| DD-4 (public leaderboard/sinks) | ✅ Decided — in intentionally-public list |

---

## Summary Table

| ID | Finding | Typ | Severity | Root Cause | Effort |
|----|---------|-----|----------|------------|--------|
| APC-001 | 4 different error response formats | ARCH | P1 | No enforced standard before wrapper | Low (wrapper migration converges this) |
| APC-002 | 13 RLS-only routes no app-level auth | AUTH | P2 | Defense-in-depth gap | Low per route |
| APC-003 | sessions/route.ts service role fallback | AUTH | P1 | Legacy pattern | ✅ RESOLVED |
| APC-004 | ~158 mutation routes no input validation | ARCH | P2 | No enforced standard | Medium (gradual) |
| APC-005 | 93% routes have no rate limiting | AUTH | P2 | SEC-002b known gap | Medium (gradual) |
| APC-006 | consent/log unauthenticated + service role | AUTH | P1 | Missing auth + rate limit | Low (quick fix) |
| APC-007 | billing/usage/aggregate x-api-key pattern | ARCH | P2 | Non-standard auth | Low (document) |
| APC-008 | 72 tenantAuth routes need DD-1 migration | ARCH | P2 | Legacy utility | High (batch migration) |
| APC-009 | 14 participant-token routes need DD-2 | ARCH | P2 | Missing wrapper mode | Medium (design + migrate) |
| APC-010 | 15+ hidden auth patterns | ARCH | P2 | Organic growth | Medium (incremental) |
| APC-011 | sessions/route.ts admin fallback | AUTH | P1 | Same root as APC-003 | ✅ RESOLVED |
| APC-012 | 3 deprecated 410 stubs | ARCH | P3 | Dead code | Trivial |
| APC-013 | GET/mutation auth asymmetry | AUTH | P2 | Known (TI-004) | Low per route |
| APC-014 | Wrapper multi-method usage undocumented | DOC | P3 | Missing docs | Trivial |

> **Note:** APC-003 and APC-011 describe the same underlying issue (`sessions/route.ts` service role fallback) from different angles. They were fixed together as a single remediation task. ✅ **RESOLVED (2026-03-14)** — RLS policy + route refactor.
