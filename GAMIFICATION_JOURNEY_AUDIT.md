# Implementeringsaudit: Journey som design för /app/gamification

> **Datum:** 2026-02-13  
> **Status:** 🔒 v2.5 LÅST — v1 + v2 (particles, dividers, coins vault, badge sparkle) + v2.5 (streak glow, dark skeleton, nav hover, QA fixes). UI-QA före staging.  
> **Mål:** Uppgradera `/app/gamification` med Journey-designspråk och funktionalitet

### Arkitekturbeslut (2026-02-13)

| # | Beslut | Val |
|---|--------|-----|
| B1 | Dark theme scope | **Alt A** — Hela sidan mörk, men JourneyScene scoped till gamification-roten (påverkar ej global layout) |
| B2 | Avatar-källa | **Alt A + fallback** — `auth.users.raw_user_meta_data.avatar_url` → initials-avatar som fallback |
| B3 | Faction-lagring | **Alt A** — `user_progress.faction_id` TEXT nullable, globalt per user (ej per tenant) |
| B4 | Implementeringsordning | **Hybrid** — Fas 1 → 2 → 3 först. Fas 4 (faction) som separat steg efter UI känns rätt |
| B5 | Animations-nivå | **Alt B** — Moderat (shimmer, glow, count-up, hover). Skill tree styr cosmetic-unlocks som utökar animationer per user |
| B6 | Undersidor | **Alt C** — Hub + Achievements. Coins/events enklare styling |

### Arkitekturprinciper
1. **Journey = UI-layer ovanpå Gamification** (ej parallellt system)
2. **En unified snapshot** — utöka befintlig `GET /api/gamification` med identity + progress + stats (additive only, ingen ny endpoint)
3. **JourneyScene scoped** — CSS vars inom `.journey-root`, påverkar ej resten av `/app/`
4. **Animations-budget** — max 15 unika `@keyframes` i gamification-bundle. Inga `infinite` utan `prefers-reduced-motion` guard. Skill tree kan unlocka mer per user via cosmetics
5. **Faction = identitet** — globalt per user, ej per tenant

---

## 1. Nuläge — Vad som redan finns

### 1.1 Gamification Hub (`/app/gamification`)
| Fil | Status | Beskrivning |
|-----|--------|-------------|
| `features/gamification/GamificationPage.tsx` | ✅ Uppdaterad | Nav-grid med Journey WebP-ikoner, sektionsordning: Progress → Coins → Streak → Achievements → CTA |
| `features/gamification/components/ProgressOverview.tsx` | 🔄 Ersatt | Ersatt av inline XP-bar + JourneyStats i GamificationPage |
| `features/gamification/components/CoinsSection.tsx` | ✅ Uppdaterad | WebP-ikon istället för emoji, shimmer-animation, transaktionslista |
| `features/gamification/components/StreakSection.tsx` | ✅ Uppdaterad | WebP-ikon istället för emoji, veckodags-dots, hero-kort |
| `features/gamification/components/AchievementsSection.tsx` | ✅ Uppdaterad | WebP-ikon, BadgeIcon-rendering, grid 3×2 |
| `features/gamification/components/AchievementCard.tsx` | ✅ Fungerar | BadgeIcon, klick→modal, progress bar, status-badge |
| `features/gamification/components/AchievementDetailModal.tsx` | ✅ Fungerar | Dialog med badge-preview, progress, hint |
| `features/gamification/components/CallToActionSection.tsx` | ✅ Uppgraderad | WebP-ikon, glassmorfism, i18n-labels, inga emojis |
| `features/gamification/components/BadgeIcon.tsx` | ✅ Fungerar | Bro till admin badge-asset-system |

### 1.2 Undersidor
| Sida | Status | Beskrivning |
|------|--------|-------------|
| `/app/gamification/achievements` | ✅ Fungerar | Full overview med pin-funktionalitet, AchievementCard grid |
| `/app/gamification/coins` | ✅ Uppgraderad | JourneyScene dark theme, WebP-ikon, glassmorfism, filter funktion bevarad |
| `/app/gamification/events` | ✅ Server-komponent | Supabase direkt-query, eventlogg med metadata |
| `/app/shop` | ✅ Fungerar | Fullständig butik med kategorier, sök, rarity, köp |
| `/app/leaderboard` | ✅ Finns | Separat sida |

### 1.3 Journey-komponenter (production-ready)
| Komponent | Plats | Används i |
|-----------|-------|-----------|
| `JourneyScene` | `components/journey/` | Temawrapper med faction-gradient + CSS vars |
| `JourneyIdentity` | `components/journey/` | Avatar + level badge + faction tag |
| `JourneyProgress` | `components/journey/` | XP-bar med shimmer, milestone preview |
| `JourneyStats` | `components/journey/` | 3 stat-pills (coins/badges/streak) |
| `JourneyActions` | `components/journey/` | 4 action-knappar med SVG-ikoner |
| `JourneyOverview` | `components/journey/` | Komposition av alla ovan (full + compact) |

### 1.4 Stödsystem som finns
| System | Plats | Status |
|--------|-------|--------|
| Factions (4 teman) | `lib/factions.ts` | ✅ Komplett — Forest/Sea/Sky/Void + default |
| XP-kurva | `lib/factions.ts` | ✅ `getXPForLevel()`, `getLevelFromTotalXP()` |
| Journey types | `types/journey.ts` | ✅ `JourneyState`, `FactionTheme`, milstolpar etc. |
| Journey API | `features/journey/api.ts` | ✅ `/api/journey/snapshot`, `/api/journey/feed` |
| Gamification API | 11+ API-routes | ✅ Komplett — snapshot, achievements, coins, events, leaderboard, burn, pins |
| Badge-system | `features/admin/achievements/` | ✅ 46 filer — editor, renderer, presets |
| Achievement notifications | `features/gamification/hooks/` | ✅ Queue, auto-award, localStorage |
| Cosmetics loadout | `/api/cosmetics/loadout` | ✅ GET + POST, level-gated |
| Dashboard (AppDashboardPage) | `features/journey/` | ✅ 498 rader — hero, stats, pinned, cosmetics, activity feed |

