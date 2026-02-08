# Trigger Engine Contract

**Version:** 1.0  
**Date:** 2026-02-08  
**Status:** Enforced  
**Migration:** `20260208000001_trigger_engine_hardening.sql`

---

## Overview

This document defines the contract for the Trigger Engine V2.1, implementing:
- **execute_once** guard to prevent multi-fire of one-shot triggers
- **Idempotency** protection against duplicate fires from retries/reconnects
- **Atomic** database operations via RPC
- **Observability** via session_events logging

---

## SSoT Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `game_triggers` | Trigger config (immutable) | `execute_once`, `condition`, `actions` |
| `session_trigger_state` | Runtime state (mutable) | `status`, `fired_count`, `fired_at` |
| `session_trigger_idempotency` | Replay protection | `idempotency_key` (PK composite) |
| `session_events` | Audit log | `event_type`, `payload` |

---

## Design Invariants

### I1: Authority (Host-Only)

> **INVARIANT:** Only the session host can fire, disable, or arm triggers.

**Enforcement:**
- Route checks `session.host_user_id === user.id`
- RPC callable only by `service_role` (GRANT/REVOKE)

### I2: execute_once Guard

> **INVARIANT:** Triggers with `execute_once=true` can only be fired once per session. Subsequent fire attempts return NO-OP.

**Enforcement:**
- RPC `fire_trigger_v2_safe` uses CASE guard in UPDATE
- Response: `{ ok: true, status: 'noop', reason: 'EXECUTE_ONCE_ALREADY_FIRED' }`

### I3: Idempotency

> **INVARIANT:** Same `(session_id, trigger_id, idempotency_key)` cannot cause duplicate fires. Replays return NO-OP with original result.

**Enforcement:**
- `session_trigger_idempotency` table with PK constraint
- INSERT ... ON CONFLICT DO NOTHING pattern
- Response: `{ ok: true, status: 'noop', reason: 'IDEMPOTENCY_REPLAY', replay: true }`

### I4: Atomicity

> **INVARIANT:** Trigger state changes (fired_count, fired_at) are atomic. No JS read-modify-write patterns.

**Enforcement:**
- Single RPC `fire_trigger_v2_safe` handles all logic
- INSERT ... ON CONFLICT DO UPDATE with CASE guards
- No separate SELECT then UPDATE

### I5: Observability

> **INVARIANT:** Every fire attempt is logged to `session_events` with full context.

**Enforcement:**
- RPC calls `log_session_event()` for all outcomes
- Payload includes: result, idempotency_key, fired_count, execute_once

---

## API Contract

### Endpoint

```
PATCH /api/play/sessions/{sessionId}/triggers
```

### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Host auth token |
| `X-Idempotency-Key` | Yes (for fire) | Unique key per fire attempt (UUID recommended) |

**Body:**
```json
{
  "triggerId": "uuid",
  "action": "fire" | "disable" | "arm"
}
```

### Responses

#### Response Field Semantics

> **IMPORTANT:** `status` (top-level) and `trigger.status` have different meanings:
> 
> | Field | Meaning | Values |
> |-------|---------|--------|
> | `status` | **Operation result** — what happened to this request | `fired`, `noop` |
> | `trigger.status` | **DB state** — current state in `session_trigger_state` | `fired`, `armed`, `disabled` |
> | `reason` | Why noop occurred (null if fired) | `EXECUTE_ONCE_ALREADY_FIRED`, `IDEMPOTENCY_REPLAY` |
> 
> **Normative rule:** `trigger.status` MUST NEVER represent operation outcome — only DB state. Operation outcome is ALWAYS top-level `status`. This rule prevents semantic drift.
>
> **UI implication:** To disable the fire button for execute_once triggers, check:
> ```ts
> const isConsumed = trigger.execute_once && trigger.firedCount > 0;
> // Optional replay affordance:
> const isReplay = status === 'noop' && reason === 'IDEMPOTENCY_REPLAY';
> ```
> 
> `trigger.status = 'armed'` does NOT mean "can fire" — it means the DB row status is armed.
> Use `reason` and `firedCount` to determine if a trigger is effectively consumed.

#### Fire Success (200)

```json
{
  "ok": true,
  "status": "fired",
  "reason": null,
  "replay": false,
  "trigger": {
    "id": "uuid",
    "status": "fired",
    "firedAt": "2026-02-08T12:00:00Z",
    "firedCount": 1
  }
}
```

#### execute_once NO-OP (200)

Note: `originalFiredAt` is **not** included here (only for idempotency replays).

```json
{
  "ok": true,
  "status": "noop",
  "reason": "EXECUTE_ONCE_ALREADY_FIRED",
  "replay": false,
  "trigger": {
    "id": "uuid",
    "status": "armed",
    "firedAt": "2026-02-08T11:00:00Z",
    "firedCount": 1
  }
}
```

#### Idempotency Replay (200)

```json
{
  "ok": true,
  "status": "noop",
  "reason": "IDEMPOTENCY_REPLAY",
  "replay": true,
  "originalFiredAt": "2026-02-08T12:00:00Z",
  "trigger": {
    "id": "uuid",
    "status": "armed",
    "firedAt": "2026-02-08T12:00:00Z",
    "firedCount": 1
  }
}
```

