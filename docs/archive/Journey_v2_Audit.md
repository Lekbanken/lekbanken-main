# Journey v2.0 — Audit

## Metadata

- Owner: -
- Status: archived
- Date: 2026-03-06
- Last updated: 2026-03-21
- Last validated: -

> Archived Journey v2 audit snapshot from a superseded design cycle. Use only as historical context for earlier Journey planning.

**Status vid arkivering:** Draft — revision 2 after GPT review  
**Beroende av:** Journey v1.0 implementation, `../journey/journey-activation-implementation-plan.md`

---

## 1. Sammanfattning

Journey v1.0 är deployad och funktionell. Feature-gating, onboarding-modal, profil-toggle och bundle-separation fungerar korrekt. Systemet är rent kosmetiskt och påverkar inte gamification-mekanik.

Denna audit identifierar **designsvagheter, arkitekturrisker och UX-problem** som bör åtgärdas i Journey v2.0.

---

## 2. Vad som fungerar väl (bevara)

| Aspekt | Status | Kommentar |
|--------|--------|-----------|
| Feature-gating (opt-in/opt-out) | ✅ Solid | Tri-state modell (`null`/`false`/`true`) med immutable `journey_decision_at` |
| Bundle-separation | ✅ Solid | Standard-vy ~5 KB, Journey-vy ~38 KB lazy-loaded. Noll Journey-import i standard-chunken |
| Dispatcher-mönster | ✅ Solid | Ren conditional rendering med `dynamic()` import |
| API-isolering | ✅ Solid | `fetchGamificationSnapshot()` anropar enbart `/api/gamification`. Journey-API:er triggas enbart i Journey-vy |
| Faction-tema via CSS-variabler | ✅ Solid | Inga runtime-stilberäkningar. Tema-byte = CSS-variablbyte |
| RLS-policies | ✅ Solid | Users can only read/write own journey preferences. Write-access to ownership tables restricted to server-side |
| Profil-toggle | ✅ Solid | Optimistic update med rollback. Toggle är UI-val, inte dataval |
| Onboarding-modal | ✅ Solid | Lättviktig, noll Journey-imports, statiska preview-bilder |

**Dessa mönster bör bevaras oförändrade i v2.0.**

---

## 3. Designsvagheter

### 3.1 Fraktionssystemet

#### Problem: "Neutral" fraktion är meningslös

`DEFAULT_THEME` i `lib/factions.ts` definierar en "Neutral"-fraktion med Lekbanken-primärfärg (`#8661ff`). Den visas som standardtema innan användaren valt fraktion.

**Problemet:** Neutral erbjuder ingen identitet, ingen progression, inga unika kosmetik. Det är inte en fraktion — det är ett fallback-tillstånd. Ändå behandlas det likvärdigt i UI:t (visas i FactionSelector som ett alternativ).

**Rekommendation:** Neutral bör vara ett **övergångstillstånd** ("ingen fraktion vald ännu"), inte ett valbart alternativ. Ta bort Neutral från `FactionSelector`. Behåll `DEFAULT_THEME` enbart som teknisk fallback.

#### Problem: Sky-fraktionens färgval

Sky använder amber/guld (`#f59e0b`) som accent. Det fungerar tekniskt men:
- Det associeras visuellt med "öken" eller "sand" snarare än "himmel"
- Det bryter förväntningen att en himmelsfraktion ska ha ljus/blå ton
- Det skapar förvirring om vi lägger till en Desert-fraktion

**Rekommendation:** Omvärdera fraktionspaletten. Om Sky behålls — byt till ljusblå/cyan-ton. Alternativt: ersätt Sky med Desert (som passar amber bättre) och ge en ny fjärde fraktion en lämplig identitet.

#### Problem: Namninkonsistens

- `FactionSelector.tsx` visar fraktionsnamn på engelska ("Forest", "Sea", "Sky", "Void")
- Skill tree-labels är på svenska ("Välj Skog", "Välj Hav", "Välj Himmel", "Välj Void")
- `FactionTheme.description` är på svenska
- `FactionTheme.name` är på engelska

**Rekommendation:** Samtliga användarsynliga fraktionsnamn bör gå genom i18n. Fraktions-ID:n (`forest`, `sea`, etc.) förblir engelska interna nycklar.

---

### 3.2 Progressionssystemet

#### Problem: Kosmetik delade mellan fraktioner

Alla fraktioner har identisk trädstruktur med 9 noder (root → bg → avatar → xp → bg2 → divider → header → color → prestige). Upplåsning baseras enbart på **global nivå**, inte på fraktionsspecifik aktivitet.

