# Post-Launch Cluster Triage

> **Status:** WAVE 1 BATCH D COMPLETE — 18 closed, 1 needs decision, 2 blocked  
> **Created:** 2026-03-18  
> **Updated:** 2026-03-19  
> **Sources:** MFA audit (Claude-verified), Codex clusters 1–9 (Claude spot-verified)  
> **Total findings:** 42 (2 P0, 36 P1, 4 P2)  

---

## 1. Master Triage Table

| ID | Cluster | Title | Verdict | Sev | Root-Cause Family | Action | Shared file(s) | Shared remediation |
|----|---------|-------|---------|-----|-------------------|--------|----------------|-------------------|
| MFA-001 | MFA | `profiles!inner` join on non-existent relation | ✅ FIXED | P1 | RC-1 Schema drift | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `mfa/users/route.ts` | Fixed: profiles→users join, display_name→full_name |
| MFA-002 | MFA | `.eq('is_active', true)` on non-existent column | ✅ FIXED | P1 | RC-1 Schema drift | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `mfa/users/route.ts` | Fixed: is_active→is_revoked (negated) |
| MFA-003 | MFA | Status filter after DB pagination | VERIFIED | P2 | Standalone logic bug | Wave 3 | `mfa/users/route.ts` | Bundle w/ MFA-001, MFA-002 |
| MFA-004 | MFA | `user_mfa` update wrong fields + silent success | ✅ FIXED | **P0** | RC-1 Schema drift + RC-4 False success | ~~Wave 1~~ ✅ KLAR (2026-03-18) | `mfa/reset/route.ts` | Bundle w/ MFA-005 (same file) |
| MFA-005 | MFA | Cross-tenant MFA bypass (verify missing tenant_id) | ✅ FIXED | **P0** | RC-2 Tenant drift | ~~Wave 1~~ ✅ KLAR (2026-03-19) | `mfaDevices.server.ts`, `mfa/verify/route.ts` | DD-MFA-1 resolved |
| BUG-006 | C1 | Route-param / currentTenant desync in admin pages | ✅ FIXED/CLOSED | P1 | RC-2 Tenant drift | ~~Wave 1~~ ✅ KLAR (2026-03-19) | `admin/tenant/[tenantId]/layout.tsx`, 9 pages | Route param canonical via use(params); context secondary |
| BUG-007 | C1 | Editor role allowed into admin pages but blocked by mutations | VERIFIED (Codex) | P1 | RC-6 Bespoke auth drift | Wave 2 | `layout.tsx`, `tenantAuth.ts`, `tenant-achievements-admin.ts` | — |
| BUG-008 | C1 | Achievement award hard-caps recipients to first 100 members | VERIFIED (Codex) | P1 | Standalone UX/correctness | Wave 3 | `tenant-achievements-admin.ts`, `TenantAwardModal.tsx` | — |
| BUG-009 | C1 | Members page Retry deadlocks into loading state | VERIFIED (Codex) | P2 | Standalone UX bug | Wave 3 | `members/page.tsx` | — |
| BUG-010 | C2 | Sessions list selects non-existent columns | ✅ FIXED | P1 | RC-1 Schema drift | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `accounts/sessions/route.ts` | Fixed: select correct columns from user_sessions |
| BUG-011 | C2 | Devices list selects non-existent columns | ✅ FIXED | P1 | RC-1 Schema drift | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `accounts/devices/route.ts` | Fixed: select correct columns from user_devices |
| BUG-012 | C2 | Profile update partial commit (no rollback) | VERIFIED (Codex) | P1 | RC-4 False success | Wave 2 | `accounts/profile/route.ts` | — |
| BUG-013 | C2 | Session revoke reports success even when auth revocation fails | VERIFIED (Codex) | P1 | RC-4 False success | Wave 2 | `accounts/sessions/revoke/route.ts` | — |
| BUG-014 | C2 | Notification settings destroys granular preferences | VERIFIED (Codex) | P1 | RC-8 Lossy data mapping | Wave 3 | `accounts/profile/notifications/route.ts` | — |
| BUG-015 | C3 | Multi-tenant user fails session create (.single() on multi-row) | VERIFIED (Codex) | P1 | RC-2 Tenant drift | Wave 2 | `participants/sessions/create/route.ts` | — |
| BUG-016 | C3 | Participant join oversubscribes session (count-then-insert race) | VERIFIED (Codex) | P1 | RC-3 TOCTOU race | Wave 2 | `participants/sessions/join/route.ts` | RC-3 family fix |
| BUG-017 | C3 | No-expiry token quota enforcement is non-atomic + silent bypass | VERIFIED (Codex) | P1 | RC-3 TOCTOU race | Wave 2 | `lib/services/participants/session-service.ts` | RC-3 family fix |
| BUG-018 | C4 | Stripe customer lookup inconsistent across billing routes | VERIFIED (Codex) | P1 | RC-8 Lossy data mapping | Wave 2 | `billing/portal/route.ts`, `billing/subscription/update/route.ts` | Centralize customer resolution |
| BUG-019 | C4 | Cart checkout charges N items, provisions only first | ✅ FIXED | P1 | RC-4 False success | ~~Wave 1~~ ✅ KLAR (2026-03-18) | `checkout/cart/route.ts`, `billing/webhooks/stripe/route.ts` | Multi-product provisioning loop from Stripe metadata |
| BUG-020 | C4 | Seat assignment oversubscription race | ✅ FIXED | P1 | RC-3 TOCTOU race | ~~Wave 1~~ ✅ KLAR (2026-03-19) | `billing/tenants/[tenantId]/seats/route.ts` | DD-RACE-1 resolved |
| BUG-021 | C4 | Subscription update writes Stripe price ID into local-UUID field | VERIFIED (Codex) | P2 | RC-8 Lossy data mapping | Wave 3 | `billing/subscription/update/route.ts` | — |
| BUG-022 | C5 | Legacy billing fallback bypasses seat enforcement | ✅ FIXED | P1 | RC-5 Legacy bypass | ~~Wave 1~~ ✅ KLAR (2026-03-19) | `app/api/games/utils.ts` | DD-LEGACY-1 resolved: Option A — legacy fallback removed entirely |
| BUG-023 | C5 | /billing/subscription/my shows wrong tenant for multi-tenant users | ✅ FIXED | P1 | RC-2 Tenant drift | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `billing/subscription/my/route.ts` | Fixed: prefer is_primary tenant |
| BUG-024 | C5 | valid_until vs valid_to field mismatch in subscription/my | ✅ FIXED | P1 | RC-1 Schema drift | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `billing/subscription/my/route.ts` | Fixed: valid_until → valid_to |
| BUG-025 | C5 | Provisioning reports success without granting seat | ✅ FIXED/CLOSED | P1 | RC-4 False success | ~~Wave 1~~ ✅ KLAR (2026-03-19) | `billing/webhooks/stripe/route.ts` | Split-brain fixed; partial failure stays paid for retry |
| BUG-026 | C6 | Tenant with no products = all games hidden (including free/global) | ✅ FIXED | P1 | RC-5 Legacy bypass | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `games/featured/route.ts`, `games/search/route.ts`, `games/[gameId]/route.ts`, `games/[gameId]/related/route.ts`, `browse/filters/route.ts` | DD-FREE-GAMES-1: product_id IS NULL always visible |
| BUG-027 | C6 | Caller products replace rather than intersect allowed set | ✅ FIXED | P1 | RC-7 AuthZ bypass | ~~Wave 1~~ ✅ KLAR (2026-03-18) | `games/search/route.ts` | Products intersected with allowedProductIds |
| BUG-028 | C6 | Publish auth checks wrong role source (app_metadata.role) | ✅ FIXED | P1 | RC-6 Bespoke auth drift | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `games/[gameId]/publish/route.ts` | Fixed: canonical auth via ctx.memberships + effectiveGlobalRole, tenant ownership check |
| BUG-029 | C6 | Game creation can bypass publish validation via status: 'published' | ✅ FIXED | P1 | RC-7 AuthZ bypass | ~~Wave 1~~ ✅ KLAR (2026-03-18) | `games/route.ts`, `builder/route.ts`, `builder/[id]/route.ts`, `csv-import/route.ts` | All create/update paths force draft; only /publish can set published |
| BUG-030 | C7 | Builder read auth too lax — exposes unpublished games | ✅ FIXED | P1 | RC-7 AuthZ bypass | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `games/builder/[id]/route.ts` | Fixed: GET now requires editor/admin/owner role (matches PUT) |
| BUG-031 | C7 | Builder create can set status: 'published' bypassing validation | ✅ FIXED | P1 | RC-7 AuthZ bypass | ~~Wave 1~~ ✅ KLAR (2026-03-18) | `games/builder/route.ts` | Fixed as part of BUG-029 family |
| BUG-032 | C7 | Builder save non-transactional — partial failure state | CODEX-REPORTED | P1 | RC-4 False success | Wave 2 | `games/builder/[id]/route.ts` | — |
| BUG-033 | C7 | CSV import allows cross-tenant owner_tenant_id injection | ✅ FIXED | P1 | RC-2 Tenant drift | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `games/csv-import/route.ts` | Fixed: force owner_tenant_id to authenticated context |
| BUG-034 | C7 | CSV import preserves arbitrary status from CSV data | ✅ FIXED | P1 | RC-7 AuthZ bypass | ~~Wave 1~~ ✅ KLAR (2026-03-18) | `games/csv-import/route.ts` | Fixed as part of BUG-029 family |
| BUG-035 | C8 | Invitation email not verified before granting membership | ✅ FIXED | P1 | RC-6 Bespoke auth drift | ~~Wave 1~~ ✅ KLAR (2026-03-18) | `invitations/[token]/accept/route.ts` | Case-insensitive email check + audit log on mismatch |
| BUG-036 | C8 | Invite accept overwrites existing membership role | CODEX-REPORTED | P1 | RC-8 Lossy data mapping | Wave 2 | `invitations/accept/route.ts` | Bundle w/ BUG-035 (same file) |
| BUG-037 | C8 | PATCH membership clears seat_assignment_id | CODEX-REPORTED | P1 | RC-8 Lossy data mapping | Wave 2 | `memberships/route.ts` | — |
| BUG-038 | C8 | Multiple primary tenants possible (no uniqueness constraint) | CODEX-REPORTED | P1 | RC-2 Tenant drift | Wave 2 | `user_tenant_memberships` table | Needs migration (unique constraint) |
| BUG-039 | C9 | Public APIs serve data without any auth | **PARTIALLY VERIFIED** | P1 | RC-7 AuthZ bypass | Wave 2 (needs decision) | Public API routes | Comment says `// API key validation would go here`; service role client bypasses RLS; by-design tension |
| BUG-040 | C9 | Pagination count mismatch (total from different query) | CODEX-REPORTED | P2 | Standalone logic bug | Wave 3 | Various listing routes | — |
| BUG-041 | C9 | Cross-tenant stats leak through shared endpoint | ✅ FIXED | P1 | RC-2 Tenant drift | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `public/v1/games/[id]/route.ts` | Fixed: stats query scoped by tenant_id |
| BUG-042 | C9 | Invitation token response leaks PII (email, role) | **PARTIALLY VERIFIED** | P2 | Standalone security | Track only | `invitations/[token]/route.ts` | RLS mitigates — same-tenant members only; no name field (Codex overclaimed) |
| BUG-047 | C11 | `/api/play/me/role` leaks private_instructions before unlock/reveal | ✅ FIXED | **P0** | Secret gating bypass | ~~Wave 1~~ ✅ KLAR (2026-03-18) | `play/me/role/route.ts` | Server-side dual-gate masking applied |
| BUG-048 | C11 | Relock response returns stale unlocked_by despite DB null | CODEX-REPORTED | P2 | Response/DB inconsistency | Wave 3 | `play/sessions/[id]/secrets/route.ts` | |
| BUG-049 | C11 | `/api/play/me` leaks host user-id via secretInstructionsUnlockedBy | CODEX-REPORTED | P3 | PII exposure | Wave 3 | `play/me/route.ts` | |
| BUG-050 | C11 | Secret-unlock counts blocked/kicked participants, can lock host out | CODEX-REPORTED | P2 | State machine inconsistency | Wave 2 | `play/sessions/[id]/secrets/route.ts` | |
| BUG-051 | C12 | Public sessions meta.total ignores status filter | CODEX-REPORTED | P2 | Query contract drift | Wave 3 | `public/v1/sessions/route.ts` | |
| BUG-052 | C12 | locked maps to pending in public API | CODEX-REPORTED | P2 | Status mapping inconsistency | Wave 3 | `public/v1/sessions/route.ts` | |
| BUG-053 | C12 | status=ended filter excludes cancelled despite mapping cancelled→ended | CODEX-REPORTED | P2 | Filter/mapping divergence | Wave 3 | `public/v1/sessions/route.ts` | |
| BUG-054 | C12 | include_participants documented but not implemented | CODEX-REPORTED | P3 | Contract gap | Wave 3 | `public/v1/sessions/[id]/route.ts` | |
| BUG-055 | C13 | Rejoin requires sessionId but docs/callers use sessionCode | CODEX-REPORTED | P2 | Contract mismatch | Wave 2 | `participants/sessions/rejoin/route.ts` | |
| BUG-056 | C13 | Rejoin ignores allowRejoin=false | ✅ FIXED | P1 | Missing policy check | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `participants/sessions/rejoin/route.ts` | `allow_rejoin` policy check added; 403 if disabled |
| BUG-057 | C13 | Rejoin ignores session.expires_at (join checks it) | ✅ FIXED | P2 | Inconsistent guard | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `participants/sessions/rejoin/route.ts` | `expires_at` check mirrored from join route; 410 if expired |
| BUG-058 | C13 | Heartbeat promotes idle→active bypassing approval flow | ✅ FIXED | **P1** | State machine break | ~~Wave 1~~ ✅ KLAR (2026-03-18) | `play/heartbeat/route.ts` | Idle participants get presence-only update |
| BUG-059 | C14 | setPosition unreachable: status guard blocks ended, action requires it | CODEX-REPORTED | P1 | Policy contradiction | Wave 2 | `play/sessions/[id]/participants/[p]/route.ts` | |
| BUG-060 | C14 | approve/kick/block returns success even when no row matched | ✅ FIXED | P2 | False success pattern | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `play/sessions/[id]/participants/[p]/route.ts` | `.select('id')` + row count check; broadcast gated |
| BUG-061 | C14 | approve can reactivate kicked/blocked participants | ✅ FIXED | P2 | Missing status guard | ~~Wave 2~~ ✅ KLAR (2026-03-19) | `play/sessions/[id]/participants/[p]/route.ts` | `.eq('status', 'idle')` restricts approve to pending only |
| BUG-062 | C14 | setNextStarter non-atomic, can leave session without starter | CODEX-REPORTED | P2 | Race condition | Wave 2 | `play/sessions/[id]/participants/[p]/route.ts` | |
| BUG-063 | C15 | GET roles endpoint is public to anyone with session-id | CODEX-REPORTED | P2 | AuthZ gap | Wave 2 | `play/sessions/[id]/roles/route.ts` | |
| BUG-064 | C15 | PATCH roles returns success even if role-id doesn't match session | CODEX-REPORTED | P2 | False success pattern | Wave 2 | `play/sessions/[id]/roles/route.ts` | |
| BUG-065 | C15 | Chat endpoint drops limit when since param is provided | CODEX-REPORTED | P2 | Missing server-side cap | Wave 2 | `play/sessions/[id]/chat/route.ts` | |
| BUG-066 | C15 | Signal rate-limit is read-then-insert, bypassable by concurrent requests | CODEX-REPORTED | P2 | Non-atomic guard | Wave 3 | `play/sessions/[id]/signals/route.ts` | |

