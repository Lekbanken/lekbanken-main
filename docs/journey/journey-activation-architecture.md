# Journey Activation — Arkitektur

## Metadata

> **Datum:** 2026-03-06 (rev 4)  
> **Senast uppdaterad:** 2026-03-21  
> **Senast validerad:** 2026-03-21  
> **Scope:** `/app/gamification`, `/app/profile`, journey preference routing och feature-gated UI  
> **Beroende av:** `journey-activation-audit.md`  
> **Status:** Revision 4 — implementation complete; kodarkitekturen återvaliderad 2026-03-21, ursprunglig QA verifierad 2026-03-06

---

## 1. Systemöversikt

```
┌─────────────────────────────────────────────────────────────────────┐
│                        /app/gamification                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  GamificationDispatcher                      │   │
│  │                                                              │   │
│  │  1. Hämta data + journeyPreference                           │   │
│  │  2. Routning:                                                │   │
│  │     ├─ decisionAt = NULL  → StandardPage + OnboardingModal   │   │
│  │     ├─ enabled = true     → JourneyPage (dynamic import)     │   │
│  │     └─ enabled = false    → StandardPage                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                         │                     │                     │
│              ┌──────────┘                     └──────────┐          │
│              ▼                                           ▼          │
│  ┌─────────────────────┐                    ┌──────────────────┐   │
│  │  GamificationPage   │ ◄── dynamic()      │ GamificationStd  │   │
│  │  (Journey-design)   │                    │ (Standard UI)    │   │
│  │                     │                    │                  │   │
│  │  JourneyScene       │                    │  Card, Badge     │   │
│  │  ParticleField      │                    │  Standard layout │   │
│  │  SkillTreeSection   │                    │  Same data/API   │   │
│  │  XPProgressBar      │                    │  No faction CSS  │   │
│  │  AvatarFrame        │                    │                  │   │
│  │  FactionSelector    │                    │  + CTA banner    │   │
│  └─────────────────────┘                    └──────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Datamodell

### 2.1 Tabell: `user_journey_preferences`

```sql
CREATE TABLE user_journey_preferences (
  user_id            UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  faction_id         TEXT NULL,                       -- Befintlig kolumn
  journey_enabled    BOOLEAN NOT NULL DEFAULT false,  -- NY
  journey_decision_at TIMESTAMPTZ NULL,               -- NY
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 State-logik

```
journey_decision_at IS NULL
  → Användaren har aldrig tagit ställning
  → Visa onboarding-modal

journey_decision_at IS NOT NULL AND journey_enabled = false
  → Användaren har aktivt valt standardvy
  → Visa standard gamification-sida

journey_decision_at IS NOT NULL AND journey_enabled = true
  → Användaren har aktiverat Journey
  → Visa Journey gamification-sida (lazy loaded)
```

### 2.3 Varför inte bara `journey_enabled`?

| `journey_enabled` | `journey_decision_at` | Betydelse |
|-------------------|-----------------------|-----------|
| `false` | `NULL` | **Aldrig tillfrågad** → visa onboarding |
| `false` | `2026-03-06` | **Aktivt avböjt** → visa standard, ingen onboarding |
| `true` | `2026-03-06` | **Aktiverat** → visa Journey |

Utan `journey_decision_at` kan vi inte skilja rad 1 från rad 2, vilket innebär att vi antingen:
- Visar onboarding varje gång (dålig UX)
- Aldrig visar onboarding (missar användare)

---

## 3. API-design

### 3.1 Read — `GET /api/gamification`

Befintlig endpoint utökas. Ingen ny endpoint behövs för att läsa.

```typescript
// Ny del av GamificationPayload
interface GamificationPayload {
  identity: GamificationIdentity;
  achievements: Achievement[];
  coins: CoinSummary;
  streak: StreakSummary;
  progress: ProgressSnapshot;
  showcase: AchievementShowcase;
  
  // NYTT
  journeyPreference: {
    enabled: boolean;
    decisionAt: string | null;  // ISO 8601
  };
}
```

### 3.2 Write — `POST /api/gamification/journey-preference`

```typescript
// Request
{ enabled: boolean }

// Response (200)
{ enabled: boolean, decisionAt: string }

// Logik
// 1. Auth check — hämta userId
// 2. Validera: typeof enabled === 'boolean'
// 3. Upsert user_journey_preferences:
//    SET journey_enabled = :enabled,
//        journey_decision_at = COALESCE(journey_decision_at, now()),
//        updated_at = now()
//    ON CONFLICT (user_id) DO UPDATE
// 4. Return uppdaterad row
```

**Notera:** `journey_decision_at` sätts till `now()` vid första beslutet, men behålls vid efterföljande ändringar.

### 3.3 Tidssemantik för `journey_decision_at`

**Beslut:** `journey_decision_at` betyder **"första gången användaren tog ställning till Journey"**.

| Fält | Semantik | Uppdateras vid toggle? |
|------|----------|----------------------|
| `journey_decision_at` | Första beslutsdatum | **Nej** — `COALESCE(journey_decision_at, now())` bevarar originaltidpunkten |
| `journey_enabled` | Nuvarande aktiveringsstatus | **Ja** — speglar senaste val |
| `updated_at` | Senaste ändring | **Ja** — uppdateras vid varje toggle |

**Varför bevara första beslutsdatum?**

1. **Onboarding-spårning:** Vi kan se när användaren först introducerades till Journey, oavsett efterföljande toggles
2. **Analytik:** "Hur lång tid tog det innan användaren aktiverade Journey?" kräver första kontaktpunkten
3. **Support:** Vid felsökning kan vi avgöra om användaren är en tidig eller sen adopter

**"Senast ändrad"-behov uppfylls av `updated_at`:** Fältet `updated_at` uppdateras vid varje toggle. Det ger oss "senaste toggle-datum" utan extra kolumn.

Exempel:

| Händelse | `journey_decision_at` | `journey_enabled` | `updated_at` |
|----------|-----------------------|-------------------|--------------|
| Användare väljer "Inte nu" | `2026-03-06` | `false` | `2026-03-06` |
| Användare slår på Journey | `2026-03-06` (behålls) | `true` | `2026-04-15` |
| Användare stänger av Journey | `2026-03-06` (behålls) | `false` | `2026-05-01` |

### 3.4 Inget nytt API för faction

`POST /api/gamification/faction` förblir oförändrat. Faction-val och Journey-aktivering är separata handlingar.

---

## 4. Feature Gate — Komponentarkitektur

### 4.1 Dispatcher

```
app/app/gamification/page.tsx (omskriven)
├── Hämtar data via useGamificationData()
├── If decisionAt == null → <GamificationStandardPage> + <JourneyOnboardingModal>
├── If enabled == true    → <GamificationJourneyPage> (dynamic import)
└── If enabled == false   → <GamificationStandardPage>
```

### 4.2 Dynamic Import — SSR-beslut

```typescript
const GamificationJourneyPage = dynamic(
  () => import('@/features/gamification/GamificationPage')
    .then(m => ({ default: m.GamificationPage })),
  { ssr: false }
);
```

#### Varför `ssr: false` för hela Journey-vyn?

Vi har analyserat varje Journey-komponent:

| Komponent | Kräver browser? | Anledning |
|-----------|-----------------|-----------|
| `GamificationPage` | **Ja** | `'use client'` — använder `useState`, `useEffect`, `useCallback`, `useRef` |
| `ParticleField` | **Nej** | Ren CSS `@keyframes` — ingen canvas eller `window`-åtkomst |
| `JourneyScene` | **Nej** | Inline CSS-variabler via `getThemeCSSVariables()` — ren rendering |
| `SkillTreeSection` | **Ja** | Interaktiva noder med click/hover state |
| `XPProgressBar` | **Ja** | Shimmer-animation + skin-resolving med state |
| `FactionSelector` | **Ja** | Click-handlers, optimistic update, AbortController |

**`GamificationPage` är redan `'use client'`** med tunga React hooks (`useState`, `useEffect`, `useCallback` med AbortController). Detta gör att hela komponentträdet renderas client-side oavsett. `ssr: false` på `dynamic()` nivån är därför **korrekt och konsekvent** — det finns inget SSR-bart skal att vinna.

#### Alternativet: Partiell SSR

Teoretiskt kunde man dela upp sidan i:

1. SSR-bart skal (layout, rubriker)
2. Client-only dekorationselement

Men detta skulle kräva en **fullständig refaktorering** av `GamificationPage`:

- Bryta ut hooks till en wrapper
- Göra varje sektion till en separat server/client-komponent
- Hantera hydration-mismatch för dynamiska CSS-variabler

**Kostnaden överstiger nyttan.** `GamificationPage` har ~460 rader med tät hook-integration. En SSR-split skulle ge marginell vinst (sidan laddas bara av inloggade användare som aktivt valt Journey) till hög kostnad.

#### Beslut

`ssr: false` för hela Journey-vyn. Standard-vyn (som är den som visas för majoriteten) renderas normalt och behöver ingen special-laddning.

### 4.3 Bundle-effekt

```
Standard-vy bundle:
├── GamificationStandardPage.tsx      (~5 KB)
├── Card, Badge, Button, Progress     (redan i app-bundle)
├── Heroicons                          (redan i app-bundle)
└── fetchGamificationSnapshot          (delad)
→ Nettotillägg: ~5 KB

Journey-vy bundle (lazy chunk — laddas INTE om Journey är av):
├── GamificationPage.tsx              (~15 KB)
├── JourneyScene.tsx
├── ParticleField.tsx
├── SkillTreeSection.tsx + skill-trees data
├── XPProgressBar.tsx (8 skins)
├── AvatarFrame.tsx
├── FactionSelector.tsx
├── CoinsSection, StreakSection, BadgeShowcase
├── SectionDivider.tsx
├── factions.ts (themes)
└── CallToActionSection.tsx
→ Total: ~38 KB (isolerad i egen chunk)
```

### 4.4 API-anrop per vy

| Endpoint | Standard-vy | Journey-vy |
|----------|------------|------------|
| `GET /api/gamification` | ✅ Ja | ✅ Ja |
| `GET /api/journey/snapshot` | ❌ Skippa | ✅ Ja (dashboard-stats) |
| `GET /api/journey/feed` | ❌ Skippa | ✅ Ja (aktivitets-feed) |
| `POST /api/gamification/faction` | ❌ Inte tillgängligt | ✅ Ja |
| `GET /api/cosmetics/loadout` | ❌ Skippa | ✅ Ja (level ≥ 2) |
| `POST /api/gamification/journey-preference` | ✅ Ja (CTA-banner) | ✅ Ja |

Standard-vyn gör **ett enda API-anrop** (`GET /api/gamification`) jämfört med Journey-vyns 3–4 anrop.

### 4.5 API-isoleringsinvariant

`fetchGamificationSnapshot()` anropar **enbart** `GET /api/gamification`. Den triggar inte Journey-specifika API:er.

**Verifierat:** `fetchGamificationSnapshot()` i `features/gamification/api.ts` är en ren fetch mot `const API_PATH = "/api/gamification"` (rad 3–4, cache: `"no-store"`). Journey-API:erna lever i separata moduler:

| Journey API | Definierad i | Anropas av |
|-------------|-------------|------------|
| `fetchJourneySnapshot()` → `GET /api/journey/snapshot` | `features/journey/api.ts` | `AppDashboardPage` |
| `fetchJourneyFeed()` → `GET /api/journey/feed` | `features/journey/api.ts` | `AppDashboardPage` |
| `fetch('/api/cosmetics/loadout')` | inline i `AppDashboardPage` | `AppDashboardPage` |

Dessa moduler importeras **inte** av dispatchern, standard-vyn eller onboarding-modalen. Journey-API:erna körs enbart inuti Journey-vyn (`GamificationPage`/`AppDashboardPage`) som lazy-laddas.

**Regel:** `useGamificationData()` (den planerade hooken) och `fetchGamificationSnapshot()` FÅR INTE utökas med Journey-specifika anrop. Journey-API:er ska förbli isolerade i Journey-import-trädet.

### 4.6 Journey-chunk prefetch-garanti

Next.js `<Link>`-prefetch laddar **route-segmentets server-komponent och layout** — inte `dynamic()`-chunks.

Journey-chunken (`GamificationPage`) är ett separat webpack-chunk skapat av:
```typescript
const GamificationJourneyPage = dynamic(
  () => import('@/features/gamification/GamificationPage'),
  { ssr: false }
);
```

Detta chunk laddas **enbart** när `<GamificationJourneyPage>` faktiskt renderas — dvs när `journeyPreference.enabled === true`.

| Fråga | Svar |
|-------|------|
| Prefetchas Journey-chunken av nav-länkar? | **Nej** — `<Link>` prefetchar route-chunk, inte `dynamic()`-chunks |
| Har standard-vyn någon referens till Journey-moduler? | **Nej** — noll-import-regel (§5.4) |
| Kan chunken laddas i bakgrunden? | **Nej** — Next.js hanterar inte `dynamic()` i prefetch-pipeline |
| Verifiering | `ANALYZE=true next build` → kontrollera chunk-graph |

**Nuvarande nav-komponenter** (`BottomNav.tsx`, `SideNav.tsx`) använder `<Link>` utan `prefetch={false}` — det är korrekt. De prefetchar dispatcherns route-segment, inte Journey-chunken.

---

## 5. Stilisoleringsstrategi

### 5.1 Nuvarande isolering (bevaras)

Journey-styling är redan containerad:

```typescript
// JourneyScene.tsx
<div style={getThemeCSSVariables(theme)}>
  {/* CSS variables: --journey-accent, --journey-glow, etc. */}
  {children}
</div>
```

Inga globala CSS-filer. Inga `@layer` eller `:root`-overrides. Allt via inline `style` + Tailwind.

### 5.2 Standard-vy

Standard-vyn använder **inga** Journey CSS-variabler:

- Bakgrund: Normal `bg-background` (Tailwind theme)
- Kort: `Card` + `CardContent` (shadcn/ui)
- Färger: Standard Lekbanken-palette
- Ikoner: Heroicons (redan i bundle)

### 5.3 Garanti mot läckage

| Mekanism | Vad den skyddar |
|----------|----------------|
| `dynamic()` med `ssr: false` | Journey JS laddas aldrig om disabled |
| Inline `style` (ej global CSS) | CSS-variabler scope:as till container |
| Separata komponentfiler | Import-trädet avgränsar beroendet |
| Separata route-subpages (/coins, /events) | Kan behålla Journey-design eller också feature-gata |

### 5.4 Noll-import-regel för standard-vyn

`GamificationStandardPage` får **inte** importera:

- Någon komponent från `components/journey/` (JourneyScene, JourneyStats, ParticleField, etc.)
- Någon Journey-specifik komponent från `features/gamification/components/` (SkillTreeSection, XPProgressBar med skins, AvatarFrame, FactionSelector, SectionDivider, CoinsSection, StreakSection, BadgeShowcase)
- `factions.ts` — faction themes/CSS-variabelgenerering
- `skill-trees.ts` — kosmetikdata

Standard-vyn använder **enbart**:

- shadcn/ui primitiver (`Card`, `CardContent`, `Badge`, `Button`, `Progress`)
- Heroicons (redan i app-bundle)
- Standard Tailwind-klasser
- Delade typer och API-klient (`fetchGamificationSnapshot`, `GamificationPayload`)

Detta garanterar att Journey-chunken aldrig dras in indirekt via standard-vyns import-träd.

---

## 6. Onboarding-komponent

### 6.1 Komponentstruktur

```
JourneyOnboardingModal
├── Dialog (shadcn/ui eller befintlig)
│   ├── Bildkarusell (3–4 steg)
│   │   ├── Steg 1: Intro
│   │   ├── Steg 2: Factions demo
│   │   ├── Steg 3: Kosmetik/progression
│   │   └── Steg 4: Utmärkelser/canvas
│   ├── Stegindicator (prickar)
│   ├── [Aktivera Journey] (primär CTA)
│   ├── [Inte nu] (sekundär)
│   └── Hint-text: "Du kan ändra i profil"
```

### 6.2 Designprinciper

- **Modalen renderas i standard Lekbanken-design** — användaren har inte valt Journey ännu
- **Bilder visar hur Journey ser ut** — skärmdumpar eller illustrationer
- **"Inte nu" är inte straff** — kommunicera tydligt att gamification-hubben fortfarande finns
- **Modalen blockerar inte sidan** — standard-vy visas bakom modalen

### 6.3 Lättviktskrav (hård gräns)

Onboarding-modalen måste vara **absolut lättviktig**. Följande regler gäller:

**FÖRBJUDET att importera/rendera i onboarding-modalen:**

| Komponent | Anledning |
|-----------|-----------|
| `JourneyScene` | Faction-gradients kopplar in hela theme-systemet |
| `ParticleField` | Animationsmotor |
| `SkillTreeSection` | Komplex UI med kosmetikdata |
| `XPProgressBar` | Skin-system med 8 varianter |
| `AvatarFrame` | Kosmetiska ramar |
| `FactionSelector` | Journey-specifik UI |
| Alla komponenter från `components/journey/` | Hela Journey-paketet |
| Alla komponenter från `features/gamification/components/` | Journey-specifika |

**TILLÅTET:**

| Resurs | Anledning |
|--------|-----------|
| Statiska bilder (PNG/WebP screenshots av Journey) | Lättviktiga, ingen runtime-kostnad |
| Standard UI-primitiver (`Dialog`, `Button`, `Card`) | Redan i app-bundle |
| Illustrationer/ikoner | Lättviktiga |
| i18n-text | Ingen kostnad |

**Syfte:** Användare som tackar nej till Journey ska inte betala **någon** Journey-runtime-kostnad. Onboarding-modalen ska kunna renderas utan att Journey-chunken laddas.

### 6.4 Responsivitet

- Desktop: Centrerad modal med max-width ~600px
- Mobil: Fullskärmsmodal (sheet-variant)
- Bilder: Responsiva, ladda rätt storlek

---

## 7. Profil-toggle — Explicit produktbeteende

### 7.1 Placering

```
/app/profile (Översikt)
│
├── ProfileHero
├── ┌─────────────────────────────────────────────────┐
│   │  JourneyToggleCard                              │  ← NY
│   │  ─────────────────────────────────────────────  │
│   │  🎮 Journey              [═══════○ Inaktiv]    │
│   │  Aktivera Journey-designen på din gamification- │
│   │  sida med visuella teman, kosmetik och          │
│   │  progression.                                   │
│   └─────────────────────────────────────────────────┘
├── StatsCards
├── AchievementShowcaseCard
└── ...
```

### 7.2 Beteende

| Handling | Effekt |
|----------|--------|
| Toggle OFF → ON | `POST enabled=true` → optimistic update → nästa besök till `/app/gamification` visar Journey |
| Toggle ON → OFF | `POST enabled=false` → optimistic update → nästa besök visar standard |
| API-fel | Rollback toggle visuellt + toast |

### 7.3 Villkorlig rendering i profilen

Kortet visas **alltid** i profilen — oavsett om användaren sett onboarding eller inte. Det fungerar oberoende av onboarding-flödet.

### 7.4 Explicit produktlogik: Vad toggle påverkar och inte påverkar

**När Journey stängs AV:**

| Aspekt | Effekt |
|--------|--------|
| Journey-data (faction, cosmetics, showcase) | **Bevaras** — ingen data raderas |
| XP, achievements, coins, streaks | **Helt opåverkade** — dessa är gamification-data, inte Journey-data |
| `/app/gamification` hub | Växlar till standard-vy |
| Subroutes (`/achievements`, `/coins`, `/events`) | **Oförändrade** i iteration 1 (se §9) |
| Faction-val | Sparas i DB — återkommer direkt om Journey slås på |
| Kosmetik-loadout | Sparas i DB — återkommer direkt om Journey slås på |
| Profil-hero faction-badge | Döljs om Journey är av (frivilligt i iteration 1) |

**När Journey slås PÅ igen:**

| Aspekt | Effekt |
|--------|--------|
| Tidigare faction | Återställs omedelbart |
| Skill tree progress | Visar befintlig nivå — ingenting tappas |
| Badge showcase | Visar befintliga pins |
| Kosmetik | Befintlig loadout återaktiveras |

**Toggle påverkar ENBART renderingsläge** — det är ett UI-val, inte ett dataval.

### 7.5 Faction/kosmetik-editering vid disabled Journey

**Beslut:** Faction-val och kosmetik-editering är **inte tillgängliga** när Journey är disabled. Dessa är intrinsiskt Journey-funktioner (de har ingen mening i standard-vyn). Användaren måste aktivera Journey för att ändra faction eller utrusta kosmetik.

Detta förenklar standard-vyn och undviker förvirring kring "varför finns factions om jag inte har Journey?".

---

## 8. Hub-innehållskontrakt

Stabilt kontrakt som garanterar att de två vyerna inte glider isär funktionellt.

### 8.1 Alltid gemensamma block (båda vyer)

Dessa block måste finnas i **både Journey-vy och Standard-vy**, renderade med respektive designspråk:

| Block | Data | Journey-rendering | Standard-rendering |
|-------|------|--------------------|--------------------|
| **Identitet** | displayName, avatarUrl, level | Avatar med glow-ring, levelBadge | Enkel avatar, text |
| **XP/Progression** | currentXp, nextLevelXp, level | XPProgressBar (8 skins, shimmer) | Standard `<Progress>` (shadcn/ui) |
| **Coins-översikt** | balance, recentTransactions | CoinsSection (glasmorfism) | Card med saldo + lista |
| **Streak** | currentStreakDays, bestStreakDays | StreakSection (glasmorfism) | Card med streak-info |
| **Achievements/Showcase** | showcase slots, achievements | BadgeShowcase (glow) | Card med badge-grid |
| **Navigation** | Kurser, Utmärkelser, DiceCoin, Butik, Händelselogg | Quick Nav Grid (Journey-ikoner, WebP) | Standard Card-grid med Heroicons |

### 8.2 Enbart Journey-block

Dessa block existerar **exklusivt** i Journey-vyn och har ingen motsvarighet i standard-vyn:

| Block | Komponent | Varför Journey-exklusivt |
|-------|-----------|--------------------------|
| **Faction-scene** | `JourneyScene` | Faction-gradient och CSS-variabler |
| **Ambient partiklar** | `ParticleField` | Dekorativ animation |
| **Kosmetiskt progressionsträd** | `SkillTreeSection` | Kosmetik-unlock kräver Journey |
| **Kosmetiska avatar-ramar** | `AvatarFrame` | Faction-specifik kosmetik |
| **Fraktionsväljare** | `FactionSelector` | Faction-val är Journey-koncept |
| **Dekorativa avdelare** | `SectionDivider` | Journey-specifik styling |
| **Journey CTA-sektion** | `CallToActionSection` | Journey-specifik |

### 8.3 Enbart Standard-block

| Block | Beskrivning |
|-------|-------------|
| **"Aktivera Journey"-banner** | CTA-kort som erbjuder Journey-aktivering (länk till profil eller direkt toggle) |

### 8.4 Kontrakt-regel

> Om ett nytt gemensamt block läggs till (t.ex. "Leaderboard") måste det implementeras i **båda** vyerna. Om ett nytt Journey-exklusivt block läggs till behöver det aldrig finnas i standard-vyn.

---

## 9. Subroutes — Medvetet avgränsningsbeslut (Iteration 1)

### 9.1 Befintliga subroutes

```
/app/gamification                → Dispatcher (Journey eller Standard)  ← GATAS
/app/gamification/achievements   → AchievementsOverviewPage              ← EJ I SCOPE
/app/gamification/coins          → CoinsHistoryPage                      ← EJ I SCOPE
/app/gamification/events         → GamificationEventsPage                ← EJ I SCOPE
```

### 9.2 Principbeslut

**Iteration 1 scope:** Enbart hubben (`/app/gamification`) feature-gatas. Subroutes lämnas oförändrade.

**Motivering:**

1. **Riskreduktion:** Subroutes har egna layouts och dataflöden. Att feature-gata dem samtidigt ökar implementationsrisken utan proportionell UX-vinst.

2. **Funktionell korrekthet:** Subroutes (`/achievements`, `/coins`, `/events`) visar lista/detaljinnehåll som fungerar oavsett Journey-design. Journey-stylingen på dessa sidor är kosmetisk, inte funktionell.

3. **Användarupplevelse:** En användare med Journey disabled som navigerar till `/achievements` via standard-hubben får fortfarande fungerade achievement-lista. Journey-bakgrunden på subroutes är en acceptabel temporär inkonsekvens — den bryter inget.

### 9.3 Framtida iteration

Samma dispatcher-mönster kan utvidgas till subroutes vid behov:

```
// Framtida: Subroute-dispatcher (EJ i scope nu)
// Layout som läser journeyPreference och väljer wrapper:
// Journey enabled → JourneyScene wrapper
// Journey disabled → Standard wrapper
```

### 9.4 Dokumenterat som medvetet val

Detta är ett **medvetet scope-beslut**, inte en utelämnad funktion. Det noteras i implementationsplanen som "Iteration 1 scope boundary".

---

## 10. Framtidssäkerhet

### 10.1 Generell feature-flag-modell

Journey-aktivering bygger grunden för ett generellt mönster:

```typescript
// Framtida möjlighet — INTE scope för nuvarande arbete
interface UserFeatureFlags {
  journey_enabled: boolean;
  // experimental_ai: boolean;
  // advanced_editor: boolean;
  // motion_enabled: boolean;
  // ui_density: 'compact' | 'comfortable' | 'spacious';
}
```

Om fler features behöver samma mönster i framtiden kan vi migrera `journey_enabled` till en generell `user_feature_flags`-tabell. Nuvarande lösning (kolumn i `user_journey_preferences`) är enkel att migrera.

### 10.2 Provider-mönster (framtida option)

```typescript
// Eventuellt i framtiden om Journey-state behövs globalt
<JourneyProvider>
  <JourneyEnabled>
    {/* Renderas bara om Journey är aktiverat */}
  </JourneyEnabled>
  <JourneyDisabled>
    {/* Renderas bara om Journey är inaktiverat */}
  </JourneyDisabled>
</JourneyProvider>
```

**Inte nödvändigt nu** — Journey-state behövs bara på gamification-sidan och profilen. En dispatcher-komponent med `dynamic()` räcker.

---

## 11. Sekvensdiagram

### 11.1 Första besöket

```
Användare          Frontend                    API                    DB
    │                  │                        │                      │
    ├─ /app/gamification ──►                    │                      │
    │                  ├─ GET /api/gamification ─►                     │
    │                  │                        ├─ SELECT * FROM      │
    │                  │                        │  user_journey_prefs  │
    │                  │                        │  WHERE user_id = ?   │
    │                  │                        ◄─ (ingen rad / NULL)  │
    │                  ◄─ { journeyPreference: { enabled: false,      │
    │                  │     decisionAt: null } }                      │
    │                  │                        │                      │
    │  ◄── Standard-vy + Onboarding-modal      │                      │
    │                  │                        │                      │
    ├─ Klickar "Aktivera Journey" ──►           │                      │
    │                  ├─ POST /journey-pref    │                      │
    │                  │  { enabled: true }     │                      │
    │                  │                        ├─ UPSERT             │
    │                  │                        │  journey_enabled=T   │
    │                  │                        │  decision_at=now()   │
    │                  │                        ◄─ OK                 │
    │                  ◄─ { enabled: true,      │                      │
    │                  │    decisionAt: "..." } │                      │
    │                  │                        │                      │
    │  ◄── Modal stängs, Journey-vy laddas (dynamic import)           │
    │                  │                        │                      │
```

### 11.2 Återbesök med Journey aktivt

```
Användare          Frontend                    API                    DB
    │                  │                        │                      │
    ├─ /app/gamification ──►                    │                      │
    │                  ├─ GET /api/gamification ─►                     │
    │                  │                        ├─ SELECT              │
    │                  │                        ◄─ enabled=true        │
    │                  ◄─ { journeyPreference:  │                      │
    │                  │    { enabled: true } }  │                      │
    │                  │                        │                      │
    │                  ├─ dynamic import chunk ──►                     │
    │  ◄── Journey-vy renderas                  │                      │
```

### 11.3 Profil-toggle

```
Användare          Frontend                    API                    DB
    │                  │                        │                      │
    │  Ser JourneyToggleCard (enabled = true)   │                      │
    │                  │                        │                      │
    ├─ Toggle OFF ──►  │                        │                      │
    │                  ├─ Optimistic: switch=OFF │                      │
    │                  ├─ POST /journey-pref    │                      │
    │                  │  { enabled: false }     │                      │
    │                  │                        ├─ UPDATE              │
    │                  │                        │  journey_enabled=F   │
    │                  │                        ◄─ OK                 │
    │                  ◄─ Bekräftat             │                      │
    │                  │                        │                      │
    │                  ├─ Uppdatera lokal       │                      │
    │                  │  useProfileQuery-cache  │                      │
    │                  │  (optimistic confirmed) │                      │
    │                  │                        │                      │
    │  Nästa besök /app/gamification ──►         │                      │
    │                  ├─ fetchGamificationSnapshot() (fresh mount)    │
    │                  │                        ├─ SELECT              │
    │                  │                        ◄─ enabled=false       │
    │                  ◄─ Standard-vy renderas  │                      │
```

### 11.4 Cache-refresh-strategi efter toggle

| Steg | Handling | Vad händer |
|------|----------|------------|
| 1 | Användare togglar i profil | Optimistic update av toggle-komponentens lokala state |
| 2 | POST lyckas | Uppdatera `useProfileQuery`-cachad payload (så profil-UI speglar ändringen) |
| 3 | Användare navigerar till `/app/gamification` | `fetchGamificationSnapshot()` körs vid mount (varje mount gör fresh fetch, `cache: "no-store"`) → dispatcher får färsk `journeyPreference` |
| 2b | POST misslyckas | Rollback toggle visuellt + error toast → UI förblir konsistent |

**Varför det är deterministiskt utan global cache-invalidering:**

- Gamification-hubben använder `useState + useEffect + fetch()` (inte SWR/React Query). Varje mount gör en ny fetch — det finns inget stale cache att invalidera.
- Profil-sidan använder `useProfileQuery` med stabil key per user. Efter toggle uppdateras det lokalt cachade payloadet direkt.
- Det finns ingen shared global state mellan profil och gamification-sidor — de är oberoende mount-cykler.

**Resultat:** Toggle i profil → navigering till gamification → korrekt vy. Ingen race condition möjlig.

---

## 12. Sammanfattning — Arkitekturbeslut

| Beslut | Val | Motivering |
|--------|-----|-----------|
| State-lagring | `user_journey_preferences`-tabell | Semantiskt korrekt ägandegräns — Journey-aktivering är en Journey-preferens, inte en generell UX-flagga. Global scope, redan etablerad. |
| Tri-state | `journey_enabled` + `journey_decision_at` | Skiljer "aldrig tillfrågad" från "aktivt avböjt" — krävs för korrekt onboarding |
| `journey_decision_at` semantik | Första beslutsdatum (immutable) | `updated_at` täcker "senast ändrad". Bevarat originaldatum har analytik-/supportvärde |
| Feature gate | `dynamic()` med `ssr: false` | GamificationPage är redan `'use client'` med tunga hooks — ingen SSR-vinst. Korrekt bundle-separation |
| Onboarding | Modal med statiska bilder (lättviktig) | Får INTE importera Journey-komponenter. Standard Lekbanken-design. |
| Standard-vy | Ny komponent, noll Journey-imports | Samma API-data, annan rendering. Inga Journey-beroenden i import-trädet. |
| Hub-kontrakt | Explicit lista över gemensamma/exklusiva block | Förhindrar funktionell drift mellan vyerna |
| Subroutes | Oförändrade (medvetet iteration-1 scope) | Minimera risk. Temporär inkonsekvens accepterad. Gating kan utvidgas senare. |
| Profil-toggle | Nytt kort i Översikt, styr renderingsläge | Data bevaras alltid. Toggle påverkar inte XP/coins/achievements/streaks. |
| Toggle + data | Toggle = UI-val, inte dataval | Faction, cosmetics, showcase bevaras vid disable. Återställs direkt vid re-enable. |
| Faction/kosmetik vid disabled | Ej tillgängligt | Journey-specifika features kräver aktiverat Journey |
| Default | OFF | Journey kräver explicit opt-in |
| Reversibilitet | Full — toggle i profil | Användaren kan ändra när som helst, all data bevaras |
| Migration | Konservativ — enbart `faction_id IS NOT NULL` | Starkaste och enda pålitliga signalen. Tveksamma fall visas onboarding. |
| API-isolering | `fetchGamificationSnapshot()` → enbart `GET /api/gamification` | Journey-API:er lever exklusivt i Journey-import-trädet. Verifierat i kodbas. |
| Prefetch | Journey-chunk prefetchas inte av nav-länkar | `dynamic()` skapar separat webpack-chunk — laddas enbart vid rendering |
| Cache-refresh | Lokal optimistic update + mount-refetch | Ingen global cache behövs — varje mount gör fresh fetch (`cache: "no-store"`) |
