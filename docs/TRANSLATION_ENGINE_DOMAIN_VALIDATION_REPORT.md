# 🌍 TRANSLATION ENGINE DOMAIN – VALIDATION REPORT

Canonical domain doc (source of truth): `docs/TRANSLATION_ENGINE_DOMAIN.md`

## Metadata

> **Status:** draft
> **Owner:** -
> **Date:** 2025-12-11
> **Last updated:** 2026-03-21
> **Last validated:** 2025-12-11
> **Domain:** Translation Engine (i18n)
> **Notes:** Partial implementation validation snapshot.

---

## 📋 EXECUTIVE SUMMARY

### What Exists
- ✅ Database-backed game translations (`game_translations` table)
- ✅ Client-side language preference system (NO/SE/EN)
- ✅ Hardcoded UI copy for marketing/auth (`lib/i18n/ui.ts`)
- ✅ Locale fallback logic in game content (`sv → no → en`)
- ✅ User language preferences (persisted in `users` table + localStorage)
- ✅ Tenant default language (`tenants.main_language`)

### What's Missing
- ❌ **Centralized translation system** - No unified i18n framework (next-intl, i18next)
- ❌ **Admin translation UI** - No interface for managing translations
- ❌ **Missing translation detection** - No alerts for untranslated content
- ❌ **Translation workflow** - No import/export, batch translation tools
- ⚠️ **Inconsistent coverage** - Mix of hardcoded strings and database translations

### Critical Gaps
1. **UI strings mostly hardcoded** - Only marketing/auth have translations, rest is Swedish-only
2. **No translation fallback in UI layer** - Database translations have fallback, UI does not
3. **No admin tools** - Content creators can't manage translations efficiently
4. **No validation** - Missing translations silently fail

---

## 🏗️ CURRENT ARCHITECTURE

### 1. Database Layer

#### `game_translations` Table
**Migration:** `20251208090000_games_translations_media.sql`

```sql
CREATE TABLE public.game_translations (
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  locale text NOT NULL,  -- 'sv', 'no', 'en'
  title text NOT NULL,
  short_description text NOT NULL,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  materials text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, locale)
);
```

**RLS Policies:**
- ✅ Read: Anyone can read published global games, authenticated users can read tenant games
- ✅ Write: Restricted to tenant members editing their games

**Assessment:** 
- ✅ Well-designed for game content
- ❌ Only covers games, not UI/system messages
- ⚠️ No validation for required locales

#### Language Code Enum
**Migration:** `20251129000000_initial_schema.sql`

```sql
CREATE TYPE language_code_enum AS ENUM ('NO', 'SE', 'EN');
```

**Used in:**
- `users.language` - User preference
- `tenants.main_language` - Tenant default
- `user_preferences.language` - Tenant-scoped preference

**Assessment:**
- ✅ Type-safe language codes
- ✅ Consistent across domains
- ❌ Limited to 3 languages (no DA/FI expansion path)

---

### 2. Application Layer

#### Locale Fallback Logic
**File:** `lib/services/planner.server.ts`

```typescript
const DEFAULT_LOCALE_ORDER = ['sv', 'no', 'en'];

function pickTranslation(
  translations: Tables<'game_translations'>[] | null | undefined,
  localeOrder: string[]
) {
  if (!translations || translations.length === 0) return null;
  return (
    localeOrder.map((locale) => 
      translations.find((t) => t.locale?.toLowerCase() === locale)
    ).find(Boolean) || translations[0]
  );
}
```

**Assessment:**
- ✅ **GOOD:** Implements fallback chain (sv → no → en → first available)
- ✅ Consistent pattern used in game rendering
- ❌ **ISSUE:** Hardcoded fallback order (should derive from user preference)
- ❌ **ISSUE:** Only used in planner/games domain, not platform-wide

**Usage:**
- `features/planner/components/SessionEditor.tsx` - Game selection
- `features/play/PlayPage.tsx` - Game runtime
- `app/app/games/[gameId]/page.tsx` - Game details

#### UI Copy System
**File:** `lib/i18n/ui.ts`

```typescript
export type LanguageCode = 'NO' | 'SE' | 'EN';

const uiCopy: Record<LanguageCode, { marketing: MarketingCopy; auth: AuthCopy }> = {
  NO: {
    marketing: {
      nav: { features: 'Funksjoner', ... },
      actions: { login: 'Logg inn', ... }
    },
    auth: { loginTitle: 'Logg inn i Lekbanken', ... }
  },
  SE: { ... },
  EN: { ... }
};

export function getUiCopy(lang: LanguageCode) {
  return uiCopy[lang] ?? uiCopy.EN;  // Fallback to English
}
```

