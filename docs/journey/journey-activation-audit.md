# Journey Activation — Audit

## Metadata

> **Datum:** 2026-03-06 (rev 4)  
> **Senast uppdaterad:** 2026-03-21  
> **Senast validerad:** 2026-03-21  
> **Scope:** `/app/gamification`, `/app/profile`, `user_journey_preferences`, Journey-komponenter  
> **Status:** Revision 4 — implementation complete; codevägar återvaliderade 2026-03-21, ursprunglig QA verifierad 2026-03-06

---

## 1. Nuläge

### 1.1 Hur Journey kopplas till gamification-sidan idag

`GamificationPage.tsx` (~460 rader) renderar **alltid** Journey-designen. Det finns ingen villkorlig vy:

```
GamificationPage
  └─ JourneyScene (faction-gradient + CSS-variabler)
       ├─ ParticleField (ambient partikelanimation)
       ├─ AvatarFrame + SkillTreeSection (kosmetisk progressionsträd)
       ├─ XPProgressBar (8 skins, shimmer-animation)
       ├─ JourneyStats (mynt/badges/streak pills)
       ├─ Quick Nav Grid (5 länkar med Journey-ikoner)
       ├─ CoinsSection / StreakSection / BadgeShowcase
       └─ CallToActionSection
```

Det innebär att **varje besökare** av `/app/gamification` laddar:

- Faction-teman, gradient-beräkningar, CSS-variabler
- `ParticleField` (canvas-baserad animation)
- `SkillTreeSection` med per-faction kosmetikdata (9 noder × 4 factions)
- Journey-ikoner (5 st WebP-bilder)
- XP-bar med shimmer-keyframes

### 1.2 Datatabeller

| Tabell | Scope | Relevans |
|--------|-------|----------|
| `user_journey_preferences` | Global (PK: `user_id`) | Lagrar `faction_id`. **Inget fält för Journey on/off.** |
| `user_preferences` | Tenant-scoped (PK: `tenant_id, user_id`) | Språk, tema, tillgänglighet. **Inget Journey-fält.** |
| `user_progress` | Tenant+User | Level, XP. Används av både Journey och standard. |
| `user_coins` / `coin_transactions` | Tenant+User | Mynt-systemet. Oberoende av Journey-design. |
| `user_streaks` | Tenant+User | Streak-data. Oberoende av Journey-design. |
| `achievements` / `user_achievements` | Global+Tenant | Utmärkelser. Oberoende av Journey-design. |
| `user_achievement_showcase` | Global (PK: `user_id, slot`) | Badge-showcase (4 slots). Oberoende av Journey-design. |

### 1.3 Profilsida

`/app/profile` (Översikt) visar:

- `ProfileHero` — avatar, namn, faction-badge, XP-bar
- `StatsCards` — DiceCoin + Streak
- `AchievementShowcaseCard` — 3-slot badge-showcase
- Quick Links → Preferences

**Det finns ingen Journey-toggle** i profilen idag.

`/app/profile/preferences` hanterar:
- Språk (SE/NO/EN)
- Tema (light/dark/system)

---

## 2. Identifierade risker

### 🔴 R1 — Ingen möjlighet att välja bort Journey

**Allvarlighet: Hög**

Alla användare laddas med full Journey-design. Användare som inte vill ha gamification-estetiken tvingas ändå ladda tunga assets. Det finns inget sätt att visa `/app/gamification` i standard Lekbanken-design.

### 🔴 R2 — Inget state för "har användaren tagit ställning?"

**Allvarlighet: Hög**

`user_journey_preferences` lagrar bara `faction_id`. Det går inte att skilja mellan:

| Scenario | `faction_id` | `journey_enabled` |
|----------|-------------|-------------------|
| Aldrig blivit tillfrågad | `null` | — (existerar inte) |
| Valt att inte använda Journey | `null` | — (existerar inte) |
| Aktiverat Journey, valt faction | `'forest'` | — (existerar inte) |
| Aktiverat Journey, inte valt faction | `null` | — (existerar inte) |

Utan ett explicit fält kan vi inte:
- Trigga onboarding vid första besöket
- Undvika att fråga samma användare igen
- Skilja "aldrig sett" från "aktivt avböjt"

### 🟡 R3 — Inga dynamiska imports för Journey-komponenter

**Allvarlighet: Medel**

`GamificationPage` importerar alla Journey-komponenter statiskt:

