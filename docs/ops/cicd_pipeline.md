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
- The repo currently has a single CI workflow: `.github/workflows/typecheck.yml`.
- It runs on push/PR to `main` and `develop`.
- Steps: `npm ci` → `npm run type-check` → fail if `as any` is found under `app/` or `lib/` (excluding `types/supabase.ts`) → `npm run build`.
- Build runs with `SKIP_ENV_VALIDATION=true` (so CI can build without production secrets).

Notes:
- The `as any` check in CI is implemented inline in the workflow (it does not call `scripts/find-any-casts.ps1`).
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
