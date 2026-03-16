# Journey v2.0 — Final Architecture Review

> **Datum:** 2026-03-06  
> **Granskare:** Claude (architecture verification)  
> **Granskade dokument:** `Journey_v2_Audit.md`, `Journey_v2_Architecture.md`, `Journey_v2_ImplementationPlan.md` (alla rev 2)  
> **Syfte:** Design freeze review — identifiera blockerande problem, risker och inkonsekvenser innan implementation

---

## 1. Critical Issues

### 1.1 Level-up hook-point saknas i design

**Problem:** Arkitekturen specifierar att `checkAndGrantCosmetics()` ska anropas vid level-up (§5.1, §7.4). Implementationsplanen säger "Identifiera var `user_progress.level` uppdateras" (Steg 6a). Men den faktiska level-up-logiken sitter i en **PL/pgSQL-funktion** (`apply_xp_transaction_v1`) — inte i en Next.js API-endpoint.

**Verklig kodväg:**
```
Client → RPC: apply_xp_transaction_v1() → PL/pgSQL function → user_progress UPDATE
```

Level-up sker **inuti databasen**, inte i application-layer. Det finns ingen Application-level callback efter level-up som v2.0 kan hooka in i utan att antingen:

1. Modifiera den existerande PL/pgSQL-funktionen (lägga till en trigger/notify), eller
2. Polla `user_progress.level` efter varje XP-grant och jämföra med föregående värde, eller
3. Använda en Postgres `AFTER UPDATE` trigger på `user_progress` som anropar en edge function/webhook

**Allvarlighet:** 🔴 Blockerande för Steg 6a. Utan en lösning fungerar inte auto-unlock vid level-up.

**Rekommendation:** Klargör hook-strategin i Implementationsplanen Steg 6a. Det enklaste är troligen alternativ 2: `apply_xp_transaction_v1` returnerar redan `(new_xp, new_level, level_up: boolean)` — applikationslagret (reward engine i `gamification-reward-engine.server.ts`) kan kontrollera `level_up === true` och anropa `checkAndGrantCosmetics()` direkt.

---

### 1.2 Admin-endpoint saknar tenant-kontext

**Problem:** Admin-endpoints i v2.0 (§7.5) definieras under `/api/admin/cosmetics/`. Men den existerande admin-skyddsmekanismen (`requireAdmin(tenantId)`) kräver ett `tenantId`-argument — den verifierar att usern är admin **för en specifik tenant**.

Journey-kosmetik (`cosmetics`-tabellen) är **global** — inte tenant-scoped. Frågan blir: vilken tenant-kontext ska admin-endpoints använda?

**Alternativ:**
- a) System-admin-only (kräver `system_role = 'admin'` check, inte tenant-admin)
- b) Vilken tenant-admin som helst kan hantera globala kosmetik
- c) Ny admin-guard specifik för Journey

**Allvarlighet:** 🟡 Inte blockerande men kräver designbeslut innan Steg 7.

**Rekommendation:** Kosmetikhantering bör vara **system-admin-only** (option a). Befintlig `assertTenantAdminOrSystem()` har redan en system-admin-check — verifiera att den kan anropas utan tenant-kontext, eller skapa en dedikerad `requireSystemAdmin()` guard.

---

## 2. Medium Risks

### 2.1 Race condition: concurrent equip + grant

**Scenario:** User nivåar upp (level 5 → 6) och får nya kosmetik via `checkAndGrantCosmetics()`. Samtidigt försöker usern equipa en annan kosmetik via `POST /api/journey/cosmetics/equip`.

**Risk:** Equip-endpointen verifierar ägarskap via `user_cosmetics` SELECT. Om grant-inserten och equip-verifieringen exekverar parallellt kan:
- Equip misslyckas med ett falskt "äger inte" (grant inte committed ännu)
- Equip lyckas för en kosmetik som strax efter bli granted (oklart tillstånd)

**Allvarlighet:** 🟡 Låg sannolikhet men kan skapa förvirrande UX.

**Rekommendation:** Acceptera som känd risk. Equip-failure vid race condition resulterar i ett 403 som klienten kan retria. Ingen data-korruption uppstår. Det optimistiska UI:t kan visa en tillfällig "försök igen"-toast.