#### Missing Idempotency Key (400)

```json
{
  "ok": false,
  "error": "TRIGGER_IDEMPOTENCY_KEY_REQUIRED"
}
```

#### Trigger Not Found (404)

```json
{
  "error": "Trigger not found"
}
```

#### Unauthorized (401/403)

```json
{
  "error": "Unauthorized" | "Only host can update triggers"
}
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `TRIGGER_IDEMPOTENCY_KEY_REQUIRED` | 400 | Missing X-Idempotency-Key header for fire action |
| `EXECUTE_ONCE_ALREADY_FIRED` | 200 (noop) | Trigger with execute_once=true already fired |
| `IDEMPOTENCY_REPLAY` | 200 (noop) | Duplicate request with same idempotency key |
| `TRIGGER_NOT_FOUND` | 404 | Trigger ID doesn't exist |
| `TRIGGER_FIRE_FAILED` | 500 | RPC or database error |

---

## RPC: fire_trigger_v2_safe

**Signature:**
```sql
fire_trigger_v2_safe(
  p_session_id UUID,
  p_game_trigger_id UUID,
  p_idempotency_key TEXT,
  p_actor_user_id UUID
) RETURNS TABLE(
  ok BOOLEAN,
  status TEXT,
  reason TEXT,
  replay BOOLEAN,
  fired_count INTEGER,
  fired_at TIMESTAMPTZ,
  original_fired_at TIMESTAMPTZ
)
```

**Security:**
- `SECURITY DEFINER`
- `REVOKE ALL FROM anon, authenticated`
- `GRANT EXECUTE TO service_role`

**Logic Order:**
1. Validate trigger exists
2. Insert idempotency key (ON CONFLICT → replay)
3. If replay → return noop with original state
4. Upsert trigger state with execute_once CASE guard
5. Log to session_events
6. Return result

---

## session_events Payload

For `event_type = 'trigger_fire'`:

```json
{
  "result": "fired" | "noop_execute_once" | "noop_replay",
  "idempotency_key": "uuid-key",
  "fired_count": 1,
  "execute_once": true
}
```

**Event mapping:**
| Field | Value |
|-------|-------|
| `event_type` | `trigger_fire` |
| `event_category` | `trigger` |
| `actor_type` | `host` |
| `actor_id` | Host user ID |
| `target_type` | `trigger` |
| `target_id` | Trigger ID |
| `severity` | `info` |

---

## Contract Tests

**Location:** `tests/unit/play-triggers/trigger-contract.test.ts`

| # | Test | Contract |
|---|------|----------|
| T1 | execute_once first fire → fired_count=1 | I2 |
| T2 | execute_once repeat → noop EXECUTE_ONCE_ALREADY_FIRED | I2 |
| T3 | non-execute_once with unique keys → count increments | I2 |
| T4 | same idempotency key → noop IDEMPOTENCY_REPLAY | I3 |
| T5 | missing idempotency header → 400 | I3 |
| T6 | first fire (no state row) → creates row | I4 |
| T7 | invalid triggerId → 404 | — |
| T8 | non-host user → 403 | I1 |
| T9 | response shape stability | — |
| T10 | disable preserves fired_count | — |
| T11 | arm preserves fired_count | — |
| T12 | session_events payload (documented limitation) | I5 |

---

## Verification Runbook

### Unit Tests
```bash
npx vitest run tests/unit/play-triggers --reporter=verbose
```

### TypeScript Check
```bash
npx tsc --noEmit
```

### Manual SQL Verification (session_events)
```sql
SELECT 
  event_type,
  event_category,
  actor_type,
  target_id,
  payload,
  created_at
FROM session_events
WHERE event_type = 'trigger_fire'
  AND session_id = '<session-uuid>'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Idempotency Key Retention

### Table: `session_trigger_idempotency`

Stores idempotency keys to prevent duplicate fires. Keys accumulate during session lifetime.

### Cleanup Strategy

**Cleanup function:**
```sql
SELECT cleanup_trigger_idempotency_keys(24);  -- Deletes keys older than 24 hours
```

**Recommended cleanup triggers:**
1. **Session end:** Call cleanup when session ends (via session end flow)
2. **Scheduled job:** Run daily to catch orphaned keys

**Implementation status:** 
- ✅ Cleanup function exists (`cleanup_trigger_idempotency_keys`)
- ⏳ Automatic invocation not yet wired (TODO: add to session end flow)

### RLS

Table has RLS enabled with policy for `service_role` only. No client can read/write directly.

---

## References

- [triggers/route.ts](../../app/api/play/sessions/%5Bid%5D/triggers/route.ts) — API implementation
- [20260208000001_trigger_engine_hardening.sql](../../supabase/migrations/20260208000001_trigger_engine_hardening.sql) — Migration
- [trigger-contract.test.ts](../../tests/unit/play-triggers/trigger-contract.test.ts) — Contract tests
- [PLAY_UI_WIRING_AUDIT_REPORT.md](PLAY_UI_WIRING_AUDIT_REPORT.md) — Parent audit document

---

*Last updated: 2026-02-09*
