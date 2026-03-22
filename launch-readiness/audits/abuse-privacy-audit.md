# Abuse & Privacy Audit — Lekbanken

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed cross-cutting abuse and privacy audit snapshot from the launch-readiness cycle. Use `launch-readiness/launch-control.md` for current launch state and current privacy/process docs for the live operating posture.

> **Auditor:** Claude (AI)  
> **Date:** 2026-03-14  
> **Scope:** Rate limiting, UUID enumeration, file upload abuse, GDPR compliance, API response data exposure, spam/DoS abuse vectors  
> **Status:** ✅ AUDIT COMPLETE — GPT-calibrated (2026-03-12). GDPR P0→P1 after self-service kill-switch.  
> **Finding count:** 39 findings (0 P0, 18 P1, 14 P2, 7 P3) — post-calibration, ABUSE-001/002 fixed

---

## 1. Executive Summary

The Lekbanken codebase has a **strong security posture for core business logic** (auth, tenant isolation, gamification economy) but has **significant gaps in privacy compliance and abuse prevention**. The GDPR self-service deletion flow only covered ~6% of user-data tables — **self-service has been disabled** (kill-switch applied 2026-03-12) and replaced with manual DSAR process via `privacy@lekbanken.se`. Rate limiting covers only 13.6% of API routes, and several public endpoints are unprotected against spam and enumeration.

**Critical areas:**
- GDPR deletion is materially incomplete — **self-service disabled, manual DSAR process active**
- Rate limiting coverage is 39/287 routes (13.6%)
- File upload lacks server-side MIME validation and quota enforcement
- Multiple routes leak Supabase error details (table names, constraint names)
- ~~Enterprise quote endpoint is a spam magnet~~ **Fixed** — rate limited + honeypot

---

## 2. Route Inventory — Rate Limiting Coverage

| Category | Routes | With rate limit | Coverage |
|----------|--------|-----------------|----------|
| Public (no auth) | ~25 | 3 | 12% |
| User mutations | ~65 | 12 | 18% |
| Admin routes | ~45 | 4 | 9% |
| Participant routes | ~15 | 15 (auto) | 100% |
| Webhooks | 1 | 0 | 0% (Stripe signature suffices) |
| **Total** | ~287 | 39 | **13.6%** |

**Rate limiter implementation:** IP-based via `x-forwarded-for`, in-memory `Map`, resets on deploy/restart. No distributed store. Tiers: `strict` (5/min), `api` (100/min), `auth` (10/15min), `participant` (60/min auto).

---

## 3. Findings

### Severity guide
- **P0** — Must fix before launch (regulatory/legal, active exploit vector)
- **P1** — Should fix before launch (security gap, data exposure)
- **P2** — Fix post-launch (quality, defense-in-depth)
- **P3** — Low priority (informational, nice-to-have)

---

### GPT Calibration (2026-03-12)

> **Decision:** GDPR findings PRIV-001–006 downgraded from **P0 → P1** based on GPT's two-step recommendation:
>
> 1. **Self-service kill-switch applied:** Both `/api/gdpr/delete` and `/api/gdpr/export` now return 503 with DSAR contact instructions (`privacy@lekbanken.se`, 30-day SLA per Art. 12(3)). Privacy settings page rewritten to show manual contact flow instead of export/delete buttons.
> 2. **Rationale (GPT):** The findings were P0 because the system exposed a self-service delete/export that gave a "misleading impression that the right was exercised" while large parts of PII persisted. With the self-service surface disabled, the system no longer makes a false promise — it's now an operational compliance gap (manual DSAR process), not a defective rights mechanism in production.
>
> **Post-launch requirement:** Self-service delete/export must be rebuilt with full table coverage before re-enabling. This is tracked as post-launch work.
>
> **Remaining P0s:** ABUSE-001 (enterprise quote spam) and ABUSE-002 (geocode open proxy) — both confirmed P0 by GPT.
>
> **Updated counts:** 2 P0 (ABUSE-001/002), 16 P1 (PRIV-001–006 + prior 10 P1), 14 P2, 7 P3.

---

### PRIV-001 — GDPR deletion covers ~6% of user-data tables (P1 — downgraded from P0 after kill-switch)

**Category:** Privacy / GDPR  
**Location:** `lib/gdpr/user-rights.ts` L287–380

