# i18n Audit (#18) — Cross-cutting

**Status:** ✅ GPT-calibrated  
**Date:** 2026-03-12  
**GPT Calibration:** 2026-03-12 — I18N-001 P2→P3, I18N-004 P2→P3. All other severities confirmed.  
**Scope:** Translation coverage, hardcoded strings, locale handling, date/number formatting, error messages, metadata, accessibility strings, plural rules  
**Method:** Static code analysis + subagent deep scan + independent verification against `i18n-audit.json` baseline (2026-03-02). Sandbox pages (`app/sandbox/`) excluded — gated by `NODE_ENV === 'production'` → `notFound()`.

---

## Executive Summary

**7 findings (0 P0, 0 P1, 2 P2, 5 P3)**

| Severity | Count | Launch Impact |
|----------|-------|---------------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 2 | Post-launch hardening |
| P3 | 5 | Polish |

The i18n infrastructure is **excellent** — next-intl properly configured with cookie-based locale routing (no URL prefix), fallback chains, format utilities, and ~200+ files using `useTranslations`/`getTranslations`. The primary product language is Swedish, and launch targets Swedish users. English and Norwegian locale files exist but have gaps. Hardcoded Swedish strings exist mainly in server action error messages (admin-facing) and date/number formatting — these are **cosmetic/UX issues**, not functional blockers.

**Key context:** Lekbanken launches in Swedish. Multi-language support is a roadmap item, not a launch requirement. All findings are evaluated against this reality.

---

## Findings

### I18N-001 — Missing Translation Keys in en/no Locale Files (P3)

**Files:** `messages/en.json`, `messages/no.json`  
**Risk:** Users who switch to English or Norwegian see fallback text or empty strings for ~5-8% of keys.

**Evidence (from i18n-audit.json baseline):**

| Locale | Total Keys | Missing vs sv.json | Extra Keys |
|--------|-----------|-------------------|------------|
| sv | 11,399 | — (canonical) | — |
| en | 10,875 | 932 (−8.2%) | 408 |
| no | 10,955 | 1,419 (−12.4%) | 975 |

- 34 placeholder strings (TODO/TBD/FIXME markers) remain in translations
- 372 "probably untranslated" strings (Swedish text in en/no files — heuristic)
- next-intl fallback chain configured: `no → sv → en`, `en → sv` — so missing keys show Swedish text, not blank

**Mitigating factors:**
- Launch targets Swedish users — sv.json is complete (canonical)
- Fallback chain ensures no blank strings — worst case is Swedish text shown to en/no users
- 2,279 unused keys exist in sv.json (dead translations, not missing)

**Recommendation:** Complete en/no translations post-launch. Run `node scripts/i18n-audit.mjs` to track progress. Remove 2,279 unused keys to reduce maintenance burden.

---

### I18N-002 — Hardcoded Swedish Error Messages in Server Actions (P2)

**Files:** `app/actions/tenant-achievements-admin.ts`, `app/actions/shop-rewards-admin.ts`, `app/actions/tickets-admin.ts`, `app/actions/learning-admin.ts`, `app/actions/design.ts`, `app/actions/support-automation.ts`  
**Risk:** Server action error messages are hardcoded in Swedish. Non-Swedish admin users see Swedish error text.

**Evidence:**
```typescript
// 10+ instances of 'Åtkomst nekad' across tenant-achievements, shop-rewards, design
throw new Error('Åtkomst nekad: kräver organisationsadmin eller systemadmin');

// tickets-admin.ts — 10+ instances
return { success: false, error: authError || 'Inte autentiserad' };

// learning-admin.ts
return { success: false, error: 'Kunde inte hämta kurser' };
```

Additionally, Zod validation messages in `achievements-admin.ts` are in **English** (`'Name is required'`) — inconsistent with Swedish error messages elsewhere.

**Mitigating factors:**
- These are **admin-facing** errors, not end-user-facing
- Server actions cannot access `getTranslations()` in the current architecture (no request context)
- Launch targets Swedish admins — Swedish error text is correct for launch audience
- API route errors (via `apiHandler`) are properly in English (machine-readable)

**Recommendation:** Post-launch: create error code mapping. Server actions return error codes, client components translate via `useTranslations('errors')`. This is a standard pattern for Next.js server actions.

---

### I18N-003 — Hardcoded 'sv-SE' Locale in Date/Number Formatting (P2)

**Files:** Multiple production files  
**Risk:** Date and number formatting is hardcoded to Swedish locale. Non-Swedish users see Swedish-formatted dates/numbers.

**Evidence (production files only, sandbox excluded):**