> **Verdict key:**
> - **VERIFIED** = Claude code-level verified against actual source + types
> - **VERIFIED (Codex)** = Codex provided line-level code proof; Claude spot-verified as plausible but not independently re-verified against source (Clusters 1-6)
> - **CODEX-REPORTED** = Codex finding from Clusters 7-9; **not yet Claude-verified** — treat as high-confidence hypothesis
> - **✅ FIXED** / **✅ FIXED (NEEDS SECOND PASS)** = Fix applied and verified / fix applied, edge case remains
> - **PARTIALLY REMEDIATED** = Attack surface reduced but root cause not fully eliminated
> - ~~Strikethrough~~ = resolved

---

## 2. Root-Cause Families

### RC-1: Schema/Query Contract Drift

**Definition:** Hand-written column/relation names in Supabase queries that don't match the actual DB schema. Masked by `as unknown as SupabaseClient` type casts that bypass TypeScript checking.

**Members:** MFA-001, MFA-002, MFA-004, BUG-010, BUG-011, BUG-024

**Why they're the same problem:** All use hand-written `.select()` or `.update()` strings with column/relation names that don't exist in the generated types. All bypass type safety via `as unknown as SupabaseClient`. PostgREST rejects at runtime.

**Remediation strategy:**
1. Fix column/relation names to match `types/supabase.ts`
2. Remove `as unknown as SupabaseClient` casts — use typed client
3. Long-term: lint rule or CI check to prevent `as unknown as SupabaseClient` in route files

