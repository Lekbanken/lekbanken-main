# Enterprise Translation / i18n Architecture Analysis

> **Phase 0: Architecture & Reality Analysis — Translation / i18n Admin**  
> **Date:** 2026-01-11  
> **Status:** ANALYSIS ONLY — No implementation  
> **Perspective:** Staff+ Product/Platform Engineer & i18n Architect  

---

## 0. EXECUTIVE SUMMARY

### Verdict: **GO** for Translation as first-class admin domain

**Blocker Status:** Critical blocker for NO/EN market sales.

**Problem Core:** Lekbanken has multiple separate translation mechanisms (UI TS-dict, Planner JSON, Game DB translations), but no unified i18n runtime that actually affects Admin/App UI. Preferences exist, but 95%+ of UI is hardcoded Swedish.

### Recommended Target Architecture: Hybrid Enterprise Model

| Layer | Technology | Scope |
|-------|------------|-------|
| System/UI strings | **next-intl** | Namespaced + typed keys, SSR support, build-time bundles |
| Content translations | **Database** | Courses, achievements, shop, KB/FAQ, notification templates |
| Admin Translation Hub | **New domain** | DB-content editing + coverage metrics + (Phase 3) managed overrides |

### Minimal Path to "Sellable NO + EN"

1. **Establish global locale resolver** (cookie/user pref/tenant default) — ensure Admin/App shell renders in NO/EN
2. **Migrate top 100-200 UI strings** (nav, core buttons, form actions, errors) to next-intl
3. **Add NO to Planner** (`lib/planner/locales.json` — currently missing)
4. **Make Learning content translatable** (DB model or translation overlay)

### Estimated Effort

| Phase | Duration | Outcome |
|-------|----------|--------|
| Phase 1 | 4-6 weeks | Sellable NO+EN minimum |
| Phase 2 | 4-6 weeks | Full content translations |
| Phase 3 | 3-4 weeks | Enterprise features (TMS, overrides) |

---

## Table of Contents

