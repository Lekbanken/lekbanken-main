# Demo Remediation Plan

**Domain:** Demo  
**Scope:** M1 + M2 — Fix P1 findings from demo-audit.md + follow-up fixes from regression  
**Date:** 2025-07-14  
**Status:** M1 ✅ KLAR | M2 ✅ KLAR

---

## M1 — P1 Fixes (Launch Critical)

### DEMO-001: Replace in-memory rate limiter with DB-backed limiter

**Problem:** `lib/rate-limit/demo-rate-limit.ts` uses `new Map()` — per-instance in serverless. Each Vercel cold start gets a fresh store, making rate limiting ineffective in production.

**Fix:** Replace with Supabase-backed rate limiting. Count `demo_sessions.started_at` within the last hour using `supabaseAdmin` (already available and used by `createDemoSession`). This provides cross-instance persistence without adding new dependencies (Upstash deferred per SEC-002b).

**Implementation:**
- [x] Rewrite `checkDemoRateLimit()` to query `demo_sessions` table via `supabaseAdmin`
- [x] Count sessions created from same IP in last hour (store IP in metadata on creation)
- [x] Keep `getClientIP()` and `getRateLimitHeaders()` unchanged
- [x] Remove in-memory Map and cleanup logic

### DEMO-002: Remove hardcoded premium access code fallback

**Problem:** `app/auth/demo/route.ts` line 105: `process.env.DEMO_PREMIUM_ACCESS_CODE || 'DEMO_PREMIUM_2024'` — hardcoded fallback discoverable in source.

**Fix:** Remove the `|| 'DEMO_PREMIUM_2024'` fallback. If env var is not set, block premium tier entirely (return 503 "Premium demo not configured").

**Implementation:**
- [x] Remove hardcoded fallback from auth/demo route
- [x] Add guard: if no env var, return 503 for premium tier

### DEMO-003: Remove error detail leak in auth/demo response

**Problem:** `app/auth/demo/route.ts` line 147: `details: error?.message` exposes internal error messages to client.

**Fix:** Remove the `details` field from the error response. Internal errors are already logged server-side via `console.error`.

**Implementation:**
- [x] Remove `details: error?.message` from the 500 response

---

## M2 — Follow-Up Fixes (Regression Findings)

Per GPT calibration: REG-DEMO-002 (RLS) is a security/integrity gap that must be fixed before Demo is marked test-group-ready. REG-DEMO-001 (UX dead-end) must not ship on an external demo surface.

### REG-DEMO-001: Fix demo-expired page UX dead-end

**Problem:** `app/demo-expired/page.tsx` uses a plain HTML `<form action="/auth/demo" method="POST">`. The route returns JSON, so users see raw JSON text instead of being redirected.

**Fix:** Replace the form with a link to `/demo` — the landing page that handles the POST via fetch + `window.location.href` redirect.

**Implementation:**
- [x] Replace `<form>` with `<Button href="/demo">` in demo-expired page

### REG-DEMO-002: Tighten demo_sessions RLS access

**Problem:** `service_role_full_demo_sessions_access` policy has no `TO` clause. Applies to ALL roles, granting full CRUD on ALL demo sessions to any authenticated user.

**Fix:** Drop the overly permissive policy. Replace with:
1. `users_update_own_demo_sessions` — authenticated users can UPDATE their own sessions only
2. `system_admin_full_demo_sessions_access` — system admins get full access (admin dashboard, cleanup)
3. Keep existing `users_view_own_demo_sessions` (SELECT own sessions)

**Implementation:**
- [x] Migration `20260314200000_fix_demo_sessions_rls_and_rpcs.sql` created
- [x] Baseline updated to match

### REG-DEMO-003: Add ownership check to demo RPC functions

**Problem:** `add_demo_feature_usage()` and `mark_demo_session_converted()` are SECURITY DEFINER and accept `session_id` without verifying ownership. GPT: should be fixed alongside REG-DEMO-002 — compound risk.

**Fix:** Add `AND user_id = auth.uid()` to both RPCs.

**Implementation:**
- [x] Both functions updated in migration `20260314200000`
- [x] Baseline updated to match
- [x] No app code changes needed — `createServerRlsClient()` already provides auth.uid() context