---

### RC-2: Tenant Context / Route-Param Drift

**Definition:** Code assumes a single-tenant context or uses the wrong tenant source. Pages use mutable `currentTenant` from context instead of route param. Services use `.single()` on multi-tenant membership queries. Verify/delete paths omit `tenant_id` entirely.

**Members:** MFA-005, ~~BUG-006~~, BUG-015, BUG-023, BUG-033, BUG-038, BUG-041

**Why they're the same problem:** All fail when a user belongs to multiple tenants, or when the active context doesn't match the URL. The system was built for multi-tenancy at the DB layer but some application paths assume single-tenant.

**Remediation strategy:**
1. Route-scoped pages MUST use route param, not mutable context
2. Services operating on tenant-scoped data MUST require explicit `tenant_id`
3. Queries on `user_tenant_memberships` MUST NOT use `.single()` without adequate filtering
4. DD-MFA-1 must be locked before MFA-005 fix

---

### RC-3: Stale-Read-Then-Write Race (TOCTOU)

**Definition:** Count/check query followed by separate insert/update without transactional guard. Concurrent requests can all pass the check before any write commits.

**Members:** BUG-016, BUG-017, BUG-020

**Why they're the same problem:** All follow the pattern: `SELECT count → compare to limit → INSERT`. No `FOR UPDATE`, no RPC, no transaction. Classic TOCTOU.

