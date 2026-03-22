# Step 5 — Post-Launch Backlog Triage — Deliverable

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-15
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Historical triage snapshot tied to the Step 1-5 deliverable sequence. Reconcile with `launch-control.md` and `post-launch-remediation-waves.md` before using it as current backlog guidance.

**Date:** 2026-03-15  
**Last updated:** 2026-03-21  
**Last validated:** 2026-03-21  
**Status:** historical snapshot  
**Scope:** Tight triage of first post-launch batch. Informed by Steps 1–4.  
**Constraint:** No system-wide replan. Only classify credible first-batch candidates from verified findings.  
**Note:** Historical triage snapshot tied to the Step 1-5 deliverable sequence. Reconcile with `launch-control.md` and `post-launch-remediation-waves.md` before using it as current backlog guidance.

---

## 1. Shortlist of first post-launch candidates

Drawn from three sources: Step 4 production observations, launch-control audit findings, and code-level TODOs.

### A. Operational follow-up

Items discovered through production observation (Steps 4/4b) that affect running the system.

| # | Item | Source | Verdict | Rationale |
|---|------|--------|---------|-----------|
| O-1 | **Canonical host decision** (`app.lekbanken.no` vs `www.lekbanken.no`) | Step 4b | **Act now** | proxy.ts, first-deploy-runbook, and architecture docs all reference `app.lekbanken.no`, but `www.lekbanken.no` serves all production traffic. TLS cert on `app.` is broken. This is config drift that will confuse future operators and AI agents. Owner decision required: provision cert or formally retire host. |
| O-2 | **Error tracking solution** (ADR-009) | Architecture doc | **Observe longer** | Step 4 confirmed 0 production errors. No errors in flight means no urgency. But when real traffic arrives, having no error tracking service (Sentry, Vercel, or custom) means you'll miss errors silently. Decide after first week of real traffic. |
| O-3 | **Telemetry automation scope** | Step 4 + telemetry pack | **Observe longer** | All 5 signals are queryable manually. Pre-real-users: no statistical significance to base automation decisions on. Revisit after 1 week of real traffic to decide which signals warrant cron-based collection. |

### B. Technical debt

Items where the code is correct but structurally suboptimal, creating maintenance risk.

| # | Item | Source | Verdict | Rationale |
|---|------|--------|---------|-----------|
| T-1 | **Upload validation** (UPLOAD-001/002/003) | Launch audit | **Act now** | 3 findings: no server-side MIME validation, no server-side size enforcement, malicious filename risk. Client-side checks exist but are bypassable. This is a security hygiene item that should be fixed before real user uploads arrive. |
| T-2 | **Error leakage** (LEAK-001/002/003) | Launch audit | **Act now** | 3 findings: raw Supabase error messages exposed to clients in some API routes. Information leakage risk. Straightforward fix: scrub error details in non-200 responses. |
| T-3 | **Wrapper convergence** (SYS-001: 87.8% → 100%) | Launch audit | **Defer** | Remaining ~35 routes are edge cases (webhooks, SSE, file streams). Self-resolving as new routes use the wrapper. Low practical risk — no user-facing issue. |
| T-4 | **Rate limiter architecture** (SEC-002b) | Launch audit | **Observe longer** | In-memory per-instance limiter works. Coordinated cross-instance bypass requires deliberate effort. Decision on Redis/Upstash/Edge KV should be informed by actual traffic patterns. No data yet to justify the complexity. |
| T-5 | **MFA + session rate limiting** (ABUSE-003/004) | Launch audit | **Observe longer** | 8 MFA routes and 8 session mutation routes lack rate limiting. Risk is brute-force or enumeration. Current mitigation: strong passwords + MFA enrollment. Monitor actual abuse patterns before adding infra. |

### C. Product backlog

Feature work that adds user value.