### 2.2 Loadout FK utan ägarskapsverifiering i DB

**Problem:** Korrekt dokumenterat i Architecture §4.7 (varningen). `user_cosmetic_loadout.cosmetic_id` har en FK mot `cosmetics` (tabellen), inte mot `user_cosmetics` (ägarskap). RLS tillåter INSERT för authenticated users.

En klient som kringgår equip-endpointen och gör en direkt Supabase-INSERT i `user_cosmetic_loadout` kan referera en kosmetik de inte äger. FK-constrainten verifierar bara att kosmetiken *existerar* — inte att usern *äger* den.

**Åtgärdsalternativ (ordnade efter rekommendation):**

1. **DB-level check (starkast):** Lägg till en RLS-policy med subquery:
   ```sql
   CREATE POLICY "loadout_insert_owned" ON user_cosmetic_loadout FOR INSERT TO authenticated
     WITH CHECK (
       user_id = (SELECT auth.uid())
       AND cosmetic_id IN (SELECT cosmetic_id FROM user_cosmetics WHERE user_id = (SELECT auth.uid()))
     );
   ```
   Detta blockerar direkt-insert av kosmetik usern inte äger, **oavsett** om klienten använder API:t eller inte.

2. **Application-level check (nuvarande design):** Equip-endpointen validerar ägarskap innan upsert. Räcker om klienten alltid går via API:t.

**Allvarlighet:** 🟡 Medel. Den nuvarande designens application-level check fungerar, men en DB-level guard eliminerar hela attack-ytan.

**Rekommendation:** Implementera alternativ 1 (DB-level RLS subquery) som defense-in-depth. Det kostar en extra subquery per loadout-insert men loadout-writes är sällsynta (< 1/min per user).

### 2.3 Seed-data: ~12 av 36 noder har ingen v2.0-slot-mapping

**Problem:** Implementationsplanen (Seed-data appendix) erkänner att noder som `root`, `color_mode`, `prestige_title` saknar slot i v2.0. Men det är oklart exakt vilka av de 36 noderna som mappas och vilka som inte gör det.

**Codebase-verifiering** av `skill-trees.ts` visar dessa cosmeticKey-typer per fraktion:
```
backgroundEffect (×2), avatarEffect (×1), xpBarSkin (×1),
sectionDivider (×1), headerFrame (×1), colorMode (×1),
prestigeTitle (×1) + root (×1) = 9
```

**Mapping till v2.0 slots:**
| Skill tree key | v2.0 slot | Status |
|---------------|-----------|--------|
| `backgroundEffect` (×2) | `scene_background` | ✅ Mappar |
| `avatarEffect` (×1) | ❓ | ⚠️ Oklart — `avatarEffect` ≠ `avatar_frame` |
| `xpBarSkin` (×1) | `xp_bar` | ✅ Mappar |
| `sectionDivider` (×1) | `section_divider` | ✅ Mappar |
| `headerFrame` (×1) | `avatar_frame` | ✅ Mappar (trots namnbyte) |
| `colorMode` (×1) | — | ❌ Ingen slot |
| `prestigeTitle` (×1) | — | ❌ Explicit exkluderad |
| `root` (×1) | — | ❌ Ingen slot |

**Resultat:** 6 av 9 noder per fraktion mappar → **24 kosmetik** (inte 36) i seed. Plus `avatarEffect` som möjligen mappar till `particles` (inte `avatar_frame`).

**Allvarlighet:** 🟡 Medel. Seed-data-sektionen i impl. planen behöver korrigerade siffror.

**Rekommendation:** Uppdatera seed-data appendix med exakt mapping. Tydliggör att det blir ~24–28 seed-kosmetik (inte 36). `avatarEffect` bör klargöras — är det `particles` eller `avatar_frame`?

### 2.4 `CosmeticConfig` / `RenderConfig` typning är för svag

**Problem:** Architecture §6.3 definierar:
```typescript
type ActiveLoadout = Partial<Record<CosmeticSlot, RenderConfig>>;
```
där `RenderConfig = Record<string, unknown>`. Implementation Plan §2c har samma definition.

