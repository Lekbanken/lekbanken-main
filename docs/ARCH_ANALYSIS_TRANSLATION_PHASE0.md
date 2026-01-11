# Phase 0: Architecture & Reality Analysis — Translation / i18n Admin

**Document Status:** READ-ONLY ANALYSIS  
**Feature Area (candidate):** `/admin/translation` (Översättningar)  
**Date:** 2026-01-11  
**Purpose:** Surface facts, constraints, risks, and IA decisions BEFORE Phase 1/2 work

---

## 🎯 Core Questions — Answered

| Question | Answer |
|----------|--------|
| Does a translation system already exist? | ⚠️ **FRAGMENTED** — Multiple isolated systems exist |
| Where is truth stored? | **Hybrid**: Code (`lib/i18n/ui.ts`), JSON (`lib/planner/locales.json`), DB (`game_translations`) |
| Is translation tenant-aware? | **Partially** — Tenant has `main_language` but it's not applied |
| What language strategy is used today? | **Mixed** — Manual code copy + DB for games only |
| What MUST admin hub control? | System strings, content translations, tenant defaults, missing key detection |

---

## Executive Summary

### Translation System Status: **FRAGMENTED (60% Complete)**

**Statement:** *"A translation system exists but is fragmented across three isolated mechanisms with no unified admin interface."*

### What Exists
| Mechanism | Location | Languages | Scope | Admin UI |
|-----------|----------|-----------|-------|----------|
| UI Copy (Marketing/Auth) | `lib/i18n/ui.ts` | NO, SE, EN | ~50 strings | ❌ None |
| Planner Domain i18n | `lib/planner/locales.json` | SV, EN | ~100 strings | ❌ None |
| Game Content Translations | `game_translations` table | sv, no, en | Full game content | ❌ None |
| User Language Preference | `PreferencesContext.tsx` | NO, SE, EN | Persisted | ✅ LanguageSwitcher |
| Tenant Default Language | `tenants.main_language` | NO, SE, EN | Schema only | ❌ Not applied |

### What's Missing
- ❌ **No admin translation UI** — Cannot manage translations without code changes
- ❌ **No centralized i18n framework** — No `next-intl`, `react-i18next`, or similar
- ❌ **No missing translation detection** — Silent failures
- ❌ **Admin/App pages 95%+ hardcoded Swedish** — Language preference has no effect
- ❌ **No translation workflow** — No import/export, batch editing, or review process

---

## Section A — Route & Navigation Inventory

### A.1 Route Scan

| Path | Status | Notes |
|------|--------|-------|
| `/admin/translation` | ❌ **DOES NOT EXIST** | No route defined |
| `/admin/translations` | ❌ **DOES NOT EXIST** | No route defined |
| `/admin/i18n` | ❌ **DOES NOT EXIST** | No route defined |
| `/admin/localization` | ❌ **DOES NOT EXIST** | No route defined |
| `/admin/language` | ❌ **DOES NOT EXIST** | No route defined |
| `/admin/settings` | ✅ Exists | No language/translation section |

### A.2 Navigation Check (`lib/admin/nav.ts`)

**Finding:** No translation-related entries in admin navigation.

The nav includes:
- Översikt, Organisationer, Användare, Produkter
- Bibliotek, Gamification, Utbildning, Support
- Drift, System (with Design, Notifikationer, Feature Flags, etc.)

**No "Översättningar" or "i18n" category exists.**

### A.3 Related Game Builder UI

**Found reference in Game Builder:**
```typescript
// app/admin/games/builder/components/BuilderSectionNav.tsx
{ id: 'oversattningar', label: 'Översättningar', icon: LanguageIcon }
```

This is a **per-game translation section** in the game builder, not a global admin hub.

---

## Section B — Frontend Translation Mechanism

### B.1 Library Detection

| Library | Installed | Used |
|---------|-----------|------|
| `next-intl` | ❌ No | — |
| `react-i18next` | ❌ No | — |
| `i18next` | ❌ No | — |
| `@formatjs/intl` | ❌ No | — |
| Custom solution | ✅ Yes | Multiple isolated implementations |

**Package.json confirms: No i18n library is installed.**

### B.2 Current Translation Patterns

#### Pattern 1: Static UI Copy (`lib/i18n/ui.ts`)

```typescript
export type LanguageCode = 'NO' | 'SE' | 'EN'

const uiCopy: Record<LanguageCode, { marketing: MarketingCopy; auth: AuthCopy }> = {
  NO: { marketing: {...}, auth: {...} },
  SE: { marketing: {...}, auth: {...} },
  EN: { marketing: {...}, auth: {...} }
}

export function getUiCopy(lang: LanguageCode) {
  return uiCopy[lang] ?? uiCopy.EN
}
```

