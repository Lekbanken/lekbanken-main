# Games / Library — Regression Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-14
- Last updated: 2026-03-21
- Last validated: 2026-03-14

> Closed regression audit for the games domain after launch-readiness remediation. Use `launch-readiness/launch-control.md` for current program status and the original games audit plus remediation records for upstream context.

**Domain:** Games / Library  
**Audit Date:** 2026-03-14  
**Auditor:** Claude (AI)  
**Scope:** Verify M1–M3 remediation fixes intact, no new regressions  
**Verdict:** PASS — 0 new P0/P1. All M1–M3 fixes verified intact. Domain is test-group-ready for current scope.

---

## 1. Regression Scope

Games domain had 14 findings (0 P0, 3 P1, 8 P2, 3 P3) with M1–M3 remediation completing 7 fixes. Regression verifies:

1. **Snapshot auth + ownership** (GAME-002 M1)
2. **DELETE gate + force-delete** (GAME-001a M2, GAME-001b M1)
3. **PATCH service-role fix** (GAME-001c M3)
4. **Search sanitization** (GAME-004 M2)
5. **Reactions batch cap** (GAME-005 M1)
6. **Builder error handling** (GAME-009 M3)
7. **Auth/wrapper coverage** (all routes)
8. **Tenant boundary / shared catalog** (cross-cutting)

---

## 2. Files Reviewed

### API Routes (18 handlers across 16 files)
- `app/api/games/route.ts` — POST create
- `app/api/games/[gameId]/route.ts` — GET/PATCH/DELETE
- `app/api/games/[gameId]/snapshots/route.ts` — GET/POST
- `app/api/games/[gameId]/triggers/route.ts` — GET
- `app/api/games/[gameId]/roles/route.ts` — GET
- `app/api/games/[gameId]/related/route.ts` — GET
- `app/api/games/[gameId]/artifacts/route.ts` — GET
- `app/api/games/[gameId]/publish/route.ts` — POST
- `app/api/games/search/route.ts` — POST
- `app/api/games/search/helpers.ts` — search schema + helpers
- `app/api/games/featured/route.ts` — GET
- `app/api/games/builder/route.ts` — POST create
- `app/api/games/builder/[id]/route.ts` — GET/PUT
- `app/api/games/csv-import/route.ts` — POST
- `app/api/games/csv-export/route.ts` — GET
- `app/api/games/utils.ts` — `getAllowedProductIds`
- `app/api/game-reactions/batch/route.ts` — POST

---

## 3. Area 1 — Snapshot Auth + Ownership (GAME-002 M1)

**File:** `app/api/games/[gameId]/snapshots/route.ts`

| Check | Status | Detail |
|-------|--------|--------|
| `apiHandler({ auth: 'user' })` on GET | ✅ | Authenticated only |
| `apiHandler({ auth: 'user', input: postSchema })` on POST | ✅ | Zod validation + auth |
| `verifySnapshotAccess()` called by both handlers | ✅ | Lines 53, 86 |
| Function checks game exists | ✅ | Returns `null` if no game |
| Non-system_admin requires tenant role (admin/owner/editor) | ✅ | `requireTenantRole` called |
| Snapshot POST uses `auth!.user!.id` for `created_by` | ✅ | Line 90 |

**Result:** GAME-002 fix intact ✅

---

## 4. Area 2 — DELETE Gate + Force-delete (GAME-001a/b M1+M2)

**File:** `app/api/games/[gameId]/route.ts` (DELETE handler)

| Check | Status | Detail |
|-------|--------|--------|
| Wrapped with `apiHandler({ auth: 'user' })` | ✅ | GAME-001a: wrapped |
| Explicit role check: `!isSystemAdmin && !isTenantElevated → 403` | ✅ | Defense-in-depth over RLS |
| Force-delete gate: `forceDelete && !isSystemAdmin → 403` | ✅ | GAME-001b: system_admin only |
| Non-system-admin uses RLS client | ✅ | `isSystemAdmin ? supabaseAdmin : rlsClient` |
| Active session check (game_sessions + participant_sessions) | ✅ | Returns 409 with `ACTIVE_SESSIONS` code |
| Force-delete ends sessions before delete | ✅ | Updates to completed/ended |

**Result:** GAME-001a/b fixes intact ✅

---

## 5. Area 3 — PATCH Service-Role Fix (GAME-001c M3)

**File:** `app/api/games/[gameId]/route.ts` (PATCH handler)

