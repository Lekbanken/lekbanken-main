# Journey v2.0 — Arkitektur

> **Datum:** 2026-03-06 (rev 2)  
> **Status:** Draft — revision 2 after GPT review  
> **Beroende av:** `Journey_v2_Audit.md`

---

## 1. Systemmål

Journey v2.0 transformerar det nuvarande passiva kosmetik-systemet till en **personlig kosmetisk canvas** med:

- Fraktionstaggad kosmetik med global progression
- Cross-fraktion loadout (mix-and-match)
- Admin-styrbar kosmetikkatalog
- Multipla unlock-mekanismer
- Skalbar arkitektur för framtida kosmetiktyper

**Oförändrade principer:**
- 100% kosmetiskt — påverkar aldrig gameplay (XP, coins, achievements, streaks)
- Optional — `journey_enabled` feature-gate bevaras
- Lazy-loaded — standard-vy importerar noll Journey-kod

### 1.1 Scope-modell: Global identity, tenant access

Journey-identitet (fraktion, kosmetikägande, loadout) är **global per user** — personlig identitet som följer användaren oavsett tenant.

Journey **feature-access** sker i tenant-kontext — användaren interagerar med Journey via tenant-appen där feature-gating och RLS-kontroller verkställs.

| Data | Scope | Motivering |
|------|-------|------------|
| `user_journey_preferences` | Global per user | Fraktion och gate-state är personlig identitet |
| `cosmetics` (katalog) | Global | Samma kosmetik tillgänglig oavsett tenant |
| `user_cosmetics` (ägande) | Global per user | Samling tillhör personen, inte tenanten |
| `user_cosmetic_loadout` (aktiv config) | Global per user | Visuell identitet är personlig |
| `cosmetic_unlock_rules` | Global | Admin-definierade regler |
| `player_cosmetics` (shop) | Per tenant | Marketplace är tenant-scoped (oförändrad från v1.0) |

**Framtida extension (utanför v2.0):** Tenant-specifik kosmetik-tillgänglighet eller tenant-exklusiva kosmetik kan läggas som ett lager ovanpå denna modell.

---

## 2. Fraktionssystem

### 2.1 Fraktioner (4 stycken)

| ID | Namn (i18n-key) | Tema | Accent | Gradient |
|----|-----------------|------|--------|----------|
| `forest` | `factions.forest` | Djup skog, mossa, organisk energi | Emerald `#10b981` | `#0b3d2e` → `#1a1a2e` |
| `sea` | `factions.sea` | Djupt hav, koraller, strömmande vatten | Ocean `#0ea5e9` | `#0c2d4a` → `#1a1a2e` |
| `desert` | `factions.desert` | Solbränd öken, sand, hetta | Amber `#f59e0b` | `#3d3520` → `#1a1a2e` |
| `void` | `factions.void` | Kosmisk rymd, stjärnor, oändlighet | Violet `#7c3aed` | `#1e1040` → `#1a1a2e` |

**Förändringar från v1.0:**
- `sky` → `desert` — amber-paletten passar Desert bättre, och det skapar en mer distinkt identitet
- "Neutral" tas bort som valbart alternativ — `DEFAULT_THEME` behålls enbart som teknisk fallback för användare som inte valt fraktion ännu
- Alla fraktionsnamn lokaliseras via i18n (idag blandat sv/en)

**Migration:** `sky` → `desert` kräver `UPDATE user_journey_preferences SET faction_id = 'desert' WHERE faction_id = 'sky'`. Kosmetiska nycklar med `sky_`-prefix uppdateras till `desert_`. Se Implementationsplan steg 1.

### 2.2 Fraktions-state

```
user_journey_preferences
├── user_id (PK)
├── faction_id: 'forest' | 'sea' | 'desert' | 'void' | NULL
├── journey_enabled: boolean
├── journey_decision_at: timestamptz | NULL
└── updated_at: timestamptz
```

Oförändrad från v1.0. `faction_id` förblir globalt (inte per-tenant) — det representerar personlig identitet.

---

## 3. Kosmetiskt system

### 3.1 Designfilosofi

```
Kosmetik = visuella element som förändrar Journey-vyns utseende

Varje kosmetik tillhör:
  1. En kategori (vad det påverkar visuellt)
  2. En fraktion (vilken visuell identitet det följer), eller null = universell
  3. En raritetsgrad (hur svår den är att få)

Användaren kan:
  1. Samla kosmetik genom progression, achievements, shop, events, admin-grants
  2. Aktivera/inaktivera enskilda kosmetik
  3. Mixa kosmetik från olika fraktioner
```

### 3.2 Kosmetikkategorier — v2.0 Core Slots

v2.0 fokuserar på **scene-kosmetik** — visuella element som påverkar Journey-vyn. Profil-kosmetik och identity-metadata hålls utanför v2.0 för att undvika att blanda koncept.

