# Profile docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the profile documentation cluster. The current source of truth for implemented profile/account behavior is the repo code together with accounts/auth docs; this cluster keeps historical profile cleanup analysis together.

## Purpose

Use this cluster for profile-specific cleanup history, audits, and implementation records so they no longer compete with governance docs in root `docs/`.

## Read order

1. [archive/PROFILE_AUDIT_2026-03-05.md](archive/PROFILE_AUDIT_2026-03-05.md)
2. [archive/PROFILE_IMPLEMENTATION_PLAN.md](archive/PROFILE_IMPLEMENTATION_PLAN.md)
3. [archive/USER_PROFILE_CURRENT_STATE_ANALYSIS.md](archive/USER_PROFILE_CURRENT_STATE_ANALYSIS.md)

## Current implementation routing

- Use [../ACCOUNTS_DOMAIN.md](../ACCOUNTS_DOMAIN.md) for the broader accounts domain.
- Use [../auth/README.md](../auth/README.md) for auth, MFA, and tenant-access behavior.
- Verify current profile/account behavior against `app/app/profile/**`, `features/profile/**`, and `/api/accounts/**` before treating historical profile docs as current truth.

## Historical docs

- [archive/PROFILE_AUDIT_2026-03-05.md](archive/PROFILE_AUDIT_2026-03-05.md) — frozen audit snapshot for the `/app/profile` cleanup initiative
- [archive/PROFILE_IMPLEMENTATION_PLAN.md](archive/PROFILE_IMPLEMENTATION_PLAN.md) — historical implementation plan and execution log
- [archive/USER_PROFILE_CURRENT_STATE_ANALYSIS.md](archive/USER_PROFILE_CURRENT_STATE_ANALYSIS.md) — earlier profile-system current-state analysis and gap assessment

## Placement rule

- Keep future active profile domain docs in `docs/profile/` if they become needed.
- Keep cleanup snapshots, audits, and one-off analyses in `docs/profile/archive/`.
- Do not add profile cleanup snapshots back to root `docs/`.