# Marketing docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the marketing/public-site documentation cluster. Use this folder for the public-first web surface that routes users into the app.

## Purpose

This cluster covers the marketing site, public entry routes, landing-page composition, public auth entrypoints, and route-level redirect behavior for public-first flows.

## Read order

1. [MARKETING_DOMAIN.md](MARKETING_DOMAIN.md)
2. [../billing/BILLING_LICENSING_DOMAIN.md](../billing/BILLING_LICENSING_DOMAIN.md) when pricing/product claims need validation
3. [../ops/OPERATIONS_DOMAIN.md](../ops/OPERATIONS_DOMAIN.md) when deploy/runtime concerns affect public routes

## Active docs

- [MARKETING_DOMAIN.md](MARKETING_DOMAIN.md) — current public-site and marketing-surface domain reference

## Related docs

- [../billing/BILLING_LICENSING_DOMAIN.md](../billing/BILLING_LICENSING_DOMAIN.md) — product/pricing rules shown on public pages
- [../auth/README.md](../auth/README.md) — auth flows used by public entrypoints

## Placement rule

- Keep active marketing/public-site docs in `docs/marketing/`.
- Keep future landing-page audits, funnel notes, and marketing-route specs in this cluster rather than in root `docs/`.
- Do not add marketing domain docs back to root `docs/`.