| Kategori-ID | Namn | Beskrivning | Visuell påverkan | v2.0 |
|-------------|------|-------------|------------------|:----:|
| `avatar_frame` | Avatar-ram | Dekorativ ram runt profilavataren | SVG ring/ornament | ✅ |
| `scene_background` | Scen-bakgrund | Bakgrundseffekt i Journey-scenen | CSS gradient/pattern | ✅ |
| `particles` | Partiklar | Ambienta partiklar i Journey-scenen | Animerade CSS-element | ✅ |
| `xp_bar` | XP-bar skin | Visuell design av XP-progress-baren | CSS-styling av bar | ✅ |
| `section_divider` | Sektionsdelning | Design av sektionsavgränsare | SVG/CSS divider | ✅ |

### 3.2.1 Framtida slot-expansion (utanför v2.0)

Följande kategorier kan läggas till utan schemaändringar (category är fri TEXT-kolumn):

| Kategori-ID | Beskrivning | Notering |
|-------------|-------------|----------|
| `banner` | Profilbanner/header-bild | Profil-kosmetik — kräver profil-vy-integration |
| `animation` | Specialanimationer (celebration, idle) | Performance-budgetering krävs |
| `title` | Display-titel | **Inte** en loadout-slot — bör modelleras som profile identity härledd från achievements (se Audit §3.2) |

### 3.2.2 Titlar — explicit ut ur v2.0

Titlar ("Vägvisare", "Void Walker" etc.) tas ur v2.0 scope. De är det minst mogna konceptet och blandningen av identity-metadata med scene-kosmetik skapar en otydlig taxonomy. Om titlar återintroduceras bör de härledas från achievements/milestones som ett separat profile identity system, inte som en kosmetik-slot i loadout.

### 3.3 Raritetssystem

| Raritet | Namn (i18n) | Visuell markör | Typisk unlock |
|---------|-------------|----------------|---------------|
| `common` | Vanlig | Ingen extra effekt | Level 1–3 |
| `uncommon` | Ovanlig | Subtil glow | Level 4–6 |
| `rare` | Sällsynt | Starkare glow + shine | Level 7–9, achievements |
| `epic` | Episk | Pulserande glow | Level 10+, svåra achievements |
| `legendary` | Legendarisk | Animerad ram + partiklar | Events, admin-grant, shop exclusive |

---

## 4. Databasschema

### 4.1 Ny tabell: `cosmetics` (kosmetikkatalog)

```sql
CREATE TABLE cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,              -- 'void_avatar_frame_constellation'
  category TEXT NOT NULL,                -- 'avatar_frame', 'scene_background', 'particles', etc.
  faction_id TEXT,                        -- 'forest', 'sea', 'desert', 'void', NULL = universal
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
  name_key TEXT NOT NULL,                -- i18n key: 'cosmetics.void_constellation.name'
  description_key TEXT NOT NULL,         -- i18n key: 'cosmetics.void_constellation.description'
  render_type TEXT NOT NULL,             -- Category-specific renderer: 'svg_frame', 'css_background', etc.
  render_config JSONB NOT NULL DEFAULT '{}', -- Strictly typed per render_type (see §4.1.1)
  preview_url TEXT,                       -- Static preview image (see §10 Asset Strategy)
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,        -- Admin kan avaktivera utan att radera
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cosmetics_category ON cosmetics(category);
CREATE INDEX idx_cosmetics_faction ON cosmetics(faction_id);
CREATE INDEX idx_cosmetics_rarity ON cosmetics(rarity);
```

### 4.1.1 Render-typ och render-config (strikt schema per kategori)

`render_type` identifierar vilken renderer frontend använder. `render_config` innehåller enbart fält som är tillåtna för den render-typen. Backend validerar att `render_config` matchar förväntad shape vid insert/update.

**`avatar_frame`** — `render_type: 'svg_frame'`
```jsonc
{
  "variant": "constellation",           // Känd AvatarFrame-variant (constellation|coral|vines|aurora|...)
  "glowColor": "rgba(124, 58, 237, 0.4)" // Glow-färg (CSS color)
}
```
✅ Tillåtna fält: `variant` (string, required), `glowColor` (CSS color, optional)

**`scene_background`** — `render_type: 'css_background'`
```jsonc
{
  "className": "bg-effect-stars",       // CSS-klass att applicera på JourneyScene
  "keyframes": "stars-float"            // CSS animation-name (optional)
}
```
✅ Tillåtna fält: `className` (string, required), `keyframes` (string, optional)

**`particles`** — `render_type: 'css_particles'`
```jsonc
{
  "className": "particle-void-stars",   // CSS-klass för partikelstil
  "count": 16                           // Antal partiklar (max 32)
}
```
✅ Tillåtna fält: `className` (string, required), `count` (int 1–32, optional, default 16)

**`xp_bar`** — `render_type: 'xp_skin'`
```jsonc
{
  "skin": "warp",                       // XPProgressBar skin-variant
  "colorMode": "accent"                 // Färgläge
}
```
✅ Tillåtna fält: `skin` (string, required), `colorMode` (string, optional)

**`section_divider`** — `render_type: 'css_divider'`
```jsonc
{
  "variant": "nebula",                  // SectionDivider-variant
  "className": "divider-nebula"         // CSS-klass
}
```
✅ Tillåtna fält: `variant` (string, required), `className` (string, optional)

**Validering:** Backend använder Zod-schema per `render_type` vid admin-create/update. Ogiltiga `render_config`-fält avvisas med 400. Frontend läser `render_type` för att avgöra vilken renderer som används och typcastar `render_config` säkert.

