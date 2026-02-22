# Play UI Contract

Canonical rules for Director and Participant play surfaces.
Guardrail tests enforce these in `tests/play/interaction-lock.test.ts`.

| # | Rule | Enforced |
|---|------|----------|
| 1 | **PlaySurface** owns `lg:border`, `lg:rounded-2xl`, `lg:bg-background`. No other element in play may duplicate these. | 39k |
| 2 | **PlayHeader** may use `border-b` (separator) but never `lg:border` (outer boundary). | 39j |
| 3 | Both Director and Participant shells wrap content in `<PlaySurface>` with `lg:shadow-xl`. | 39k |
| 4 | **DrawerOverlay** must always receive a `title` prop. Title must match the pill label that opens the drawer (pill === drawer-title). | 39l |
| 5 | Stage padding is `p-5` in both Director and Participant. | visual parity |
| 6 | **NowSummaryRow** lives inside PlayTopArea — never floated outside the surface. | structural |
| 7 | Feature flag `realtimeSessionEvents` gates the realtime subscription Director relies on for signals. Must be explicitly enabled in prod. | config |
