# Signals System – Architecture Spec

> Single-page reference for the two-way tactical signal system in Legendary Play.

---

## 1. Overview

Signals are lightweight, fire-and-forget coordination messages between the **Director** (host/facilitator) and **Participants** during a live play session. They complement the heavier state-machine events (stage transitions, scoring) by providing low-latency tactical cues (pause, hint, SOS, etc.).

### Design principles

| Principle | Detail |
|---|---|
| **Two-way** | Director → Participant *and* Participant → Director |
| **Fire-and-forget** | No guaranteed delivery; reconnect tolerance via LRU dedupe |
| **Server-authoritative** | Persisted in `session_signals` table; realtime broadcast is an optimistic fast-path |
| **Catalog-driven** | All known signal types live in `signalCatalog.ts` — single source of truth for icons, severity, origin, presentation, duration |

---

## 2. Database schema

```sql
-- supabase/migrations/20251227120000_signal_time_bank.sql
CREATE TABLE public.session_signals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  channel               TEXT NOT NULL,          -- e.g. 'pause', 'sos', 'hint'
  payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
  sender_user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:** `(session_id, created_at DESC)`, `(session_id, channel)`, `(sender_participant_id)`.

**RLS:** Authenticated users with a role on the parent session can SELECT; INSERT guarded by API layer.

---

## 3. Signal catalog (`signalCatalog.ts`)

Every known channel is defined once with these fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | `string` | Canonical lower-case key (matches `CHANNEL_KEY_MAP`) |
| `i18nKey` | `string` | Suffix under `signalInbox.channels.*` |
| `icon` | `string` | Heroicon name hint (consumer resolves) |
| `severity` | `info \| warn \| urgent` | Drives colour and haptic weight |
| `origin` | `director \| participant \| both` | Typical sender role |
| `defaultDurationMs` | `number` | Participant toast/overlay duration (`0` = persistent) |
| `presentation` | `Array<toast \| overlay \| sound \| haptic>` | How participants experience the signal |

### Current entries

| Channel | Direction | Severity | Presentation |
|---|---|---|---|
| `pause` | Director → Participant | warn | overlay (persistent) |
| `hint` | Director → Participant | info | toast (8 s) |
| `attention` | Director → Participant | warn | toast + haptic (6 s) |
| `flash` | Director → Participant | urgent | overlay + haptic (3 s) |
| `ready` | Participant → Director | info | toast (4 s) |
| `found` | Participant → Director | info | toast (5 s) |
| `sos` | Participant → Director | urgent | toast + haptic + sound (persistent) |

---

## 4. Direction resolution

`resolveSignalDirection(channel, actorType?, payload?)` uses a 3-tier priority to determine `incoming | outgoing | system` from the Director's perspective:

1. **`actorType`** on the event — `host` → outgoing, `participant` → incoming, `trigger`/`system` → system
2. **Payload sender fields** — `sender_user_id` → outgoing (host), `sender_participant_id` → incoming (participant)
3. **Catalog `origin`** hint — last resort; may mis-attribute trigger-generated signals

This avoids a trigger or system event being rendered as "You sent Pause" when the director didn't initiate it.

---

## 5. Delivery path

### 5a. Director sends signal

```
DirectorModePanel → POST /api/play/sessions/[id]/signals
  → INSERT into session_signals
  → broadcastPlayEvent('signal_received', payload)   // server-side broadcast
  → Participant useLiveSession picks up via Supabase realtime
  → ParticipantPlayView.handleSignalToast → overlay/toast
```

### 5b. Participant sends signal

```
ParticipantPlayView → POST /api/play/sessions/[id]/signals
  → INSERT into session_signals
  → broadcastPlayEvent('signal_received', payload)
  → Director useLiveSession picks up
  → FacilitatorDashboard.recentSignals / DirectorModePanel.SignalInbox