**Coverage:** Marketing header, Auth flow (login, signup, reset password)  
**Languages:** Norwegian, Swedish, English  
**Strings:** ~50 total

**Used by:**
- `components/marketing/header.tsx`
- `components/navigation/ProfileMenu.tsx`
- `app/(marketing)/auth/login/page.tsx`
- `app/(marketing)/auth/signup/page.tsx`
- `app/(marketing)/auth/reset-password/page.tsx`

#### Pattern 2: Planner Domain i18n (`lib/planner/locales.json`)

```json
{
  "sv": {
    "planner": {
      "status": { "draft": "Utkast", "published": "Publicerad" },
      "actions": { "create": "Skapa plan", "delete": "Ta bort" },
      ...
    }
  },
  "en": {
    "planner": { ... }
  }
}
```

**Coverage:** Planner module only  
**Languages:** Swedish, English (NO missing!)  
**Strings:** ~100 total

**API:**
```typescript
import { t, scopedT, usePlannerTranslations } from '@/lib/planner/i18n'
t('status.draft') // 'Utkast'
t('status.draft', 'en') // 'Draft'
```

#### Pattern 3: Database-Backed Game Translations

```sql
CREATE TABLE public.game_translations (
  game_id uuid NOT NULL REFERENCES games(id),
  locale text NOT NULL,  -- 'sv', 'no', 'en'
  title text NOT NULL,
  short_description text NOT NULL,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  materials text[] DEFAULT '{}'::text[],
  PRIMARY KEY (game_id, locale)
);
```

**Coverage:** Game titles, descriptions, instructions, materials  
**Languages:** sv, no, en  
**Fallback:** `sv → no → en` (hardcoded in `lib/services/planner.server.ts`)

---

## Section C — Language Resolution Logic

### C.1 Current Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LANGUAGE PREFERENCE FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Anonymous User                                                   │
│     └─→ localStorage['lb-language'] (defaults to 'NO')              │
│                                                                      │
│  2. Logged-in User                                                   │
│     └─→ users.language column (synced from auth metadata)           │
│     └─→ user_preferences.language (tenant-scoped copy)              │
│                                                                      │
│  3. Tenant Default                                                   │
│     └─→ tenants.main_language (EXISTS but NOT APPLIED)              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### C.2 PreferencesContext (`lib/context/PreferencesContext.tsx`)

**Hydration Order:**
1. Read from `localStorage['lb-language']`
2. Override with `userProfile.language` if logged in
3. Sync changes to both `users` table and `user_preferences` table

**What works:**
- ✅ LanguageSwitcher dropdown changes preference
- ✅ Preference persists across sessions
- ✅ HTML `lang` attribute updates

**What doesn't work:**
- ❌ Changing preference doesn't change any visible UI text
- ❌ Admin pages are 100% Swedish regardless of preference
- ❌ App pages are 95%+ Swedish regardless of preference

### C.3 Root Layout (`app/layout.tsx`)

```tsx
<html lang="sv" ...>  // HARDCODED TO SWEDISH
```

The initial `lang` attribute is hardcoded to `sv`. Client-side script updates it, but this causes hydration mismatch potential.

---

## Section D — Translation Data Sources

### D.1 Static Translation Files

| File | Languages | Strings | Domain |
|------|-----------|---------|--------|
| `lib/i18n/ui.ts` | NO, SE, EN | ~50 | Marketing, Auth |
| `lib/planner/locales.json` | SV, EN | ~100 | Planner only |
| **Total Static** | — | **~150** | — |

**Note:** Norwegian (`NO`) missing from Planner translations!

### D.2 Database Translation Tables

| Table | Languages | Content Type | Tenant-aware |
|-------|-----------|--------------|--------------|
| `game_translations` | sv, no, en | Game content | Yes (via game) |
| `game_steps` | locale column | Step text | Yes |
| `game_phases` | locale column | Phase text | Yes |
| `game_roles` | locale column | Role text | Yes |
| `game_materials` | locale column | Material text | Yes |
| `game_board_config` | locale column | Board config | Yes |

**Missing translation tables:**
- ❌ `learning_courses` — title, description are single-language
- ❌ `learning_paths` — title, description are single-language
- ❌ `achievements` — name, description are single-language
- ❌ `notifications` — title, message are single-language
- ❌ `ui_translations` — does not exist

