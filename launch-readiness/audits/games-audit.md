# Games System Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed launch-readiness audit for the games domain, including library, builder, publish flow, snapshots, and import/export. Use `launch-readiness/launch-control.md` for current program status and the corresponding regression or remediation records for follow-up state.

> **Status:** Complete (GPT-calibrated) — M1+M2 remediation done  
> **Date:** 2026-03-11  
> **Calibrated:** 2026-03-11 — severity adjustments per GPT feedback (GAME-001 split, GAME-003/004 reclassified, GAME-008 reframed)  
> **M1 implemented:** 2026-03-12 — GAME-002 ✅, GAME-005 ✅, GAME-001b ✅  
> **M2 implemented:** 2026-03-12 — GAME-004 ✅, GAME-001a ✅  
> **Auditor:** Claude  
> **Domain scope:** Game library, browsing, search, authoring (builder), snapshot pipeline, import/export, reactions, publish, game detail  
> **Routes audited:** 23 route files (~30 handlers)  
> **Feature files audited:** ~80+ files across `features/browse/`, `features/admin/games/`, `app/admin/games/builder/`, `components/game/`, `lib/game-display/`, `lib/validation/`, `lib/import/`

---

## GPT Calibration Answers

> **Q1: Är GAME-001 egentligen 3 findings?**

Ja. Delat i GAME-001a (DELETE utan app-level gate, defense-in-depth — P1), GAME-001b (`?force=true` destruktiv sidoeffekt utan strikte roll — P1), GAME-001c (PATCH service-role bypass — P2). Tre separata remediation-uppgifter.

> **Q2: Är GAME-003 observerad launch-risk eller high-effort P2?**

**P2-high.** Verifierat: Buildern är admin-only (editor/admin/owner-roll krävs), save triggas bara av explicit knappklick (ingen auto-save), förväntad concurrent load är låg. 26 sekventiella DB-operationer varav 20 saknar felhantering — allvarlig teknisk skuld, men inte launch-trafik-risk. Atomär RPC (`upsert_game_content_v1`) finns och kan återanvändas, men kräver anpassning. P2-high med not om att det är den största tekniska skulden i Games-domänen.

> **Q3: Är GAME-004 verifierad exploit-risk eller "unsafe pattern needing sanitization"?**

**Unsafe pattern, inte verifierad exploit.** Verifierat: PostgREST DSL-kommainjection kan lägga till extra filter-villkor, men (1) AND-filter som `.eq('status', 'published')` kan inte kringgås av OR-injections, (2) RLS gäller fortfarande, (3) SELECT-klausulen är fast (kan inte läsa extra kolumner), (4) UUID-typade kolumner → type-error vid injektionsförsök, (5) publika routes maskerar felmeddelanden. Nedgraderat till **P2** — reell injektionsvektor men ingen bevisad access bypass.

> **Q4: Är GAME-008 ett problem eller ett dokumentationsbeslut?**

**Dokumentationsbeslut.** RLS-policyn tillåter uttryckligen att publicerade spel visas för alla tenant-medlemmar. `canViewGame()` följer den designen. Omformulerat till "Shared catalog visibility not explicitly documented" (P2 → design decision).

> **Q5: Vilka 2–3 saker ger mest riskreduktion per timme?**

1. **GAME-002** — Snapshots auth + error leakage (hög risk, låg effort)
2. **GAME-005** — Reactions batch auth + max(100) (hög risk, låg effort)
3. **GAME-001b** — `?force=true` destruktiv gate (hög impact, låg effort)

---

## 1. Findings Summary

| Severity | Count | Resolved | Finding IDs |
|----------|-------|----------|-------------|
| P0 — Launch blocker | 0 | 0 | — |
| P1 — Must fix before launch | 3 | 3 | ~~GAME-001b~~, ~~GAME-002~~, ~~GAME-001a~~ |
| P2 — Should fix, not blocker | 8 | 4 | ~~GAME-005~~, ~~GAME-004~~, ~~GAME-001c~~, GAME-003, GAME-006, GAME-007, GAME-008, ~~GAME-009~~ |
| P3 — Nice to have | 3 | 0 | GAME-010, GAME-011, GAME-012 |
| **Total** | **14** | **7** | |

---

## 2. Route Inventory

### Wrapped Routes (using `apiHandler`)