| # | Item | Source | Verdict | Rationale |
|---|------|--------|---------|-----------|
| P-1 | **Demo upgrade flow** (CRM/email TODO) | Code TODO | **Defer** | `app/demo/upgrade/page.tsx` has TODO for CRM integration. Not blocking demo functionality — demo works, just no automated follow-up on upgrade requests. Product decision, not engineering urgency. |
| P-2 | **Planner: product tagging** (Fas 7.1/7.2) | Planner roadmap | **Defer** | New `plan_product_tags` table + admin UI. Feature work that depends on product strategy decisions. Not a post-launch fix. |
| P-3 | **Planner: calendar schedule badges** (Fas 3.1–3.3) | Planner roadmap | **Defer** | Nice-to-have UX improvements. Don't add features until real users have tried the basic flow. |
| P-4 | **Enterprise quote emails** | Code TODO | **Defer** | `app/api/enterprise/quote/route.ts` — no notification emails sent on quote request. Enterprise sales flow is not yet active. |

### D. Doc/config cleanup

Items where documentation or configuration is stale or misleading.

| # | Item | Source | Verdict | Rationale |
|---|------|--------|---------|-----------|
| D-1 | **Update `PLATFORM_PRIMARY_HOST`** (conditional on O-1) | Step 4b | **Act now** (after O-1 decision) | If owner decides `www.lekbanken.no` is canonical, update proxy.ts constant, first-deploy-runbook (12+ refs), architecture docs, and NOTION.md. If keeping `app.`, provision cert. |
| D-2 | **Supabase auth redirect URLs** | first-deploy-runbook | **Act now** (verify) | Runbook says "ensure redirect URLs include `https://app.lekbanken.no`". Verify on Supabase dashboard if auth callbacks are configured for the correct production host. |
| D-3 | **Stripe webhook endpoint** | first-deploy-runbook | **Act now** (verify) | Runbook references `https://app.lekbanken.no/api/billing/webhooks/stripe`. If `app.` is broken, verify Stripe webhook is configured for `www.lekbanken.no` (or it won't receive webhooks). |
| D-4 | **Tier B/C archive expansion** | Step 3 | **Defer** | 36 Tier A files archived. ~94 more identified as candidates. Low urgency — the remaining files don't block operations, they just add noise. |
| D-5 | **`API_ROUTE_AUDIT.md` + `i18n-audit.md`** | Docs inventory | **Defer** | Stale root-level docs superseded by detailed audit files. Not misleading to current work. Archive when convenient. |

---

## 2. Classification summary

| Category | Act now | Observe longer | Defer |
|----------|---------|----------------|-------|
| Operational follow-up | O-1 | O-2, O-3 | — |
| Technical debt | T-1, T-2 | T-4, T-5 | T-3 |
| Product backlog | — | — | P-1, P-2, P-3, P-4 |
| Doc/config cleanup | D-1, D-2, D-3 | — | D-4, D-5 |

---

## 3. Rationale based on Steps 1–4

| Step | Key finding that informs triage |
|------|-------------------------------|
| **Step 1** (SSoT Reconciliation) | Wrapper convergence at 87.8% — real but self-resolving. Docs are now internally consistent. |
| **Step 2** (Test Verification) | 1,777 tests pass, 0 errors in tsc/ESLint. Test infrastructure is healthy. No test-driven urgency for post-launch fixes. |
| **Step 3** (Documentation Integrity) | 36 files archived, indexes updated. Remaining doc noise is low-priority. |
| **Step 4** (Observe Mode) | Pre-real-users stage: 0 active sessions, 0 errors, economy stable, cron healthy, all monitoring endpoints verified. No production data indicating urgent operational problems. The gap that matters is config drift (`app.lekbanken.no`), not system failure. |

**The overarching signal from Steps 1–4:** The system is operationally healthy but has never served real users. The first batch should focus on **hardening the surface real users will touch** (upload validation, error leakage, host configuration), not on adding features or optimizing performance for traffic that doesn't yet exist.

---

## 4. Recommended first batch

### Structure

The first post-launch batch is split into two phases:
- **Batch A** — Decision + verification (must complete first; gates Batch B item 3)
- **Batch B** — Implementation (can begin in parallel for items 1–2)

---

### Batch A — Decision + verification

| Order | ID | Item | Owner | Effort |
|-------|----|------|-------|--------|
| A.1 | O-1 | **Canonical host decision:** keep `app.lekbanken.no` (provision cert) or retire it (adopt `www.lekbanken.no`) | Product owner | 30 min |
| A.2 | D-2 | **Verify Supabase auth redirect URLs:** check Supabase dashboard → Authentication → URL Configuration → confirm redirect URLs match the actual production host | Product owner / DevOps | 15 min |
| A.3 | D-3 | **Verify Stripe webhook endpoint host:** check Stripe dashboard → Webhooks → confirm endpoint URL matches the actual production host | Product owner / DevOps | 15 min |

**Gate:** A.1 must be decided before Batch B item 3 can execute.
A.2 and A.3 may surface urgent fixes if callbacks/webhooks point to `app.lekbanken.no` (broken TLS).

**Output of Batch A:**
```
Canonical production host = {app.lekbanken.no | www.lekbanken.no}
Supabase auth redirect URLs = {verified correct | needs update to <host>}
Stripe webhook endpoint = {verified correct | needs update to <host>}
```

---

### Batch B — Implementation (3 workstreams)

| # | Workstream | Items | Source | Effort |
|---|-----------|-------|--------|--------|
| **1** | **Error leakage hardening** | LEAK-001, LEAK-002, LEAK-003 | Launch audit | 2–4h |
| **2** | **Upload validation hardening** | UPLOAD-001, UPLOAD-002, UPLOAD-003 | Launch audit | 4–6h |

**Error leakage principle:**
- Clients receive sanitized error codes and generic messages only
- Detailed error messages (Supabase, Stripe, internal) remain server-side only

**Upload validation checklist:**
- Server-side MIME type validation
- Server-side file size enforcement
- Filename sanitization
- Extension whitelist
| **3** | **Host / edge correctness** | Update `PLATFORM_PRIMARY_HOST` in proxy.ts, update first-deploy-runbook refs, update architecture docs — per Batch A decision | Step 4b | 1–2h |

**Ordering rationale:**
1. Error leakage first — raw Supabase errors exposed to clients is the most direct external-surface risk. Straightforward scrubbing fix.
2. Upload validation second — server-side MIME/size enforcement prevents file-based abuse. Slightly more implementation scope.
3. Host/config cleanup third — depends on Batch A decision. Important for operational clarity but not a security exposure in itself (users already reach the app via `www.`).

**Total estimated effort: ~1–2 days of focused work.**

---

## 5. What should NOT be in the first batch

| Item | Why not |
|------|---------|
| **Rate limiter architecture** (SEC-002b) | No traffic data to justify infrastructure decision. In-memory limiter works. Observe first. |
| **MFA/session rate limiting** (ABUSE-003/004) | Needs traffic/abuse data to set sensible thresholds. Not a standalone initiative yet. |
| **Error tracking service** (ADR-009) | 0 production errors observed. Important but not urgent. Decide after first real-traffic week. |
| **Telemetry automation** | Manual checks work. Don't automate what you haven't needed to check more than once. |
| **Wrapper convergence to 100%** (SYS-001) | Self-resolving. Remaining routes are edge cases. No user-facing impact. |
| **Planner features** (Fas 3, 6, 7) | Product work, not post-launch hardening. Wait for user feedback. |
| **Demo/Enterprise email flows** | Not active in production yet. Product sequencing decision. |
| **Tier B/C archive expansion** | Low noise, low urgency. Do it when you're already in the files. |
| **Full docs refresh** (Phase 6) | Large scope, low immediate return. Steps 1–3 already fixed the dangerous inconsistencies. |
| **Feature flags mechanism** (ADR-008) | Env-based flags work today. Don't build infra for hypothetical requirements. |
| **Test coverage expansion** | Step 2 confirmed 1,777 tests pass. Expand coverage when adding features, not as a standalone sprint. |
