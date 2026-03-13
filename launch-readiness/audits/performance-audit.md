# Performance Audit (#19) — Cross-Cutting

**Status:** ✅ Complete — GPT-calibrated (2026-03-12). PERF-001 downgraded P1→P2-high. No launch remediation required.  
**Date:** 2026-03-12  
**Scope:** Bundle/build, data fetching, database queries, caching/ISR, images, client performance, realtime/polling, middleware, CSS, third-party  
**Method:** Static code analysis across entire codebase. `grep_search` + subagent infrastructure scan. Verified independently.

---

## Executive Summary

**6 findings (0 P0, 0 P1, 4 P2, 2 P3)**

| Severity | Count | Launch Impact |
|----------|-------|---------------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 4 | Efficiency / scalability debt (PERF-001 is P2-high — first post-launch perf fix) |
| P3 | 2 | Cleanup / optimizations |

The application has **excellent client-side performance patterns** (memoization, code splitting, dynamic imports, Tailwind v4) and a **minimal third-party footprint**. The primary risk is **server-side query efficiency** — one N+1 endpoint and broad `select('*')` usage — and an **underutilized caching/ISR strategy**.

> **GPT Calibration (2026-03-12):** PERF-001 downgraded P1→P2-high. Rationale: session history is a secondary coach-facing historikvy, not part of live play runtime or a launch-critical golden path. Blast radius is admin/coach UX + DB efficiency. Marked as **first post-launch perf fix**.

---

## Findings

### PERF-001 — N+1 Query Pattern in Session History (P2-high)

**File:** `app/api/participants/sessions/history/route.ts` lines 59–92  
**Risk:** Scale inefficiency — slow page loads for active coaches. GPT downgraded from P1: not live-play runtime, not launch-critical golden path. For 50 sessions (default limit), the endpoint fires **100 additional queries** (2 per session: `participants` status count + `participant_game_progress` scores).

**Evidence:**
```typescript
const enrichedSessions = await Promise.all(
  (sessions || []).map(async (session) => {
    // Query 1: participant status counts
    const { data: participants } = await supabase
      .from('participants').select('status').eq('session_id', session.id);
    // Query 2: progress scores
    const { data: progressData } = await supabase
      .from('participant_game_progress').select('score, achievement_count').eq('session_id', session.id);
    ...
  })
);
```

**Impact:** At 50 sessions × 2 queries = 100 additional DB roundtrips. Active coaches with many sessions will see slow page loads. Under concurrent load, this multiplies Supabase connection pressure.

**Recommendation:** Replace with joined query using Supabase relation selects:
```typescript
.select(`*, participants(status), game_progress:participant_game_progress(score, achievement_count)`)
```
Or use a database view/RPC that aggregates counts server-side.

---

### PERF-002 — `select('*')` Proliferation on List Queries (P2)

**Scope:** 231 total instances across the codebase:
- API routes: 106 instances (43 files)
- Services: 106 instances (22 files) 
- Server actions: 19 instances (7 files)

**Nuance:** Not all are problematic:
- `.insert(...).select('*')` / `.update(...).select('*')` — **legitimate** (returns modified row, Supabase pattern)
- `.select('*').eq('id', x).single()` — **low risk** (single row lookup)
- `.select('*')` on **list queries without limit** — **high risk** (full table scan + large payloads)

**Worst offenders (list queries):**
| File | Table | Risk |
|------|-------|------|
| `analyticsService.ts` (18 instances) | page_views, feature_usage, error_tracking, funnel_analytics | Large event tables, no column projection, some lack `.limit()` |
| `contentService.ts` (6 instances) | content tables | Full content blobs when only metadata needed |
| `supportService.ts` (10 instances) | support_tickets | Ticket descriptions are potentially large text |
| `marketplaceService.ts` (10 instances) | shop_items | Full item data on browse queries |
| `games/csv-export/route.ts` (8 instances) | Multiple game tables | Export context — acceptable |

**Note:** One file already demonstrates the correct pattern: `app/api/games/search/helpers.ts` contains the comment "This replaces `select('*')` with explicit fields needed by GameCard."

**Recommendation:** Post-launch, add column projection to list/browse queries in services. Single-row lookups are low priority.

---

### PERF-003 — Underutilized ISR / Caching Strategy (P2)

