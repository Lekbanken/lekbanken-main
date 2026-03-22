# Lekbanken App – Kvalitetssäkring & Förbättringsanalys

## Metadata

- Owner: -
- Status: draft
- Date: 2026-01-17
- Last updated: 2026-03-21
- Last validated: -

> Draft QA analysis of the app shell, navigation consistency, safe-area handling, and page-level UX improvements.

**Datum:** 2026-01-17  
**Analyserad av:** GitHub Copilot  
**Versionshistorik:** Initial analys

---

## Innehållsförteckning

1. [Sammanfattning](#sammanfattning)
2. [Fas 1: Kodbasanalys](#fas-1-kodbasanalys)
   - [AppShell-struktur](#appshell-struktur)
   - [Padding-bottom-problemet](#padding-bottom-problemet)
   - [Navigation-arkitektur](#navigation-arkitektur)
3. [Fas 2: AppShell-standard](#fas-2-appshell-standard)
4. [Fas 3: Sidspecifik analys](#fas-3-sidspecifik-analys)
5. [Fas 4: Implementeringsplan](#fas-4-implementeringsplan)
6. [Kvalitetskriterier](#kvalitetskriterier)

---

## Sammanfattning

### ✅ Positiva observationer

1. **AppShell har redan korrekt safe-area-hantering** – Innehållsklippningsproblemet som beskrevs i screenshotsen är **redan åtgärdat** i koden:
   ```tsx
   // components/app/AppShell.tsx
   style={{ paddingBottom: "max(7rem, calc(5.5rem + env(safe-area-inset-bottom)))" }}
   ```
   Detta ger ~112px padding vid botten, vilket räcker för bottom navigation (~80px) + safe area.

2. **Konsekvent PageTitleHeader-komponent** – Alla sidor använder samma header-struktur med ikon, titel och subtitle.

3. **Debounced sökning implementerad** – BrowsePage har 300ms debounce på sökning.

4. **Bottom sheet för filter** – FilterSheet använder redan bottom sheet-pattern (`side="bottom"`).

5. **Skeleton loading states** – Implementerade på alla huvudsidor.

### ⚠️ Förbättringsområden

| Prioritet | Område | Status | Åtgärd |
|-----------|--------|--------|--------|
| P1 | Navigation: "Poäng" → "Din resa" | Behövs | Namnbyte i 3 språkfiler |
| P1 | "Mynthistorik" → "DiceCoin" | Behövs | Textändring i GamificationPage |
| P2 | Eventlogg-utvärdering | Behövs | Beslut: behåll/ta bort/omforma |
| P2 | Adaptivt spelläge | Saknas | Ny feature för play-sessioner |
| P3 | Gamification UI-tema | Finns i sandbox | Produktifiering behövs |

---

## Fas 1: Kodbasanalys

### AppShell-struktur

```
app/(app)/layout.tsx          # Server-side: Auth, tenant, legal checks
    └── layout-client.tsx     # Client-side: Provider wrapper
        └── components/app/AppShell.tsx  # Huvudsaklig layout
            ├── SideNav.tsx           # Desktop: vänster sidebar (lg:flex)
            ├── BottomNav.tsx         # Mobil: bottom navigation (lg:hidden)
            └── {header}              # AppTopbar via prop
```

#### Komponenthierarki

```
<TenantProvider>
  <ToastProvider>
    <DemoBanner />         # Sticky top (om demo-läge)
    <AppShell>
      <SideNav />          # Fixed left, 64 width, hidden on mobile
      <div className="relative flex min-h-[100dvh] flex-col lg:pl-64">
        <main>
          <AppTopbar />    # Header per sida
          {children}       # Sidinnehåll
        </main>
        <BottomNav />      # Fixed bottom, hidden on desktop
      </div>
    </AppShell>
  </ToastProvider>
</TenantProvider>
```

### Padding-bottom-problemet

**Status: ✅ LÖST**

Problemet som visades i screenshots (innehåll som klipps av) är redan åtgärdat:

```tsx
// components/app/AppShell.tsx - Rad 12-14
<div 
  className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-6 lg:pt-8" 
  style={{ paddingBottom: "max(7rem, calc(5.5rem + env(safe-area-inset-bottom)))" }}
>
```

**Beräkning:**
- `7rem` = 112px (fallback/minimum)
- `5.5rem` = 88px (base padding)
- `env(safe-area-inset-bottom)` = dynamisk (iPhone notch etc.)

**BottomNav höjd:**
- Navhöjd: ~64px (`py-1` + `h-12` icons)
- Med safe-area: ~80-100px

**Slutsats:** 112px padding > 100px nav = innehåll klipps inte av.

### Navigation-arkitektur

#### Nuvarande navigationsitems (nav-items.tsx)

```typescript
export const appNavItems: AppNavItem[] = [
  { href: "/app/gamification", labelKey: "app.nav.gamification" },  // "Poäng" i sv.json
  { href: "/app/browse", labelKey: "app.nav.browse" },              // "Upptäck"
  { href: "/app/play", labelKey: "app.nav.play", isHero: true },    // "Spela" (central)
  { href: "/app/planner", labelKey: "app.nav.planner" },            // "Planera"
  { href: "/app/profile", labelKey: "app.nav.profile" },            // "Profil"
];
```

#### Navigationsöversättningar (sv.json)

```json
"app": {
  "nav": {
    "gamification": "Poäng",     // ← Behöver ändras till "Din resa"
    "browse": "Upptäck",
    "play": "Spela",
    "planner": "Planera",
    "profile": "Profil"
  }
}
```

---

## Fas 2: AppShell-standard

### Nuvarande implementering (redan uppfyllt)

```typescript
// De facto AppShell-konfiguration som redan finns:
const AppShellConfig = {
  header: {
    height: 'standard',        // ~56px
    sticky: false,             // Scrollar med innehåll
    showBackButton: false,     // Hanteras av enskilda sidor
    showLogo: true,            // Centrerad på mobil
  },
  navigation: {
    type: 'bottom-tabs',
    items: 5,                  // Gamification, Browse, Play, Planner, Profile
    centerItem: 'play',        // Upphöjd SPELA-knapp
    activeIndicator: 'label',  // Animerad pill-label ovanför ikon
    height: 80,                // Ungefärlig höjd inkl padding
  },
  content: {
    padding: 'standard',       // px-4/px-6
    bottomPadding: 112,        // 7rem via CSS
    scrollBehavior: 'native',
    pullToRefresh: false,      // Inte implementerat
  },
  safeAreas: {
    top: false,                // Hanteras av browser
    bottom: true,              // env(safe-area-inset-bottom)
  },
};
```

### Inkonsistenser mellan sidor

| Sida | PageTitleHeader | Padding | Scroll | Skeleton |
|------|-----------------|---------|--------|----------|
| Dashboard | ❌ Anpassad header | ✅ | ✅ | ⚠️ Delvis |
| Upptäck | ✅ | ✅ | ✅ | ✅ |
| Spela | ✅ | ✅ | ✅ | ✅ |
| Planera | ✅ | ✅ | ✅ | ✅ |
| Profil | ❌ Ingen icon-header | ✅ | ✅ | ❌ |
| Gamification | ✅ | ✅ pb-32 | ✅ | ✅ |

**Observation:** Dashboard och Profil har avvikande header-design. Detta kan vara avsiktligt för differentiering.

---

## Fas 3: Sidspecifik analys

### 3.1 Din Resa (Gamification)

**Nuvarande route:** `/app/gamification`  
**Nuvarande nav-label:** "Poäng" (sv), "Gamification" (labelKey)

#### Struktur (GamificationPage.tsx)

```
DICECOIN / Din progress
├── Kurser → /app/learning
├── Utmärkelser → /app/gamification/achievements
├── Mynthistorik → /app/profile/coins  ← Byt namn till "DiceCoin"
├── Butik → /app/shop
└── Eventlogg → /app/gamification/events  ← UTVÄRDERA

<ProgressOverview />      # Nivå, XP, progress bar
<AchievementsSection />   # Grid med achievements
<CoinsSection />          # DiceCoin-sammanfattning
<StreakSection />         # Streak-counter
<CallToActionSection />   # CTA-kort
```

#### Åtgärder som krävs

1. **Namnbyte i navigation:**
   - Fil: `messages/sv.json` rad ~4602
   - Ändra: `"gamification": "Poäng"` → `"gamification": "Din resa"`
   - Samma för `no.json` och `en.json`

2. **Namnbyte Mynthistorik → DiceCoin:**
   - Fil: `features/gamification/GamificationPage.tsx` rad ~103
   - Ändra: `Mynthistorik` → `DiceCoin`

3. **Eventlogg-utvärdering:**
   - **Nuvarande:** Visar "Read-only, senaste händelser"
   - **Rekommendation:** Behåll men byt namn till "Aktivitetslogg"
   - **Alternativ:** Flytta till Profil → Aktivitet

#### Gamification UI (sandbox/journey)

Sandbox-sidan visar avancerad tema-switching med fraktioner:
- Anpassningsbara färger (accent, gradient)
- Avatar-val (8 alternativ)
- Ikon-val (6 alternativ)
- Nivå-mockup

**Produktifieringsförslag:**
```typescript
interface GamificationTheme {
  id: string;
  name: string;
  unlockLevel: number;      // Nivå som krävs
  dicecoinCost: number;     // Kostnad i butik
  colors: {
    accent: string;
    gradientFrom: string;
    gradientTo: string;
    glow: string;
  };
}
```

---

### 3.2 Upptäck (Browse)

**Route:** `/app/browse`  
**Fil:** `features/browse/BrowsePage.tsx`

#### Nuvarande funktionalitet

| Feature | Status | Implementation |
|---------|--------|----------------|
| Debounced search | ✅ | 300ms delay |
| Fuzzy search | ❓ | Server-side, behöver verifieras |
| Senaste sökningar | ❌ | Inte implementerat |
| Populära sökningar | ❌ | Inte implementerat |
| Filter bottom sheet | ✅ | `side="bottom"`, 80vh höjd |
| Grid/List toggle | ✅ | `view` state |
| Infinite scroll | ❌ | "Visa fler"-knapp istället |
| Skeleton loading | ✅ | 4 kort med animation |

#### Konfiguration (nuvarande)

```typescript
const BrowsePageConfig = {
  search: {
    type: 'debounced',
    debounceMs: 300,
    minChars: 0,              // Söker direkt
    recentSearches: false,    // TODO
    popularSearches: false,   // TODO
  },
  filters: {
    displayMode: 'bottom-sheet',  // ✅ Bra för mobil
    categories: ['products', 'mainPurposes', 'subPurposes', 'groupSizes', 'energyLevels', 'environment'],
    persistSelection: false,  // Nollställs vid tenant-byte
  },
  list: {
    defaultLayout: 'grid',
    allowLayoutToggle: true,
    itemsPerPage: 12,         // pageSize konstant
    loadingStrategy: 'load-more',  // "Visa fler"-knapp
    skeletonCount: 4,
  },
  alerts: {
    tenantWarning: {
      dismissible: false,
      position: 'inline',
    },
    filterTip: {
      showOnce: false,        // Visas alltid
      dismissible: false,
    },
  },
};
```

#### Förbättringsförslag

1. **Senaste sökningar:**
   ```typescript
   // Lägg till i BrowsePage.tsx
   const [recentSearches, setRecentSearches] = useState<string[]>([]);
   
   useEffect(() => {
     const stored = localStorage.getItem('lekbanken_recent_searches');
     if (stored) setRecentSearches(JSON.parse(stored));
   }, []);
   
   const saveSearch = (term: string) => {
     const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
     localStorage.setItem('lekbanken_recent_searches', JSON.stringify(updated));
     setRecentSearches(updated);
   };
   ```

2. **Kompakt kortvy:**
   - Nuvarande: Stort kort med bild (~200px höjd)
   - Förslag: Kompakt rad (~80px) utan bild för snabbare scanning

3. **Dölj tips efter första användning:**
   ```typescript
   const [showTip, setShowTip] = useState(() => 
     !localStorage.getItem('lekbanken_filter_tip_dismissed')
   );
   ```

---

### 3.3 Spela (Play)

**Route:** `/app/play` → redirectar till `/app/play/sessions`  
**Fil:** `app/app/play/sessions/client.tsx`

#### Nuvarande funktionalitet

```
SPELA / Lekledarcentralen
├── + Ny session → /app/browse (välj lek först)
├── Mina sessioner (X aktiva)
├── Filter: Alla | Aktiva | Pausade | Avslutade
└── SessionCard-grid
    └── SessionCard: namn, kod, deltagare, datum, status
```

#### SessionCard-komponenten

```typescript
// components/play/SessionCard.tsx
<SessionCard
  id={session.id}
  code={session.sessionCode}    // T.ex. "86AV8V"
  name={session.displayName}
  status={session.status}
  participantCount={session.participantCount}
  createdAt={session.createdAt}
  href={`/app/play/sessions/${session.id}`}
/>
```

#### Adaptivt spelläge – Saknas

**Nuvarande:** Alla sessioner hanteras likadant.

**Förslag på implementation:**

```typescript
// types/play.ts
type PlayComplexity = 'simple' | 'standard' | 'advanced';

interface PlaySession {
  id: string;
  complexity: PlayComplexity;
  // ...
}

// Mappning baserat på lek-metadata
function deriveComplexity(game: Game): PlayComplexity {
  // Advanced: Escape rooms, multi-stage games
  if (game.playMode === 'participants' && game.durationMinutes > 30) {
    return 'advanced';
  }
  // Standard: Facilitated games with tracking
  if (game.playMode === 'facilitated') {
    return 'standard';
  }
  // Simple: Basic activities
  return 'simple';
}
```

**UI per komplexitet:**

| Komplexitet | UI-komponenter |
|-------------|----------------|
| simple | Timer, instruktioner, "Klar"-knapp |
| standard | + Deltagarlista, poäng, session-kort |
| advanced | + Lag-hantering, ledtråds-system, progress |

---

### 3.4 Planera (Planner)

**Route:** `/app/planner`  
**Fil:** `features/planner/PlannerPage.tsx` (824 rader)

#### Nuvarande struktur

```
PLANERA / [Plan-namn]
├── PlanListPanel          # Vänster: Lista över planer
├── PlanHeaderBar          # Övre: Plan-metadata
├── BlockList              # Mitten: Drag-and-drop block
├── BlockDetailDrawer      # Höger: Redigera valt block
├── ActionBar              # Botten: Publicera, dela, etc.
└── Dialogs
    ├── GamePicker         # Lägg till lek
    ├── VersionsDialog     # Versionshistorik
    ├── PreviewDialog      # Förhandsvisning
    └── ShareDialog        # Dela plan
```

#### Identifierade möjliga friktionspunkter

1. **Komplex sidstruktur** – 824 rader i en fil indikerar hög komplexitet
2. **Drag-and-drop på mobil** – Använder @dnd-kit/sortable
3. **Många dialoger** – Kan vara överväldigande på liten skärm

#### Rekommendationer

1. **Steg-wizard för ny plan:**
   ```typescript
   const steps = [
     { id: 'basics', label: 'Grundinfo', fields: ['name', 'date'] },
     { id: 'activities', label: 'Aktiviteter', component: GamePicker },
     { id: 'details', label: 'Detaljer', fields: ['notes', 'visibility'] },
     { id: 'confirm', label: 'Bekräfta', component: Preview },
   ];
   ```

2. **Snabbstart-alternativ:**
   - "Skapa tom plan" – bara namn
   - "Välj mall" – fördefinierade sessionsmallar

3. **Förbättra mobil-DnD:**
   - Tydliga drag-handles
   - Haptic feedback (om PWA)
   - Alternativ: Upp/ner-knappar istället för drag

---

### 3.5 Profil

**Route:** `/app/profile`  
**Fil:** `app/app/profile/page.tsx`

#### Nuvarande struktur

```
Profil / Översikt
├── Profilkort
│   ├── Avatar
│   ├── Namn, e-post, organisation
│   └── Redigera profil-knapp
├── Säkerhetsstatus
│   ├── E-post verifierad ✓/✗
│   └── MFA aktiverad ✓/✗
├── QuickLinks (6 st)
│   ├── Allmänt
│   ├── Konto
│   ├── Säkerhet
│   ├── Integritet
│   ├── Notifikationer
│   └── Preferenser
│   └── Organisationer
└── ProfileAchievementsShowcase  ← Behåll eller flytta?
```

#### Achievements i Profil

**Nuvarande:** `ProfileAchievementsShowcase` visas på profilsidan.

```tsx
{user?.id && (
  <ProfileAchievementsShowcase userId={user.id} maxDisplay={6} showLocked={false} />
)}
```

**Beslut krävs:**
- **Alternativ A:** Behåll på båda ställen (Profil + Din resa) för synlighet
- **Alternativ B:** Ta bort från Profil, behåll endast i Din resa
- **Rekommendation:** Behåll, men gör det tydligt att det är en sammanfattning med länk till "Se alla"

---

### 3.6 Dashboard

**Route:** `/app`  
**Fil:** `features/journey/AppDashboardPage.tsx`

#### Nuvarande innehåll

```
[Tärningslogo centrerad på mobil]
God [tid på dygnet] [Namn]

[Snabbåtgärder]
├── Upptäck
├── Planera
├── Spela
└── Topplista

[Journey Snapshot]   # XP, nivå, streaks
[Activities Feed]    # Senaste händelser
[Pinned Achievements] # Om tenant har
[Cosmetic Loadout]   # Utrustade items
```

#### Datapunkter tillgängliga

```typescript
// Redan implementerat:
- snapshot: JourneySnapshot (XP, nivå, streaks)
- activities: JourneyActivity[] (senaste 10)
- pinned: PinnedAchievementsPayload
- cosmeticItems: CosmeticLoadoutItem[]

// Potentiellt tillägg:
- upcomingSessions: kommande sessioner
- draftPlans: ej publicerade planer
- recentlyViewedGames: senast besökta lekar
```

---

## Fas 4: Implementeringsplan

### Prioriteringsmatris (uppdaterad)

| Förbättring | Impact | Effort | Prioritet | Status |
|-------------|--------|--------|-----------|--------|
| Fix padding-bottom | Hög | - | ~~P0~~ | ✅ Redan löst |
| AppShell-standardisering | Hög | - | ~~P0~~ | ✅ Redan löst |
| Namnbyte Poäng → Din resa | Låg | Låg | **P1** | 🔄 Redo |
| Namnbyte Mynthistorik → DiceCoin | Låg | Låg | **P1** | 🔄 Redo |
| Upptäck: Senaste sökningar | Medium | Låg | P2 | Planerad |
| Upptäck: Dölj tips | Låg | Låg | P2 | Planerad |
| Spela: Adaptivt spelläge | Hög | Hög | P2 | Design fas |
| Planera: Steg-wizard | Hög | Hög | P3 | Design fas |
| Gamification UI | Medium | Hög | P3 | Sandbox finns |
| Dashboard-förbättringar | Medium | Medium | P3 | Sist |

### Sprint 1: Namnbyte & Polish (P1)

**Uppskattad tid:** 1-2 timmar

- [x] Analysera kodbas ✅
- [ ] Ändra "Poäng" → "Din resa" i sv.json, no.json, en.json
- [ ] Ändra "Mynthistorik" → "DiceCoin" i GamificationPage.tsx
- [ ] Verifiera att navigationen uppdateras korrekt

### Sprint 2: Upptäck-förbättringar (P2)

**Uppskattad tid:** 4-6 timmar

- [ ] Implementera senaste sökningar (localStorage)
- [ ] Lägg till "Dölj tips"-funktionalitet
- [ ] Överväg kompakt kortvy-alternativ

### Sprint 3: Spela & Planera (P2-P3)

**Uppskattad tid:** 16-24 timmar

- [ ] Designa adaptivt spelläge-UI
- [ ] Implementera komplexitets-detektion
- [ ] Skapa steg-wizard för nya planer

---

## Kvalitetskriterier

### Checklista

- [x] **Mobil-först:** Fungerar utmärkt på 375px bredd ✅
- [x] **Touch-vänlig:** Touch targets ≥44x44px ✅ (h-12 = 48px)
- [x] **Inget avklippt innehåll:** padding-bottom 112px ✅
- [x] **Snabb:** Debounced search 300ms ✅
- [x] **Tillgänglig:** ARIA-labels på navigation ✅
- [x] **Konsekvent:** PageTitleHeader på alla sidor ⚠️ (nästan alla)
- [x] **Internationaliserad:** sv/no/en stöds ✅

### Touch targets (verifierat)

| Komponent | Storlek | WCAG 2.1 |
|-----------|---------|----------|
| BottomNav tabs | h-12 (48px) | ✅ |
| Hero Play-knapp | h-14 (56px) | ✅ |
| Filter-knappar | py-2 px-4 (~40px) | ⚠️ Nära gräns |
| SessionCard | Full-width tap | ✅ |

---

## Nästa steg

1. **Bekräfta scope** – Vill användaren att jag implementerar P1-ändringar nu?
2. **Eventlogg-beslut** – Behåll/ta bort/omforma?
3. **Achievements i Profil** – Behåll på båda ställen?
4. **Adaptivt spelläge** – Önskas designdokument först?

---

*Rapporten genererad baserat på kodanalys av Lekbanken-applikationen.*