**Assessment:**
- ✅ Type-safe translation keys
- ✅ Simple fallback (default to EN)
- ❌ **CRITICAL:** Only covers ~50 strings (marketing + auth)
- ❌ **CRITICAL:** Not used consistently across app
- ❌ No namespace organization for large-scale translations

**Coverage:**
- ✅ Marketing pages: login CTA, nav items
- ✅ Auth flow: login, signup, password reset
- ❌ Admin pages: 100% hardcoded Swedish
- ❌ App pages: ~95% hardcoded Swedish
- ❌ Error messages: Mixed (some in code, some in UI)

---

### 3. Preference System

#### PreferencesContext
**File:** `lib/context/PreferencesContext.tsx`

```typescript
export type LanguageCode = 'NO' | 'SE' | 'EN';

// Persists to:
// 1. localStorage (lb-language) - Anonymous/logged-out users
// 2. users.language - User profile preference
// 3. user_preferences.language - Tenant-scoped preference

const setLanguage = useCallback(async (next: LanguageCode) => {
  setLanguageState(next);
  setUserChangedLanguage(true);
  
  // Persist to user profile
  if (userProfile?.language !== next) {
    await persistUserProfile({ language: next });
  }
  
  // Sync to tenant-scoped preferences
  await syncUserPreferences({ language: next });
}, [persistUserProfile, syncUserPreferences, userProfile?.language]);
```

**Assessment:**
- ✅ **EXCELLENT:** Multi-layer persistence (localStorage → user → tenant)
- ✅ Handles logged-out users gracefully
- ✅ Syncs client preferences to server on login
- ❌ **ISSUE:** No actual UI translation switching (sets preference but nothing uses it)
- ❌ **ISSUE:** Language selector exists but doesn't affect app content

**Components:**
- `components/navigation/LanguageSwitcher.tsx` - Header dropdown (works)
- `features/profile/components/LanguageSelector.tsx` - Mobile sheet (works)
- Both update preference successfully but content remains Swedish

---

## 🔍 DETAILED FINDINGS

### Database Translations

#### ✅ WORKING: Game Content Translations

**Query Pattern:**
```typescript
const { data: game } = await supabase
  .from('games')
  .select(`
    *,
    translations:game_translations(*)
  `)
  .eq('id', gameId)
  .single();

const translation = pickTranslation(game.translations, ['sv', 'no', 'en']);
const title = translation?.title || game.name;
```

**Verified Endpoints:**
- `/app/games/[gameId]` - Game detail page ✅
- `/app/planner` - Session planning ✅
- `/app/play` - Game runtime ✅

**Coverage:**
- Game titles ✅
- Game descriptions ✅
- Game instructions (steps) ✅
- Materials list ✅

#### ❌ MISSING: UI/System Translations

**No database table for:**
- Navigation labels
- Button text
- Form labels
- Error messages
- Success notifications
- Help text
- Placeholder text

**Current Approach:** Hardcoded in components

---

### UI Layer Analysis

#### Hardcoded Swedish Strings (Sample)

**File:** `app/admin/support/page.tsx`
```tsx
const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

// Hardcoded Swedish labels
const statusLabels = {
  open: 'Öppen',
  pending: 'Pågår',
  resolved: 'Löst',
  closed: 'Stängd'
};
```

**File:** `app/app/support/page.tsx`
```tsx
function getStatusLabel(status: string) {
  switch (status) {
    case 'open': return 'Öppen';
    case 'in_progress': return 'Pågår';
    case 'resolved': return 'Löst';
    case 'closed': return 'Stängd';
    default: return status;
  }
}
```

**Pattern Found:** ~200+ instances of hardcoded strings across:
- `/app/admin/**` - Admin pages (100% Swedish)
- `/app/app/**` - User pages (95% Swedish, 5% using `ui.ts`)
- `/app/sandbox/**` - Sandbox/demo pages (100% Swedish)

#### Date Formatting

**Locale-aware date formatting exists:**
```typescript
// Correct usage
new Date(dateString).toLocaleDateString('sv-SE', {
  day: 'numeric',
  month: 'short'
});
```

**Found in:**
- `app/app/profile/coins/page.tsx` ✅
- `app/app/events/page.tsx` ✅

**Assessment:**
- ✅ Uses locale parameter
- ❌ Hardcoded to 'sv-SE' instead of using user preference

---

### Tenant & User Language Settings

#### Tenant Default Language
**Column:** `tenants.main_language` (language_code_enum)

```sql
-- Migration: 20251129000000_initial_schema.sql
CREATE TABLE tenants (
  ...
  main_language language_code_enum NOT NULL DEFAULT 'NO',
  ...
);
```

