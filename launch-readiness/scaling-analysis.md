# Lekbanken Scaling Analysis

> **Date:** 2026-03-13
> **Source:** GPT technical assessment, verified against codebase by Claude
> **Status:** Reference document — informs post-launch scaling priorities

---

## System Profile

Lekbanken is a **live-session system**, not a conventional CRUD SaaS. The critical path is real-time coordination between host and participants during active play sessions, involving high-frequency small mutations, multiple simultaneous views of the same state, and a mix of polling + realtime for the same domain objects.

### Target Audience

**Kyrka & ungdomsarbete** (church & youth work). Event-driven, spiky traffic — not constant SaaS load.

- **When:** Wednesday evening (ungdomsgrupper), Friday evening, Sunday afternoon/evening, plus camps/conferences
- **How:** Each participant on their own mobile phone
- **Where:** Church halls, basements, camps, forests, gyms — often **poor connectivity**
- **Growth pattern:** Clustered (one church adopts → tells nearby churches at regional meetings)

### Load Dimensions

| Dimension | Definition | First-year estimate |
|-----------|-----------|---------------------|
| **Organisations** | Registered churches/groups | ~200 |
| **Groups per org** | Activity groups using Lekbanken | ~2 |
| **Sessions / week** | Total play sessions across all orgs | ~800 |
| **Sessions / day** | Average (spiky — peak Wed/Fri/Sun) | ~115 avg, ~250 peak |
| **Participants / session** | Average group size | ~12 |
| **Peak concurrent sessions** | Simultaneous live sessions | 30-60 |
| **Peak concurrent clients** | Simultaneous connected devices | ~600 (40 sessions × 15) |
| **DAU** | Daily active users (peak days) | ~3,000 |

> **Key metric:** `live_play_concurrency` (not DAU). The system's scaling is driven by how many sessions are active at the same time, not total user count.

### Bottleneck Order for This Audience

1. **Polling fan-out** — Wednesday evening peak with 40+ concurrent sessions
2. **Serverless invocation cost** — not a technical stop, but cost optimisation
3. **Presence/heartbeat** — at larger events (camps, conferences, 50-200 participants)
4. **Hot row contention** — at >200 concurrent sessions (far away)

### Environmental Risk: Connectivity

The biggest real-world risk is **poor connectivity** in typical venues (unstabil wifi, mobilnät i källare). This makes reconnect logic, idempotent commands, and session rejoin critical path features — all of which are already implemented.

---

## Top 5 Expected Bottlenecks

### 1. Host-side fan-out: polling + Realtime under active play

**Layer:** Application + Vercel/serverless
**Onset:** 10k–100k users

Each active session runs multiple simultaneous mechanisms:
- Broadcast on `play:{sessionId}` (15+ event types)
- Legacy broadcast on `session:{sessionId}`
- Host-side postgres_changes subscriptions
- Host polling every 3s (state) + 5s (session) + 15s (artifacts)
- Chat polling every 2-5s (independent, ignores `realtime-gate`)
- Participant heartbeat every 10s (fixed)
- Participant refresh every 60s

**Codebase verification:** 3+ independent pollers active simultaneously per session. Chat ignores `realtime-gate.ts`. Redundant data fetching between broadcast + poll for step/phase/status.

**Early warning signals:**
- Rising request count per active session
- Increasing p95/p99 on host endpoints despite low DB CPU
- More Realtime reconnects
- Host UI feels jerky despite DB headroom
- Vercel invocations rise faster than DAU
- Sessions with many participants disproportionately expensive

**Cheapest fix first:**
- Measure "requests per active live session" as first-class metric
- Consolidate host polling where possible
- Define clear push-vs-poll ownership per data type
- Remove dual-source where both broadcast and polling update the same UI

**Do not optimize yet:** Custom WebSocket server, replacing Supabase Realtime, microservices.

---

### 2. Serverless + in-memory rate limiting + request explosion

