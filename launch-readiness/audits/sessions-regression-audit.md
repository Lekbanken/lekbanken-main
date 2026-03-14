# Sessions / Participants — Regression Audit

> **Domain:** Sessions & Participants  
> **Type:** Phase 2 Regression Audit  
> **Date:** 2026-03-14  
> **Source:** `sessions-audit.md` (13 findings) + `sessions-remediation.md` (M1–M3)  
> **Scope:** Verify M1–M3 remediation intact, no new regressions, across 8 GPT-directed areas  
> **Result:** ✅ **PASS** — 0 new P0/P1 gaps. Known P2/P3 re-confirmed.

---

## Audit Areas

Eight GPT-directed regression areas verified against current codebase:

| # | Area | Status | Details |
|---|------|--------|---------|
| 1 | Join/rejoin statuses & felkoder | ✅ PASS | Status gates, error codes, flow — all intact |
| 2 | Participant lifecycle | ✅ PASS | join, rejoin, kick, block, approve, leave — all verified |
| 3 | Export + admin routes | ✅ PASS | Mock removed, wrappers applied, rate limit on export |
| 4 | Broadcast consistency | ✅ PASS | Known P2 gaps re-confirmed (rejoin, cleanup — no broadcast) |
| 5 | Token/auth paths | ✅ PASS | Revoke, extend, expiry, REJECTED_PARTICIPANT_STATUSES — all intact |
| 6 | Session-status guards | ✅ PASS | Participant mutations guarded; read-only routes appropriately unguarded |
| 7 | Zod validation | ✅ PASS | join, rejoin, create — all schemas intact |
| 8 | Mock data / fallback | ✅ PASS | Mock constants fully removed, proper error responses |

---

## 1. Join / Rejoin Statuses & Felkoder

### Join Route (`participants/sessions/join`)

| Check | Status | Location |
|-------|--------|----------|
| `apiHandler({ auth: 'public', rateLimit: 'strict' })` | ✅ | L33–34 |
| Zod `input:` schema (sessionCode, displayName, avatarUrl) | ✅ | L23–31 |
| `avatarUrl` HTTP(S) `.refine()` | ✅ | L29–31 |
| Blocks `draft` → 403 | ✅ | L54 |
| Blocks `locked` → 403 | ✅ | L58 |
| Blocks `ended`/`cancelled`/`archived` → 410 | ✅ | L62 |
| Allows `lobby`/`active`/`paused` | ✅ | L74–78 |
| Max participants check | ✅ | L91–96 |
| Activity logging | ✅ | L147–154 |
| Broadcast `participants_changed` | ✅ | L169 |

### Rejoin Route (`participants/sessions/rejoin`)

| Check | Status | Location |
|-------|--------|----------|
| `apiHandler({ auth: 'public', rateLimit: 'api' })` | ✅ | L23 |
| Zod `input:` (participantToken UUID, sessionId UUID) | ✅ | L20–23 |
| `REJECTED_PARTICIPANT_STATUSES` → 403 (kicked/blocked) | ✅ | L56–60 |
| `draft` blocked → 403 (SESS-007 fix) | ✅ | L67–70 |
| `ended`/`cancelled`/`archived` → 410 | ✅ | L72–76 |
| `locked` allowed (intended semantics) | ✅ | No blocking check |
| Token expiry → 401 | ✅ | L84–91 |

### Create Route (`participants/sessions/create`)

| Check | Status | Location |
|-------|--------|----------|
| Zod `safeParse()` | ✅ | L39 |
| `expiresInHours` min 0.5, max 720 | ✅ | L31 |
| `maxParticipants` int 1–1000 | ✅ | L25 |

### Result: ✅ No regression — M2 + M3 fully intact

---

## 2. Participant Lifecycle

| Action | Route | Auth | Status Guard | Broadcast | Verified |
|--------|-------|------|-------------|-----------|----------|
| Join | `sessions/join` POST | public + strict RL | ✅ Full status gate | ✅ `participants_changed` | ✅ |
| Rejoin | `sessions/rejoin` POST | public + api RL | ✅ SESS-007 fix | ❌ Missing (known P2) | ✅ |
| Kick | `participants/[pid]` PATCH | user + host | ✅ `kick-block` guard | ✅ `participants_changed` | ✅ |
| Block | `participants/[pid]` PATCH | user + host | ✅ `kick-block` guard | ✅ `participants_changed` | ✅ |
| Approve | `participants/[pid]` PATCH | user + host | ✅ `kick-block` guard | ✅ `participants_changed` | ✅ |
| Readiness | `play/ready` POST | participant | ✅ lobby/active | ✅ `participants_changed` | ✅ |
| Heartbeat | `play/heartbeat` POST | public (token) | Implicit (rejects kicked/blocked) | None (presence only) | ✅ |
| Progress | `progress/update` POST | participant | Session exists check | None | ✅ |
| Token revoke | `tokens/revoke` POST | user + host | `requireSessionHost()` | None | ✅ |
| Token extend | `tokens/extend` POST | user + host | `requireSessionHost()` | None | ✅ |
| Token cleanup | `tokens/cleanup` POST | cron_or_admin | N/A (background job) | ❌ Missing (known P2) | ✅ |

### Result: ✅ No regression — lifecycle matrix consistent with audit

---

## 3. Export + Admin Routes (M1 Verification)

| Route | Wrapper | Mock Data | Rate Limit | Error Codes | Verified |
|-------|---------|-----------|------------|-------------|----------|
| `participants/` GET | `apiHandler({ auth: 'user' })` | ✅ None | Wrapper default | 500 on error | ✅ |
| `participants/[pid]` GET | `apiHandler({ auth: 'user' })` | ✅ **Removed** | Wrapper default | 404 on not-found | ✅ |
| `sessions/[id]/export` GET | `apiHandler({ auth: 'user', rateLimit: 'api' })` | ✅ None | ✅ `api` tier | 404/403/400/500 | ✅ |

