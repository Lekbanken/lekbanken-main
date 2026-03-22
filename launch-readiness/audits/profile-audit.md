# Profile & Settings Audit (#14)

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed launch-readiness audit for the profile and settings domain. Use `launch-readiness/launch-control.md` for current program status and related abuse/privacy findings for overlapping privacy hardening context.

> **Scope:** User profile pages, preferences, avatar upload, password/email change, account management, privacy settings  
> **Auditor:** Claude (automated, independently verified)  
> **Status:** ✅ GPT-calibrated  
> **Date:** 2026-03-12  
> **GPT Calibration:** 2026-03-12 — PROF-005 P2→P3. All other severities confirmed.  

---

## Executive Summary

**8 findings (0 P0, 0 P1, 4 P2, 4 P3)**

| Severity | Count | Launch Impact |
|----------|-------|---------------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 4 | Post-launch hardening |
| P3 | 4 | Polish |

The Profile domain has **strong foundational security**: RLS-enforced updates, current-password verification for credential changes, rate limiting on auth-sensitive endpoints, and audit logging. Main gaps are unenforced privacy flags (profile_visibility, show_email/show_phone), missing Zod validation on the PATCH endpoint, and leaked Supabase error details.

Several issues found by automated scanning (GDPR deletion, avatar MIME validation, file upload abuse) are **already tracked** in the Abuse & Privacy Audit (#21) and not counted as new findings here.

---

## Findings

### PROF-001 — `profile_visibility` Field Not Enforced by RLS (P2)

**Location:** `supabase/migrations/20260114160000_fix_users_select_recursion_complete.sql` L138–150  
**Also in:** `supabase/migrations/20260108000021_consolidate_permissive_final.sql` L46–55

**Description:** The `user_profiles_select` RLS policy contains `OR true`, making ALL profiles visible to ANY authenticated user regardless of the `profile_visibility` setting. Users who set their profile to "private" or "organization" are still fully readable.

```sql
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_system_admin_jwt_only()
    -- Public profiles visible to authenticated users
    OR true  -- ← This bypasses everything above
  );
```

The `profile_visibility` enum (`'public' | 'private' | 'organization'`) exists in `lib/profile/types.ts` L18 and is rendered in the preferences UI, but has no enforcement.

**Risk:** Users believe they have profile privacy control but don't. In a B2B org context this is mitigated (all users are authenticated org members, and no "browse all users" page exists for regular users), but the UI promise is misleading.

**Remediation:** Replace `OR true` with `OR profile_visibility = 'public'` and add organization-scoped logic for `'organization'` value.

---

### PROF-002 — `show_email`/`show_phone` Privacy Flags Not Enforced (P2)

**Location:** `lib/profile/types.ts` L91–92 (field definition), RLS policy (no column filtering)

**Description:** The `user_profiles` table has `show_email` and `show_phone` boolean fields, rendered as toggles in the privacy UI. However, the `SELECT *` in the profile API (`app/api/accounts/profile/route.ts` L29) returns all columns, and the RLS policy (`OR true`) allows any authenticated user to read all rows. These flags are cosmetic — they're stored but never enforced at the database or API layer.

**Risk:** Combined with PROF-001, any authenticated user could access email/phone data even when the user has opted out. Low practical risk at launch (profile API only queries self), but escalates if team/org member listing is added.

**Remediation:** Either enforce column-level filtering in API responses or add RLS expressions that mask sensitive columns based on these flags.

---

### PROF-003 — Profile PATCH Endpoint Missing Zod Validation (P2)

**Location:** `app/api/accounts/profile/route.ts` L41–55

**Description:** The PATCH handler uses a plain TypeScript type assertion (`as { ... }`) to parse the request body instead of the Zod schema `updateProfileSchema` that exists at `lib/profile/types.ts` L507–519. The Zod schema enforces display_name max 100 chars, phone E.164 regex, social_links URL validation, etc. — but none of this runs at request time.

```typescript
const body = (await req.json().catch(() => ({}))) as {
  full_name?: string
  language?: string
  // ... plain TypeScript, no runtime validation
}
```

**Risk:** Oversized strings, invalid phone formats, and arbitrary metadata objects pass through to Supabase. RLS UPDATE policy prevents cross-user writes, but data integrity is not guaranteed.

**Remediation:** Replace `as { ... }` with `updateProfileSchema.parse(await req.json())` and return 400 on validation failure.

---

### PROF-004 — Error Response Leaks Supabase Error Details (P2)

**Location:** `app/api/accounts/profile/route.ts` L109–114

**Description:** The PATCH error response includes `details: error.message` which forwards raw Supabase error strings to the client:

```typescript
return NextResponse.json(
  { error: 'Failed to update user', details: error.message },
  { status: 500 }
)
```

**Risk:** Internal database error messages (constraint names, column names, RLS failures) exposed to frontend users. Information disclosure vector for targeted attacks.

**Remediation:** Remove `details: error.message` from production responses. Log full error server-side only.

---

### PROF-005 — Email Change Doesn't Invalidate Other Sessions (P3)

**Location:** `app/api/accounts/auth/email/change/route.ts`

**Description:** After a successful email change (requires current password + Supabase email verification link), existing sessions are not invalidated. If an account was compromised and the legitimate user changes their email, the attacker's session persists.

**Risk:** Credential change doesn't fully revoke compromise. Supabase session tokens remain valid until natural expiry.

**Remediation:** After email change succeeds, call `await supabase.auth.signOut({ scope: 'others' })` to invalidate other sessions.

---

### PROF-006 — Console Logs Contain PII (P3)

**Location:** `app/api/accounts/profile/route.ts` L109–114

**Description:** Error logging includes `email: auth!.user!.email` and full `userId`. In a serverless environment (Vercel), these logs are visible in the dashboard and could be subject to log retention policies.

```typescript
console.error('[accounts/profile] users update error', {
  error, userId: userId, updates: userUpdate, email: auth!.user!.email
})
```

**Risk:** PII in logs creates GDPR compliance burden for log systems. Low immediate severity — server-side only, not exposed to clients.

**Remediation:** Log `userId` (needed for debugging) but omit `email`. Consider hashing or truncating if needed.

---

### PROF-007 — No Unsaved Changes Warning on Profile Form (P3)

**Location:** `app/app/profile/general/page.tsx`, `app/app/profile/account/page.tsx`

**Description:** Profile forms track `hasChanges` state but don't register a `beforeunload` listener. Navigating away silently discards unsaved edits.

**Risk:** User frustration from lost edits. No data loss risk (changes aren't partially committed).

**Remediation:** Add `beforeunload` listener when `hasChanges` is true.

---

### PROF-008 — No Unverified Email State UI (P3)

**Location:** `app/app/profile/account/page.tsx`

**Description:** After requesting an email change, the UI shows the old email with no indication that a verification email was sent or that a change is pending. Users may re-submit the change request or believe it failed.

**Risk:** User confusion. No security risk — Supabase handles verification correctly.

**Remediation:** Add a pending-verification badge or message after email change is requested.

---

## Cross-References (Already Tracked)

These issues were identified during research but are **already tracked in other audits** and not counted as new findings:

| Issue | Tracked In | Finding ID | Status |
|-------|-----------|------------|--------|
| Avatar upload no MIME validation | abuse-privacy-audit.md | UPLOAD-001 (P1) | Open |
| Avatar magic bytes not verified | abuse-privacy-audit.md | UPLOAD-006 (P3) | Open |
| GDPR deletion incomplete | abuse-privacy-audit.md | PRIV-001/002 (P1) | Kill-switched |
| GDPR export incomplete | abuse-privacy-audit.md | PRIV-003 (P1) | Kill-switched |
| Rate limiting architecture | security-auth-audit.md | SEC-002b | Open |

---

## Positive Findings

| # | Finding | Details |
|---|---------|---------|
| P1 | Zod schemas complete | `updateProfileSchema`, `changePasswordSchema`, `changeEmailSchema` all defined with proper constraints (max lengths, regex, enums) |
| P2 | Password change requires current password | `signInWithPassword()` verification before `updateUser()` — prevents takeover if session leaked |
| P3 | Email change requires password + verification | Current password verified, then Supabase sends confirmation link to new email |
| P4 | Auth-sensitive endpoints rate-limited | Both password and email change routes use `rateLimit: 'auth'` |
| P5 | RLS enforces self-only updates | UPDATE policy: `user_id = auth.uid() OR is_system_admin()` — no cross-user writes |
| P6 | Audit logging on all profile changes | `logUserAuditEvent()` called with full payload on every PATCH |
| P7 | Avatar upload size-limited | 5MB server-side check before Supabase upload |
| P8 | Avatar path user-scoped | Storage path `custom/${user.id}.png` prevents overwrites |
| P9 | JWT token size optimization | Only `full_name` in `user_metadata` — avatar, theme, language stored in `user_profiles` to prevent cookie chunking |
| P10 | Mounted state guard | `isMountedRef` prevents stale state writes after component unmount |
| P11 | Debounced router refresh | 2s debounce prevents auth storm on rapid token events |
| P12 | In-flight request deduplication | `inflightRef` prevents duplicate profile fetches |
| P13 | All profile UI uses i18n | Pages use `useTranslations('app.profile')` consistently |
| P14 | Password requirements visual feedback | Real-time checkmark indicators for length, uppercase, lowercase, number |

---

## Severity Distribution

| Finding | Category | Severity | Remediation |
|---------|----------|----------|-------------|
| PROF-001 | RLS / Privacy | P2 | Replace `OR true` with visibility-aware logic |
| PROF-002 | Privacy flags | P2 | Enforce `show_email`/`show_phone` in API or RLS |
| PROF-003 | Input validation | P2 | Use existing Zod schema in PATCH handler |
| PROF-004 | Info disclosure | P2 | Remove `details: error.message` from response |
| PROF-005 | Session security | P3 | Invalidate other sessions on email change |
| PROF-006 | PII in logs | P3 | Remove email from console.error calls |
| PROF-007 | UX | P3 | Add beforeunload listener |
| PROF-008 | UX | P3 | Add pending-verification indicator |

---

## Remediation Milestones

### M1 — Privacy Enforcement (PROF-001, PROF-002) — Post-launch
- [ ] Fix `user_profiles_select` RLS to respect `profile_visibility`
- [ ] Add column filtering based on `show_email`/`show_phone` flags

### M2 — API Hardening (PROF-003, PROF-004) — Post-launch
- [ ] Wire `updateProfileSchema` into PATCH handler
- [ ] Remove `details: error.message` from error responses

### M3 — Session & Polish (PROF-005, PROF-006, PROF-007, PROF-008) — Post-launch
- [ ] Add `signOut({ scope: 'others' })` after email change
- [ ] Remove PII from server-side logs
- [ ] Add unsaved changes warning
- [ ] Add pending email verification UI

---

## Files Examined

- `app/api/accounts/profile/route.ts` — Profile GET/PATCH API
- `app/api/accounts/auth/password/change/route.ts` — Password change
- `app/api/accounts/auth/email/change/route.ts` — Email change
- `app/app/profile/general/page.tsx` — Profile form UI
- `app/app/profile/general/avatarActions.server.ts` — Avatar upload
- `app/app/profile/account/page.tsx` — Account management
- `app/app/profile/preferences/page.tsx` — Preferences
- `app/app/profile/privacy/page.tsx` — Redirects to account
- `app/app/profile/security/SecuritySettingsClient.tsx` — MFA settings
- `app/app/profile/page.tsx` — Profile overview
- `lib/profile/types.ts` — Types and Zod schemas
- `lib/profile/profile-service.ts` — Profile service methods
- `lib/supabase/auth.tsx` — Auth context
- `hooks/useProfileQuery.ts` — Profile data hook
- `supabase/migrations/20260108000021_consolidate_permissive_final.sql` — RLS policies
- `supabase/migrations/20260114160000_fix_users_select_recursion_complete.sql` — Latest RLS
- `components/app/ProfileModal.tsx` — Profile modal
