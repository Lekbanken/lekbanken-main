# Demo Domain Audit

**Domain:** Demo (ephemeral users, demo sessions, feature gating, conversion tracking)  
**Scope:** Full domain audit — security, isolation, abuse tolerance, UX dead ends, telemetry  
**Date:** 2025-07-14  
**Verdict:** 18 findings (0 P0, 3 P1, 10 P2, 5 P3). No blocking launch issues.

---

## Executive Summary

The Demo domain is a comprehensive system supporting anonymous/ephemeral access to Lekbanken with free/premium tier gating, 2-hour sessions, conversion tracking, and admin analytics. Infrastructure is fully built across 8 route files, 5+ components, dedicated lib modules, seed data, and a cleanup edge function.

**Key strengths:** Cookie-based session tracking (httpOnly), Supabase RPC for data mutations, dedicated demo tenant isolation, feature gate system, cleanup edge function.

**Key risks:** Rate limiting is in-memory (serverless-incompatible), 3 API routes not wrapped with `apiHandler`, premium access code hardcoded, error details leak in auth route.

---

## Route Inventory

| Route | Method | Wrapped | Auth Level | Purpose |
|-------|--------|---------|------------|---------|
| `/auth/demo` | GET | ❌ | Public | Check demo availability |
| `/auth/demo` | POST | ❌ | Public | Create ephemeral user + session |
| `/auth/demo` | DELETE | ❌ | Public | End demo session (clear cookie) |
| `/api/demo/status` | GET | ✅ | `auth: 'public'` | Check demo session status |
| `/api/demo/convert` | POST | ❌ | Cookie only | Mark session as converted |
| `/api/demo/track` | POST | ❌ | Cookie only | Track feature usage |
| `/api/plans/[planId]/play` | GET | ✅ | `auth: 'public'` | Public plan view (demo entry) |
| `/admin/demo` | Page | N/A | Admin | Analytics dashboard |

**Supporting infrastructure:**
- `lib/auth/ephemeral-users.ts` — Ephemeral user creation/sign-in
- `lib/utils/demo-detection.ts` — Client-side demo state detection
- `lib/rate-limit/demo-rate-limit.ts` — IP-based rate limiting
- `components/demo/` — DemoBanner, DemoFeatureGate, DemoConversionModal, FeatureGateMap
- `hooks/useIsDemo.ts` — Client hooks for demo state
- `supabase/functions/cleanup-demo-data/` — Nightly cleanup edge function
- `supabase/seeds/01_demo_tenant.sql` + `02_demo_content.sql` — Demo data

---

## Findings

### DEMO-001 — Rate limiting is in-memory only (P1) ✅ **FIXAD (2026-03-14)**

**File:** `lib/rate-limit/demo-rate-limit.ts`  
**Issue:** Rate limiter uses `new Map()` — per-instance in serverless. Each cold start gets a fresh store. Vercel runs many concurrent instances.  
**Impact:** Rate limit effectively useless in production. Attacker can create unlimited demo accounts by hitting different instances.  
**Fix:** Replaced with Supabase-backed rate limiting (launch-sufficient). Counts `demo_sessions` created in the last hour with matching `metadata->>'client_ip'`. Cross-instance persistent without new dependencies. Client IP stored in session metadata on creation.  
**Note:** This is a launch-sufficient persistent rate limiter, not a full platform-wide rate-limit solution. Sufficient for current demo scope. Platform-wide rate limiting (e.g. Upstash) remains deferred per SEC-002b.

### DEMO-002 — Premium access code hardcoded (P1) ✅ **FIXAD (2026-03-14)**

**File:** `lib/auth/ephemeral-users.ts` (L32), `app/auth/demo/route.ts` (L105)  
**Issue:** `DEMO_PREMIUM_2024` is in source code as fallback: `process.env.DEMO_PREMIUM_ACCESS_CODE || 'DEMO_PREMIUM_2024'`. Discoverable in source history or client bundle.  
**Impact:** Anyone who discovers the code gets premium demo access.  
**Fix:** Removed hardcoded fallback. If `DEMO_PREMIUM_ACCESS_CODE` env var is not set, premium tier returns 503 "Premium demo not configured".

### DEMO-003 — Error details leak in auth route (P1) ✅ **FIXAD (2026-03-14)**