### 4.2 Ny tabell: `cosmetic_unlock_rules` (upplåsningsvillkor)

```sql
CREATE TABLE cosmetic_unlock_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cosmetic_id UUID NOT NULL REFERENCES cosmetics(id) ON DELETE CASCADE,
  unlock_type TEXT NOT NULL,            -- 'level', 'achievement', 'shop', 'event', 'manual'
  unlock_config JSONB NOT NULL,         -- Typ-specifik konfiguration
  priority INTEGER DEFAULT 0,          -- Om flera regler matchar, högsta prioritet vinner
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unlock_rules_cosmetic ON cosmetic_unlock_rules(cosmetic_id);
CREATE INDEX idx_unlock_rules_type ON cosmetic_unlock_rules(unlock_type);
```

**`unlock_config` per `unlock_type`:**

```jsonc
// level — upplåses vid specifik level
{ "required_level": 5 }

// achievement — upplåses vid specifik achievement
{ "achievement_id": "uuid-here" }

// shop — köpbar i butiken
{ "shop_item_id": "uuid-here", "price": 500 }

// event — belöning från ett event
{ "event_id": "uuid-here" }

// manual — admin grantar manuellt
{ "reason": "Beta tester reward" }
```

### 4.3 Ny tabell: `user_cosmetics` (användarens samling)

```sql
CREATE TABLE user_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id UUID NOT NULL REFERENCES cosmetics(id) ON DELETE CASCADE,
  unlock_type TEXT NOT NULL,            -- Hur den upplåstes
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cosmetic_id)         -- En user kan inte ha samma kosmetik två gånger
);

CREATE INDEX idx_user_cosmetics_user ON user_cosmetics(user_id);
```

**Notera:** `user_cosmetics` är **globalt per user** (inte per tenant), precis som `user_journey_preferences`. Journey-identitet är personlig.

### 4.4 Ny tabell: `user_cosmetic_loadout` (aktiv konfiguration)

```sql
CREATE TABLE user_cosmetic_loadout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,                    -- 'avatar_frame', 'scene_background', 'particles', etc.
  cosmetic_id UUID NOT NULL REFERENCES cosmetics(id) ON DELETE CASCADE,
  UNIQUE(user_id, slot)                 -- Max en kosmetik per slot
);

CREATE INDEX idx_loadout_user ON user_cosmetic_loadout(user_id);
```

**Loadout-semantik:**
- Varje slot har max 1 aktiv kosmetik
- Slot-names matchar v2.0 core categories: `avatar_frame`, `scene_background`, `particles`, `xp_bar`, `section_divider`
- Tom slot = ingen kosmetik aktiv för den kategorin
- Cross-fraktion tillåtet — user kan ha Void frame + Forest background
- Loadout-writes valideras server-side: usern måste äga kosmetiken (finnas i `user_cosmetics`)

### 4.5 Befintliga tabeller: förändringar

| Tabell | Förändring | Motivation |
|--------|-----------|------------|
| `user_journey_preferences` | Ingen ändring | Faction-val och gate-state bevaras |
| `player_cosmetics` | Behålls oförändrad | Shop-köpta items. `user_cosmetics` hanterar Journey-kosmetik separat |
| `shop_items` | Lägg till optional `cosmetic_id` FK | Koppla shop-items till kosmetikkatalogen |

```sql
-- Koppla shop-items till kosmetik (optional)
ALTER TABLE shop_items
ADD COLUMN cosmetic_id UUID REFERENCES cosmetics(id) ON DELETE SET NULL;
```

### 4.6 ER-diagram

```
┌──────────────────────────┐     ┌──────────────────────────┐
│ cosmetics                │     │ cosmetic_unlock_rules     │
│──────────────────────────│     │──────────────────────────│
│ id (PK)                  │←────│ cosmetic_id (FK)          │
│ key                      │     │ unlock_type               │
│ category                 │     │ unlock_config (JSONB)     │
│ faction_id (FK)          │     │ priority                  │
│ rarity                   │     └──────────────────────────┘
│ render_type              │
│ render_config (JSONB)    │     ┌──────────────────────────┐
│ name_key                 │     │ user_cosmetics            │
│ description_key          │     │──────────────────────────│
│ is_active                │     │ user_id (FK)              │
└──────────────────────────┘     │ cosmetic_id (FK)          │
         ↑                       │ unlock_type               │
         │                       │ unlocked_at               │
         │                       └──────────────────────────┘
         │
         │                       ┌──────────────────────────┐
         └───────────────────────│ user_cosmetic_loadout     │
                                 │──────────────────────────│
                                 │ user_id (FK)              │
                                 │ slot                      │
                                 │ cosmetic_id (FK)          │
                                 └──────────────────────────┘
```

### 4.7 RLS-policies

**Säkerhetsprincip:** Användare får **läsa** sina egna kosmetik men får **inte** skapa ägarskap (grants) direkt. Grants sker enbart via serverstyrda flöden (level-up, achievement-unlock, shop-köp, admin-grant) som använder service role.

Användare får **skriva** sin egen loadout (equip/unequip), men equip-endpointen validerar server-side att usern äger kosmetiken.