**Mock data verification:** Searched `participants/[participantId]/route.ts` for "mock", "Nora", "example.com" — **zero matches**. Mock constants fully removed. Error returns proper HTTP 404, not 200 with fake data.

### Result: ✅ No regression — M1 fully intact

---

## 4. Broadcast Consistency

| Event | Route | Broadcasts | Channel | Status |
|-------|-------|-----------|---------|--------|
| Join | `sessions/join` | ✅ `broadcastPlayEvent()` | `play:` | ✅ |
| Rejoin | `sessions/rejoin` | ❌ No broadcast | — | Known P2 (no change) |
| Kick/Block/Approve | `participants/[pid]` | ✅ `broadcastPlayEvent()` | `play:` | ✅ |
| Readiness | `play/ready` | ✅ `broadcastPlayEvent()` | `play:` | ✅ |
| Control (pause/resume/end) | `sessions/[id]/control` | ⚠️ Dual: pipeline `play:` + direct `session:` | Both | Known P2 (SESS-004) |
| Token cleanup (mass disconnect) | `tokens/cleanup` | ❌ No broadcast | — | Known P2 (no change) |

**SESS-004 status:** Control route still uses dual broadcast (pipeline + direct `channel.send()` on `session:` channel). This is deferred P2, not a regression — no user-facing errors from this pattern.

### Result: ✅ No regression — broadcast patterns match audit expectations

---

## 5. Token / Auth Paths

| Path | Verified | Details |
|------|----------|---------|
| Token validation chain | ✅ | `resolveParticipantAuth()` → DB lookup → status check → expiry check |
| Kicked → 403 | ✅ | `REJECTED_PARTICIPANT_STATUSES` in rejoin + heartbeat |
| Blocked → 403 | ✅ | Same set |
| Expired → 401 | ✅ | Server-side `token_expires_at > now()` |
| No token → 401 | ✅ | Wrapper handles |
| Token revoke = kick | ✅ | Sets `status: 'kicked'`, expires token |
| Token extend | ✅ | `requireSessionHost()` enforced |
| No 404 for tokens (DD-2) | ✅ | Returns 401/403 — no enumeration |

### Result: ✅ No regression

---

## 6. Session-Status Guards (Participant Context)

| Route | Guard | Appropriate? |
|-------|-------|-------------|
| `progress/update` | Session exists only | ✅ Read/write to own progress — acceptable without status gate |
| `tokens/cleanup` | N/A (cron job) | ✅ Background job — no user-facing status gate needed |
| `sessions/[id]/analytics` | None (read-only) | ✅ Read-only analytics — no status gate needed |
| `sessions/history` | None (read-only) | ✅ Read-only list — no status gate needed |
| `play/heartbeat` | Rejects kicked/blocked | ✅ Presence update — implicit guard sufficient |
| `sessions/[id]/control` | Delegates to `applySessionCommand()` | ✅ Pipeline handles state machine + TOCTOU |

All mutation routes that need guards have them (via Play M2 central policy). Read-only and background routes appropriately skip status gates.

### Result: ✅ No regression — guard strategy consistent

---

## 7. Zod Validation (M2 Verification)

| Route | Schema | Method | Verified Fields |
|-------|--------|--------|----------------|
| Join | `joinSchema` | wrapper `input:` | sessionCode (1–10), displayName (1–50, trimmed), avatarUrl (URL, max 2048, HTTP(S) refine) |
| Rejoin | `rejoinSchema` | wrapper `input:` | participantToken (UUID), sessionId (UUID) |
| Create | `createSessionSchema` | manual `safeParse()` | displayName (1–100), description (max 500), expiresInHours (0.5–720), maxParticipants (int 1–1000) |

### Result: ✅ No regression — M2 Zod schemas fully intact

---

## 8. Mock Data / Fallback (M1 Verification)

| Check | Result |
|-------|--------|
| `mockParticipant` constant in `[participantId]/route.ts` | ✅ **Removed** |
| `mockLog` constant in `[participantId]/route.ts` | ✅ **Removed** |
| `nora@example.com` anywhere in sessions domain | ✅ **Not found** |
| Catch block returns 200 with fake data | ✅ **Replaced** — proper 404 on not-found |
| Any fallback mock data in any sessions route | ✅ **None found** |

### Result: ✅ No regression — mock data fully eliminated

---

## Known P2/P3 — Re-confirmed (No Change)

These were documented in the original audit and remain as-is:

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| SESS-004 | Dual broadcast path in control route | P2 | Deferred — M4 post-launch |
| SESS-006 | N+1 queries in history/analytics | P2 | Performance backlog |
| SESS-010 | Board/lobby code-only auth | P2 | Documented design tradeoff |
| SESS-011 | Dual-channel `play:` + `session:` | P3 | Post-launch unification |
| SESS-012 | Token in localStorage | P3 | Post-launch security hardening |
| SESS-013 | setNextStarter race condition | P3 | Post-launch fix |
| — | Rejoin missing broadcast | P2 | Documented in audit, no change |
| — | Token cleanup missing broadcast | P2 | Documented in audit, no change |

---

## Summary

| Metric | Value |
|--------|-------|
| **Areas checked** | 8 |
| **Routes verified** | 20+ |
| **Files read** | 15+ |
| **New P0 gaps** | 0 |
| **New P1 gaps** | 0 |
| **New P2 gaps** | 0 |
| **Known P2/P3 re-confirmed** | 8 |
| **Code fixes required** | 0 |
| **Verdict** | ✅ PASS |
