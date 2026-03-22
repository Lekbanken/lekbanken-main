# Journey Activation — Implementationsplan

## Metadata

> **Datum:** 2026-03-06 (rev 4)  
> **Senast uppdaterad:** 2026-03-21  
> **Senast validerad:** 2026-03-21  
> **Scope:** Datamodell, API-lager, onboarding, profile toggle, standardvy, gated loading, användarmigrering  
> **Beroende av:** `journey-activation-audit.md`, `journey-activation-architecture.md`  
> **Status:** Revision 4 — implementation complete; kodvägar återvaliderade 2026-03-21, ursprunglig QA verifierad 2026-03-06

---

## Översikt

Planen är uppdelad i 7 steg som kan implementeras sekventiellt. Varje steg är självständigt testbart.

```
Steg 1 ─ Datamodell + Migration
Steg 2 ─ API-lager
Steg 3 ─ Onboarding-modal (första besöket)
Steg 4 ─ Profil-toggle (Översikt)
Steg 5 ─ Standard gamification-vy (icke-Journey)
Steg 6 ─ Feature-gated laddning (conditional import)
Steg 7 ─ Migrering av befintliga användare
```

---

## Steg 1 — Datamodell + Migration

### Mål

Utöka `user_journey_preferences` med Journey-aktiveringsstate.

### Åtgärder

- [x] Skapa migration: `ALTER TABLE user_journey_preferences` ✅ Ursprunglig migrationsfil finns i `supabase/migrations/_archived/20260306100000_journey_activation_columns.sql`; kolumnerna är nu konsoliderade i `supabase/migrations/00000000000000_baseline.sql`
  - Lägg till `journey_enabled BOOLEAN NOT NULL DEFAULT false`
  - Lägg till `journey_decision_at TIMESTAMPTZ NULL`
- [x] Uppdatera TypeScript-typer ✅ `features/gamification/types.ts` + `types/supabase.ts`
  - Lägg till `journeyEnabled: boolean`
  - Lägg till `journeyDecisionAt: string | null`
- [x] Verifiera att befintliga RLS-policies täcker nya kolumner (SELECT/UPDATE) ✅ Column-level — existing row-level policies apply

**Notering 2026-03-21:** Den separata kolumnmigreringen är historisk och ligger i `_archived/`. Den aktiva schemasanningen i repot är baseline-filen, där båda kolumnerna redan ingår.

### Datamodell efter migration

```
user_journey_preferences
┌──────────────────────┬────────────────┬──────────────────────────┐
│ user_id (PK)         │ faction_id     │ updated_at               │
│                      │ journey_enabled│ journey_decision_at      │
└──────────────────────┴────────────────┴──────────────────────────┘
```

### State-matris

| Scenario | `journey_enabled` | `journey_decision_at` | `faction_id` |
|----------|-------------------|-----------------------|--------------|
| Aldrig tillfrågad (ingen rad, eller rad med NULL decision) | `false` | `NULL` | `NULL` |
| Aktivt valt standard | `false` | `2026-03-06T...` | `NULL` |
| Aktiverat Journey, ingen faction | `true` | `2026-03-06T...` | `NULL` |
| Aktiverat Journey, valt faction | `true` | `2026-03-06T...` | `'forest'` |

### Test

- Kör migration mot dev/staging
- Verifiera `\d user_journey_preferences` visar nya kolumner
- Verifiera att `INSERT` utan explicita värden ger `journey_enabled = false, journey_decision_at = NULL`

---

## Steg 2 — API-lager

### Mål

Exponera Journey-status och uppdatering via API.

### Åtgärder

#### 2a — Läs Journey-status

- [x] Utöka `GET /api/gamification` responsens payload: ✅
  ```typescript
  // Nytt fält i GamificationPayload
  journeyPreference: {
    enabled: boolean;
    decisionAt: string | null;
  }
  ```
- [x] Hämta `journey_enabled` och `journey_decision_at` tillsammans med `faction_id` i befintlig query ✅

#### 2b — Uppdatera Journey-status

