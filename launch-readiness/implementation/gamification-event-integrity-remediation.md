# Gamification Event Integrity — Remediation Plan

> **Source audit:** `launch-readiness/audits/gamification-event-integrity-audit.md`
> **Priority:** Post-launch (no blocking issues found)

---

## Overview

All items below are **P2/P3 hygiene improvements**. No double-reward bugs were found during audit. These items improve performance, defense-in-depth, and observability.

---

## P2 Items

### R-01: Early-Return on Cascade Re-execution ← F-01

**Problem:** On 23505 (duplicate event), the full 4-step cascade re-executes. Each downstream RPC makes a DB round-trip only to return "already processed."

**Fix options:**

| Option | Effort | Benefit |
|--------|--------|---------|
| A) Add `processed_at` column to `gamification_events` | Low | Skip cascade entirely on known-processed events |
| B) Return early from each cascade step if reward exists | Medium | Fine-grained, but 4 separate checks |
| C) Accept current behavior | Zero | Wasteful but correct; reassess if DB load becomes an issue |

**Recommended:** Option A — single column addition + early return check.

```sql
-- Migration
ALTER TABLE gamification_events ADD COLUMN processed_at timestamptz;
```

```typescript
// In logGamificationEventV1, after fetching existing event on 23505:
if (existingEvent.processed_at) {
  return { eventId: existingEvent.id, idempotent: true, skipped: true };
}
```

**Files to change:**
- `supabase/migrations/` — new migration for `processed_at` column
- `lib/services/gamification-events.server.ts` — early return on 23505
- `lib/services/gamification-events-v2.server.ts` — same

---

### R-02: XP Grants JSONB Pruning ← F-02

**Problem:** `user_progress.xp_grants` is a JSONB array that grows unbounded. The `? key` operator scans linearly.

**Fix options:**

| Option | Effort | Benefit |
|--------|--------|---------|
| A) Periodic pruning cron (keep last 30 days of keys) | Low | Bounds growth, preserves current design |
| B) Migrate to `xp_transactions` table with UNIQUE index | High | Matches `coin_transactions` pattern, proper normalization |
| C) Add GIN index on `xp_grants` | Low | Improves `?` operator performance but doesn't bound storage |

**Recommended:** Option A for now, Option B as a future improvement.

```sql
-- Pruning function (called by cron)
CREATE OR REPLACE FUNCTION prune_xp_grants_v1()
RETURNS void AS $$
  UPDATE user_progress
  SET xp_grants = '[]'::jsonb,
      updated_at = now()
  WHERE jsonb_array_length(coalesce(xp_grants, '[]'::jsonb)) > 500;
$$ LANGUAGE sql;
```

**Note:** Safe to prune old keys because XP transactions older than the pruning window cannot be replayed (the source events are already processed).

---

### R-03: Advisory Lock for `apply_automation_rule_reward_v1` ← F-03

**Problem:** This RPC chains to `apply_coin_transaction_v1` without its own advisory lock. Inconsistent with other write-path RPCs.

**Fix:**

```sql
-- Add at top of function body, before any writes:
PERFORM pg_advisory_xact_lock(hashtext('automation_rule_reward:' || p_idempotency_key));
```

**Files to change:**
- `supabase/migrations/` — new migration patching `apply_automation_rule_reward_v1`

---

### R-04: Mandatory Idempotency Key for Achievement Awards ← F-04

**Problem:** `achievements-admin.ts` falls back to `crypto.randomUUID()` when `idempotencyKey` is not provided. On retry, a different key is generated → phantom `admin_achievement_awards` records.

**Fix:**

```typescript
// In awardAchievementSchema, change:
idempotencyKey: z.string().optional(),
// To:
idempotencyKey: z.string().min(8),
```

**Files to change:**
- `app/actions/achievements-admin.ts` — make `idempotencyKey` required in schema, remove `crypto.randomUUID()` fallback
- Any UI calling this action — must provide a deterministic key (e.g., `admin:award:{achievementId}:{timestamp}`)

---

## P3 Items

### R-05: Cascade Re-execution Monitoring ← F-05

**Problem:** No visibility into how often the 23505 path fires.

**Fix:** Add structured logging in the 23505 branch:

```typescript
console.info('[gamification-events] idempotent cascade re-entry', {
  eventId: existingEvent.id,
  eventType: input.eventType,
  source: input.source,
});
```

**Files to change:**
- `lib/services/gamification-events.server.ts`
- `lib/services/gamification-events-v2.server.ts`

---

### R-06: Document Visibility Change Event Semantics ← F-06

**Problem:** Each visibility toggle creates a distinct gamification event (by design), but this isn't documented.

**Fix:** Add inline comment in `plans/visibility/route.ts` explaining:
```typescript
// Idempotency key includes targetVisibility — each visibility state change is a distinct event.
// Toggling public→tenant→public creates 2 events. This is intentional.
```

---

## Priority Matrix

| Item | Severity | Effort | Pre-launch? | Post-launch target |
|------|----------|--------|-------------|-------------------|
| R-01 | P2 | Low | No | Sprint 2 |
| R-02 | P2 | Low | No | Sprint 3 (monitor growth first) |
| R-03 | P2 | Low | No | Sprint 2 |
| R-04 | P2 | Low | No | Sprint 1 (admin UI update) |
| R-05 | P3 | Trivial | Optional | Sprint 1 |
| R-06 | P3 | Trivial | Optional | Sprint 1 |

**None of these items block launch.** The DB-layer idempotency guarantees are sufficient for safe operation.