```typescript
import { JourneyScene } from "@/components/journey/JourneyScene";
import { JourneyStats } from "@/components/journey/JourneyStats";
import { ParticleField } from "@/components/journey/ParticleField";
import { SkillTreeSection } from "./components/SkillTreeSection";
import { XPProgressBar, resolveXPBarSkin, resolveXPBarColorMode } from "./components/XPProgressBar";
import { AvatarFrame, resolveAvatarFrame } from "./components/AvatarFrame";
```

Oavsett om användaren har Journey aktiverat eller inte kommer dessa moduler ingå i JavaScript-bundlen.

### 🟡 R4 — Profilsidan har ingen toggle-infrastruktur

**Allvarlighet: Medel**

`/app/profile` har gamification-data men saknar:
- UI för att slå av/på Journey
- API-koppling för att uppdatera Journey-status
- State-feedback om nuvarande Journey-status

### 🟡 R5 — user_journey_preferences vs user_preferences — dubbelt state-hem

**Allvarlighet: Medel**

Två separata preferenstabeller med olika scope:

- `user_journey_preferences` → global (per user)
- `user_preferences` → tenant-scoped (per tenant+user)

Journey-aktivering bör vara **global** (ett val per användare, inte per tenant). Det passar `user_journey_preferences` bäst, men man bör vara medveten om att preferenser hanteras i två tabeller.

### 🟢 R6 — JourneyScene-isoleringen fungerar väl

**Allvarlighet: Låg**

`JourneyScene` scope:ar alla CSS-variabler till sin container via inline `style`. Inga globala stilar läcker ut. Mönstret är korrekt och beprövat.

### 🟢 R7 — Gamification-data är oberoende av Journey-designen

**Allvarlighet: Låg**

Achievements, coins, streaks, XP och showcase lagras oberoende och exponeras via `/api/gamification`. En standard-vy kan använda exakt samma API utan att Journey-komponenter behöver laddas.

---

## 3. State-lagring: Var ska Journey-preferensen bo?

### Arkitekturbeslut: `user_journey_preferences` (aktivt val)

Vi väljer att utöka `user_journey_preferences` med `journey_enabled` + `journey_decision_at`. Detta är ett **medvetet arkitekturbeslut**, inte bara bekvämlighet.

#### Semantisk motivering

Journey-aktivering är en **Journey-preferens**, inte en generell UX-preferens:

1. **Ägandeskap:** Frågan "vill du använda Journey?" hör semantiskt ihop med "vilken faction vill du ha?". Båda handlar om användarens relation till Journey-systemet specifikt. Det vore konstigt att lagra faction i en tabell och aktiveringsbeslutet i en annan.

2. **Scope:** Journey är ett globalt val (per användare, inte per tenant). `user_journey_preferences` har exakt rätt scope — `user_id` som PK, ingen tenant-dimension. `user_preferences` är tenant-scoped och semantiskt fel.

3. **Livscykel:** Onboarding-beslutet ("har jag tagit ställning?") och faction-valet ("vilken fraktion?") ingår i samma användarresa. Journey-tabellen representerar den resan.

4. **Koherens:** `GET /api/gamification` hämtar redan `faction_id` från denna tabell. Att lägga till `journey_enabled` innebär en enda extra kolumn i samma query — inga nya joins eller API-anrop.

#### När modellen bryts

Denna modell bör brytas ut till en generell `user_feature_flags`-tabell om **två eller fler** av dessa villkor uppfylls:

- Fler än 2 oberoende feature-toggles behövs (t.ex. AI-features, avancerad editor)
- Feature-toggles behöver admin-kontroll (inte bara användarval)
- Feature-toggles behöver rollout-procent eller A/B-testning
- Journey-aktivering behöver kopplas till tenant-nivå (organisationsspecifik)

Tills dess är kostnaden för en generell tabell (ny tabell, RLS, API, migration) onödigt hög.

#### Utvärderade och avvisade alternativ

| Alternativ | Avvisat därför att |
|------------|-------------------|
| `user_preferences` | Tenant-scoped — Journey är globalt. Semantiskt fel (Journey ≠ UI-tematik). |
| Ny `user_feature_flags`-tabell | Överkonstruerat för ett enda feature-val. Kan migreras hit senare vid behov. |
| `localStorage` | Försvinner vid enhetsbyte. Kan inte läsas server-side. Inget stöd för delad enhet. |

```sql
ALTER TABLE user_journey_preferences
  ADD COLUMN journey_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN journey_decision_at timestamptz NULL;
```

**`journey_decision_at`** löser R2: `NULL` = aldrig tillfrågad, icke-NULL = har tagit ställning.