**Current state:**
- **1 ISR page:** `pricing/[slug]/category-detail.tsx` with `revalidate = 300` (5 min)
- **0 `generateStaticParams`** usage anywhere
- **React `cache()`:** Only `getGameByIdPreview` (request-level dedup) — correct but limited
- **`unstable_cache`:** Only in `lib/marketing/api.ts` (added after timeout diagnostic)
- **`revalidatePath`:** Used in 3 server action files (tickets, achievements, support) — 13 calls total
- **`revalidateTag`:** 0 usage
- **`force-dynamic`:** ~15 pages (auth pages = legitimate; sandbox pages = legitimate; marketing signup/login = legitimate due to CSRF/cookies)

**What could benefit from ISR/caching:**
- Marketing feature pages and changelogs — currently fresh DB query per request
- Public game catalog — read-heavy, infrequently updated
- Pricing pages — only 1 of N pricing routes uses ISR

**What correctly avoids caching:**
- All authenticated app pages — RLS-dependent, user-specific data
- Play/session pages — real-time data
- Admin pages — always fresh

**Recommendation:** Post-launch, add ISR to marketing/public pages. Authenticated pages correctly avoid caching.

---

### PERF-004 — Concurrent Client-Side Timers in Play Mode (P2)

**Context:** During an active play session, up to **5+ concurrent timers** run simultaneously:

| Timer | File | Interval | Purpose |
|-------|------|----------|---------|
| Session state poll | `useLiveSession.ts` | 30s | State sync |
| Artifact poll | `useSessionState.ts` | Variable | Artifact data |
| Heartbeat | `ParticipantSessionWithPlay.tsx` | 30s | Presence |
| Countdown tick | `useCountdown.ts` | 1s | Timer display |
| Signal toast dismiss | `ParticipantSignalMicroUI.tsx` | Variable | Auto-dismiss |
| Chat poll | `useSessionChat.ts` | Variable | Chat messages |

**Mitigating factors:**
- All timers use proper `clearInterval` cleanup in `useEffect` return
- `requestRateMonitor.ts` exists specifically to prevent request storms
- Timers are purpose-specific and appropriate for their use cases
- Supabase realtime reduces polling need (14 realtime channels in codebase)

**Risk:** Moderate CPU/battery drain on mobile devices during long play sessions. Not a launch blocker — this is the inherent cost of a real-time interactive game platform.

**Recommendation:** Post-launch, consider consolidating poll timers into a single orchestrator or switching remaining polls to realtime subscriptions where feasible.

---

### PERF-005 — Some `<img>` Tags Could Use `next/image` (P3)

**Current state:**
- **64+ `next/image` imports** — dominant pattern ✅
- **~18 `<img>` tags** in production code

