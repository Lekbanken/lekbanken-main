# Media & Assets Launch Audit (#12)

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed launch-readiness audit for media and assets handling. Treat this as the bounded audit snapshot behind later remediation and regression verification.

**Date:** 2026-03-12  
**Status:** ✅ GPT-calibrated (no severity changes)  
**Scope:** Media CRUD, upload pipeline (signed URL flow), templates, fallback images, avatar uploads, tenant branding, spatial artifact previews, Supabase storage buckets  
**Auditor:** Claude (automated deep-dive)

---

## 0. Domain Overview

**11 route handlers** across 7 route files under `/api/media/`. Plus 4 server actions and 1 client-side direct upload for storage operations. 9 Supabase storage buckets in use.

| Subsystem | Routes/Actions | Description |
|-----------|---------------|-------------|
| Media CRUD | 5 handlers (3 files) | List, create, read, update, delete media records |
| Upload pipeline | 2 handlers (2 files) | Signed URL generation + confirmation |
| Templates | 3 handlers (2 files) | Template mapping CRUD |
| Fallback | 1 handler (1 file) | Default image resolution |
| Avatar upload | 2 server actions | Profile avatar via service role + profile service |
| Tenant branding | 1 server action + 1 client component | Logo + asset upload |
| Spatial previews | 1 server action | Base64 preview upload |
| SVG rendering | 1 handler (1 file) | Spatial artifact SVG on-demand |

**Auth distribution:**
- 7 handlers: `auth: 'user'` via `apiHandler`
- 1 handler: `auth: 'public'` via `apiHandler` (media/[mediaId] GET)
- **2 handlers: NO AUTH** — raw `export async function` (media GET list, media/fallback GET)
- 1 handler: `auth: 'public'` with inline multi-tier auth (spatial-artifacts SVG)

**Rate limiting:** 1 of 11 handlers has rate limiting (upload POST). 10 unprotected.

**RLS analysis:** Critical context for severity calibration:
- `media` table: INSERT requires `authenticated` + tenant membership check. UPDATE/DELETE requires own-tenant or system_admin. SELECT allows global, own-tenant, or game-linked media.
- `media_templates` table: SELECT is `USING (true)` (public). INSERT/UPDATE/DELETE requires `system_admin` role in RLS.

---

## 1. Findings Summary

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| P0 — Launch blocker | 0 | — |
| P1 — Must fix before launch | 2 | MEDIA-001, MEDIA-002 |
| P2 — Should fix, not blocker | 6 | MEDIA-003, MEDIA-004, MEDIA-005, MEDIA-006, MEDIA-007, MEDIA-008 |
| P3 — Nice to have | 4 | MEDIA-009, MEDIA-010, MEDIA-011, MEDIA-012 |
| **Total** | **12** | |

---

## 2. Detailed Findings

### P1 — Must Fix Before Launch

#### MEDIA-001 — Upload pipeline allows cross-tenant file operations (P1)

**Routes:** `app/api/media/upload/route.ts` (POST), `app/api/media/upload/confirm/route.ts` (POST)

**Issue:**
1. **Upload:** `tenantId` is user-supplied in request body. User chooses which bucket to upload to via `bucket` enum. No verification that the authenticated user is a member of the supplied `tenantId`. A user can request a signed upload URL for any tenant's namespace in any bucket.
2. **Confirm:** `path` is user-supplied (max 1024 chars). No verification that the requesting user uploaded the file at the given path. Any authenticated user can request a public URL or signed URL for any file in any bucket by providing an arbitrary path — potentially accessing files uploaded by other tenants.
3. **Media POST:** `tenant_id` in body is user-supplied. RLS `INSERT` policy does check `tenant_id = ANY(get_user_tenant_ids())`, so cross-tenant DB inserts are blocked by RLS. But the storage operations (upload/confirm) bypass this because they use signed URLs directly.

**Impact:** Any authenticated user can upload files to another tenant's storage namespace and obtain URLs for files in other tenants' namespaces. Storage-level tenant isolation is broken.

**Root cause:** Upload pipeline trusts client-supplied `tenantId` without membership verification.

**Fix:** Add `assertTenantMembership(supabase, user, tenantId)` before generating signed upload URLs. For confirm, verify the path prefix matches the user's tenant(s).

---

#### MEDIA-002 — Client-side direct storage upload bypasses server validation (P1)

