# Director Mode Triggers — QA Test Plan

**Owner:** Play domain  
**Last updated:** 2026-02-24  
**Components:** `DirectorTriggerCard`, `TriggerPanel` (in `DirectorModePanel`)  
**API:** `PATCH /api/play/sessions/[id]/triggers` — actions: `fire`, `arm`, `disable`

---

## 9 Critical Scenarios

### 1. Manual trigger armed → Fire → Becomes fired

| | |
|---|---|
| **Setup** | Manual trigger with `status='armed'`, `firedCount=0` |
| **Action** | Click "Fire now" |
| **Expected** | Spinner shows → status changes to `fired` → spinner clears. Card moves to fired visual state. `firedCount` increments to 1. |

### 2. Manual trigger fired → Rearm → Becomes armed (history remains)

| | |
|---|---|
| **Setup** | Manual trigger with `status='fired'`, `firedCount=1`, `lastFiredAt` set |
| **Action** | Click "Rearm" |
| **Expected** | Spinner shows → status changes to `armed` → spinner clears. `firedCount` still shows 1. `lastFiredAt` still shows timestamp. Rearm tooltip says "Re-arms trigger (history is preserved)". |

### 3. Execute-once trigger fired → Rearm → Fire disabled

| | |
|---|---|
| **Setup** | Trigger with `executeOnce=true`, `status='fired'`, `firedCount=1` |
| **Action** | Click "Rearm" → status becomes `armed` |
| **Expected** | "Fire now" button is disabled. Tooltip: "Already fired (execute-once)". The `1×` badge is visible in the header. |

### 4. Non-manual trigger armed → Fire disabled (without override mode)

| | |
|---|---|
| **Setup** | Non-manual trigger (e.g. `phase_started`), `status='armed'`. Override mode toggle is OFF. |
| **Action** | Observe "Override fire" button |
| **Expected** | Button is disabled. Tooltip: "Enable Director Override to fire non-manual triggers". |

### 5. Override mode ON → Non-manual trigger fire → Confirm → Status change

| | |
|---|---|
| **Setup** | Non-manual trigger, `status='armed'`. Turn ON override toggle. |
| **Action** | Click "Override fire" |
| **Expected** | Confirm dialog appears ("Fire X manually? This bypasses the normal trigger condition."). Click "Fire anyway" → Spinner → status changes to `fired`. |

### 6. Error trigger → Rearm → Status changes

| | |
|---|---|
| **Setup** | Trigger with `status='error'`, `lastError` set |
| **Action** | Click "Rearm" |
| **Expected** | Spinner → status becomes `armed`. Error text should clear (server clears `lastError` on rearm). If server doesn't clear error, the error text remains visible — document which behavior the API produces. |

### 7. Disable trigger → Status disabled + can rearm

| | |
|---|---|
| **Setup** | Trigger with `status='armed'` (also works from `fired` or `error`) |
| **Action** | Click "Disable" |
| **Expected** | Spinner → status becomes `disabled`. Card goes dim. "Rearm" button becomes available. "Fire" and "Disable" are disabled. |

### 7b. Disable already disabled → Button gated

| | |
|---|---|
| **Setup** | Trigger with `status='disabled'` |
| **Action** | Observe "Disable" button |
| **Expected** | Button is disabled. Tooltip: "Trigger is already disabled". No API call. |

### 8. Disable all → All disabled + UI updates in realtime

| | |
|---|---|
| **Setup** | Multiple triggers, some armed, some fired |
| **Action** | Click "Disable all" button in filter bar |
| **Expected** | All triggers transition to `disabled`. Each card updates independently as realtime events arrive. No stale armed cards. |

### 9. Double-click / race condition (idempotency)

| | |
|---|---|
| **Setup** | Manual trigger with `status='armed'` |
| **Action** | Click "Fire now" twice in rapid succession |
| **Expected** | Only one RPC executes (server uses idempotency key). Second click is ignored because button is disabled while pending. `firedCount` increments by exactly 1. |

---

## Edge Cases

| Scenario | Expected |
|---|---|
| **Pending timeout (10s)** | Disconnect WiFi → fire → spinner stays → after 10s, red ring + "Took longer than expected" + toast warning. |
| **Unknown condition type** | Trigger with `condition_type='custom_xyz'` → renders `custom_xyz` as fallback badge, no crash. |
| **Empty actions array** | Trigger with `actions=[]` → shows "No actions defined" in THEN row. |
| **Override sticky** | Enable override → reload cockpit → override is still ON (persisted per session URL in `sessionStorage` key `lekbanken:directorOverride:<pathname>`). Navigate to different session → override is OFF. |

