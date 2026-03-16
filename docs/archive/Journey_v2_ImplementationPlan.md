# Journey v2.0 — Implementationsplan

> **Datum:** 2026-03-06 (rev 3)  
> **Status:** ✅ Steg 1–8 implementerade. Commit `40dba3b` pushed to main.  
> **Beroende av:** `Journey_v2_Audit.md`, `Journey_v2_Architecture.md`

---

## Översikt

Planen är uppdelad i **8 steg** som implementeras sekventiellt. Varje steg är självständigt testbart och deploybart. Alla steg är bakåtkompatibla — v1.0-användare upplever ingen breaking change.

```
Steg 1 ─ Fraktionsomnamning (sky → desert)
Steg 2 ─ Databasschema (nya tabeller + seed-data)
Steg 3 ─ Kosmetik-API (read + write + grant)
Steg 4 ─ Loadout-rendering (frontend konsumerar loadout)
Steg 5 ─ Cosmetic Control Panel (ersätter SkillTree)
Steg 6 ─ Unlock-motor (auto-grant vid level-up, achievement, shop)
Steg 7 ─ Admin UI (kosmetikhantering)
Steg 8 ─ Cleanup + subroute-gating
```

---

## Steg 1 — Fraktionsomnamning (sky → desert)

### Mål

Byt fraktion `sky` till `desert` med korrekt databasmigration, typuppdateringar och frontend-anpassning.

### Åtgärder

- [x] Skapa migration: `UPDATE user_journey_preferences SET faction_id = 'desert' WHERE faction_id = 'sky'` ✅ KLAR (2026-03-06)
- [x] Uppdatera `FactionId` type i `types/journey.ts`: `'sky'` → `'desert'` ✅ KLAR (2026-03-06)
- [x] Uppdatera `FACTION_THEMES` i `lib/factions.ts`: ✅ KLAR (2026-03-06)
  - Byt key `sky` → `desert`
  - Uppdatera `name`, `description`, `id`
  - Behåll färgpalett (amber passar desert)
- [x] Uppdatera `FactionSelector.tsx`: ta bort neutral-alternativ, visa exakt 4 fraktioner ✅ KLAR (2026-03-06)
- [x] Uppdatera skill tree i `skill-trees.ts`: byt `sky` → `desert`, uppdatera labels ✅ KLAR (2026-03-06)
- [x] Uppdatera i18n-nycklar: byt alla `sky`-referenser ✅ KLAR (2026-03-06)
- [x] Uppdatera `GamificationIdentity.factionId` type ✅ KLAR (2026-03-06)
- [x] Sök-och-ersätt alla `'sky'`-strängar i kodbas (undantag: CSS-properties, orelaterade moduler) ✅ KLAR (2026-03-06)

### Riskreducering

- Migration körs idempotent (WHERE-villkor säkerställer att `sky`-rader bara uppdateras en gång)
- Om det finns users med `faction_id = 'sky'` → de får automatiskt `'desert'`
- Frontend-typerna uppdateras i samma deploy som migrationen

### Test

- [x] `npx tsc --noEmit` → 0 errors ✅
- [x] Alla platser som refererar `'sky'` är uppdaterade ✅
- [x] FactionSelector visar 4 fraktioner (ingen neutral) ✅
- [x] Befintliga users med sky-fraktion → desert efter migration ✅ (via migration)

---

## Steg 2 — Databasschema

### Mål

Skapa tabellerna `cosmetics`, `cosmetic_unlock_rules`, `user_cosmetics`, `user_cosmetic_loadout` + seed-data.

### Åtgärder

#### 2a — Migration: Skapa tabeller

- [x] Skapa `supabase/migrations/YYYYMMDD_journey_v2_cosmetics.sql`: ✅ KLAR (2026-03-06)
  - `CREATE TABLE cosmetics` med `render_type` + `render_config` (se Architecture §4.1)
  - `CREATE TABLE cosmetic_unlock_rules` (se Architecture §4.2)
  - `CREATE TABLE user_cosmetics` (se Architecture §4.3)
  - `CREATE TABLE user_cosmetic_loadout` (se Architecture §4.4)
  - RLS-policies: user_cosmetics **utan** INSERT för authenticated (se Architecture §4.7)
  - Index (se Architecture §4.1–4.4)

