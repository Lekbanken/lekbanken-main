# CI/CD Pipeline & Rollback

Status: proposed  
Owner: Ops/Platform  
Last Updated: 2025-12-11

## Pipeline (GitHub Actions)
- **Steps (target):** checkout → install deps → lint/type-check → tests (unit/smoke) → build → deploy (Vercel) with env vars/secrets.
- **Environments:** local → staging → production. Use separate Supabase projects/DBs and env var sets per env.
- **Secrets/Vars:** managed via GitHub Actions secrets/vars; never committed. Needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, feature flags, Vercel token, etc.
- **Artifacts:** build output cached; no artifacts published currently. Link actual workflow file here (e.g., `.github/workflows/deploy.yml`) when confirmed.

## Rollback Playbook
1) Identify bad deploy (timestamp/commit).
2) Roll back on Vercel to last good deployment (use Vercel UI or `vercel rollback <deployment>`).
3) If DB migrations were applied, assess: if destructive, restore from backup; if additive, keep but feature-flag off the change.
4) Re-enable progressively with feature flags if available.

## Promotion Flow
- Staging deploy from main branch; smoke tests run.
- Manual promotion to production after sign-off.
- Feature flags for risky changes.
- Add Slack notification on deploy success/failure (pending channel).

## Testing Expectations
- At minimum: `npm run type-check`, targeted smoke for auth/accounts, participants join/rejoin, billing webhook handler.
- Load/perf: see `tests/load/README.md` for optional pre-release smoke.

## Open Items
- Document existing GitHub Actions files and add links.
- Add automated rollback shortcut (e.g., workflow dispatch with commit hash).
- Add Slack notification on deploy success/failure.