**Remediation strategy:**
1. Move to atomic DB-side operations: Postgres RPC with `FOR UPDATE` or conditional `INSERT ... SELECT WHERE count < limit`
2. Each needs its own RPC (different tables) but the pattern is identical
3. All three require migration (new RPCs)

---

### RC-4: False-Success / Partial-Success Mutations

**Definition:** Route returns success to the client despite one or more critical downstream writes failing. Creates split-brain state between what the user sees and what the system actually did.

**Members:** ~~MFA-004~~ (also RC-1), BUG-012, BUG-013, ~~BUG-019~~, ~~BUG-025~~, BUG-032

**Why they're the same problem:** All catch errors from secondary writes, log them, and continue to return `{ success: true }`. The code treats critical operations as best-effort.

**Remediation strategy:**
1. Define which writes are **critical** (must succeed for operation to be valid) vs **secondary** (can retry later)
2. Critical write failure → fail the entire operation
3. If partial success is intentional (e.g., auth revocation + local marker), return explicit partial-success response
4. BUG-019 is the worst case: user is charged money but only 1 of N products provisioned

---

### RC-5: Legacy Fallback Bypassing Canonical Access Model

**Definition:** Older code paths that predated the entitlement+seat model still grant access without checking the current enforcement rules.

**Members:** BUG-022, BUG-026