**Description:** `deleteUserData()` only deletes from **3 tables**: `user_consents`, `cookie_consents`, `user_tenant_memberships`. Activity log "anonymization" is a no-op (pushes to array, no SQL executed).

**Tables with user PII NOT deleted:** `user_profiles`, `user_devices`, `user_achievements`, `user_progress`, `user_streaks`, `user_coins`, `user_cosmetics`, `user_cosmetic_loadout`, `user_powerup_inventory`, `user_gamification_preferences`, `user_journey_preferences`, `user_achievement_showcase`, `participant_sessions`, `participant_game_progress`, `participant_activity_log`, `user_mfa`, `mfa_trusted_devices`, `mfa_audit_log`, `user_audit_logs`, `user_sessions`, `notification_preferences`, `friend_requests`, `friends`, `leader_profile`, `gamification_daily_summaries`, `gamification_events`, `coin_transactions`, `content_reports`, `plan_notes_private`

**Risk:** GDPR Article 17 violation. User receives "deletion completed" confirmation while the majority of their PII remains in the database.

---

### PRIV-002 — Supabase Auth user not deleted in self-service GDPR flow (P1 — downgraded from P0 after kill-switch)

**Category:** Privacy / GDPR  
**Location:** `lib/gdpr/user-rights.ts`, `app/api/gdpr/delete/route.ts` L84

**Description:** GDPR delete calls `supabase.auth.signOut()` but never calls `auth.admin.deleteUser()`. The user's auth record in `auth.users` (email, encrypted password, metadata) persists indefinitely. Uses RLS client which can't call admin methods — would need service role.

The admin function at `features/admin/users/userActions.server.ts` L218 does call `auth.admin.deleteUser()` correctly, but the self-service flow doesn't.

**Risk:** User email and auth credentials remain in Supabase after "deletion." Major GDPR violation.

---

### PRIV-003 — GDPR data export is incomplete (P1 — downgraded from P0 after kill-switch)

**Category:** Privacy / GDPR  
**Location:** `lib/gdpr/user-rights.ts` L149–207

**Description:** `exportUserData()` exports from **6 tables** only: `users`, `user_consents`, `user_tenant_memberships`, `user_audit_logs`, `gdpr_requests`, `user_legal_acceptances`. Missing: `user_profiles`, `user_devices` (IP addresses, device fingerprints), achievements, gamification data, play session data, billing/payment data, MFA devices, notification preferences, friend lists, content reports, media uploads.

**Risk:** GDPR Article 15 (Right of Access) violation. Current export is partial.

---

### PRIV-004 — IP addresses stored in 6+ tables without retention enforcement (P1 — downgraded from P0 after kill-switch)

**Category:** Privacy / GDPR  
**Location:** Multiple routes and tables

**Stored in:**
- `cookie_consent_audit` / `anonymous_cookie_consents` — `app/api/consent/log/route.ts` L63
- MFA audit tables — `app/api/accounts/auth/mfa/verify/route.ts` L86
- `user_devices` — `app/api/accounts/devices/route.ts` L6
- Participant sessions — `app/api/participants/sessions/join/route.ts` L112

**Description:** `data_retention_policies` table exists (migration `20260114200000`) with fields for retention periods and actions, but **no cron job, function, or trigger** reads or executes these policies. Data never auto-expires.

**Risk:** IP addresses are PII under GDPR. Data minimization principle violation (Art. 5(1)(c)).

---

### PRIV-005 — `users` profile row not deleted in self-service flow (P1 — downgraded from P0 after kill-switch)

**Category:** Privacy / GDPR  
**Location:** `lib/gdpr/user-rights.ts` L287–380

**Description:** The self-service `deleteUserData()` never deletes from the `users` table (public profile row with email, full_name, avatar_url). The admin `deleteUser()` does delete this row.

**Risk:** Primary PII table survives self-service deletion.

---

### PRIV-006 — Activity log anonymization is a no-op (P1 — downgraded from P0 after kill-switch)

**Category:** Privacy / GDPR  
**Location:** `lib/gdpr/user-rights.ts` L329–333

**Description:** Code comments say "We set user_id to NULL to anonymize but keep aggregate data" but **no SQL UPDATE is executed**. The code only does `anonymizedCategories.push('activity_logs')`. The deletion response reports anonymization as completed — this is misleading.

**Risk:** Activity logs with full user attribution survive deletion. False audit trail.

---

