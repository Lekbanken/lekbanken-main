# Reality check (docs ↔ code) — 2025-12-17

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Scope

This report captures a targeted “reality check” for the highest drift-risk areas:
- Auth + route protection
- Tenant resolution + memberships
- Migrations + type generation
- CSV import/export contract
- Environment variables
- Platform domain claims vs actual code
- Billing/Stripe docs alignment

## Method

- Verified claims by reading the referenced source-of-truth code paths.
- Updated docs to include explicit “Related code” links + “Validation checklist”.
- Recorded any mismatches as findings and either fixed docs or flagged follow-ups.

## Findings

### F-001 — Platform docs claimed rate limiting exists (drift)

- Area: Platform / security
- Symptom: `docs/PLATFORM_DOMAIN.md` described Upstash-based rate limiting (`lib/ratelimit.ts`, `applyRateLimit`, Upstash env vars) as implemented.
- Reality: No such implementation files exist in the repo; no Upstash package usage detected.
- Action taken: Updated `docs/PLATFORM_DOMAIN.md` to mark rate limiting as “not currently implemented”, removed Upstash from “critical vars” and from env validation claims.
- Status: fixed (docs aligned to repo)

### F-002 — Environment variables docs referenced missing/required Upstash vars (drift)

- Area: ENV vars
- Symptom: `docs/ENVIRONMENT_VARIABLES.md` listed `UPSTASH_REDIS_REST_URL/TOKEN` as required and showed a “rate limiting disabled” warning message.
- Reality: `lib/config/env.ts` does not validate these vars and does not emit this warning.
- Action taken: Updated `docs/ENVIRONMENT_VARIABLES.md` to match `lib/config/env.ts` (Supabase required; others feature-gated/optional).
- Status: fixed (docs aligned to code)

### F-003 — `.env.local.example` existed but contained production-like values (hygiene risk)

- Area: ENV template
- Symptom: `.env.local.example` contained a concrete Supabase URL and realistic-looking placeholders.
- Action taken: Sanitized `.env.local.example` (generic placeholders, Stripe disabled by default, safer defaults).
- Status: fixed (template hygiene improved)

### F-004 — Global role precedence drift risk (resolved)

- Area: Auth/RBAC
- Reality: Canonical global role derivation is centralized in `lib/auth/role.ts` and referenced from proxy/server/client helpers.
- Action taken: Ensured docs explicitly point to the canonical implementation and include validation checklist.
- Status: OK (anti-drift in place)

### F-005 — Membership table naming consistency (resolved)

- Area: Tenancy
- Reality: Canonical membership table is `user_tenant_memberships` with `tenant_memberships` treated as compat-only.
- Action taken: Updated docs to encode the invariant and added explicit related-code links.
- Status: OK

### F-006 — CSV import/export contract alignment (resolved)

- Area: Games CSV
- Reality: Contract supports `sub_purpose_ids` (preferred JSON array string in cell) and `sub_purpose_id` as legacy.
- Action taken: Added explicit “Related code” + validation checklist in the contract doc to reduce future drift.
- Status: OK

### F-007 — Auth route protection and redirects (documented + anchored)

- Area: Proxy-based route guard
- Reality: Route protection is implemented in `proxy.ts` (not Next middleware) and tenant behavior in `lib/tenant/resolver.ts`.
- Action taken: Added metadata + related-code anchors + checklist to `docs/auth/routes.md`.
- Status: OK

### F-008 — Stripe docs needed explicit anchors (documented)

- Area: Billing
- Reality: Stripe integration is implemented via `lib/stripe/config.ts` and billing API routes under `app/api/billing/*`.
- Action taken: Added metadata + related-code anchors + checklist to `docs/STRIPE.md`.
- Status: OK (docs are now verifiable)

## Open follow-ups

- If rate limiting is desired, implement it explicitly (and then re-document):
  - Add feature-gated env validation in `lib/config/env.ts`.
  - Add a shared helper for API routes and a consistent 429 payload.
  - Add automated checks/tests for critical endpoints.

## Summary

- Biggest real drift found and fixed: rate limiting / Upstash claims (Platform + ENV docs).
- Highest risk areas now have explicit code anchors and checklists, making future drift much harder.
