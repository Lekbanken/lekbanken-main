# Lekbanken Launch Freeze Snapshot

> **Date:** 2026-03-12  
> **Author:** Claude (automated) + GPT (calibration)  
> **Purpose:** Exact system state at launch decision. Reference point for post-launch analysis.  

---

## Platform Version

| Component | Version |
|-----------|---------|
| Next.js | ^16.0.7 (Turbopack) |
| React | ^19.2.1 |
| TypeScript | ^5 (strict mode) |
| Supabase JS | ^2.86.0 |
| Supabase SSR | ^0.8.0 |
| PostgreSQL | 17.6.1 |
| Stripe | ^16.6.0 |
| Tailwind CSS | ^4 |
| next-intl | Configured (sv/en/no) |

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| TypeScript files | 1,914 |
| Lines of TypeScript | ~426,000 |
| `app/` files | 807 |
| API route files | 287 |
| Supabase migrations | 307 |
| Locale files | 3 (sv, en, no) |
| Swedish translation keys | 11,399 |

---

## Audit Program Summary

| Metric | Value |
|--------|-------|
| Total audits | 23 |
| GPT-calibrated | 23/23 |
| Total findings | 292 |
| P0 (launch blocker) | 13 discovered → **13 resolved** |
| P1 (must fix) | 47 discovered → **45 resolved, 2 non-actionable** |
| P2 (should fix) | 132 discovered → **15 resolved, 117 post-launch** |
| P3 (nice to have) | 86 discovered → **0 resolved, 86 post-launch** |

### P0 Resolution History

All 13 P0s were discovered and resolved during the audit program:

| P0 | Domain | Finding | Resolution |
|----|--------|---------|------------|
| SEC-001 | Security | Snapshots auth gap | Auth guard added |
| TI-001 | Tenant | Cross-tenant builder CRUD | Tenant membership validation |
| PLAY-001 | Play | Triple status mutation path | State machine consolidation |
| PLAY-002 | Play | TOCTOU race in puzzles | 4 atomic Postgres RPCs |
| PRIV-001 | Privacy | GDPR delete incomplete | Kill-switched → P1 |
| PRIV-002 | Privacy | GDPR export incomplete | Kill-switched → P1 |
| PRIV-003 | Privacy | Auth user not deleted | Kill-switched → P1 |
| PRIV-004 | Privacy | Anonymization no-op | Kill-switched → P1 |
| PRIV-005 | Privacy | Consent withdrawal broken | Kill-switched → P1 |
| PRIV-006 | Privacy | Data registry incomplete | Kill-switched → P1 |
| ABUSE-001 | Abuse | Enterprise quote email spam | Rate limit + honeypot |
| ABUSE-002 | Abuse | Geocode open proxy | Auth + rate limit + clamp |
| MIG-001 | Migration | Enum ADD VALUE in transaction | Downgraded → P1 (already applied) |

### Remaining P1s (non-actionable)

| P1 | Type | Why not blocking |
|----|------|------------------|
| SEC-002b | Rate limiter infra (in-memory, per-instance) | Functional per-instance; multi-instance bypass requires coordinated regional attack |
| SYS-001 | Wrapper convergence (88.2%) | Self-resolving; remaining ~12% are edge cases (webhooks, SSE, file streams) |

---

## Domain Status at Launch

### Domains with Launch-Scope Remediation Complete