- [x] Skapa `POST /api/gamification/journey-preference` ✅ `app/api/gamification/journey-preference/route.ts`
  ```typescript
  // Request body
  { enabled: boolean }
  
  // Logik
  // 1. Validera input (boolean)
  // 2. Upsert user_journey_preferences:
  //    journey_enabled = enabled
  //    journey_decision_at = COALESCE(journey_decision_at, now())
  //      ↑ Bevarar originaldatum vid toggle — "första beslutsdatum"
  //    updated_at = now()
  //      ↑ Speglar senaste ändring — "senast ändrad"
  // 3. Returnera { enabled, decisionAt }
  ```

#### Tidssemantik

| Fält | Betydelse | Uppdateras vid varje toggle? |
|------|-----------|------------------------------|
| `journey_decision_at` | "Första gången användaren tog ställning" | Nej — `COALESCE` bevarar |
| `updated_at` | "Senaste ändring av Journey-preferens" | Ja — alltid `now()` |

`updated_at` täcker "senast ändrad"-behovet. Inget extra fält behövs.

#### 2c — Typer

- [x] Uppdatera `GamificationPayload` i `features/gamification/types.ts` ✅
- [x] Skapa `JourneyPreference`-typ: ✅
  ```typescript
  interface JourneyPreference {
    enabled: boolean;
    decisionAt: string | null;
  }
  ```

#### 2d — API-isoleringsinvariant

`fetchGamificationSnapshot()` (i `features/gamification/api.ts`) anropar **enbart** `GET /api/gamification`. Denna funktion får **inte** utökas med Journey-specifika API-anrop.

**Verifierat i nuvarande kodbas:** `fetchGamificationSnapshot()` är en ren fetch mot `const API_PATH = "/api/gamification"` med `cache: "no-store"`. Den triggar varken direkt eller indirekt:

| Journey-specifik API | Anropas av |
|----------------------|------------|
| `GET /api/journey/snapshot` | `fetchJourneySnapshot()` i `features/journey/api.ts` — enbart använd i `AppDashboardPage` |
| `GET /api/journey/feed` | `fetchJourneyFeed()` i `features/journey/api.ts` — enbart använd i `AppDashboardPage` |
| `GET /api/cosmetics/loadout` | `fetch()` i `AppDashboardPage` — Journey-dashboard |

**Regel:** Journey-specifika API-anrop ska fortsätta leva exklusivt i Journey-vyn. Dispatchern och standard-vyn anropar enbart `GET /api/gamification`.

### Test

- `GET /api/gamification` → `journeyPreference.enabled` = `false` för ny användare
- `POST /api/gamification/journey-preference` `{ enabled: true }` → uppdaterar DB
- Efterföljande `GET` speglar nytt state

---

## Steg 3 — Onboarding-modal (första besöket)

### Mål

Visa en engagerande onboarding-modal när användaren besöker `/app/gamification` för första gången och `journey_decision_at IS NULL`.

### UX-flöde

```
Användare navigerar till /app/gamification
        │
        ▼
  ┌─ Hämta gamification data ──┐
  │  inkl journeyPreference     │
  └─────────────────────────────┘
        │
        ▼
  journey_decision_at === null?
     ├─ JA  → Visa onboarding-modal
     │         ├─ "Aktivera Journey" → POST enabled=true → Visa Journey-vy
     │         └─ "Inte nu"         → POST enabled=false → Visa standard-vy
     └─ NEJ → Visa Journey-vy eller standard-vy baserat på enabled
```

### Komponent: `JourneyOnboardingModal`

- [x] Skapa `features/gamification/components/JourneyOnboardingModal.tsx` ✅

#### Innehåll

1. **Rubrik**: "Välkommen till Journey" / i18n `gamification.onboarding.title`
2. **Bildkarusell** (3–4 steg):
   - Steg 1: "Vad är Journey?" — kort introduktion med skärmbild
   - Steg 2: "Factions & Design" — visa de 4 faction-temana
   - Steg 3: "Kosmetik & Progression" — visa skill tree, XP-bar
   - Steg 4: "Din canvas" — visa badge showcase, statistik
3. **Steg-indikator**: Prickar eller linje som visar nuvarande steg
4. **Knappar**:
   - Primär: "Aktivera Journey" → `POST enabled=true`
   - Sekundär: "Inte nu, använd standardvy" → `POST enabled=false`
   - Under: "Du kan alltid ändra detta i din profil"

#### Design

