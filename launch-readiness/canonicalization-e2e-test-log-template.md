# Canonicalization E2E Test Log Template

> **Created:** 2026-03-19
> **Use with:** [canonicalization-e2e-checklist.md](canonicalization-e2e-checklist.md)
> **Purpose:** Capture execution evidence for the canonicalization runtime verification round.
> **Run status:** ⬜ Not started

## 1. Run Metadata

| Field | Value |
|-------|-------|
| Run date | |
| Environment | |
| Base URL | |
| Operator | |
| Secondary reviewer | |
| Build / deployment ID | |
| Browser | |
| Test accounts used | |
| Notes | |

## 2. Status Legend

| Value | Meaning |
|-------|---------|
| PASS | Expected result matched actual runtime behavior |
| FAIL | Expected result did not match actual runtime behavior |
| BLOCKED | Could not execute due to setup, data, or environment issue |
| N/A | Intentionally skipped for this run |

## 3. Execution Log

| ID | Area | Flow | Route / Endpoint | User / Role / Tenant Context | Expected | Actual | HTTP Status | Refresh Changes Outcome? | Pass / Fail / Blocked | Notes | Owner |
|----|------|------|------------------|------------------------------|----------|--------|-------------|--------------------------|-----------------------|-------|-------|
| A1 | Auth | Login baseline | `/auth/login` → `/app` | | | | | | | | |
| A2 | Auth | Reload after login | `/app` | | | | | | | | |
| A3 | MFA | MFA verify | `/api/accounts/auth/mfa/verify` | | | | | | | | |
| A4 | MFA | Trusted device | `/api/accounts/auth/mfa/verify` | | | | | | | | |
| A5 | Tenant | Tenant switch after login | App shell tenant switch | | | | | | | | |
| P1 | Profile | Update profile basics | `/app/profile/general` | | | | | | | | |
| P2 | Profile | Update avatar | `/app/profile/general` | | | | | | | | |
| P3 | Profile | Avatar persistence | `/app`, `/app/profile`, admin surface | | | | | | | | |
| P4 | Profile | Whoami consistency | `/api/accounts/whoami` | | | | | | | | |
| P5 | Profile | No double write symptom | `/api/accounts/profile` | | | | | | | | |
| N1 | Notifications | Post-login notifications | App shell | | | | | | | | |
| N2 | Notifications | Notification page consistency | Dropdown + notifications page | | | | | | | | |
| N3 | Notifications | Reload consistency | Notifications surfaces | | | | | | | | |
| PL1 | Planner | Publish through intended flow | Planner publish UI | | | | | | | | |
| PL2 | Planner | Version evidence | Planner list/detail/version views | | | | | | | | |
| PL3 | Planner | Reload after publish | Planner list/detail | | | | | | | | |
| PL4 | Planner | Wrong publish path blocked | Non-publish status path | | | | | | | | |
| AD1 | Admin | System admin access | Multiple admin surfaces | | | | | | | | |
| AD2 | Admin | Tenant admin boundary | Tenant-scoped admin surfaces | | | | | | | | |
| AD3 | Admin | Non-admin block | Admin routes | | | | | | | | |
| AD4 | Admin | Role stability on reload | Admin route reload | | | | | | | | |

## 4. Failure Detail Log

Use one row per failure or blocked item.

| ID | Severity | Exact Step | Expected | Actual | Route / Endpoint | HTTP Status | Refresh Changes Outcome? | User / Role / Tenant Context | Suspected Layer | Reproduction Notes | Follow-up Owner |
|----|----------|------------|----------|--------|------------------|-------------|--------------------------|------------------------------|-----------------|--------------------|-----------------|
| | | | | | | | | | auth bootstrap / cache-state sync / API contract / UI / tenant context / role gate / planner publish | | |

## 5. Evidence Index

| ID | Evidence Type | File / Screenshot / Recording | Notes |
|----|---------------|-------------------------------|-------|
| A1 | Screenshot | | |
| A3 | Network capture | | |
| P2 | Screenshot | | |
| P4 | Network capture | | |
| PL1 | Screenshot | | |
| AD3 | Screenshot | | |

## 6. Summary

| Metric | Value |
|--------|-------|
| Total checks | 21 |
| PASS | |
| FAIL | |
| BLOCKED | |
| N/A | |
| Needs engineering follow-up? | |
| Launch-blocking issues found? | |

## 7. Sign-Off

| Role | Name | Date | Result |
|------|------|------|--------|
| Operator | | | |
| Reviewer | | | |

## 8. Notes For Interpreting Results

- Always record whether a page refresh changes the outcome. This is a primary signal for bootstrap or cache/state-sync issues.
- Always record the acting user type and active tenant. This is a primary signal for tenant-context or role-gate issues.
- If a failure is reproducible only on one route but not another, note both routes explicitly.
- If a network request succeeds but the UI remains wrong, classify suspected layer as `UI` or `cache-state sync` first, not API contract.