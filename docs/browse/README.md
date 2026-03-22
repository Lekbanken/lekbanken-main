# Browse docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the browse documentation cluster. Use this folder for the app-side discovery surface that sits on top of Games domain content.

## Purpose

This cluster covers game and activity discovery: browse UI, search, filters, featured lists, related recommendations, and the entitlement-aware read APIs behind those surfaces.

## Read order

1. [BROWSE_DOMAIN.md](BROWSE_DOMAIN.md)
2. [../GAMES_DOMAIN.md](../GAMES_DOMAIN.md) for the content model that browse reads from
3. [../database/DATA_MODEL_DOMAIN.md](../database/DATA_MODEL_DOMAIN.md) when validating table ownership or schema boundaries

## Active docs

- [BROWSE_DOMAIN.md](BROWSE_DOMAIN.md) — current browse/discovery domain reference

## Related docs

- [../GAMES_DOMAIN.md](../GAMES_DOMAIN.md) — canonical game/content domain reference
- [../billing/BILLING_LICENSING_DOMAIN.md](../billing/BILLING_LICENSING_DOMAIN.md) — entitlement mapping that affects allowed products in browse

## Placement rule

- Keep active browse and discovery docs in `docs/browse/`.
- Keep future browse audits, specs, and roadmap snapshots in this cluster rather than in root `docs/`.
- Do not add browse domain docs back to root `docs/`.