---

## Debug instrumentation

Set `localStorage.setItem('trigger:debug', '1')` in browser console to enable `[TriggerCard]` debug logs.

Logged events:
- `pending:start` — action + triggerId + ack snapshot
- `pending:httpResult` — triggerId + action + ok + errorCode (if failed)
- `ack` — triggerId + action + which fingerprint condition matched (secondary reconciliation)
- `pending:timeout` — triggerId + action (after 10s fallback — should be rare now)
- `request:error` — triggerId + action + errorCode + message (in TriggerPanel)

---

## Pending-clear architecture (v2)

Pending clears via a **two-tier ack** system:

### Primary: Request-level ack (HTTP response)
The `startPending` function `await`s the handler (which calls the API). On HTTP success or failure, pending clears immediately. Errors show a diagnostic toast.

### Secondary: Fingerprint reconciliation
The `useEffect` fingerprint check remains as a safety net — it reconciles state if realtime updates arrive independently.

| Action | Fingerprint ack condition |
|---|---|
| **fire** | `firedCount` increases **OR** `lastFiredAt` changes **OR** status becomes `fired` |
| **rearm** | Status becomes `armed` |
| **disable** | Status becomes `disabled` |

### Fallback: 10s timeout
If neither HTTP response nor fingerprint clears pending (e.g. network hang), a timeout warning shows after 10s.

### Error classification in toasts

Errors now carry a `kind` field for UI classification:

| `kind` | Toast | Cause |
|---|---|---|
| `request_failed` | "Could not reach server" | Offline, 5xx, timeout, network error |
| `action_failed` | "Action failed ({errorCode})" | Server rejected: RPC error, guard, missing ref |

The `httpStatus` field is available for debugging (shown in the debug micro-widget).

| `errorCode` examples | `kind` |
|---|---|
| `NETWORK_ERROR` (httpStatus=0) | `request_failed` |
| `HTTP_502` | `request_failed` |
| `TRIGGER_IDEMPOTENCY_KEY_REQUIRED` | `action_failed` |
| `RPC_ERROR` | `action_failed` |
| `TRIGGER_FIRE_FAILED` | `action_failed` |
| `TRIGGER_NOT_FOUND` | `action_failed` |

---

## Root cause: "Åtgärd fördröjd" timeout (2026-02-23)

**Diagnosis:** `useSessionState.fireTrigger` was not sending the `X-Idempotency-Key` header required by the API for `action='fire'`. The API returned `400 { ok: false, error: 'TRIGGER_IDEMPOTENCY_KEY_REQUIRED' }`, the client's old code threw on `!res.ok`, the error was swallowed by a catch block, and the UI had no way to clear pending (waiting for a state change that never came).

**Fix:** 
1. `fireTrigger` now sends `X-Idempotency-Key: <sessionId>:<triggerId>:<uuid>` (crypto.randomUUID)
2. All trigger callbacks return `Promise<TriggerActionResult>` instead of `void`
3. `TriggerActionResult` error branch includes `kind` (`request_failed` / `action_failed`), `httpStatus`, and optional `details`
4. `DirectorTriggerCard.startPending` awaits the HTTP result and clears pending immediately
5. On failure, a diagnostic toast shows what went wrong (classified by `kind`)
6. Dev mode: `console.warn` in `useSessionState` for all error paths
7. Debug micro-widget: `localStorage.setItem('trigger:debug','1')` shows HTTP status, duration, ack reason, errorCode on each card

---

## i18n namespace note

There are **two** `triggerCard` key blocks in `messages/en.json` and `messages/sv.json`:

| Namespace | Used by | Purpose |
|---|---|---|
| `play.directorDrawer.triggerCard` | `DirectorTriggerCard` component | Director/host-facing trigger card in the drawer |
| `play.triggerCard` | Builder/preview trigger card | Shared/participant-facing trigger card component |

These are **not duplicates** — they serve different audiences with intentionally different wording (e.g. "Off" vs "Disabled" for `status.disabled`). When adding new keys, ensure you add them to the correct namespace.
