# Sessions & Participants Remediation Plan

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-13
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Executed remediation record for the launch-readiness sessions and participants audit. Use `launch-readiness/implementation/README.md` for implementation navigation, `launch-readiness/audits/sessions-audit.md` for the original findings snapshot, and `launch-readiness/launch-control.md` for current launch-program state.

> **Source:** `audits/sessions-audit.md`  
> **Date:** 2026-03-11  
> **Last updated:** 2026-03-22  
> **Last validated:** 2026-03-22  
> **Status:** historical snapshot  
> **Execution status:** COMPLETE — M1, M2, M3 executed; M4 deferred post-launch  
> **Scope:** Launch-scope remediation record for P1 findings from Sessions & Participants audit  
> **Note:** Executed remediation record. Use `launch-control.md` for current launch-program status and this file for the bounded sessions remediation history.

---

## Findings to Remediate

### P1 — Must Fix Before Launch (4 findings)

| ID | Finding | Effort | Dependencies |
|----|---------|--------|-------------|
| SESS-001 | Mock data fallback in `participants/[participantId]/route.ts` | Small | SESS-003 (wrap in apiHandler) |
| SESS-002 | Missing Zod validation on join/rejoin/create routes (incl. avatarUrl, expiresInHours) | Medium | None |
| SESS-003 | Unwrapped admin routes (`participants/route.ts`, `participants/[participantId]/route.ts`) | Small | None |
| ~~SESS-004~~ | ~~Control route broadcast bypass~~ — **reclassified P2 per GPT calibration** | Medium | Client-side migration |
| SESS-005 | Export endpoint no rate limiting | Trivial | None |

### P2 — Should Fix (6 findings)

| ID | Finding | Effort | Dependencies |
|----|---------|--------|-------------|
| SESS-004 | Dual broadcast path in control route (reclassified P1→P2 per GPT calibration) | Medium | Client-side migration |
| SESS-006 | N+1 query pattern in history/analytics | Medium | None |
| SESS-007 | Rejoin status policy inconsistency (`draft` should be blocked, `locked` = product decision) | Trivial | Product decision on `locked` |
| ~~SESS-008~~ | ~~`avatarUrl` not validated~~ — **subsumed under SESS-002** | — | — |
| ~~SESS-009~~ | ~~`expiresInHours` negative values~~ — **subsumed under SESS-002** | — | — |
| SESS-010 | Board/lobby code-only auth — documented design tradeoff | None | No code change |

### P3 — Post-Launch (3 findings)

| ID | Finding | Effort |
|----|---------|--------|
| SESS-011 | Dual-channel unification (session: → play:) | Large |
| SESS-012 | Token in localStorage → HttpOnly cookie | Large |
| SESS-013 | setNextStarter race condition | Small |

---

## Proposed Milestones

### M1 — Quick Wins (SESS-001, SESS-003, SESS-005)

**Scope:** Wrap unwrapped admin routes, remove mock fallback, add rate limiting to export.

| Task | Route | Change |
|------|-------|--------|
| M1.1 | `participants/route.ts` | Wrap in `apiHandler({ auth: 'user' })`. RLS still enforces visibility — wrapper adds auth validation + standardized error format. |
| M1.2 | `participants/[participantId]/route.ts` | Wrap in `apiHandler({ auth: 'user' })`. Remove mock data + mock log constants. Replace catch-returns-mock with proper error propagation. |
| M1.3 | `participants/sessions/[sessionId]/export/route.ts` | Add `rateLimit: 'api'` to existing `apiHandler` config. |

**Exit criteria:**
- [x] Both participant admin routes use `apiHandler({ auth: 'user' })`
- [x] Mock data constants removed from `[participantId]/route.ts`
- [x] Error responses return proper HTTP status codes (not 200 with mock)
- [x] Export route has `rateLimit: 'api'`
- [x] `tsc --noEmit` = 0 errors
- [x] Wrapper count: 238/287 files (82.9%), 349/408 handlers (85.5%)

**✅ M1 COMPLETE (2026-03-11)**

### M2 — Input Validation (SESS-002, SESS-008, SESS-009)

**Scope:** Add Zod schemas to join, rejoin, and create-session routes.

| Task | Route | Schema |
|------|-------|--------|
| M2.1 | `participants/sessions/join/route.ts` | `z.object({ sessionCode: z.string().min(1).max(10), displayName: z.string().min(1).max(50).trim(), avatarUrl: z.string().url().max(500).optional() })` |
| M2.2 | `participants/sessions/rejoin/route.ts` | `z.object({ participantToken: z.string().uuid(), sessionId: z.string().uuid() })` |
| M2.3 | `participants/sessions/create/route.ts` | `z.object({ displayName: z.string().min(1).max(100).trim(), description: z.string().max(500).optional(), expiresInHours: z.number().min(0.5).max(720).optional(), ... })` |