```sql
-- cosmetics: read-only för alla autentiserade users
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmetics_select" ON cosmetics FOR SELECT TO authenticated USING (is_active = true);
-- Admin INSERT/UPDATE/DELETE via service role (bypasses RLS)

-- cosmetic_unlock_rules: read-only för alla autentiserade users
ALTER TABLE cosmetic_unlock_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unlock_rules_select" ON cosmetic_unlock_rules FOR SELECT TO authenticated USING (true);
-- Admin INSERT/UPDATE/DELETE via service role

-- user_cosmetics: users kan bara LÄSA sina egna. INGA klient-initierade INSERT.
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_cosmetics_select" ON user_cosmetics FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
-- INSERT/UPDATE/DELETE sker ENBART via service role (server-side grant flows)
-- Ingen INSERT-policy för authenticated — förhindrar att klienten grantar sig själv kosmetik

-- user_cosmetic_loadout: users kan läsa/skriva sina egna loadout-slots
-- Equip-API:t validerar server-side att usern äger kosmetiken innan upsert
ALTER TABLE user_cosmetic_loadout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loadout_select" ON user_cosmetic_loadout FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "loadout_insert" ON user_cosmetic_loadout FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND cosmetic_id IN (SELECT cosmetic_id FROM user_cosmetics WHERE user_id = (SELECT auth.uid()))
  );
CREATE POLICY "loadout_update" ON user_cosmetic_loadout FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "loadout_delete" ON user_cosmetic_loadout FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
```

**Defense-in-depth:** `loadout_insert`-policyn innehåller en subquery som verifierar att usern äger kosmetiken via `user_cosmetics`. Detta blockerar direkt Supabase-INSERT av kosmetik usern inte äger — oavsett om klienten går via equip-API:t eller inte. Equip-endpointen validerar *också* ägarskap server-side (dubbelkontroll). FK-constrainten mot `cosmetics` verifierar att kosmetiken existerar, och RLS-subqueryn verifierar att usern äger den.

---

## 5. Progressionsmodell

### 5.1 Upplåsningsflöde

```
Användaraktivitet
    ├── Level up (via reward engine)
    │       Client → RPC apply_xp_transaction_v1 → PL/pgSQL → { level_up: boolean }
    │       Reward engine kontrollerar level_up === true
    │       → checkAndGrantCosmetics({ type: 'level', level: new_level })
    ├── Achievement unlock → Kontrollera achievement-baserade unlock_rules
    ├── Shop-köp → Automatisk grant av kopplad kosmetik
    ├── Event-deltagande → Admin-konfigurerad belöning
    └── Manual admin grant → Direkt insert i user_cosmetics

        ↓

user_cosmetics (samlingen)
        ↓
user_cosmetic_loadout (aktiv konfiguration)
        ↓
Frontend rendering (CSS-variabler, klasser, animationer)
```

### 5.2 Global progression + fraktionstaggad kosmetik

v2.0-modellen är **inte** fraktionsspecifik XP-progression i egentlig mening. Det är:

> **Global progression + fraktionstaggad kosmetik + fraktionsidentitet**

Användaren levlar globalt (via tenant-scoped `user_progress`). Kosmetik i katalogen är taggade med fraktionstillhörighet (`faction_id`). Level-baserade unlock-rules matchar global level. Vid level-up upplåses kosmetik för **alla** fraktioner som matchar den nivån — systemet är inte ett "investera i en fraktion"-system.

**Vad som gör det fraktionsspecifikt i praktiken:**
- Varje kosmetik har en fraktionstillhörighet → samlarkänsla
- Loadout-rendering visar vilken fraktion varje kosmetik tillhör
- Cross-fraktion mix skapar unika kombinationer
- Admin kan skapa fraktionsexklusiva kosmetik via achievements/events

**Framtida väg till djupare fraktionsprogression (v3.0):** Faction affinity / reputation-system där tid spenderad med en fraktion aktiv, eller fraktionsspecifika achievements, ger fraktions-XP som gater avancerade kosmetik. Detta kräver ny tabell (`faction_progress`), ny UI och ny XP-logik — motiverat först när v2.0 är stabil och användarfeedback pekar på behov.

### 5.3 Multi-source unlock flow

```sql
-- Hur systemet kontrollerar om en kosmetik ska upplåsas:

-- 1. Level-baserat (körs i reward engine efter apply_xp_transaction_v1 returnerar level_up: true)
SELECT c.id FROM cosmetics c
JOIN cosmetic_unlock_rules r ON r.cosmetic_id = c.id
WHERE r.unlock_type = 'level'
  AND (r.unlock_config->>'required_level')::int <= :new_level
  AND c.id NOT IN (SELECT cosmetic_id FROM user_cosmetics WHERE user_id = :user_id);

-- 2. Achievement-baserat (körs vid achievement-unlock)
SELECT c.id FROM cosmetics c
JOIN cosmetic_unlock_rules r ON r.cosmetic_id = c.id
WHERE r.unlock_type = 'achievement'
  AND r.unlock_config->>'achievement_id' = :achievement_id
  AND c.id NOT IN (SELECT cosmetic_id FROM user_cosmetics WHERE user_id = :user_id);
```