**Layer:** Vercel/serverless
**Onset:** 10k–100k users (especially with uneven traffic)

In-memory Map-based rate limiter resets on deploy and is per-instance — inconsistent across serverless instances, ineffective for global abuse protection.

**Codebase verification:** Many play mutation routes have no explicit rate limiting — rely on auth + session guards only. Migration path to Upstash documented in `lib/utils/rate-limiter.ts`.

**Early warning signals:**
- Irregular p95 despite similar traffic volume
- Sudden request spikes without user growth
- Rate limit behavior feels "uneven"
- Higher Vercel cost/invocations than expected
- Same endpoint behaves differently by region/instance

**Cheapest fix first:**
- Migrate limiter to Upstash Redis on most expensive/public routes first
- Instrument per endpoint: requests/min, rejected/min, unique IPs
- Start with play/public/auth routes, not everything

**Do not optimize yet:** General distributed traffic-control framework, rate limiting every route "just because."

---

### 3. Write contention on hot rows in `participant_sessions`

**Layer:** Postgres
**Onset:** 100k users or earlier with high live play concurrency

`participant_sessions` is the convergence point for: state transitions, `broadcast_seq`, timer changes, board/puzzle runtime, session-level coordination. Same row written by every command.

**Codebase verification:** 4 puzzle RPCs use `SELECT ... FOR UPDATE`. `increment_broadcast_seq` uses atomic `UPDATE ... RETURNING`. No per-mutation latency instrumentation exists.

**Early warning signals:**
- Increasing latency specifically on session mutations (not broadly)
- More timeouts or retried actions in play
- Host commands feel slow in intensive sessions
- p95/p99 spikes for mutations while reads are fine
- More race-conflict/null-return cases in session-command pipeline
- Lock wait or queueing around hot rows

**Cheapest fix first:**
- Instrument per mutation type: latency, lock wait, retries, conflict returns
- Identify which writes must live on the session row
- Move secondary append-only data further from hot row

**Do not optimize yet:** Advisory locks everywhere, database sharding, splitting `participant_sessions` into five tables without profiling data.

---

### 4. Presence/heartbeat model for participants

**Layer:** Application + Postgres
**Onset:** 100k users or earlier with many concurrent sessions

Participant status relies on multiple signals: heartbeat API, host polling, broadcast events, postgres_changes, `last_seen_at` freshness — no single canonical transport.

**Codebase verification (worse than GPT assumed):** Two separate heartbeat systems (host 30s, participant 10s), both with **fixed intervals**. No adaptation to session status — a paused session heartbeats identically to active. No `useParticipantHeartbeat` hook — inlined into components.

**Early warning signals:**
- Participants shown as offline/online incorrectly
- Host sees delayed status
- More writes to `participants` than expected
- Heartbeat endpoint becomes top endpoint by volume
- Sessions with many participants disproportionately expensive

**Cheapest fix first:**
- Make heartbeat adaptive: frequent in active, slower in paused/lobby, stopped in ended
- Define a single prioritized truth for presence in UI
- Measure writes per active participant per minute

**Do not optimize yet:** Full presence infrastructure with Redis presence, socket coordinator, distributed leasing.

---

### 5. No workers / async lanes for background processing

**Layer:** Application architecture
**Onset:** 100k–1M users (plan earlier)

All side effects block the request: event logging, broadcast, cleanup, notifications.

**Codebase verification:** Zero `after()`, zero `waitUntil`, zero deferred work anywhere in API routes. Session cleanup endpoint exists (`/api/participants/tokens/cleanup`) but **no scheduler is configured** — sessions stay in `ended` status forever until manual action.

**Early warning signals:**
- Mutation endpoints gradually slower despite good SQL
- Time-consuming side effects mixed with critical requests
- Cron job gains growing responsibilities
- Request chains grow because "a little extra" happens along the way

**Cheapest fix first:**
- Identify top 5 side effects that don't need to be inline
- Create minimal background lane for: cleanup, aggregation, non-critical notifications
- Keep play-critical mutations small and deterministic
- Configure cron for session cleanup (already built, just unscheduled)