**Decision:** Use wrapper `input:` config (auto-parsing + 400 on invalid) or keep manual parsing (body already parsed in handler)? If these routes do complex conditional parsing (e.g., create-session has many optional fields), manual Zod `.safeParse()` inside the handler may be simpler than threaded-through `input:` config.

**Exit criteria:**
- [x] All 3 routes validate input with Zod
- [x] `avatarUrl` validated as URL with length limit and HTTP(S) scheme check
- [x] `expiresInHours` validated with min/max range (0.5–720)
- [x] `sessionId` in rejoin validated as UUID
- [x] Invalid input returns 400 with descriptive error
- [x] `tsc --noEmit` = 0 errors

**✅ M2 COMPLETE (2026-03-11)**

**Noteringar:**
- **join** and **rejoin**: wrapper `input:` config — Zod schema auto-parsed, 400 on invalid
- **create**: internal `safeParse()` — complex try/catch with errorTracker preserved
- `avatarUrl` scheme-checked: only `http://` and `https://` allowed (blocks `javascript:`, `data:` etc.)
- `settings.maxParticipants` validated as int 1–1000, `settings.tokenExpiryHours` validated 0.5–720 (nullable)

### M3 — Rejoin Status Gate (SESS-007)

**Scope:** Add explicit session status gate to rejoin route.

| Task | Change |
|------|--------|
| M3.1 | Add `draft` to rejoin's blocked statuses. Keep `locked` as allowed (existing participant reconnecting). |

**Exit criteria:**
- [x] Rejoin returns 403 for `draft` sessions
- [x] Rejoin still allows `lobby`, `active`, `paused`, `locked`
- [x] Rejoin still blocks `ended`, `cancelled`, `archived` (410)

**✅ M3 COMPLETE (2026-03-11)**

### M4 — Broadcast Consolidation (SESS-004) — Deferred (P2)

> **GPT Calibration (2026-03-11):** SESS-004 reclassified P1 → P2. No known user-facing errors or state corruption from the dual broadcast path. Should be addressed for architectural consistency, but not launch-blocking.

**Scope:** Replace direct `channel.send()` in control route with `broadcastPlayEvent()`.

| Task | Change |
|------|--------|
| M4.1 | Replace control route's direct broadcast with `broadcastPlayEvent()` call |
| M4.2 | Add control-specific event types to `broadcastPlayEvent()` if needed |
| M4.3 | Verify `useLiveSession` handles control events from `play:` channel |
| M4.4 | (Optional) Keep `session:` broadcast temporarily for backward compatibility |

**Dependencies:** Client-side `useParticipantBroadcast` hook needs to be verified — does it only listen on `session:` for these events, or does it also listen on `play:`?

**2026-03-22 verification note:** Still deferred as documented. The control route still uses direct `channel.send()` on the `session:` channel, so M4 remains post-launch hardening rather than launch-scope remediation.

**Exit criteria:**
- [ ] Control route uses `broadcastPlayEvent()` instead of direct `channel.send()`
- [ ] Events include monotonic `seq` counter
- [ ] Participant UI still receives pause/resume/lock/unlock/end events
- [ ] `tsc --noEmit` = 0 errors

---

## Execution Order

```
M1 (quick wins) → M3 (rejoin gate) → M2 (validation)
```

M4 (broadcast consolidation) deferred to post-launch / after-launch stabilization per GPT calibration.

**Rationale:**
- M1 is mechanical wrapping with no behavioral change — lowest risk
- M3 is a one-line fix — blocks a clear inconsistency
- M2 changes input handling — needs careful testing of edge cases
- M4 (P2) is architectural hardening — no urgency for launch

---

## Not In Scope (P2/P3 — post-launch or per domain audit)

| ID | Finding | When |
|----|---------|------|
| SESS-006 | N+1 queries | Performance audit |
| SESS-004 | Broadcast consolidation (control route) | Post-launch stabilization (P2) |
| SESS-010 | Board/lobby access model | Documented design tradeoff (no code change) |
| SESS-011 | Dual-channel unification | Post-launch refactor |
| SESS-012 | Token → HttpOnly cookie | Post-launch security hardening |
| SESS-013 | setNextStarter race | Post-launch fix |

---

## Wrapper Adoption Impact

After M1 completion:

| Metric | Before | After M1 |
|--------|--------|----------|
| Wrapped files | 236/287 (82.2%) | 238/287 (82.9%) |
| Wrapped handlers | 347/408 (85.0%) | 349/408 (85.5%) |
| Unwrapped files | 51 | 49 |