### 5.4 Upplåsnings-notifiering

Vid ny kosmetik i `user_cosmetics`:
1. Frontend pollar vid mount (Journey-vy)
2. Nyligen upplåsta kosmetik (< 24h) visas med celebration-animation
3. Badge på navigations-ikon om ouppmärksammade upplåsningar finns

---

## 6. Frontend-arkitektur

### 6.1 Komponentstruktur

```
app/app/gamification/page.tsx          ← Dispatcher (oförändrad)
    ├── GamificationStandardPage       ← Standard-vy (oförändrad)
    └── GamificationPage (dynamic)     ← Journey-vy (MODIFIERAS)
        ├── JourneyScene               ← Faction-gradient wrapper
        ├── ParticleField              ← Ambienta partiklar (styrs av loadout)
        ├── AvatarSection              ← Avatar + Frame (styrs av loadout)
        ├── XPProgressBar              ← XP bar (styrs av loadout)
        ├── CosmeticControlPanel *NY*  ← Ersätter/utökar SkillTree
        │   ├── CategoryTabs           ← avatar_frame | background | particles | etc.
        │   ├── UnlockedGrid           ← Grid av upplåsta kosmetik per kategori
        │   ├── EquipButton            ← Aktivera/inaktivera kosmetik
        │   └── PreviewPanel           ← Live preview av kosmetik-effekt
        ├── LoadoutSummary *NY*        ← "Din aktiva design" — visar alla active slots
        ├── CoinsSection               ← Oförändrad
        ├── StreakSection               ← Oförändrad
        ├── BadgeShowcase              ← Oförändrad
        └── CallToActionSection        ← Oförändrad
```

### 6.2 CosmeticControlPanel — ersätter SkillTree

Nuvarande `SkillTreeSection` är en passiv 9-noders vy med SVG-kopplingar. I v2.0 ersätts den med `CosmeticControlPanel`:

```
┌─ Cosmetic Control Panel ──────────────────────────────────────┐
│                                                                │
│  [Avatar Frame] [Bakgrund] [Partiklar] [XP Bar] [Divider]    │  ← CategoryTabs
│                                                                │
│  ┌─ Upplåsta ──────────────────────────────────────────────┐  │
│  │  🟣 Stjärnbild (Void)  ✅ AKTIV                         │  │
│  │  🟢 Rankor (Forest)    ○ Inaktiv                        │  │
│  │  🔵 Korallrev (Sea)    ○ Inaktiv                        │  │
│  │  🟡 Norrsken (Desert)  🔒 Level 6                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Preview ───────────────────────────────────────────────┐  │
│  │  [Live preview av vald kosmetik]                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Interaction:**
1. Välj kategori-tab
2. Se grid av alla kosmetik i den kategorin (upplåsta, låsta, vilken fraktion)
3. Tap på upplåst kosmetik → equip/unequip (optimistic update)
4. Live preview uppdateras i realtid

### 6.3 Loadout-rendering

Loadout-data hämtas vid mount och cachar lokalt:

```typescript
// v2.0 core slots — matchar cosmetics.category
type CosmeticSlot = 'avatar_frame' | 'scene_background' | 'particles' | 'xp_bar' | 'section_divider';

// Discriminated union — varje render_type har sin egen typade config
type SvgFrameConfig = { renderType: 'svg_frame'; variant: string; glowColor?: string };
type CssBackgroundConfig = { renderType: 'css_background'; className: string; keyframes?: string };
type CssParticlesConfig = { renderType: 'css_particles'; className: string; density?: number };
type XpSkinConfig = { renderType: 'xp_skin'; skin: string; colorMode?: string };
type CssDividerConfig = { renderType: 'css_divider'; className: string; gradient?: string };

type RenderConfig = SvgFrameConfig | CssBackgroundConfig | CssParticlesConfig | XpSkinConfig | CssDividerConfig;

type ActiveLoadout = Partial<Record<CosmeticSlot, RenderConfig>>;

// Exempel:
const loadout: ActiveLoadout = {
  avatar_frame: { renderType: 'svg_frame', variant: 'constellation', glowColor: 'rgba(124, 58, 237, 0.4)' },
  scene_background: { renderType: 'css_background', className: 'bg-effect-stars', keyframes: 'stars-float' },
  // particles: undefined — inga partiklar aktiva
  xp_bar: { renderType: 'xp_skin', skin: 'warp', colorMode: 'accent' },
  // section_divider: undefined
};
```

Varje kosmetisk komponent konsumerar sin slot:

```typescript
// AvatarFrame: konsumerar loadout.avatar_frame
<AvatarFrame config={loadout.avatar_frame} avatarUrl={identity.avatarUrl} />

// XPProgressBar: konsumerar loadout.xp_bar
<XPProgressBar config={loadout.xp_bar} progress={progress} />

// ParticleField: konsumerar loadout.particles
<ParticleField config={loadout.particles} />
```

### 6.4 Bundle-strategi

```
Standard-vy chunk:
  GamificationStandardPage.tsx        ~5 KB (oförändrad)
  Noll Journey-imports

Journey-vy chunk:
  GamificationPage.tsx                ~50 KB (+ CosmeticControlPanel)
  JourneyScene, ParticleField, etc.
  CosmeticControlPanel *NY*           ~15 KB (estimat)
  
