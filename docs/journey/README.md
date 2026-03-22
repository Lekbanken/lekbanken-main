# Journey Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the journey documentation cluster. This folder combines the active journey domain doc with the journey-activation triplet that governs the gamification/Journey toggle experience.

## Purpose

Use this cluster for the user-facing journey/dashboard domain and the journey-activation workstream that controls when Journey UI is enabled versus when the standard gamification UI is shown.

## Read order

1. `JOURNEY_DOMAIN.md`
2. `journey-activation-architecture.md`
3. `journey-activation-audit.md`
4. `journey-activation-implementation-plan.md`
5. `../gamification/GAMIFICATION_DOMAIN.md` when you need the source-of-truth for underlying gamification data models

## Status map

### Active

- `JOURNEY_DOMAIN.md` — canonical journey-domain reference for read models, dashboard composition, and ownership boundaries

### Active triplet

- `journey-activation-architecture.md` — stable system design for the journey activation flow
- `journey-activation-audit.md` — current audited reality for journey activation across gamification/profile surfaces
- `journey-activation-implementation-plan.md` — implementation status and remaining follow-up items for the activation workstream

## Working rule

- Treat `JOURNEY_DOMAIN.md` as the broad domain boundary.
- Treat the `journey-activation-*` triplet as the active canonical workstream for Journey activation behavior and UI gating.