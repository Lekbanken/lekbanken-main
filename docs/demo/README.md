# Demo docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the demo documentation cluster. Active demo guidance lives at this level; historical demo planning and prompt material lives under `archive/`.

## Purpose

Use this cluster to keep demo-related material together so active technical guidance and historical implementation records are not mixed into the root `docs/` surface.

## Read order

1. [demo_technical_spec.md](demo_technical_spec.md)
2. [DEMO_SALES_GUIDE.md](DEMO_SALES_GUIDE.md) when the task is sales-assisted demo usage or premium demo sharing
3. [archive/demo_current_state.md](archive/demo_current_state.md) only when earlier implementation context is required
4. [archive/demo_decisions_needed.md](archive/demo_decisions_needed.md) and [archive/demo_implementation_plan.md](archive/demo_implementation_plan.md) only for historical context

## Active docs

- [demo_technical_spec.md](demo_technical_spec.md) — draft technical specification for the demo architecture
- [DEMO_SALES_GUIDE.md](DEMO_SALES_GUIDE.md) — draft internal sales guide for demo mode and premium demo sharing

## Historical docs

- [archive/demo_current_state.md](archive/demo_current_state.md) — historical current-state assessment
- [archive/demo_decisions_needed.md](archive/demo_decisions_needed.md) — historical decision log
- [archive/demo_implementation_plan.md](archive/demo_implementation_plan.md) — historical implementation plan
- [archive/MASTERPROMPT_DEMO_IMPLEMENTATION.md](archive/MASTERPROMPT_DEMO_IMPLEMENTATION.md) — historical implementation prompt snapshot
- [archive/VERIFICATION_PROMPT.md](archive/VERIFICATION_PROMPT.md) — historical verification prompt snapshot

## Placement rule

- Keep active demo docs in `docs/demo/`.
- Keep historical demo docs and one-shot prompt artifacts in `docs/demo/archive/`.
- Do not add new demo docs back to root `docs/`.