| Check | Status | Detail |
|-------|--------|--------|
| `apiHandler({ auth: 'user' })` | ✅ | |
| Role check: `!isSystemAdmin && !isTenantElevated → 403` | ✅ | |
| Comment: `// GAME-001c: use RLS client for non-system-admin callers` | ✅ | Fix documented inline |
| `isSystemAdmin ? supabaseAdmin : rlsClient` | ✅ | Non-admins go through RLS |
| Tenant ownership check for non-system-admin callers | ✅ | Verifies `owner_tenant_id === activeTenantId` |
| `validateGamePayload(body, { mode: 'update' })` | ✅ | Input validation |

**Result:** GAME-001c fix intact ✅

---

## 6. Area 4 — Search Sanitization (GAME-004 M2)

**File:** `app/api/games/search/route.ts`

| Check | Status | Detail |
|-------|--------|--------|
| `searchSchema` Zod validation on body | ✅ | Search max 200 chars, pageSize max 48 |
| Demo search: `search.replace(/[,()]/g, '')` | ✅ | Line ~103, before `.or()` interpolation |
| Non-demo search: `search.replace(/[,()]/g, '')` | ✅ | Line ~255, before `.or()` interpolation |
| `tenantId` validated as UUID by Zod | ✅ | `z.string().uuid()` prevents injection in `.or()` |
| `groupSizes` validated as enum | ✅ | `z.enum(['small', 'medium', 'large'])` |
| `sort` validated as enum | ✅ | `z.enum([...6 values])` |

**File:** `app/api/games/featured/route.ts`
| `tenantId` validated as UUID | ✅ | `z.string().uuid()` in `querySchema` |

**File:** `app/api/games/[gameId]/related/route.ts`
| `tenantId` validated as UUID | ✅ | `z.string().uuid()` in `querySchema` |

**Result:** GAME-004 fix intact. All `.or()` interpolation sites protected. ✅

---

## 7. Area 5 — Reactions Batch Cap (GAME-005 M1)

**File:** `app/api/game-reactions/batch/route.ts`

| Check | Status | Detail |
|-------|--------|--------|
| `apiHandler({ auth: 'user', rateLimit: 'api', input: batchSchema })` | ✅ | All three controls |
| `batchSchema`: `z.array(z.string().uuid()).min(1).max(100)` | ✅ | Cap at 100 game IDs |
| Uses `createServerRlsClient()` | ✅ | RLS, not service-role |
| RPC call with validated gameIds | ✅ | `get_game_reactions_batch` |

**Result:** GAME-005 fix intact ✅

---

## 8. Area 6 — Builder Error Handling (GAME-009 M3)

**File:** `app/api/games/builder/[id]/route.ts` (PUT handler)

| Check | Status | Detail |
|-------|--------|--------|
| `const warnings: string[] = []` initialized | ✅ | GAME-009 pattern |
| Steps delete → `{ error: stepDelErr }` checked | ✅ | Pushes to warnings |
| Steps upsert → `{ error: stepUpsErr }` checked | ✅ | Pushes to warnings |
| Materials delete/insert → errors checked | ✅ | Both push to warnings |
| Secondary purposes delete/insert → errors checked | ✅ | Both push to warnings |
| Phases delete/upsert → errors checked | ✅ | Both push to warnings |
| Roles delete/upsert → errors checked | ✅ | Both push to warnings |
| Board config upsert/delete → errors checked | ✅ | Both push to warnings |
| Cover media delete/insert → errors checked | ✅ | Both push to warnings |
| Artifacts read/delete → errors checked | ✅ | Pushes to warnings |
| Artifact variants delete → errors checked | ✅ | Pushes to warnings |
| Triggers delete/upsert → errors checked | ✅ | Pushes to warnings |
| Final response: `{ success: true, warnings }` if any | ✅ | Client can detect partial save |
| `console.warn` with warnings | ✅ | Server-side observability |

**Result:** GAME-009 fix intact. All 20+ operations now check errors. ✅

---

## 9. Area 7 — Auth/Wrapper Coverage