1. [Factual Inventory](#1-factual-inventory)
2. [Problem Statement & Business Impact](#2-problem-statement--business-impact)
3. [Enterprise Target Architecture](#3-enterprise-target-architecture)
4. [Admin Translation Hub IA & Permissions](#4-admin-translation-hub-ia--permissions)
5. [Phased Migration Plan](#5-phased-migration-plan)
6. [Data Model Proposal](#6-data-model-proposal)
7. [Test & QA Strategy](#7-test--qa-strategy)
8. [Decisions Needed](#8-decisions-needed)

---

## 1. FACTUAL INVENTORY

### 1.1 Current Translation Mechanisms

| Mechanism | File Path | Languages | String Count | Scope | Admin UI |
|-----------|-----------|-----------|--------------|-------|----------|
| Marketing/Auth Copy | `lib/i18n/ui.ts` | NO, SE, EN | ~50 | Marketing nav, Auth forms | ❌ None |
| Planner Domain | `lib/planner/locales.json` | SV, EN only | ~100 | Planner UI strings | ❌ None |
| Planner Utilities | `lib/planner/i18n.ts` | SV, EN | - | Type-safe `t()`, `scopedT()` | ❌ None |
| Game Content | `game_translations` table | sv, no, en | Dynamic | Game titles, descriptions | ✅ Via Game Builder |
| Game Steps/Phases | `game_steps`, `game_phases`, etc. | sv, no, en | Dynamic | Game content details | ✅ Via Game Builder |

### 1.3 Domain Translation Readiness (Risk-Based)

| Domain | Status Today | Blocks NO? | Blocks EN? | Comment |
|--------|--------------|------------|------------|--------|
| **Admin UI** | ~100% SV | ✅ YES | ✅ **CRITICAL** | Requires i18n framework + extraction |
| **App UI (core)** | ~95% SV | ✅ YES | ✅ **CRITICAL** | Language choice has almost no effect |
| **Planner** | SV/EN only | ✅ YES | Partial | NO missing from locales.json |
| **Games** | Translated in DB | ❌ No | ❌ No | Strong foundation |
| **Learning** | Single-lang | ✅ YES | ✅ YES | Needs content-translations table |
| **Notifications** | Single-lang | ⚠️ Medium | ⚠️ High | Needs templates + locale |
| **Errors/Messages** | Hardcoded SV | ⚠️ High | ⚠️ High | Needs central error i18n |
| **Support/KB** | Has translations | ❌ No | ❌ No | Per Support Phase 2 design |

### 1.3 Language Resolution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LANGUAGE RESOLUTION FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. PreferencesContext (lib/context/PreferencesContext.tsx)         │
│     └── Reads from: localStorage → users.language → cookie          │
│     └── Persists to: localStorage, user_preferences, users.language │
│     └── VALUES: 'NO' | 'SE' | 'EN' (enum LanguageCode)              │
│                                                                     │
│  2. Marketing/Auth → lib/i18n/ui.ts                                 │
│     └── getUiCopy(lang) returns typed copy                          │
│     └── Works correctly ✅                                          │
│                                                                     │
│  3. Planner Domain → lib/planner/i18n.ts                            │
│     └── usePlannerTranslations(), t(), scopedT()                    │
│     └── DEFAULT_LOCALE = 'sv'                                       │
│     └── Missing NO translations ⚠️                                  │
│                                                                     │
│  4. Game Content → lib/services/planner.server.ts                   │
│     └── pickTranslation(translations, preferredLocales)             │
│     └── DEFAULT_LOCALE_ORDER = ['sv', 'no', 'en']                   │
│     └── Falls back through locales                                  │
│                                                                     │
│  5. Admin / App Pages                                               │
│     └── HARDCODED SWEDISH ❌                                        │
│     └── No translation mechanism applied                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 Database Schema Analysis

#### Existing Language Infrastructure

| Table/Column | Type | Purpose | Status |
|--------------|------|---------|--------|
| `language_code_enum` | ENUM | `('NO', 'SE', 'EN')` | ✅ Defined |
| `users.language` | `language_code_enum` | User preference | ✅ Used |
| `tenants.main_language` | `language_code_enum` | Tenant default | ⚠️ **NOT APPLIED** |
| `game_translations.locale` | TEXT | Game content locale | ✅ Used |
| `game_steps.locale` | TEXT (nullable) | Step locale override | ✅ Used |
| `game_phases.locale` | TEXT (nullable) | Phase locale override | ✅ Used |
| `game_roles.locale` | TEXT (nullable) | Role locale override | ✅ Used |
| `game_materials.locale` | TEXT (nullable) | Material locale override | ✅ Used |
| `game_board_config.locale` | TEXT (nullable) | Board config locale | ✅ Used |

#### Missing Tables

| Proposed Table | Purpose | Priority |
|----------------|---------|----------|
| `ui_translations` | System/Admin UI strings | HIGH |
| `translation_keys` | Translation key registry | MEDIUM |
| `translation_audit_log` | Change tracking | MEDIUM |

### 1.5 Hardcoded String Analysis

#### By Directory (TSX files)

| Directory | File Count | Estimated Strings | Priority |
|-----------|------------|-------------------|----------|
| `app/admin` | 136 | ~5,000+ | **CRITICAL** |
| `app/app` | 41 | ~1,500+ | HIGH |
| `components` | 146 | ~2,000+ | HIGH |
| `features` | 356 | ~1,200+ | MEDIUM |
| **Total** | **679** | **~9,700+** | - |

#### Common Swedish UI Words Found

| Swedish Term | Count | English Equivalent |
|--------------|-------|-------------------|
| "Organisation" | 203 | Organization |
| "Visa" | 154 | Show/View |
| "Skapa" | 143 | Create |
| "Välj" | 116 | Select/Choose |
| "Spara" | 98 | Save |
| "Ta bort" | 68 | Delete |
| "Inställningar" | 65 | Settings |
| "Lägg till" | 61 | Add |
| "Laddar" | 61 | Loading |
| "Redigera" | 36 | Edit |
| "Avbryt" | 31 | Cancel |
| "Stäng" | 28 | Close |
| "Konto" | 20 | Account |
| "Ändra" | 17 | Change |
| "Bekräfta" | 16 | Confirm |
| **Sample Total** | **~1,100** | - |

> **Extrapolation:** With 1,100+ matches from 17 common words, total unique translatable strings estimated at **3,000-4,000** across codebase.

#### Hardcoded Locale Formatters

| Pattern | Count | Files Affected |
|---------|-------|----------------|
| `Intl.DateTimeFormat(...'sv-SE')` | 11+ | Various |
| `toLocaleDateString('sv-SE')` | 50+ | Various |
| `toLocaleString('sv-SE')` | 15+ | Various |

### 1.6 i18n Library Status

```json
// package.json analysis
{
  "next-intl": "NOT INSTALLED",
  "react-i18next": "NOT INSTALLED", 
  "i18next": "NOT INSTALLED",
  "formatjs": "NOT INSTALLED"
}
```

**Current State:** No industry-standard i18n library is installed.

### 1.7 Admin Route Inventory

| Route | Exists | Translation Status |
|-------|--------|-------------------|
| `/admin/translation` | ❌ **DOES NOT EXIST** | - |
| `/admin/translations` | ❌ **DOES NOT EXIST** | - |
| `/admin/settings` | ✅ Exists | No language section |
| `/admin/settings/language` | ❌ **DOES NOT EXIST** | - |

---

## 2. PROBLEM STATEMENT & BUSINESS IMPACT

### 2.1 Core Problems

#### Problem #1: Fragmented Translation Architecture

**Evidence:**
- 3 isolated translation mechanisms with no unified interface
- No shared translation loading or caching
- Inconsistent locale codes: `NO/SE/EN` vs `sv/no/en`
- No fallback chain between mechanisms

**Impact:**
- Developer confusion and inconsistent patterns
- Duplicate translation logic
- No single source of truth

#### Problem #2: 95%+ UI is Hardcoded Swedish

**Evidence:**
- ~9,700+ potential hardcoded Swedish strings
- 679 TSX files, only ~150 strings are internationalized
- Admin panel entirely in Swedish
- App pages entirely in Swedish

**Impact:**
- **EN Market: ❌ NOT SELLABLE** — 95%+ UI untranslated
- **NO Market: ⚠️ PARTIALLY BLOCKED** — Planner lacks NO, Admin is Swedish
- **SE Market: ✅ Sellable** — Native Swedish works

#### Problem #3: Language Preference Has No Effect

**Evidence:**
- User can change preference in Settings
- Preference persists correctly to `users.language`
- UI remains Swedish regardless of preference

**Impact:**
- User frustration
- False promise of localization
- Support burden

#### Problem #4: Tenant Language Configuration Unused

**Evidence:**
- `tenants.main_language` column exists in database
- Column is NEVER READ in application code
- No tenant-level language inheritance

**Impact:**
- Multi-tenant language strategy broken
- Cannot offer tenant-specific defaults

#### Problem #5: Missing Norwegian in Planner

**Evidence:**
- `lib/planner/locales.json` contains only `sv` and `en`
- `NO` is a supported `language_code_enum` value
- DEFAULT_LOCALE_ORDER includes 'no' but translations missing

**Impact:**
- Norwegian users see Swedish fallback in Planner
- Inconsistent language experience

### 2.2 Business Impact Matrix

| Market | Current State | Revenue Risk | Priority |
|--------|---------------|--------------|----------|
| 🇸🇪 Sweden | ✅ Sellable | None | Maintain |
| 🇳🇴 Norway | ⚠️ Partial | MEDIUM | HIGH |
| 🇬🇧 English | ❌ Blocked | **HIGH** | **CRITICAL** |
| 🌍 Future | ❌ No foundation | HIGH | Architecture |

### 2.3 Trust & Compliance Risk

| Risk | Impact | Evidence |
|------|--------|----------|
| Mixed language UI | "Unfinished product" signal | NO preference but SV UI renders |
| Hardcoded `<html lang="sv">` | SEO/accessibility issues | `app/layout.tsx` always `lang="sv"` |
| Hydration mismatch potential | Runtime errors | Server renders SV, client expects locale |
| WCAG compliance | Accessibility audit failure | `lang` attribute must match content |

### 2.4 Sales Enablement Blockers

| Blocker | Markets Affected | Minimum Fix |
|---------|------------------|-------------|
| Admin panel Swedish-only | EN, NO | Admin i18n framework |
| App pages Swedish-only | EN, NO | App i18n framework |
| Planner missing NO | NO | Add NO to locales.json |
| Date/number formatting hardcoded | EN, NO | Locale-aware formatters |

---

## 3. ENTERPRISE TARGET ARCHITECTURE

### 3.1 Architecture Options Analysis

#### Option A: File-Based (next-intl)

```
├── messages/
│   ├── en.json
│   ├── sv.json
│   └── no.json
├── lib/i18n/
│   ├── config.ts
│   └── request.ts
```

| Criteria | Score | Notes |
|----------|-------|-------|
| Performance | ⭐⭐⭐⭐⭐ | Build-time bundling, zero runtime DB calls |
| DX | ⭐⭐⭐⭐⭐ | Type-safe, IDE autocomplete |
| Admin Editing | ⭐⭐ | Requires code change + deploy |
| TMS Integration | ⭐⭐⭐⭐ | Export/import workflows |
| Multi-tenant | ⭐⭐ | All tenants share strings |
| Maintenance | ⭐⭐⭐⭐⭐ | Industry standard patterns |

**Best For:** UI system strings, Admin interface, fixed copy

#### Option B: Database-Driven

```
ui_translations
├── id
├── key (namespaced: "admin.users.create")
├── locale (sv, no, en)
├── value
├── tenant_id (nullable for system)
├── created_at
└── updated_at
```

| Criteria | Score | Notes |
|----------|-------|-------|
| Performance | ⭐⭐⭐ | Requires caching strategy |
| DX | ⭐⭐⭐ | Needs custom tooling |
| Admin Editing | ⭐⭐⭐⭐⭐ | Live editing without deploy |
| TMS Integration | ⭐⭐⭐ | Custom import/export |
| Multi-tenant | ⭐⭐⭐⭐⭐ | Per-tenant overrides native |
| Maintenance | ⭐⭐⭐ | Custom code to maintain |

**Best For:** Dynamic content, per-tenant customization, game content

#### Option C: TMS Integration (Lokalise/Phrase)

| Criteria | Score | Notes |
|----------|-------|-------|
| Performance | ⭐⭐⭐⭐ | CDN-cached files |
| DX | ⭐⭐⭐⭐ | CLI-based workflows |
| Admin Editing | ⭐⭐⭐⭐⭐ | External UI for translators |
| TMS Integration | ⭐⭐⭐⭐⭐ | Native |
| Multi-tenant | ⭐⭐ | Complex branching needed |
| Maintenance | ⭐⭐⭐⭐ | Managed service |
| Cost | 💰💰💰 | Monthly subscription |

**Best For:** Large translation teams, external translators

### 3.2 Recommended Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HYBRID TRANSLATION ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: next-intl (System Strings)                                │
│  ├── Admin UI strings (buttons, labels, messages)                   │
│  ├── App UI strings (navigation, forms, errors)                     │
│  ├── Marketing copy                                                 │
│  ├── Auth flows                                                     │
│  └── Bundled at build time, type-safe                               │
│                                                                     │
│  Layer 2: Database (Dynamic Content)                                │
│  ├── Game content (existing game_translations)                      │
│  ├── Tenant-specific overrides (optional)                           │
│  ├── User-generated content                                         │
│  └── Runtime loading with SWR caching                               │
│                                                                     │
│  Layer 3: Unified API                                               │
│  ├── useTranslation() hook (merges both layers)                     │
│  ├── Locale-aware formatters (dates, numbers, currency)             │
│  ├── Language resolution (user → tenant → system default)           │
│  └── Missing key detection + telemetry                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Language Resolution Algorithm

```typescript
// Proposed resolution order (enterprise-precedence)
function resolveLocale(): Locale {
  return (
    urlPathLocale()           // /en/admin (if using path-based routing)
    ?? cookieLocale()         // lb_locale cookie
    ?? userPreference()       // users.language
    ?? tenantDefault()        // tenants.main_language (NEW - must implement)
    ?? browserLocale()        // Accept-Language header
    ?? systemDefault()        // 'en' (enterprise default)
  );
}
```

**Requirement:** Resolver must be available in both Server Components and Client (SSR/CSR parity).

### 3.4 Fallback Strategy

| Fallback Type | Chain | Notes |
|---------------|-------|-------|
| **Global** | → EN | Enterprise norm |
| **Regional (Nordic)** | NO → SV → EN | Or SV → NO → EN (decision needed) |
| **Domain-specific** | Planner: SV → EN (until NO complete) | Temporary |

### 3.5 Governance: Enterprise Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSLATION WORKFLOW STATES                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────┐    ┌───────────┐    ┌──────────┐    ┌───────────┐    │
│   │  DRAFT  │ →  │ IN_REVIEW │ →  │ APPROVED │ →  │ PUBLISHED │    │
│   └─────────┘    └───────────┘    └──────────┘    └───────────┘    │
│       ↑                                                ↓            │
│       └────────────── (reject / edit) ─────────────────┘            │
│                                                                     │
│   Ownership:                                                        │
│   • system_admin: owns global system strings                        │
│   • content_owner: owns content translations                        │
│   • tenant_admin: owns tenant-scoped content                        │
│                                                                     │
│   Audit: updated_by, diff, timestamp, scope (tenant/global)         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.6 Security Model

| Role | System Strings | Content (Global) | Content (Tenant) | Tenant Overrides |
|------|----------------|-------------------|------------------|------------------|
| `system_admin` | Full CRUD | Full CRUD | Full CRUD | Full CRUD |
| `tenant_admin` | Read-only | Read-only | Full CRUD (own) | Full CRUD (own) |
| `staff` | Read-only | Read-only | Read-only (own) | None |
| `user` | None | Read published | Read published | None |

### 3.7 Formatter Infrastructure

```typescript
// lib/i18n/formatters.ts
import { useLocale } from 'next-intl';

export function useFormatters() {
  const locale = useLocale();
  
  return {
    date: (date: Date, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, options).format(date),
    
    number: (num: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(num),
    
    currency: (amount: number, currency = 'SEK') =>
      new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount),
    
    relativeTime: (date: Date) =>
      new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(/*...*/),
  };
}
```

### 3.8 Performance, Caching & Bundle Control

#### System Strings (next-intl)

| Aspect | Strategy |
|--------|----------|
| Namespaces | `common`, `admin`, `app`, `learning`, `support`, `errors` |
| Bundle | Lazy-load per route (minimize initial payload) |
| Caching | Server-side cache per locale, invalidate on deploy |

#### DB Content

| Aspect | Strategy |
|--------|----------|
| Read path | SWR/stale-while-revalidate for published content |
| Invalidation | `updated_at` + Next.js revalidation tags |
| Real-time | Supabase realtime triggers (Phase 3) |

---

## 4. ADMIN TRANSLATION HUB IA & PERMISSIONS

### 4.1 Information Architecture

Based on [ADMIN_NAVIGATION_MASTER.md](ADMIN_NAVIGATION_MASTER.md), translation belongs in **System** group:

```
System (system_admin only)
├── Fakturering
├── Notifikationer
├── System Health
├── Granskningslogg
├── Feature Flags
├── API-nycklar
├── Webhooks
├── Incidenter
├── Release Notes
├── Inställningar
└── 📍 Översättningar (NEW) ← /admin/translations
```

### 4.2 Route Structure & Navigation

```
/admin/translation (primary route - consistent with Learning/Support)
│
├── Översättningar (Parent)
│   ├── Översikt (Hub)           → /admin/translation
│   ├── Systemtexter (UI)        → /admin/translation/system
│   │   ├── Admin namespace      → /admin/translation/system/admin
│   │   ├── App namespace        → /admin/translation/system/app
│   │   ├── Common namespace     → /admin/translation/system/common
│   │   └── Errors namespace     → /admin/translation/system/errors
│   ├── Innehåll (Content)       → /admin/translation/content
│   │   ├── Learning (Kurser)    → /admin/translation/content/learning
│   │   ├── Gamification         → /admin/translation/content/gamification
│   │   ├── Support (KB/FAQ)     → /admin/translation/content/support
│   │   └── Notifications        → /admin/translation/content/notifications
│   ├── Import/Export            → /admin/translation/import-export
│   └── Historik & Granskning    → /admin/translation/audit
```

### 4.3 Hub Dashboard Widgets (Enterprise)

| Widget | Description | Data Source |
|--------|-------------|-------------|
| Coverage per namespace | NO/SE/EN completion % | Message catalog analysis |
| Missing keys trend | Last 7/30 days | Runtime telemetry |
| Most missing in production | Top 10 keys | Production telemetry |
| Recent changes | Audit feed | `translation_audit_log` |
| Pending reviews | Awaiting approval | Workflow state query |

### 4.4 Permission Matrix

| Role | View System | Edit System | View Content | Edit Content | Tenant Override |
|------|-------------|-------------|--------------|--------------|-----------------|
| `system_admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tenant_admin` | ✅ | ❌ | ✅ (own tenant) | ✅ (own tenant) | ✅ (own tenant) |
| `staff` | ✅ | ❌ | ✅ (own tenant) | ❌ | ❌ |
| `user` | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4.5 System Strings Editor (next-intl Messages)

| Feature | Description |
|---------|-------------|
| Side-by-side | NO/SE/EN for each key |
| Status flags | Missing / Stale / Identical to fallback |
| Bulk edit | CSV import/export |
| Phase 1 mode | Read-only + export (code-owned) |
| Phase 3 mode | Full CRUD via managed pipeline |

### 4.6 Content Editor (DB)

| Feature | Description |
|---------|-------------|
| Entity picker | Course / Achievement / FAQ / Template |
| Side-by-side | Locale editing |
| Workflow | Draft → Publish flow + preview |
| Scope toggle | Global / Tenant (system_admin only) |

### 4.7 Admin UI Wireframe Concept

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🌐 Översättningar                                    [EN ▼] [Export]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Translation Coverage                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │
│  │   🇸🇪 SE    │ │   🇳🇴 NO    │ │   🇬🇧 EN    │                   │
│  │   100%     │ │    65%      │ │    42%      │                   │
│  │  ████████  │ │  █████░░░░  │ │  ████░░░░░  │                   │
│  └─────────────┘ └─────────────┘ └─────────────┘                   │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Namespace       │ SE    │ NO    │ EN    │ Actions             │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ admin.common    │ 100%  │ 85%   │ 60%   │ [View] [Edit]       │ │
│  │ admin.users     │ 100%  │ 80%   │ 55%   │ [View] [Edit]       │ │
│  │ admin.games     │ 100%  │ 90%   │ 45%   │ [View] [Edit]       │ │
│  │ app.planner     │ 100%  │ 0%    │ 100%  │ [View] [Edit]       │ │
│  │ app.dashboard   │ 100%  │ 70%   │ 40%   │ [View] [Edit]       │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Missing Translations (NO) — 847 keys                    [Export]  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Key                          │ SE Value        │ NO Value     │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ admin.users.create_button    │ "Skapa"         │ ⚠️ Missing   │ │
│  │ admin.users.delete_confirm   │ "Ta bort?"      │ ⚠️ Missing   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. PHASED MIGRATION PLAN

### 5.1 Phase Overview

| Phase | Focus | Duration | Outcome |
|-------|-------|----------|---------|
| **Phase 1** | Foundation + Sellable NO/EN | 4-6 weeks | next-intl installed, EN+NO markets unblocked |
| **Phase 2** | Admin Complete + Content | 4-6 weeks | Full admin i18n, content translations |
| **Phase 3** | Enterprise Features | 3-4 weeks | Admin hub, TMS, tenant overrides |

### 5.2 Phase 1: Foundation (Sales Enablement)

**Goal:** Unblock EN market with minimum viable i18n

#### 5.2.1 Technical Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Install & configure next-intl | 2h | P0 |
| Create `messages/en.json` structure | 4h | P0 |
| Create `messages/sv.json` (extract current) | 8h | P0 |
| Create `messages/no.json` (copy SV, mark for translation) | 2h | P1 |
| Implement middleware for locale detection | 2h | P0 |
| Update PreferencesContext to use next-intl locale | 4h | P0 |
| Apply tenants.main_language in resolution | 2h | P1 |
| Add NO to `lib/planner/locales.json` | 1h | P0 |

#### 5.2.2 Migration Strategy for Hardcoded Strings

```typescript
// BEFORE (hardcoded Swedish)
<Button>Skapa användare</Button>

// AFTER (internationalized)
const t = useTranslations('admin.users');
<Button>{t('createUser')}</Button>

// messages/sv.json
{
  "admin": {
    "users": {
      "createUser": "Skapa användare"
    }
  }
}

// messages/en.json
{
  "admin": {
    "users": {
      "createUser": "Create user"
    }
  }
}
```

#### 5.2.3 Priority Files (Phase 1)

| File/Component | String Count | Priority |
|----------------|--------------|----------|
| `components/ui/*` | ~200 | P0 — Shared components |
| `app/admin/layout.tsx` | ~20 | P0 — Admin shell |
| `app/admin/page.tsx` | ~50 | P0 — Dashboard |
| `app/admin/users/*` | ~100 | P0 — Core CRUD |
| `app/admin/organisations/*` | ~100 | P0 — Core CRUD |
| `components/navigation/*` | ~50 | P0 — Navigation |

#### 5.2.4 Acceptance Criteria (Phase 1)

| Criterion | Verification |
|-----------|-------------|
| ✅ next-intl installed and configured | `package.json` + `next.config.ts` |
| ✅ Locale resolver works (user → tenant → default) | Unit tests pass |
| ✅ `/admin` renders correctly in EN/NO | E2E Playwright |
| ✅ `/admin/users` CRUD fully translated | Manual + E2E |
| ✅ `/admin/organisations` CRUD fully translated | Manual + E2E |
| ✅ Navigation fully translated | Visual inspection |
| ✅ Date/number formatters use locale | Unit tests |
| ✅ Planner works in NO | `locales.json` includes NO |
| ✅ `<html lang>` matches resolved locale | No hydration warnings |
| ✅ No mixed-language clusters on main pages | QA checklist |
| ✅ **Sales can demo EN version** | Stakeholder sign-off |

#### 5.2.5 Rollback Plan

```typescript
// Feature flag for i18n runtime
const FEATURE_FLAGS = {
  i18n_enabled: process.env.NEXT_PUBLIC_I18N_ENABLED === 'true',
};

// Fallback to SV-hardcoded mode if disabled
function useTranslation(namespace: string) {
  if (!FEATURE_FLAGS.i18n_enabled) {
    return { t: (key: string) => SWEDISH_FALLBACK[key] ?? key };
  }
  return useNextIntlTranslations(namespace);
}
```

#### 5.2.6 Non-Goals (Phase 1)

- ❌ Full admin editing of system strings via DB
- ❌ Tenant translation overrides
- ❌ Full content translation coverage
- ❌ TMS integration

### 5.3 Phase 2: Admin Complete + Content Translations

**Goal:** All commercially relevant content can be translated without deploy.

#### 5.3.1 DB Models for Content Translations

| Table | Parent Entity | Fields |
|-------|---------------|--------|
| `learning_course_translations` | `learning_courses` | title, description, content_json |
| `learning_path_translations` | `learning_paths` | title, description |
| `achievement_translations` | `achievements` | title, description, criteria_text |
| `shop_item_translations` | `shop_items` | name, description |
| `notification_template_translations` | `notification_templates` | subject, body |
| `support_faq_translations` | (already designed per Support Phase 2) | - |

#### 5.3.2 UI Scope

| Domain | Files | Estimated Strings |
|--------|-------|-------------------|
| Content (Games, Planner, Purposes) | 25 | ~400 |
| Library (Badges, Coach Diagrams) | 15 | ~200 |
| Toolbelt | 10 | ~150 |
| Gamification | 20 | ~350 |
| Live Operations | 25 | ~400 |
| Analytics | 10 | ~150 |
| System | 30 | ~500 |
| **Total** | **135** | **~2,150** |

#### 5.3.3 Migration Tooling

```bash
# Proposed CLI helper
npx i18n-extract scan ./app/admin --output ./extracted-strings.json
npx i18n-extract convert ./extracted-strings.json --to ./messages/
```

#### 5.3.4 Telemetry (Phase 2)

```typescript
// Runtime missing key detection
function onMissingKey(namespace: string, key: string, locale: string) {
  // Log to telemetry service
  telemetry.track('translation.missing_key', {
    namespace,
    key,
    locale,
    url: window.location.pathname,
    timestamp: Date.now(),
  });
}
```

#### 5.3.5 Acceptance Criteria (Phase 2)

| Criterion | Verification |
|-----------|-------------|
| ✅ All 135 admin TSX files internationalized | Code review |
| ✅ ~2,150 strings translated to EN and NO | Coverage report |
| ✅ Zero hardcoded Swedish in `/admin/*` | ESLint rule passes |
| ✅ Content translation CRUD works | E2E tests |
| ✅ Tenant admin can manage own translations | Permission tests |
| ✅ Missing key telemetry active | Dashboard visible |
| ✅ Error/toast/validation messages i18n | Manual QA |
| ✅ **NO market fully enabled** | Stakeholder sign-off |

### 5.4 Phase 3: Enterprise Features

**Goal:** Admin translation hub, TMS integration, tenant overrides

#### 5.4.1 Features

| Feature | Description | Priority |
|---------|-------------|----------|
| `/admin/translation` hub | View/edit translations, coverage dashboard | P0 |
| Tenant terminology overrides | Per-tenant string customization (opt-in) | P1 |
| Full review workflow + roles | Translator → Reviewer → Publisher | P1 |
| External TMS integration | Phrase/Lokalise with CI sync | P1 |
| Idempotent translation pipelines | Diffing, versioning, merge strategies | P2 |
| Automated regression checks | ESLint + CI: "no new hardcoded strings" | P0 |
| Translation memory | Suggest similar translations | P2 |

#### 5.4.2 Admin Hub Implementation

```
/admin/translations
├── page.tsx                 # Coverage dashboard
├── system/
│   └── [namespace]/page.tsx # Namespace editor
├── content/
│   └── page.tsx             # Game content translations
├── missing/
│   └── page.tsx             # Missing key report
└── settings/
    └── page.tsx             # Language config
```

#### 5.4.3 Definition of Done (Phase 3)

- [ ] Admin translation hub deployed
- [ ] Translation coverage metrics visible
- [ ] Missing translations tracked
- [ ] Export/import workflow functional
- [ ] Tenant overrides architecture complete
- [ ] Documentation complete

---

## 6. DATA MODEL PROPOSAL

### 6.1 System Translations (File-Based)

No new database tables needed for system strings. Use next-intl file structure:

```
messages/
├── en.json          # ~3,000 keys
├── sv.json          # ~3,000 keys (source)
└── no.json          # ~3,000 keys
```

### 6.2 Tenant Overrides (Optional DB Extension)

```sql
-- Only if tenant customization is required
CREATE TABLE tenant_translation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,           -- e.g., "admin.users.createUser"
  locale TEXT NOT NULL,        -- e.g., "sv"
  value TEXT NOT NULL,         -- e.g., "Lägg till medarbetare"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(tenant_id, key, locale)
);

-- RLS Policy
CREATE POLICY tenant_overrides_policy ON tenant_translation_overrides
  USING (
    is_system_admin() OR
    has_tenant_role(tenant_id, 'tenant_admin')
  );
```

### 6.3 Translation Audit Log

```sql
CREATE TABLE translation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,        -- 'create', 'update', 'delete'
  table_name TEXT NOT NULL,    -- 'tenant_translation_overrides', 'game_translations'
  record_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.4 Missing Translation Tracking

```sql
CREATE TABLE translation_missing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  locale TEXT NOT NULL,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  occurrence_count INTEGER DEFAULT 1,
  source_url TEXT,             -- Where it was detected
  UNIQUE(key, locale)
);
```

---

## 7. TEST & QA STRATEGY

### 7.1 Testing Pyramid

```
                    ┌───────────┐
                    │   E2E     │  Playwright: Full user journeys per locale
                   ┌┴───────────┴┐
                   │ Integration │  Vitest: API + DB translation loading
                  ┌┴─────────────┴┐
                  │    Unit       │  Vitest: formatters, resolution, hooks
                 ┌┴───────────────┴┐
                 │   Static        │  TypeScript: Type-safe translation keys
                └─────────────────┘
```

### 7.2 Test Categories

#### 7.2.1 Unit Tests

```typescript
// lib/i18n/__tests__/formatters.test.ts
describe('useFormatters', () => {
  it('formats date according to locale', () => {
    const { date } = useFormattersMock('sv');
    expect(date(new Date('2025-01-07'))).toBe('7 januari 2025');
    
    const { date: dateEn } = useFormattersMock('en');
    expect(dateEn(new Date('2025-01-07'))).toBe('January 7, 2025');
  });
});

// lib/i18n/__tests__/resolution.test.ts
describe('resolveLocale', () => {
  it('prefers user preference over tenant default', () => {
    expect(resolveLocale({ userPref: 'en', tenantDefault: 'sv' })).toBe('en');
  });
  
  it('falls back to tenant default when no user preference', () => {
    expect(resolveLocale({ userPref: null, tenantDefault: 'no' })).toBe('no');
  });
});
```

#### 7.2.2 Integration Tests

```typescript
// tests/integration/translations.test.ts
describe('Translation Loading', () => {
  it('loads all keys for each locale', async () => {
    const locales = ['sv', 'en', 'no'];
    for (const locale of locales) {
      const messages = await loadMessages(locale);
      expect(Object.keys(messages)).toHaveLength(/* expected count */);
    }
  });
  
  it('has no missing keys between locales', async () => {
    const sv = await loadMessages('sv');
    const en = await loadMessages('en');
    const missingInEn = findMissingKeys(sv, en);
    expect(missingInEn).toHaveLength(0);
  });
});
```

#### 7.2.3 E2E Tests (Playwright)

```typescript
// tests/e2e/i18n/admin-locale.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Localization', () => {
  test('renders admin in English when preference is EN', async ({ page }) => {
    await page.goto('/admin');
    await setUserLanguage(page, 'EN');
    await page.reload();
    
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  });
  
  test('renders admin in Norwegian when preference is NO', async ({ page }) => {
    await page.goto('/admin');
    await setUserLanguage(page, 'NO');
    await page.reload();
    
    await expect(page.getByRole('heading', { name: 'Oversikt' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Opprett' })).toBeVisible();
  });
});
```

### 7.3 Translation Coverage Metrics

```typescript
// scripts/i18n-coverage.ts
interface CoverageReport {
  locale: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  percentage: number;
}

// Run in CI
npm run i18n:coverage -- --min-coverage=80 --fail-on-missing
```

### 7.4 Guardrails (Lint / Codemod)

#### ESLint Rule: No Hardcoded Swedish

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXText[value=/[\\u00C0-\\u00FF]/]', // Swedish chars
        message: 'Use t() for translated strings',
      },
    ],
  },
  overrides: [
    {
      files: ['app/admin/**/*.tsx', 'app/app/**/*.tsx'],
      // Gradual rollout: allowlist per folder initially
    },
  ],
};
```

#### Codemod: Convert Common Actions

```bash
# Transform "Spara" → t('common.save')
npx jscodeshift -t codemods/i18n-common-actions.ts app/admin/
```

#### CI Gate

```bash
# Fail if new hardcoded strings in targeted directories
npm run lint:i18n -- --max-warnings=0
```

### 7.5 CI Pipeline Integration

```yaml
# .github/workflows/i18n-check.yml
name: i18n Checks

on: [push, pull_request]

jobs:
  i18n:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: npm ci
      
      - name: Validate translation files
        run: npm run i18n:validate
      
      - name: Check for missing keys
        run: npm run i18n:missing --fail-on-missing
      
      - name: Check translation coverage
        run: npm run i18n:coverage --min=80
      
      - name: Lint for hardcoded strings
        run: npm run lint:i18n -- --max-warnings=0
      
      - name: Run i18n E2E tests
        run: npx playwright test tests/e2e/i18n/
```

### 7.6 Observability

| Metric | Description | Dashboard |
|--------|-------------|----------|
| Missing keys per release | Count of fallback usage | Admin Translation Hub |
| Top missing keys | Most frequent missing keys | Admin Translation Hub |
| Translation coverage % | Per namespace, per locale | Admin Translation Hub |
| Fallback chain usage | How often fallback is triggered | Telemetry |

### 7.7 QA Checklist Per Locale

- [ ] All pages render without console errors
- [ ] No visible Swedish text when locale is EN/NO
- [ ] Date formats match locale expectations
- [ ] Number formats match locale expectations
- [ ] Currency displays correctly
- [ ] Forms validate with localized messages
- [ ] Error messages display in correct locale
- [ ] Navigation labels are translated
- [ ] Modal dialogs are translated
- [ ] Toast notifications are translated
- [ ] Empty states are translated
- [ ] Loading states are translated

---

## 8. DECISIONS NEEDED

### 8.1 Critical Decisions (Must Decide Before Phase 1)

| # | Decision | Options | Recommendation | Impact |
|---|----------|---------|----------------|--------|
| **D1** | **Locale routing strategy** | Cookie-only / URL segment | Cookie + header (fastest, no URL changes) | Architecture |
| **D2** | **System default locale** | NO / EN / SV | EN (enterprise norm) | Fallback behavior |
| **D3** | **Fallback order NO↔SV** | NO→SV→EN / SV→NO→EN | NO→SV→EN (Nordic preference) | Mixed-language perception |
| **D4** | **Tenant admin translation access** | Yes / No / Scoped | Yes, scoped to own tenant | Permission model |
| **D5** | **System strings editing** | DB runtime / Pipeline / Code-only | Code-only Phase 1, Pipeline Phase 3 | Risk vs. flexibility |
| **D6** | **Approval workflow from start?** | Full workflow / Publish toggle only | Publish toggle Phase 1, workflow Phase 3 | Complexity |
| **D7** | **TMS budget (if any)** | Phrase / Lokalise / None | Evaluate Phase 3 | Cost |

### 8.2 Product Decisions

| ID | Decision | Options | Recommendation | Status |
|----|----------|---------|----------------|--------|
| P1 | **Which markets to prioritize?** | EN only / EN+NO / All | EN+NO first (Phase 1-2) | ⏳ PENDING |
| P2 | **Tenant string overrides?** | Yes / No / Later | Later (Phase 3) | ⏳ PENDING |
| P3 | **Minimum translation coverage for "sellable"?** | 80% / 90% / 100% | 90% critical paths | ⏳ PENDING |
| P4 | **External TMS integration?** | Lokalise / Phrase / None / Internal | Internal first, TMS Phase 3 | ⏳ PENDING |
| P5 | **Who translates?** | In-house / External / Community | In-house (SE→NO), External (EN) | ⏳ PENDING |

### 8.3 Technical Decisions

| ID | Decision | Options | Recommendation | Status |
|----|----------|---------|----------------|--------|
| T1 | **i18n library?** | next-intl / react-i18next / Custom | **next-intl** | ⏳ PENDING |
| T2 | **Locale routing?** | Path-based (`/en/admin`) / Cookie / Header | Cookie + Header (no path) | ⏳ PENDING |
| T3 | **Locale codes?** | `en/sv/no` / `EN/SE/NO` | `en/sv/no` (lowercase, align with Intl) | ⏳ PENDING |
| T4 | **Translation file structure?** | Flat / Nested / Namespaced | Namespaced (admin.*, app.*, common.*) | ⏳ PENDING |
| T5 | **Apply tenant.main_language?** | Yes / No | **Yes** (critical for multi-tenant) | ⏳ PENDING |
| T6 | **Formatter abstraction?** | Custom hooks / next-intl built-in | next-intl built-in + custom hooks | ⏳ PENDING |

### 8.4 Governance Decisions

| ID | Decision | Options | Recommendation | Status |
|----|----------|---------|----------------|--------|
| G1 | **Admin hub location?** | `/admin/translation` / `/admin/settings/translations` | `/admin/translation` (top-level in System) | ⏳ PENDING |
| G2 | **Who can edit system strings?** | system_admin only / Include tenant_admin | system_admin only | ⏳ PENDING |
| G3 | **Translation review workflow?** | None / Simple approval / Full workflow | Publish toggle Phase 1, full workflow Phase 3 | ⏳ PENDING |
| G4 | **Audit logging required?** | Yes / No | Yes (compliance) | ⏳ PENDING |

### 8.5 Resource Decisions

| ID | Decision | Estimate | Notes |
|----|----------|----------|-------|
| R1 | Phase 1 effort | 4-6 weeks, 1 dev | Foundation + EN/NO unblock |
| R2 | Phase 2 effort | 4-6 weeks, 1-2 devs | Full admin i18n + content translations |
| R3 | Phase 3 effort | 3-4 weeks, 1 dev | Admin hub + enterprise features |
| R4 | Translation effort | ~3,000 strings × 2 locales | Professional translation ~$0.10/word |

---

## 9. REPO DISCOVERY CHECKLIST

> Run these commands to verify/update evidence in this document.

### 9.1 Find i18n Usage

```powershell
# Search for i18n-related patterns
rg -n "i18n|locale|language|translations|next-intl|i18next|useTranslation|\bt\(" -S .
```

### 9.2 Locate Current Translation Files

```powershell
# List i18n files and inspect contents
ls lib/i18n
Get-Content lib/i18n/ui.ts -Head 100
ls lib/planner
Get-Content lib/planner/i18n.ts -Head 100
Get-Content lib/planner/locales.json -Head 50
```

### 9.3 Preferences & html lang

```powershell
# Search for language preference usage
rg -n "PreferencesContext|lb-language|LanguageSwitcher|<html lang" -S app lib components
```

### 9.4 Tenant main_language Usage

```powershell
# Check if tenant language is actually used
rg -n "main_language" -S .
```

### 9.5 DB Translation Tables

```powershell
# Find translation-related migrations
rg -n "game_translations|locale\s+text|language_code_enum" supabase/migrations -S
```

### 9.6 Hardcoded Swedish Estimate

```powershell
# Count common Swedish UI strings
rg -n "(Spara|Ta bort|Redigera|Lägg till|Kunde inte|Skapa)" app components lib -S | Measure-Object -Line
```

### 9.7 Admin Routes/Nav

```powershell
# Check for existing translation routes
rg -n "/admin/(translation|translations|i18n|localization)" app lib -S
Get-Content components/navigation/admin-nav-config.tsx -Head 100
```

---

## 10. NEXT ACTIONS (Concrete)

### Immediate (Before Phase 1 Start)

| # | Action | Owner | Deadline |
|---|--------|-------|----------|
| 1 | **Decide locale strategy** (cookie vs URL) | Product + Tech | Before Phase 1 |
| 2 | **Decide default/fallback order** (EN/NO/SV precedence) | Product | Before Phase 1 |
| 3 | **Define Phase 1 "critical flows"** | Product | Before Phase 1 |
| 4 | **Review and sign off on this document** | Stakeholders | Before Phase 1 |

### Phase 1 Start

| # | Action | Owner | Notes |
|---|--------|-------|-------|
| 1 | Install next-intl + configure middleware | Dev | Day 1-2 |
| 2 | Create locale resolver (user → tenant → default) | Dev | Day 2-3 |
| 3 | Extract 100-200 core strings to messages/*.json | Dev | Day 3-7 |
| 4 | Add NO to `lib/planner/locales.json` | Dev | Day 1 |
| 5 | Update `<html lang>` to use resolved locale | Dev | Day 2 |
| 6 | Wire up tenants.main_language in resolver | Dev | Day 3-4 |

### Optional: Request Phase 1 Implementation Plan

> If you want, I can write a **Phase 1 Implementation Plan** in the same format as Learning/Support (decisions contract, file/function inventory, testplan, risk/rollback) based on the choices in Section 8.

---

## APPENDIX A: Existing Pattern References

### A.1 Authorization Pattern (from Learning/Gamification)

```typescript
// lib/utils/tenantAuth.ts - CONFIRMED PATTERN
export function isSystemAdmin(): boolean { /* ... */ }
export function assertTenantAdminOrSystem(tenantId: string): void { /* ... */ }

// SQL RLS - CONFIRMED PATTERN
has_tenant_role(tenant_id, 'tenant_admin')
is_system_admin()
```

### A.2 Server Action Pattern

```typescript
// app/actions/learning-admin.ts - CONFIRMED PATTERN
'use server'

export async function createLearningItem(data: CreateItemInput) {
  const { userId, tenantId } = await getSessionUser();
  assertTenantAdminOrSystem(tenantId);
  
  // ... action logic
}
```

### A.3 Existing Translation Loading

```typescript
// lib/services/planner.server.ts - CONFIRMED PATTERN
const DEFAULT_LOCALE_ORDER = ['sv', 'no', 'en'];

export function pickTranslation<T extends { locale?: string | null }>(
  translations: T[] | null | undefined,
  preferredLocales: string[] = DEFAULT_LOCALE_ORDER
): T | null {
  if (!translations?.length) return null;
  for (const locale of preferredLocales) {
    const match = translations.find((t) => t.locale === locale);
    if (match) return match;
  }
  return translations[0] ?? null;
}
```

---

## APPENDIX B: Quick Reference

### B.1 Key Files

| Purpose | File Path |
|---------|-----------|
| Language enum | `lib/context/PreferencesContext.tsx` |
| UI copy (Marketing/Auth) | `lib/i18n/ui.ts` |
| Planner translations | `lib/planner/locales.json` |
| Planner i18n utilities | `lib/planner/i18n.ts` |
| Game translation loader | `lib/services/planner.server.ts` |
| Admin navigation config | `components/navigation/admin-nav-config.tsx` |
| Admin navigation IA | `docs/ADMIN_NAVIGATION_MASTER.md` |

### B.2 Database References

| Table | Purpose |
|-------|---------|
| `users.language` | User language preference |
| `tenants.main_language` | Tenant default language |
| `game_translations` | Game content translations |
| `language_code_enum` | Enum: NO, SE, EN |

### B.3 Package.json Scripts (Proposed)

```json
{
  "scripts": {
    "i18n:extract": "i18n-extract scan ./app ./components --output ./extracted.json",
    "i18n:validate": "i18n-validate ./messages",
    "i18n:missing": "i18n-missing ./messages --locales en,no,sv",
    "i18n:coverage": "i18n-coverage ./messages --report",
    "i18n:compile": "next-intl compile ./messages"
  }
}
```

---

**Document Status:** ANALYSIS COMPLETE  
**Next Step:** Product + Tech decisions (Section 8) + Discovery verification (Section 9)  
**Implementation:** Awaiting explicit approval  