Kosmetik-assets:
  CSS-klasser (bakgrunder, partiklar)  → bundled med Journey-chunk
  Preview-bilder                       → lazy-loaded från CDN/public vid behov
  SVG-frames                           → bundled (redan existerande pattern)
```

**Regel:** Inga bilder/assets laddas förrän kosmetik-panelen öppnas. Grid-ikoner använder CSS-baserade placeholders, inte riktiga asset-previews.

---

## 7. API-arkitektur

### 7.1 Läs kosmetik-data

**Utöka `GET /api/gamification`:**

```typescript
// Nytt fält i GamificationPayload
cosmetics: {
  loadout: ActiveLoadout;              // Aktiv konfiguration (5 slots)
  unlockedCount: number;               // Totalt antal upplåsta
  recentUnlocks: RecentUnlock[];       // Senaste 24h, för notification
};
```

### 7.2 Hämta kosmetikkatalog

**Ny endpoint: `GET /api/journey/cosmetics`**

```typescript
// Response
{
  catalog: CosmeticItem[];           // Alla kosmetik (aktiva)
  unlocked: string[];                // IDs som usern har
  loadout: Record<string, string>;   // slot → cosmetic_id mappning
}
```

Denna endpoint anropas enbart från `CosmeticControlPanel` (lazy-loaded i Journey-vy).

### 7.3 Uppdatera loadout

**Ny endpoint: `POST /api/journey/cosmetics/equip`**

```typescript
// Request
{
  slot: string;              // 'avatar_frame', 'background', etc.
  cosmeticId: string | null; // UUID eller null för unequip
}

// Validering:
// 1. cosmeticId finns i cosmetics-tabellen
// 2. cosmeticId finns i user_cosmetics (användaren äger den)
// 3. cosmeticId.category matchar slot
// 4. Upsert user_cosmetic_loadout
```

### 7.4 Grant kosmetik (vid level-up, achievement)

**Intern funktion (server-side, inte exponerad som API):**

```typescript
async function grantCosmeticUnlocks(userId: string, trigger: UnlockTrigger) {
  // 1. Hämta relevanta unlock_rules baserat på trigger
  // 2. Filtrera bort redan ägda kosmetik
  // 3. Insert nya user_cosmetics
  // 4. Returnera lista av nyligen upplåsta (för notification)
}
```

Anropas från:
- **Reward engine** (`gamification-reward-engine.server.ts` → `applyXp()`): efter RPC `apply_xp_transaction_v1` returnerar `level_up: true`
- Achievement-unlock endpoint (`/api/gamification/achievements/unlock`)
- Shop-purchase flow
- Admin-API (`/api/admin/cosmetics/grant`)

### 7.5 Admin-API (v2.0 minimum scope)

**Åtkomst:** System-admin-only (inte tenant-admin). Journey-kosmetik är globala — inte scopade till en specifik tenant. Använd dedikerad `requireSystemAdmin()` guard som verifierar `system_role = 'admin'` utan tenant-kontext. Befintlig `assertTenantAdminOrSystem()` har redan en system-admin-check men tar `tenantId` — skapa en ny guard som enbart kräver system-admin.

**Nya admin-endpoints (under `/api/admin/cosmetics/`):**

| Method | Path | Funktion |
|--------|------|----------|
| GET | `/api/admin/cosmetics` | Lista alla kosmetik (med filter) |
| POST | `/api/admin/cosmetics` | Skapa ny kosmetik |
| PUT | `/api/admin/cosmetics/:id` | Uppdatera kosmetik |
| DELETE | `/api/admin/cosmetics/:id` | Avaktivera kosmetik (soft delete via `is_active`) |
| POST | `/api/admin/cosmetics/:id/rules` | Lägg till unlock-regel |
| POST | `/api/admin/cosmetics/grant` | Granta kosmetik till **enskild** användare (med anledning) |

**Framtida admin-endpoints (v2.1+):**

| Funktion | Motivering |
|----------|------------|
| Batch-grant (multipla users) | Kräver job-queue / background processing |
| Grant-analytics (vem har vad, unlock-statistik) | Kräver aggregerings-queries, dashboard-vy |
| Live preview (admin ser kosmetik i kontext) | Kräver preview-rendering pipeline |

---

## 8. Admin-UI

### 8.1 Admin Cosmetic Manager (v2.0 minimum)

Placering: `/app/admin/cosmetics` (ny admin-sektion)

**Åtkomst:** Enbart system-admin. Tenant-admins har INTE tillgång. Kosmetikkatalogen är global och påverkar alla användare på plattformen.

**v2.0 scope:**
- Lista alla kosmetik med filter (kategori, fraktion, raritet)
- Skapa / redigera kosmetik (nyckel, kategori, fraktion, raritet, namn, render_type + render_config)
- Hantera unlock-regler (level, achievement, shop, event, manual)
- Granta enskild kosmetik till enskild användare (med anledning)

**Wireframe (v2.0):**

```
┌─ Admin: Cosmetics ─────────────────────────────────────────────┐
│                                                                 │
│  [+ Ny kosmetik]   Filter: [Kategori ▼] [Fraktion ▼] [Raritet ▼] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟣 Stjärnbild (Void Avatar Frame)                          ││
│  │ Kategori: avatar_frame | render_type: svg_frame | Level 6  ││
│  │ [Redigera] [Regler] [Granta till user]                     ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 🟢 Löv (Forest Scene Background)                           ││
│  │ Kategori: scene_background | render_type: css_background   ││
│  │ [Redigera] [Regler] [Granta till user]                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Admin Grant-verktyg (v2.0)

