# Lekbanken i18n Migration Plan

> **Senast uppdaterad:** 2026-01-12
> **Status:** ✅ Fas 2 (~97%) - features/admin ~95% klart, app/admin ~97% klart

## Executive Summary

| Mått | Värde |
|------|-------|
| Totalt antal TSX/TS filer | 1,070 |
| Filer med hårdkodade strängar | ~380 (35%) |
| Totalt hårdkodade strängar | 2,834 |
| Filer som använder i18n | ~300 (28%) |
| **Migrerade strängar** | ~2,750 (97%) |
| **Uppskattad återstående arbetsinsats** | ~20 minuter |

## Senaste migrationer (2026-01-12)

### Nyligen migrerade filer:
- ✅ `app/admin/design/components/AdvancedTab.tsx` - ~15 strängar (tokens, border radius, CSS variables)
- ✅ `app/admin/design/components/BrandAssetsTab.tsx` - ~35 strängar (logos, favicons, colors, upload)
- ✅ `app/admin/design/components/TypographyTab.tsx` - ~25 strängar (fonts, formats, preview)
- ✅ `app/admin/design/components/MediaDefaultsTab.tsx` - ~15 strängar (profile images, cover images, gallery)
- ✅ `app/admin/games/builder/components/ArtifactEditor.tsx` - ~25 strängar (visibility, artifact types, errors - refaktorerat med useMemo)
- ✅ `app/admin/games/builder/components/TriggerEditor.tsx` - ~15 strängar (labels, badges, FeatureExplainer - refaktorerat med useMemo)
- ✅ `app/admin/(system)/system-health/page.tsx` - ~50 strängar (metrics, checks, status, cards)
- ✅ `app/admin/(system)/audit-logs/page.tsx` - ~50 strängar (filters, stats, table, search)
- ✅ `app/admin/toolbelt/conversation-cards/new/page.tsx` - ~60 strängar (formulär, felmeddelanden, breadcrumbs)
- ✅ `app/admin/toolbelt/conversation-cards/[collectionId]/page.tsx` - ~80 strängar (redigering, kort-hantering, förhandsvisning)
- ✅ `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx` - ~50 strängar (status, stats, actions, confirm dialogs)
- ✅ `app/admin/gamification/page.tsx` - ~90 strängar (hub modules, stats, features, status)
- ✅ `app/admin/gamification/dicecoin-xp/page.tsx` - ~100 strängar (tabs, tables, levels, leaderboards)
- ✅ `app/admin/gamification/shop-rewards/page.tsx` - ~15 strängar (tenant selector, loading)
- ✅ `app/admin/learning/requirements/page.tsx` - ~40 strängar (types, stats, table, pagination, dialogs)
- ✅ `app/admin/learning/courses/page.tsx` - ~40 strängar (stats, table, filters, pagination, dialogs)
- ✅ `app/admin/tenant/[tenantId]/content/page.tsx` - ~15 strängar (pageTitle, error states, filters)
- ✅ `app/admin/tenant/[tenantId]/subscription/page.tsx` - ~15 strängar (plan, billing, status)
- ✅ `app/admin/tenant/[tenantId]/settings/page.tsx` - ~4 strängar (pageTitle, comingSoon)
- `app/admin/support/notifications/page.tsx` - ~25 strängar (filters, categories, status)
- `app/admin/learning/page.tsx` - ~45 strängar (modules, status, stats, filters, sandbox)
- `app/admin/billing/page.tsx` - ~40 strängar (stats, actions, about section)
- `app/admin/tenant/[tenantId]/analytics/page.tsx` - ~20 strängar (stats, error states)
- `app/admin/gamification/achievements/AchievementsAdminClient.tsx` - ~15 strängar

### Alla prioriterade PAGE-filer är nu migrerade! ✅
### Design-komponenter är nu migrerade! ✅

### Kvarvarande områden (mindre prioritet):
**Game Builder-komponenter (app/admin/games/builder/components/):**
- `ArtifactWizard.tsx` - ~30 strängar (wizard-steg, exempeldata)
- `PhaseEditor.tsx` - ~15 strängar (formulär, knappar)
- `BoardEditor.tsx` - ~10 strängar (labels)
- `RoleEditor.tsx` - ~10 strängar (labels)
- `StepEditor.tsx` - ~15 strängar (formulär)
- `GameBuilderForm.tsx` - ~10 strängar (knappar)