**Route:** `features/admin/organisations/components/card/OrganisationBrandingSection.tsx` (lines 155–200)

**Issue:** Logo upload uses `supabase.storage.from('tenant-assets').upload()` directly from the browser client. This bypasses all server-side validation. Client-side checks (`file.type.startsWith('image/')`, 2MB max) are trivially bypassable. File extension from `file.name.split('.').pop()` is user-controlled — could contain unexpected values. After upload, directly writes to `tenant_branding` table.

Additionally, `uploadTenantAsset` server action in `app/actions/design.ts` checks that branding is enabled for the tenant but **does not verify the user is a member/admin of that tenant** — any authenticated user who knows a tenantId can upload assets.

**Impact:** Client-enforced upload validation is trivially bypassable. Server action missing tenant membership check allows cross-tenant asset uploads.

**Root cause:** Direct client-to-Supabase upload pattern (ARCH-006 finding). Server action missing authorization check.

**Fix:** (A) Refactor client upload to use server action with proper tenant membership check. Or (B) ensure Supabase bucket RLS policies enforce tenant-scoped writes (verify in dashboard). (C) Add `requireTenantRole` or membership check to `uploadTenantAsset`.

---

### P2 — Should Fix, Not Blocker

#### MEDIA-003 — Two media routes lack auth wrapper (P2)

**Routes:** `app/api/media/route.ts` GET (raw export), `app/api/media/fallback/route.ts` GET (raw export)

**Issue:**
- `GET /api/media`: Raw `export async function GET` with no `apiHandler` wrapper. No auth check.
- `GET /api/media/fallback`: Raw `export async function GET` with no `apiHandler` wrapper. No auth check.

**Mitigating factor:** Both use `createServerRlsClient()`. Without valid auth cookies, the RLS client has no authenticated user — `media` table SELECT requires authenticated role for non-public queries. The `media_templates` SELECT policy is `USING (true)` so template data is accessible without auth (but templates contain no sensitive data — just purpose/product/media mappings).

**Impact:** Defense-in-depth gap. RLS provides real protection, but unwrapped routes miss standardized error handling, rate limiting, and auth enforcement.

**Fix:** Wrap both in `apiHandler({ auth: 'user' })` or `auth: 'public'` if intentionally public.

---

#### MEDIA-004 — Template POST/DELETE use `auth: 'user'` without admin check (P2)

**Routes:** `app/api/media/templates/route.ts` POST, `app/api/media/templates/[templateId]/route.ts` DELETE

**Issue:** Auth level is `auth: 'user'` — any authenticated user can attempt template create/delete. Template POST has no Zod schema (manual validation only).

**Mitigating factor:** RLS policy on `media_templates` requires `system_admin` for INSERT/UPDATE/DELETE. Non-admin requests will fail at DB level with a Postgres permission error.

**Impact:** Defense-in-depth. Non-admins already can't modify templates (RLS blocks it), but the route permits the attempt. Error messages may leak RLS violation details. Missing Zod on POST.

**Fix:** Change to `auth: 'system_admin'` for consistency with RLS intent. Add Zod schema to POST.

---

#### MEDIA-005 — No rate limiting on 10 of 11 media handlers (P2)

**Routes:** All except `POST /api/media/upload`

**Issue:** Only the upload endpoint has `rateLimit: 'api'`. All other handlers (list, create, read, update, delete, confirm, templates, fallback) lack rate limiting.

**Impact:** Media listing and template queries can be used for enumeration/scraping. Upload confirm can be called rapidly.

**Fix:** Add `rateLimit: 'api'` to mutation endpoints. Consider `rateLimit: 'auth'` for read endpoints.

---

#### MEDIA-006 — Spatial preview upload has no size limit (P2)

**Route:** `features/admin/library/spatial-editor/lib/artifact-actions.ts` `uploadArtifactPreview()`

**Issue:** Accepts base64 string with no size limit. `atob()` + `Uint8Array.from()` is memory-inefficient for large inputs. No validation that the decoded data is actually a valid PNG.

**Impact:** Memory exhaustion DoS on the server with a large base64 payload.

**Fix:** Add max length check on the base64 input (e.g., 2MB decoded ≈ 2.7MB base64).

---

#### MEDIA-007 — Avatar upload uses service role without content-type verification (P2)