### D.3 Content Requiring Translation (Assessment)

| Content Type | Currently Translated? | How? | Risk Level |
|--------------|----------------------|------|------------|
| Games (title, description) | ✅ Yes | `game_translations` table | Low |
| Game instructions/steps | ✅ Yes | `game_steps.locale` column | Low |
| Courses (title, description) | ❌ No | Hardcoded single-language | **HIGH** |
| Learning Paths | ❌ No | Hardcoded single-language | **HIGH** |
| Achievements | ❌ No | Hardcoded single-language | **MEDIUM** |
| Shop Items | ❌ No | Hardcoded single-language | **MEDIUM** |
| Badges | ❌ No | Hardcoded single-language | **MEDIUM** |
| FAQ / Knowledge Base | ❌ N/A | Content doesn't exist | LOW |
| Notifications | ❌ No | Hardcoded in code | **HIGH** |
| Error Messages | ❌ No | Hardcoded in code | **HIGH** |
| System UI (buttons, labels) | ⚠️ Partial | Marketing/Auth only | **CRITICAL** |

---

## Section E — Admin Capabilities (Current Reality)

### E.1 Existing Admin UI

| Capability | Exists | Location |
|------------|--------|----------|
| List all translations | ❌ No | — |
| Edit translation strings | ❌ No | — |
| Side-by-side language comparison | ❌ No | — |
| Missing translation detection | ❌ No | — |
| Import/Export translations | ❌ No | — |
| Preview in different languages | ❌ No | — |

**Game Builder has per-game translations UI but:**
- Only accessible within game editing
- Not a centralized admin hub
- Doesn't cover system strings or other content

### E.2 Who Can Translate Today?

| Actor | Can Translate? | How |
|-------|----------------|-----|
| System Admin | ✅ Yes | Edit code files (requires deployment) |
| Tenant Admin | ❌ No | No UI available |
| Content Creator | ⚠️ Partial | Can translate games only (via Builder) |

---

## Section F — Tenant & White-label Impact

### F.1 Tenant Language Settings

**`tenants.main_language` column exists:**
```sql
main_language language_code_enum NOT NULL DEFAULT 'NO'
```

**But it's NOT USED in application code!**

Grep search for `main_language` shows:
- Schema definitions only
- No actual read/application logic

**Implication:** Tenants cannot set their organization's default language.

### F.2 Can Tenants Override Translations?

| Override Type | Possible? | Notes |
|---------------|-----------|-------|
| Custom terminology | ❌ No | No override mechanism |
| Custom language default | ❌ No | `main_language` not applied |
| Custom content translations | ⚠️ Games only | Via `game_translations` |

---

## Section G — Notifications & Dynamic Text

### G.1 Notification Translation Status

**`notifications` table has hardcoded title/message:**
```sql
title VARCHAR(255) NOT NULL,
message TEXT NOT NULL,
```

**No locale column exists.**

Notifications are created in code with hardcoded Swedish text:
```typescript
// Example pattern (conceptual)
await createNotification({
  title: 'Välkommen till Lekbanken!', // Swedish only
  message: 'Du har blivit tillagd i organisationen.'
})
```

### G.2 Email Templates

**No email template system found.**

Emails are handled by Supabase Auth (auth emails) and are configured at the project level, not in the codebase.

### G.3 Error Messages

**Pattern found throughout codebase:**
```typescript
// Hardcoded Swedish errors
throw new Error('Sessionen kunde inte hittas')
return { error: 'Kunde inte spara' }
setError('Kunde inte ta bort deltagare')
```

**No translation wrapper for error messages.**

---

## Section H — Gaps & Risks (CRITICAL)

### H.1 Hardcoded String Inventory

**Grep results for Swedish-specific patterns:**

| Pattern | Matches | Locations |
|---------|---------|-----------|
| `Skapa` (Create) | 30+ | Admin, App pages |
| `Ta bort` (Delete) | 30+ | Admin, App pages |
| `Spara` (Save) | 20+ | Admin, App pages |
| `Redigera` (Edit) | 15+ | Admin, App pages |
| `Lägg till` (Add) | 15+ | Admin, App pages |
| `Kunde inte` (Could not) | 40+ | Error handlers |

**Estimated total hardcoded strings: 500+**

### H.2 Language Mismatch Risk

| System | Default | Actual Content | Risk |
|--------|---------|----------------|------|
| Database `users.language` | NO (Norwegian) | — | ⚠️ |
| Root layout `lang` attribute | sv (Swedish) | — | ⚠️ |
| UI content | — | 95% Swedish | **MISMATCH** |
| Legal pages | — | Norwegian | **MISMATCH** |