| Route | Method | Auth | Wrapper | Status |
|-------|--------|------|---------|--------|
| `/api/games` | POST | `user` | `apiHandler` | ✅ |
| `/api/games/[gameId]` | GET | `public` | `apiHandler` | ✅ |
| `/api/games/[gameId]` | PATCH | `user` | `apiHandler` | ✅ |
| `/api/games/[gameId]` | DELETE | `user` | `apiHandler` | ✅ |
| `/api/games/[gameId]/snapshots` | GET | `user` | `apiHandler` | ✅ |
| `/api/games/[gameId]/snapshots` | POST | `user` | `apiHandler` | ✅ |
| `/api/games/[gameId]/publish` | POST | `user` | `apiHandler` | ✅ |
| `/api/games/[gameId]/related` | GET | `public` | `apiHandler` | ✅ |
| `/api/games/[gameId]/triggers` | GET | auth'd | `requireGameAuth` | ⚠️ GAME-012 |
| `/api/games/[gameId]/roles` | GET | auth'd | `requireGameAuth` | ⚠️ GAME-012 |
| `/api/games/[gameId]/artifacts` | GET | auth'd | `requireGameAuth` | ⚠️ GAME-012 |
| `/api/games/search` | POST | `public` | `apiHandler` | ✅ |
| `/api/games/featured` | GET | `public` | `apiHandler` | ✅ |
| `/api/games/builder` | POST | `user` | `apiHandler` | ✅ |
| `/api/games/builder/[id]` | GET | `user` | `apiHandler` | ✅ |
| `/api/games/builder/[id]` | PUT | `user` | `apiHandler` | ✅ |
| `/api/games/csv-import` | POST | `user` | `apiHandler` | ✅ |
| `/api/games/csv-export` | GET | `user` | `apiHandler` | ✅ |
| `/api/game-reactions/batch` | POST | `user` | `apiHandler` | ✅ |

15/18 handlers wrapped with `apiHandler`. 3 use `requireGameAuth` (known GAME-012, P3 deferred M4). No regression — pre-M1 state unchanged.

---

## 10. Area 8 — Tenant Boundary / Shared Catalog

| Check | Status | Detail |
|-------|--------|--------|
| POST create: `requireTenantRole` for tenant games | ✅ | `system_admin` for global |
| PATCH: tenant ownership check | ✅ | `owner_tenant_id === activeTenantId` |
| DELETE: non-admin through RLS | ✅ | RLS enforces tenant boundary |
| Builder POST: TI-001 membership validation | ✅ | Checks `memberships` array |
| Builder GET/PUT: TI-001 membership validation | ✅ | Checks `memberships` array |
| CSV import: `requireTenantRole` | ✅ | admin/owner in target tenant |
| CSV export: `requireTenantRole` for tenant / `system_admin` for global | ✅ | |
| Search: `allowedProductIds` + tenant scoping | ✅ | Seat-based entitlement check |
| Featured: `allowedProductIds` + tenant scoping | ✅ | |
| Related: `allowedProductIds` + tenant scoping | ✅ | |
| Artifacts: `correctCode` stripped from metadata | ✅ | Security measure F8 |
| Triggers: content strings stripped from actions | ✅ | Security measure F7 |

**Result:** Tenant boundaries intact ✅

---

## 11. Security Measures Verified

| Measure | Status |
|---------|--------|
| F7 — Trigger content stripping (puzzle solutions) | ✅ intact |
| F8 — Artifact `correctCode` stripping | ✅ intact |
| PostgREST DSL injection protection | ✅ at all 2 search sites + UUID validation on tenantId |
| `validateGamePayload()` on create/update/publish | ✅ called in all mutation paths |
| Active session check before game delete | ✅ checks both game_sessions and participant_sessions |

---

## 12. Known Deferrals (Unchanged from Audit)

| Finding | Severity | Status | Notes |
|---------|----------|--------|-------|
| GAME-003 | P2 | M4 deferred | Builder non-atomic (26 sequential DB ops). Low concurrency risk. |
| GAME-006 | P2 | M4 deferred | No rate limiting on public endpoints (search/featured). |
| GAME-007 | P2 | M4 deferred | `validateGamePayload` lacks Zod — no string length limits. |
| GAME-008 | P2 | M4 deferred | Shared catalog visibility undocumented (product decision). |
| GAME-010 | P3 | M4 deferred | Publish route misses `system_admin` role check. |
| GAME-011 | P3 | N/A | Public v1 routes tracked in Tenant Isolation audit. |
| GAME-012 | P3 | M4 deferred | triggers/roles/artifacts use `requireGameAuth` not `apiHandler`. |

All 7 deferrals are post-launch scope. No status change.

---

## 13. New Findings

None. 0 new P0/P1/P2/P3 findings.

---

## 14. Final Verdict

**PASS** — Games / Library domain is test-group-ready for current scope.

- 0 P0 or P1
- All 7 M1–M3 fixes verified intact
- All 8 regression areas pass
- 0 new findings
- 7 previously known M4 deferrals unchanged
- 18 handlers verified (15 apiHandler + 3 requireGameAuth)
- Tenant boundary, search sanitization, security measures all intact