**Breakdown of `<img>` usage:**
| Category | Count | Files | Verdict |
|----------|-------|-------|---------|
| QR code data URIs | 2 | RunSessionCockpit, SessionCockpit | ✅ Correct — `next/image` can't optimize data URIs |
| Spatial editor thumbnails | 4 | CanvasToolbar, InspectorPanel | ✅ Acceptable — dynamic blob URLs from editor |
| Marketing testimonials | 1 | testimonials.tsx | Could use `next/image` |
| Journey components | 3 | JourneyProgress, JourneyOverview, JourneyIdentity | Could use `next/image` |
| Admin components | 2 | OrganisationBrandingSection, ShopRewardsAdminClient | Acceptable — admin, dynamic uploads |
| MFA QR code | 1 | MFAEnrollmentModal | ✅ Correct — data URI |
| Sandbox pages | 2 | sandbox/* | ✅ Not production |

**16 `unoptimized` props** on `next/image` — mostly justified (badge editor SVG thumbnails, small icons with comment "no need for optimization", QR codes).

**Recommendation:** Low priority. Most `<img>` usage has valid reasons. ~4 marketing/journey images could migrate to `next/image` for lazy loading + format optimization.

---

### PERF-006 — `force-dynamic` on Sandbox/Dev Pages (P3)

**Scope:** ~7 sandbox pages use `export const dynamic = 'force-dynamic'`:
- `sandbox/design-system/*` (3 pages)
- `sandbox/docs/*` (4 pages)

**Impact:** Zero — sandbox pages are dev-only, not production traffic. Auth pages (login, signup, reset-password, MFA) correctly use `force-dynamic` due to cookie/CSRF requirements.

**Recommendation:** No action needed. These are correctly configured for their purpose.

---

## Positive Findings

| # | Area | Detail |
|---|------|--------|
| P1 | Bundle / Build | Turbopack enabled, 28 production deps. No bloat. Zero CSS-in-JS. |
| P2 | Client Memoization | 100+ `useMemo`, 50+ `useCallback`, proper context splitting |
| P3 | Code Splitting | 20+ `dynamic()` imports across features |
| P4 | Font Loading | `next/font` (Geist, Geist_Mono) — self-hosted, no FOUT, optimal |
| P5 | Third-Party | Minimal — no analytics SDKs, no chat widgets, no animation libraries |
| P6 | Image Usage | 64+ `next/image` instances — dominant pattern |
| P7 | CSS | Tailwind v4, zero CSS-in-JS, zero animation libs (framer-motion/GSAP) |
| P8 | Timer Cleanup | All `setInterval`/`setTimeout` properly cleaned up in `useEffect` return |
| P9 | Middleware | No `middleware.ts` — zero per-request overhead. Auth via Supabase SSR client. |
| P10 | Rate Monitor | `requestRateMonitor.ts` prevents client-side request storms during play |
| P11 | Realtime | 14 Supabase realtime channels reduce polling overhead |
| P12 | Marketing Cache | `unstable_cache` with tags on marketing features API (post-timeout-diagnostic fix) |
| P13 | Search Projection | `games/search/helpers.ts` demonstrates correct `select()` projection pattern |

---

## Severity Distribution

| ID | Finding | Severity | Launch Action |
|----|---------|----------|---------------|
| PERF-001 | N+1 in session history | P2-high | First post-launch perf fix — replace N+1 with joined query |
| PERF-002 | `select('*')` on list queries | P2 | Post-launch — add column projection to hot paths |
| PERF-003 | Underutilized ISR/caching | P2 | Post-launch — add ISR to marketing/public pages |
| PERF-004 | Concurrent play timers | P2 | Post-launch — consider timer consolidation |
| PERF-005 | `<img>` vs `next/image` | P3 | Post-launch — migrate ~4 images |
| PERF-006 | `force-dynamic` on sandbox | P3 | No action needed |

---

## Remediation Milestones

### M1 — N+1 Fix (First post-launch)

- [ ] Replace session history endpoint's per-session queries with joined Supabase select or DB view
- [ ] Add `.limit()` safety to the main query (currently capped by URL param, default 50)

### M2 — Query Projection (Post-launch)

- [ ] Audit `analyticsService.ts` list queries — add column projection
- [ ] Audit `supportService.ts` list queries — exclude large text fields
- [ ] Audit `contentService.ts` — project only metadata on list endpoints
- [ ] Follow pattern from `games/search/helpers.ts`

### M3 — Caching Strategy (Post-launch)

- [ ] Add ISR to marketing feature/changelog pages
- [ ] Add `generateStaticParams` to public game catalog if product warrants it
- [ ] Add `revalidateTag` to game publish/unpublish flows
- [ ] Evaluate `React.cache()` for frequently called server functions

### M4 — Play Mode Optimization (Post-launch)

- [ ] Evaluate timer consolidation into single orchestrator
- [ ] Consider replacing remaining polls with realtime subscriptions
- [ ] Battery/CPU profiling on mobile devices during long sessions

---

## Appendix: Verification Data

| Metric | Count | Source |
|--------|-------|--------|
| `select('*')` in API routes | 106 | `grep_search` app/api/** |
| `select('*')` in services | 106 | `grep_search` lib/services/** |
| `select('*')` in actions | 19 | `grep_search` app/actions/** |
| `<img>` tags (production) | ~18 | `grep_search` features/** + components/** + app/** |
| `next/image` imports | 64+ | Subagent scan |
| `unoptimized` prop | 16 | `grep_search` |
| `setInterval` (production) | 35+ | `grep_search` (excluding docs/markdown) |
| `force-dynamic` pages | ~15 | `grep_search` |
| Supabase realtime channels | 14 | `grep_search` `.channel(` |
| `revalidatePath` calls | 13 | `grep_search` |
| `generateStaticParams` | 0 | `grep_search` |
| ISR pages | 1 | pricing/[slug] |

---

## Post-Launch Performance Backlog

Priority-ordered list to prevent findings from being lost:

1. **PERF-001** — Eliminate session history N+1 (P2-high, first fix)
2. **PERF-002** — Replace `select('*')` with column projection on list queries
3. **PERF-003** — Introduce ISR for marketing/public pages
4. **PERF-004** — Evaluate play timer consolidation