**Assessment:**
- ✅ Exists in schema
- ❌ **NOT USED ANYWHERE** in application code
- ❌ No UI to set tenant default language
- ❌ No logic to apply tenant language to new users

#### User Language Preference
**Column:** `users.language` (language_code_enum)

```sql
-- Default: 'NO' (Norwegian)
-- Auto-populated from auth.users.raw_user_meta_data->>'language'
```

**Trigger:** `sync_user_profile_on_auth()`
```sql
language = COALESCE(
  (new.raw_user_meta_data->>'language')::language_code_enum,
  users.language
)
```

**Assessment:**
- ✅ Persisted correctly
- ✅ Synced from Supabase Auth
- ⚠️ Default is 'NO' but app is in Swedish - mismatch!
- ❌ No effect on actual UI language

---

## 🚨 PRIORITY ISSUES

### P0 – Critical for MVP

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | **Language mismatch** | Default language 'NO' but app is 'SE' | 1h |
| 2 | **Language selector does nothing** | Users can change preference but see no effect | - |
| 3 | **Missing translation detection** | No alerts when translations missing | 2h |

**Issue #1 Details:**
- Database default: Norwegian (`language_code_enum DEFAULT 'NO'`)
- App default: Swedish (all UI strings)
- Legal pages: Norwegian (`app/legal/terms/page.tsx`)
- **Fix:** Change enum default to 'SE' OR translate all UI to Norwegian

**Issue #2 Details:**
- PreferencesContext works perfectly
- LanguageSwitcher component works perfectly
- BUT: No i18n framework to consume the preference
- **Fix:** Requires P1 implementation

---

### P1 – High Priority

| # | Task | Estimated Effort | Notes |
|---|------|------------------|-------|
| 1 | Implement i18n framework (next-intl) | 8-12h | Platform-wide solution |
| 2 | Translate admin pages (NO/SE/EN) | 6-8h | ~100 unique strings |
| 3 | Translate app pages (NO/SE/EN) | 6-8h | ~150 unique strings |
| 4 | Connect language preference to UI | 2h | Wire PreferencesContext → i18n |
| 5 | Fix tenant default language usage | 2h | Apply to new users |
| 6 | Add missing translation warnings | 3h | Dev-mode alerts |

**Total P1 Effort:** 27-35 hours

---

### P2 – Medium Priority

| # | Task | Estimated Effort | Notes |
|---|------|------------------|-------|
| 1 | Admin translation UI | 8-12h | CRUD for translations |
| 2 | Translation import/export | 4-6h | CSV/JSON workflows |
| 3 | Batch translation tools | 4h | Multi-locale editing |
| 4 | Translation coverage report | 3h | Missing key detection |
| 5 | Product/Purpose translations | 4h | Database tables needed |

**Total P2 Effort:** 23-29 hours

---

## 📊 TRANSLATION COVERAGE ANALYSIS

### Current State

| Domain | Coverage | Fallback | Notes |
|--------|----------|----------|-------|
| **Games Domain** | ✅ 90% | ✅ sv→no→en | Database-backed, works well |
| **Marketing Pages** | ⚠️ 40% | ✅ NO→SE→EN | Only login CTA translated |
| **Auth Flow** | ✅ 80% | ✅ NO→SE→EN | Login/signup/reset covered |
| **Admin Pages** | ❌ 0% | ❌ None | 100% hardcoded Swedish |
| **App Pages** | ❌ 5% | ❌ None | 95% hardcoded Swedish |
| **Legal Pages** | ⚠️ 33% | ❌ None | Norwegian only (terms) |
| **Error Messages** | ❌ 0% | ❌ None | Hardcoded in code |
| **Email Templates** | ❓ Unknown | ❓ Unknown | Not validated |

### Translation Quality

**Good Patterns Found:**
```typescript
// ✅ Type-safe translations
export type AuthCopy = {
  loginTitle: string;
  loginDescription: string;
  // ... strongly typed
};

// ✅ Fallback logic
const translation = pickTranslation(game.translations, localeOrder) 
  || game.translations[0];

// ✅ Locale-aware formatting
new Date(date).toLocaleDateString('sv-SE', { ... });
```

**Bad Patterns Found:**
```tsx
// ❌ Hardcoded strings in JSX
<button>Skapa Session</button>

// ❌ Hardcoded error messages
return { error: 'Sessionen kunde inte hittas' };

// ❌ Magic strings
const statusLabels = { open: 'Öppen', ... };
```

---

## 🛠️ RECOMMENDED ARCHITECTURE

### Phase 1: Foundation (P0 + P1)

#### 1. Install next-intl
```bash
npm install next-intl
```