**Norwegian user sees:**
- Database says language is NO
- UI is in Swedish
- Legal terms are in Norwegian

### H.3 Critical Risks for International Rollout

| Risk | Description | Severity | Blocking? |
|------|-------------|----------|-----------|
| **Mixed Language UI** | User sets EN, sees Swedish | CRITICAL | ✅ YES |
| **Untranslated Admin** | Admin is 100% Swedish | HIGH | ✅ YES for EN sales |
| **Untranslated App** | App is 95% Swedish | HIGH | ✅ YES for EN sales |
| **Untranslated Learning** | Courses are single-language | HIGH | ✅ YES |
| **Untranslated Notifications** | Notifications always Swedish | MEDIUM | ⚠️ Partial |
| **No Translation Admin** | Requires code changes | MEDIUM | Operational burden |
| **Planner missing NO** | Planner has no Norwegian | MEDIUM | ⚠️ For NO market |
| **Tenant language not applied** | `main_language` ignored | LOW | Future feature gap |

---

## Section I — Architecture Options (No Decision Yet)

### Option 1: Static JSON + Code Override

**Pattern:** Keep current `lib/i18n/ui.ts` approach, expand coverage

**Pros:**
- No new dependencies
- Type-safe (TypeScript interfaces)
- Fast (no DB queries)

**Cons:**
- Requires deployment for changes
- No admin UI possible
- Scales poorly (1000+ strings)

### Option 2: Full i18n Framework (next-intl)

**Pattern:** Install `next-intl`, migrate all strings to message files

**Pros:**
- Industry-standard
- Rich ecosystem (pluralization, formatting, etc.)
- Route-based or cookie-based locale
- SSR support

**Cons:**
- Migration effort (~50+ hours)
- Adds complexity to build
- Still static files (no admin UI without DB layer)

### Option 3: Hybrid Static + DB

**Pattern:** 
- System strings: Static JSON files
- Content (courses, achievements): Database with locale column
- Admin UI for DB content only

**Pros:**
- Balance of performance and flexibility
- Content creators can manage translations
- No deployment for content changes

**Cons:**
- Two systems to maintain
- Inconsistent patterns

### Option 4: Database-Driven Everything

**Pattern:** All strings in `ui_translations` table, loaded at runtime

**Pros:**
- Full admin control
- No deployment for any changes
- Tenant override possible

**Cons:**
- Performance (cache needed)
- Complex implementation
- No type safety

### Option 5: External Service (Phrase, Lokalise)

**Pattern:** Integration with translation management platform

**Pros:**
- Professional translation workflow
- Collaboration features
- Auto-sync to codebase

**Cons:**
- Monthly cost (~$100-500/month)
- External dependency
- Integration work

---

## Section J — Phase Readiness Assessment

### J.1 Is Lekbanken Currently SELLABLE?

| Market | Sellable? | Blockers |
|--------|-----------|----------|
| **Swedish (SE)** | ✅ Yes | Minor legal page language mismatch |
| **Norwegian (NO)** | ⚠️ Partial | Planner lacks NO, UI mostly Swedish |
| **English (EN)** | ❌ No | 95%+ UI untranslated |

### J.2 What Breaks First If Language Switched?

1. **User changes preference to English:**
   - Marketing header: ✅ Works (via `getUiCopy`)
   - Auth pages: ✅ Works (via `getUiCopy`)
   - App dashboard: ❌ Stays Swedish
   - Planner: ✅ Works (via `locales.json`)
   - Admin: ❌ Stays Swedish
   - Game content: ✅ Works (via `game_translations`)

2. **New tenant in Norway with `main_language: NO`:**
   - Has no effect
   - Users still see Swedish UI
   - `main_language` field is completely ignored

### J.3 Domains BLOCKING International Rollout

| Domain | Blocking EN? | Blocking NO? |
|--------|--------------|--------------|
| Admin (all pages) | ✅ YES | ✅ YES |
| App (dashboard, profile, etc.) | ✅ YES | ✅ YES |
| Learning (courses, paths) | ✅ YES | ✅ YES |
| Notifications | ✅ YES | ✅ YES |
| Planner | ✅ YES (SV/EN only) | ✅ YES (no NO) |
| Games | ❌ No (translated) | ❌ No (translated) |
| Auth | ❌ No (translated) | ❌ No (translated) |
| Marketing | ❌ No (translated) | ❌ No (translated) |

---

## Final Output

### 1. Factual Inventory of Translation Mechanisms