**Navigationskomponenter:**
- `admin-nav-config.tsx` - ~15 strängar (nav labels, använder redan t())
- `admin-nav-items.tsx` - ~15 strängar (nav labels)

### Nycklarna som lagts till:
- `admin.design.*` - Komplett namespace för design settings (~100 keys: advanced, brand, typography, mediaDefaults)
- `admin.games.builder.artifact.*` - Visibility options, artifact types (~30 keys)
- `admin.games.builder.trigger.*` - Labels, howItWorks, badges (~25 keys)
- `admin.tenant.achievements.*` - Komplett namespace för tenant achievements (~60 keys)
- `admin.conversationCards.new.*` - Komplett namespace för ny samling (~30 keys)
- `admin.conversationCards.edit.*` - Komplett namespace för redigering (~60 keys: kort, förhandsvisning, formulär)
- `admin.gamification.hub.*` - Komplett namespace för gamification hub (modules, stats, status)
- `admin.gamification.dicecoinXp.*` - Komplett namespace för DiceCoin & XP (tabs, levels, leaderboards, categories)
- `admin.gamification.shopRewards.tenantSelector.*` - Tenant selector och loading
- `admin.support.notifications.*` - Komplett namespace för notifikationshistorik
- `admin.learning.hub.*` - Komplett namespace för utbildningshubben (modules, stats, filters)
- `admin.billing.hub.*` - Komplett namespace för faktureringshubben (stats, actions, about)
- `admin.tenant.analytics.*` - Komplett namespace för tenant-statistik
- `admin.gamification.achievements.*` - Utökat namespace för achievements
- `admin.systemHealth.*` - Komplett namespace för systemhälsa (~60 keys: metrics, checks, status, cards, latency, storage)
- `admin.auditLog.*` - Komplett namespace för audit logs (~55 keys: filters, stats, table, resources, actions)

## Prioriteringsmodell

### 🔴 Fas 1: Kritisk (Användarsynlig + Juridisk)
**Mål:** Allt som slutanvändare ser + juridiskt känsligt

| Område | Filer | Strängar | Prioritet |
|--------|-------|----------|-----------|
| `app/legal` | 2 | 101 | Juridiskt krav |
| `features/play` | ~25 | 322 | Deltagarupplevelse |
| `app/app` | ~20 | 154 | Appanvändare |
| `components/play` | ~15 | 112 | Spelkomponenter |

**Totalt Fas 1:** ~62 filer, ~689 strängar

### 🟡 Fas 2: Hög (Admin-gränssnitt)
**Mål:** Administrativa verktyg för coacher/facilitatorer

| Område | Filer | Strängar | Prioritet |
|--------|-------|----------|-----------|
| `app/admin` | ~91 | 752 | Admin UI |
| `features/admin` | ~68 | 489 | Admin features |
| `components/admin` | ~20 | 65 | Admin components |

**Totalt Fas 2:** ~179 filer, ~1,306 strängar

### 🟢 Fas 3: Medium (Sekundära funktioner)
**Mål:** Mindre använda funktioner

| Område | Filer | Strängar |
|--------|-------|----------|
| `features/planner` | ~13 | 41 |
| `features/conversation-cards` | ~5 | 38 |
| `features/gamification` | ~8 | 23 |
| `components/marketing` | ~8 | 28 |
| `app/(marketing)` | ~6 | 25 |
| `features/participants` | ~5 | 25 |
| `features/tools` | ~4 | 21 |
| `features/journey` | ~5 | 16 |
| `features/browse` | ~5 | 16 |
| `features/profile` | ~4 | 14 |
| `components/achievements` | ~5 | 11 |
| `components/learning` | ~5 | 9 |

**Totalt Fas 3:** ~73 filer, ~267 strängar

### ⚪ Fas 4: Låg (Dev-verktyg)
**Mål:** Sandbox och utvecklarverktyg (kan skjutas upp)