### ~~ABUSE-001 — Enterprise quote endpoint: no auth, no rate limit, no CAPTCHA~~ (✅ Fixed — was P0)

**Category:** Abuse / Spam  
**Location:** `app/api/enterprise/quote/route.ts`

**Description:** ~~Unauthenticated POST endpoint with no rate limiting and no CAPTCHA.~~ **Fixed:** Wrapped in `apiHandler({ auth: 'public', rateLimit: 'strict' })` (5 req/min). Zod validation moved into wrapper. Honeypot field (`website`) added — bots auto-filling hidden fields get rejected by `z.string().max(0)`.

**Risk:** ~~DB pollution, potential email spam vector, wasted business time processing fake quotes.~~ **Mitigated.**

---

### ~~ABUSE-002 — Geocode proxy: open, unauthenticated, no rate limit~~ (✅ Fixed — was P0)

**Category:** Abuse / SSRF-adjacent  
**Location:** `app/api/geocode/route.ts`

**Description:** ~~Open geocoding proxy to Nominatim. No auth, no rate limit, no `apiHandler`.~~ **Fixed:** Wrapped in `apiHandler({ auth: 'user', rateLimit: 'strict' })`. Now requires authentication (only admin spatial editor uses this). `limit` parameter clamped to 1–10.

**Risk:** ~~Third-party service abuse, IP-level ban from Nominatim.~~ **Mitigated.**

---

### ABUSE-003 — MFA routes: 8 security-critical mutations without rate limiting (P1)

**Category:** Security / Rate Limiting  
**Location:** `app/api/accounts/auth/mfa/` — 8 route files

**Routes affected:**
- `mfa/enroll` POST
- `mfa/verify` POST
- `mfa/challenge` POST
- `mfa/disable` POST
- `mfa/recovery-codes/verify` POST
- `mfa/devices/verify` POST
- `mfa/devices/trust` POST
- Implied: `mfa/devices/untrust`

**Description:** All MFA routes use `auth: 'user'` but none have `rateLimit`. Brute-force attacks on TOTP verification codes (6 digits, 1M keyspace) are possible at high request rates.

**Risk:** MFA bypass via brute-force TOTP code submission.

---

### ABUSE-004 — Public play session routes: no rate limiting on mutations (P1)

**Category:** Rate Limiting  
**Location:** `app/api/play/sessions/[id]/` — 8 public route files

**Routes affected:** `chat`, `signals`, `state`, `triggers`, `artifacts`, `roles`, `decisions`, `outcome` — all use `auth: 'public'` with no rate limit.

**Description:** These routes rely on viewer/participant resolution internally but have no request throttling. Chat messages can be sent at unlimited rate. Signal broadcasts are unbounded. State mutations lack protection.

**Risk:** Session flooding/disruption, chat spam, real-time channel saturation.

---

### UPLOAD-001 — No MIME type / file type validation on server (P1)

**Category:** Upload / Security  
**Location:** `app/api/media/upload/route.ts` L10

**Description:** `fileType` is `z.string().min(1)` — the client declares any content type. No server-side allowlist validation, no magic-byte verification. SVGs are not blocked or sanitized. Declared type is passed to signed URL `Content-Type` header.

**Risk:** SVG injection, executable HTML upload, polyglot file abuse. If served from same origin, XSS via uploaded SVG.

---

### UPLOAD-002 — File size declared-only, not enforced server-side (P1)

**Category:** Upload / Abuse  
**Location:** `app/api/media/upload/route.ts` L11

**Description:** Schema has `fileSize: z.number().max(10 * 1024 * 1024)` but this is a **declared** size — the actual upload goes directly to Supabase via signed URL. Supabase bucket-level limits are the only real enforcement. Spatial preview upload at `artifact-actions.ts` L314 has **no size limit at all** on base64 payloads.

**Risk:** Storage exhaustion, memory DoS via large base64 payloads.

---

### UPLOAD-003 — Storage quota defined but never enforced (P1)

**Category:** Upload / Abuse  
**Location:** `lib/features/tenant-features.ts` L45

**Description:** `max_storage_mb` quota is defined per plan tier (100MB–10GB) but **no code ever calls `getStorageUsage()` or checks quota** before generating upload URLs. Any authenticated user can upload unlimited files.

**Risk:** Storage cost overrun, tenant resource exhaustion.

---

### LEAK-001 — Supabase error messages returned verbatim in API responses (P1)

**Category:** Data Exposure  
**Location:** 17+ route files (see list below)