| Route | Methods | Auth | Zod `input` | Rate Limit | Status |
|-------|---------|------|-------------|------------|--------|
| `POST /api/games` | POST | `user` | ❌ (manual `validateGamePayload`) | ❌ | ⚠️ |
| `GET /api/games/[gameId]/related` | GET | `public` | ❌ (manual `safeParse`) | ❌ | OK |
| `POST /api/games/search` | POST | `public` | ❌ (manual `safeParse`) | ❌ | ⚠️ |
| `GET /api/games/featured` | GET | `public` | ❌ (manual `safeParse`) | ❌ | OK |
| `POST /api/games/builder` | POST | `user` | ❌ (manual body cast) | ❌ | ⚠️ |
| `GET /api/games/builder/[id]` | GET | `user` | ❌ | ❌ | OK |
| `PUT /api/games/builder/[id]` | PUT | `user` | ❌ (manual body cast) | ❌ | ⚠️ |
| `POST /api/games/csv-import` | POST | `user` + `requireTenantRole` | ❌ | ❌ | OK |
| `GET /api/games/csv-export` | GET | `user` + `requireTenantRole` | ❌ | ❌ | OK |
| `GET /api/browse/filters` | GET | `public` | ❌ | ❌ | OK |
| `POST /api/admin/games/search` | POST | `system_admin` | ✅ | ❌ | OK |
| `POST /api/admin/games/bulk` | POST | `system_admin` | ✅ | ❌ | OK |
| `POST /api/games/[gameId]/publish` | POST | `user` | ❌ (manual) | ❌ | OK |
| `GET /api/admin/products/[pid]/games` | GET | `system_admin` | ❌ | ❌ | OK |
| `DELETE /api/admin/products/[pid]/games/[gid]` | DELETE | `system_admin` | ❌ | ❌ | OK |

### Unwrapped Routes (raw `export async function`)

| Route | Methods | Auth | Issue |
|-------|---------|------|-------|
| `GET/PATCH/DELETE /api/games/[gameId]` | 3 | `apiHandler` — GET: `public`, PATCH: `user`, DELETE: `user` + role gate | ✅ **GAME-001a FIXED** — wrapped + explicit admin/owner/system_admin gate on DELETE |
| `GET/POST /api/games/[gameId]/snapshots` | 2 | `apiHandler({ auth: 'user' })` + `requireTenantRole` | ✅ **GAME-002 FIXED** — ownership check + Zod + error leakage removed |
| `GET /api/games/[gameId]/triggers` | 1 | `requireGameAuth` + `canViewGame` | OK — good sanitization |
| `GET /api/games/[gameId]/roles` | 1 | `requireGameAuth` + `canViewGame` | OK |
| `GET /api/games/[gameId]/artifacts` | 1 | `requireGameAuth` + `canViewGame` | OK — strips `correctCode`, filters variants |
| `GET /api/public/v1/games` | 1 | **None** | Already tracked (TI-NEW-1b, P3) |
| `GET /api/public/v1/games/[id]` | 1 | **None** | Already tracked (TI-NEW-1d, P2) |
| `POST /api/game-reactions/batch` | 1 | `apiHandler({ auth: 'user' })` + Zod + `rateLimit: 'api'` | ✅ **GAME-005 FIXED** — batch capped at 100, error leakage removed |
| `GET /api/play/sessions/[id]/game` | 1 | Dual auth (host/participant) | OK — well-defended |

---

## 3. Findings Detail

### GAME-001a — DELETE lacks explicit app-level role gate (P1) ✅ **FIXED (M2)**

**Category:** Security / Authorization — Defense-in-depth  
**Location:** [app/api/games/[gameId]/route.ts](app/api/games/%5BgameId%5D/route.ts)

**Description:** The DELETE handler resolves `isSystemAdmin` (for choosing `supabaseAdmin` vs `rlsClient`) but never checks `isTenantElevated` or any admin/owner requirement. Any authenticated user reaches the `supabase.from('games').delete()` call.

**RLS mitigation:** The `games_delete_admin` policy requires `admin`/`owner` membership via `has_tenant_role()`. This provides real protection. The risk is defense-in-depth: a regression in RLS policies would expose unrestricted game deletion.

**GET context:** GET allows unauthenticated access (proceeds with `rlsClient` when `user` is null). This is intentional for the shared catalog, not a finding.

**Impact:** Low likelihood (RLS blocks), high impact if RLS regresses.