**Why they're the same problem:** `getAllowedProductIds()` merges two access models: canonical (entitlement + seat) and legacy (subscription → billing_product_key → product). The legacy path bypasses seat requirements and includes paused subscriptions. BUG-026 is the inverse: when the canonical path finds no products, the code blocks ALL content including free/global games.

**Remediation strategy:**
1. ~~Remove or constrain legacy fallback to require active seat assignment~~ ✅ **DONE** (DD-LEGACY-1, 2026-03-19)
2. Treat `product_id IS NULL` games as always accessible regardless of entitlement state — **Wave 2**
3. ~~Both fixes are in `app/api/games/utils.ts` — bundle together~~ BUG-022 resolved; BUG-026 requires changes in 5 route files (early-return guards)

**Post-resolution note (2026-03-19):** BUG-026 is now explicitly classified as two sub-problems: (A) rollout risk for legacy-only tenants — mitigated by Phase 2 data migration, (B) design gap for free/global game visibility — Wave 2 item. See `bug-022-legacy-resolution.md` §8.3.

---

### RC-6: Bespoke Auth Checks Diverging From Canonical Model

**Definition:** Routes use hand-written role checks (e.g., `user.app_metadata.role`) instead of the system-standard helpers (`requireTenantRole`, `effectiveGlobalRole`, `apiHandler auth`).