| Mechanism | Type | Coverage | Maintainability |
|-----------|------|----------|-----------------|
| `lib/i18n/ui.ts` | Hardcoded TypeScript | Marketing + Auth (~50 strings) | Code changes only |
| `lib/planner/locales.json` | JSON file | Planner (~100 strings, SV/EN) | Code changes only |
| `game_translations` table | Database | Game content (full) | Admin can edit via Builder |
| `game_*` tables `locale` column | Database | Structured game content | Admin can edit via Builder |
| `PreferencesContext` | React Context | User preference persistence | ✅ Works |
| `tenants.main_language` | Database | Tenant default (unused) | ❌ Not wired |

### 2. Missing Capabilities for Translation Admin Hub

| Capability | Priority | Notes |
|------------|----------|-------|
| Centralized string management | P0 | View/edit all translations |
| Missing translation detection | P0 | Identify gaps before deployment |
| Side-by-side editor (NO/SE/EN) | P1 | Efficient translation workflow |
| Import/Export (JSON/CSV) | P1 | Bulk operations |
| Content translation (courses, etc.) | P1 | Enable Learning domain in EN |
| Tenant override layer | P2 | White-label terminology |
| Translation status dashboard | P2 | Coverage metrics |
| Auto-translate suggestions | P3 | AI-assisted (future) |

### 3. Clear Statement

> **"A translation system exists but is FRAGMENTED across three isolated mechanisms (UI TypeScript, Planner JSON, Game DB) with no unified admin interface, no centralized i18n framework, and 95%+ of the application hardcoded in Swedish. The user language preference system works perfectly but has no effect on most content."**

### 4. Risk Matrix for SE / NO / EN Launch

| Risk | SE Impact | NO Impact | EN Impact | Mitigation |
|------|-----------|-----------|-----------|------------|
| Hardcoded Swedish UI | Low | HIGH | **CRITICAL** | i18n framework migration |
| Missing admin translations | Low | HIGH | **CRITICAL** | Admin string extraction |
| Missing app translations | Low | HIGH | **CRITICAL** | App string extraction |
| Learning content single-lang | Low | HIGH | **CRITICAL** | Add locale to schema |
| Notifications single-lang | Low | MEDIUM | HIGH | Add template system |
| Planner missing Norwegian | Low | HIGH | Low | Add NO to locales.json |
| Tenant language ignored | Low | MEDIUM | MEDIUM | Wire `main_language` |

### 5. Recommendation: Should Translation Be a First-Class Admin Domain?

**RECOMMENDATION: YES — Translation should be a first-class admin domain**

**Justification:**
1. **Sales Blocker:** Cannot sell to English-speaking markets without translation
2. **Operational Need:** Currently requires developers for any string change
3. **Scope:** 500+ strings across admin and app = significant ongoing maintenance
4. **Complexity:** Multiple translation mechanisms need consolidation
5. **Precedent:** Learning and Gamification are admin domains; Translation is equally complex

**Proposed Domain Location:** `/admin/translation` or `/admin/settings/translations`

**Suggested Phase 1 Scope:**
1. Install `next-intl` as centralized i18n framework
2. Extract 100 highest-impact strings to message files
3. Wire `PreferencesContext` to `next-intl`
4. Build basic admin UI for viewing/editing static translations
5. Add missing Norwegian translations to Planner

---

## Important Reminder

This phase was about **thinking clearly**, not building fast.

**Missing information acknowledged:**
- Exact string count across all files (estimate: 500+)
- Translation priorities per market (SE vs NO vs EN)
- Content owner for each domain (who translates what?)
- Budget for external translation service
- Timeline for English market launch

---

## Appendix: Key Files Reference

| File | Purpose |
|------|---------|
| `lib/i18n/ui.ts` | Marketing/Auth translations |
| `lib/planner/locales.json` | Planner translations (SV/EN) |
| `lib/planner/i18n.ts` | Planner translation utilities |
| `lib/context/PreferencesContext.tsx` | User language preference |
| `lib/services/planner.server.ts` | Game translation fallback logic |
| `components/navigation/LanguageSwitcher.tsx` | Language selector UI |
| `supabase/migrations/20251208090000_games_translations_media.sql` | Game translations schema |
| `app/layout.tsx` | Root layout (hardcoded `lang="sv"`) |
| `docs/TRANSLATION_ENGINE_DOMAIN.md` | Existing domain documentation |
| `docs/TRANSLATION_ENGINE_DOMAIN_VALIDATION_REPORT.md` | Previous validation report |