```

### 5c. Seq guard integration

The monotonic `db_seq` counter in `useLiveSession` skips stale events but makes exceptions for **must-deliver** types:
- `signal_received` — always passes (fire-and-forget, no poll fallback)
- `time_bank_changed` — always passes
- `state_change` — passes on forward progress

---

## 6. Dedupe (reconnect tolerance)

`useLiveSession` maintains an LRU set (`seenSignalIdsRef`, cap = 50) keyed on `payload.id`. On reconnect, the same `signal_received` may be replayed; the dedupe set drops it silently (with a `console.debug` in dev mode). When the set exceeds 50 entries, the oldest id is evicted.

**FacilitatorDashboard** has its own dedupe: `.filter((p) => p.id !== payload.id)` in `setRecentSignals`.

---

## 7. UI components

| Component | Role | Key behaviour |
|---|---|---|
| `SignalInbox` (DirectorModePanel) | Director inbox | Time-grouped (5 min / today / earlier), direction-aware colour + icons, mark-as-handled |
| `SignalStrip` (DirectorModePanel) | Quick-glance strip | Direction-aware colour (orange incoming, blue outgoing), truncated label |
| `SignalQuickPanel` (DirectorModePanel) | Director send panel | Preset buttons for each director-origin channel |
| `ParticipantPlayView` signal overlay | Participant receiver | `handleSignalToast` → 4 s overlay with channel icon |
| `FacilitatorDashboard.recentSignals` | Facilitator view | Latest 5 signals with dedupe |

### Colour scheme (Director perspective)

| Direction + Severity | Background | Icon colour |
|---|---|---|
| Incoming (info/warn) | orange-50 / orange-200 border | orange-500 |
| Incoming (urgent) | red-50 / red-200 border | red-500 |
| Outgoing | blue-50 / blue-200 border | blue-500 |
| Handled | muted/30, opacity-60 | muted-foreground |

---

## 8. i18n

All signal strings live under `play.directorDrawer.signalInbox.*`:

- `channels.*` — human-readable channel names (pause, hint, attention, …)
- `direction.*` — direction templates (`{channel} from {sender}`, `You sent {channel}`, …)
- `timeGroup.*` — section headers (Last 5 min, Today, Earlier)

Three locales: `sv.json`, `en.json`, `no.json`.

---

## 9. Hard rules

These invariants are **non-negotiable**. They prevent regression into legacy patterns.

### Rule 1 — UI must never render raw event type strings

No user-facing text may contain internal event names like `SIGNAL_SENT`, `signal_received`, or `time_bank_changed`. All labels flow through the signal catalog + i18n layer (`signalInbox.channels.*`, `signalInbox.direction.*`). Raw types are only acceptable in `console.debug` and dev-mode diagnostics.

### Rule 2 — Must-deliver events must never be killed by the seq guard

`signal_received` and `time_bank_changed` bypass the monotonic seq guard in `useLiveSession` unconditionally. They are instead deduplicated via the LRU set (`seenSignalIdsRef`, cap 50). This is because:

- There is **no 60 s poll fallback** for these event types.
- A dropped signal means the participant never sees the toast and the director never sees the inbox entry.
- A dropped time-bank update means the UI shows stale balance.

If a new must-deliver event type is added, it must be added to the `isMustDeliver` guard **and** given its own dedupe strategy.

### Rule 3 — Legacy/V2 row safety

The `session_events` table contains **both** legacy columns (`event_data`, `actor_user_id`, `actor_participant_id`) and V2 columns (`event_category`, `payload`, `actor_type`, `actor_id`, etc.).

> If V2 columns exist but `payload` is null/empty, `rowToEvent` **must** fall back to legacy `event_data` and infer `actorType` from `actor_user_id` / `actor_participant_id`.

This ensures old rows inserted before the V2 migration (or by legacy code paths) are deserialized correctly without requiring a data migration or cleanup.

**Write path rule:** All new inserts to `session_events` must use V2 columns (`event_category`, `payload`, `actor_type`, `actor_id`, `target_type`, `target_name`, `severity`). Never insert using only legacy columns going forward.

---

## 10. Future work

- ~~**Filter chips** (Incoming / Outgoing / Urgent) in SignalInbox~~ ✅ Implemented
- **Delivery scope** — target a specific team or participant instead of broadcast-all
- **Dual delivery** — pair realtime broadcast with Supabase DB trigger for guaranteed delivery
- **Custom channels** — let directors define session-specific signal types (both channel + presentation)