**Members:** BUG-007, BUG-028, BUG-035

**Why they're the same problem:** Both bypass the canonical auth model. BUG-007 has page gate allowing `editor` but action gate only allowing `owner`/`admin`. BUG-028 checks `app_metadata.role` directly instead of using `effectiveGlobalRole` or `requireTenantRole`.

**Remediation strategy:**
1. Replace bespoke role checks with canonical helpers
2. Align page-level and action-level authorization to the same policy
3. Document the intended role → capability mapping for admin operations

---

### RC-7: Authorization / Validation Bypass

**Definition:** Missing intersection of caller input with server-computed authorization scope, or missing enforcement of workflow state constraints.

**Members:** ~~BUG-027~~, ~~BUG-029~~, BUG-030, ~~BUG-031~~, ~~BUG-034~~, BUG-039

**Why they're the same problem:** All allow the client to bypass server-side constraints. BUG-027 lets caller-supplied product IDs replace the authorization set. BUG-029/031/034 let callers set `status: 'published'` on create, bypassing the publish validation gate. BUG-030 exposes unpublished games. BUG-039 serves data without auth.

**Remediation strategy:**
1. BUG-027: Intersect `products` with `allowedProductIds` instead of either-or
2. BUG-029: Force `status: 'draft'` on create, or run publish validation when status is 'published'
3. Both are single-line-class fixes

---

### RC-8: Lossy / Inconsistent Data Mapping

**Definition:** API layer maps to different field semantics than the DB, or different code paths disagree on where canonical data lives.

**Members:** BUG-014, BUG-018, BUG-021, BUG-036, BUG-037

**Why they're the same problem:** All have a mismatch between what the API exposes and what the DB actually stores. BUG-014 fabricates fine-grained notification settings from coarse booleans. BUG-018 looks for Stripe customer ID in metadata instead of billing_accounts. BUG-021 mixes local UUIDs and Stripe price IDs in the same column.

**Remediation strategy:**
1. Align API contracts to actual DB schemas
2. Centralize Stripe customer resolution in one helper
3. Each fix is isolated but the pattern should be documented as a class of problem

---

### Standalone (no shared root cause)

| ID | Category |
|----|----------|
| MFA-003 | Filter-after-pagination logic bug (P2) |
| BUG-008 | Hardcoded .limit(100) in admin recipient picker (P1) |
| BUG-009 | Retry handler doesn't call reload (P2) |
| BUG-040 | Pagination count mismatch (P2) |
| BUG-042 | Invitation token PII exposure — **P2** (downgraded, RLS-mitigated) |

---

### RC-9: Secret Gating Bypass (Cluster 11)

**Definition:** Server-side routes return secret/private fields that should be gated behind host-unlock and participant-reveal ceremonies.

**Members:** BUG-047, BUG-048, BUG-049, BUG-050

**Why they're the same problem:** All relate to the two-gate model (host unlock → participant reveal) for secret role instructions. BUG-047 bypasses both gates entirely. BUG-048 returns stale state after relock. BUG-049 leaks host identity to participants. BUG-050 counts rejected participants in unlock precondition.

### RC-10: State Machine Break (Cluster 13-14)

**Definition:** Participant lifecycle operations (join/rejoin/heartbeat/approve/kick) fail to respect the expected state transitions, allowing invalid status promotions or blocking legitimate operations.

**Members:** BUG-055, BUG-056, BUG-057, BUG-058, BUG-059, BUG-060, BUG-061, BUG-062

**Why they're the same problem:** All stem from routes that modify participant status without checking current state or session policy flags. BUG-058 lets heartbeat bypass approval. BUG-056 ignores allowRejoin. BUG-059 has contradictory guards. BUG-061 lets approve override kicked/blocked.

### RC-11: Public/Live Surface AuthZ Gaps (Cluster 12, 15)

**Definition:** Public or live-coordination routes that either lack auth entirely, have inconsistent status mapping, or miss server-side guardrails.

**Members:** BUG-039, BUG-051, BUG-052, BUG-053, BUG-054, BUG-063, BUG-064, BUG-065, BUG-066

---

## 3. Remediation Waves

### Wave 1 — Critical Execution Now