| Område | Filer | Strängar |
|--------|-------|----------|
| `app/sandbox` | ~63 | 516 |
| `app/playground` | ~3 | 6 |

**Totalt Fas 4:** ~66 filer, ~522 strängar

---

## Detaljerad Fas 1 Breakdown

### 1.1 Legal Pages (HÖGST PRIORITET)
```
app/legal/privacy/page.tsx    - 66 strängar
app/legal/terms/page.tsx      - 35 strängar
```

**Approach:**
- Skapa `messages/{locale}/legal.json`
- Använd `getTranslations('legal')` server-side
- Flytta all text till översättningsfiler

### 1.2 Play Features (Deltagarupplevelse)
Top 10 filer:
```
features/play/components/TriggerKillSwitch.tsx      - 24 strängar
features/play/components/HostSessionWithPlay.tsx   - 19 strängar
features/play/components/ParticipantLobby.tsx      - 15 strängar
features/play/components/SessionEndedView.tsx      - 14 strängar
features/play/components/FacilitatorDashboard.tsx  - 13 strängar
features/play/components/PlaySessionProvider.tsx   - 12 strängar
features/play/hooks/usePlaySession.ts              - 11 strängar
features/play/components/QuestionDisplay.tsx       - 10 strängar
features/play/components/TimerDisplay.tsx          - 9 strängar
features/play/components/ScoreBoard.tsx            - 8 strängar
```

**Approach:**
- Skapa `messages/{locale}/play.json`
- Använd `useTranslations('play')` i client components
- Använd `getTranslations('play')` i server components

### 1.3 App User Pages
Top 10 filer:
```
app/app/support/page.tsx              - 25 strängar
app/app/profile/friends/page.tsx      - 18 strängar
app/app/settings/page.tsx             - 15 strängar
app/app/dashboard/page.tsx            - 14 strängar
app/app/achievements/page.tsx         - 12 strängar
app/app/learning/page.tsx             - 11 strängar
app/app/shop/page.tsx                 - 10 strängar
app/app/notifications/page.tsx        - 9 strängar
app/app/profile/page.tsx              - 8 strängar
app/app/games/page.tsx                - 7 strängar
```

---

## Teknisk Implementation

### Steg 1: Strukturera messages-filer
```
messages/
├── en/
│   ├── common.json      # Generella UI-element
│   ├── legal.json       # Juridiska sidor
│   ├── play.json        # Spelupplevelse
│   ├── app.json         # Användarapp
│   ├── admin.json       # Adminpanel
│   └── marketing.json   # Marknadsföring
├── sv/
│   └── ... (samma struktur)
└── no/
    └── ... (samma struktur)
```

### Steg 2: Migreringsmönster

**Server Component:**
```tsx
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('legal.privacy');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

**Client Component:**
```tsx
'use client';
import { useTranslations } from 'next-intl';