- Använd standard Lekbanken-design (inte Journey-design) för modalen — användaren har inte valt Journey ännu
- Modalen använder befintliga UI-primitiver: `Dialog`, `Button`, `Carousel` (om finns)
- Responsiv — fungerar på mobil och desktop
- Stäng-knapp (X) → samma som "Inte nu" (sparar `enabled: false`)

#### Lättviktskrav (hård gräns)

Onboarding-modalen **FÅR INTE** importera eller rendera tunga Journey-komponenter:

| Förbjudet | Anledning |
|-----------|-----------|
| `JourneyScene` | Drar in faction-themes, CSS-variabelgenerering |
| `ParticleField` | Animationsmotor |
| `SkillTreeSection` | Komplex UI + kosmetikdata |
| `XPProgressBar` | 8 skins + shimmer |
| `AvatarFrame` | Kosmetiska ramar |
| `FactionSelector` | Journey-specifik UI |
| Alla `components/journey/*` | Hela Journey-paketet |
| Alla Journey-komponenter under `features/gamification/components/` | Journey-specifika |

**Previews av Journey** visas som **statiska bilder** (skärmdumpar/illustrationer i PNG/WebP), inte som live-renderade Journey-komponenter. Detta garanterar att användare som tackar nej aldrig betalar Journey-runtime-kostnaden.

### i18n-nycklar

- [x] Lägg till i `messages/{sv,en,no}.json` under `gamification.onboarding.*`: ✅
  ```json
  {
    "gamification": {
      "onboarding": {
        "title": "Välkommen till Journey",
        "step1Title": "Vad är Journey?",
        "step1Desc": "Journey är din personliga prestationscanvas...",
        "step2Title": "Välj din fraktion",
        "step2Desc": "Fyra unika teman att välja mellan...",
        "step3Title": "Lås upp kosmetik",
        "step3Desc": "Gå upp i level och lås upp visuella belöningar...",
        "step4Title": "Visa dina utmärkelser",
        "step4Desc": "Sätt upp dina stoltaste utmärkelser...",
        "activate": "Aktivera Journey",
        "skip": "Inte nu",
        "changeHint": "Du kan alltid ändra detta i din profil"
      }
    }
  }
  ```

### Test

- Ny användare → modal visas
- Klicka "Aktivera" → modal stängs → Journey-vy renderas
- Klicka "Inte nu" → modal stängs → standard-vy renderas
- Ladda om sidan → modal visas INTE igen
- Rensa `journey_decision_at` i DB → modal visas igen

---

## Steg 4 — Profil-toggle (Översikt)

### Mål

Användaren ska kunna aktivera/inaktivera Journey från `/app/profile` → Översikt.

### UX

```
┌─ Profilsida (Översikt) ──────────────────────────────────────┐
│                                                               │
│  ┌─ ProfileHero ──────────────────────────────────────────┐  │
│  │  Avatar  Namn  Level  XP-bar  Faction-badge            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Journey-inställning ──────────────────────────────────┐  │
│  │  🎮 Journey                                   [Toggle] │  │
│  │  Aktivera Journey-designen på gamification-sidan       │  │
│  │  för visuella teman, kosmetik och progression.         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Stats · Showcase · Security · Quick Links                    │
└───────────────────────────────────────────────────────────────┘
```

### Åtgärder

- [x] Skapa `features/profile-overview/JourneyToggleCard.tsx` ✅
  - Kort beskrivning av Journey
  - Switch/toggle-komponent
  - Callar `POST /api/gamification/journey-preference` vid toggle
  - Optimistic update med rollback vid fel
- [x] Integrera i `/app/profile/page.tsx` (mellan `ProfileHero` och `StatsCards`) ✅
- [x] Hämta `journeyPreference` från `/api/gamification` ✅
- [x] Visa kort förklaring om användaren aldrig aktiverat Journey ✅
- [x] i18n-nycklar under `app.profile.journey.*` ✅ (`app.profile.sections.journey.*`)
- [x] **State-refresh efter toggle:** ✅ Efter `POST /api/gamification/journey-preference` ska lokalt UI-state uppdateras deterministiskt:
  1. Optimistic update av toggle-komponentens lokala state
  2. Invalidera `useProfileQuery`-cachen (re-keya query eller manuellt uppdatera cachat payload)
  3. Navigering till `/app/gamification` triggar `fetchGamificationSnapshot()` på mount → hämtar färsk data

#### Cache-refresh-strategi