Admin ska kunna:
1. Söka efter enskild användare
2. Välja kosmetik att granta
3. Ange anledning (loggas)

**Framtida (v2.1+):** Batch-grant till multipla användare (t.ex. "alla som deltog i event X"). Kräver job-queue.

---

## 9. Performanceöversyn

### 9.1 Query-budget

| Operation | Query-count | Latency target |
|-----------|:-----------:|:--------------:|
| `GET /api/gamification` (inkl loadout) | +2 queries (loadout + recent unlocks) | < 200ms |
| `GET /api/journey/cosmetics` (katalog) | 3 queries (catalog + unlocked + loadout) | < 300ms |
| `POST /api/journey/cosmetics/equip` | 2 queries (verify + upsert) | < 100ms |
| Level-up cosmetic check | 1 query (unlock rules matching) | < 50ms |

### 9.2 Caching-strategi

| Data | Cache | Invalidering |
|------|-------|--------------|
| Kosmetikkatalog (`cosmetics`) | Edge cache 5min | Vid admin-ändring |
| User loadout (`user_cosmetic_loadout`) | Ingen (hämtas vid mount) | Vid equip/unequip |
| User collection (`user_cosmetics`) | Ingen | Vid ny unlock |
| Unlock rules (`cosmetic_unlock_rules`) | Server-side 10min | Vid admin-ändring |

### 9.3 Bundle-impact

| Scenario | Nuvarande | v2.0 Estimat | Ökning |
|----------|-----------|-------------|--------|
| Standard-vy | ~5 KB | ~5 KB | 0% |
| Journey-vy (page) | ~38 KB | ~55 KB | +45% |
| Cosmetic Control Panel | 0 (existerar inte) | ~15 KB | Ny komponent |

**Total Journey-vy: ~55 KB** — acceptabelt för en lazy-loaded, opt-in-vy.

### 9.4 Kosmetik-rendering

Alla kosmetik renderas via **CSS-klasser och CSS-variabler** — ingen runtime-beräkning. `css_config` från databasen mappas till className props.

Undvik:
- JavaScript-beräknad styling
- Canvas/WebGL-rendering
- Stora bildtillgångar i initial bundle
- Dynamisk CSS-generation via `style` props (använd `className` istället)

---

## 10A. Asset-strategi

### 10A.1 Render-modell: CSS-first

v2.0 använder **CSS-baserad rendering** för alla kosmetik-kategorier. Inga bildtillgångar (PNG/JPEG/WebP) krävs för runtime-rendering i v2.0 core.

| Kategori | Render-approach | Assets |
|----------|----------------|--------|
| `avatar_frame` | SVG inline (redan bunlad i komponent) | SVG-strängar i `render_config` eller komponent |
| `scene_background` | CSS `className` + `keyframes` | CSS-klasser i Journey-chunk |
| `particles` | CSS-baserat partikelsystem | CSS-klasser + animationer |
| `xp_bar` | CSS-skin via `className` | CSS-klasser |
| `section_divider` | CSS border/gradient | CSS-klasser |

### 10A.2 Preview-assets (framtida)

Admin-vy och kosmetikkatalog behöver eventuellt visuella previews:

- **v2.0:** CSS-baserade placeholders i grid (färgcirkel + namn). Ingen bild-pipeline.
- **v2.1+:** Om admin-preview eller katalog-thumbnails behövs:
  - Lagra previews i Supabase Storage (`journey-assets` bucket)
  - Referera via `cosmetics.preview_url` (ny kolumn, nullable)
  - Lazy-load vid katalog-öppning, inte vid page-mount

### 10A.3 Bundle-gränser

| Tillgångstyp | Leverans | Budget |
|-------------|----------|--------|
| CSS-klasser/keyframes | Bundled med Journey-chunk | Ingår i ~55 KB estimat |
| SVG-frames | Inline i komponent | < 5 KB per frame |
| Preview-bilder (v2.1+) | Lazy-load från CDN/Storage | Ej i initial bundle |

**Regel:** Inga bildtillgångar i initial bundle. Alla visuella effekter i v2.0 ska vara CSS/SVG-baserade.

---

## 10. Migrationsväg från v1.0

### 10.1 Bakåtkompatibilitet

| v1.0 komponent | v2.0 förändring | Risk |
|----------------|-----------------|------|
| `skill-trees.ts` | Ersätts av `cosmetics`-tabell | Med — data-migration krävs |
| `SkillTreeSection.tsx` | Ersätts av `CosmeticControlPanel` | Låg — ren frontend-byte |
| `AvatarFrame.tsx` | Utökas med `render_config`-driven rendering | Låg — befintliga varianter bevaras |
| `XPProgressBar.tsx` | Utökas med loadout-driven skin-val | Låg — befintliga skins bevaras |
| `FactionSelector.tsx` | Uppdateras: 4 fraktioner, `sky` → `desert` | Med — DB-migration |
| `player_cosmetics` | Behålls oförändrad | Ingen |
| `user_journey_preferences` | Behålls oförändrad | Ingen |