**Description:** Many routes catch Supabase errors and include `error.message` directly in the API response, leaking table names, column names, constraint names, and PostgreSQL error codes. The `apiHandler` wrapper sanitizes unhandled errors, but these routes catch errors _before_ propagation.

**Affected routes:** `gamification/events`, `games/builder/[id]`, `games/builder`, `accounts/profile`, `billing/usage`, `billing/usage/aggregate`, `play/sessions`, `play/sessions/[id]/participants`, `plans/schedules`, `plans/schedules/[id]`, `admin/gamification/seed-rules`, `accounts/auth/password/change`, `accounts/auth/email/change`, `billing/subscription/update`, `gamification/coins/transaction`, `shop`

**Worst case:** `games/builder/[id]` returns `toolsError.message`, `toolsError.code`, `toolsError.hint`, `toolsError.details` — full Supabase/PostgREST error exposition.

**Risk:** Information disclosure — attackers learn internal schema structure.

---

### LEAK-002 — Stripe customer ID exposed via tenant `select('*')` (P1)

**Category:** Data Exposure  
**Location:** `app/api/tenants/[tenantId]/route.ts` L13

**Description:** Uses `select('*')` and returns the full tenant object. The `metadata` JSONB column contains `stripe_customer_id`. Any tenant member can read the Stripe customer ID for their tenant — and potentially other tenants if `tenantId` validation is weak.

**Risk:** Stripe customer ID leakage enables targeted abuse via Stripe API.

---

### LEAK-003 — `select('*')` returns full DB rows on user-facing endpoints (P1)

**Category:** Data Exposure  
**Location:** Multiple routes

| Route | Table | Leaks |
|-------|-------|-------|
| `accounts/sessions` | `user_sessions` | IP addresses, user agents, internal session IDs |
| `accounts/devices` | `user_devices` | Device fingerprints, IPs |
| `accounts/profile` | `user_profiles` | All profile columns |
| `tenants/[tenantId]/settings` | `tenant_settings` | Full settings row |
| `billing/.../seats/[seatId]` | joins | User emails of seat holders |

**Risk:** Over-exposure of PII and internal data. Should use explicit column lists.

---

### ENUM-001 — Session preview endpoint: no rate limit, exposes UUID↔code mapping (P1)

**Category:** Enumeration  
**Location:** `app/api/participants/sessions/[sessionId]/route.ts` L23–68

**Description:** `auth: 'public'`, no rate limit. Accepts both 6-char session codes and full UUIDs. Returns `{ id, sessionCode, displayName, ... }`. Combined with 6-char codes (32^6 = ~1B keyspace), the preview endpoint enables faster brute-force than the rate-limited join endpoint.

**Risk:** Session code enumeration via the unprotected preview endpoint.

---

### ENUM-002 — Join endpoint leaks precise session status per code (P2)

**Category:** Enumeration  
**Location:** `app/api/participants/sessions/join/route.ts` L44–80

**Description:** Returns different error messages for each state: "Session not found" (404), "Session is not open" (403), "Session is locked" (403), "Session has ended" (410), "Session is full" (403). Attacker can confirm valid codes and determine session state.

**Mitigation:** Join endpoint has `rateLimit: 'strict'` (5/min), limiting probe speed.

**Risk:** Information leakage, mitigated by rate limiting.

---

### ENUM-003 — Game triggers 404 vs 403 leaks game existence (P2)

**Category:** Enumeration  
**Location:** `app/api/games/[gameId]/triggers/route.ts` L33

**Description:** Returns "Game not found" (404) vs "Forbidden" (403) based on access check — allows distinguishing between "doesn't exist" and "exists but forbidden."

**Risk:** Low — UUIDs are 128-bit, making random probing impractical.

---

### ENUM-004 — Play session routes: DB lookup before auth enables timing enumeration (P2)

**Category:** Enumeration  
**Location:** `app/api/play/sessions/[id]/roles/route.ts` L24, `state/route.ts` L42, `outcome/route.ts` L46

**Description:** Multiple `auth: 'public'` play routes do a session DB lookup before verifying the caller has access, causing measurable timing differences between valid and invalid UUIDs.

**Risk:** Low — UUIDs are 128-bit, random probing impractical. Only relevant if attacker has partial UUID knowledge.

---

### UPLOAD-004 — Upload confirm route lacks rate limiting (P2)