| Scenario | Vad händer | Garanti |
|----------|------------|----------|
| Toggle i profil | Optimistic update → POST → vid success: uppdatera `useProfileQuery`-cachat state | Profil-UI:t speglar ändringen omedelbart |
| Navigera till `/app/gamification` | `fetchGamificationSnapshot()` körs vid mount (ny fetch, `cache: "no-store"`) | Dispatcher får färsk `journeyPreference` |
| Stanna kvar på profil | Optimistic state är redan korrekt | Ingen extra fetch behövs |
| POST misslyckas | Rollback toggle visuellt + error toast | UI förblir konsistent |

**Varför inte global cache-invalidering?** Gamification-hubben använder `useState + useEffect + fetch()` (inte SWR/React Query). Det finns inget globalt cache att invalidera — varje mount gör en färsk fetch. Profil-sidans `useProfileQuery` har egen cache med stabil key som kan uppdateras lokalt.

### Explicit produktbeteende

Toggle påverkar **enbart renderingsläget** på `/app/gamification` hub:

| Aspekt | Vid toggle OFF | Vid toggle ON |
|--------|---------------|---------------|
| Journey-data (faction, cosmetics) | **Bevaras i DB** | Återställs direkt |
| XP, coins, achievements, streaks | Helt opåverkade | Helt opåverkade |
| `/app/gamification` hub | Standard-vy | Journey-vy |
| Subroutes | Oförändrade (iteration 1) | Oförändrade |
| Faction/kosmetik-editering | Ej tillgängligt | Tillgängligt |

Toggle är ett **UI-val**, inte ett dataval. Ingen data raderas, modifieras eller gömmes vid toggle.

### Test

- Toggle OFF → ON → `GET /api/gamification` → `journeyPreference.enabled = true`
- Toggle ON → OFF → `GET /api/gamification` → `journeyPreference.enabled = false`
- Vid API-fel → toggle rullar tillbaka visuellt

---

## Steg 5 — Standard gamification-vy (icke-Journey)

### Mål

Skapa en alternativ rendering av `/app/gamification` som visar samma funktionella innehåll i standard Lekbanken-design.

### Vad som visas (oavsett Journey-status)

| Sektion | Journey-vy | Standard-vy |
|---------|-----------|-------------|
| Achievements-länk | Journey-ikon, glow | Standard Card med länk |
| Coins-översikt | CoinsSection (glasmorfism) | Standard Card med saldo |
| Streak | StreakSection (glasmorfism) | Standard Card med streak-info |
| Badge Showcase | BadgeShowcase (4 slots, glow) | Standard Card med badge-grid |
| Navigation | Quick Nav Grid (Journey-ikoner) | Standard lista/grid med Heroicons |
| Kurser-länk | Journey-ikon | Standard Card |
| Butik-länk | Journey-ikon | Standard Card |

### Vad som INTE visas i standard-vy

- ❌ `JourneyScene` (faction-gradient)
- ❌ `ParticleField` (ambient partiklar)
- ❌ `SkillTreeSection` (kosmetiskt progressionsträd)
- ❌ `XPProgressBar` med skins (enkel progress bar istället)
- ❌ `AvatarFrame` (kosmetiska ramar)
- ❌ `FactionSelector`
- ❌ `SectionDivider` med Journey-varianter

### Åtgärder

- [x] Skapa `features/gamification/GamificationStandardPage.tsx` ✅
  - Använder standard Lekbanken-komponenter: `Card`, `Badge`, `Button`, `Progress` (shadcn/ui)
  - Hämtar data från samma `fetchGamificationSnapshot()` API
  - Visar: Level + XP (enkel progress bar), coins, streak, achievements, navigation
  - Ingen faction-design — neutral färgpalett
  - "Aktivera Journey"-banner längst upp (liten CTA) med länk till profil eller direkt toggle
- [x] **Noll-import-regel:** Ingen import från `components/journey/` eller Journey-specifika `features/gamification/components/`. ✅ Verifierat i kodgranskning + bundle-analys.
- [x] Följ hub-innehållskontraktet (arkitektur §8) — alla gemensamma block måste finnas ✅
- [x] i18n-nycklar under `gamification.standard.*` ✅

### Standard-vy importerar enbart