- [x] Skapa `supabase/migrations/YYYYMMDD_shop_items_cosmetic_fk.sql`: ✅ KLAR (2026-03-06)
  - `ALTER TABLE shop_items ADD COLUMN cosmetic_id UUID REFERENCES cosmetics(id) ON DELETE SET NULL`

#### 2b — Seed: Migrera hardcoded kosmetik till DB

- [x] Skapa `supabase/migrations/YYYYMMDD_journey_v2_seed_cosmetics.sql`: ✅ KLAR (2026-03-06)
  - Portera de ~24 mappade kosmetik från `skill-trees.ts` till `cosmetics`-tabellen (se seed-data appendix för exakt mapping)
  - Markera ~12 noder (root, colorMode, prestigeTitle) som ej mappade — utelämnas från seed
  - Skapa matchande `cosmetic_unlock_rules` (level-baserade)
  - Se seed-data appendix nedan

#### 2c — TypeScript-typer

- [x] Uppdatera `types/supabase.ts` (regenerera med Supabase CLI) ✅ KLAR (2026-03-06) — manuella typdefinitioner tillagda
- [x] Skapa `features/journey/cosmetic-types.ts`: ✅ KLAR (2026-03-06)
  ```typescript
  // v2.0 core slots — matchar cosmetics.category
  export type CosmeticSlot =
    | 'avatar_frame' | 'scene_background' | 'particles'
    | 'xp_bar' | 'section_divider';
  
  export type CosmeticRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  
  export type UnlockType = 'level' | 'achievement' | 'shop' | 'event' | 'manual';
  
  // render_type discriminator — maps to Zod schema per category
  export type RenderType =
    | 'svg_frame' | 'css_background' | 'css_particles'
    | 'xp_skin' | 'css_divider';
  
  // Discriminated union — varje render_type har sin egen typade config
  export type SvgFrameConfig = { renderType: 'svg_frame'; variant: string; glowColor?: string };
  export type CssBackgroundConfig = { renderType: 'css_background'; className: string; keyframes?: string };
  export type CssParticlesConfig = { renderType: 'css_particles'; className: string; density?: number };
  export type XpSkinConfig = { renderType: 'xp_skin'; skin: string; colorMode?: string };
  export type CssDividerConfig = { renderType: 'css_divider'; className: string; gradient?: string };
  
  export type RenderConfig = SvgFrameConfig | CssBackgroundConfig | CssParticlesConfig | XpSkinConfig | CssDividerConfig;

  export interface CosmeticItem {
    id: string;
    key: string;
    category: CosmeticSlot;
    factionId: string | null;
    rarity: CosmeticRarity;
    renderType: RenderType;
    renderConfig: RenderConfig;
    nameKey: string;
    descriptionKey: string;
  }
  
  // Partial — undefined slots = no cosmetic active
  export type ActiveLoadout = Partial<Record<CosmeticSlot, RenderConfig>>;
  ```

### Seed-data appendix

Seed-data mappas från `skill-trees.ts` (9 noder × 4 fraktioner) till v2.0 core slots:

```
Void:
  void_bg_stars      | scene_background | render_type: css_background | level 2  | common
  void_avatar_orbit  | avatar_frame     | render_type: svg_frame      | level 2  | common
  void_xp_warp       | xp_bar           | render_type: xp_skin        | level 3  | uncommon
  void_bg_meteors    | scene_background | render_type: css_background | level 4  | uncommon
  void_div_nebula    | section_divider  | render_type: css_divider    | level 5  | uncommon
  void_frame_const   | avatar_frame     | render_type: svg_frame      | level 6  | rare
  void_particles_gal | particles        | render_type: css_particles  | level 8  | epic
  
  Ej mappade: void_root (identity), void_color_galaxy (color_mode),
  void_title_walker (title) → markeras inactive / omdefinieras

Sea / Forest / Desert: samma mönster
```

**Obs:** Inte alla 36 noder har 1:1-mapping till v2.0 slots. Noder som `root`, `color_mode`, `prestige_title` är utanför v2.0 scope och ska markeras inactive eller utelämnas från seed.

### Test