**Category:** Upload  
**Location:** `app/api/media/upload/confirm/route.ts` L15

**Risk:** Can be called rapidly to enumerate files or brute-force paths.

---

### UPLOAD-005 — `media-images`/`media-audio` bucket RLS overly permissive (P2)

**Category:** Upload / Storage  
**Location:** `supabase/migrations/20251229090000_media_artifact_buckets.sql` L22–27

**Description:** Policies allow any authenticated user to read/insert/update/delete in `media-images` and `media-audio` buckets. No tenant scoping. Migration comment: "intentionally minimal — tighten later."

**Risk:** Cross-tenant media access at storage level. Mitigated by app-level tenant checks on upload route.

---

### ABUSE-005 — Demo tracking endpoints: no auth, no rate limit (P2)

**Category:** Abuse  
**Location:** `app/api/demo/track/route.ts`, `app/api/demo/convert/route.ts`

**Description:** No `apiHandler`, no rate limit. Cookie-based session ID (forgeable). DB writes on every request.

**Risk:** DB pollution, analytics data poisoning.

---

### ABUSE-006 — Invitation creation has no per-tenant throttle (P2)

**Category:** Abuse  
**Location:** `app/api/tenants/[tenantId]/invitations/route.ts`

**Description:** Tenant admin can create unlimited invitations. Each stores an email address. If email sending is later implemented, becomes an email spam vector.

**Risk:** Storage pollution, future email spam risk.

---

### ABUSE-007 — System metrics endpoint: expensive, no rate limit (P2)

**Category:** Abuse / DoS  
**Location:** `app/api/system/metrics/route.ts`

**Description:** Performs 5+ concurrent DB queries including a 1000-row fetch for latency calculation. Requires auth but no rate limit.

**Risk:** DB-level DoS via repeated metric fetches.

---

### ABUSE-008 — Chat messages: public auth, no explicit rate limit (P2)

**Category:** Abuse  
**Location:** `app/api/play/sessions/[id]/chat/route.ts` L31

**Description:** `auth: 'public'` with inline viewer resolution. Message length capped at 1000 chars. No rate limiting on message frequency.

**Risk:** Chat message flooding in play sessions.

---

### LEAK-004 — Sandbox inventory endpoint: unauthenticated, leaks file paths (P2)

**Category:** Data Exposure  
**Location:** `app/api/sandbox/inventory/route.ts` L9

**Description:** No auth, no rate limit. Error response leaks server filesystem path (`inventoryPath`, `cwd`). Reads `inventory.json` from disk on every request.

**Risk:** Server path disclosure, disk I/O DoS.

---

### PRIV-007 — Consent log stores PII without retention policy (P2)

**Category:** Privacy  
**Location:** `app/api/consent/log/route.ts` L49–63

**Description:** Public endpoint stores IP address, user agent, page URL, referrer for anonymous visitors. No documented retention period. Has strict rate limiting and Zod validation.

**Risk:** PII accumulation from anonymous visitors without cleanup.

---

### PRIV-008 — Data retention policies are schema-only, not enforced (P2)

**Category:** Privacy  
**Location:** `supabase/migrations/20260114200000_gdpr_compliance_tables.sql` L163–196

**Description:** `data_retention_policies` table exists with `retention_period`, `action_on_expiry`, `next_execution_at`. No cron job, function, or trigger reads this table.

**Risk:** Infrastructure exists but is inert — data never auto-expires.

---

### ABUSE-009 — Financial routes without rate limiting (P2)

**Category:** Rate Limiting  
**Location:** Multiple billing routes

**Routes:** `billing/tenants/[tenantId]/subscription` POST+PATCH, `billing/tenants/[tenantId]/invoices` POST, `billing/.../payments` POST, `billing/.../seats` POST, `billing/dunning/[id]/retry` POST, `billing/dunning/[id]/cancel` POST, `shop` POST, `shop/powerups/consume` POST

**Description:** All use `auth: 'user'` with internal tenant role checks but no rate limiting. Financial operations should have explicit throttling.

**Risk:** Automated purchase/billing manipulation at scale.

---

### LEAK-005 — Email exposure in seat management (P3)

**Category:** Data Exposure  
**Location:** `app/api/billing/tenants/[tenantId]/seats/[seatId]/route.ts` L39

**Description:** Seat PATCH response includes `user:users(id,email,full_name)`, exposing user emails to tenant admins. Borderline acceptable for admin context.

