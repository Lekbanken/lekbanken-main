# Legendary Escape Room Toolkit – MVP Roadmap

> Single source of truth for the modular, trigger-first Escape Room Toolkit.

---

## Vision

A **trigger-first, host-agnostic** system where:

* Every interaction is an **event → condition → action** chain.
* Game designers build in the **Admin Builder** (visual, CSV, JSON).
* Hosts run sessions via **Lobby/Director** (observe, intervene, override).
* Participants join via **Play** (mobile-first, offline-capable).
* All data flows through typed contracts with **RLS + Realtime**.

---

## MVP Structure

| MVP | Focus | Goal |
|-----|-------|------|
| **MVP1** | Core loop running | Host can run a session with live participants, triggers fire, basic signals/time-bank work. |
| **MVP2** | Authoring & onboarding | Admin builder is usable, import/export CSV, trigger wizard, template library. |
| **MVP3** | Polish & scale | Observability, analytics, multi-tenant, feature flags mature, docs. |

---

## MVP1 – Core Loop (Status: ✅ Complete / In Pilot)

| # | Module | Description | Status |
|---|--------|-------------|--------|
| 1.1 | Participant Sessions runtime | `participant_sessions` + `session_runtime_state` | ✅ Done |
| 1.2 | Triggers DB | `game_triggers` definitions + `session_triggers` runtime copies | ✅ Done |
| 1.3 | Trigger Engine | Client-side evaluation with injected IO (actionContext) | ✅ Done |
| 1.4 | Signals primitive | DB + API + realtime broadcast + 1-tap participant UI | ✅ Done |
| 1.5 | Time Bank primitive | DB + atomic RPC + ledger + API + lobby controls + participant display | ✅ Done |
| 1.6 | Lobby/Director UX | Tabs for Signals + Time Bank + Roles + Participants + Settings | ✅ Done |
| 1.7 | Play UX (participant) | Steps, timer, role card, artifacts, decisions, signals, offline queue | ✅ Done |
| 1.8 | Host Play Mode | FacilitatorDashboard with TriggerEngine wired | ✅ Done |
| 1.9 | Observability baseline | Signals + time bank write `session_events` | ✅ Done |
| 1.10 | RLS hardening | `auth.role() = 'authenticated'` guard on play tables | ✅ Done |
| 1.11 | Feature flag gates | `FEATURE_SIGNALS`, `FEATURE_TIME_BANK` (default on in dev) | ✅ Done |

---

## MVP2 – Authoring & Onboarding

| # | Module | Description | Status |
|---|--------|-------------|--------|
| 2.1 | TriggerEditor visual builder | Condition/action dropdowns, param editors | ✅ Done |
| 2.2 | TriggerWizard (guided) | Step-by-step wizard for common templates | ✅ Done |
| 2.3 | CSV import/export triggers | Round-trip triggers via CSV | ✅ Done |
| 2.4 | Template Library | Pre-built trigger packs (escape room, party game, timer-based) | ✅ Done |
| 2.5 | Game preview/simulation | Dry-run mode to test triggers without participants | ✅ Done |
| 2.6 | Versioned game snapshots | Immutable snapshots for sessions | ✅ Done |
| 2.7 | Artifact builder | Visual editor for creating artifacts + keypad/reveal variants | ✅ Done |
| 2.8 | Decision builder | Create polls/votes in admin | ✅ Done |

---

## MVP3 – Polish & Scale

| # | Module | Description | Status |
|---|--------|-------------|--------|
| 3.1 | Analytics dashboard | Session stats, trigger fire rates, time bank usage | ✅ Done |
| 3.2 | Replay system | Stream session_events for post-session review | ✅ Done |
| 3.3 | Multi-tenant isolation | Per-tenant feature flags + quotas | ✅ Done |
| 3.4 | Public API (read-only) | Webhooks / external integrations | ✅ Done |
| 3.5 | Accessibility audit | WCAG 2.1 AA for play UI | ✅ Done |
| 3.6 | E2E test suite | Playwright flows for create → run → end session | ✅ Done |
| 3.7 | Documentation site | Guides for hosts + developers | ✅ Done |

---

## Key Contracts & Types

| File | Purpose |
|------|---------|
| `types/trigger.ts` | Trigger condition/action unions + helpers |
| `types/play-runtime.ts` | Session state, broadcast events |
| `types/csv-import.ts` | CSV import shapes |
| `features/play/hooks/useTriggerEngine.ts` | Client-side trigger evaluator |
| `features/play/api/signals-api.ts` | Signal HTTP helpers |
| `features/play/api/time-bank-api.ts` | Time bank HTTP helpers |
| `app/api/play/sessions/[id]/signals/route.ts` | Signals API |
| `app/api/play/sessions/[id]/time-bank/route.ts` | Time Bank API |

---

## DB Migrations (executed)

| File | Description |
|------|-------------|
| `20251216160000_play_runtime_schema.sql` | session_events, session_roles |
| `20251227120000_signal_time_bank.sql` | session_signals, session_time_bank, ledger, RPC |
| `20251227120500_fix_session_triggers_participant_sessions.sql` | FK/RLS fix for triggers |
| `20251227130000_rls_auth_role_guard.sql` | `auth.role()` guard on play tables |

---

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `FEATURE_SIGNALS` | `true` (dev) | Enable signals UI + API |
| `FEATURE_TIME_BANK` | `true` (dev) | Enable time bank UI + API |

Set to `true` in production when ready to pilot.

---

## Next Actions

1. **Internal pilot** – Run 2-3 real escape room sessions internally to validate triggers + signals + time bank flow.
2. **Iterate on TriggerWizard** – Make it easier for non-devs to add triggers.
3. **CSV round-trip** – Export → modify in spreadsheet → import.
4. **Analytics MVP** – Dashboard showing trigger fire counts, time bank usage.
5. **Docs** – Write host guide + developer guide.

---

*Last updated: 2024-12-27*