> Security-sensitive, tenant-boundary-sensitive, financial/provisioning-sensitive, or authorization bypass. All verified.

| ID | Sev | Root Cause | Status |
|----|-----|------------|--------|
| ~~**MFA-004**~~ | P0 | RC-1 + RC-4 | ✅ CLOSED (2026-03-18) — Fixed column names, removed type cast, fail-hard on error |
| **MFA-005** | P0 | RC-2 | ✅ CLOSED (2026-03-19) — DD-MFA-1 resolved: tenant-scoped trust. Server-canonical cookie only (body param removed). Middleware `checkTrustedDevice` also tenant-scoped. |
| **BUG-006** | P1 | RC-2 | ✅ FIXED/CLOSED (2026-03-19) — Route param canonical for all 9 tenant-scoped pages |
| **BUG-019** | P1 | RC-4 | ⚠️ NEEDS SECOND PASS (2026-03-18) — Multi-product loop works; partial-failure split-brain risk |
| **BUG-020** | P1 | RC-3 | ✅ CLOSED (2026-03-19) — DD-RACE-1 resolved: atomic RPC `assign_seat_if_available()` with `FOR UPDATE` lock |
| **BUG-022** | P1 | RC-5 | ✅ CLOSED (2026-03-19) — DD-LEGACY-1 resolved: Option A — legacy fallback removed. Access via entitlements + seats only. |
| **BUG-025** | P1 | RC-4 | ⚠️ NEEDS SECOND PASS (2026-03-18) — Seat assigned per product; partial-failure shared w/ BUG-019 |
| ~~**BUG-027**~~ | P1 | RC-7 | ✅ CLOSED (2026-03-18) — Products intersected with allowedProductIds |
| ~~**BUG-029**~~ | P1 | RC-7 | ✅ CLOSED (2026-03-18) — All create/update paths force draft; also covers BUG-031, BUG-034 |
| **BUG-047** | **P0** | Secret gating bypass | ✅ CLOSED (2026-03-18) — Dual-gate masking of private_instructions/private_hints |
| **BUG-058** | **P1** | State machine break | ✅ CLOSED (2026-03-18) — Idle participants get presence-only heartbeat update |
| **BUG-079** | **P1** | State machine break | ✅ CLOSED (2026-03-19) — Heartbeat rejects ended/cancelled/archived sessions (410) |
| **BUG-081** | **P1** | State machine break | ✅ CLOSED (2026-03-19) — Rejoin distinguishes idle vs previously-approved |
| **BUG-083** | **P1** | State machine break | ✅ CLOSED (2026-03-19) — `requireActiveParticipant()` on 6 mutation routes |
| **BUG-084** | **P1** | State machine break | ✅ CLOSED (2026-03-19) — `assertSessionStatus('progress-update')` added |
| **BUG-056** | **P1** | Missing policy check | ✅ CLOSED (2026-03-19) — `allow_rejoin` policy check in rejoin route |
| **BUG-057** | **P2** | Inconsistent guard | ✅ CLOSED (2026-03-19) — `session.expires_at` validation in rejoin route |
| **BUG-060** | **P2** | False success / RC-4 | ✅ CLOSED (2026-03-19) — `.select('id')` row verification; broadcast gated |
| **BUG-061** | **P2** | Missing status guard | ✅ CLOSED (2026-03-19) — `.eq('status', 'idle')` on approve |
| **BUG-085** | **P3** | Scope leak | ✅ CLOSED (2026-03-19) — `session_id` on setNextStarter read; row verification |
| ~~**BUG-035**~~ | **P1** | RC-6 | ✅ CLOSED (2026-03-18) — Case-insensitive email verification before membership upsert |

**Wave 1 dependency map:**
- MFA-004 → no dependency, execute first
- BUG-029, BUG-027 → no dependency, one-line-class fixes
- BUG-006 → no dependency, but systemic (all admin pages)
- BUG-019 + BUG-025 → same webhook file, bundle together
- BUG-022 → same utils file, consider bundling with BUG-026 from Wave 2
- BUG-020 → needs DB RPC migration
- MFA-005 → blocked on DD-MFA-1
- **BUG-047 → no dependency, P0 immediate — single file fix**
- **BUG-058 → no dependency, P1 immediate — single file fix**
- **BUG-035 → no dependency, P1 immediate — single file fix**

### Wave 2 — High-Value Correctness