| File | Line | Code |
|------|------|------|
| `app/app/preferences/privacy/page.tsx` | 171, 200 | `.toLocaleDateString('sv-SE')` |
| `app/app/support/tickets/[id]/page.tsx` | 264 | `.toLocaleDateString('sv-SE')` |
| `app/app/profile/security/SecuritySettingsClient.tsx` | 429 | `.toLocaleDateString('sv-SE')` |
| `app/app/profile/organizations/page.tsx` | 247, 314 | `.toLocaleDateString('sv-SE')` |
| `components/admin/AdminNotificationsCenter.tsx` | 101 | `.toLocaleDateString('sv-SE')` |
| `components/admin/AdminActivityFeed.tsx` | 37 | `.toLocaleDateString('sv-SE')` |
| `features/profile-overview/StatsCards.tsx` | 31 | `.toLocaleString('sv-SE')` |
| `components/journey/JourneyProgress.tsx` | 29 | `.toLocaleString('sv-SE')` × 2 |
| `components/journey/JourneyOverview.tsx` | 144 | `.toLocaleString('sv-SE')` × 2 |
| `components/journey/JourneyStats.tsx` | 24 | `.toLocaleString('sv-SE')` |

**Total:** ~15 instances in production code (excluding sandbox/docs).

**Mitigating factors:**
- `lib/i18n/format-utils.ts` exports proper locale-aware `formatDate()`, `formatNumber()`, `formatCurrency()` — utilities exist, just not universally used
- Launch targets Swedish users — `sv-SE` is correct for launch audience
- Difference between `sv-SE` and other locales is mainly format style (e.g., `2026-03-12` vs `3/12/2026`)

**Recommendation:** Post-launch: replace all `.toLocaleDateString('sv-SE')` / `.toLocaleString('sv-SE')` calls with `formatDate()` / `formatNumber()` from `lib/i18n/format-utils.ts` or `useFormatter()` from next-intl.

---

### I18N-004 — Mojibake/Encoding Issues in Translation Files (P3)

**Files:** `messages/sv.json` (373), `messages/no.json` (168), `messages/en.json` (21)  
**Risk:** Translation strings contain encoding artifacts (mojibake) that may render as garbled text.

**Evidence (from i18n-audit.json):**
- sv.json: 373 suspected encoding issues
- no.json: 168 suspected encoding issues  
- en.json: 21 suspected encoding issues

**Mitigating factors:**
- Heuristic detection — some may be false positives (e.g., legitimate Unicode characters)
- Need manual review to confirm actual rendering issues
- Most browsers handle UTF-8 properly; mojibake often comes from copy-paste from Word/PDF

**Recommendation:** Run `node scripts/i18n-audit.mjs` and manually review flagged strings. Fix confirmed encoding issues. Set up CI check to prevent new mojibake.

---

### I18N-005 — Hardcoded Accessibility Strings (P3)

**Files:** `components/ui/toast.tsx`, `components/ui/tooltip.tsx`  
**Risk:** Screen reader text is hardcoded, not translated.

**Evidence:**
```tsx
// components/ui/toast.tsx:149
aria-label="Stang"  // ← Also a typo: should be "Stäng"

// components/ui/tooltip.tsx:164  
aria-label="Mer information"  // ← Swedish, not translated
```

**Mitigating factors:**
- Most other aria-labels in the codebase properly use `t()` calls (verified in marketing-header, alert, JourneyToggleCard, etc.)
- Only 2 instances found in production code
- Screen readers handle missing translations gracefully

**Recommendation:** Fix typo (`"Stang"` → `tActions("close")`) and translate tooltip aria-label. Quick fix.

---

### I18N-006 — Inconsistent Plural Handling (P3)

**Risk:** Mixed pluralization strategies — ICU format, manual JavaScript, and `.replace()` — make maintenance harder and may produce incorrect grammar in non-Swedish locales.

