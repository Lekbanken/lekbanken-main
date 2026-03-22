# Tenant Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the tenant documentation cluster. This folder combines the active tenant domain reference with the draft roadmap and cross-domain learnings that still belong to the tenant surface.

## Purpose

Use this cluster to understand multi-tenancy, memberships, invitations, tenant-level settings/branding, and the remaining tenant-specific gaps that other domains rely on.

## Read order

1. `TENANT_DOMAIN.md`
2. `DOMAIN_TENANT_TODO.md`
3. `DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md`
4. `../auth/README.md` when the question overlaps with auth, roles, or tenant resolution behavior

## Status map

### Active references

- `TENANT_DOMAIN.md` — canonical tenant-domain reference for multi-tenancy, memberships, invitations, and tenant-level configuration

### Draft working material

- `DOMAIN_TENANT_TODO.md` — tenant backlog and roadmap items that must stay synchronized with schema and API changes
- `DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md` — cross-domain lessons from the tenant implementation and security model

## Working rule

- Treat `TENANT_DOMAIN.md` as the canonical tenant boundary.
- Treat the roadmap and learnings docs as secondary guidance that may lag implementation and should be validated against code and the canonical domain doc.