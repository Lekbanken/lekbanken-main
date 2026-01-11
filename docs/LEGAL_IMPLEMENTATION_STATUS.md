# Legal System Implementation Status

Date: 2026-01-13  
Scope: Legal & Data Handling (Terms, Privacy, Cookie Policy, Org Terms, DPA)  
Status: Phase 3 implementation in progress; Phase 2 implemented (validation pending)

## Summary
Phase 1 (core data model + public pages + acceptance guard + cookie banner) is implemented.
Phase 2 (draft/publish workflow, admin hub/editor, audit log, org acceptance) is implemented.
Remaining work is Phase 3+ (advanced consent tooling, observability, and tests).

## Implemented (Phase 1)
### Database
- `legal_documents` table with versioning and active document constraint.
- `user_legal_acceptances` table for user acceptance tracking.
- `cookie_catalog` and `cookie_consents` tables.
- RLS policies for public read, system admin access, tenant admin access (tenant scope only).
- Seeded baseline Terms + Privacy for `sv`, `no`, `en`.

### Public pages and enforcement
- Public terms page (DB-backed with fallback to legacy translations).
- Public privacy page (DB-backed with fallback).
- Legal acceptance page for logged-in users.
- Acceptance guard wired into `/app` and `/admin` layouts.
- Cookie consent banner with GPC/DNT detection and localStorage state.
- Cookie consent persistence via server action (for authenticated users).

### Core legal helpers
- `lib/legal/legal-docs.ts` (active doc lookup + locale fallback).
- `lib/legal/acceptance.ts` (pending doc check).
- `lib/legal/constants.ts` and `lib/legal/types.ts`.
- `components/legal/MarkdownContent.tsx` with safe markdown rendering.

## Implemented (Phase 2)
### Database
- `legal_document_drafts` table for draft workflow.
- `legal_audit_log` table for audit events.
- `org_legal_acceptances` table for org-level acceptance.
- `publish_legal_document_v1` RPC for versioned publish + audit.

### Admin actions
- Draft CRUD, publish, audit list, org acceptance record.
- Acceptance impact (global) via service role query.
- Editor snapshot helper (active + drafts).

### Admin UI
- System legal hub: `/admin/legal`.
- System legal editor: `/admin/legal/[docType]`.
- Tenant legal hub: `/admin/tenant/[tenantId]/legal`.
- Tenant legal editor: `/admin/tenant/[tenantId]/legal/[docType]`.
- Shared editor UI: `features/admin/legal/LegalDocEditorClient.tsx`.
- Admin nav entries and i18n keys for `legal`.

### Public pages
- Cookie policy page: `/legal/cookie-policy` (DB-backed if published).

## Implemented (Phase 3 - in progress)
### Cookie preferences + receipts
- Cookie preferences page: `/app/preferences/cookies`.
- Consent receipt download (JSON) for logged-in users.
- Consent reset action to clear stored preferences.
- Retention policy surfaced in UI (constant-based).

### Observability + translation hub touchpoints
- Cookie consent overview cards in `/admin/legal` (opt-in counts).
- Translation hub quick action linking to `/admin/legal`.

## Not Implemented / Remaining
### Phase 2 follow-ups
- Acceptance impact per tenant (org-level analytics view).
- Editor diff view (draft vs published) beyond preview.
- Admin UI for cookie catalog and consent reporting.

### Phase 3+ (planned)
- Consent receipts export beyond cookie consents (legal acceptance receipts).
- Integration with Translation Hub beyond linking (single editor for locale diffs).
- Advanced observability dashboards (acceptance rates per tenant, consent opt-ins trends).
- E2E tests for acceptance gating, publish flow, and consent changes.

## Known Gaps / Decisions
- No published org terms or DPA documents by default.
- Cookie policy content is not seeded yet (page shows placeholder until published).
- GPC/DNT is respected by banner, but analytics loader enforcement is not centralized yet.

## Validation Needed
- Run `supabase db push` for Phase 2 migration if not applied.
- Verify `/admin/legal` and `/admin/tenant/[tenantId]/legal` in UI.
- Publish at least one document for each doc type to validate acceptance flows.
- Full validation checklist: `docs/LEGAL_PHASE2_VALIDATION_PLAN.md`.

## Notes
- This summary covers only the legal system scope.
- There are unrelated pending file changes elsewhere in the repo (not part of legal work).