**Recommendation:** Wrap route in `apiHandler`. Add explicit role check on DELETE: `admin`/`owner` tenant role or `system_admin`.

**Resolution (2026-03-12):** All 3 handlers (GET/PATCH/DELETE) wrapped in `apiHandler`. GET uses `auth: 'public'` (shared catalog browsing). PATCH uses `auth: 'user'` (existing inline role check preserved). DELETE uses `auth: 'user'` with explicit app-level gate: checks `app_metadata.role` for `system_admin`/`admin`/`owner` before proceeding. Non-elevated users get 403. RLS still enforces tenant-scoped deletion for non-system-admin callers.

DELETE access matrix:
| Role | App gate | RLS | Result |
|------|----------|-----|--------|
| system_admin | ✅ pass | bypass (supabaseAdmin) | ✅ Delete any game |
| owner | ✅ pass | ✅ if tenant match | ✅ Delete own tenant's games |
| admin | ✅ pass | ✅ if tenant match | ✅ Delete own tenant's games |
| editor | ❌ 403 | ❌ blocked | ❌ Cannot delete |
| member | ❌ 403 | ❌ blocked | ❌ Cannot delete |
| unauthenticated | ❌ 401 (wrapper) | N/A | ❌ Cannot delete |

---

### ~~GAME-001b — `?force=true` DELETE force-terminates sessions, accessible to non-system-admins (P1)~~ ✅ **FIXED (M1)**

**Category:** Security / Destructive operation  
**Location:** [app/api/games/[gameId]/route.ts](app/api/games/%5BgameId%5D/route.ts)

**Description:** DELETE accepts a `?force=true` query parameter that force-terminates all active sessions for the game (`game_sessions.status→completed`, `participant_sessions.status→ended`) using `supabaseAdmin`. This destructive side-effect is accessible to any tenant admin/owner who passes RLS for the delete itself.

Force-ending sessions affects live participants immediately. This should require `system_admin`.

**Impact:** Tenant admins can disrupt active sessions by force-deleting a game. Participants lose their session mid-play.

**Recommendation:** Gate `?force=true` behind `system_admin` role. Tenant admins should only be able to delete games with no active sessions.

**Resolution (2026-03-12):** Added explicit check: `if (forceDelete && !isSystemAdmin) → 403`. Non-system-admin callers now get 403 on `?force=true`.

---

### ~~GAME-001c — PATCH uses service-role client, bypassing RLS (P2)~~ ✅ **FIXED (M3)**

**Category:** Security / Service-role bypass  
**Location:** [app/api/games/[gameId]/route.ts](app/api/games/%5BgameId%5D/route.ts)

**Description:** PATCH uses `supabaseAdmin` unconditionally for the update, bypassing the `games_update_leader` RLS policy. It has a manual tenant-ownership check, but this relies on correct implementation rather than RLS enforcement.

Same root cause as APC-003 pattern — service role used where RLS client would suffice.

**Impact:** If the manual tenant check has a bug, any authenticated user could update any game.

**Recommendation:** Switch to RLS client for non-system-admin callers. Align with APC-003 remediation pattern.

---

### ~~GAME-002 — Snapshots route allows any authenticated user to create snapshots for any game (P1)~~ ✅ **FIXED (M1)**

**Category:** Security / Authorization  
**Location:** [app/api/games/[gameId]/snapshots/route.ts](app/api/games/%5BgameId%5D/snapshots/route.ts)

**Description:** Both GET and POST handlers check `user !== null` but perform **no role or ownership check**. Any authenticated user can:

1. List all snapshots for any game (GET)
2. Create a new snapshot for any game they don't own (POST)

POST calls `create_game_snapshot` RPC via `createServiceRoleClient()` — completely bypassing RLS.

Additional issues:
- **Error `details` leaks DB internals** — `{ error: 'Failed to create snapshot', details: error.message }` exposes raw Supabase errors to clients
- **No input validation** — `versionLabel` is cast from body with no length limit or sanitization
- **No rate limiting** — allows snapshot spam

**Impact:** Any authenticated user from any tenant can create unlimited snapshots for any game, consuming storage and creating noise. Snapshot listing could reveal internal version history.

