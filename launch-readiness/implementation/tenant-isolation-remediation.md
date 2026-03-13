# Tenant Isolation Remediation

> **Date:** 2026-03-11  
> **Source:** `audits/tenant-isolation-audit.md` — 10 findings (1 P0, 3 P1, 3 P2, 3 P3)  
> **Scope:** TI-001 P0 fix (games builder cross-tenant CRUD)

---

## 1. TI-001: Games Builder Cross-Tenant CRUD — ✅ FIXED AND CODE-VERIFIED

### Problem

All three games builder handlers (POST, GET, PUT) used `requireAuth()` + `createServiceRoleClient()` without validating that the caller belongs to the game's owning tenant. Any authenticated user could:

- **POST:** Create games under any tenant by sending arbitrary `owner_tenant_id` in request body
- **GET:** Read any game's full builder data (steps, artifacts, phases, roles, triggers, etc.) by guessing a game UUID
- **PUT:** Modify any game's content and change its `owner_tenant_id` to hijack it

Service role client bypasses all RLS policies, so the existing RLS INSERT/UPDATE/DELETE policies on the `games` table (which enforce `owner_tenant_id = ANY(get_user_tenant_ids())` + editor/admin/owner role) provided zero protection.

### Authorization Model (mirrors RLS policies)

| Operation | Required Access | System Admin |
|-----------|----------------|--------------|
| POST | editor/admin/owner role in target `owner_tenant_id` | Bypasses (can create for any tenant, including `null` owner) |
| GET | Any membership in game's `owner_tenant_id` | Bypasses |
| PUT | editor/admin/owner role in game's current `owner_tenant_id`; if changing tenant, also requires role in new tenant | Bypasses |

### Fix Applied

**Files modified:**
- `app/api/games/builder/route.ts` (POST handler)
- `app/api/games/builder/[id]/route.ts` (GET and PUT handlers)

**Pattern:** Capture `ctx` from `requireAuth()`, then validate `ctx.memberships` against the target/current `owner_tenant_id` before any service role operations:

```typescript
// POST: Validate caller's tenant membership before creating game
const ctx = await requireAuth();
// ... body parsing ...
const ownerTenantId = core.owner_tenant_id ?? null;
if (ownerTenantId) {
  const membership = ctx.memberships.find(m => m.tenant_id === ownerTenantId);
  const role = membership?.role;
  const hasEditRole = role === 'editor' || role === 'admin' || role === 'owner';
  if (!hasEditRole && ctx.effectiveGlobalRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
} else if (ctx.effectiveGlobalRole !== 'system_admin') {
  return NextResponse.json({ error: 'owner_tenant_id is required' }, { status: 400 });
}
```