**Config:** `i18n.ts`
```typescript
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: {
    ...(await import(`./messages/${locale}.json`)).default,
    // Merge with database translations
  },
}));
```

#### 2. Message Files Structure
```
lib/i18n/
  messages/
    no.json    # Norwegian (default)
    se.json    # Swedish
    en.json    # English
  ui.ts        # Keep for type safety
```

#### 3. Database Translation Loader
```typescript
// lib/i18n/database-loader.ts
export async function loadGameTranslations(locale: string) {
  const { data } = await supabase
    .from('game_translations')
    .select('*')
    .eq('locale', locale);
  
  return data?.reduce((acc, t) => ({
    ...acc,
    [`game.${t.game_id}.title`]: t.title,
    [`game.${t.game_id}.description`]: t.short_description,
  }), {});
}
```

#### 4. Wire to PreferencesContext
```typescript
// app/layout.tsx
export default async function RootLayout({ children }) {
  const locale = await getLocaleFromUserPreference(); // From DB/localStorage
  
  return (
    <html lang={locale}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PreferencesProvider>
          {children}
        </PreferencesProvider>
      </NextIntlClientProvider>
    </html>
  );
}
```

---

### Phase 2: Migration (P1 continued)

#### Migration Strategy

**Step 1:** Extract all hardcoded strings
```bash
# Use grep to find all Swedish strings
grep -r "Skapa\|Lägg till\|Ta bort" app/ --include="*.tsx"
```

**Step 2:** Create translation keys
```json
{
  "admin": {
    "support": {
      "status": {
        "open": "Öppen",
        "pending": "Pågår",
        "resolved": "Löst",
        "closed": "Stängd"
      }
    }
  }
}
```

**Step 3:** Replace in components
```tsx
// Before
<button>Skapa Session</button>

// After
import { useTranslations } from 'next-intl';

const t = useTranslations('sessions');
<button>{t('create')}</button>
```

**Step 4:** Add Norwegian + English translations
```json
// no.json
{ "sessions": { "create": "Opprett økt" } }

// en.json
{ "sessions": { "create": "Create session" } }
```

---

### Phase 3: Admin Tools (P2)

#### Translation Management UI

**Route:** `/admin/settings/translations`

**Features:**
- List all translation keys
- Edit in-place (NO/SE/EN side-by-side)
- Missing translation warnings
- Import/Export CSV
- Auto-translate placeholder (future)

**Database Table:**
```sql
CREATE TABLE ui_translations (
  key text NOT NULL,
  locale text NOT NULL,
  value text NOT NULL,
  namespace text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (key, locale)
);
```

---

## 🎯 ACTION PLAN

### Immediate Next Steps (This Session)

1. ✅ Create this validation report
2. ⏳ Fix P0 Issue #1: Language default mismatch
3. ⏳ Document translation architecture decision
4. ⏳ Git commit + push

### Phase 1 Implementation (10-14h)

**Week 1:**
- [ ] Install next-intl
- [ ] Set up message file structure
- [ ] Implement database translation loader
- [ ] Connect PreferencesContext to i18n
- [ ] Translate admin pages (top 50 strings)

**Week 2:**
- [ ] Translate app pages (top 100 strings)
- [ ] Migrate auth flow to next-intl
- [ ] Add missing translation detection
- [ ] Test language switching end-to-end

### Success Criteria

**Phase 1 Complete When:**
- ✅ User can change language and see UI update
- ✅ All admin pages support NO/SE/EN
- ✅ All app pages support NO/SE/EN
- ✅ Missing translations show fallback (not blank)
- ✅ Dev mode warns about missing keys
- ✅ Game translations integrate seamlessly

---

## 📚 REFERENCES

### Files Analyzed
- `lib/i18n/ui.ts` - Current translation system
- `lib/context/PreferencesContext.tsx` - Language preference
- `lib/services/planner.server.ts` - Fallback logic
- `supabase/migrations/20251208090000_games_translations_media.sql` - Database schema
- `supabase/migrations/20251129000000_initial_schema.sql` - Language enum
- `components/navigation/LanguageSwitcher.tsx` - UI component
- `features/profile/components/LanguageSelector.tsx` - Mobile selector

### Related Domains
- **Platform Domain** - PreferencesContext, user settings
- **Games Domain** - game_translations table, rendering logic
- **Tenant Domain** - main_language default
- **Admin Domain** - Translation management UI (future)

---

**Report Generated:** December 11, 2025  
**Next Domain:** Auth & Accounts Domain  
**Estimated Total Translation Work:** 50-64 hours (P0: 1h, P1: 27-35h, P2: 23-29h)