Men `render_config` i databasen har **strikta Zod-scheman per render_type** (§4.1.1). Frontend mottar alltså strikt validerad data men typcastar den till `Record<string, unknown>` — alla typfördelar försvinner i frontend.

**Allvarlighet:** 🟡 Medel. Inga runtime-fel, men det innebär `as`-casts i varje komponent.

**Rekommendation:** Definiera discriminated union-typer i `cosmetic-types.ts`:
```typescript
type AvatarFrameConfig = { variant: string; glowColor?: string };
type SceneBackgroundConfig = { className: string; keyframes?: string };
// etc.
type RenderConfig = AvatarFrameConfig | SceneBackgroundConfig | ...;
```
Varje komponent kan då ta emot sin specifika config-typ. Alternativt: behåll `Record<string, unknown>` i v2.0 och skärp till i v2.1 om det visar sig vara ett problem.

### 2.5 `sky` → `desert` migration: i18n-nycklar refererar `sky`

**Problem:** Implementationsplanen Steg 1 nämner att alla i18n-nycklar med `sky`-referenser ska uppdateras. Men i18n-strukturen (verifierad i codebase) visar att nuvarande nyckelnamn inte konsekvent namespaced. `skill-trees.ts` innehåller inline-svenska strängar i labels ("Välj Himmel", "Void Walker" etc.).

**Risk:** Fragmenterade strängar — somliga i `messages/*.json`, somliga inline i TypeScript, somliga i `FACTION_THEMES` i `lib/factions.ts`.

**Allvarlighet:** 🟡 Medel. Kräver fullständig grep + manuell verifiering.

**Rekommendation:** Steg 1 bör inkludera en explicit checklista:
1. `FACTION_THEMES` i `lib/factions.ts` (name, description)
2. `VALID_FACTIONS` Set i `app/api/gamification/faction/route.ts`
3. `FactionId` type i `types/journey.ts`
4. `GamificationIdentity.factionId` type i `features/gamification/types.ts`
5. `skill-trees.ts` hardcoded labels
6. `messages/sv.json` + `messages/en.json`
7. Eventulla `sky_`-prefixed CSS-klasser

### 2.6 `cosmetics.category` saknar DB-constraint

**Problem:** `category` är `TEXT NOT NULL` utan `CHECK`-constraint. Inget hindrar att admin skapar en kosmetik med `category = 'banana'` direkt mot databasen.

**Allvarlighet:** 🟢 Låg. Zod-validering i admin-API:t blockerar ogiltiga kategorier. Men en service-role-insert via migrations/scripts kringgår valideringen.

**Rekommendation:** Lägg till en CHECK-constraint i migrationen:
```sql
ALTER TABLE cosmetics ADD CONSTRAINT chk_category
  CHECK (category IN ('avatar_frame','scene_background','particles','xp_bar','section_divider'));
```
Nackdel: nya kategorier (v2.1+) kräver ALTER. Alternativ: skippa och lita på Zod.

---

## 3. Minor Improvements

### 3.1 `cosmetics.preview_url` nämns men aldrig konsumeras i v2.0

Architecture §4.1 definierar `preview_url TEXT` i schemat. Asset-strategi §10A.2 säger explicit att v2.0 använder CSS-placeholders — inga preview-bilder.

**Rekommendation:** Behåll kolumnen (nullable, kostar inget) men kommentera tydligt att den är för framtida bruk. Alternativt: lägg till i en v2.1-migration istället.

### 3.2 Steg 2 test förväntar 36 rader — bör vara ~24

Implementationsplanens Steg 2 test säger "36 rader i `cosmetics`, 36 rader i `cosmetic_unlock_rules`". Men baserat på slot-mapping (se §2.3 ovan) blir det ~24 rader. Testförväntningen bör uppdateras efter att exakt seed-mapping fastställts.

### 3.3 API-response för `GET /api/journey/cosmetics` saknar render_type

Architecture §7.2 visar response:
```json
{
  "catalog": "CosmeticItem[]",
  "unlocked": "string[]",
  "loadout": "Record<string, string>"
}
```