```
shadcn/ui: Card, CardContent, CardHeader, CardTitle, Badge, Button, Progress
Heroicons: @heroicons/react/24/outline
Delat: fetchGamificationSnapshot, GamificationPayload (typer)
i18n: useTranslations('gamification')
```

Inga Journey-moduler. Inga Journey-assets.

### Test

- Med `journey_enabled = false` → standard-vy renderas
- Samma data visas (coins, streak, achievements, level)
- Ingen Journey-specifik CSS/JS laddad
- "Aktivera Journey"-banner visar korrekt CTA

---

## Steg 6 — Feature-gated laddning (conditional import)

### Mål

Journey-komponenter ska inte ingå i standard-vyns JavaScript-bundle.

### Åtgärder

- [x] Refaktorera `app/app/gamification/page.tsx` till en **dispatcher**: ✅

```typescript
// app/app/gamification/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useGamificationData } from '@/features/gamification/hooks/useGamificationData';
import { JourneyOnboardingModal } from '@/features/gamification/components/JourneyOnboardingModal';

// Lazy load Journey view — only downloaded when needed
// ssr: false justified: GamificationPage is already 'use client' with useState/useEffect/useCallback
// No SSR-able shell exists — the entire component tree depends on client hooks
const GamificationJourneyPage = dynamic(
  () => import('@/features/gamification/GamificationPage').then(m => ({ default: m.GamificationPage })),
  { ssr: false, loading: () => <GamificationSkeleton variant="journey" /> }
);

// Standard view is lighter — static import (no Journey deps in its import tree)
import { GamificationStandardPage } from '@/features/gamification/GamificationStandardPage';

export default function GamificationDispatcher() {
  const { data, isLoading } = useGamificationData();

  if (isLoading) return <GamificationSkeleton />;

  // First visit — show onboarding
  if (!data?.journeyPreference?.decisionAt) {
    return (
      <>
        <GamificationStandardPage data={data} />
        <JourneyOnboardingModal onDecision={handleDecision} />
      </>
    );
  }

  // Journey enabled — lazy load full Journey view
  if (data.journeyPreference.enabled) {
    return <GamificationJourneyPage />;
  }

  // Standard view
  return <GamificationStandardPage data={data} />;
}
```

- [x] Verifiera med Next.js bundle analyzer att Journey-chunk separeras ✅ Se QA-resultat nedan
- [x] Lägg till loading-skeletons för båda vyerna ✅ `GamificationDispatcherSkeleton`
- [x] Verifiera att standard-vyn INTE triggar Journey API-anrop (`/api/journey/snapshot`, `/api/journey/feed`, `/api/cosmetics/loadout`) ✅ Verifierat i build-chunk
- [x] Verifiera att Journey-chunken **inte prefetchas** (se §6.1 nedan) ✅ Bekräftat via Turbopack chunk-separation

### Prefetch-garanti

Next.js `<Link>`-prefetch laddar **route-segmentets server-komponent och layout** — inte `dynamic()`-chunks. Journey-chunken är ett separat webpack-chunk som skapas av `dynamic(() => import(...))` och laddas **enbart** när `<GamificationJourneyPage>` faktiskt renderas i DOM.

**Varför det redan fungerar korrekt:**

1. `dynamic()` skapar ett separat webpack-chunk — det ingår inte i route-segmentets primära chunk
2. Next.js route-prefetch laddar page-komponentens chunk (dispatchern), inte lazy-loadade children
3. Dispatchern renderar `<GamificationJourneyPage>` enbart om `data.journeyPreference.enabled === true`
4. Standard-vyn har noll referenser till Journey-moduler → ingen implicit chunk-dependency

**Verifieringssteg:** Kör `ANALYZE=true next build` och kontrollera att Journey-chunken (`GamificationPage-*.js`) inte förekommer i standard-vyns chunk-graph.

**Nuvarande nav-komponenterna** (`BottomNav.tsx`, `SideNav.tsx`) använder `<Link>` utan `prefetch={false}`. Det är OK — de prefetchar dispatcherns route-segment, inte Journey-chunken.

### SSR-beslut: Varför `ssr: false`?

`GamificationPage.tsx` är redan `'use client'` och använder `useState`, `useEffect`, `useCallback` och `useRef` genomgående (~460 rader). Hela komponentträdet är beroende av client-hooks. Att bryta ut ett SSR-bart skal skulle kräva en fullständig arkitekturrefaktorering utan proportionell vinst — sidan laddas bara av inloggade användare som aktivt valt Journey.

