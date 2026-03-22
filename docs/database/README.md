# Database Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-22
- Last validated: 2026-03-21

> Entry point for database environment, migration-history, and RLS-audit documentation. Use this folder to separate current operational rules from dated audit snapshots.

## Purpose

This folder contains the canonical database environment rules plus a small set of bounded migration-history and security-audit documents.

Use it to answer:

- which database each environment points to
- how migrations are sequenced and normalized
- which RLS audit findings are historical versus still relevant

## Read order

1. `DATA_MODEL_DOMAIN.md`
2. `DATABASE_SECURITY_DOMAIN.md`
3. `environments.md`
4. `../MIGRATIONS.md`
5. `../ops/prod-migration-workflow.md`
6. `migration-history.md` when you need the normalization timeline
7. `DATABASE_SECURITY_AUDIT.md` and `rls-audit-2025-03-17.md` only for dated security audit snapshots

## Status map

### Active

- `DATA_MODEL_DOMAIN.md` — canonical schema-governance reference for migrations, typegen, and RLS conventions
- `DATABASE_SECURITY_DOMAIN.md` — canonical database security reference for RLS, SECURITY DEFINER hardening, and verification queries
- `PERFORMANCE_ADVISOR_PROMPT.md` — active Supabase Performance Advisor query set for follow-up performance analysis
- `TYPE_MANAGEMENT.md` — draft operational guide for when and how Supabase-generated TypeScript types must be regenerated and validated
- `environments.md` — canonical environment and database-target rules
- `migration-history.md` — active normalization log for the current baseline/migration-history state

### Frozen audits

- `DATABASE_SECURITY_AUDIT.md` — frozen audit snapshot of the resolved Supabase security/performance remediation cycle
- `rls-audit-2025-03-17.md` — dated RLS security audit snapshot for the 2026-03-17 fix batch
- `environment-database-audit.md` — broader frozen audit snapshot spanning local, sandbox, and production environment state

## Working rule

If a database file in this folder conflicts with the current migration workflow or deploy guardrails, prefer `environments.md`, `../MIGRATIONS.md`, and `../ops/prod-migration-workflow.md`.