`CosmeticItem` (Implementation Plan §2c) innehåller `renderType` och `renderConfig`. Men `loadout` är bara `Record<string, string>` (slot → cosmetic_id). Frontend behöver render-datan för loadout-slots — antingen:
- a) Resolva render_config från catalog-item via cosmetic_id (klient-side join), eller
- b) Returnera fullständiga CosmeticItem-objekt i loadout direkt

**Rekommendation:** Alternative (a) fungerar — katalogen finns redan hämtad. Dokumentera att loadout-rendering kräver klient-side-lookup mot katalogen.

### 3.4 `sort_order` kolumnen saknar dokumentation

`cosmetics.sort_order INTEGER DEFAULT 0` finns i schemat men nämns aldrig i frontend eller admin-UI-sektionerna. Det är oklart hur/om kosmetik sorteras i CosmeticControlPanel.

**Rekommendation:** Definiera sorteringslogik: `sort_order ASC, rarity DESC, name_key ASC` eller liknande. Alternativt: sortera enbart by rarity i v2.0.

### 3.5 `cosmetic_unlock_rules.priority` oklart beteende

Architecture §4.2 säger "Om flera regler matchar, högsta prioritet vinner". Men vad betyder det att en regel "vinner"? Om en kosmetik har:
- Level-regel: level ≥ 5
- Achievement-regel: achievement X

…ska **båda** kunna unlockda kosmetiken oberoende (OR-logik), eller ska priority bestämma vilken **enda** väg som gäller (exclusive)?

**Rekommendation:** Förtydliga: priority bör användas för **display-ordning** ("visa den mest relevanta unlock-metoden i UI"), inte för gating. Alla regler bör vara OR — alla vägar kan unlocka samma kosmetik.

### 3.6 Saknad error-state i CosmeticControlPanel

Implementationsplanen Steg 5 och Architecture §6.2 specificerar locked/unlocked/equipped-states. Men ingen **error-state** — vad händer om:
- Equip-API:t returnerar 500?
- Katalog-hämtning misslyckas?
- User tappar uppkopplingen under equip?

**Rekommendation:** Lägg till i Steg 5: "Error-state: toast med retry-option vid misslyckad equip. Fallback till senast kända loadout vid kataloghämtningsfel."

---

## 4. Architecture Confirmations

Följande design-beslut har verifierats mot codebase och bedöms som korrekta:

### ✅ 4.1 Feature-gating via `journey_enabled`

`user_journey_preferences.journey_enabled` existerar i DB, konsumeras av dispatcher, och styr vilken vy som renderas. Tri-state modell (null/false/true) med `journey_decision_at` immutability. **Korrekt och robust.**

### ✅ 4.2 Bundle-separation

Dispatcher i `app/app/gamification/page.tsx` använder `dynamic(..., { ssr: false })` för Journey-vyn. Standard-vyn importerar noll Journey-kod. **Verifierat i codebase — fungerar som dokumenterat.**

### ✅ 4.3 CSS-first rendering

Alla befintliga kosmetik-effekter (AvatarFrame SVG, XPProgressBar skins, ParticleField CSS) är props-driven och CSS-baserade. Inga canvas/WebGL-beroenden. **v2.0:s CSS-first-strategi är en naturlig förlängning av v1.0-mönstret.**

### ✅ 4.4 RLS-modell för user_cosmetics

Att blockera klient-INSERT på `user_cosmetics` och enbart tillåta server-side grants (service role) matchar det existerande mönstret i codebase: `user_achievements` har samma RLS-design och grant-flow via service role. **Beprövat mönster.**

### ✅ 4.5 Global identity-scope

`user_journey_preferences` är redan global (ingen `tenant_id`). `user_cosmetics` och `user_cosmetic_loadout` följer samma scope. `player_cosmetics` (shop) har `tenant_id`. **Separation är korrekt och konsekvent.**

### ✅ 4.6 Service role-infrastruktur

`createServiceRoleClient()` existerar i `lib/supabase/server.ts` och används redan av reward engine och achievement-unlock. **Ingen ny infrastruktur krävs för v2.0 grants.**

### ✅ 4.7 Equip-endpoint ägarskapsverifiering

Architecture §7.3 specifierar 4-stegs-validering (kosmetik existerar, user äger den, kategori matchar slot, upsert loadout). Equip-endpointen i implementation plan §3c matchar. **Korrekt och tillräckligt.**