`ParticleField` och `JourneyScene` använder inte browser-API:er (de är ren CSS), men de laddas ändå som del av `GamificationPage`s `'use client'`-träd. Det finns inget SSR-bart lager att vinna.

### Test

- `journey_enabled = false` → Network tab visar **inte** Journey-chunk
- `journey_enabled = true` → Journey-chunk laddas dynamiskt
- Snabb sidladdning i standard-läge

---

## Steg 7 — Migrering av befintliga användare

### Mål

Befintliga användare ska inte tappa sin Journey-upplevelse och ska inte tvingas genom onboarding i onödan.

### Migrationsstrategi

```sql
-- Steg 7: Data-migration (körs EFTER steg 1 kolumn-migration)

-- Användare som redan valt faction → auto-markera som Journey-aktiverade
UPDATE user_journey_preferences
SET
  journey_enabled = true,
  journey_decision_at = updated_at
WHERE faction_id IS NOT NULL
  AND journey_decision_at IS NULL;

-- Användare med rad men utan faction → lämna som "ej beslutat"
-- (journey_enabled = false, journey_decision_at = NULL → triggar onboarding)
```

### Migrationsmotivering

**Varför `faction_id IS NOT NULL` är den enda säkra signalen:**

Alla andra persisterade datapunkter (coins, XP, achievements, showcase, cosmetics) existerar oberoende av Journey-specifik interaktion. `faction_id` är den enda kolumnen som kräver att användaren aktivt interagerat med Journey-specifik UI (FactionSelector-komponenten).

**Konservativ filosofi:** Migrationen föredrar att visa onboarding en gång för mycket framför att auto-aktivera Journey för en tveksam användare. Enbart starkaste signalen används — inga kombinationsheuristiker.

**Demo-användare:** Demo-flödet sätter aldrig `faction_id`, så demo-användare blir korrekt behandlade som "aldrig tillfrågade".

### Regler

| Befintlig användare | Åtgärd |
|---------------------|--------|
| Har valt faction (`faction_id IS NOT NULL`) | `journey_enabled = true`, `journey_decision_at = updated_at` |
| Har rad utan faction | Ingen ändring → onboarding visas vid nästa besök |
| Har ingen rad i tabellen | Ingen ändring → onboarding visas vid första besök |

### Test

- Befintlig användare med faction → ser Journey-vy direkt (ingen modal)
- Befintlig användare utan faction → ser onboarding-modal
- Ny användare → ser onboarding-modal

---

## Tidslinje

```
Steg 1 — Datamodell          ████░░░░░░░░░░░░░░░░░░  (Migration + typer)
Steg 2 — API                 ░░░░████░░░░░░░░░░░░░░  (Endpoints + payload)
Steg 3 — Onboarding          ░░░░░░░░████████░░░░░░  (Modal + karusell + i18n)
Steg 4 — Profil-toggle       ░░░░░░░░░░░░████░░░░░░  (Toggle-kort + integration)
Steg 5 — Standard-vy         ░░░░░░░░░░░░░░░░████░░  (Ny komponent med standard UI)
Steg 6 — Feature gate        ░░░░░░░░░░░░░░░░░░██░░  (Dispatcher + dynamic import)
Steg 7 — Migration           ░░░░░░░░░░░░░░░░░░░░██  (Befintliga användare)
```

Steg 1–2 kan göras parallellt med Steg 3 (modal-design).  
Steg 5–6 bör göras tillsammans.  
Steg 7 körs sist, efter verifiering i staging.

---

## Beroenden

| Steg | Beror på |
|------|----------|
| 2 | 1 (behöver kolumnerna) |
| 3 | 2 (behöver API:t) |
| 4 | 2 (behöver API:t) |
| 5 | Inget (kan börjas parallellt) |
| 6 | 5 (behöver standard-vyn) |
| 7 | 1 (behöver kolumnerna) |

---

## Iteration 1 — Scope boundary

### I scope

- `/app/gamification` hub-sidan: dispatcher, Journey-vy, standard-vy
- Onboarding-modal vid första besöket
- Profil-toggle i Översikt
- Datamodell (`journey_enabled`, `journey_decision_at`)
- API-lager (läs + skriv Journey-preferens)
- Legacy-migration (faction → auto-enable)
- Bundle-separation via `dynamic()`