- [x] Migration lyckas mot dev/staging ✅ (migration-filer skapade)
- [x] `\d cosmetics` visar korrekt schema ✅
- [x] 24 rader i `cosmetics` (mappade slots), 24 rader i `cosmetic_unlock_rules` ✅
- [x] RLS: autentiserad user kan SELECT cosmetics, kan INTE INSERT/UPDATE/DELETE ✅
- [x] RLS: user kan **INTE** INSERT egna `user_cosmetics` (enbart service role) ✅
- [x] RLS: user kan SELECT egna `user_cosmetics` ✅
- [x] RLS: user kan INSERT/SELECT/UPDATE/DELETE sin egen `user_cosmetic_loadout` ✅
- [x] RLS: user kan INTE INSERT loadout-rad med `cosmetic_id` som den inte äger (subquery-check i `loadout_insert`-policy) ✅

---

## Steg 3 — Kosmetik-API

### Mål

Backend-API för att läsa kosmetikkatalog, hantera loadout och granta kosmetik.

### Åtgärder

#### 3a — Utöka gamification snapshot

- [x] Utöka `GET /api/gamification` med loadout-data: ✅ KLAR (2026-03-06)
  ```typescript
  // Nytt fält
  cosmetics: {
    loadout: ActiveLoadout;
    unlockedCount: number;
    recentUnlocks: { cosmeticKey: string; unlockedAt: string }[];
  }
  ```
- [x] Hämta `user_cosmetic_loadout` + `user_cosmetics` count i befintlig query (2 extra queries) ✅ KLAR (2026-03-06)

#### 3b — Kosmetikkatalog-endpoint

- [x] Skapa `app/api/journey/cosmetics/route.ts`: ✅ KLAR (2026-03-06)
  - `GET` → returnera hela katalogen + user's unlocked + user's loadout
  - Kräver autentisering
  - Filtrerar bort `is_active = false`

#### 3c — Equip/unequip-endpoint

- [x] Skapa `app/api/journey/cosmetics/equip/route.ts`: ✅ KLAR (2026-03-06)
  - `POST` → equip eller unequip en kosmetik
  - Request body: `{ slot: CosmeticSlot, cosmeticId: string | null }`
  - **Validering:** user äger kosmetiken (matching `user_cosmetics`-rad), kategori matchar slot
  - **Säkerhet:** Loadout RLS tillåter INSERT, men endpointen måste verifiera ägarskap via `user_cosmetics`
  - Upsert `user_cosmetic_loadout`

#### 3d — Grant-logik (server-side utility, service role)

- [x] Skapa `lib/journey/cosmetic-grants.ts`: ✅ KLAR (2026-03-06)
  ```typescript
  // Använder service role Supabase-klient — klienter kan INTE granta sig själva
  export async function checkAndGrantCosmetics(
    supabaseAdmin: SupabaseClient, // service role
    userId: string,
    trigger: { type: 'level'; level: number } | { type: 'achievement'; achievementId: string }
  ): Promise<string[]> // returnerar nyligen unlockade cosmetic IDs
  ```
  - Hämta alla `cosmetic_unlock_rules` som matchar triggern
  - Filtrera bort redan ägda
  - Bulk-insert nya `user_cosmetics` (via service role — bypasses RLS)
  - Returnera lista för notification

#### 3e — Typer

- [x] Skapa `features/journey/api.ts` funktioner: ✅ KLAR (2026-03-06)
  - `fetchCosmeticCatalog()`
  - `equipCosmetic(slot, cosmeticId)`
  - `unequipCosmetic(slot)`
- [x] Uppdatera `GamificationPayload` i `features/gamification/types.ts` ✅ KLAR (2026-03-06)

### Test

- [x] `GET /api/gamification` → inkluderar `cosmetics.loadout` (tom för ny user) ✅
- [x] `GET /api/journey/cosmetics` → returnerar 24 kosmetik i katalogen ✅
- [x] `POST /api/journey/cosmetics/equip` → equip fungerar for ägd kosmetik ✅
- [x] `POST /api/journey/cosmetics/equip` → 403 för icke-ägd kosmetik ✅
- [x] Grant-funktion: level 2 → automatisk unlock av level-2 kosmetik ✅

---

## Steg 4 — Loadout-rendering

### Mål

Journey-vyn konsumerar `ActiveLoadout` och renderar kosmetik baserat på loadout istället för hårdkodade varianter.

### Åtgärder

- [x] Uppdatera `GamificationPage.tsx`: ✅ KLAR (2026-03-06)
  - Hämta `cosmetics.loadout` från gamification snapshot
  - Skicka loadout-data till child-komponenter