**File:** `app/auth/demo/route.ts` (L147)  
**Issue:** `details: error?.message` exposes internal error messages to the client on demo setup failure.  
**Impact:** Information disclosure — could reveal database errors, Supabase config, or internal state.  
**Fix:** Removed `details` field from error response. Internal errors are logged server-side only.

### DEMO-004 — auth/demo route not wrapped with apiHandler (P2)

**File:** `app/auth/demo/route.ts`  
**Issue:** Uses raw Next.js route handlers instead of `apiHandler()`. Misses standardized error handling, CORS headers, and request logging.  
**Mitigations:** Route has its own error handling and rate limiting. The auth entry point is inherently special.  
**Fix:** Wrap with `apiHandler({ auth: 'public' })` for consistency.

### DEMO-005 — convert route not wrapped with apiHandler (P2)

**File:** `app/api/demo/convert/route.ts`  
**Issue:** Not wrapped with `apiHandler()`. No auth check beyond cookie presence.  
**Mitigations:** Uses httpOnly cookie (not forgeable via XSS). RLS client used for Supabase calls. RLS policy on `demo_sessions` restricts to service_role and own sessions.  
**Fix:** Wrap with `apiHandler({ auth: 'public' })`.

### DEMO-006 — track route not wrapped with apiHandler (P2)

**File:** `app/api/demo/track/route.ts`  
**Issue:** Not wrapped with `apiHandler()`. No auth check beyond cookie presence.  
**Mitigations:** Same as DEMO-005. Tracking data is non-sensitive analytics.  
**Fix:** Wrap with `apiHandler({ auth: 'public' })`.

### DEMO-007 — convert/track metadata not validated (P2)

**File:** `app/api/demo/convert/route.ts` (L71), `app/api/demo/track/route.ts` (L70)  
**Issue:** `metadata` parameter accepts arbitrary JSON with no size or schema validation. Stored directly in `demo_sessions.metadata` (JSONB).  
**Impact:** Attacker could store large payloads in the metadata field, causing DB bloat.  
**Mitigations:** Requires valid httpOnly session cookie. RLS limits writes to own sessions.  
**Fix:** Add Zod schema with max depth/size constraints.

### DEMO-008 — Cleanup edge function not scheduled via pg_cron (P2)

**File:** `supabase/functions/cleanup-demo-data/index.ts`  
**Issue:** Edge function exists and works but comment says `SELECT cron.schedule(...)` — schedule may not be applied. If not triggered, ephemeral users and sessions accumulate.  
**Fix:** Verify pg_cron schedule exists in production. Add migration if missing.

### DEMO-009 — IP extraction trusts proxy headers without validation (P2)

**File:** `lib/rate-limit/demo-rate-limit.ts`  
**Issue:** `getClientIP()` reads `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip` directly. If Vercel/Cloudflare strips these, it's safe. If custom proxy, headers could be spoofed.  
**Mitigations:** Vercel automatically sets `x-forwarded-for` from the real client IP and strips forged values. Behind Cloudflare, `cf-connecting-ip` is trustworthy.  
**Fix:** Document that this is safe only behind Vercel/Cloudflare. No code change needed unless proxy stack changes.

### DEMO-010 — Demo tenant allows play sessions that pollute real analytics (P2)

**File:** Various play/session routes  
**Issue:** Demo users join/create play sessions under the demo tenant. If analytics queries don't filter `tenant_id = DEMO_TENANT_ID`, demo sessions pollute real usage metrics.  
**Fix:** Ensure analytics dashboards and aggregation queries exclude demo tenant.

### DEMO-011 — No body size limit on demo API routes (P2)

**File:** `app/api/demo/convert/route.ts`, `app/api/demo/track/route.ts`  
**Issue:** No request body size validation. Attacker could send large POST bodies.  
**Mitigations:** Next.js has a default body parser limit (1MB). Vercel has a 4.5MB limit.  
**Fix:** Add explicit body size check or rely on platform defaults (document decision).

### DEMO-012 — demo_session_id cookie not validated as UUID (P2)

**File:** `app/api/demo/convert/route.ts`, `app/api/demo/track/route.ts`  
**Issue:** Cookie value passed directly to RPC without UUID format validation. Supabase will reject invalid UUIDs, but the error path may leak info.  
**Fix:** Add UUID format validation before passing to RPC.