> Important P1 fixes: dead endpoints, tenant resolution, data integrity, race conditions.

| ID | Sev | Root Cause | Notes |
|----|-----|------------|-------|
| MFA-001 + MFA-002 | P1 | RC-1 | Dead admin MFA endpoint — same file, bundle |
| BUG-010 + BUG-011 | P1 | RC-1 | Dead account endpoints — separate files, same pattern |
| BUG-024 + BUG-023 | P1 | RC-1 + RC-2 | Same file (`subscription/my`), bundle |
| BUG-012 | P1 | RC-4 | Profile partial commit |
| BUG-013 | P1 | RC-4 | Session revoke false success |
| BUG-015 | P1 | RC-2 | Multi-tenant .single() on create |
| BUG-016 + BUG-017 | P1 | RC-3 | Participant races — both need RPCs |
| BUG-018 | P1 | RC-8 | Stripe customer resolution |
| BUG-007 + BUG-028 | P1 | RC-6 | Auth drift — publish role check |
| ~~**BUG-035**~~ | **P1** | RC-6 | ✅ CLOSED (2026-03-18) — invite email verification + audit log |
| BUG-026 | P1 | RC-5 | No-product tenants blocked from free games — **classified: rollout risk + Wave 2 design item** (see §8.3 in bug-022-legacy-resolution.md) |
| BUG-030 | P1 | RC-7 | Builder read auth too lax — exposes unpublished games |
| BUG-032 | P1 | RC-4 | Builder save non-transactional partial failure |
| BUG-033 | P1 | RC-2 | CSV import cross-tenant owner_tenant_id injection |
| BUG-036 + BUG-037 | P1 | RC-8 | Invite overwrites role; PATCH clears seat_assignment_id |
| BUG-038 | P1 | RC-2 | Multiple primary tenants — needs migration (unique constraint) |
| BUG-039 | P1 | RC-7 | Public APIs — PARTIALLY VERIFIED, needs product decision |
| BUG-041 | P1 | RC-2 | Cross-tenant stats leak |
| BUG-042 | P2 | Standalone | Invitation token — PARTIALLY VERIFIED, RLS-mitigated, track only |

### Wave 3 — Structural Hardening

> P2 fixes + lower-blast-radius P1s + cleanup.

| ID | Sev | Root Cause | Notes |
|----|-----|------------|-------|
| MFA-003 | P2 | Standalone | Bundle with MFA-001/002 (same file) |
| BUG-008 | P1 | Standalone | Admin-only, add pagination |
| BUG-009 | P2 | Standalone | One-line fix |
| BUG-014 | P1 | RC-8 | Notification settings — needs product decision |
| BUG-021 | P2 | RC-8 | Price ID semantic drift — needs data audit |
| BUG-040 | P2 | Standalone | Pagination count mismatch |

---

## 4. Design Decisions Required Before Execution

| DD | Finding(s) | Question | Blocking |
|----|-----------|----------|----------|
| ~~**DD-MFA-1**~~ | MFA-005 | ~~Trusted device: tenant-scoped or global?~~ ✅ **RESOLVED** (2026-03-19): Tenant-scoped. `tenantId` required param on verify. | ~~Wave 1: MFA-005~~ ✅ |
| **DD-CART-1** | BUG-019 | Multi-product cart: one intent per item, or webhook loops over metadata? | Wave 1: BUG-019 |
| ~~**DD-RACE-1**~~ | BUG-016, BUG-017, BUG-020 | ~~Atomic reservation pattern~~ ✅ **RESOLVED** (2026-03-19): `FOR UPDATE` lock + conditional INSERT via PL/pgSQL RPC. | ~~Wave 1: BUG-020~~ ✅; Wave 2: BUG-016, BUG-017 |
| ~~**DD-LEGACY-1**~~ | BUG-022 | ~~Legacy billing fallback: retire, bridge, or accept?~~ ✅ **RESOLVED** (2026-03-19): Option A — hard cleanup. Legacy fallback removed. | ~~Wave 1: BUG-022~~ ✅ |
| **DD-EDITOR-1** | BUG-007 | Should editors have tenant-admin mutation access? Or read-only? | Wave 2: BUG-007 |
| **DD-NOTIF-1** | BUG-014 | Are granular notification categories still a product requirement? | Wave 3: BUG-014 |