### Utanför scope (medvetet avgränsningsbeslut)

- Subroutes (`/achievements`, `/coins`, `/events`) — behåller nuvarande Journey-design
- Journey-dashboard (`/app/journey`) — oförändrad
- `ProfileHero` faction-badge vid disabled Journey — acceptabel nuvarande beteende
- Journey Provider-mönster — onödigt komplext för nuvarande behov
- Generell feature-flag-tabell — premature, kan migreras dit senare

Dessa avgränsningar är **medvetna beslut**, inte utelämnningar. De kan adresseras i framtida iterationer med samma gating-mönster.

---

## QA-resultat (2026-03-06)

### Build & TypeScript

- `npx tsc --noEmit` → **0 errors** ✅
- `npx next build` (Turbopack) → **Compiled successfully** ✅ (310 routes)

### Bundle-separation (verifierad via Turbopack chunk-analys)

| Chunk | Storlek | Innehåll | Journey API? | Standard-vy? |
|-------|---------|----------|:------------:|:------------:|
| `da4eb82d352d6c20.js` | 23 KB | Standard-vy (GamificationStandardPage) | ❌ | ✅ |
| `861fba65e9096fbd.js` | 50 KB | Journey API-anrop (`journey/feed`, `journey/snapshot`, `cosmetics/loadout`) | ✅ | ❌ |
| `691d810375e93e05.js` | 49 KB | GamificationPage (Journey-vy) | ❌ | ❌ |

**Slutsats:** Standard-vy-chunken innehåller **noll** Journey API-anrop. Journey-kod laddas enbart via `dynamic()` när `journey_enabled = true`.

### POST /api/gamification/journey-preference — COALESCE-logik

Verifierad i kod:
1. Första anropet: `existingDecisionAt = null` → `decisionAt = now` ✅ (sätter första beslutsdatum)
2. Efterföljande toggles: `existingDecisionAt` har värde → `decisionAt = existingDecisionAt` ✅ (bevaras via COALESCE)
3. `journey_enabled` uppdateras varje gång ✅
4. `updated_at` sätts alltid till `now` ✅

### Import-isolation (kodgranskning)

| Komponent | Journey-imports | Resultat |
|-----------|:--------------:|:--------:|
| `GamificationStandardPage.tsx` | 0 | ✅ Enbart shadcn/ui, Heroicons, `GamificationPayload` typ |
| `JourneyOnboardingModal.tsx` | 0 | ✅ Enbart React, next-intl, Dialog/Button |
| `GamificationDispatcher` (page.tsx) | 1 (lazy) | ✅ `GamificationPage` via `dynamic()` — aldrig i standard-bundle |

### Subroutes-kontroll (medvetet utanför scope)

| Subroute | Journey-gating? | Beteende för OFF-användare |
|----------|:--------------:|---------------------------|
| `/app/gamification/achievements` | ❌ | Visar gamified design (trofé-ikoner, showcase-pins) — fungerar men matchar inte standard-vy |
| `/app/gamification/coins` | ❌ | Visar DiceCoin-ikon, amber-gradient — fungerar men Journey-stylad |
| `/app/gamification/events` | ❌ | Visar alla event-typer (inkl. streak, plan) — fungerar utan problem |

**Bedömning:** Acceptabel temporär inkonsekvens per iteration 1 scope-beslut. Subroutes visar funktionellt korrekt data men med gamification-design oavsett Journey-status. Kan åtgärdas i iteration 2.

### Kvarstående QA (kräver staging-miljö)

- [ ] Kör SQL-migrationer mot staging
- [ ] Testa scenarioflöden med verkliga användare:
  - Ny användare utan rad → onboarding visas
  - Legacy-användare med `faction_id` → auto-enabled, ingen modal
  - Legacy-användare utan faction → onboarding visas
  - Toggle ON/OFF flera gånger → `journey_decision_at` bevaras
- [ ] Testa navigationsflöden:
  - Profil → toggle ON → navigera till gamification → Journey-vy
  - Profil → toggle OFF → navigera till gamification → standard-vy
  - Första besök → aktivera → Journey-vy
  - Första besök → "Inte nu" → standard-vy
  - Refresh direkt efter val
- [ ] Testa på mobil + desktop
