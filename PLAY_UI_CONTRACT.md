# Play UI Contract

Canonical rules for Director and Participant play surfaces.
Violating these **will** break guardrail tests in `tests/play/interaction-lock.test.ts`.

> **How to read this:** each rule is a constraint, not a description.
> If your change contradicts a rule, either update the rule (with team agreement) or change your code.

---

## Surface & Border

| # | Constraint | Test |
|---|-----------|------|
| 1 | **Single border owner = PlaySurface.** It owns `lg:border`, `lg:rounded-2xl`, `lg:bg-background`. No other element in `features/play/` may duplicate these classes. | 39k |
| 2 | **PlayHeader never has `lg:border`.** It may use `border-b` (separator) — never `lg:border` (outer boundary). | 39j |
| 3 | Both Director and Participant shells wrap content in `<PlaySurface className="lg:shadow-xl">`. | 39k |
| 4 | **Separator policy = `border-b` only.** Horizontal dividers inside the surface use `border-b`, never `border` or `lg:border`. | by convention |

## Drawers

| # | Constraint | Test |
|---|-----------|------|
| 5 | **DrawerOverlay provides title + close.** Every `<DrawerOverlay>` must receive a `title` prop. Children must not render their own title or close button. | 39l |
| 6 | **pill === drawer-title.** The drawer `title` must use the same i18n key as the pill/button that opens it (e.g. `header.artifacts`, not `artifactsDrawer.title`). | 39l |

## Layout

| # | Constraint | Test |
|---|-----------|------|
| 7 | Stage padding is `p-5` in both Director and Participant. | visual parity |
| 8 | **NowSummaryRow** lives inside `PlayTopArea` — never floated outside the surface. | structural |

## Feature Flags

| # | Constraint | Notes |
|---|-----------|-------|
| 9 | Flag names must reflect **product behavior**, not implementation detail (e.g. `realtimeSessionEvents`, not `eventLogging`). | naming |
| 10 | `FEATURE_REALTIME_SESSION_EVENTS` gates the realtime subscription Director relies on for signals. Must be explicitly set in prod (`= 'true'`). Always on in dev. | config |