**Recommendation:** Wrap in `apiHandler({ auth: 'user' })`. Add ownership/role check (must be editor/admin/owner of the game's tenant, or system_admin). Remove `details` from error responses. Add Zod schema with `versionLabel: z.string().max(100).optional()`.

**Resolution (2026-03-12):** Full rewrite — both handlers wrapped in `apiHandler({ auth: 'user' })`. Access check via `verifySnapshotAccess()`: system_admin bypasses, others require `requireTenantRole(['admin', 'owner', 'editor'], game.owner_tenant_id)`. `editor` included to align with `game_snapshots` INSERT RLS policy which explicitly allows `owner/admin/editor`. Returns 404 on access denial (no existence leakage). Zod schema: `versionLabel: z.string().max(100).optional()`. All `details: error.message` removed. Service-role client still used for snapshot queries (table has no RLS policy for user-scoped reads).

---

### GAME-003 — Builder PUT is non-atomic, partial failures corrupt game state (P2-high)

**Category:** Reliability / Data Integrity — Technical debt  
**Location:** [app/api/games/builder/[id]/route.ts](app/api/games/builder/%5Bid%5D/route.ts)

**Description:** The builder PUT handler performs **26 sequential database operations** across 10 tables without a database transaction. A failure midway leaves the game in a partial/corrupt state.

**Calibration note:** Verified as **P2-high**, not P1, because:
- Builder is admin-only (requires editor/admin/owner tenant role)
- Save is explicit button-click only (no auto-save → no background PUT storms)
- Expected concurrency is very low (content creators, not participants)
- No observed partial-save incidents reported

However, this is the **largest single technical debt item** in the Games domain:
- 20 of 26 DB operations silently ignore errors (user sees "success" when data is lost)
- Partial save can leave a game in internally inconsistent state (e.g. steps referencing non-existent phases), which **could break the play system** when the game is used by participants
- Zero recovery mechanism — no pre-save snapshots, no server-side undo

An atomic RPC (`upsert_game_content_v1`) already exists for CSV import and could be adapted.

**Impact:** Medium likelihood (network issues during save), high impact (data corruption → potential play-time errors). Mitigated by low concurrency.

**Recommendation:** Create `save_game_builder_v1` RPC wrapping all mutations atomically. Alternatively, add error checking to all 20 silent operations as a stopgap. Deferred to post-launch unless data corruption is observed.

---

### GAME-004 — PostgREST filter DSL interpolation — unsafe pattern needing sanitization (P2) ✅ **FIXED (M2)**

**Category:** Security / Injection — Unsafe pattern  
**Location:** [app/api/games/search/route.ts](app/api/games/search/route.ts) (lines 102, 247), [app/api/admin/games/search/route.ts](app/api/admin/games/search/route.ts) (line 62), [lib/services/gameService.ts](lib/services/gameService.ts) (lines 72, 149)

**Description:** Search queries interpolate user input directly into PostgREST filter DSL strings:

```typescript
query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
```

The `@supabase/postgrest-js` `.or()` method performs **zero escaping** (confirmed in source). Characters `,`, `.`, `(`, `)` have special meaning in the DSL. A crafted input like `%,status.eq.draft` would inject an additional filter clause.

**Calibration note:** Verified as **unsafe pattern**, not confirmed exploit. Defense-in-depth limits impact:
- AND filters (e.g. `.eq('status', 'published')`) are separate URL params — injected OR clauses cannot override them
- RLS policies still apply — no cross-row access beyond normal permissions
- SELECT clause is fixed — attacker cannot read extra columns
- UUID-typed columns → type error (400) on most injection attempts
- Public routes mask error messages — no schema leak

The realistic worst case is **filter manipulation within the same table and existing permissions** (e.g. forcing a specific published game into results). Practical impact is negligible.

Also affects 9+ admin-only routes (server actions for tickets, achievements, etc.) — lower risk since they require `system_admin`.

**Impact:** Negligible practical exploit — RLS + type enforcement + AND-filter isolation contain it. Pattern is unsafe by `postgrest-js` documentation standard.

**Recommendation:** Sanitize search input by stripping `,`, `(`, `)` before interpolation. Simple regex: `search.replace(/[,()]/g, '')`. Apply to all `.or()` interpolation sites.

**Resolution (2026-03-12):** Applied `search.replace(/[,()]/g, '')` at all 5 `.or()` interpolation sites:
1. `app/api/games/search/route.ts` — demo path search filter
2. `app/api/games/search/route.ts` — main path search filter
3. `app/api/admin/games/search/route.ts` — admin search filter
4. `lib/services/gameService.ts` — `searchGames()` function
5. `lib/services/gameService.ts` — `getTenantGames()` function

Sanitization is minimal and deterministic: only strips `,()` (PostgREST DSL metacharacters). Dots, wildcards, and other characters are preserved for legitimate search. Empty results after sanitization skip the `.or()` call entirely.

---

### GAME-005 — game-reactions/batch has no explicit auth and no batch size limit (P2 — taken early in M1)

**Category:** Security / DoS  
**Location:** [app/api/game-reactions/batch/route.ts](app/api/game-reactions/batch/route.ts)

**Description:**
1. **No explicit auth check** — uses `createServerRlsClient()` and relies entirely on RLS for the `get_game_reactions_batch` RPC. If the RPC has permissive anon access, reactions leak.
2. **No batch size limit** — `gameIds` array accepts any number of UUIDs. A request with 10,000 game IDs would be processed, creating DB load.
3. **Error `error.message` leaks DB internals** in 500 responses.
4. **No rate limiting.**
5. **Not wrapped in `apiHandler`.**

**Impact:** Potential denial-of-service via large batch requests. Error message leakage. Missing defense-in-depth on auth.

**Severity rationale:** P2 (not P1) because RLS provides real auth protection — the gap is defense-in-depth + DoS, not a true auth bypass. Included in M1 despite P2 severity because the fix is trivial (wrap + Zod schema, ~15 min) — highest ROI item in the remediation plan.

**Recommendation:** Wrap in `apiHandler({ auth: 'user' })`. Add Zod schema with `gameIds: z.array(z.string().uuid()).max(100)`. Remove `error.message` from response.

**Resolution (2026-03-12):** Wrapped in `apiHandler({ auth: 'user', rateLimit: 'api' })`. Zod schema: `gameIds: z.array(z.string().uuid()).min(1).max(100)`. Error response no longer leaks `error.message`. RLS client preserved for user-scoped reaction queries.

---

### GAME-006 — No rate limiting on any Games route (P2)

**Category:** Security / Availability — Domain-wide hardening  
**Location:** All Games domain routes

**Description:** Zero of the 23 game route files have rate limiting configured. This includes public endpoints:
- `POST /api/games/search` — public, no auth required
- `GET /api/games/featured` — public
- `GET /api/browse/filters` — public

Per DD-3, rate limiting is explicit on sensitive routes (not blanket). The search/featured/filters endpoints should have at least `'api'`-level limiting since they're public.

**Impact:** Public search endpoint can be abused for scraping or DoS.

**Recommendation:** Add `rateLimit: 'api'` to public endpoints. Domain-wide hardening — not a per-finding remediation priority.

---

### GAME-007 — `validateGamePayload` has no string length limits or runtime type checks (P2)

**Category:** Security / Input Validation  
**Location:** [lib/validation/games.ts](lib/validation/games.ts)

**Description:** The custom game validator:
1. **No string length limits** — `name`, `description`, `short_description` have no max-length, allowing multi-MB payloads
2. **No runtime type checks** — numeric fields are only type-checked at compile time
3. **No `status` enum validation** — PATCH could set arbitrary status strings
4. **No UUID validation** on `main_purpose_id`, `product_id`
5. **Not Zod** — inconsistent with wrapper `VALIDATION_ERROR` format

**Impact:** Oversized string payloads consume storage. Arbitrary status values could bypass the publish workflow (though RLS and the publish route have separate guards).

**Recommendation:** Migrate to Zod schema with `name: z.string().min(1).max(200)`, `status: z.enum(['draft', 'published', 'archived']).optional()`, UUID validation on FK fields.

---

### GAME-008 — Shared catalog visibility not explicitly documented (P2 — design decision)

**Category:** Architecture / Documentation  
**Location:** [lib/game-display/access.ts](lib/game-display/access.ts)

**Description:** `canViewGame()` checks only `game.status` and admin role, never `tenant_id`. Any authenticated user from any tenant can view any published game's triggers, roles, and artifacts via the lazy-load endpoints.

This is **consistent with the RLS design**: the `games_select` policy allows `published` games to be visible to all tenant members. The shared catalog model appears intentional but is not documented as an explicit design decision.

**This is not a vulnerability** — it's a documentation gap. If tenant-scoped game visibility is ever desired, the current architecture would need changes in both RLS and `canViewGame()`.

**Recommendation:** Document the shared catalog model as design decision DD-X in launch-control or architecture docs. No code change needed unless the design intent changes.

---

### ~~GAME-009 — Builder error handling: 20 of 26 DB operations ignore errors (P2)~~ ✅ **FIXED (M3)**

**Category:** Reliability  
**Location:** [app/api/games/builder/[id]/route.ts](app/api/games/builder/%5Bid%5D/route.ts)

**Description:** The builder PUT handler performs 26 DB operations. Only 6 check the `error` return from Supabase and return 500. The remaining 20 (steps, phases, roles, materials, secondary purposes, cover media, board config) silently swallow errors.

```typescript
// Steps — no error check
await supabase.from('game_steps').delete().eq('game_id', gameId)
await supabase.from('game_steps').upsert(stepsData, { onConflict: 'id' })
// Roles — no error check  
await supabase.from('game_roles').delete().eq('game_id', gameId)
await supabase.from('game_roles').upsert(rolesData, { onConflict: 'id' })
```

**Impact:** Users see "saved successfully" while steps/phases/roles were silently lost. Coupled with GAME-003 (non-atomic), a silent failure on step #8 means the response still shows success.

**Recommendation:** Add `{ error }` destructuring and error logging/response for all DB operations. Ideally combine with GAME-003 (transactional save) for a single remediation effort.

---

### GAME-010 — Publish route missing `system_admin` in role check (P3)

**Category:** Usability / Authorization  
**Location:** [app/api/games/[gameId]/publish/route.ts](app/api/games/%5BgameId%5D/publish/route.ts)

**Description:** The publish handler checks `role !== 'admin' && role !== 'owner'` but does not include `'system_admin'`. System administrators get a 403 when trying to publish a game.

**Impact:** Low — system admins have alternative paths. Minor UX friction.

**Recommendation:** Add `role !== 'system_admin'` to the check, or use `deriveEffectiveGlobalRole`.

---

### GAME-011 — Public v1 games routes are already tracked (P3)

**Category:** Cross-reference  
**Location:** [app/api/public/v1/games/route.ts](app/api/public/v1/games/route.ts), [app/api/public/v1/games/[id]/route.ts](app/api/public/v1/games/%5Bid%5D/route.ts)

**Description:** Already documented in the Tenant Isolation Audit:
- **TI-NEW-1b** (P3) — zero-auth published game catalog. No PII. Deferred.
- **TI-NEW-1d** (P2) — zero-auth game detail + optional stats. Deferred.

**No new action needed** — tracked under existing TI findings.

---

### GAME-012 — Play session game route is well-defended but unwrapped (P3)

**Category:** Consistency  
**Location:** [app/api/play/sessions/[id]/game/route.ts](app/api/play/sessions/%5Bid%5D/game/route.ts)

**Description:** Strong security model: dual auth (host/participant), token expiry, rejected-status check, double-layer content stripping, SECURITY TRIPWIRE logging. Not wrapped in `apiHandler`.

**Impact:** Very low — security is sound, consistency gap only.

**Recommendation:** Wrap during Phase 7 wrapper sweep. Not Games-domain remediation priority.

---

## 4. Design Analysis

### Tenant Isolation Model

The Games domain uses a **shared catalog** model:
- Published games are visible to all authenticated users (confirmed by RLS `games_select` policy)
- Mutations (insert/update/delete) are tenant-scoped via RLS policies requiring membership
- The builder has app-level TI checks (TI-001 fix from Tenant Isolation Audit — verified still in place)
- `canViewGame()` intentionally omits tenant check for published games

**Design decision (GAME-008):** Shared catalog model assumed intentional. Needs explicit documentation.

### Auth Patterns

| Pattern | Count | Routes |
|---------|-------|--------|
| `apiHandler({ auth: 'user' })` | 8 | create, builder (GET/PUT/POST), publish, csv-import, csv-export, [gameId] PATCH, [gameId] DELETE |
| `apiHandler({ auth: 'system_admin' })` | 3 | admin search, admin bulk, admin product games |
| `apiHandler({ auth: 'public' })` | 4 | search, featured, related, browse/filters, [gameId] GET |
| `requireGameAuth` + `canViewGame` | 3 | triggers, roles, artifacts |
| Raw `getUser()` | 0 | — (all migrated to apiHandler) |
| None | 2 | public/v1/games, public/v1/games/[id] |
| RLS-only | 1 | game-reactions/batch |
| Dual auth (host/participant) | 1 | play session game |

### Snapshot Pipeline

- **Trigger:** Manual via builder UI or `POST /api/games/[gameId]/snapshots`
- **Mechanism:** `create_game_snapshot` RPC (Postgres, atomic)
- **Storage:** `game_snapshots.snapshot_data` JSONB with version tracking
- **Missing:** No auto-snapshot on publish or pre-delete ("last known good" recovery)

### Import Pipeline

- **Well-structured:** CSV/JSON → parse → validate → preflight → normalize → atomic upsert
- **Atomic:** Uses `upsert_game_content_v1` RPC (all-or-nothing with subtransaction)
- **Supports dry_run** for validation-only
- **Properly gated:** `requireTenantRole` for tenant-scoped access

---

## 5. Remediation Plan

### M1 — Auth Hardening: Snapshots, Reactions, Force-Delete (GAME-002, GAME-005, GAME-001b) ✅ COMPLETE

**Priority rationale:** Highest risk reduction per hour — real auth gaps, low effort each. GAME-005 is P2 but included here because the fix is trivial (~15 min) and eliminates the only unbounded-batch endpoint in Games.

**Scope:** 3 route files, 5 handlers

| Task | Finding | Effort | Status |
|------|---------|--------|--------|
| Wrap `snapshots` GET/POST in `apiHandler({ auth: 'user' })` | GAME-002 | Medium | ✅ |
| Add ownership/role check to snapshot endpoints | GAME-002 | Low | ✅ (`verifySnapshotAccess` + `requireTenantRole`) |
| Remove `details: error.message` from snapshot error responses | GAME-002 | Low | ✅ |
| Add Zod schema: `versionLabel: z.string().max(100).optional()` | GAME-002 | Low | ✅ |
| Wrap `game-reactions/batch` in `apiHandler({ auth: 'user' })` | GAME-005 | Low | ✅ (+ `rateLimit: 'api'`) |
| Add Zod schema: `gameIds: z.array(z.string().uuid()).min(1).max(100)` | GAME-005 | Low | ✅ |
| Gate `?force=true` behind `system_admin` | GAME-001b | Low | ✅ |

**Exit criteria:**
- [x] Snapshots wrapped, ownership check added, error leakage removed ✅
- [x] Reactions batch wrapped, Zod validated, capped at 100 ✅
- [x] `?force=true` requires `system_admin` ✅
- [x] `tsc --noEmit` = 0 errors ✅

**Noteringar:**
- Snapshots: `verifySnapshotAccess()` helper checks game existence + tenant ownership. System_admin bypasses. Others need `admin`/`owner`/`editor` role via `requireTenantRole`. `editor` included to align with `game_snapshots` INSERT RLS policy (`tm.role IN ('owner', 'admin', 'editor')`). Returns 404 on denial (no existence leakage). Service-role client preserved for queries (snapshot table lacks user-scoped RLS).
- Reactions batch: `rateLimit: 'api'` added per GPT recommendation. `.min(1)` rejects empty arrays upfront.
- Force-delete: `if (forceDelete && !isSystemAdmin) → 403` — explicit role check before the destructive override activates.
- Wrapper coverage: 240/287 files (83.6%), 352/408 handlers (86.3%).

### M2 — Search Sanitization + DELETE Role Gate (GAME-004, GAME-001a) ✅ COMPLETE

**Scope:** 4 route files + 1 service file

| Task | Finding | Effort | Status |
|------|---------|--------|--------|
| Strip `,`, `(`, `)` from search input before `.or()` interpolation | GAME-004 | Low | ✅ |
| Apply to public search, admin search, and `gameService.ts` | GAME-004 | Low | ✅ |
| Wrap `games/[gameId]` GET/PATCH/DELETE in `apiHandler` | GAME-001a | Medium | ✅ |
| Add explicit role check on DELETE | GAME-001a | Low | ✅ |

**Exit criteria:**
- [x] Search sanitization applied to all 5 interpolation sites ✅
- [x] `games/[gameId]` wrapped in `apiHandler` ✅
- [x] DELETE has explicit admin/owner/system_admin gate ✅
- [x] `tsc --noEmit` = 0 errors ✅

**Noteringar:**
- Search sanitization: `search.replace(/[,()]/g, '')` — minimal, deterministic. Only PostgREST DSL metacharacters stripped. Empty result after sanitization skips the `.or()` call entirely (no empty ILIKE pattern).
- `games/[gameId]` wrapper: GET=`auth:'public'` (shared catalog, unauthenticated browsing allowed), PATCH=`auth:'user'` (inline role check preserved), DELETE=`auth:'user'` (new explicit gate added).
- DELETE gate: checks `app_metadata.role` for `system_admin`/`superadmin`/`admin`/`owner`. Editor/member/other → 403. Defense-in-depth over RLS `games_delete_admin` policy.
- Wrapper coverage: 241/287 files (84.0%), 355/408 handlers (87.0%).

### M3 — Service-Role Alignment + Builder Error Checking (GAME-001c, GAME-009) ✅ COMPLETE

**Scope:** 2 route files

| Task | Finding | Effort | Status |
|------|---------|--------|--------|
| Switch PATCH to RLS client for non-system-admin callers | GAME-001c | Medium | ✅ |
| Add error checking for all 21 silent DB operations in builder PUT | GAME-009 | Medium | ✅ |

**Exit criteria:**
- [x] PATCH uses `isSystemAdmin ? supabaseAdmin : rlsClient` ✅
- [x] All 21 silent DB operations now check `{ error }` and push to `warnings[]` ✅
- [x] Warnings logged via `console.warn` and returned in response as `{ success: true, warnings }` ✅
- [x] `tsc --noEmit` = 0 errors ✅

**Noteringar:**
- GAME-001c: `const supabase = isSystemAdmin ? supabaseAdmin : rlsClient` — matches GET/DELETE pattern. Manual tenant-ownership check retained as defense-in-depth.
- GAME-009: Added `const warnings: string[] = []` after game core update. All 21 previously-silent operations (steps delete/upsert, materials delete/insert, secondary_purposes delete/insert, phases delete/upsert, roles delete/upsert, board_config upsert/delete, cover_media delete/insert, artifacts read/delete, artifact_variants delete, triggers delete) now destructure `{ error }` and collect warnings. Non-fatal: save continues even if subsidiary tables fail.
- Wrapper coverage unchanged: 241/287 files (84.0%), 355/408 handlers (87.0%).

### M4 — Builder Atomicity + Hardening (GAME-003, GAME-006, GAME-007, GAME-008, GAME-010) — deferred

**Scope:** Multiple files + potential Postgres RPC

| Task | Finding | Effort |
|------|---------|--------|
| Create atomic `save_game_builder_v1` RPC | GAME-003 | High |
| Add rate limiting to public endpoints | GAME-006 | Low |
| Migrate `validateGamePayload` to Zod | GAME-007 | Medium |
| Document shared catalog design decision | GAME-008 | Low |
| Fix publish route system_admin role check | GAME-010 | Low |

**Note:** M4 is post-launch hardening. GAME-003/GAME-009 are the largest technical debt items. GAME-008 requires a product decision.

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Snapshot spam by any user | **Medium** | **Low** (storage noise) | M1 — ownership check |
| Batch reactions DoS | **Low** | **Medium** | M1 — cap batch size |
| Force-delete disrupts live sessions | **Low** | **High** | M1 — system_admin gate |
| Game deletion by non-admin | **Low** (RLS blocks) | **High** | M2 — app-level check |
| Search filter manipulation | **Negligible** (defense-in-depth contains) | **Low** | M2 — sanitize |
| Builder save corruption | **Medium** (network) | **High** (data loss) | M4 — atomic save (deferred) |

---

## 7. Cross-References

| Finding | Prior Finding | Notes |
|---------|--------------|-------|
| GAME-001c (PATCH uses supabaseAdmin) | APC-003 pattern | Same root cause — service role bypass |
| GAME-002 (snapshots auth) | — | New finding |
| GAME-004 (filter injection) | — | New finding — verified as low-impact pattern |
| GAME-008 (shared catalog) | TI-NEW-1b, TI-NEW-1d | Aligned with shared catalog design |
| GAME-011 (public v1 routes) | TI-NEW-1b (P3), TI-NEW-1d (P2) | Already tracked, no duplication |
| Builder TI (TI-001) | TI-001 (✅ Fixed) | Verified still in place |

