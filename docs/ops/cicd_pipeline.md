# CI/CD Pipeline & Rollback

Status: active  
Owner: Ops/Platform  
Last validated: 2025-12-17

## Related code (source of truth)

- Workflow: `.github/workflows/typecheck.yml`
- Scripts: `scripts/find-any-casts.ps1` (local helper)
- Build/scripts: `package.json` scripts (`type-check`, `build`, `db:check-any`)

## Pipeline (GitHub Actions)

### Current state (as implemented)
- The repo currently uses multiple GitHub Actions workflows:
	- `.github/workflows/validate.yml` — PR gate for lint, typecheck, workflow validation, i18n validation, vitest, integration tests, `as any` guard, and build.
	- `.github/workflows/typecheck.yml` — post-merge `tsc` + build safety net on `push` to `main` / `develop`.
	- `.github/workflows/unit-tests.yml` — post-merge Vitest safety net on `push` to `main` / `develop`.
	- `.github/workflows/i18n-audit.yml` — i18n regression guard on relevant `push` / `pull_request` changes, plus manual dispatch.
	- `.github/workflows/rls-tests.yml` — migration-scoped RLS policy harness on relevant `push` / `pull_request` changes, plus manual dispatch.
	- `.github/workflows/baseline-check.yml` — baseline fresh-install and schema/type sync verification on relevant migration changes for `push` / `pull_request`, plus manual dispatch.
- `validate.yml` is the primary pre-merge gate.
- The post-merge workflows exist as safety nets for merge ordering, force-merges, and migration drift.
- The baseline and RLS workflows are intentionally path-scoped to database-affecting changes, but can also be run manually.

### Validate workflow
- `.github/workflows/validate.yml`
- Runs on `pull_request` to `main` and `develop`.
- Steps: `npm ci` → ESLint → `npm run type-check` → `npm run check:workflows` → `npm run validate:i18n` → Vitest → integration tests → `as any` diff guard → `npm run build` with `SKIP_ENV_VALIDATION=true`.

### Post-merge safety nets
- `.github/workflows/typecheck.yml`
	- Runs on `push` to `main` / `develop`.
	- Runs `npm ci`, `npm run type-check`, and `npm run build`.
- `.github/workflows/unit-tests.yml`
	- Runs on `push` to `main` / `develop`.
	- Runs `npm ci` and `npx vitest run --reporter=verbose`.

### Database-scoped checks
- `.github/workflows/rls-tests.yml`
	- Runs on `push` / `pull_request` when migrations, RLS test files, or the workflow itself changes.
	- Starts local Supabase, runs the automated demo-policy RLS SQL harness, uploads logs, and performs lightweight marker/documentation checks.
- `.github/workflows/baseline-check.yml`
	- Runs on `push` / `pull_request` when migrations, schema config, generated types, or the workflow itself changes.
	- Verifies fresh install, generated type sync, and minimum schema counts.

### Localization checks
- `.github/workflows/i18n-audit.yml`
	- Runs on `push` / `pull_request` for message and app code changes, plus manual dispatch.
	- Runs `node scripts/i18n-audit.mjs --ci`, writes a summary, and uploads audit artifacts.
- Build runs with `SKIP_ENV_VALIDATION=true` (so CI can build without production secrets).

Notes:
- The `as any` check in CI is implemented inline in `validate.yml` (it does not call `scripts/find-any-casts.ps1`).
- `scripts/find-any-casts.ps1` is used locally via `npm run db:check-any`.

### Deploys
- This repo does **not** define a deploy workflow.
- Hosting/provider deploys are configured outside this repo and must be verified in the hosting platform.
- Environment variables/secrets should be managed in the hosting platform / secret manager (not committed to git).

## Validation checklist
- `.github/workflows/typecheck.yml` exists and matches this description.
- `npm run type-check` and `npm run build` match `package.json`.
- CI build uses `SKIP_ENV_VALIDATION=true`.
- If a deploy workflow is introduced later, link it here and document required secrets.

## Rollback Playbook
1) Identify bad deploy (timestamp/commit).
2) Roll back in your hosting platform to last known-good deployment (method depends on provider).
3) If DB migrations were applied, assess: if destructive, restore from backup; if additive, keep but feature-flag off the change.
4) Re-enable progressively with feature flags if available.

## Promotion Flow
- This section is **proposed** and depends on how you run environments.
- Typical pattern: deploy to staging, run smoke, then promote to production.
- Prefer feature flags for risky changes.

## Testing Expectations
- At minimum: `npm run type-check`, targeted smoke for auth/accounts, participants join/rejoin, billing webhook handler.
- Load/perf: see `tests/load/README.md` for optional pre-release smoke.

## Open Items
- Document existing GitHub Actions files and add links (now: `.github/workflows/typecheck.yml`).
- Add automated rollback shortcut (e.g., workflow dispatch with commit hash).
- If you want deploy notifications, document the channel/tooling after it exists.