---

## 2. Gap-analys — Vad Journey Sandbox har som Gamification saknar

### 2.1 Visuell design

| Element | Journey Sandbox | Gamification nu | Gap |
|---------|----------------|-----------------|-----|
| **Bakgrund** | Mörk immersiv gradient (`gradientFrom → gradientTo`) + radial glow | Vit/zink-kort på ljus bakgrund | ❌ Stort |
| **Temavariabler** | CSS custom properties (`--journey-accent` etc.) via `JourneyScene` | Hård-kodade Tailwind-klasser (`text-primary`, `bg-zinc-*`) | ❌ Stort |
| **Glassmorfism** | `bg-white/10 backdrop-blur-sm` på alla kort | `bg-white dark:bg-zinc-900` med solid borders | ❌ Stort |
| **Färgpalett** | Dynamisk per faction (emerald/ocean/amber/violet) | Fast primary (#7b4fff) + accent (#00c7b0) | ❌ Stort |
| **Typografi** | Vit text (`text-white`, `text-white/70`) mot mörk bg | `text-zinc-900 dark:text-white` | ❌ Kopplat till bakgrund |
| **Rundningar** | `rounded-xl` till `rounded-full` | `rounded-xl` till `rounded-2xl` | ⚪ Liten |
| **Animationer** | 80+ `@keyframes` (shimmer, pulse, float, orbit etc.) | Minimal (`shimmer_3s` på coins, `animate-bounce` borttaget) | ❌ Stort |
| **Ikoner** | Custom SVG per kontext (coin, badge, shop, log, flame) | Journey WebP (nyligen tillagda) + Heroicons | ⚠️ Blandat |

### 2.2 Komponenter & funktionalitet

| Funktion | Journey Sandbox | Gamification | Gap | Prioritet |
|----------|----------------|--------------|-----|-----------|
| **Avatar-visning** | `CleanAvatar` — 96px, 4 ramtyper, 8 effekter, level badge | ❌ Finns ej | ❌ Saknas helt | P1 |
| **XP Progress bar** | `CleanProgressBar` — 8 skins, tick marks, shimmer | `ProgressOverview` — enkel gradient bar | ❌ Funktionsgap | P1 |
| **Stat-pills** | `CleanStatCard` med 3D-tilt + burst click | Separata sektioner (Coins/Streak/Achievements) | ⚠️ Annorlunda struktur | P2 |
| **Milestone-badge** | `CleanMilestoneBadge` — cirkulär SVG progress ring | `ProgressOverview` visar `nextReward` som text | ❌ Saknas | P2 |
| **Badge showcase** | `BadgeShowcase` — hero badge + 4×3 grid + klick-modal | `AchievementsSection` — 3×2 grid + klick-modal | ⚠️ Liknande, men enklare | P3 |
| **DiceCoin vault** | `DiceCoinVault` — animerad counter, flytande mynt, 100px ikon | `CoinsSection` — saldo + 3 transaktioner | ❌ Funktionsgap | P2 |
| **Streak-visualisering** | `StreakSection` — hero card + vecko-dots | Journey sandbox: streak som en siffra i stat-pill | ✅ Gamification bättre! | — |
| **Kursväg** | `CourseJourneyPath` — vertikal timeline med 4 kursnoder | ❌ Finns ej | ❌ Saknas | P3 |
| **Shop showcase** | `ShopShowcase` — auto-roterande spotlight, rarity-glow | Separat sida (`/app/shop`) | ⚠️ Kan lägga till preview | P3 |
| **Factions** | Full faction-väljare + visuellt tema per fraktion | ❌ Finns ej i gamification UI | ❌ Saknas | P1 |
| **Skill tree** | `SkillTreeInline` — 9 noder per fraktion, cosmetic unlock | ❌ Finns ej | ❌ Saknas | P3 |
| **Sektionsavdelare** | `SectionDivider` — 8 stilar (glow, nebula, ornament etc.) | Ingen (bara `space-y-6`) | ❌ Saknas | P2 |
| **Header frame** | `HeaderFrameOverlay` — 9 stilar (ornate, neon, aurora etc.) | Ingen | ❌ Saknas | P3 |
| **Bakgrundseffekter** | `BackgroundEffectsLayer` — 12 effekter (partiklar, stjärnor etc.) | Ingen | ❌ Saknas | P3 |
| **Cosmetics loadout** | Sandbox: skill tree → cosmetic apply | Dashboard: level-gated lista | ⚠️ Annorlunda approach | P3 |

### 2.3 Data & API

| Datapunkt | Journey API | Gamification API | Gap |
|-----------|-------------|------------------|-----|
| Level/XP | `/api/journey/snapshot` → level, xp, xpToNext | `/api/gamification` → progress.level, currentXp, nextLevelXp | ✅ Båda har det |
| Coins balance | snapshot.coinsBalance | gamification.coins.balance | ✅ Båda har det |
| Achievement count | snapshot.unlockedAchievements | gamification.achievements[] | ✅ Båda har det |
| Streak days | snapshot.streakDays | gamification.streak.currentDays | ✅ Båda har det |
| Faction | ❌ Ej i API (mock i sandbox) | ❌ Ej i API | ❌ Ingen har det |
| Activity feed | `/api/journey/feed` → items[] med type, title, href | ❌ Gamification saknar feed | ⚠️ Finns men ej kopplat |
| Pinned achievements | Via gamification pins-API (`/api/gamification/pins`) | ✅ Finns | ✅ |
| Cosmetics | `/api/cosmetics/loadout` | ✅ Finns i dashboard | ✅ |
| Avatar URL | snapshot.avatarUrl | ❌ Saknas i gamification payload | ⚠️ Behövs |
| Display name | snapshot.displayName | ❌ Saknas i gamification payload | ⚠️ Behövs |

---

## 3. Implementeringsplan — Steg för steg

### Fas 1: Foundation — JourneyScene integration (P1)
> **Mål:** Ge gamification-sidan Journey-känslan utan att bryta befintlig funktionalitet
> **Estimat:** ~2-3 timmar

#### 1A. Wrappa GamificationPage i JourneyScene
- Importera `JourneyScene` och `getFactionTheme` 
- Wrappa hela `<div className="space-y-6">` i `<JourneyScene>`
- Använd `DEFAULT_THEME` (Lekbanken purple) som standard
- Uppdatera alla barnkomponenter till att använda `text-white` / `text-white/70` mot den mörka bakgrunden
- Glassmorfism på alla kort: `bg-white/10 backdrop-blur-sm border-white/10`

#### 1B. Konvertera ProgressOverview till Journey-stil XP-bar
- Ersätt den vita boxen med `JourneyProgress`-inspirerad dark-theme bar
- Shimmer-animation med `@keyframes shimmer`
- Level-badge med glow-effekt
- Milestone-preview om `nextReward` finns

#### 1C. Lägg till stat-pills rad
- Infoga `JourneyStats`-liknande rad med 3 pills: DiceCoin / Utmärkelser / Streak
- Glassmorfism styling, faction accent color
- Klickbara → scrollar till respektive sektion

**Risker:**
- Dark theme kan krocka med resten av `/app/`-layouten → lösning: scope JourneyScene till content-area
- Gamification-sidalayout (`space-y-6 pb-32`) behöver anpassas till helskärms-gradient

---

### Fas 2: Identity & Avatar (P1)
> **Mål:** Visa användarens avatar, namn och level prominent
> **Estimat:** ~1-2 timmar

#### 2A. Lägg till avatar-hero sektion
- Antingen använd `JourneyIdentity` direkt eller skapa en lighter variant
- Hämta `avatarUrl` och `displayName` (kräver data — se 2B)
- Level-badge med glow
- Faction-tag (om vald — se Fas 4)

#### 2B. Utöka Gamification API payload
- Lägg till `avatarUrl`, `displayName` i `/api/gamification` response
- Alternativt: Gör parallell fetch till `/api/journey/snapshot`
- **Beslut behövs:** Nytt fält i gamification API vs. Journey-snapshot-beroende

**Risker:**
- Avatar-systemet (sandbox avatar builder) kanske inte är kopplat till user profile ännu
- `displayName` finns i `auth.users` men `avatarUrl` kan sakna fallback

---

### Fas 3: Sektions-uppgradering (P2)
> **Mål:** Uppgradera varje sektion till Journey-kvalitet
> **Estimat:** ~3-4 timmar

#### 3A. CoinsSection → DiceCoin Vault-liknande
- Animerad sifferteller (count-up animation)
- Större DiceCoin WebP-ikon (100px med glow)
- Flytande mini-mynt animation (dekorativ)
- Transaktionslista med tydligare +/- färgsystem
- Glassmorfism-kort

#### 3B. StreakSection — behåll + polish
- Streaksektionen är redan bra (bättre än Journey sandbox!)
- Uppgradera till glassmorfism (mörk bakgrund)
- Animera siffrorna (count-up)
- Week-dots med accent-färg istället för `bg-emerald-500`

#### 3C. AchievementsSection → Badge Showcase-liknande
- Behåll befintlig `BadgeIcon`-rendering (redan korrekt)
- Lägg till "hero badge" (senast upplåst, stor visning)
- Förbättra grid-layout med glassmorfism-kort
- Achievement klick-modal: lägg till confetti-effekt

#### 3D. CTA-sektion → Journey-designspråk
- Ersätt ✨ emoji med Journey-ikon
- Glassmorfism-knappar
- Ta bort hårdkodade "+25 XP" / "+15 XP" — beräkna från reward engine eller ta bort

#### 3E. Sektionsavdelare
- Lägg till `SectionDivider`-komponent med labeltext
- Starta med stil "line" (enklast) med faction accent
- Placera mellan varje sektion

**Risker:**
- Count-up animationer kan vara distraktiva → lägg till `prefers-reduced-motion` check
- DiceCoin Vault-animationer (flytande mynt) kräver 6+ CSS keyframes

---

### Fas 4: Faction-system (P1 — kärna för personalisering)
> **Mål:** Låta användaren välja faction som ändrar hela sidans visuella tema
> **Estimat:** ~4-6 timmar

#### 4A. Faction-väljare komponent
- 4 factions: Forest 🌲 / Sea 🌊 / Sky ☀️ / Void 🌌
- Visa som klickbara kort med smakprov på gradient + accent
- Sparas till user profile (kräver DB-uppdatering)

#### 4B. Databas — user faction val
- **Alternativ A:** Lägg till `faction_id` kolumn i `user_progress` (TEXT, nullable)
- **Alternativ B:** Lägg till `faction_id` i `leader_profile` (redan per-tenant)
- **Alternativ C:** Ny tabell `user_journey_preferences` (faction, design_config)
- **Beslut behövs:** Var sparas det?

#### 4C. API-ändring
- Inkludera `factionId` i gamification snapshot response
- Ny endpoint `POST /api/gamification/faction` för att spara val
- Alternativt: generisk preferences-endpoint

#### 4D. Tema-byte
- `getFactionTheme(factionId)` → `FactionTheme`
- Alla Journey-komponenter läser `theme.accentColor` etc.
- Gradient-bakgrund ändras per faction
- Accent-färg propageras till alla kort, pills, bars

**Risker:**
- Kräver databasmigration
- Kräver ny API-route
- Edge case: vad händer om ingen faction vald? → `DEFAULT_THEME` (Lekbanken purple)
- Multi-tenant: faction per tenant eller globalt per user?

---

### Fas 5: Animationer & polish (P2-P3)
> **Mål:** Polera UX med subtila animationer
> **Estimat:** ~2-3 timmar

#### 5A. XP bar skins
- Implementera minst 3 skins: `clean` (default), `shimmer`, `energy`
- Skin-val kan kopplas till level eller cosmetic unlock

#### 5B. Stat cards med interaktivitet
- 3D tilt on hover (`perspective(600px) rotateX/rotateY`)
- Burst-animation on click
- Count-up animation vid mount

#### 5C. Bakgrundseffekter (light)
- Particles (floating dots) — subtilt, kopplade till faction accent
- Respektera `prefers-reduced-motion`
- Max 20 partiklar för performance

#### 5D. Avatar-effekter
- Glow-ring runt avatar med accent-färg
- Pulse-animation (subtil)
- Level badge med drop-shadow

**Risker:**
- Performance — animationer på mobil. Använd `will-change`, `transform: translateZ(0)`
- styled-jsx `<style jsx>` blocks kan polla SSR → testa noggrant

---

### Fas 6: Undersidor-alignment (P2)
> **Mål:** Ge konsistent Journey-design till alla gamification-undersidor
> **Estimat:** ~3-4 timmar

#### 6A. Coins-sidan (`/app/gamification/coins`)
- Ersätt 🪙 emoji med DiceCoin WebP
- Glassmorfism-kort med dark theme (om JourneyScene applicable)
- Behåll filter-funktion, uppgradera visuellt

#### 6B. Achievements-sidan (`/app/gamification/achievements`)
- Ersätt `TrophyIcon` med WebP / BadgeIcon
- Journey-stil header
- Badge-grid med glassmorfism

#### 6C. Events-sidan (`/app/gamification/events`)
- Denna är en server-komponent — JourneyScene (client) kan wrappa
- Uppgradera event-lista visuellt
- Lägg till journey-ikon per event type

#### 6D. Shop-sidan (`/app/shop`)
- Redan funktionellt mogen (586 rader)
- Visuell alignment med Journey-palett
- Rarity-glow kan matcha Journey-sandbox

**Risker:**
- Server component (events) + client component (JourneyScene) = behöver boundary
- Coins-sidalayout gör egen fetch → kan bli dubbel-fetch om vi delar state

---

### Fas 7: Avancerade features (P3 — framtida)
> **Mål:** Journey Sandbox-features som kan aktiveras successivt
> **Estimat:** ~6-10 timmar totalt

| Feature | Beskrivning | Beroenden |
|---------|-------------|-----------|
| **Skill Tree** | 9-nods cosmetic-unlocks per faction | Faction-system, cosmetics DB |
| **Header Frames** | 9 visuella header-stilar (ornate, neon etc.) | Cosmetic-system, unlock logic |
| **Avatar Frames** | 4 ramtyper (metallic, faction, animated) | Avatar-system, cosmetics |
| **Avatar Effects** | 8 effekter (glow, pulse, aura, orbit etc.) | Avatar-system, cosmetics |
| **XP Bar Skins** | 8 stilar (warp, rainbow, growth etc.) | Cosmetic-system |
| **Background Effects** | 12 helskärmseffekter (partiklar, stjärnor etc.) | Performance-budget |
| **Section Dividers** | 8 animerade stilar (nebula, tide, roots etc.) | Faction accent |
| **Color Modes** | 8 paletter (fire, ice, galaxy etc.) | Cosmetic-system |
| **Course Path** | Vertikal timeline med kurs-progress | Kurssystem-integration |
| **Shop Showcase** | Auto-roterande butik-spotlight | Shop API |

---

## 4. Beroendekarta (vad beror på vad)

```
Fas 1 (JourneyScene) ←── Fas 3 (Sektionsuppdatering) ←── Fas 5 (Animationer)
         ↑                         ↑
Fas 2 (Identity) ←──── Fas 4 (Factions) ←── Fas 7 (Skill Tree etc.)
                                   ↑
                          Fas 6 (Undersidor)
```

**Kritisk väg:** Fas 1 → Fas 2 → Fas 4 → Fas 3

---

## 5. Beslutspunkter (kräver input)

### ✅ B1: Mörkt tema — scope → **Alt A (scoped)**
Hela gamification-sidan mörk via `JourneyScene`, men CSS-variabler scoped till `.journey-root`. Resten av appen oförändrad.

### ✅ B2: Avatar-källa → **Alt A + fallback**
`auth.users.raw_user_meta_data.avatar_url` med initials-avatar som fallback. Sandbox avatar builder kopplas ej ännu.

### ✅ B3: Faction-lagring → **Alt A**
`user_progress.faction_id` (TEXT nullable). Globalt per user, ej per tenant. Faction = identitet.

### ✅ B4: Implementeringsordning → **Hybrid**
Fas 1 → 2 → 3 först. Vänta med Fas 4 (faction) tills UI:t känns rätt. Bygg design före system.

### ✅ B5: Animations-nivå → **Alt B (moderat)**
Shimmer, glow, count-up, hover. Max ~15 keyframes i initial release. Skill tree kan utöka per user via cosmetic unlocks.

### ✅ B6: Undersidor → **Alt C (Hub + Achievements)**
Hub-sidan + achievements-sida får Journey-design. Coins-historia och events: enklare visuell uppgradering.

---

---

## 6. Arkitekturkritik & lösningar

### 6.1 Problem: Dubbla system (Journey vs Gamification)

**Nuläge:** Två parallella API:er (`/api/gamification` + `/api/journey/snapshot`), två uppsättningar komponenter, två data flows.

**Lösning:** Journey är ett **UI-layer ovanpå Gamification**. Gamification äger all data och logik. Journey äger presentation och personalisering.

```
┌─────────────────────────────────────────────────┐
│  Journey UI Layer (presentation)                │
│  JourneyScene, Identity, Progress, Stats, etc.  │
├─────────────────────────────────────────────────┤
│  Gamification Core (data + logic)               │
│  achievements, coins, streak, XP, events        │
│  /api/gamification/* endpoints                  │
├─────────────────────────────────────────────────┤
│  Supabase (persistence)                         │
│  user_progress, user_coins, user_streaks, etc.  │
└─────────────────────────────────────────────────┘
```

**Steg 0 (före Fas 1):** Skapa ett unified snapshot:
```ts
// GET /api/gamification — utökat response
{
  identity: { displayName, avatarUrl, factionId },
  progress: { level, levelName, currentXp, nextLevelXp, ... },
  stats: { coins: number, achievements: number, streak: number },
  achievements: Achievement[],
  coins: CoinsSummary,
  streak: StreakSummary,
  pinnedAchievements?: PinnedAchievement[]
}
```

Detta eliminerar dubbel-fetch och gör Journey-komponenterna till rena UI-konsumenter.

### 6.2 Problem: JourneyScene scope

**Risk:** CSS custom properties läcker ut i global layout.

**Lösning:** Wrappa i scoped root, ej body-level:
```tsx
<div className="journey-root">
  <JourneyScene theme={theme}>
    {/* gamification content */}
  </JourneyScene>
</div>
```
Alla `--journey-*` variabler lever inom `.journey-root`.

**Portal-varning:** shadcn `Dialog` portar till `<body>` — utanför `.journey-root`. Modaler (t.ex. `AchievementDetailModal`) tappar CSS vars.

**Lösning:** Antingen:
- Konfigurera Dialog `container` till `.journey-root` via Radix `portalContainer` prop
- Eller ge modal-komponenterna explicit `theme` props / fallback-klasser som ej beror på CSS vars

Detta måste verifieras i Steg 5.

### 6.3 Problem: Animations-budget

**Produktionsregel:**
- Max **15 unika** `@keyframes` inom gamification-bundle (räkna med `grep -c '@keyframes'`)
- Inga helskärms-partikeleffekter som default
- **Alla** `infinite` animationer måste ha `prefers-reduced-motion: reduce` guard som stänger av dem
- Count-up ska vara JS-driven (`requestAnimationFrame`) och helt avaktiverat vid reduced-motion
- Inga continuous infinite animations utan tydlig paus
- Skill tree (Fas 7) kan unlocka ytterligare animationer per user som cosmetic reward

---

## 7. v2 Implementeringsplan (beslutad ordning)

### Steg 0: Unified Snapshot (~1 h)
Utöka befintlig `GET /api/gamification` med `identity` block.
Ingen ny endpoint — additive change på existerande payload. Alla befintliga fält behålls oförändrade.

**Response contract v2 (additive only — no breaking changes):**
```ts
interface GamificationPayloadV2 extends GamificationPayload {
  identity: {
    displayName: string;              // auth.users.raw_user_meta_data.full_name
    avatarUrl: string | null;         // auth.users.raw_user_meta_data.avatar_url
    factionId: string | null;         // user_progress.faction_id (null tills Steg 6)
  };
  // Befintliga fält behålls exakt som de är:
  // progress: ProgressSnapshot
  // achievements: Achievement[]
  // coins: CoinsSummary
  // streak: StreakSummary
}
```
`identity.factionId` returneras som `null` tills Steg 6 (faction-system) implementeras. UI:t faller tillbaka till `DEFAULT_THEME`.

### Steg 1: JourneyScene Foundation (~2-3 h)
- Wrappa `GamificationPage` i scoped `JourneyScene` med `theme` prop
- **Bygg theme plumbing nu:** All styling via CSS vars (`--journey-accent`, `--journey-gradient-from/to`, `--journey-glow`). Hardkoda ej färger. Detta gör faction (Steg 6) till en drop-in ändring.
- Konvertera alla sektions-komponenter till glassmorfism (dark bg + `bg-white/10 backdrop-blur-sm`)
- Uppdatera typografi till `text-white` / `text-white/70`
- Journey-stil XP-bar med shimmer (ersätt `ProgressOverview`)
- Stat-pills rad (coins / achievements / streak) ovanför sektionerna

### Steg 2: Identity & Avatar (~1-2 h)
- Avatar-hero sektion med `JourneyIdentity`-liknande komponent
- Hämta från utökad snapshot (displayName + avatarUrl)
- Level-badge med glow
- Initials-fallback om ingen avatar

### Steg 3: Sektions-uppgradering (~3-4 h)
- **CoinsSection:** Större DiceCoin-ikon, count-up animation, glassmorfism
- **StreakSection:** Glassmorfism, accent-färg på week-dots (redan bra struktur)
- **AchievementsSection:** Hero badge (senast upplåst), glassmorfism-kort
- **CTA:** Ersätt emoji, glassmorfism-knappar, ta bort hårdkodade XP-labels
- **Sektionsavdelare:** Enkel `line`-stil med accent-gradient

### Steg 4: Achievements-sida alignment (~1-2 h)
- Journey-stil header på `/app/gamification/achievements`
- Badge-grid med glassmorfism
- Ersätt `TrophyIcon` med WebP/BadgeIcon

### Steg 5: Verify & polish (~1 h)
- `tsc --noEmit` — inga typfel
- `prefers-reduced-motion` check på alla animationer
- Mobil-test (layout, performance)
- Lighthouse performance-check
- **Scope leakage check:** Navigera till andra `/app/`-sidor (t.ex. `/app/browse`, `/app/play`) och verifiera att inga `--journey-*` vars eller dark-theme styles läcker ut
- **Portal modal theme check:** Öppna `AchievementDetailModal` och verifiera att theme-styling fungerar (Dialog portalar till `<body>`, utanför `.journey-root`)

---

**PAUS HÄR — bedöm resultat**

Efter Steg 0-5 (~9-13 h): Gamification-hubben har fullständig Journey-design med avatar, glassmorfism, moderat animation, scoped dark theme.

---

### Steg 6 (senare): Faction-system (~4-6 h)
- DB-migration: `user_progress.faction_id TEXT NULL`
- API: Inkludera + spara faction
- Faction-väljare komponent
- Tema-byte propageras genom alla Journey-komponenter

### Steg 7 (framtid): Avancerade features (~6-10 h)
- Skill tree, header frames, avatar effects, XP bar skins etc.
- Aktiveras successivt via cosmetic unlock-system

---

## 8. Sammanfattning

| Steg | Arbetsinsats | Beroenden |
|------|-------------|----------|
| Steg 0: Unified snapshot | ~1 h | — |
| Steg 1: JourneyScene foundation | ~2-3 h | Steg 0 |
| Steg 2: Identity & Avatar | ~1-2 h | Steg 0 |
| Steg 3: Sektions-uppgradering | ~3-4 h | Steg 1 |
| Steg 4: Achievements-sida | ~1-2 h | Steg 1 |
| Steg 5: Verify & polish | ~1 h | Steg 3+4 |
| **Totalt fas 1 (Steg 0-5)** | **~9-13 h** | |
| Steg 6: Faction (senare) | ~4-6 h | Steg 5 |
| Steg 7: Avancerat (framtid) | ~6-10 h | Steg 6 |

### Redan klart

#### Pre-implementation (ikoner & ordning)
- ✅ Nav-grid med Journey WebP-ikoner
- ✅ Sektionsordning alignad med Journey (Coins→Streak→Achievements)
- ✅ AchievementsSection: WebP istället för TrophyIcon
- ✅ CoinsSection: WebP istället för 🪙 emoji
- ✅ StreakSection: WebP istället för 🔥 emoji

#### Steg 0: Unified Snapshot ✅
- ✅ `GamificationIdentity` type tillagd i `features/gamification/types.ts`
- ✅ `GamificationPayload` utökad med `identity: GamificationIdentity`
- ✅ API route (`app/api/gamification/route.ts`) extraherar `displayName`, `avatarUrl`, `factionId: null`
- ✅ Mock-funktion uppdaterad med identity-data

#### Steg 1: JourneyScene Foundation ✅
- ✅ `GamificationPage` wrappas i `JourneyScene` med `DEFAULT_THEME` (#8661ff)
- ✅ All styling via CSS vars (`--journey-accent`, `--journey-gradient-from/to`, `--journey-glow`)
- ✅ XP progress bar med shimmer-animation + `prefers-reduced-motion` guard
- ✅ `JourneyStats` pills (coins/badges/streak)
- ✅ Glassmorfism nav-grid (`bg-white/5 border-white/10 backdrop-blur-sm`)

#### Steg 2: Identity & Avatar ✅
- ✅ Avatar hero-sektion med 96px glow-ring
- ✅ Level-badge pill (`Lvl {level}`) positionerad under avatar
- ✅ Display name + level name
- ✅ SVG silhouette fallback vid saknad `avatarUrl`

#### Steg 3: Sektions-uppgradering ✅
- ✅ CoinsSection: glassmorfism, `text-white`, `bg-white/5`
- ✅ StreakSection: glassmorfism, glow på aktiva streak-dots, accent ring via CSS var
- ✅ AchievementsSection: hero badge (senast upplåst med BadgeIcon), glassmorfism
- ✅ AchievementCard: glassmorfism bakgrunder, progress bar med CSS vars
- ✅ CallToActionSection: ✨ emoji ersatt med DiceCoin WebP, hårdkodade XP-labels borta
- ✅ SectionDivider-komponent skapad (accent gradient, optional label)
- ✅ Dividers placerade mellan alla sektioner

#### Steg 4: Achievements-sida ✅
- ✅ `AchievementsOverviewPage` wrappas i `JourneyScene` med dark theme
- ✅ WebP-ikoner, `TrophyIcon` borttagen
- ✅ Faction theme resolvas från identity

#### Steg 5: Verify & polish ✅
- ✅ `tsc --noEmit` — 0 gamification/journey/factions-relaterade typfel
- ✅ `prefers-reduced-motion` guard på shimmer-animation
- ✅ Portal modal theme fix: `AchievementDetailModal` med explicit `bg-[#1f1f3a]` + `text-white` (Dialog portar till `<body>`)
- ✅ Coins-sida (`/app/gamification/coins`) konverterad till JourneyScene dark theme
- ✅ Pylance 0 errors på alla 10+ modifierade filer

#### v1 Hardening Pass ✅
- ✅ `identity` gjord optional i `GamificationPayload` (`identity?: GamificationIdentity`) — bakåtkompatibel
- ✅ Runtime fallback i GamificationPage: `displayName: "Player"`, `avatarUrl: null`, `factionId: null`
- ✅ AchievementsOverviewPage redan safe med optional chaining (`data?.identity?.factionId`)
- ✅ `useCountUp` omskriven: `useSyncExternalStore` + ref-store (ingen setState i effect, ESLint clean)
- ✅ Count-up edge cases: cancel vid unmount, cancel vid end-ändring, `end === 0` snappar direkt
- ✅ `focus-visible:ring-2 ring-[color:var(--journey-accent,#8661ff)]/60` på alla interaktiva glassmorfism-element
- ✅ Focus rings använder CSS var med hardcoded fallback — faction-ready + immun mot scope-edge-cases
- ✅ `backdrop-blur-sm` audit: blur BARA på småkort (cards), ej på section-wrappers eller JourneyScene
- ✅ JourneyScene scope verifierad: inline `style={cssVars}` på div, ej `:root` — vars dör vid unmount
- ✅ Portal modal verifierad: `AchievementDetailModal` använder explicit `bg-[#1f1f3a]` — ej beroende på CSS vars
- ✅ `tsc --noEmit` — 0 errors efter alla hardening-ändringar

#### � Scope-ändring: Journey design ENBART på hubben
**Beslut:** Journey-designen (JourneyScene, glassmorphism, mörk gradient) ska ENBART finnas på huvud-hubben (`/app/gamification`).
Undersidor har återställts till standard app-styling:

- ✅ `AchievementsOverviewPage` — återställd till `PageTitleHeader`, `TrophyIcon`, standard theme-klasser (`text-foreground`, `bg-muted`, etc.)
- ✅ `coins/page.tsx` — återställd till `Card`/`CardContent`, standard theme-klasser, emoji-ikoner
- ✅ `AchievementCard` — ny `variant`-prop: `"journey"` (glass) för hubben, `"standard"` (default) för undersidor
- ✅ `AchievementsSection` — skickar `variant="journey"` till `AchievementCard`
- ✅ `tsc --noEmit` — 0 errors efter återställning

#### 🔒 v1 Ship Gate ✅ (ersatt av v2.5 Ship Gate nedan)

#### ⛔ Out of scope för v1 (NO-GO)
- Events page alignment
- Faction system (Steg 6)
- Skill tree / cosmetic unlocks (Steg 7)
- Background effects layer
- Fler animationer utöver shimmer + count-up
- Shop visuell alignment
- Journey-design på undersidor (achievements, coins)

---

### v2 — Visual Polish (commit `0e5a789`)

#### v2.1 ParticleField ✅
- ✅ `components/journey/ParticleField.tsx` — CSS-only ambient floating particles (max 20)
- ✅ `useMemo` particle generation, `aria-hidden="true"`, `enabled` prop toggle
- ✅ `pf-float` keyframe + `prefers-reduced-motion: reduce` guard
- ✅ Barrel export i `components/journey/index.ts`
- ✅ Integrerad som första child i `JourneyScene` i GamificationPage

#### v2.2 SectionDivider v2 ✅
- ✅ 3 variants: `line` (default, behållen), `glow` (pulsande center node + blurred linjeglow), `ornament` (diamond SVGs + graderade dots)
- ✅ Keyframes: `sd-glow-pulse`, `sd-glow-ring` + `prefers-reduced-motion` guard
- ✅ GamificationPage använder `variant="glow"` och `variant="ornament"` mellan sektioner

#### v2.3 CoinsSection vault polish ✅
- ✅ Gold radial-gradient halo bakom DiceCoin (`#f5a623` + pulse keyframe)
- ✅ 3 floating mini coins (CSS `coins-float` keyframes, `aria-hidden`)
- ✅ Coin bounce animation på huvudkonen
- ✅ Keyframes: `coins-halo`, `coins-float`, `coins-bounce` + `prefers-reduced-motion` guard

#### v2.4 AchievementsSection hero sparkle ✅
- ✅ Ambient radial glow div bakom hero badge (faction-themed)
- ✅ 4 orbiting sparkle orbs (CSS `ach-sparkle` keyframes, `aria-hidden`)
- ✅ Keyframes: `ach-hero-glow`, `ach-sparkle` + `prefers-reduced-motion` guard

### v2.5 — Ship Polish (constraints: max 1 ny keyframe totalt, dark skeleton 0 keyframes)

#### QA Gate #1 (kod-nivå) ✅
- ✅ **Fix:** `AchievementCard` button saknade `focus-visible` ring → tillagd
- ✅ **Fix:** `AchievementUnlockCelebration` saknade `prefers-reduced-motion` guard → tillagd
- ✅ Modal theming: explicit `bg-[#1f1f3a]` — OK
- ✅ CSS var scoping: inline `style={cssVars}` — OK
- ✅ `aria-hidden` på alla dekorativa element — OK

#### v2.5.1 StreakSection polish ✅ (0 nya keyframes)
- ✅ Warm ambient glow bakom flame-ikon (statisk `radial-gradient`, ingen keyframe)
- ✅ `drop-shadow` på streak-ikon för flame-glow
- ✅ Aktiva veckodagar: `transition-all duration-300` + `scale-110` + förstärkt shadow
- ✅ "Idag"-dot: `scale-125` + `ring-2` + starkare glow shadow
- ✅ **Netto nya keyframes: 0**

#### v2.5.2 Journey skeleton ✅ (0 nya keyframes)
- ✅ Mörkt tema-skelett (`bg-white/10`, `border-white/10`) istället för standard `Skeleton`
- ✅ Matchar JourneyScene gradient (`from-[#1a1a2e] to-[#16162a]`)
- ✅ Layout speglar faktisk sida: avatar → XP bar → stat pills → nav grid → content cards
- ✅ Borttagen `Skeleton` import (oanvänd)
- ✅ **Netto nya keyframes: 0**

#### v2.5.3 Quick Nav hover glow ✅ (0 nya keyframes)
- ✅ `transition-all duration-200` + `hover:border-[var(--journey-accent)]/30` + `hover:shadow-[0_0_12px_var(--journey-glow)]`
- ✅ Rent CSS transition, ingen keyframe

### Keyframe-inventering (v2.5 final)

| # | Keyframe | Fil | Typ |
|---|----------|-----|-----|
| 1 | `xp-shimmer` | GamificationPage | XP bar shimmer |
| 2 | `pf-float` | ParticleField | Ambient partikelrörelse |
| 3 | `sd-glow-pulse` | SectionDivider | Divider center node pulse |
| 4 | `sd-glow-ring` | SectionDivider | Divider expanding ring |
| 5 | `coins-halo` | CoinsSection | Gold glow bakom mynt |
| 6 | `coins-float` | CoinsSection | Floating mini coins |
| 7 | `coins-bounce` | CoinsSection | Huvudmynt bounce |
| 8 | `ach-hero-glow` | AchievementsSection | Glow bakom hero badge |
| 9 | `ach-sparkle` | AchievementsSection | Orbiting sparkle dots |
| 10 | `confetti-fall` | AchievementUnlockCelebration | Confetti (event-only) |
| 11 | `pulse-glow` | AchievementUnlockCelebration | Badge glow (event-only) |

**Totalt: 11/15 budget. 4 slots kvar. Alla har `prefers-reduced-motion` guard.**

> **⚖️ Keyframe Constitution** (regel för framtida tillägg):
> 1. Alla nya keyframes **måste** läggas till i inventory-tabellen ovan
> 2. Alla nya keyframes **måste** ha `@media (prefers-reduced-motion: reduce)` guard
> 3. Alla nya keyframes **måste** motiveras med "impact per keyframe" — ingen animation utan tydligt UX-syfte
>
> **Obs:** `pulse-glow` (AchievementUnlockCelebration) kan bli visuellt "för mycket" om den triggas ofta. Godkänd så länge celebration enbart triggas vid sällsynta unlock-events.

#### 🔒 v2.5 Ship Gate (UI-QA)
- [ ] **Mobile scroll** på hubben — blur + gradients + particles renderar korrekt, ingen stutter
- [ ] **Modal open/close** (AchievementDetailModal) × 3 — focus trap fungerar, ingen flash, bakgrund scrollar inte
- [ ] **Navigera bort** till vanlig sida (`/app/learning` eller `/app/play`) — kontrollera att inga Journey-styles hänger kvar
- [ ] **Tabba igenom** hela hubben — alla interaktiva element har synlig focus ring
- [ ] `/app/gamification/achievements` — standard app-tema (ej Journey)
- [ ] `/app/gamification/coins` — standard app-tema (ej Journey)
- [ ] Desktop + mobil screenshot → design review sign-off
- **Efter godkännande → skeppa staging. Ingen ytterligare scope.**

#### ⛔ Out of scope (NO-GO — fortfarande)
- Events page alignment
- Skill tree / cosmetic unlocks — kräver DB-schema + API
- Avatar-uppgradering (ramtyper, effekter) — kräver cosmetics-data + faction
- Fler sektioner (CoursePath, Shop, SkillTree) — kräver datamodeller
- Journey-design på undersidor (achievements, coins)
- Dark/Light mode toggle

---

### v2.6 — Layout Alignment (commit `843f49f`)

#### v2.6.1 CoinsSection vault ✅
- ✅ Saldo + transaktioner mergade till en enda vault-container (som sandbox DiceCoinVault)
- ✅ Gradient `background` med accent-färg + accent `border`
- ✅ 80px coin-illustration (uppgraderad från 48px)
- ✅ Inline transaction-rader: `rounded-lg` med arrow-indikatorer (↑/↓), `text-[11px]`
- ✅ Empty-state inom samma container

#### v2.6.2 AchievementsSection hero showcase ✅
- ✅ Hero badge centrerad vertikalt (`flex-col items-center py-8`) med `radial-gradient` ellipse
- ✅ Badge uppgraderad till `size="lg"` (från md) med `hover:scale-110`
- ✅ Sparkles repositionerade runt centrerad badge
- ✅ Namn + beskrivning + datum-pill under badge
- ✅ Grid ändrad till `grid-cols-3 gap-2` (matchar sandbox)
- ✅ **Netto nya keyframes: 0** (återanvänder `ach-hero-glow`, `ach-sparkle`)

---

## v3 Roadmap (GPT-godkänd prioritering)

> **Princip:** Faction persistence är grindvakten — inte palette-utils.
> Avatar/cosmetics utan faction = hårdkodad pynt som måste göras om.

### v3.0 — Personalization core ✅ SHIPPED

| Prio | Steg | Status |
|------|------|--------|
| P0 | **Faction persistence** — migration `user_progress.faction_id TEXT NULL`, `POST /api/gamification/faction`, GET inkluderar factionId från DB | ✅ Done |
| P1 | **Faction selector UI** — compact row of faction buttons on hub, 4 factions + "neutral" | ✅ Done |
| P2 | **Theme switch** — JourneyScene byter visuellt tema per vald faction (optimistic update) | ✅ Done |
| P3 | **Faction banner** — visar vald faction + memberSince | ⏳ Deferred to v3.1 |

**Shipped files:**
- `supabase/migrations/20260210000000_user_progress_faction_id.sql` — adds `faction_id` column
- `app/api/gamification/faction/route.ts` — POST endpoint (validates, upserts)
- `app/api/gamification/route.ts` — GET now reads `faction_id` from DB
- `features/gamification/types.ts` — `factionId` aligned to `FactionId` union type
- `features/gamification/api.ts` — `saveFaction()` client function
- `features/gamification/components/FactionSelector.tsx` — compact row selector (0 new keyframes)
- `features/gamification/GamificationPage.tsx` — integrated selector + optimistic theme switch
- `messages/sv.json` + `messages/en.json` — i18n keys for faction UI

### v3.1 — Visual upgrades (kräver faction)

| Prio | Steg | Effort | Beroende |
|------|------|--------|----------|
| P4 | **Palette utils** — `getColorPalette`, `hexToHSL`, `ColorMode` | S | P2 |
| P5 | **XP-bar skins** — 2-3 visuella stilar (clean/segmented/warp) | M | P4 |
| P6 | **Header frame overlay** — cosmetic lite | M | P4 |

### v3.2+ — Produktfeatures (kräver produkt + data)

| Prio | Steg | Effort | Beroende |
|------|------|--------|----------|
| P7 | **CourseJourneyPath** | M | Kursystem-integration |
| P8 | **MilestoneBadge** (skippa om oklart vad "milestone" är) | M | Data-kontrakt |
| P9 | **BackgroundEffectsLayer** | M | P4 |
| P10 | **SkillTree + Cosmetic-system** | L | DB-schema, cosmetic_catalog |
| P11 | **ShopShowcase + köpflöde** | L | P10 |
| P12 | **Dark/Light mode** | L | Alla ovan bör vara klara |

### Beslut att ta innan v3 startar

1. **memberSince-källa:** `auth.users.created_at` (global) vs `user_progress.created_at` (per-tenant)?
2. **Milestone-definition:** Level? Badge? Kurs? (om oklart → skippa i v3)
3. **Faction-val permanent eller ändringsbart?** (rek: ändringsbart med cooldown)
4. **Cosmetic-unlock triggers:** Level-gated? Coin-köp? Achievement-reward?
