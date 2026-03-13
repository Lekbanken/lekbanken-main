# First Production Deploy — Ops Runbook

> **Status:** active  
> **Owner:** Engineering  
> **Created:** 2026-03-14  
> **Related:** `launch-readiness/incident-playbook.md` (incident response), `docs/ops/prod-migration-workflow.md` (migration safety)

---

## 1. Pre-Deploy Verification (T-1h)

Before the first production deploy, verify these items:

### Infrastructure

- [ ] Vercel Production env vars are correct (not accidentally pointed at sandbox)
  - `NEXT_PUBLIC_SUPABASE_URL` → production Supabase (`qohhnufxididbmzqnjwg`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → production anon key
  - `SUPABASE_SERVICE_ROLE_KEY` → production service role
  - `APP_ENV` → `prod`
  - `DEPLOY_TARGET` → `prod`
- [ ] Stripe webhook endpoint: `https://app.lekbanken.no/api/billing/webhooks/stripe`
  - Verify in Stripe Dashboard → Developers → Webhooks → correct endpoint + correct secret
- [ ] DNS: `app.lekbanken.no` resolves to Vercel
- [ ] HTTPS certificate: valid and not expiring within 30 days

### Database

- [ ] All pending migrations applied to production Supabase
  - `supabase link --project-ref qohhnufxididbmzqnjwg`
  - `supabase migration list` → all Local = Remote
- [ ] PITR (Point-in-Time Recovery) enabled in Supabase Dashboard → Settings → Backups
- [ ] Note the current timestamp as recovery point if rollback needed

### Code

- [ ] `tsc --noEmit` → 0 errors
- [ ] `git log --oneline -1` → correct commit on `main`
- [ ] No uncommitted changes (`git status` clean)

---

## 2. Deploy (T=0)

```
1. Merge to main (or push to main if already merged)
2. Vercel auto-deploys production
3. Watch Vercel Dashboard → Deployments for build status
4. Build typically takes 3-5 minutes
```

**If build fails:** Check Vercel build logs. Common causes:
- Missing env var → add in Vercel Dashboard and redeploy
- Type error → should have been caught by `tsc --noEmit` pre-deploy

---

## 3. Post-Deploy Verification (T+5m)

Run these checks immediately after deploy completes:

### Health checks

| Check | Command / URL | Expected |
|-------|--------------|----------|
| App reachable | `curl https://app.lekbanken.no` | 200 OK, page loads |
| Health endpoint | `curl https://app.lekbanken.no/api/health` | `{ "status": "ok" }` |
| Readiness endpoint | `curl -H "Authorization: Bearer <admin-token>" https://app.lekbanken.no/api/readiness` | All checks pass |

### Functional smoke tests (manual)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | **Login** | Navigate to app → log in with test account | Dashboard loads, user data shown |
| 2 | **Tenant switching** | Switch between tenants (if available) | Tenant data loads correctly |
| 3 | **Game browse** | Navigate to game library | Games catalog loads |
| 4 | **Create session** | As host: create a play session | Session created, join code shown |
| 5 | **Join session** | On separate device/browser: enter join code | Participant joins lobby |
| 6 | **Stripe checkout** | If billing active: initiate checkout flow | Stripe checkout page loads |
| 7 | **Profile** | Navigate to profile → update setting | Setting saved, page reloads correctly |

### Monitoring baseline

After the first 15 minutes, check:

| Metric | Where | What to look for |
|--------|-------|------------------|
| Error rate | Vercel Dashboard → Analytics | Should be < 1% |
| Function invocations | Vercel Dashboard → Usage | Baseline count for comparison |
| DB connections | Supabase Dashboard → Database → Connections | Not maxed out |
| Auth users | Supabase Dashboard → Auth → Users | Test accounts visible |
| Webhook health | Stripe Dashboard → Developers → Webhooks | No failed events |

---

## 4. First Hour Watch (T+5m to T+60m)

During the first hour, actively monitor:

### Every 15 minutes

- [ ] `curl https://app.lekbanken.no/api/health` → `ok`
- [ ] Vercel logs: no 500 error spikes
- [ ] Supabase Dashboard: no connection pool exhaustion

### Watch for

| Signal | Meaning | Action |
|--------|---------|--------|
| 500 errors spike | Code bug or missing env var | Check Vercel function logs. If persistent: rollback (§6) |
| 401/403 errors spike | Auth config mismatch | Verify Supabase anon key + URL match env vars |
| 429 responses | Rate limiter triggering | Check if legitimate traffic or attack (§5b) |
| WebSocket errors in Supabase | Realtime connection issues | Check Supabase Dashboard → Realtime |
| Stripe webhook failures | Payment processing broken | Check Stripe Dashboard → Failed events (§5a) |

---

## 5. Common First-Deploy Issues

### 5a. Stripe webhooks not firing

**Symptoms:** Checkout completes in Stripe but subscription/seats not provisioned in app.

**Diagnosis:**
1. Stripe Dashboard → Developers → Webhooks → check endpoint URL
2. Check "Attempted deliveries" — are events being sent?
3. Check webhook signing secret: `STRIPE_LIVE_WEBHOOK_SECRET` matches Dashboard value

**Fix:** If endpoint URL is wrong (e.g., points to localhost), update in Stripe Dashboard. Retry failed events after fixing.

### 5b. Rate limiter false positives

**Symptoms:** Legitimate users get 429 responses.

**Diagnosis:**
1. Check Vercel function logs for which routes return 429
2. The rate limiter is **in-memory** and **per-instance** — resets on redeploy

**Quick fix:** Redeploy (clears all rate limit buckets). This is safe and instant.

**Tier reference:** `api` = 100 req/60s, `auth` = 10 req/15min, `strict` = 5 req/60s, `participant` = 60 req/60s

### 5c. Play session realtime not working

**Symptoms:** Host actions don't update participant screens, or vice versa.

**Diagnosis:**
1. Browser console: WebSocket connection errors
2. Check Supabase Dashboard → Realtime → connected clients
3. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct (Realtime uses anon key)

**Fix:** If key mismatch: fix env var → redeploy. If Supabase Realtime service issue: check status.supabase.com.

### 5d. Auth callback redirect loops

**Symptoms:** Login succeeds in Supabase but user bounces between login and callback.

**Diagnosis:**
1. Check browser cookies — `sb-<project-ref>-auth-token` should be set
2. Check redirect URLs: Supabase Dashboard → Auth → URL Configuration
3. Verify `NEXT_PUBLIC_SUPABASE_URL` matches the project auth is configured on

**Fix:** Ensure redirect URLs in Supabase Auth config include `https://app.lekbanken.no`.

### 5e. Missing or stale tenant cookie

**Symptoms:** Users see wrong tenant or get "no tenant" errors.

**Diagnosis:**
1. Check `TENANT_COOKIE_SECRET` env var
2. Check `middleware.ts` — tenant routing logic
3. Clear cookies and retry

---

## 6. Rollback Procedure

If the deploy causes issues that can't be quickly fixed:

### Application rollback (instant)

```
1. Vercel Dashboard → Deployments
2. Find last known-good deployment (before this deploy)
3. Click "..." → "Promote to Production"
4. Verify: curl https://app.lekbanken.no/api/health → ok
```

Rollback is a DNS swap, not a rebuild. Takes ~30 seconds.

### Database rollback (if migration was applied)

See `docs/ops/prod-migration-workflow.md` §6 for complete rollback playbook.

**Quick version:** If a migration broke things, use Supabase PITR to restore to the timestamp noted in §1.

---

## 7. First 24 Hours — Daily Check

At end of day 1, review:

| Area | Check | Where |
|------|-------|-------|
| Error rate | Total 5xx count, top error routes | Vercel Analytics |
| API latency | p50 / p95 / p99 | `/api/system/metrics` (system_admin) |
| DB performance | Slow queries, connection usage | Supabase Dashboard → Query Performance |
| Auth activity | Sign-ups, logins, failures | Supabase Dashboard → Auth → Users + Logs |
| Payment health | Successful/failed charges | Stripe Dashboard → Payments |
| Realtime | Channel count, message throughput | Supabase Dashboard → Realtime |
| Cron jobs | `scheduled_job_runs` table | Supabase SQL Editor |

If any metric is abnormal, open an incident using `launch-readiness/incident-playbook.md` §10 template.

---

## 8. First Week — Baseline Metrics

By end of week 1, you should have measured:

| Metric | Target (from scaling analysis) | How to measure |
|--------|-------------------------------|----------------|
| Sessions / day | Baseline | Query `sessions` table by `created_at` |
| Participants / session (avg) | ~12 | Query `participant_sessions` grouped by session |
| Peak concurrent sessions | < 60 | Supabase Realtime connections ÷ ~3 channels/session |
| API p95 latency | < 500ms | `/api/system/metrics` |
| Heartbeat writes / minute | < 100 at 10 sessions | Query `participant_sessions.last_seen_at` update frequency |
| 429 rate limit responses | < 1% | Vercel function logs filter by 429 |

These baselines inform Phase 2 (Production Learning) in `launch-control.md` §10.

---

## 9. Key Links

| System | URL | What to check |
|--------|-----|---------------|
| Vercel Dashboard | vercel.com | Deployments, logs, env vars |
| Supabase (Prod) | supabase.com/dashboard/project/qohhnufxididbmzqnjwg | DB, Auth, Realtime |
| Supabase (Sandbox) | supabase.com/dashboard/project/vmpdejhgpsrfulimsoqn | Test environment |
| Stripe Dashboard | dashboard.stripe.com | Payments, webhooks |
| App health | https://app.lekbanken.no/api/health | Quick availability check |
| App readiness | https://app.lekbanken.no/api/readiness | Full system check (requires admin auth) |
| Error tracking | https://app.lekbanken.no/admin/analytics/errors | Application error log |