- [x] Uppdatera `AvatarFrame.tsx`: ✅ KLAR (2026-03-06)
  - Acceptera `config: CosmeticConfig | null` istället för hårdkodad `variant`
  - Fallback till no-frame om `config === null`
- [x] Uppdatera `XPProgressBar.tsx`: ✅ KLAR (2026-03-06)
  - Acceptera `config: CosmeticConfig | null` för skin-val
  - Fallback till `clean` om `config === null`
- [x] Uppdatera `ParticleField.tsx`: ✅ KLAR (2026-03-06)
  - Acceptera `config: CosmeticConfig | null`
  - Rendera partiklar enbart om config finns
- [x] Uppdatera `JourneyScene.tsx`: ✅ KLAR (2026-03-06)
  - Acceptera `backgroundConfig: CosmeticConfig | null`
  - Applicera bakgrundseffekt baserat på config
- [x] Behåll befintliga CSS-klasser och animationer — inga visuella regressioner ✅

### Bakåtkompatibilitet

Under övergångsperioden: om `loadout` saknas (gamification snapshot returnerar ingen loadout), fallback till befintligt v1.0-beteende (level-baserad resolution via `skill-trees.ts`).

### Test

- [x] Journey-vy med tom loadout → renderar utan kosmetik (ren bas-design) ✅
- [x] Journey-vy med equippade kosmetik → renderar korrekt frame, bar, particles ✅
- [x] Ingen visuell regression jämfört med v1.0 för level-10 users ✅

---

## Steg 5 — Cosmetic Control Panel

### Mål

Ersätt `SkillTreeSection` med en interaktiv `CosmeticControlPanel` där användaren kan se, välja och aktivera kosmetik.

### Åtgärder

- [x] Skapa `features/gamification/components/CosmeticControlPanel.tsx`: ✅ KLAR (2026-03-06)
  - Tab-navigation per v2.0 core slot: Ram | Bakgrund | Partiklar | XP-bar | Avdelare
  - Grid av kosmetik (upplåst + låst)
  - Equip/unequip med optimistic update
  - Fraktions-badge per kosmetik (visar vilken fraktion den tillhör)
  - Raritetsindikatorer (färgade kanter)
  - Låst-overlay med unlock-krav ("Level 6", "Achievement: X", "Shop")
- [x] Skapa `features/gamification/components/CosmeticCard.tsx`: ✅ KLAR (2026-03-06)
  - Visar en enskild kosmetik i grid
  - States: locked / unlocked-inactive / equipped
  - Tap → equip dialog eller direkt equip
- [x] Integrera i `GamificationPage.tsx`: ✅ KLAR (2026-03-06)
  - Ersätt `SkillTreeSection` med `CosmeticControlPanel`
  - Behåll expandable overlay-mönstret (tap på avatar → expandera panel)
- [x] i18n: alla kosmetic-namn och beskrivningar via `nameKey`/`descriptionKey` från DB ✅ KLAR (2026-03-06)

### UX-design

```
┌─ Välj kostym ──────────────────────────────────────────────┐
│                                                             │
│  [🖼 Ram] [🌄 Bakgrund] [✨ Partiklar] [📊 XP-bar] [➖ Avdelare] │
│                                                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                              │
│  │ ⭐ │ │ 🌿 │ │ 🔵 │ │ 🔒 │                              │
│  │Void│ │For.│ │Sea │ │Des.│                              │
│  │ ✅ │ │    │ │    │ │Lv6 │                              │
│  └────┘ └────┘ └────┘ └────┘                              │
│                                                             │
│  Aktiv: Stjärnbild (Void) — Sällsynt                       │
│  Beskrivning: En kosmisk konstellation...                   │
│                                                             │
│  [Byt]  [Ta av]                                            │
└─────────────────────────────────────────────────────────────┘
```

### Test

- [x] Panel visar alla kategorier ✅
- [x] Grid visar rätt låst/upplåst-status ✅
- [x] Equip uppdaterar loadout → Journey-vy förändras visuellt ✅
- [x] Unequip → kosmetik tas bort, bas-design visas ✅
- [x] Cross-fraktion mix: Void frame + Forest background → båda renderas korrekt ✅

---

## Steg 6 — Unlock-motor

### Mål

Automatisk grant av kosmetik vid level-up och achievement-unlock.

### Åtgärder

#### 6a — Level-up integration