### 10.2 Seed-data

v2.0 kräver seed-data i `cosmetics`-tabellen som matchar nuvarande hårdkodade data i `skill-trees.ts`.

Mapping mot v2.0 core slots:

```
Seed-data (baserat på 9 skill-tree noder × 4 fraktioner = 36 noder totalt):

Mappade till v2.0 slots (~24 kosmetik):
├── 4 × avatar_frame     (render_type: svg_frame)    — headerFrame × 4
├── 8 × scene_background  (render_type: css_background) — backgroundEffect × 2 × 4
├── 4 × particles         (render_type: css_particles)  — avatarEffect × 4 (omdefinierade som particles)
├── 4 × xp_bar            (render_type: xp_skin)        — xpBarSkin × 4
├── 4 × section_divider   (render_type: css_divider)    — sectionDivider × 4

Ej mappade (~12 noder, markeras inactive):
├── 4 × root              — identity-node, ingen kosmetik
├── 4 × colorMode         — utanför v2.0 scope
└── 4 × prestigeTitle     — explicit exkluderad från v2.0
```

**Viktigt:** Inte alla 36 skill-tree noder har en 1:1-mapping till v2.0 slots. Noder som `root`, `color_mode`, `prestige_title` etc. har ingen slot i v2.0 och ska antingen tas bort eller parkeras som inaktiva.

Plus fraktionsoberoende kosmetik som kan läggas till av admin.

### 10.3 Rollback-plan

Om v2.0 behöver rullas tillbaka:

| Steg | Åtgärd | Komplexitet | Notering |
|------|--------|:-----------:|----------|
| 1 | Revertera frontend-kod (git revert) | Låg | Enkel git-operation |
| 2 | Behåll `cosmetics`/`user_cosmetics`/`user_cosmetic_loadout`-tabeller | Medel | Kan lämnas utan FK-konflikter, men behöver beslutas om data kastas eller sparas |
| 3 | `skill-trees.ts` finns kvar som fallback | Låg | Förutsätter att filen inte raderas i v2.0-migreringen |
| 4 | Återställ `GET /api/gamification` payload | Medel | Nya fält (`cosmetics`) kan tas bort, men klienter som redan deployas behöver cache-invalidering |
| 5 | Ta ner admin sidor | Låg | Ta bort route-filer |
| 6 | RLS-policies | Medel | Kan lämnas om tabellerna behålls; bör rensas om tabellerna droppas |

**Realistisk bedömning:** Full rollback kräver koordinerad deploy + eventuell cache-invalidering. Inte en "enklick"-operation.

---

## 11. Framtida expansionspunkter (utanför v2.0 scope)

| Funktion | Förutsättning | Kommentar |
|----------|---------------|-----------|
| Faction affinity/reputation | Ny `faction_progress`-tabell + UI | Djupare fraktionsinvestering; se §5.2 |
| Seasonal cosmetics | `cosmetics.season_id` kolumn | Tidsbegränsade teman |
| Titles (visningsnamn) | Ny slot + tabell; se §3.2.2 exklusionsgrund | Scopas separat |
| Trading/gifting | `cosmetic_trades`-tabell | Social feature |
| Cosmetic sets/bundles | `cosmetic_sets`-tabell | "Samla alla Void-items" |
| Animerade frames | Ny render_type `animated_svg_frame` | Performance-budgetering krävs |
| Sound effects | Ny render_type `audio_cue` | Valfritt |
| Batch admin grants | Job-queue + `/api/admin/cosmetics/batch-grant` | Se §7.5 |
| Admin preview | Preview-rendering pipeline | Kräver asset-strategy; se §10A |
| Subroute-gating | Dispatcher-pattern i varje subroute | v2.0 kan förbereda, v2.1 implementerar |

---

## 12. Ordlista

| Term | Definition |
|------|-----------|
| **Kosmetik** | En visuell förändring av Journey-vyn (frame, bakgrund, partiklar, etc.) |
| **Loadout** | Användarens aktiva kombination av kosmetik (en per slot) |
| **Slot** | En kategoriposition i loadout. v2.0 core: `avatar_frame`, `scene_background`, `particles`, `xp_bar`, `section_divider` |
| **Katalog** | Den kompletta listan av alla definierade kosmetik |
| **Samling** | Användarens upplåsta kosmetik (subset av katalogen) |
| **Unlock Rule** | Admin-definierad regel för hur en kosmetik upplåses |
| **Fraktion** | En av 4 visuella teman (Forest, Sea, Desert, Void) |
| **render_type** | Diskriminatorkolumn som bestämmer vilken Zod-schema som validerar `render_config` |
| **render_config** | JSONB-data validerad mot render_type-specifik schema. Styr hur en kosmetik renderas i frontend |
| **Grant** | Server-side operation som ger en användare ägarskap av en kosmetik. Klienter kan inte granta sig själva. |
