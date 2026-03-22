# Platform Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the platform documentation cluster. This folder groups the active platform domain reference with its validation report so platform infrastructure guidance routes through one place.

## Purpose

Use this cluster for deployment, runtime environment, platform security, observability, and the validation history for foundational infrastructure that spans all product domains.

## Read order

1. `PLATFORM_DOMAIN.md`
2. `PLATFORM_DOMAIN_VALIDATION_REPORT.md`
3. `../ops/README.md` for operational runbooks that depend on the platform baseline
4. `../database/README.md` for deeper database environment and migration details

## Status map

### Active references

- `PLATFORM_DOMAIN.md` — canonical platform-domain reference for runtime, deployment, environment, security, and observability infrastructure

### Validation history

- `PLATFORM_DOMAIN_VALIDATION_REPORT.md` — draft validation report that records platform capability checks and remaining gaps

## Working rule

- Treat `PLATFORM_DOMAIN.md` as the canonical platform boundary.
- Treat `PLATFORM_DOMAIN_VALIDATION_REPORT.md` as a point-in-time validation artifact that must be checked against current code before driving implementation.