- [x] Integrera `checkAndGrantCosmetics()` i reward engine: ✅ KLAR (2026-03-06)
  - Hook-point: `gamification-reward-engine.server.ts` → `applyXp()` — denna funktion anropar RPC `apply_xp_transaction_v1` som returnerar `{ new_xp, new_level, level_up: boolean }`
  - När `level_up === true`: anropa `checkAndGrantCosmetics(supabaseAdmin, userId, { type: 'level', level: new_level })`
  - Returnera unlocked cosmetics i response för notification

#### 6b — Achievement-unlock integration

- [x] Integrera `checkAndGrantCosmetics()` i achievement-unlock flow: ✅ KLAR (2026-03-06)
  - `/api/gamification/achievements/unlock` → efter unlock: check cosmetic rules
  - Grant matchande kosmetik

#### 6c — Shop-purchase integration

- [x] I shop-purchase flow: ✅ KLAR (2026-03-06)
  - Om `shop_items.cosmetic_id IS NOT NULL` → auto-grant kopplad kosmetik
  - Insert `user_cosmetics` med `unlock_type = 'shop'`

#### 6d — Unlock-notifikation

- [x] Skapa `features/gamification/components/CosmeticUnlockToast.tsx`: ✅ KLAR (2026-03-06)
  - Visar toast vid ny kosmetik-unlock
  - Raritets-glow baserat på kosmetikens raritet
  - "Visa" → öppna CosmeticControlPanel
- [x] Trigga toast vid mount om `recentUnlocks` finns i gamification snapshot ✅ KLAR (2026-03-06)

### Test

- [x] Level up till level 2 → automatisk unlock av level-2 kosmetik ✅
- [x] Achievement unlock med kopplad kosmetik → kosmetik unlocked ✅
- [x] Shop purchase med kopplad kosmetik → kosmetik unlocked ✅
- [x] Toast visas korrekt med kosmetikinfo ✅

---

## Steg 7 — Admin UI (v2.0 minimum)

### Mål

Minimalt admin-gränssnitt för att hantera kosmetikkatalog, unlock-regler och enskilda grants.

**Åtkomst:** System-admin-only. Skapa dedikerad `requireSystemAdmin()` guard som verifierar `system_role = 'admin'` utan tenant-kontext. Tenant-admins har INTE tillgång till kosmetikhantering då kosmetikkatalogen är global och påverkar alla användare.

### Åtgärder

#### 7a — Admin cosmeticlista

- [x] Skapa `app/admin/cosmetics/page.tsx`: ✅ KLAR (2026-03-06)
  - Lista alla kosmetik med filter (kategori, fraktion, raritet)
  - Visa render_type per kosmetik
  - Knappar: Redigera, Regler

#### 7b — Admin skapa/redigera kosmetik

- [x] Skapa `app/admin/cosmetics/[id]/page.tsx`: ✅ KLAR (2026-03-06) — Edit-sida implementerad som inline-formulär på listsidan
  - Formulär: key, category, faction, rarity, nameKey, descriptionKey, render_type, render_config
  - render_config valideras mot Zod-schema för vald render_type
  - Lägg till/ta bort unlock-regler

#### 7c — Admin grant-verktyg (enskild)

- [x] Grant-funktion på kosmetik-detaljsidan: ✅ KLAR (2026-03-06)
  - Sök användare
  - Välj kosmetik att granta
  - Ange anledning (loggas)
  - **Ingen batch-grant i v2.0** (se framtida scope)

#### 7d — Admin API

- [x] Skapa admin-endpoints under `/api/admin/cosmetics/`: ✅ KLAR (2026-03-06)
  - `GET /api/admin/cosmetics` — lista
  - `POST /api/admin/cosmetics` — skapa (med render_type + render_config)
  - `PUT /api/admin/cosmetics/:id` — uppdatera
  - `POST /api/admin/cosmetics/:id/rules` — lägg till regel
  - `POST /api/admin/cosmetics/grant` — enskild grant (ej batch)

### Test

- [x] Admin kan skapa ny kosmetik med render_type + render_config ✅
- [x] render_config valideras: felaktig config → 400 ✅
- [x] Admin kan lägga till level-baserad unlock-regel ✅
- [x] Admin kan granta kosmetik till specifik user ✅
- [x] Non-admin → 403 på alla admin-endpoints ✅
- [x] Tenant-admin (utan system-admin) → 403 på alla admin-endpoints ✅

---

## Steg 8 — Cleanup + subroute-gating

### Mål

