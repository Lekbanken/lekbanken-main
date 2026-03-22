# Release Promotion Checklist

## Metadata

- Owner: Ops/Platform
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active day-to-day checklist for promoting changes from local to preview to production under the repo's guarded release rules.

## Purpose

This is the short operational checklist for moving a change from local development to preview and then safely to production.

Use this document as the day-to-day promotion flow.

For deeper procedures, see:

- `docs/ops/prod-migration-workflow.md`
- `docs/ops/first-deploy-runbook.md`
- `docs/ops/cicd_pipeline.md`
- `docs/database/environments.md`

## Core rules

- Local first
- Preview before production
- Repo before Notion
- Production DB changes only through guarded workflows
- `.env.local` must stay local-first

## Standard promotion flow

1. Make the change on a short-lived branch.
2. Verify locally.
3. Push and open a PR.
4. Verify GitHub checks.
5. Verify the Vercel preview.
6. Merge to `main` only when preview is good.
7. If a production DB migration is required, follow the guarded migration flow.
8. Verify production after deploy.

## Local pre-flight

Before pushing:

```bash
git status
npm run verify:quick
```

For larger changes:

```bash
node scripts/verify.mjs
```

If the change includes a migration:

```bash
supabase migration new my_change
npm run db:reset
```

Rules:

- test migrations locally first
- commit migration and generated types together when types change
- do not use bare `supabase db push`

## Pull request gate

Before merge, confirm:

- PR scope is still correct
- CI passes
- preview deploy succeeds
- affected flows work in preview

Minimum preview checks:

- app loads
- auth path still works if touched
- affected page or API flow works
- no env mismatch is visible

## Production migration gate

Only apply a production migration when all of these are true:

- migration tested locally
- migration tested in sandbox or equivalent safe environment
- deploy order is understood
- rollback path is known
- you are using the guarded script

Use:

```bash
npm run db:push:dry
npm run db:push
```

Never write production guidance that assumes direct `supabase db push` from memory.

## Production deploy gate

Before production deploy, confirm:

- `main` contains the intended commit
- Vercel production env vars are correct
- production points at production Supabase, not sandbox
- health and readiness expectations are known

After deploy, verify:

- app reachable
- `/api/health` returns OK
- affected feature works
- no obvious spike in logs or errors

## Safe env rule

Never pull Vercel env into `.env.local`.

Use a separate file:

```bash
vercel env pull .env.vercel.preview --environment=development
```

## Definition of done

A promotion is done when:

- repo changes are merged intentionally
- preview was checked before production
- DB changes followed the guarded path when relevant
- production is verified after deploy
- the workflow did not depend on hidden local state