---

## 4. Migrationsrisker

### 4.1 Signalanalys: Vad bevisar att en användare aktivt valt Journey?

Vi har utvärderat alla persisterade Journey-specifika signaler i databasen:

| Signal | Tabell | Bevisar Journey-engagemang? | Bedömning |
|--------|--------|----------------------------|-----------|
| `faction_id IS NOT NULL` | `user_journey_preferences` | **Ja, med förbehåll** — kräver aktivt val i FactionSelector | ⭐ Starkaste signalen |
| Showcase-slots (1–4) | `user_achievement_showcase` | Nej — showcase är gamification-generellt, inte Journey-specifikt | ❌ |
| Coin-transaktioner | `coin_transactions` | Nej — coins tjänas/spenderas oberoende av Journey | ❌ |
| Kosmetik-loadout | `player_cosmetics` | Svag — tenant-scoped, level-gated, inte Journey-specifikt | ❌ |
| XP/Level | `user_progress` | Nej — progression sker oavsett Journey | ❌ |

#### Är `faction_id` den enda säkra signalen?

**Ja.** `faction_id` är den enda persisterade datapunkten som kräver att användaren aktivt interagerat med Journey-specifik UI (FactionSelector). Alla andra signaler (coins, XP, achievements, showcase) existerar oberoende av Journey-designen.

#### Kan `faction_id` finnas utan aktivt val?

Två scenarier att vara medveten om:

1. **Legacy-migration:** `faction_id` migrerades från `user_progress` till `user_journey_preferences` (migration `20260213000000`). Dessa värden härstammar från den gamla `user_progress.faction_id`-kolumnen, där factions ursprungligen introducerades. Användare med migerad data **har** gjort ett aktivt val i FactionSelector vid något tillfälle.

2. **Demo-användare:** Demo-flödet (`createEphemeralDemoUser`) sätter **inte** `faction_id`. Demo-användare börjar utan faction och måste ggöra ett aktivt val. Ingen risk för falska positiver här.

**Slutsats:** `faction_id IS NOT NULL` är en tillförlitlig signal för att en användare aktivt engagerat sig med Journey.

### 4.2 Migrationsstrategi

```sql
-- Användare med faction → auto-aktivera Journey
UPDATE user_journey_preferences
SET
  journey_enabled = true,
  journey_decision_at = updated_at
WHERE faction_id IS NOT NULL
  AND journey_decision_at IS NULL;
```

| Befintlig användare | Åtgärd | Motivering |
|---------------------|--------|-----------|
| `faction_id IS NOT NULL` | `journey_enabled = true`, `journey_decision_at = updated_at` | Aktivt val bekräftat via FactionSelector |
| Har rad, `faction_id IS NULL` | Ingen ändring → onboarding visas | Har aldrig interagerat med Journey-specifik UI |
| Ingen rad i tabellen | Ingen ändring → onboarding visas | Helt ny eller aldrig besökt |

### 4.3 Konservativ migrationsfilosofi

Migrationen väljer **konservativ strategi**: hellre visa onboarding en gång för mycket än att auto-aktivera Journey för en användare som inte förväntar sig det. Endast den starkaste signalen (`faction_id`) används. Showcase, coins eller XP-nivå räknas inte.

### 4.4 Risknivå

**Låg** — additiv migration (ADD COLUMN), ingen destruktiv förändring. Befintlig data bevaras. Migrationslogiken har ett tydligt fallback-beteende (onboarding).

---

## 5. Prestanda

### 5.1 Nuvarande belastning (Journey alltid laddas)

| Komponent | Storlek (uppskattning) | Typ |
|-----------|------------------------|-----|
| `ParticleField` | ~3 KB JS + canvas runtime | Animation |
| `SkillTreeSection` + data | ~8 KB JS | Komplex UI |
| `XPProgressBar` (8 skins) | ~4 KB JS | Animation |
| `AvatarFrame` | ~2 KB JS | Kosmetik |
| `JourneyScene` | ~2 KB JS | Container |
| `JourneyStats` | ~2 KB JS | UI |
| Journey-ikoner (5 WebP) | ~15 KB nätverksanrop | Assets |
| Faction-teman + CSS-variabler | ~2 KB JS | Data |

**Total uppskattad overhead: ~38 KB JS + ~15 KB assets**

### 5.2 Med feature gate

Om Journey är inaktiverat → `dynamic(() => import(…))`:

- **0 KB** Journey-specifik JS laddas
- Standard-vy använder befintliga Lekbanken-komponenter (Card, Badge etc.)
- Besparingen är märkbar på mobila enheter