**Route:** `app/app/profile/general/avatarActions.server.ts`

**Issue:** Uses `supabaseAdmin` (service role) for upload to bypass RLS. File uploaded with content type `image/png` regardless of actual file content — no MIME/magic-byte validation. Size check (5MB) present.

**Mitigating factor:** RLS bypass is documented (bucket lacks DELETE policy for upsert). Path is deterministic (`avatars/${userId}.png`), so only affects user's own avatar. Authenticated via `getUser()`.

**Impact:** User can upload non-image content that gets served with `image/png` content type. Low exploit potential since path is user-scoped.

**Fix:** Add actual content-type validation (`file.type` check against allowlist).

---

#### MEDIA-008 — SVG rendering endpoint lacks rate limiting (P2)

**Route:** `app/api/spatial-artifacts/[artifactId]/svg/route.ts`

**Issue:** CPU-intensive on-demand SVG rendering with no rate limiting. Well-designed auth model (3-tier: user → participant → reject). `Cache-Control: private, no-store`.

**Impact:** DoS vector — rapid requests force repeated SVG rendering.

**Fix:** Add `rateLimit: 'api'` (or a lower tier if rendering is expensive).

---

### P3 — Nice to Have

#### MEDIA-009 — File type is user-declared, not server-verified (P3)

**Route:** `app/api/media/upload/route.ts`

**Issue:** `fileType` in request body is a string declared by the client. Server doesn't verify actual MIME type when generating the signed URL. Actual enforcement depends on Supabase bucket policies.

**Impact:** Minimal — the signed URL upload is a client-side PUT with the declared content type. The risk depends on bucket policies.

---

#### MEDIA-010 — Templates GET returns all rows without pagination (P3)

**Route:** `app/api/media/templates/route.ts` GET

**Issue:** Returns all templates with no pagination or limit. Could return large datasets as template count grows.

---

#### MEDIA-011 — `console.error` used instead of `logger` in template DELETE (P3)

**Route:** `app/api/media/templates/[templateId]/route.ts`

**Issue:** Uses `console.error` instead of structured `logger` for error reporting.

---

#### MEDIA-012 — Supabase bucket policies unverified (P3, CROSS-REF)

**Issue:** 9 storage buckets are used across the app. The upload flow uses signed URLs (server generates URL, client does PUT). Actual file size/type enforcement at upload time depends entirely on Supabase bucket policies, which are not verifiable from code.

**Buckets:** `game-media`, `custom_utmarkelser`, `tenant-media`, `media-images`, `media-audio`, `avatars`, `system-assets`, `tenant-assets`, `spatial-previews`

**Impact:** Unknown — bucket policies may or may not enforce proper restrictions.

**Fix:** Verify all bucket policies in Supabase dashboard. Ensure MIME allowlists and size limits.

---

## 3. Route Inventory

### Media CRUD

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `/api/media` | GET | ❌ **NONE** | ❌ raw | Partial (type allowlist, parseInt) | ❌ | **MEDIA-003** |
| `/api/media` | POST | `user` | ✅ | ✅ Zod (`mediaSchema`) | ❌ | MEDIA-001 (tenant_id) |
| `/api/media/[mediaId]` | GET | `public` | ✅ | mediaId from params | ❌ | |
| `/api/media/[mediaId]` | PATCH | `user` | ✅ | ✅ Zod (`updateSchema`) | ❌ | |
| `/api/media/[mediaId]` | DELETE | `user` | ✅ | mediaId from params | ❌ | |

### Upload Pipeline

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `/api/media/upload` | POST | `user` | ✅ | ✅ Zod (10MB max, bucket enum) | ✅ `api` | **MEDIA-001** |
| `/api/media/upload/confirm` | POST | `user` | ✅ | ✅ Zod (bucket enum, path max 1024) | ❌ | **MEDIA-001** |

### Templates

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `/api/media/templates` | GET | `user` | ✅ | — | ❌ | MEDIA-010 |
| `/api/media/templates` | POST | `user` | ✅ | ❌ Manual | ❌ | **MEDIA-004** |
| `/api/media/templates/[templateId]` | DELETE | `user` | ✅ | templateId from params | ❌ | **MEDIA-004** |

### Fallback

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `/api/media/fallback` | GET | ❌ **NONE** | ❌ raw | ✅ Zod | ❌ | **MEDIA-003** |