---

### ENUM-005 — Heartbeat two-step 404 leaks session/participant existence (P3)

**Category:** Enumeration  
**Location:** `app/api/play/heartbeat/route.ts` L34–50

**Description:** Sequential 404s: "Session not found" then "Participant not found" — allows probing.

---

### ENUM-006 — Board endpoint exposes full game content for guessed codes (P3)

**Category:** Enumeration  
**Location:** `app/api/play/board/[code]/route.ts` L10–21

**Description:** Raw GET with inline `applyRateLimitMiddleware('api')`. Returns full board state including game content. Rate limited, but content exposure is generous.

---

### UPLOAD-006 — Avatar content-type not verified by magic bytes (P3)

**Category:** Upload  
**Location:** `lib/profile/profile-service.ts` L263

**Description:** `allowedTypes` check exists (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) but uses client-supplied `file.type`, not magic-byte verification.

---

### UPLOAD-007 — Filename sanitization allows double-extensions (P3)

**Category:** Upload  
**Location:** `app/api/media/upload/route.ts` L46

**Description:** `fileName.replace(/[^a-zA-Z0-9.-]/g, '_')` prevents path traversal but allows `file.html.png`. Low risk since files are served from Supabase storage domain.

---

### ABUSE-010 — Admin routes: ~40 routes without rate limiting (P3)

**Category:** Rate Limiting  
**Location:** `app/api/admin/` — ~40 route files

**Description:** Only 4 admin routes have rate limiting. The rest rely on `system_admin` auth as the sole protection. Acceptable for launch since admin accounts are trusted.

---

### LEAK-006 — PII (user UUIDs) logged to console (P3)

**Category:** Privacy / Logging  
**Location:** `achievements/unlock/route.ts` L212, `play/runs/active/route.ts` L99, `play/runs/[runId]/abandon/route.ts` L57

**Description:** User IDs logged via `console.log`. UUIDs are pseudonymous PII — generally acceptable with proper log retention.

---

## 4. Remediation Plan

### M1 — GDPR Compliance Critical (PRIV-001 through PRIV-006) — **Before launch**

- [ ] **PRIV-001** — Expand `deleteUserData()` to cascade-delete from all user-data tables (or use a DB function with `ON DELETE CASCADE`)
- [ ] **PRIV-002** — Add `auth.admin.deleteUser()` via service role client to self-service GDPR deletion
- [ ] **PRIV-003** — Expand `exportUserData()` to include all user-data tables
- [ ] **PRIV-004** — Implement data retention cron job (or at minimum, document retention periods for IP storage)
- [ ] **PRIV-005** — Add `users` table row deletion to self-service flow
- [ ] **PRIV-006** — Either implement actual activity log anonymization (SET user_id = NULL) or remove the misleading category push

### M2 — Abuse Prevention Critical (ABUSE-001, ABUSE-002, ABUSE-003) — **Before launch**

- [x] **ABUSE-001** — ~~Add rate limiting + honeypot/CAPTCHA to enterprise quote endpoint~~ ✅ Fixed: `apiHandler({ auth: 'public', rateLimit: 'strict' })` + honeypot field
- [x] **ABUSE-002** — ~~Add `apiHandler({ auth: 'user', rateLimit: 'strict' })` to geocode proxy~~ ✅ Fixed: auth-gated + rate limited + limit clamped
- [ ] **ABUSE-003** — Add `rateLimit: 'auth'` to all MFA routes

### M3 — Data Exposure Fix (LEAK-001, LEAK-002, LEAK-003, UPLOAD-001) — **Before launch**

- [ ] **LEAK-001** — Replace `error.message` with generic messages in all 17+ routes
- [ ] **LEAK-002** — Replace `select('*')` with explicit columns on tenant route (exclude `metadata.stripe_customer_id`)
- [ ] **LEAK-003** — Replace `select('*')` with explicit columns on sessions, devices, profile endpoints
- [ ] **UPLOAD-001** — Add MIME type allowlist validation on upload route (allowed: `image/*`, `audio/*`, `video/*`, `application/pdf`; block: `text/html`, `image/svg+xml`, `application/javascript`)

### M4 — Session Enumeration Fix (ENUM-001, ABUSE-004) — **Before launch**

- [ ] **ENUM-001** — Add `rateLimit: 'api'` to participant session preview endpoint
- [ ] **ABUSE-004** — Add `rateLimit: 'api'` to public play session routes (chat, signals, state, triggers, artifacts, roles, decisions, outcome)

