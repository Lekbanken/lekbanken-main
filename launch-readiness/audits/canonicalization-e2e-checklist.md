# Canonicalization E2E Checklist

## Metadata

- Owner: -
- Status: draft
- Date: 2026-03-19
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Draft verification checklist for the canonicalization round completed on 2026-03-19. Do not assume the flows below were executed or passed until a dated execution log exists.

> **Date:** 2026-03-19
> **Last updated:** 2026-03-21
> **Last validated:** 2026-03-21
> **Status:** draft
> **Purpose:** Manual browser and network-tab verification for the canonicalization round completed on 2026-03-19.
> **Scope:** Auth, MFA, tenant context, profile write path, avatar propagation, notifications, planner publish semantics, and admin access.
> **Execution status:** ⬜ Not executed
> **Execution log:** Record results in [canonicalization-e2e-test-log-template.md](canonicalization-e2e-test-log-template.md)
> **Note:** Draft verification checklist. Do not assume the flows below were executed or passed until a dated execution log exists.

## 1. Preconditions

- Use a non-production-safe verification account with MFA enabled and membership in at least one tenant.
- Have one system admin account and one non-admin tenant admin account available.
- Open browser devtools Network tab before each flow.
- Record pass/fail, timestamp, and any response codes that differ from expected values.

## 2. Auth And MFA

| # | Flow | Steps | Expected |
|---|------|-------|----------|
| A1 | Login baseline | Log in from `lekbanken.no`, complete redirect to `/app` | No blank shell, no guest fallback, authenticated app shell loads directly |
| A2 | Reload after login | Reload `/app` immediately after successful login | User remains authenticated, tenant and profile state stay consistent |
| A3 | MFA verify | Log in with MFA challenge and complete verification | `POST /api/accounts/auth/mfa/verify` succeeds, login completes, no tenant drift |
| A4 | Trusted device | Trust current device during MFA verify | Trust succeeds only when active tenant cookie exists; no cross-tenant trust behavior |
| A5 | Tenant switch after login | Switch active tenant, reload page, navigate to another app route | Active tenant remains stable across navigation and reload |

## 3. Profile And Avatar

| # | Flow | Steps | Expected |
|---|------|-------|----------|
| P1 | Update profile basics | Change full name on profile settings page and save | One successful write path, updated name visible after reload |
| P2 | Update avatar | Upload or set avatar from profile settings | Avatar appears in app shell/profile without requiring extra refresh |
| P3 | Avatar persistence | Reload `/app`, `/app/profile`, and one admin page showing the user | Same avatar appears everywhere covered by auth/profile flows |
| P4 | Whoami consistency | Inspect `GET /api/accounts/whoami` after avatar change | Returned `user.avatar_url` matches canonical avatar shown in UI |
| P5 | No double write symptom | Save profile once and inspect network requests | Single canonical profile write flow, no duplicate user-facing PATCH sequence |

## 4. Notifications

| # | Flow | Steps | Expected |
|---|------|-------|----------|
| N1 | Post-login notifications | Log in and land in app shell | Notification badge/dropdown reflect authenticated state without manual refresh |
| N2 | Notification page consistency | Open notification dropdown and dedicated notifications page | Counts and listed items stay in sync |
| N3 | Reload consistency | Reload after opening notifications | Badge, dropdown, and page still agree |

## 5. Planner Publish Semantics

| # | Flow | Steps | Expected |
|---|------|-------|----------|
| PL1 | Publish through intended flow | Publish a draft or modified plan via publish UI/wizard | Publish succeeds and creates the expected published state |
| PL2 | Version evidence | Inspect list/detail/version-related UI after publish | Published status and versioned snapshot views agree |
| PL3 | Reload after publish | Reload planner list and plan detail | Published state remains stable, no status/version mismatch |
| PL4 | Wrong publish path blocked | Attempt publish-equivalent state change through non-publish route or UI path if exposed | Request fails with publish-specific guard behavior rather than silently setting `published` |

## 6. Admin Access

| # | Flow | Steps | Expected |
|---|------|-------|----------|
| AD1 | System admin access | Log in as system admin and open multiple admin surfaces | Access granted consistently across admin entrypoints |
| AD2 | Tenant admin boundary | Log in as tenant admin and open tenant-scoped admin surfaces | Tenant-scoped admin access works; system-only areas remain blocked |
| AD3 | Non-admin block | Log in as non-admin user and attempt admin routes | Redirect or unauthorized behavior is consistent across routes |
| AD4 | Role stability on reload | Reload admin route after successful access | No role flip, no access loss caused by helper mismatch |

## 7. Evidence To Capture

- Screenshot of successful login landing on `/app`
- Screenshot or notes for successful MFA verify + trusted device flow
- Screenshot of profile/avatar before and after reload
- Network capture for `/api/accounts/whoami` after profile/avatar update
- Screenshot of planner publish result and version/list agreement
- Screenshot or notes for one allowed and one blocked admin route

## 8. Failure Triage Guide

| Symptom | First suspects |
|---------|----------------|
| Blank shell or logged-out app after login | auth bootstrap, degraded auth recovery, whoami/bootstrap divergence |
| Wrong tenant after MFA or reload | tenant cookie resolution, MFA trusted-device tenant binding |
| Name/avatar differs between pages | `/api/accounts/profile`, `whoami`, auth provider state, legacy avatar reads |
| Notifications differ between surfaces | app-shell hydration, notification query timing, auth state propagation |
| Published plan without matching version evidence | planner publish flow, non-publish status path leakage |
| Admin access inconsistent across pages | `admin-actions.ts`, server auth context, remaining tenant/admin gate drift |

## 9. Exit Criteria

- All A-, P-, N-, PL-, and AD-series checks pass.
- No flow requires an extra refresh to converge state.
- No route contradicts the canonical precedence or canonical write path established in the 2026-03-19 hardening round.
- Any failures are captured with route, response code, and reproduction steps before further refactor or migration work begins.