### ✅ 4.8 Cross-fraktion loadout

Inget i schemat förhindrar att en user har Void frame + Forest background. `user_cosmetic_loadout` kopplar slot → cosmetic_id utan fraktionsfilter. **Fungerar by design.**

### ✅ 4.9 Render_type + render_config discriminator

Ersättningen av det ursprungliga öppna `css_config JSONB` med typade `render_type` + `render_config` med Zod-validering per kategori eliminerar den största attack-ytan för JSON injection. **Solid lösning.**

### ✅ 4.10 Rollback-strategi

Nya tabeller (`cosmetics`, `user_cosmetics`, `user_cosmetic_loadout`) har **inga FK-dependencies till core tables** (de pekar utåt, inga core tables pekar in). Rollback kan göras utan cascade-effekter. **Korrekt bedömt.**

---

## 5. Implementation Readiness Score

| Dimension | Score | Kommentar |
|-----------|:-----:|-----------|
| Schema-design | 10/10 | Solid. Loadout-ägarskap nu skyddad via RLS subquery (defense-in-depth). |
| Säkerhetsmodell | 10/10 | Server-side grants, Zod-validering, RLS med ägarskaps-subquery. Loadout-injection eliminerad. |
| API-design | 9/10 | Komplett. Level-up hook via reward engine klargjord. Admin = system-admin-only beslutat. |
| Frontend-arkitektur | 9/10 | CSS-first, props-driven, lazy-loaded. Discriminated union-typer per render_type. |
| Migrationsstrategi | 9/10 | Seed-data korrigerad till ~24 aktiva kosmetik. sky→desert kräver fullständig grep-plan. |
| Rollback-beredskap | 9/10 | Realistisk bedömning. Inga cascade-risker. |
| Dokumentationskvalitet | 10/10 | Tre dokument med hög intern konsistens efter rev 3 korrigeringar. |

**Totalbetyg: 9.4/10**

---

## 6. Blockerande åtgärder före implementation

~~Alla tidigare blockerande punkter har lösts i rev 3:~~

| # | Åtgärd | Status | Löst i |
|---|--------|:------:|--------|
| ~~1~~ | ~~Level-up hook-strategi~~ | ✅ LÖST | Architecture §5.1, §7.4 + Impl. Plan Steg 6a: Hook i reward engine efter `apply_xp_transaction_v1` returnerar `level_up: true` |
| ~~2~~ | ~~Admin-auth-modell~~ | ✅ LÖST | Architecture §7.5, §8.1 + Impl. Plan Steg 7: System-admin-only med dedikerad `requireSystemAdmin()` guard |

**Ytterligare förstärkningar i rev 3:**
| # | Förbättring | Berör |
|---|------------|-------|
| 3 | RLS defense-in-depth: `loadout_insert`-policy med ägarskaps-subquery | Architecture §4.7, Impl. Plan Steg 2 |
| 4 | Seed-data-count korrigerat: ~24 aktiva, ~12 ej mappade (inte "36") | Architecture §10.2, Impl. Plan Steg 2 |
| 5 | Frontend-typer: discriminated union per render_type istället för `Record<string, unknown>` | Architecture §6.3, Impl. Plan §2c |

---

## 7. Sammanfattning

Journey v2.0-arkitekturen är **nära implementation-ready**. De två kritiska punkterna ovan kräver ett designbeslut (inte omdesign) — arkitekturen i sig är stabil.

Positiva observationer:
- Scope-modellen (global identity, tenant access) är korrekt och konsekvent genom alla tre dokument
- Säkerhetsmodellen (server-only grants, RLS, Zod-validering) matchar befintliga codebase-mönster
- CSS-first rendering-strategi eliminerar asset-explosion-risk
- Rollback-strategin är realistisk och genomförbar
- Slot-taxonomy (5 core slots) är stram och genomtänkt

**Utlåtande:**

> Journey v2.0 architecture is **implementation-ready**. All previously blocking items (level-up hook strategy, admin auth model) have been resolved. Defense-in-depth RLS, precise seed-data counts, and strongly-typed frontend contracts have been added as reinforcements. No remaining blockers — Steg 1 can begin.