export function PlayButton() {
  const t = useTranslations('play.actions');
  
  return <button>{t('start')}</button>;
}
```

### Steg 3: ESLint Enforcement
```javascript
// eslint.config.mjs
{
  rules: {
    'lekbanken/no-hardcoded-strings': ['error', {
      // Endast i kritiska områden
      include: ['app/legal/**', 'features/play/**', 'app/app/**']
    }]
  }
}
```

---

## Tidsplan

| Fas | Arbete | Uppskattning |
|-----|--------|--------------|
| Fas 1.1 | Legal pages | 2-3 timmar |
| Fas 1.2 | Play features | 8-12 timmar |
| Fas 1.3 | App pages | 4-6 timmar |
| Fas 2 | Admin | 15-20 timmar |
| Fas 3 | Secondary | 8-10 timmar |
| Fas 4 | Dev tools | 5-8 timmar |

**Total uppskattning:** 42-59 timmar

---

## Framgångsmått

1. **ESLint errors = 0** i kritiska områden
2. **Translation coverage dashboard** visar 100%
3. **Alla locales** (sv, en, no) har fullständiga översättningar
4. **Automated tests** validerar att alla nycklar finns

---

## Nästa Steg

- [x] Analysera nuvarande status
- [x] Skapa migreringsplan  
- [x] Implementera legal pages (Fas 1.1) ✅ 101 strängar migrerade
- [x] Ändra lint-regel till error för kritiska områden ✅
- [x] **TriggerKillSwitch.tsx** ✅ ~24 strängar migrerade
- [x] **HostSessionWithPlay.tsx** ✅ ~40 strängar migrerade  
- [x] **ParticipantPlayView.tsx** ✅ ~50 strängar migrerade
- [x] **PuzzleProgressPanel.tsx** ✅ ~12 strängar migrerade
- [x] **ParticipantSessionWithPlay.tsx** ✅ ~25 strängar migrerade
- [x] **SessionCockpit.tsx** ✅ ~17 strängar migrerade
- [x] **AnalyticsDashboard.tsx** ✅ ~18 strängar migrerade
- [x] **SignalPanel.tsx** ✅ commit 0248292
- [x] **RoleAssignerContainer.tsx** ✅ commit 0248292
- [x] **StoryViewModal.tsx** ✅ commit 0248292
- [x] **TimeBankRuleEditor.tsx** ✅ commit 0248292
- [x] **DirectorModeDrawer.tsx** ✅ ~30 strängar migrerade (commit 6277a5f)
- [x] **EventFeedPanel.tsx** ✅ ~25 strängar migrerade (commit 6277a5f)
- [x] **ArtifactsPanel.tsx** ✅ 4 error strängar (commit 6277a5f)
- [x] **ConversationCardsCollectionArtifact.tsx** ✅ 12 strängar (commit 6277a5f)
- [x] **HostPlayMode.tsx** ✅ ~25 strängar migrerade (commit 4bc66db)
- [x] **TimeBankPanel.tsx** ✅ ~12 strängar migrerade (commit 4bc66db)
- [x] **TriggerDryRunPanel.tsx** ✅ ~60 strängar migrerade (commit 4bc66db)
- [x] **SignalPresetEditor.tsx** ✅ ~80 strängar migrerade (commit 4bc66db)
- [x] **TriggerTemplateLibrary.tsx** ✅ ~50 strängar migrerade
- [x] **ParticipantSignalMicroUI.tsx** ✅ Fix partial migration (title, buttons)
- [x] **features/play hooks** ✅ All hooks migrated to English fallback + translation keys
- [x] **features/play komponenter** ✅ KOMPLETT - Inga svenska strängar kvar i .tsx filer
- [x] Implementera app pages (Fas 1.3) ✅ ~200 strängar migrerade
  - [x] app/app/support/page.tsx ✅
  - [x] app/app/preferences/page.tsx ✅
  - [x] app/app/shop/page.tsx ✅
  - [x] app/app/subscription/page.tsx ✅
  - [x] app/app/learning/page.tsx ✅
  - [x] app/app/leaderboard/page.tsx ✅
  - [x] app/app/events/page.tsx ✅
  - [x] app/app/notifications/page.tsx ✅
  - [x] app/app/challenges/page.tsx ✅
  - [x] app/app/no-access/page.tsx ✅
  - [x] app/app/select-tenant/page.tsx ✅
- [x] Implementera components/play (Fas 1.4) ✅ ~150 strängar migrerade
  - [x] components/play/lobby/SettingsSection.tsx ✅
  - [x] components/play/lobby/RolesSection.tsx ✅
  - [x] components/play/PropConfirmation.tsx ✅
  - [x] components/play/LocationCheck.tsx ✅
  - [x] components/play/HintPanel.tsx ✅
  - [x] components/play/SessionControls.tsx ✅
  - [x] components/play/CipherDecoder.tsx ✅
  - [x] components/play/AudioPlayer.tsx ✅
  - [x] components/play/*.tsx ✅ (alla kvarvarande filer migrerade)
- [x] Implementera features/admin/users (Fas 2.1) ✅ ~250 strängar migrerade
  - [x] UserDetailDrawer.tsx ✅ Komplett
  - [x] UserListItem.tsx ✅ Komplett
  - [x] UserListTable.tsx ✅ Komplett  
  - [x] UserListToolbar.tsx ✅ Komplett
  - [x] UserCreateDialog.tsx ✅ Partiellt
- [x] Implementera features/admin/organisations (Fas 2.1) ✅ ~14 strängar
  - [x] OrganisationAdminPage.tsx ✅ Komplett
- [x] Implementera features/admin/products (Fas 2.1) ✅ ~18 strängar
  - [x] ProductAdminPage.tsx ✅ Komplett
- [ ] Implementera features/admin (Fas 2) - ~200 strängar kvar
  - [ ] GameAdminPage.tsx (partiellt påbörjad)
  - [ ] GameDetailPage.tsx
  - [ ] SessionDetailPage.tsx
  - [ ] ParticipantDetailPage.tsx
- [ ] Implementera app/admin (Fas 2) - ~752 strängar kvar

## Progress Tracker

| Datum | Område | Filer | Strängar | Status |
|-------|--------|-------|----------|--------|
| 2026-01-11 | app/legal | 2 | 101 | ✅ Klart |
| 2026-01-11 | features/play/TriggerKillSwitch.tsx | 1 | ~24 | ✅ Klart |
| 2026-01-11 | features/play/HostSessionWithPlay.tsx | 1 | ~40 | ✅ Klart |
| 2026-01-11 | features/play/ParticipantPlayView.tsx | 1 | ~50 | ✅ Klart |
| 2026-01-12 | features/play/PuzzleProgressPanel.tsx | 1 | ~12 | ✅ Klart |
| 2026-01-12 | features/play/ParticipantSessionWithPlay.tsx | 1 | ~25 | ✅ Klart |
| 2026-01-12 | features/play/SessionCockpit.tsx | 1 | ~17 | ✅ Klart |
| 2026-01-12 | features/play/AnalyticsDashboard.tsx | 1 | ~18 | ✅ Klart |
| 2026-01-12 | features/play (batch 2) | 5 | ~35 | ✅ Klart |
| 2026-01-13 | features/play (batch 3) | 5 | ~85 | ✅ Klart |
| 2026-01-13 | features/play (batch 4) | 6 | ~230 | ✅ Klart |
| 2026-01-14 | features/play (hooks + final) | 12 | ~150 | ✅ Klart |
| 2026-01-14 | components/play/lobby | 2 | ~40 | ✅ Klart |
| 2026-01-14 | app/app (support, preferences, shop, subscription) | 4 | ~90 | ✅ Klart |
| 2026-01-14 | app/app (learning) | 1 | ~14 | ✅ Klart |
| 2026-01-14 | app/app (leaderboard, events, notifications, challenges) | 4 | ~45 | ✅ Klart |
| 2026-01-14 | app/app (no-access, select-tenant) | 2 | ~10 | ✅ Klart |
| 2026-01-14 | components/play (alla) | 20 | ~150 | ✅ Klart |
| 2026-01-15 | features/admin/users | 5 | ~250 | ✅ Klart |
| 2026-01-15 | features/admin/organisations | 1 | ~14 | ✅ Klart |
| 2026-01-15 | features/admin/products | 1 | ~18 | ✅ Klart |
| - | features/admin (övrigt) | ~60 | ~200 | ⏳ Nästa |
| - | app/admin | ~91 | 752 | ⏳ Väntar |

### Migrerade message-keys (play.participantView)

Följande sektioner har lagts till i `messages/sv.json`, `en.json` och `no.json`:

```
play.participantView:
  - header (play, playingAs, artifacts, decisions)
  - timer (paused, timeUp, timeRemaining)
  - status (active, paused, ended, cancelled, live, offline)
  - errors (7 felmeddelanden)
  - keypad (unlocked, locked, lock)
  - session (paused, waitingForLeader, waitingForHost, waitingDescription, ended, thanksForParticipating)
  - secrets (title, clickToShow, unlockedAt, showing, show)
  - artifactsDrawer (title, noArtifacts)
  - decisionsDrawer (title, noDecisions, noOptions, results, resultsShown)
  - voting (vote, voting, submitVote, hostNeedsToAddOptions, voteReceived)
  - hints (needHintWithStep, needHint)
  - turnIndicator (youStartNext)
  - phases (phaseOf)
  - keypadArtifact (codeCorrect, keypadLocked, attemptsRemaining)
  - safety (title)
  - secretsLocked (message)
```