### Adjacent

| Route | Methods | Auth | Wrapper | Validation | Rate limit | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `/api/spatial-artifacts/[id]/svg` | GET | `public` + inline auth | ✅ | — | ❌ | MEDIA-008 |

### Server Actions

| Action | Location | Auth | Validation | Finding |
|--------|----------|------|-----------|---------|
| `uploadAvatar` | `avatarActions.server.ts` | `getUser()` | 5MB size | MEDIA-007 |
| `uploadAvatar` (profile-service) | `profile-service.ts` | caller (RLS) | 5MB + type allowlist ✅ | — |
| `uploadTenantAsset` | `design.ts` | `getUser()` | 5MB + type allowlist | **MEDIA-002** |
| `uploadArtifactPreview` | `artifact-actions.ts` | `getUser()` | ❌ No size limit | MEDIA-006 |

---

## 4. Strengths

1. **Solid RLS on `media` table** — INSERT requires tenant membership, UPDATE/DELETE requires own-tenant or system_admin, SELECT scoped to accessible data
2. **RLS on `media_templates`** — mutations require system_admin at DB level (defense-in-depth)
3. **Signed URL upload pattern** — server generates signed URLs, client does direct PUT (good scalability)
4. **Good Zod coverage** — upload, confirm, media CRUD, fallback all have schemas
5. **Rate limiting on upload** — the most abuse-prone endpoint has protection
6. **Profile service has proper content-type validation** — allowlist of image MIME types
7. **System asset upload requires `system_admin`** — proper admin-only gate

---

## 5. Remediation Plan

### M1 — Tenant Isolation + Client Upload (2 P1) ✅ COMPLETE (2026-03-12)

| Finding | Route | Fix | Status |
|---------|-------|-----|--------|
| MEDIA-001 | upload + confirm | `assertTenantMembership()` before signed URL generation (upload) + path-prefix ownership validation (confirm) | ✅ Fixed |
| MEDIA-002 | uploadTenantAsset server action | Added `user_tenant_memberships` check before upload | ✅ Fixed |

**Noteringar:**
- `upload/route.ts`: When `tenantId` is provided, calls `assertTenantMembership(supabase, auth!.user!, tenantId)` before generating signed URL. System admins bypass.
- `upload/confirm/route.ts`: Extracts tenant UUID from path prefix (`path.split('/')[0]`), validates membership if it's a UUID. Paths with `public/` prefix or non-UUID prefixes pass through.
- `design.ts` `uploadTenantAsset`: Added `user_tenant_memberships` query + 403 on denial before storage upload.
- MEDIA-002 client-side direct upload (OrganisationBrandingSection) is tracked under ARCH-006 (direct Supabase mutations in client components). Refactoring to server action is post-launch scope.

### M2 — Wrapper + Auth (P2, launch-recommended)

| Finding | Route | Fix | Effort |
|---------|-------|-----|--------|
| MEDIA-003 | media GET + fallback GET | Wrap in `apiHandler` | ~20 min |
| MEDIA-004 | templates POST + DELETE | Change to `auth: 'system_admin'` + add Zod | ~20 min |

### M3 — Hardening (post-launch)

| Finding | Route | Fix |
|---------|-------|-----|
| MEDIA-005 | 10 handlers | Add rate limiting |
| MEDIA-006 | spatial preview | Add base64 size limit |
| MEDIA-007 | avatar upload | Add content-type validation |
| MEDIA-008 | SVG rendering | Add rate limiting |

### M4 — Cleanup (post-launch)

| Finding | Route | Fix |
|---------|-------|-----|
| MEDIA-009 | upload | Server-side MIME verification |
| MEDIA-010 | templates GET | Add pagination |
| MEDIA-011 | template DELETE | Use `logger` |
| MEDIA-012 | All buckets | Verify Supabase bucket policies |

---

## 6. Cross-References

| Finding | Related | Notes |
|---------|---------|-------|
| MEDIA-002 | ARCH-006 | Direct Supabase mutations in client component — systemic finding |
| MEDIA-005 | SEC-002b | Systemic rate limiting gap |
| MEDIA-012 | — | Unique to Media — Supabase bucket policies not verifiable from code |
| MEDIA-001 | TI-003 | Same pattern — trusts caller-provided tenantId for storage operations |
