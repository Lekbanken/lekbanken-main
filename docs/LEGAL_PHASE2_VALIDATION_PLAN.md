# Phase 2 Validation Plan - Legal System

Date: 2026-01-13  
Scope: Legal system Phase 2 (draft/publish, admin hub/editor, tenant scope, audit)  
Goal: Prove correctness, security, and tenant scoping before moving forward.

## Objectives (P0)
- Only published active docs are visible publicly.
- Users are blocked until they accept required docs.
- Publishing creates a new version, deactivates the prior active version, and writes an audit event.
- Tenant admins can manage tenant docs only; system admins can manage global + tenant docs.
- Locale fallback is deterministic and consistent across public pages, guard, and admin preview.

## Repo-Level Validation (Static)
### Routes and navigation
- Verify routes exist:
  - `/admin/legal`
  - `/admin/legal/[docType]`
  - `/admin/tenant/[tenantId]/legal`
  - `/admin/tenant/[tenantId]/legal/[docType]`
  - `/legal/terms`, `/legal/privacy`, `/legal/cookie-policy`
- Verify admin nav entries exist for Legal in:
  - system navigation
  - tenant navigation
- Verify acceptance guard is wired into:
  - `app/app/layout.tsx`
  - `app/admin/layout.tsx`

### Doc type consistency
- Confirm doc type union is consistent across:
  - DB constraints
  - TypeScript `LegalDocType`
  - admin route params
  - editor UI
- Expected doc types:
  - `terms`, `privacy`, `cookie_policy`, `org_terms`, `dpa`

## Database Validation (RLS + Constraints)
### Active version constraint
- Confirm only one active row is allowed per (type, locale, scope, tenant_id).
- Validate the partial unique index exists and is enforced.

### Publish RPC correctness
- Validate `publish_legal_document_v1` does:
  - deactivate prior active
  - insert new version
  - write audit log
- Ensure constraint prevents double-active even if RPC is called concurrently.

### RLS policy tests
Run for each role:
- Anonymous:
  - Can select only active global docs
  - Cannot read drafts
  - Cannot write acceptances or consents
- Authenticated user (non-admin):
  - Can read published docs
  - Can insert acceptance for self only
  - Cannot create drafts or publish
- Tenant admin:
  - Can manage tenant scope docs for their tenant only
  - Cannot manage global docs
- System admin:
  - Full access

### Acceptance integrity
- `user_legal_acceptances` is unique on (user_id, document_id).
- `org_legal_acceptances` is unique on (tenant_id, document_id).
- Foreign keys enforce document existence.

### Audit integrity
- Only admins can write audit events.
- Audit rows include actor_user_id, scope, tenant_id, document_id, timestamps.

## Functional Validation (UI + E2E)
### Publish + forced acceptance (global)
1. As system admin, publish new Terms for `sv` with change summary.
2. As a normal user who already accepted the previous version:
   - navigate to `/app`
   - expect redirect to `/legal/accept`
   - accept and continue
3. Verify DB:
   - new doc is active, previous is inactive
   - acceptance row exists for the new doc
   - audit log entry exists

### Draft workflow correctness
- Global:
  - create draft -> preview -> publish -> draft removed
- Tenant:
  - same flow under `/admin/tenant/[tenantId]/legal/[docType]`
  - tenant admin sees only their tenant docs/drafts

### Public pages correctness
- For each public doc type:
  - published content renders from DB
  - locale fallback works as expected
  - acceptance guard requires the same doc ID that is rendered

### Cookie banner + persistence
- First visit shows banner.
- GPC/DNT enabled shows restricted message.
- Save preferences persists and hides banner on revisit.
- Consent writes include tenant snapshot for logged-in users.

## Locale + Fallback Validation
### Precedence rules
Verify the effective locale for legal docs matches:
- requested locale
- fallback chain (locale -> fallback list -> default)

### Test matrix
- Requested locale exists -> served directly.
- Requested locale missing -> fallback served.
- Acceptance guard uses the same resolved doc ID as the page.

## Performance & Operability
- Acceptance guard performs O(1) queries per request.
- Published doc fetches are cacheable and invalidated on publish.
- Audit log entries are queryable and sorted by recency.

## Recommended Phase 2.1 Fixes (Optional)
- Seed org_terms + dpa (placeholders).
- Seed cookie policy content.
- Add tenant acceptance impact view.
- Centralize analytics loader with consent enforcement.

## Go / No-Go Criteria
Phase 2 can be considered validated when:
- Tenant admin cannot write global docs (RLS proven).
- Public cannot see drafts (RLS proven).
- Publish creates exactly one active doc per (type, locale, scope, tenant_id).
- Users are blocked until they accept newly published docs.
- Locale fallback is consistent in guard + render.