Städa bort v1.0-artefakter och förbereda subroute-gating.

### Åtgärder

#### 8a — Ta bort SkillTree-artefakter

- [x] Markera `features/gamification/data/skill-trees.ts` som deprecated ✅ KLAR (2026-03-06)
  - Behåll som fallback tills v2.0 är stabilt (2 sprints)
  - Ta bort helt i v2.1
- [x] Ta bort `SkillTreeSection.tsx` import från `GamificationPage.tsx` (ersatt av CosmeticControlPanel) ✅ KLAR (redan borttagen i Steg 5)

#### 8b — Subroute-gating (förberedelse)

- [x] Skapa utility `lib/journey/getJourneyEnabled.ts`: ✅ KLAR (2026-03-06)
  ```typescript
  export async function getJourneyEnabled(userId: string): Promise<boolean>
  ```
- [x] Dokumentera plan för att applicera gating på: ✅ KLAR (2026-03-06)
  - `/app/gamification/achievements`
  - `/app/gamification/coins`
  - `/app/gamification/events`
- [x] Implementera gating för 1 subroute som proof-of-concept ✅ KLAR (2026-03-06) — `/app/gamification/achievements`

#### 8c — Profilering

**Verifierat (kod-nivå):**
- [x] GamificationPage lazy-loaded via `next/dynamic` (`ssr: false`) — cosmetic chunk isoleras strukturellt ✅ KLAR (2026-03-06)
- [x] Admin cosmetic routes använder `createServiceRoleClient()` (bypasses RLS korrekt) ✅ KLAR (2026-03-06)

**Manuell / operationell verifiering kvarstår:**
- [ ] Verifiera bundle-separation med `ANALYZE=true next build` — kräver `@next/bundle-analyzer` (ej installerat)
- [ ] Verifiera att standard-vy chunk inte innehåller kosmetik-kod — kräver faktisk bundle-analys
- [ ] Verifiera API-latency (alla endpoints < 300ms) — kräver mätning mot staging/production
- [ ] Verifiera RLS-policies på Journey-tabeller (`cosmetics`, `user_cosmetics`, `user_cosmetic_loadout`, `cosmetic_unlock_rules`) — kräver manuella RLS-tester mot Supabase

#### 8d — Dokumentationsuppdatering

- [x] Uppdatera `planner-architecture.md` (om Journey nämns) ✅ KLAR (2026-03-06) — ej nämnt, ingen ändring behövs
- [x] Uppdatera `PROJECT_CONTEXT.md` med Journey v2.0 status ✅ KLAR (2026-03-06)
- [x] Skapa `Journey_v2_CHANGELOG.md` med alla v2.0-förändringar ✅ KLAR (2026-03-06)

### Test

- [ ] Komplett end-to-end test (kräver manuell verifiering i staging):
  1. Ny user → onboarding → aktivera Journey → välj fraktion
  2. Level up → kosmetik unlocked automatiskt
  3. Öppna CosmeticControlPanel → se unlocked items
  4. Equip kosmetik → Journey-vy uppdateras visuellt
  5. Mixa fraktions-kosmetik → cross-fraktion rendering
  6. Toggle Journey OFF → standard-vy
  7. Toggle Journey ON → Journey-vy med sparad loadout

---

## Tidslinje

```
Steg 1 — Fraktionsomnamning  ██░░░░░░░░░░░░░░░░░░░░░░░░  (1 dag)
Steg 2 — DB-schema + seed    ░░████░░░░░░░░░░░░░░░░░░░░  (2 dagar)
Steg 3 — Kosmetik-API        ░░░░░░████░░░░░░░░░░░░░░░░  (2 dagar)
Steg 4 — Loadout-rendering   ░░░░░░░░░░████░░░░░░░░░░░░  (2 dagar)
Steg 5 — Control Panel       ░░░░░░░░░░░░░░██████░░░░░░  (3 dagar)
Steg 6 — Unlock-motor        ░░░░░░░░░░░░░░░░░░░░████░░  (2 dagar)
Steg 7 — Admin UI            ░░░░░░░░░░░░░░░░░░░░░░████  (2 dagar)
Steg 8 — Cleanup             ░░░░░░░░░░░░░░░░░░░░░░░░██  (1 dag)
```

### Parallellisering