**Konsekvenser:**
- Byte av fraktion ger omedelbar tillgång till alla redan upplåsta nivå-kosmetik för den nya fraktionen
- Ingen incitament att "investera" i en fraktion
- Ingen samlaraspekt — det finns inget att samla eftersom allt hänger på nivå

**Rekommendation:** Introduktera **fraktionstaggad kosmetik med global progression**. Kosmetik bör vara märkta med fraktionstillhörighet och samlas via global level, achievements, shop och events — men varje kosmetik tillhör en specifik fraktion. Detta ger samlaraspekt och fraktionsidentitet utan att kräva fraktionsspecifik XP.

> **Notering:** Verklig fraktionsspecifik XP (faction affinity/reputation) är ett möjligt framtida tillägg (v3.0), men bedöms som för komplext för v2.0 då XP-systemet är tenant-scoped via `user_progress`.

#### Problem: Platt progressionskurva

9 noder per fraktion med max level 10 ger en kort progressionsresa. Alla kosmetik upplåsta vid level 10.

**Rekommendation:** Utöka antalet kosmetik per fraktion och introducera fler upplåsningsmekanismer (achievements, shop-köp, events, admin-grant).

#### Problem: Prestige-titel saknar system

Nod `title` i skill tree (level 10) definierar titlar som "Void Walker", "Sea Walker", "Forest Walker", "Sky Walker". Men det finns inget prestige-system bakom det — titeln är bara en label i skill tree-popovern.

**Beslut (rev 2):** Titlar tas bort ur Journey v2.0 core. Anledning:
- Det minst mogna konceptet i Journey — ingen stabil produktidé
- Ökar modellkomplexiteten utan levererad nytta
- Att blanda identity-metadata (titlar) med scene-kosmetik (frames, bakgrunder) skapar en otydlig taxonomy

Titlar kan återintroduceras som ett separat **profile identity system** härledd från achievements/milestones i en framtida iteration, men det bör inte vara en del av loadout-modellen.

---

### 3.3 Skill Tree UX

#### Problem: Skill tree är en passive upplåsningsvy

Nuvarande skill tree visar status (locked/available/unlocked) men erbjuder ingen interaktion förutom att se vad som finns. Användaren kan inte välja vilka kosmetik som är aktiva — allt som är upplåst appliceras automatiskt.

**Rekommendation:** Skill tree bör bli en **design control panel** där användaren:
1. Ser vilka kosmetik som är upplåsta
2. Togglar enskilda kosmetik on/off
3. Skapar en personlig kosmetisk mix

#### Problem: Kosmetik-equip finns i API men inte i UI

`POST /api/cosmetics/loadout` stödjer equip/unequip av kosmetik. Men det finns **ingen UI** för detta i GamificationPage. Skill tree visar tillgänglighet men erbjuder inte equip-funktionalitet.

**Rekommendation:** Integrera equip-mekanik i skill tree eller i en dedikerad "loadout"-vy.

---

### 3.4 Kosmetiska element

#### Problem: Begränsad kosmetikvariation

Nuvarande kosmetik-kategorier:
| Kategori | Implementationsstatus |
|----------|----------------------|
| `bg` (background effects) | ✅ Definierad, 2 per fraktion |
| `avatar` (avatar effects) | ✅ Definierad, 1 per fraktion |
| `xp` (XP bar skins) | ✅ Definierad, 1 per fraktion |
| `divider` (section dividers) | ⚠️ Definierad, inte synligt applicerad |
| `header` (avatar frame) | ✅ Definierad, `AvatarFrame.tsx` renderar 4 varianter |
| `color` (color mode) | ⚠️ Definierad, ingen implementerad rendering |
| `prestige` (titel) | ⚠️ Definierad, ingen display-implementation |

**Rekommendation:** Implementera rendering för de kategorier som har tydlig produktnytta och försvar. Designa schemat så att framtida kategorier kan läggas till utan breaking changes, men inkludera enbart **säkra slots** i v2.0 core (scene-kosmetik som avatar_frame, scene_background, particles, xp_bar, section_divider). Banner, animation och titel hanteras utanför v2.0.

#### Problem: `AvatarFrame` visar generisk ikon

Profil-avataren visar en Heroicons-placeholder istället för användarens riktiga profilbild. Frame-komponenterna (`constellation`, `coral`, `vines`, `aurora`) renderar SVG-dekorationer kring en generisk ikon.

