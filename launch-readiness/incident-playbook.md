# Lekbanken Incident Playbook

> **Created:** 2026-03-12  
> **Purpose:** Standardized response procedures for production incidents  
> **Audience:** On-call engineers, team leads  

---

## First 5 Minutes Checklist

> **When something breaks, nobody thinks clearly. Follow this list.**

1. **Confirm** — Is it real? Check `/api/system/metrics`, Vercel logs, user reports
2. **Classify** — SEV-1 (service down) → SEV-4 (cosmetic). See §1 below
3. **Assign** — One person is incident lead. They own communication and decisions
4. **Decide** — Rollback or mitigate? If unsure, rollback first (see §3)
5. **Log** — Open an incident log (see §10 template). Record timestamps from now on

---

## 1. Severity Classification

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|---------|
| **SEV-1** | Service down, data loss, security breach | Immediate | App unreachable, DB corruption, auth bypass |
| **SEV-2** | Major feature broken, payment failure | < 1 hour | Stripe webhooks failing, login broken, play session crashes |
| **SEV-3** | Degraded experience, minor feature broken | < 4 hours | Slow queries, i18n missing, admin dashboard errors |
| **SEV-4** | Cosmetic, low-impact | Next business day | UI glitch, stale cache, minor logging gap |

---

## 2. Incident Response Workflow

```
1. DETECT   → alert, user report, or monitoring
2. TRIAGE   → classify severity (SEV-1 to SEV-4)
3. CONTAIN  → stop the bleeding (rollback, feature flag, kill-switch)
4. FIX      → root cause analysis + targeted fix
5. VERIFY   → confirm fix in production
6. DOCUMENT → post-mortem in launch-control.md changelog
```

---

## 3. Rollback Procedures

### 3a. Application Rollback (Vercel)

**When:** Bad deploy breaks the app, new code causes errors.

```
1. Go to Vercel Dashboard → Deployments
2. Find last known-good deployment
3. Click "..." → "Promote to Production"
4. Verify app is accessible
```

**Alternative (CLI):**
```bash
vercel rollback
```

> **Note:** Vercel keeps all previous deployments. Rollback is instant (DNS swap, not rebuild).

### 3b. Database Rollback

**When:** Bad migration corrupts data or breaks queries.

**Option A — Supabase Point-in-Time Recovery (PITR)**
```
1. Go to Supabase Dashboard → Settings → Database → Backups
2. Select restore point (before the bad migration)
3. Restore to a new project or in-place
```

**Option B — Manual SQL Reversal**
```sql
-- Only if the migration has a documented rollback
-- Check: supabase/migrations/<timestamp>_<name>.sql
-- Look for comments like "-- ROLLBACK:" at the end
```

> **⚠️ Warning:** Only 3 of 307 migrations have rollback scripts. For destructive changes, prefer PITR.

### 3c. Stripe Webhook Rollback

**When:** Webhook handler deploys with a bug, payments aren't being processed.

```
1. Stripe Dashboard → Developers → Webhooks
2. Check "Failed events" tab
3. After fix: click "Retry" on each failed event
```

> Webhook handler has idempotency guard — retrying is safe.

---

## 4. Emergency Kill-Switches

### 4a. GDPR Self-Service (already active)

**Status:** Currently disabled. API returns 503 with DSAR instructions.

**Files:**
- `app/api/gdpr/delete/route.ts` — returns 503
- `app/api/gdpr/export/route.ts` — returns 503
- Privacy page shows contact-only card

**To re-enable:** Revert the kill-switch commits (restore original handlers).

### 4b. Feature Flags

Controlled via environment variables in Vercel:

| Flag | Purpose | Default |
|------|---------|---------|
| `FEATURE_SIGNALS` | Signals/lobby system | — |
| `FEATURE_TIME_BANK` | Time bank in play mode | — |
| `FEATURE_SESSION_COCKPIT` | Unified host shell | — |
| `FEATURE_AI` | AI integration | — |
| `STRIPE_ENABLED` | Billing/payment system | — |

