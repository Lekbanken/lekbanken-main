# API Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the internal API surface and integration conventions. Use this folder when you need the current route-handler model, BFF boundaries, and auth/RLS API rules.

## Purpose

This folder contains the canonical API surface reference for Lekbanken's internal endpoints and integration routes.

Use it to answer:

- how `app/api/**` routes are structured
- which auth and tenant-scoping conventions apply
- where BFF composition should live versus domain-owned writes

## Read order

1. `API_INTEGRATION_DOMAIN.md`
2. `../ops/OPERATIONS_DOMAIN.md` when you need runtime or monitoring context
3. `../database/DATABASE_SECURITY_DOMAIN.md` when you need RLS/security guardrails behind the API conventions

## Status map

### Active

- `API_INTEGRATION_DOMAIN.md` — canonical internal API and integration reference for route handlers, auth patterns, tenancy, caching, and BFF boundaries

### Frozen audits

- `consumer-data-contract-audit.md` — frozen audit of browse and planner consumer contracts against their API mappers

## Working rule

If an API design question conflicts with current auth/RLS or operational guardrails, prefer `../database/DATABASE_SECURITY_DOMAIN.md`, `../ops/OPERATIONS_DOMAIN.md`, and current code in `app/api/**`.