**Evidence:**
```json
// ICU format (correct, used in planner):
"planner.header.blockCount": "{count, plural, one {# block} other {# block}}"

// Manual JS (common in admin):
confirmDescription: (count) => `${count} spel kommer att publiceras...`

// Awkward .replace() (audit-logs):
t('table.title')} ({logs.length} {t.raw('table.eventsCount').replace('{count}', '')})`
```

**Mitigating factors:**
- Swedish has simple plural rules (same as English: singular/plural only)
- Norwegian has same plural rules as Swedish
- Manual JS patterns work correctly for the current locale set
- ICU format adoption is growing in the codebase

**Recommendation:** Post-launch: standardize on ICU message format for all plural cases. Document pattern in coding conventions.

---

### I18N-007 — Hardcoded Strings in Admin Bulk Actions (P3)

**File:** `features/admin/games/v2/components/GameBulkActions.tsx`  
**Risk:** Confirmation dialog descriptions use hardcoded Swedish template strings instead of translation keys.

**Evidence:**
```tsx
// Line 57+
confirmDescription: (count) => `${count} spel kommer att publiceras och bli synliga.`
// Multiple similar patterns for archive, delete, draft, duplicate actions
```

**Mitigating factors:**
- Admin-only UI (requires system admin or tenant admin)
- Launch targets Swedish admins
- ~5 strings total in this file

**Recommendation:** Move to translation keys with ICU interpolation: `t('bulkActions.publish.confirm', { count })`.

---

## Positive Findings

| # | Area | Detail |
|---|------|--------|
| P1 | next-intl Configuration | Cookie-based routing (`lb-locale`, 1-year expiry), proper fallback chains (`no → sv → en`), no URL prefix complexity. Production-ready. |
| P2 | Format Utilities | `lib/i18n/format-utils.ts` exports `formatDate()`, `formatDateTime()`, `formatRelativeTime()`, `formatNumber()`, `formatCurrency()` — proper locale-aware formatting exists. |
| P3 | Locale Switcher | Client-side switcher via `useLocaleSwitcher.ts` + server action `setLocalePreference()`. Clean cookie management. |
| P4 | Translation Hook Coverage | 200+ files properly use `useTranslations()` or `getTranslations()`. Namespacing is consistent and hierarchical. |
| P5 | Server Component Support | `getTranslations()` used in `generateMetadata()` for translated page titles/descriptions. |
| P6 | Proxy Integration | `proxy.ts` resolves locale from cookie → Accept-Language → default. Integrates with tenant context. |
| P7 | Sandbox Gated | `app/sandbox/layout.tsx` returns `notFound()` in production — hardcoded sandbox strings are dev-only, zero user impact. |
| P8 | Interpolation Consistency | 0 interpolation mismatches between locale files (i18n-audit.json confirms). Variable names match across all 3 locales. |
| P9 | No XSS Risk | All translated strings rendered as React text nodes, not `dangerouslySetInnerHTML`. Safe against i18n-based XSS. |
| P10 | Existing Audit Tooling | `scripts/i18n-audit.mjs` generates comprehensive `i18n-audit.json` baseline — automated drift detection exists. |
| P11 | Admin Translation Management | Admin page at `app/admin/translations/missing/` provides UI for viewing missing keys. |
| P12 | Canonical Locale Complete | sv.json (11,399 keys) is the canonical locale and is fully populated. No gaps in primary language. |

---

## Severity Distribution

| ID | Finding | Severity | Launch Action |
|----|---------|----------|---------------|
| I18N-001 | Missing keys in en/no locale files | P3 | Fallback chain covers — complete post-launch |
| I18N-002 | Hardcoded Swedish server action errors | P2 | Admin-facing only — error code mapping post-launch |
| I18N-003 | Hardcoded 'sv-SE' in date/number formatting | P2 | Correct for Swedish launch — use format-utils post-launch |
| I18N-004 | Mojibake in translation files | P3 | Review and fix encoding — run audit script |
| I18N-005 | Hardcoded accessibility aria-labels | P3 | Fix typo + translate 2 strings |
| I18N-006 | Inconsistent plural handling | P3 | Standardize on ICU format post-launch |
| I18N-007 | Hardcoded admin bulk action strings | P3 | Admin-only — move to translation keys post-launch |

---

## Remediation Milestones

### M1 — Quick Fixes (Post-launch, 1-2 hours)

- [ ] Fix `aria-label="Stang"` typo in `components/ui/toast.tsx`
- [ ] Translate `aria-label="Mer information"` in `components/ui/tooltip.tsx`

### M2 — Translation Completion (Post-launch, multi-sprint)

- [ ] Complete 932 missing English keys
- [ ] Complete 1,419 missing Norwegian keys
- [ ] Review and fix 372 probably-untranslated strings
- [ ] Remove 2,279 unused sv.json keys (reduce maintenance)
- [ ] Review and fix mojibake (373 sv + 168 no + 21 en flagged)

### M3 — Format Standardization (Post-launch)

- [ ] Replace ~15 hardcoded `.toLocaleString('sv-SE')` / `.toLocaleDateString('sv-SE')` with `formatDate()` / `formatNumber()`
- [ ] Standardize plural rules on ICU message format
- [ ] Move `GameBulkActions.tsx` strings to translation keys

### M4 — Server Action Error i18n (Post-launch, 8-10 hours)

- [ ] Create error code constants for server actions
- [ ] Server actions return error codes instead of Swedish strings
- [ ] Client components map error codes → translated messages via `t('errors.*')`
- [ ] Resolve inconsistency between Swedish error messages and English Zod validation

---

## Appendix: Key Architecture Reference

| Component | File | Purpose |
|-----------|------|---------|
| Locale config | `lib/i18n/config.ts` | Locales, fallback chains, display names |
| Request config | `lib/i18n/request.ts` | Server-side locale resolution, timezone, formats |
| Format utilities | `lib/i18n/format-utils.ts` | `formatDate()`, `formatNumber()`, `formatCurrency()` |
| Locale switcher | `lib/i18n/useLocaleSwitcher.ts` | Client-side locale switching |
| Navigation | `lib/i18n/navigation.ts` | Locale-aware `Link`, `redirect`, `useRouter` |
| Proxy | `proxy.ts` | Cookie → Accept-Language → default locale resolution |
| Audit script | `scripts/i18n-audit.mjs` | Automated baseline generation |
| Audit baseline | `i18n-audit.json` | Machine-readable audit data (2026-03-02) |
| Swedish (canonical) | `messages/sv.json` | 11,399 keys |
| English | `messages/en.json` | 10,875 keys (−932 vs sv) |
| Norwegian | `messages/no.json` | 10,955 keys (−1,419 vs sv) |