**Rekommendation:** Integrera verklig avatar (från Supabase Auth eller profil-upload) i frame-renderings.

---

### 3.5 Admin-kontroll

#### Problem: Ingen admin-styrning av kosmetik

Kosmetik-upplåsning styrs uteslutande av `requiredLevel` i hårdkodad TypeScript-data (`skill-trees.ts`). Det finns inget admin-gränssnitt för att:
- Lägga till nya kosmetik
- Ändra upplåsningsvillkor
- Granta kosmetik till specifika användare
- Skapa events med kosmetiska belöningar
- Definiera shop-items som kosmetik

**Rekommendation:** Flytta kosmetik-definitioner till databasen. Skapa ett admin-UI för att hantera kosmetik, upplåsningsvillkor och distribueringsregler.

**Beslut (rev 3):** Admin-kosmetikhantering kräver **system-admin** (inte tenant-admin). Kosmetikkatalogen är global — den påverkar alla användare oavsett tenant. Dedikerad `requireSystemAdmin()` guard skapas som verifierar `system_role = 'admin'` utan tenant-kontext.

---

### 3.6 Databasschema

#### Problem: Kosmetik-data lever i kod, inte i DB

Skill tree-definitioner med `cosmeticKey` och `requiredLevel` finns enbart i `features/gamification/data/skill-trees.ts`. Det finns inget `cosmetics`-tabell i databasen (förutom `player_cosmetics` som avser shop-köpta items och refererar till `shop_items`).

**Konsekvens:** Alla kosmetik-ändringar kräver koddeploy. Admin kan inte hantera kosmetik utan utvecklarstöd.

#### Problem: `shop_items.category = 'cosmetic'` dubblerar purpose

`player_cosmetics` refererar till `shop_items` — vilket innebär att kosmetik enbart kan finnas om de först skapas som shop-items. Journey-kosmetik (level-gated, fraktionsspecifika) behöver ett oberoende katalog-system.

**Rekommendation:** Skapa en dedikerad `cosmetics`-tabell med stöd för multiple unlock sources (level, achievement, shop, event, admin grant).

#### Beslut: Journey-identitet är global per user

Faction-val lagras en gång per user (inte per tenant). Marketplace-kosmetik i `player_cosmetics` lagras per tenant. Journey v2.0:s nya kosmetiktabeller (`user_cosmetics`, `user_cosmetic_loadout`) är **globala per user**, precis som `user_journey_preferences`.

**Scoping-modell (rev 2):**
- Journey identity, ownership och loadout är **global per user** — personlig identitet som följer användaren oavsett tenant
- Journey **feature-access** sker i tenant-kontext — användaren interagerar med Journey via tenant-appen
- Cosmetic **catalog** (`cosmetics`-tabellen) är global — samma kosmetik finns tillgänglig oavsett tenant
- Framtida extension: tenant-specifik kosmetik-tillgänglighet kan läggas som ett lager ovanpå, men är utanför v2.0 scope

Detta mönster följer `user_journey_preferences` som redan etablerats i v1.0.

---

## 4. UX-problem

### 4.1 Titlar utan sammanhang

Profilsektionen visar titlar som "Vägvisare" och "Tomrummets Vandrare". Dessa titlar:
- Saknar koppling till synlig progression
- Förklaras inte i UI
- Skapar förvirring om vad de representerar

**Beslut (rev 2):** Titlar tas ur Journey v2.0 scope. De bör inte vara en kosmetik-slot i loadout-modellen. Om titlar återintroduceras i framtiden bör de härledas från achievements/milestones som ett separat profile identity system (se §3.2 ovan).

### 4.2 Subroutes bär alltid Journey-design

Per v1.0 iteration 1 scope: `/app/gamification/achievements`, `/coins`, `/events` visar alltid Journey-stylad UI oavsett `journey_enabled`-status.

**Bedömning:** Medvetet avgränsningsbeslut. Bör åtgärdas i v2.0 — subroutes ska respektera use toggle.

### 4.3 Saknad "loadout"-vy

Användare kan inte se eller hantera sina aktiva kosmetik. Det finns ingen översikt av "vad jag har på mig" eller "vad jag har samlat".

**Rekommendation:** Introdukera en loadout/wardrobe-vy där användaren ser sin aktiva konfiguration och kan byta ut element.

---

## 5. Skalbarhetrisker