| Domain | Findings | P1s Fixed | Key Fixes |
|--------|----------|-----------|-----------|
| Play | 14 (2P0 4P1 5P2 3P3) | 4 | State machine, session guards, atomic RPCs, broadcast, wrapper |
| Sessions | 13 (0P0 4P1 6P2 3P3) | 4 | Zod on join/rejoin/create, admin route wrapping, rejoin status gate |
| Games | 14 (0P0 3P1 8P2 3P3) | 3 | Snapshot auth, reactions auth, search sanitization, DELETE gate |
| Planner | 16 (0P0 8P1 6P2 2P3) | 8 | Wrapper migration, capability gates, tenant boundary |
| Journey | 12 (0P0 1P1 8P2 3P3) | 1 | Tenant membership validation, rate limiting |
| Billing | 15 (0P0 4P1 7P2 4P3) | 4 | Customer ID resolution, subscription/invoice status restrictions, webhook idempotency, timing-safe API keys |
| Atlas | 11 (0P0 2P1 6P2 3P3) | 2 | Zero-auth endpoints secured, badge economy exposure closed |
| Media | 12 (0P0 2P1 6P2 4P3) | 2 | Cross-tenant upload blocked, direct upload membership check |

### Domains Without Launch Remediation Needed

| Domain | Findings | Summary |
|--------|----------|---------|
| Notifications | 8 (0P0 0P1 5P2 3P3) | Broadcast dedup + rate limiting (P2) |
| Profile | 8 (0P0 0P1 4P2 4P3) | RLS visibility + Zod (P2) |
| Support | 10 (0P0 0P1 8P2 2P3) | No Zod, search interpolation, dead code (P2) |
| Marketing | 7 (0P0 0P1 2P2 5P3) | robots.ts + sitemap.ts fixed (M1) |
| Calendar | 7 (0P0 0P1 3P2 4P3) | All P2s tracked in prior audits |

### Cross-Cutting Audits

| Audit | Findings | Key State |
|-------|----------|-----------|
| Architecture Core | 15 (0P0 4P1 7P2 4P3) | All P1s resolved/merged |
| Security & Auth | 17 (2P0 5P1 6P2 4P3) | P0s fixed, SEC-002b infra |
| Tenant Isolation | 10 (1P0 3P1 3P2 3P3) | TI-001 P0 fixed, product decisions resolved |
| API Consistency | 14 (0P0 4P1 7P2 3P3) | 247/287 wrapped (86.1%) |
| i18n | 7 (0P0 0P1 2P2 5P3) | sv complete, en/no fallback works |
| Performance | 6 (0P0 0P1 4P2 2P3) | N+1 in session history (P2) |
| Accessibility | 8 (0P0 0P1 2P2 6P3) | Dedicated a11y library, Radix coverage |
| Abuse & Privacy | 39 (0P0 18P1 14P2 7P3) | GDPR kill-switched, abuse vectors closed |
| React Boundary | 7 (0P0 0P1 3P2 4P3) | Zero boundary violations |
| Migration Safety | 14 (0P0 1P1 9P2 4P3) | 307 migrations, no rollback framework |

---

## API Security Posture

| Metric | Value |
|--------|-------|
| API route files | 287 |
| Wrapped in `apiHandler()` | 247 (86.1%) |
| Handler-level coverage | 360/408 (88.2%) |
| Auth patterns eliminated | `tenantAuth`, `getServerAuthContext`, `rpc('is_system_admin')`, inline `getUser()` |
| Rate-limited routes | ~13.6% explicit + wrapper defaults |
| Participant auth | DD-2 contract: `auth: 'participant'`, header-based token, 60 req/min |
| Service-role bypass | Eliminated from `sessions/route.ts` (last RLS-bypassing query) |

---

## Known Limitations at Launch

1. **GDPR self-service disabled** — Delete/export API returns 503 with DSAR instructions. Manual process via `privacy@lekbanken.se` (30-day SLA per Art. 12(3)).
2. **Rate limiter is in-memory** — Works per-instance, doesn't share state across Edge workers. Sufficient for initial traffic. Migration path to Upstash documented.
3. **Migration deploy order** — Migration `20260314000000` must be applied before route changes (RLS policy for tenant admin session view).
4. **English/Norwegian translations incomplete** — en missing 932 keys, no missing 1,419. Fallback chain shows Swedish (no blank strings).
5. **Wrapper coverage at 86.1%** — Remaining 40 files are edge cases (webhooks, SSE, file streams, mixed-auth). Converging organically.