**To disable a feature:** Set the env var to `false` in Vercel → redeploy.

### 4c. Economy Kill Switch

**When:** Gamification reward anomaly (Alert B) and root cause unclear within 15 minutes.

**Freeze:**
```sql
UPDATE gamification_automation_rules SET is_active = false;
```

**Unfreeze (one at a time, monitor between each):**
```sql
UPDATE gamification_automation_rules SET is_active = true WHERE id = '<rule_id>';
```

→ Full procedure: [anomaly-detection-playbook.md — PC-3](../docs/ops/anomaly-detection-playbook.md#pc-3--economy-kill-switch-prevents-reward-inflation)

### 4d. Rate Limiter Emergency Bypass

**If rate limiter is blocking legitimate users:**

The rate limiter is in-memory and resets on deploy. A fresh deploy clears all rate limit buckets.

**Tiers (for reference):**

| Tier | Limit | Window |
|------|-------|--------|
| `api` | 100 req | 60s |
| `auth` | 10 req | 15min |
| `strict` | 5 req | 60s |
| `participant` | 60 req | 60s |

**Config file:** `lib/utils/rate-limiter.ts`

---

## 5. Domain-Specific Playbooks

### 5a. Authentication / Login Issues

**Symptoms:** Users can't log in, 401 errors, session cookie issues.

**Steps:**
1. Check Supabase Dashboard → Auth → Users (is the user active?)
2. Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env
3. Check tenant cookie: `TENANT_COOKIE_SECRET` must match between deploys
4. Check middleware: `middleware.ts` handles auth routing

**Files:** `lib/supabase/`, `middleware.ts`

### 5b. Payment / Billing Issues

**Symptoms:** Checkout fails, subscriptions not provisioning, webhook errors.

**Steps:**
1. Check Stripe Dashboard → Developers → Webhooks → Failed events
2. Verify webhook secrets match: `STRIPE_TEST_WEBHOOK_SECRET` / `STRIPE_LIVE_WEBHOOK_SECRET`
3. Check `STRIPE_USE_LIVE_KEYS` flag (should be unset in production — uses live keys by default)
4. Check `purchase_intents` table for stuck items (status should progress: `draft` → `awaiting_payment` → `paid`)
5. Check `billing_events` table for processed events:
   ```sql
   -- Recent events and their status
   SELECT event_key, event_type, status, created_at
   FROM billing_events
   ORDER BY created_at DESC
   LIMIT 20;
   
   -- Find failed or stuck events
   SELECT * FROM billing_events
   WHERE status != 'received'
   ORDER BY created_at DESC;
   ```

**Webhook endpoint:** `POST /api/billing/webhooks/stripe`

**Idempotency (two layers):**
- **Event-level:** `billing_events.event_key` has UNIQUE constraint — duplicate Stripe events are upserted (no double processing)
- **Intent-level:** Atomic status claim on `purchase_intents` — only the first concurrent handler transitions status to `provisioning`

**Handled events:** `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`

**Webhook replay after fix:** Stripe Dashboard → Developers → Webhooks → Failed events → Retry. Safe due to idempotency guards.

### 5c. Play Session Crashes

**Symptoms:** Host/participant can't interact, realtime not updating, puzzle submissions fail.

**Steps:**
1. Check browser console for WebSocket errors (Supabase Realtime)
2. Check `participant_sessions` table — is the session in correct status?
3. Check rate limiter — participant tier is 60 req/min
4. Check atomic RPCs: `attempt_puzzle_riddle_v2`, `attempt_puzzle_counter_v2`, etc.

**State machine:** `lib/play/session-command.ts` — all session transitions go through `applySessionCommand()`  
**Guards:** `lib/play/session-guards.ts` — `PLAY_MUTATION_STATUS_POLICY` controls allowed operations per status

### 5d. Database Performance

**Symptoms:** Slow pages, timeouts, high error rate.

**Steps:**
1. Check Supabase Dashboard → Database → Query Performance
2. Known N+1: session history page (100 extra queries) — documented in PERF-001
3. Check connection pool: `GET /api/system/metrics` returns pool stats
4. Check `select('*')` usage — 231 instances identified in performance audit

### 5e. Cron Job Failures

**Symptoms:** Demo data not cleaned up, stale test data accumulating.

**Steps:**
1. Check `scheduled_job_runs` table for job status/errors
2. Demo cleanup runs nightly at 03:00 UTC via pg_cron
3. Edge function variant available: requires `CLEANUP_API_KEY` header
4. Manual trigger: run `SELECT cleanup_demo_users()` in Supabase SQL Editor

---

## 6. Monitoring Endpoints

| Endpoint | Auth | Returns |
|----------|------|---------|
| `GET /api/health` | public | `{ status: 'ok'\|'error' }` — DB connectivity ping |
| `GET /api/readiness` | system_admin | `{ status: 'ready'\|'degraded', checks: {db,stripe,auth,encryption,rateLimiter} }` |
| `GET /api/system/metrics` | system_admin | Error rate, API latency (p50/p95/p99), active users, storage, DB pool |

**Error tracking:** `error_tracking` table (admin dashboard: `/admin/analytics/errors`)

**Recommended monitoring setup (post-launch):**
- Vercel Analytics for Web Vitals
- Supabase Dashboard for DB metrics
- Stripe Dashboard for payment health
- Consider: Sentry for error aggregation (ADR-009 pending)

---

## 7. Key Contacts & Access

| System | Access Point |
|--------|-------------|
| Vercel Dashboard | vercel.com — deployment, env vars, logs |
| Supabase Dashboard | supabase.com — database, auth, storage, edge functions |
| Stripe Dashboard | dashboard.stripe.com — payments, webhooks, customers |
| GDPR/Privacy | privacy@lekbanken.se — manual DSAR processing (30-day SLA) |

---

## 8. Environment Variables (Critical)

**If any of these are missing or wrong, the app will break:**

| Variable | Impact if Missing |
|----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | App crashes at startup |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App crashes at startup |
| `SUPABASE_SERVICE_ROLE_KEY` | All admin/service operations fail |
| `STRIPE_LIVE_WEBHOOK_SECRET` | Payment provisioning fails silently |
| `TENANT_COOKIE_SECRET` | Tenant routing breaks |
| `JWT_SECRET` | Token verification fails |
| `VAULT_ENCRYPTION_KEY` | Encrypted data unreadable |

---

## 9. Post-Incident Checklist

After resolving any SEV-1 or SEV-2:

- [ ] Root cause identified and documented
- [ ] Fix verified in production
- [ ] Changelog entry added to `launch-control.md`
- [ ] Related audit finding created or updated (if security/architecture impact)
- [ ] Monitoring gap identified? → add to observability backlog
- [ ] Communication sent to affected users (if applicable)
- [ ] Post-mortem scheduled (within 48 hours for SEV-1)

---

## 10. Incident Log Template

Copy this for each incident. Store completed logs in `launch-readiness/incidents/`.

```markdown
# Incident: [short description]

| Field | Value |
|-------|-------|
| **Incident ID** | INC-YYYY-MM-DD-NN |
| **Severity** | SEV-? |
| **Start time** | YYYY-MM-DD HH:MM UTC |
| **End time** | YYYY-MM-DD HH:MM UTC |
| **Duration** | |
| **Incident lead** | |
| **Impact** | [users affected, features broken] |

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | [detected / triaged / action taken] |

## Root Cause

[What actually broke and why]

## Fix Applied

[What was done to resolve it]

## Lessons Learned

- [ ] What monitoring would have caught this earlier?
- [ ] What prevention would stop this class of issue?
- [ ] Any documentation or playbook updates needed?
```

---

*This playbook is a living document. Update it after every significant incident.*