| Risk | Allvarlighet | Kommentar |
|------|:------------:|-----------|
| Hårdkodade kosmetik-definitioner | 🟡 Medel | Skalerar inte — varje ny kosmetik kräver koddeploy |
| 9 noder per fraktion, ingen expansion-path | 🟡 Medel | Progressionen tar slut vid nivå 10 |
| Ingen batch-loading av kosmetik-assets | 🟢 Låg | CSS-baserat idag, men om bilder/animationer läggs till behövs asset-pipeline |
| Bundle-storlek vid fler kosmetik-varianter | 🟡 Medel | Fler skin-varianter → större Journey-chunk om inte dynamiskt laddade |
| Ingen versionering av kosmetik-schema | 🟢 Låg | Hanteras via DB-migrationer men bör formaliseras |

---

## 6. Säkerhetsöversikt

| Aspekt | Status |
|--------|--------|
| RLS på `user_journey_preferences` | ✅ Users can only access own rows |
| RLS på `player_cosmetics` | ✅ Tenant-scoped, user-owned |
| API-autentisering | ✅ All endpoints verify `getUser()` |
| Input-validering | ✅ Zod schemas on all POST endpoints |
| Kosmetik-equip kräver ägande | ✅ Verified in loadout API |
| Tenant-isolation | ✅ `requireTenantMembership()` check |

**Inga säkerhetsrisker identifierade.** v2.0-förändringar bör följa samma mönster.

---

## 7. Teknisk skuld

| Item | Prioritet | Kommentar |
|------|-----------|-----------|
| `FactionSelector` visar 5 alternativ (inkl implicit neutral) | 🟡 | Bör visa exakt 4 fraktioner |
| `colorMode`-kosmetik definierad utan rendering | 🟡 | Dead code i skill-trees.ts |
| `prestige`-titel definierad utan display | 🟡 | Dead code i skill-trees.ts |
| `sectionDivider`-kosmetik definierad utan synlig applicering | 🟡 | SectionDivider.tsx renderar men kopplingen till kosmetik-loadout saknas |
| XP-bar har 3 skins i koden men ingen UI för att välja | 🟡 | `clean`, `shimmer`, `energy` finns men appliceras baserat på resolving från loadout |
| Animation-budget ~13/15 keyframes använda | 🟢 | Nära tak — nya animationer bör ersätta befintliga |
| Ingen test-coverage för skill-tree logik | 🟡 | `getSkillTree()` bör ha unit tests |

---

## 8. Beslut att dokumentera för v2.0

Följande v1.0-beslut bör bevaras eller explicit omprövs:

| Beslut | v1.0 Status | v2.0 Rekommendation |
|--------|-------------|---------------------|
| Journey är 100% kosmetiskt | ✅ Bevara | Bevara — aldrig påverka gameplay |
| Feature-gating via `journey_enabled` | ✅ Bevara | Bevara mönstret, utöka till subroutes |
| Faction-val är globalt (inte per tenant) | ✅ Bevara | Bevara — personlig identitet |
| Kosmetik-definitioner i TypeScript | ⚠️ Ompröva | Flytta till databas |
| 4 fraktioner + neutral fallback | ⚠️ Ompröva | 4 fraktioner, ta bort neutral som val |
| Single skill tree per fraktion | ⚠️ Ompröva | Fraktionstaggad kosmetik med global progression |
| Allt upplåst via level enbart | ⚠️ Ompröva | Multipla unlock-mekanismer |
| Subroutes ignorerar Journey-status | ⚠️ Ompröva | Gating i iteration 2 |
| Journey identity scope | ✅ Bevara | Global per user, surfaced i tenant-kontext |

---

## 9. Slutsats

Journey v1.0 har en **solid teknisk grund** — feature-gating, bundle-separation, API-isolering och CSS-baserat tema-system. Det som behöver adresseras i v2.0 är:

1. **Fraktionsidentitet** — starkare visuell identitet per fraktion med fraktionstaggad kosmetik
2. **Kosmetisk progression** — global progression + fraktionstaggad kosmetik + multipla unlock-mekanismer
3. **Skill tree → Design control panel** — från passiv vy till aktiv customization
4. **Kosmetik i databas** — från hårdkodad data till admin-styrbar katalog med typade render-configs
5. **Cross-fraktion loadout** — mix-and-match kosmetik från olika fraktioner
6. **Subroute-gating** — respektera journey_enabled på alla sidor
7. **Säker ownership-modell** — server-side grants, client-side loadout writes enbart för ägda kosmetik

Dessa förändringar kan implementeras iterativt utan att bryta v1.0-funktionalitet.