### M5 — Upload Hardening (UPLOAD-002, UPLOAD-003) — **Post-launch**

- [ ] **UPLOAD-002** — Enforce file size at Supabase bucket level; add size limit to spatial preview
- [ ] **UPLOAD-003** — Implement storage quota check before signed URL generation

### M6 — Remaining Rate Limiting + Cleanup — **Post-launch**

- [ ] **ABUSE-005** — Rate limit demo endpoints
- [ ] **ABUSE-006** — Add per-tenant invitation throttle
- [ ] **ABUSE-007** — Rate limit system metrics
- [ ] **ABUSE-008** — Rate limit chat messages
- [ ] **ABUSE-009** — Rate limit financial routes
- [ ] **ENUM-002** — Normalize join error responses
- [ ] **PRIV-007** — Document consent log retention period
- [ ] **PRIV-008** — Implement retention cron or document as accepted risk
- [ ] **LEAK-004** — Add auth to sandbox inventory or restrict to dev

### M7 — Low Priority Cleanup — **Post-launch**

- [ ] **UPLOAD-004/005/006/007** — Confirm route rate limit, bucket RLS, avatar magic bytes, double extensions
- [ ] **ENUM-003/004/005/006** — Normalize error responses, reorder auth checks
- [ ] **ABUSE-010** — Add rate limits to admin routes
- [ ] **LEAK-005/006** — Email exposure, console logging

---

## 5. Security Strengths Identified

1. **Consent management** — Full cookie consent system with granular controls, audit logging, and strict rate limiting
2. **GDPR infrastructure exists** — `gdpr_requests`, `data_retention_policies`, `user_consents` tables and routes are in place (execution incomplete)
3. **apiHandler error sanitization** — Unhandled errors are properly sanitized by the wrapper (problem is routes catching before propagation)
4. **Participant auto-rate-limiting** — All `auth: 'participant'` routes get automatic 60/min throttling
5. **Session code design** — 32-char alphabet, 6 characters, ~1B keyspace — reasonable for short-lived session codes
6. **Upload filename sanitization** — Regex-based path traversal prevention is correct
7. **Avatar upload scoping** — `avatars` bucket is well-scoped to `custom/{uid}.png` per user
8. **Auth-sensitive routes** — Password change, email change, GDPR export/delete all use `rateLimit: 'auth'`
9. **No SSRF** — Geocode proxy uses hardcoded base URL, user only controls query parameter

---

## 6. Cross-Reference to Existing Audits

| This audit | Overlaps with | Status |
|-----------|---------------|--------|
| UPLOAD-001/002/003 | MEDIA-001/002 (media-audit.md) | MEDIA P1s fixed; upload validation still incomplete |
| UPLOAD-005 | MEDIA-003 (media-audit.md) | Same finding — bucket RLS overly permissive |
| ABUSE-003 (MFA rate limit) | SEC-002b (security-auth-audit.md) | Related — SEC-002b is about rate limiter architecture |
| ENUM-001 | SESS-011 (sessions-audit.md) | Session preview endpoint — flagged in both |
| LEAK-001 | SYS-001 (api-consistency-audit.md) | Wrapper convergence would fix most error leakage |
| PRIV-004 | New finding — not covered in prior audits | |

---

## 7. Priority Summary

| Milestone | Findings | Priority | Est. effort |
|-----------|----------|----------|-------------|
| M1 — GDPR Critical | PRIV-001–006 | **P1 — Before launch (self-service disabled, manual DSAR active)** | Medium (DB function + service role) |
| M2 — Abuse Prevention | ABUSE-001–003 | **✅ ABUSE-001/002 Fixed. ABUSE-003 P1 — Before launch** | Low (rate limits + Zod) |
| M3 — Data Exposure | LEAK-001–003, UPLOAD-001 | **P1 — Before launch** | Medium (17+ error message fixes + select audits) |
| M4 — Session Enumeration | ENUM-001, ABUSE-004 | **P1 — Before launch** | Low (rate limit additions) |
| M5 — Upload Hardening | UPLOAD-002–003 | P2 — Post-launch | Medium |
| M6 — Remaining Rate Limiting | 9 findings | P2 — Post-launch | Low |
| M7 — Low Priority | 8 findings | P3 — Post-launch | Low |