### DEMO-013 — demo-expired page uses client component without auth check (P3)

**File:** `app/demo-expired/page.tsx`  
**Issue:** No server-side check that the user actually had a demo session. Anyone can navigate to `/demo-expired`.  
**Impact:** Minimal — page just shows a "session expired" message with signup CTA.  
**Fix:** Not needed — page is informational with no security impact.

### DEMO-014 — Demo DemoBanner time remaining calculated client-side (P3)

**File:** `hooks/useIsDemo.ts`  
**Issue:** Time remaining calculated from cookie expiry, polled every 60s. Clock skew could cause premature/late expiry display.  
**Impact:** UX only — actual session expiry is enforced server-side.  
**Fix:** No fix needed unless UX complaints arise.

### DEMO-015 — Feature gate definitions in client bundle (P3)

**File:** `components/demo/FeatureGateMap.tsx`  
**Issue:** Feature limits (max 3 activities, max 2 schedules) are defined in client-side code. Determined attacker can bypass by calling APIs directly.  
**Mitigations:** Feature gates are UX guardrails for demo users. Server-side RLS and tenant-scoped data provide real enforcement.  
**Fix:** Add server-side enforcement if feature limits become business-critical.

### DEMO-016 — No CSRF protection on auth/demo POST (P3)

**File:** `app/auth/demo/route.ts`  
**Issue:** POST endpoint creates user and session without CSRF token. SameSite=Lax cookie provides partial protection.  
**Impact:** Attacker could trick user into starting a demo session via cross-site form submission. The impact is minimal — user gets a demo they didn't ask for.  
**Fix:** Add CSRF token or rely on SameSite cookie protection (current approach is acceptable for demo).

### DEMO-017 — Gamification events fire during demo sessions (P3)

**File:** `lib/services/gamification-events.server.ts`  
**Issue:** Demo users can trigger gamification events (XP, badges) that are attributed to the demo tenant. If not cleaned up, this creates orphaned data.  
**Mitigations:** Cleanup edge function handles demo user deletion. Gamification data for ephemeral users should cascade-delete.  
**Fix:** Verify CASCADE constraints exist on gamification tables for user_id FK.

### DEMO-018 — Delete handler only clears cookie, doesn't end DB session (P3)

**File:** `app/auth/demo/route.ts` (DELETE handler)  
**Issue:** DELETE only clears the `demo_session_id` cookie. The database session remains active until TTL expiry or cleanup function runs.  
**Impact:** Minor — session expires naturally. The user just loses their cookie tracking.  
**Fix:** Add `supabase.from('demo_sessions').update({ ended_at: now() }).eq('id', sessionId)` to mark session as ended.

---

## Summary

| Severity | Count | Launch Blocking? |
|----------|-------|-----------------|
| P0 | 0 | — |
| P1 | 3 | DEMO-001 (rate limit), DEMO-002 (access code), DEMO-003 (error leak) |
| P2 | 10 | No — defense-in-depth gaps with existing mitigations |
| P3 | 5 | No — UX/polish/edge cases |

---

## Recommended Milestones

### M1 — Launch Critical (P1 fixes) ✅ KLAR (2026-03-14)
- [x] DEMO-001: Replaced in-memory rate limiter with Supabase-backed (DB query on `demo_sessions.metadata->>'client_ip'`)
- [x] DEMO-002: Removed hardcoded premium access code fallback; blocks premium if env var not set
- [x] DEMO-003: Removed `error.message` from client response

### M2 — Launch Hardening (P2 fixes) — Deferred post-launch
- [ ] DEMO-004/005/006: Wrap auth/demo, convert, track with apiHandler
- [ ] DEMO-007: Add Zod schema for metadata fields
- [ ] DEMO-008: Verify pg_cron schedule for cleanup function
- [ ] DEMO-009: Document proxy header trust model
- [ ] DEMO-010: Filter demo tenant from analytics
- [ ] DEMO-011: Document body size limits
- [ ] DEMO-012: Add UUID validation for cookie values

### M3 — Post-Launch Polish (P3 fixes)
- [ ] DEMO-013–018: UX improvements and cleanup