### 5.3 Prestandagräns: Vad som måste stanna bakom Journey-boundary

#### Imports som MÅSTE ligga bakom `dynamic()` (Journey-chunken)

| Modul | Anledning |
|-------|-----------|
| `JourneyScene` | Faction-gradient, CSS-variabler |
| `ParticleField` | Ambient partikelanimation |
| `SkillTreeSection` + `skill-trees.ts` | Per-faction kosmetikträd (9 noder × 4 factions) |
| `XPProgressBar` (alla 8 skins) | Shimmer-animation, skin-resolving |
| `AvatarFrame` | Kosmetiska ramar |
| `FactionSelector` | Faction-val UI |
| `SectionDivider` (Journey-varianter) | Dekorativa avdelare |
| `CoinsSection` | Glasmorfism-variant |
| `StreakSection` | Glasmorfism-variant |
| `BadgeShowcase` | Glow-effekter, Journey-styling |
| `factions.ts` (themes/gradients) | Faction-data, CSS-variabelgenerering |

#### Imports som delas (baseline-bundle, båda vyer)

| Modul | Anledning |
|-------|-----------|
| `fetchGamificationSnapshot` (API-klient) | Samma data för båda vyerna |
| `Card`, `Badge`, `Button` (shadcn/ui) | Redan i app-bundle |
| Heroicons | Redan i app-bundle |
| i18n-nycklar (`gamification.*`) | Textinnehåll |

#### API-anrop som INTE ska köras när Journey är disabled

| Endpoint | Aktion |
|----------|--------|
| `GET /api/journey/snapshot` | Används av Journey-dashboard, inte av standard-vy |
| `GET /api/journey/feed` | Journey-specifik aktivitets-feed |
| `POST /api/gamification/faction` | Faction-val är Journey-specifikt |
| `GET /api/cosmetics/loadout` | Kosmetik-loadout är Journey-kopplat (level-gated) |

**`GET /api/gamification`** anropas **alltid** — men returnerar data som båda vyerna behöver. Faction-data i svaret ignoreras helt av standard-vyn.

#### Assets som inte får prefetchas/laddas vid disabled Journey

| Asset | Åtgärd |
|-------|--------|
| `/icons/journey/*.webp` (5 st) | Importeras bara i Journey-vyn, aldrig i standard-vyn |
| Faction-bakgrunder/gradients | Renderas via `JourneyScene` — aldrig i standard-vyn |
| Kosmetik-bilder | Laddas via `SkillTreeSection` — aldrig i standard-vyn |

#### Standard-vyn återanvändar noll Journey-komponenter

Standard-vyn (`GamificationStandardPage`) ska inte importera **någon** komponent från `components/journey/` eller Journey-specifika komponenter från `features/gamification/components/`. Den använder enbart:

- shadcn/ui primitiver (`Card`, `Badge`, `Button`, `Progress`)
- Heroicons
- Standard Tailwind-klasser

Detta garanterar att Journey-chunken aldrig dras in av misstag.

---

## 6. UX-risker

### 6.1 Onboarding-timing

Onboarding måste triggas **exakt en gång** — vid första besöket på `/app/gamification` där `journey_decision_at IS NULL`. Om användaren stänger sidan utan att välja måste modalen visas igen nästa gång.

### 6.2 Risken med "Skip"

Om "Inte nu" inte sparar `journey_decision_at` → användaren hamnar i en loop. Lösning: **alla val sparar `journey_decision_at`**, inklusive "Inte nu" (som sätter `journey_enabled = false`).

### 6.3 Toggle i profilen

Måste tydligt kommunicera vad Journey är. Inte bara en switch — kort förklaring krävs.

---

## 7. Sammanfattning

| Risk | Allvarlighet | Lösning |
|------|-------------|---------|
| R1 — Ingen opt-out | 🔴 Hög | Feature gate + standard-vy |
| R2 — Inget decision-state | 🔴 Hög | `journey_decision_at` kolumn |
| R3 — Statiska imports | 🟡 Medel | `dynamic()` lazy loading |
| R4 — Ingen profil-toggle | 🟡 Medel | Toggle-komponent i Översikt |
| R5 — Dubbelt pref-hem | 🟡 Medel | Acceptera — `user_journey_preferences` är rätt hem |
| R6 — Stil-isolering funkar | 🟢 Låg | Ingen åtgärd |
| R7 — Data oberoende | 🟢 Låg | Bekräftat — standard-vy kan använda samma API |