**Do not optimize yet:** Full event bus, Kafka, temporal workflow engine, large queue platform.

---

## What NOT to Optimize Yet

| Don't build | Why not |
|------------|---------|
| Global sharding | Nowhere near storage/throughput limits |
| Custom WebSocket infrastructure | Supabase Realtime unproven as bottleneck |
| Kafka/event bus | No event-driven architecture needed yet |
| Advisory locks everywhere | Current locking model is correct |
| Multi-database tenancy split | RLS-based tenancy is adequate |
| Per-session in-memory coordinator | Premature complexity |
| CQRS/event sourcing for runtime | No evidence of read/write asymmetry issues |
| Full-scale job platform | Minimal async lane first |

---

## 90-Day Plan

### Nu (soft launch)

- [ ] Instrument live-session metrics (requests, writes, latency per active session)
- [x] Make heartbeat adaptive (active → frequent, paused → slow, ended → stop) ✅ (2026-03-13)
- [x] Document push-vs-poll ownership contract ✅ (2026-03-13)
- [x] Configure session cleanup cron schedule ✅ (2026-03-13)
- [ ] Set up dashboards: heartbeat volume, mutation latency, broadcast volume, active sessions, Vercel invocations
- [ ] Migrate rate limiter to Upstash on priority endpoints

### Nästa steg (after traffic data)

- [ ] Consolidate host polling (unified refresh instead of 3+ independent pollers)
- [ ] Reduce dual signal paths for participant/status
- [ ] Create minimal async lane for non-critical side effects (Next.js `after()`)
- [ ] Profile `participant_sessions` and 4 `FOR UPDATE` RPCs under realistic load
- [ ] Test high live-play concurrency with synthetic sessions

### Senare (when data shows need)

- [ ] If data shows: separate session coordination state from rich runtime state
- [ ] If Realtime bottlenecks: redesign channel mix
- [ ] If request cost dominates: more event-driven host state
- [ ] If inline side effects slow: build out background processing
- [ ] If rate limiter becomes globally critical: fully distributed throttling model

---

## Executive Answer

| Question | Answer |
|----------|--------|
| **First bottleneck at ~10k–100k** | Host-side polling + Realtime fan-out + many small serverless requests per active live session |
| **First bottleneck at ~100k–1M** | Write contention on hot rows in `participant_sessions` + presence/heartbeat volume |
| **First bottleneck at ~1M+** | Absence of async lanes/workers — too much inline side-effect work per request |
| **The bottleneck that is NOT the database** | Vercel/serverless request explosion combined with polling, fan-out, and in-memory rate limiting |
| **The one thing to instrument immediately** | Requests, writes, broadcasts, and latency **per active live session** |
| **The one thing NOT to optimize yet** | Custom realtime/socket architecture or database sharding |

---

## Implementation Priority (GPT-recommended)

| Order | Action | Scope | Why first |
|-------|--------|-------|-----------|
| 1 | Adaptive heartbeat | `ParticipantSessionWithPlay`, `PlayPlanPage` | Highest ROI — concrete, bounded, directly reduces live-load |
| 2 | Push-vs-poll contract | `lib/play/realtime-gate.ts` + documentation | Prevents redundant work, prerequisite for polling consolidation |
| 3 | Session cleanup cron | `vercel.json` or Supabase cron schedule | Operational hygiene — endpoint exists, just needs scheduling |
| 4 | Upstash rate limiter | `lib/utils/rate-limiter.ts` | Infrastructure preparation — requires account setup |

---

*This analysis is a reference document. Implementation progress tracked in `launch-control.md` changelog.*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-13 | Initial document — 5 bottlenecks, 90-day plan, executive answer |
| 2026-03-13 | Target audience profile added (kyrka/ungdomsarbete), load dimensions updated with first-year estimates, bottleneck order for audience, connectivity risk documented |