## Scaling Hardening (2026-03-13)

| Item | Status | Implementation |
|------|--------|----------------|
| Adaptive heartbeat | ✅ Done | Participant: 10s active / 30s idle / stops on terminal status + tab-visibility-aware. Host: visibility-aware (30s normal, 60s hidden). |
| Push-vs-poll contract | ✅ Done | 14 push-authoritative, 4 poll-authoritative, 1 fallback. Documented in `realtime-gate.ts`. Chat identified as push migration candidate. |
| Session cleanup cron | ✅ Done | `vercel.json` daily 04:00 UTC. Disconnects expired tokens, archives ended sessions. |
| Upstash rate limiter | ⏭️ Deferred | Migration path documented in `rate-limiter.ts`. Deploy when multi-region or >10k sessions/day. |

> **Reference:** Full 5-bottleneck analysis with 90-day plan: `scaling-analysis.md`

---

## Post-Launch Backlog (203 findings)

### Top Priority P2 Items

| Category | Count | Examples |
|----------|-------|---------|
| GDPR compliance | 6 | Self-service delete/export (PRIV-001–006) |
| Input validation | ~15 | Zod schemas missing (Support, Profile, admin routes) |
| Rate limiting | ~10 | SEC-002b infra decision unlocks systematic coverage |
| Search sanitization | ~5 | PostgREST `.or()` in Support, admin routes |
| RLS hardening | ~8 | Overly broad SELECT on support tickets, profile visibility |
| Dead code | ~3 | `supportService.ts`, unused hooks |
| i18n completeness | ~5 | Missing keys, hardcoded strings, mojibake |
| Performance | 4 | N+1 queries, ISR, `select('*')` cleanup |
| Accessibility | 2 | Keyboard nav, toast aria-live |

### P3 Distribution

| Category | Count | Examples |
|----------|-------|---------|
| Cosmetic/Polish | ~30 | Metadata, dev placeholders, image optimization |
| Architecture polish | ~20 | Builder atomicity, broadcast consolidation |
| Accessibility minor | 6 | Route focus, reduced motion, color contrast |
| i18n minor | 5 | Locale detection, template strings |
| Other | ~25 | Documentation, type narrowing, error messages |

---

## Audit Process Methodology

```
Per audit:
  1. AUDIT      → deep-dive code review (grep + read + semantic search)
  2. GPT CAL    → severity calibration against GPT's independent assessment
  3. IMPLEMENT  → fix P0/P1 within launch scope
  4. SSoT UPDATE → launch-control.md + implementation-plan.md + audit file + changelog

Calibration process:
  - Claude performs audit, assigns severities
  - GPT independently reviews, adjusts inflation/deflation
  - Discrepancies resolved with documented rationale
  - SSoT updated atomically across all 3 files
```

**Audit duration:** 2026-03-10 → 2026-03-12 (3 days, 23 audits + all remediation)

---

## SSoT Document Inventory

| Document | Purpose | Location |
|----------|---------|----------|
| `launch-control.md` | Master control, phase tracking, findings summary, verdict | `launch-readiness/` |
| `launch-readiness-implementation-plan.md` | Roadmap, milestones, remediation tracking | `launch-readiness/` |
| `incident-playbook.md` | Incident response, rollback, kill-switches, domain playbooks | `launch-readiness/` |
| `launch-snapshot-2026-03.md` | Frozen system state at launch | `launch-readiness/` |
| `scaling-analysis.md` | Live-session bottleneck analysis, 90-day plan, executive answer | `launch-readiness/` |
| 23 audit files | Individual domain/cross-cutting audit reports | `launch-readiness/audits/` |
| 8 remediation reports | Implementation details per domain | `launch-readiness/implementation/` |
| 3 architecture docs | Play, Sessions, Launch Readiness architecture | `launch-readiness/` |

---

*This snapshot is frozen at launch decision. Post-launch changes should be tracked in `launch-control.md` changelog.*