```typescript
// GET: Validate caller is tenant member before returning game data
const ctx = await requireAuth();
// ... fetch game ...
if (game.owner_tenant_id) {
  const membership = ctx.memberships.find(m => m.tenant_id === game.owner_tenant_id);
  if (!membership && ctx.effectiveGlobalRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
} else if (ctx.effectiveGlobalRole !== 'system_admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

```typescript
// PUT: Validate editor/admin/owner role in current tenant + new tenant if changed
const ctx = await requireAuth();
// ... fetch existing game to verify current ownership ...
const currentOwner = existingGame.owner_tenant_id;
if (currentOwner) {
  const membership = ctx.memberships.find(m => m.tenant_id === currentOwner);
  const role = membership?.role;
  const hasEditRole = role === 'editor' || role === 'admin' || role === 'owner';
  if (!hasEditRole && ctx.effectiveGlobalRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
} else if (ctx.effectiveGlobalRole !== 'system_admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
// If changing tenant, validate access to new tenant too
const newOwner = core.owner_tenant_id ?? null;
if (newOwner && newOwner !== currentOwner) {
  const newMembership = ctx.memberships.find(m => m.tenant_id === newOwner);
  const newRole = newMembership?.role;
  const hasNewEditRole = newRole === 'editor' || newRole === 'admin' || newRole === 'owner';
  if (!hasNewEditRole && ctx.effectiveGlobalRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

### Why Service Role Is Retained

The builder performs complex multi-table writes across 8+ tables (games, game_steps, game_materials, game_phases, game_roles, game_board_config, game_media, game_artifacts, game_artifact_variants, game_tools, game_triggers, game_secondary_purposes). Not all child tables have comprehensive RLS policies. Switching to an RLS client would require auditing and potentially creating RLS policies for every child table — a higher-risk change during launch hardening.

The app-level authorization check (membership + role validation) mirrors the existing RLS policies on the `games` table and provides equivalent protection. This is Defense-in-Depth Alternative 2 from the audit.

### Verification

- `npx tsc --noEmit` — 0 new errors (only pre-existing test errors in unrelated files)
- All 3 handlers verified: POST, GET, PUT
- System admin bypass preserved for all operations

### Targeted Regression (GPT Review #11)

Four concrete cases verified by code inspection:

| # | Case | Expected | Verified |
|---|------|----------|----------|
| 1 | POST as normal user without `owner_tenant_id` | 400 `owner_tenant_id is required` | ✅ [route.ts L213-214](app/api/games/builder/route.ts#L213-L214): `else if (ctx.effectiveGlobalRole !== 'system_admin')` → returns 400 |
| 2 | GET game owned by tenant B, caller is member of tenant A only | 403 Forbidden | ✅ [route.ts L282-288](app/api/games/builder/%5Bid%5D/route.ts#L282-L288): `ctx.memberships.find(m => m.tenant_id === game.owner_tenant_id)` returns undefined → 403 |
| 3 | PUT game in authorized tenant (caller has editor role) | Allowed | ✅ [route.ts L477-484](app/api/games/builder/%5Bid%5D/route.ts#L477-L484): `hasEditRole` is true → auth check passes |
| 4 | PUT changing `owner_tenant_id` to tenant without membership | 403 Forbidden | ✅ [route.ts L489-497](app/api/games/builder/%5Bid%5D/route.ts#L489-L497): `newOwner !== currentOwner` + no membership → 403 |

**Case 1 detail:** System admin CAN create games with `null` owner (bypasses the check). Normal users always need an `owner_tenant_id` they have editor/admin/owner role in.

**Case 4 edge case:** A user with editor role in tenant A could set `owner_tenant_id` to `null` (clearing it). This makes the game accessible only to system admins (per GET check). Not a cross-tenant breach — the user loses their own access. UX foot-gun, not a security issue.

**Write-path audit (all `tenant_id` / `owner_tenant_id` usage post-auth-check):**

All downstream writes in both POST and PUT use the **same `core.owner_tenant_id` value** that was validated by the authorization check. No alternative code paths bypass the tenant check:

- POST: `insertGame.owner_tenant_id` (L224), `game_media.tenant_id` (L264), `resolveMediaRefsToGameMediaIds.tenantId` (L280)
- PUT: `updateGame.owner_tenant_id` (L506), `resolveMediaRefsToGameMediaIds.tenantId` (L547), `game_media.tenant_id` (L760)

**Conclusion: TI-001 is remediated and code-verified. All attack vectors are closed. Runtime/integration tests recommended as follow-up.**

---

## 2. Public V1 API — Detailed Findings (TI-NEW-1)

During the TI-001 investigation, 4 routes were found in the public V1 API with **zero authentication** and service role client with caller-supplied `tenant_id`. These are confirmed findings, not suspected — each route was fully read and analyzed.

### Design Intent

All 4 routes are explicitly designed as **public, read-only** endpoints for external integrations (e.g., embedding session/game data). The code contains:
- JSDoc: `"public, read-only"` on all 4 routes
- Comment: `"// API key validation would go here"` in `games/route.ts` (L22)
- Comment: `"tenant_id: Required for authorization"` in detail routes (misleading — no actual authorization occurs)

No middleware, no API key, no auth headers. Completely unauthenticated.

### Route-by-Route Analysis

#### TI-NEW-1a: `app/api/public/v1/sessions/route.ts`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | None (zero auth) |
| **Client** | `createServiceRoleClient()` — bypasses all RLS |
| **Input** | `tenant_id` from query params (required), `game_id`, `status` (optional) |
| **Tables** | `participant_sessions`, `games` (joined) |
| **Data exposed** | Session: id, game_id, display_name, status, created_at, started_at, ended_at, participant_count, game name |
| **PII exposure** | Low — `display_name` is session name, not user name |
| **Confirmed** | ✅ Yes — code fully read |
| **Severity** | **P2** — Read-only, session metadata only, public by design |
| **Blocks launch?** | No — unless public API is not intended for production |

#### TI-NEW-1b: `app/api/public/v1/games/route.ts`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | None (zero auth) |
| **Client** | `createServiceRoleClient()` — bypasses all RLS |
| **Input** | `tenant_id` from query params (required) |
| **Tables** | `games` |
| **Data exposed** | Published games only (`.eq('status', 'published')`): id, name, description, short_description, play_mode, min/max_players, time_estimate_min, created/updated_at |
| **PII exposure** | None — game catalog data only |
| **Confirmed** | ✅ Yes — code fully read |
| **Severity** | **P3** — Published game catalog, explicitly public, no PII |
| **Blocks launch?** | No |

#### TI-NEW-1c: `app/api/public/v1/sessions/[id]/route.ts`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | None (zero auth) |
| **Client** | `createServiceRoleClient()` — bypasses all RLS |
| **Input** | `id` from path, `tenant_id` (required), `include_participants` (optional) |
| **Tables** | `participant_sessions`, `games` (joined), `participants` (if `include_participants=true`) |
| **Data exposed** | Session details + **optionally: participant display_name, id, joined_at** |
| **PII exposure** | **Medium-High when `include_participants=true`** — participant display names are PII |
| **Scope filter** | tenant_id is used as `.eq('tenant_id', tenantId)` — caller must know the correct UUID |
| **Confirmed** | ✅ Yes — code fully read |
| **Severity** | **P1** — PII exposure (participant names) without any authentication |
| **Blocks launch?** | **Product decision required** — if participant names are sensitive, this needs API key auth or removal of `include_participants` |

#### TI-NEW-1d: `app/api/public/v1/games/[id]/route.ts`

| Field | Value |
|-------|-------|
| **Method** | GET |
| **Auth** | None (zero auth) |
| **Client** | `createServiceRoleClient()` — bypasses all RLS |
| **Input** | `id` from path, `tenant_id` (required), `include_stats` (optional) |
| **Tables** | `games`, `participant_sessions` (if `include_stats=true`) |
| **Data exposed** | Published game details + **optionally: session statistics** (total/active/completed sessions, avg duration) |
| **PII exposure** | None |
| **Cross-tenant note** | Stats query (`.eq('game_id', id)`) does **not** filter by `tenant_id` — if a game were shared, stats would include sessions from all tenants. Minor issue in practice (games typically have single owner). |
| **Confirmed** | ✅ Yes — code fully read |
| **Severity** | **P2** — Published game details (public) + aggregate stats without auth |
| **Blocks launch?** | No — aggregate numbers, no PII |

### Summary

| Route | Severity | PII? | Blocks Launch? | Requires |
|-------|----------|------|----------------|----------|
| `app/api/public/v1/sessions/route.ts` | P2 | No | No | API key (deferred) |
| `app/api/public/v1/games/route.ts` | P3 | No | No | API key (deferred) |
| `app/api/public/v1/sessions/[id]/route.ts` | **P1** | **Yes** (participant names) | **Product decision** | API key OR remove `include_participants` |
| `app/api/public/v1/games/[id]/route.ts` | P2 | No | No | API key (deferred), tenant filter on stats query |

**The only route that could block launch is TI-NEW-1c** — it exposes participant display names (PII) via a completely unauthenticated endpoint. The others expose catalog/metadata that is arguably meant to be public.

**Recommended action:**
1. **Now:** Product owner decides whether `include_participants` in the public API is acceptable without auth
2. **Before GA:** Implement API key authentication for all `/api/public/v1/` routes (the code already has a placeholder comment for this)

---

## 3. Pending Items

| Finding | Status | Severity | Next Step |
|---------|--------|----------|-----------|
| TI-001 | ✅ FIXED and code-verified | P0 | Closed (no automated runtime tests yet) |
| TI-002 (Leaderboard PII) | 🟡 Product decision (DD-4) | P1 | Not a launch blocker per GPT assessment |
| TI-003 (Content service trust) | ⬜ Open | P1 | Service layer review |
| TI-004 (Tenant GET auth) | ⬜ Deferred | P2 | Low effort — batch with wrapper migration |
| TI-NEW-1a (Public sessions list) | ⬜ Open | P2 | API key auth (deferred) |
| TI-NEW-1b (Public games list) | ⬜ Open | P3 | API key auth (deferred) |
| TI-NEW-1c (Session detail + participants) | ⬜ **Product decision needed** | **P1** | Remove `include_participants` or add API key auth |
| TI-NEW-1d (Game detail + stats) | ⬜ Open | P2 | API key auth (deferred) |

---

## 4. Clarification: TI-002 vs TI-NEW-1c vs DD-4

These three items address **different endpoints and different PII risks** — they must not be conflated.

| Item | Endpoint | Data Exposed | Covered by DD-4? |
|------|----------|-------------|-------------------|
| **TI-002** | `/api/gamification/leaderboard` | User IDs, masked emails, display names | **Partially** — DD-4 confirms leaderboard is intentionally public, but does not address PII exposure specifically |
| **TI-NEW-1c** | `/api/public/v1/sessions/[id]` | Participant display names (via `include_participants=true`) | **No** — DD-4 covers leaderboard/sinks only, not the public V1 API |
| **DD-4** | Design decision (not a finding) | N/A | — Scope: confirms `/api/gamification/leaderboard` and `/api/gamification/sinks` are intentionally unauthenticated. UUID validation added. |

**Key distinction:** DD-4 is a **design intent decision** confirming that leaderboard and sinks endpoints are intentionally public. It does **not** constitute a privacy assessment of the data those endpoints return (TI-002), nor does it cover the separate public V1 API (TI-NEW-1c). Each requires its own product decision regarding PII acceptability.
