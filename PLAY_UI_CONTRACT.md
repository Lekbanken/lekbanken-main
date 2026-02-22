# Play UI Contract

Canonical constraints for Director and Participant play surfaces.

Violations must either:
- update this contract (with team agreement), **or**
- update the guardrail tests accordingly.

This file defines layout ownership boundaries. It is not descriptive documentation.

> Enforced by tests **39j – 39p** in `tests/play/interaction-lock.test.ts`.
> Adding a new guardrail requires updating this document.

---

## 1. Surface & Border Ownership

| # | Constraint | Guardrail |
|---|-----------|-----------|
| 1 | **PlaySurface is the only desktop border owner.** Only `PlaySurface` may apply `lg:border`, `lg:rounded-2xl`, or `lg:bg-background` within `features/play/`. | 39k |
| 2 | **PlayHeader must never define an outer boundary.** It may use `border-b` (separator) but must never use `lg:border`. | 39j |
| 3 | Both Director and Participant shells must render `<PlaySurface className="lg:shadow-xl">`. | 39k |
| 4 | **Separator policy:** Inside `PlaySurface`, stacking separators must use `border-b` only. No `border`, `lg:border`, `divide-y`, or mixed boundary patterns in Header/TopArea sections. | 39q |

---

## 2. Drawer Chrome & Titles

| # | Constraint | Guardrail |
|---|-----------|-----------|
| 5 | **DrawerOverlay owns drawer chrome.** Title row and close button must be rendered by `DrawerOverlay`. Drawer children render content only (may include refresh buttons). | 39l, 39o |
| 6 | **Pill label === drawer title.** The `DrawerOverlay.title` must reuse the same i18n key/label as the activating pill. Separate "drawer-only" title keys are forbidden. No runtime string composition (e.g. `My ${label}`) — must be a direct `t('header.*')` result. | 39l, 39n |

---

## 3. Layout Parity

| # | Constraint | Guardrail |
|---|-----------|-----------|
| 7 | Stage padding must be `p-5` in both Director and Participant stage containers. | 39p |
| 8 | `NowSummaryRow` must render inside `PlayTopArea` (DOM location). It must not be rendered directly inside stage scroll containers. | structural |

---

## 4. Feature Flags & Runtime Contracts

| # | Constraint | Guardrail |
|---|-----------|-----------|
| 9 | Feature flag names must describe **product behavior** (e.g. `realtimeSessionEvents`) — not technical implementation (e.g. `eventLogging`). | 39m (naming) |
| 10 | `FEATURE_REALTIME_SESSION_EVENTS` gates Director's realtime session event subscription. Production must explicitly set it (`= 'true'`). Development defaults to enabled. | config |

---

## 5. Parity Invariants

| # | Constraint |
|---|-----------|
| 11 | Director and Participant must share the same core chrome components: `PlaySurface`, `PlayTopArea`, `PlayHeader`, `DrawerOverlay`. Divergence requires an explicit ADR. |
| 12 | No per-view reimplementation of borders, shadow, or surface structure is allowed. Composition only — no duplication. |

---

## How to extend

1. Add the rule to this file with a clear "Guardrail" reference.
2. Add a matching `it(...)` in `tests/play/interaction-lock.test.ts` under "SSoT Guardrails".
3. Run `npx vitest run tests/play/interaction-lock.test.ts` to verify.

---

## Scope

- Applies to code under `features/play/` and shared chrome in `features/play/components/shared/`.
- Legacy host paths outside `features/play/` may violate until migration completes.
- External systems (Vercel env vars, CI secrets) must be updated manually when flag names change.
