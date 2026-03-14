# Demo Remediation Plan

**Domain:** Demo  
**Scope:** M1 — Fix 3 P1 findings from demo-audit.md  
**Date:** 2025-07-14  
**Status:** In progress

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