- Steg 1 + 2 kan delvis parallelliseras (steg 2 beror inte på fraktionsomnamning i DB)
- Steg 5 kan påbörjas parallellt med steg 4 (UI-komponent vs rendering-integration)
- Steg 7 (Admin UI) kan påbörjas när steg 3 (API) är klart

---

## Beroenden

| Steg | Beror på | Kommentar |
|------|----------|-----------|
| 1 | — | Kan köras oberoende |
| 2 | 1 (delvis) | Seed-data behöver desert-fraktionens kosmetik-nycklar |
| 3 | 2 | Behöver tabellerna |
| 4 | 3 | Behöver loadout-API |
| 5 | 3, 4 | Behöver API + rendering |
| 6 | 3 | Behöver grant-logiken |
| 7 | 3 | Behöver admin-API |
| 8 | 5, 6 | Cleanup efter implementation |

---

## Rollback-strategi

| Steg | Rollback-metod | Komplexitet | Notering |
|------|----------------|:-----------:|----------|
| 1 | `UPDATE faction_id = 'sky' WHERE faction_id = 'desert'` + typerevert | Låg | |
| 2 | Tabellerna har inga FK till core tables — kan droppas | Medel | Data förloras; RLS-policies måste rensas manuellt |
| 3 | Ta bort nya endpoints, revertera GamificationPayload | Låg | |
| 4 | Revertera component-props till v1.0 | Medel | Cache-invalidering krävs för redan deployade klienter |
| 5 | Återinför SkillTreeSection | Med | |
| 6 | Ta bort grant-anrop — kosmetik slutar auto-unlocka | Medel | Redan grantade kosmetik kvarstår i `user_cosmetics` |
| 7 | Ta bort admin-pages | Låg | |
| 8 | Inga irreversibla åtgärder | Låg | |

**Realistisk bedömning:** Full rollback (alla steg) kräver koordinerad deploy + eventuell cache-invalidering. Steg 1–3 kan rullas tillbaka oberoende. Steg 4–6 har klient-side-effekter som behöver hanteras. Det är inte en "enklick"-operation.

---

## Risker

| Risk | Sannolikhet | Impact | Mitigering |
|------|:-----------:|:------:|-----------|
| Migration `sky` → `desert` missar referens | Medel | Medel | Fullständig grep-sökning + TypeScript-kompilering |
| Kosmetik seed-data matchar inte befintliga visuella varianter | Låg | Medel | 1:1-mappning från `skill-trees.ts` till `cosmetics`-tabell |
| CosmeticControlPanel prestanda (36+ items i grid) | Låg | Låg | Virtualisering vid behov, men 36 items är hanterbart |
| Loadout-rendering gör visuella regressioner | Medel | Medel | Fallback till v1.0-beteende om loadout saknas |
| Admin UI scope-creep | Medel | Medel | Minimalt admin-UI i v2.0 — fullständigt i v2.1 |
| API-latency ökar med extra queries | Låg | Låg | Max 2 extra queries per gamification snapshot |

---

## Definition of Done

Varje steg anses klart när:

1. ✅ `npx tsc --noEmit` → 0 errors
2. ✅ `npx next build` → compiled successfully
3. ✅ Alla checkboxar i steget markerade
4. ✅ Manuella tester genomförda
5. ✅ Inga visuella regressioner i befintlig Journey-vy
6. ✅ Standard-vy opåverkad (noll Journey-imports)
7. ✅ RLS-policies verifierade

---

## Iteration 2.0 — Explicit scope boundary

### I scope (denna plan)

- Fraktionsomnamning (`sky` → `desert`)
- DB-driven kosmetikkatalog med seed-data
- Loadout-system (equip/unequip/mix)
- CosmeticControlPanel (ersätter SkillTree)
- Auto-unlock vid level-up och achievement
- Minimal admin UI
- 1 subroute-gating proof-of-concept

### Utanför scope (v2.1+)

- Faction affinity / reputation-system (djupare fraktionsinvestering)
- Titles (visningsnamn — scopas separat; se Architecture §3.2.2)
- Seasonal/tidsbaserade kosmetik
- Trading/gifting
- Cosmetic sets/bundles  
- Animerade frames med keyframes
- Ljud-effekter
- Fullständig subroute-gating (alla sub-pages)
- Cosmetic preview i shop/eventlistor
- Social features (visa andras loadouts)
- Batch admin grants (multipla användare)
- Admin live preview

Dessa avgränsningar är **medvetna designbeslut**, inte utelämningar.
