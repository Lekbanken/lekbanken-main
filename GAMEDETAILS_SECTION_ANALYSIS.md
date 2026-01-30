# 🎯 GameDetails Sektionsanalys & Data Provenance

> **Datum:** 2026-01-30
> **Status:** Uppdaterad med ChatGPT-feedback
> **Syfte:** Analysera alla sektioner från original-sandboxen och bestämma:
> 1. Vilka ska behållas?
> 2. Var hämtas datan (Golden Reference)?
> 3. Hur mappas data från Game Builder → GameDetailData?

---

## 🏛️ Två separata "Golden Reference"-begrepp

> **Viktigt:** Vi behöver separera två olika "truths" för att undvika förvirring.

### 1. Source of Truth (SoT) = Supabase DB

**Vad:** Runtime + persistence data
**Ansvar:** Vad systemet faktiskt kör på
**Ägarskap:** Migrations, RLS, realtime

### 2. Canonical Authoring Model = Builder-kontraktet

**Vad:** Spelets innehållsstruktur (domain model)
**Ansvar:** Definierar "shape" för spelinnehåll
**Ägarskap:** `GameAuthoringData` typ (att skapa)

### Konsekvens

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CANONICAL AUTHORING MODEL                             │
│                       (GameAuthoringData)                                │
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ Game Builder │    │   CSV/JSON   │    │   Future     │               │
│  │    (UI)      │    │   Import     │    │   Sources    │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│         │                   │                   │                        │
│         └───────────────────┼───────────────────┘                        │
│                             ▼                                            │
│                  ┌──────────────────────┐                               │
│                  │  GameAuthoringData   │  ◀── Golden Reference         │
│                  │  (canonical shape)   │      för innehållets struktur │
│                  └──────────────────────┘                               │
│                             │                                            │
│                             ▼                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                    SOURCE OF TRUTH (SoT)                                 │
│                       (Supabase DB)                                      │
│                                                                          │
│                  ┌──────────────────────┐                               │
│                  │   DB Tables          │  ◀── Golden Reference         │
│                  │   (persistence)      │      för data i drift         │
│                  └──────────────────────┘                               │
│                             │                                            │
│                             ▼                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                    DISPLAY CONTRACTS                                     │
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ GameSummary  │    │GameDetailData│    │GameDetailData│               │
│  │ (cards)      │    │Preview (lib) │    │Full (admin)  │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│                             │                                            │
│                             ▼                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                    RUNTIME CONTRACTS                                     │
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ SessionData  │    │  RunStep     │    │ SessionRole  │               │
│  │              │    │ extends Step │    │ extends Role │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Pipeline-regel (One Pipeline to Rule Them All)

1. **CSV/JSON import** → mappar till `GameAuthoringData`
2. **Game Builder** → mappar till `GameAuthoringData`
3. **DB mappers** → `GameAuthoringData` ↔ DB tables
4. **UI mappers** → DB → `GameDetailData*` (display contracts)
5. **Play mappers** → DB → `Session*` (runtime contracts)

**Om Builder-kontraktet ändras:**
- [ ] Uppdatera `GameAuthoringData` typ
- [ ] Uppdatera DB migration (om behövs)
- [ ] Uppdatera CSV/JSON typer
- [ ] Uppdatera mappers
- [ ] Bumpa `game_content_schema_version`

### Sektion Inventory (från skärmdumpar)

| Sektion | Grupp | Finns i produktion? | Data i DB? | Game Builder stöd? | Status |
|---------|-------|---------------------|------------|-------------------|--------|
| **Titel och ingress** | INTRO | ✅ GameDetailHeader | ✅ games.name, translations | ✅ core.name | KLAR |
| **Taggar och highlights** | INTRO | ⚠️ Inline i page | ⚠️ tags saknas | ⚠️ Ej i builder | BEHÖVER ARBETE |
| **Omslagsblock** | INTRO | ✅ CoverBlock (sandbox) | ✅ game_media | ✅ cover | KLAR |
| **Om leken** | INNEHÅLL | ✅ GameDetailAbout | ✅ translations.description | ✅ core.description | KLAR |
| **Spelupplevelse** | INNEHÅLL | ❌ | ❌ highlights saknas | ❌ Ej i builder | PAUSA/DESIGNA |
| **Bildgalleri** | INNEHÅLL | ✅ GameDetailGallery | ✅ game_media | ⚠️ Delvis | KLAR |
| **Material** | INNEHÅLL | ✅ GameDetailMaterials | ✅ game_materials | ✅ materials.items | KLAR |
| **Förberedelser** | INNEHÅLL | ✅ GameDetailPreparation | ✅ game_materials.preparation | ✅ materials.preparation | KLAR |
| **Säkerhet** | INNEHÅLL | ✅ GameDetailSafety | ✅ game_materials.safety_notes | ✅ materials.safety_notes | KLAR |
| **Tillgänglighet** | INNEHÅLL | ❌ | ⚠️ accessibility_notes | ✅ core.accessibility_notes | BEHÖVER KOMPONENT |
| **Varianter** | INNEHÅLL | ❌ | ❌ Saknas i DB | ❌ Ej i builder | PAUSA |
| **Reflektion** | INNEHÅLL | ❌ | ❌ Saknas i DB | ❌ Ej i builder | PAUSA |
| **Fasplan** | FLÖDE | ✅ GameDetailPhases | ✅ game_phases | ✅ phases[] | KLAR |
| **Steg för steg** | FLÖDE | ✅ GameDetailSteps | ✅ game_steps | ✅ steps[] | KLAR |
| **Publik tavla** | FLÖDE | ❌ (sandbox mock) | ✅ game_board_config | ✅ boardConfig | BEHÖVER KOMPONENT |
| **Checkpoints** | FLÖDE | ❌ | ❌ Saknas i DB | ❌ Ej i builder | PAUSA |
| **Roller** | DELTAGARE | ✅ GameDetailRoles | ✅ game_roles | ✅ roles[] | KLAR |
| **Artefakter** | DELTAGARE | ✅ GameDetailArtifacts | ✅ game_artifacts | ✅ artifacts[] | KLAR |
| **Triggers** | DELTAGARE | ✅ GameDetailTriggers | ✅ game_triggers | ✅ triggers[] | KLAR |
| **Omröstningar/beslut** | DELTAGARE | ❌ (mock finns) | ❌ Saknas i DB | ❌ Ej i builder | FRAMTIDA |
| **Facilitatorverktyg** | DELTAGARE | ❌ | ✅ game_tools | ✅ gameTools[] | BEHÖVER KOMPONENT |
| **Deltagarvy (mock)** | DELTAGARE | ❌ | N/A (runtime) | N/A | PAUSA (Runtime) |
| **Host actions** | SIDEBAR | ⚠️ Mock i sandbox | ⚠️ Delvis | ⚠️ Delvis | BEHÖVER DESIGN |
| **CTA-knappar** | SIDEBAR | ✅ GameDetailActions | N/A | N/A | KLAR |
| **Snabbfakta** | SIDEBAR | ✅ GameDetailQuickFacts | ✅ games.* | ✅ core.* | KLAR |
| **Krav för spel** | SIDEBAR | ❌ | ⚠️ space_requirements | ✅ core.space_requirements | BEHÖVER KOMPONENT |
| **Nerladdningar** | SIDEBAR | ❌ | ❌ Saknas i DB | ❌ Ej i builder | FRAMTIDA |
| **Metadata** | SIDEBAR | ✅ MetadataSection (sandbox) | ✅ games.* | ✅ meta | KLAR |

---

## 🎨 Sandbox Completeness Strategy

### Princip: Disabled over Mocked

P2-sektioner (saknas i DB) ska **inte mockas** som om de vore implementerade. 
Istället visas de som **disabled** med tydlig förklaring:

```tsx
// ❌ FEL - Mocka bort saknad data
{game.tags && <TagsSection tags={game.tags} />}

// ✅ RÄTT - Visa som disabled
<DisabledSection 
  title="Taggar & highlights" 
  reason="Saknas i DB - kräver game_tags tabell"
  priority="P2"
/>
```

### Sandbox UI Implementation

```tsx
// Sandbox toggle panel ska visa:
// ✅ P0 (15): Aktivera/avaktivera fritt
// 🟡 P1 (4): Aktivera/avaktivera - data finns
// 🔒 P2 (8): Disabled toggle + tooltip "Saknas i DB"
// ⚪ P3 (1): Runtime only - grå + "Se Play-domänen"
```

### Fördelar med denna approach

1. **Ärlighet** - Sandbox visar verkligt systemtillstånd
2. **Roadmap synlighet** - Tydligt vad som fattas
3. **Ingen falsk trygghet** - Mockat innehåll maskerar gaps
4. **Enklare underhåll** - Ingen mock-data att hålla synkad

---

## 🗄️ DB Gap Verification (A/B/C Levels)

### Verifieringsnivåer

| Nivå | Definition | Åtgärd |
|------|------------|--------|
| **A** | DB-tabell finns + Kolumn finns + Mapper finns | ✅ Ready |
| **B** | DB-tabell finns + Kolumn finns + Mapper **SAKNAS** | 🟡 Add mapping |
| **C** | DB-tabell/kolumn **SAKNAS** | 🔴 Roadmap |

### Verifierad Sektionsstatus

| Sektion | DB Tabell | Kolumn | Mapper | Nivå | Prio |
|---------|-----------|--------|--------|------|------|
| Tillgänglighet | games | accessibility_notes | ❌ | **B** | P1 |
| Krav för spel | games | space_requirements | ❌ | **B** | P1 |
| Publik tavla | game_board_config | * | ❌ | **B** | P1 |
| Facilitatorverktyg | game_tools | * | ❌ | **B** | P1 |
| Taggar | ❌ game_tags | - | - | **C** | P2 |
| Spelupplevelse | ❌ highlights | - | - | **C** | P2 |
| Varianter | ❌ game_variants | - | - | **C** | P2 |
| Reflektion | ❌ reflection_prompts | - | - | **C** | P2 |
| Checkpoints | ❌ checkpoints | - | - | **C** | P2 |
| Omröstningar | ❌ game_decisions | - | - | **C** | P2 |
| Nerladdningar | ❌ game_downloads | - | - | **C** | P2 |
| Host actions | game_tools | partial | ❌ | **B/C** | P2 |

---

## 📋 Content Schema Versioning

### Rekommendation

Lägg till `game_content_schema_version` i `games`-tabellen:

```sql
ALTER TABLE games 
ADD COLUMN content_schema_version INTEGER DEFAULT 1;

-- Vid breaking changes till content-struktur:
-- 1. Bumpa version i DB
-- 2. Migrera existerande spel
-- 3. UI mappers hanterar alla versioner
```

### Version History (framtida)

| Version | Datum | Ändringar |
|---------|-------|-----------|
| 1 | 2024-01 | Initial release |
| 2 | TBD | + game_tags, highlights |
| 3 | TBD | + game_variants, reflections |

### Fördelar

1. **Backwards compatibility** - Gamla spel fungerar med nya UI
2. **Gradual migration** - Migrera spel i omgångar
3. **Debug/audit trail** - Vet vilken version ett spel har
4. **Contract tests** - Testa alla versioner

---

## 🧪 Contract & Snapshot Tests

### Rekommenderade tester

```typescript
// tests/contracts/game-authoring.test.ts

describe('GameAuthoringData Contract', () => {
  it('roundtrip: Builder → DB → Display', async () => {
    const builderState = createBuilderState();
    const dbGame = await saveGameToDb(builderState);
    const displayData = mapDbToGameDetailData(dbGame);
    
    // Verify no data loss
    expect(displayData.steps.length).toBe(builderState.steps.length);
    expect(displayData.phases.length).toBe(builderState.phases.length);
  });

  it('roundtrip: CSV → DB → CSV', async () => {
    const csvRow = parseCsvRow(testCsv);
    const dbGame = await importCsvToDb(csvRow);
    const exportedCsv = exportDbToCsv(dbGame);
    
    // Verify roundtrip integrity
    expect(exportedCsv).toMatchSnapshot();
  });
});

// Snapshot tests för schema stability
describe('Schema Snapshots', () => {
  it('GameDetailData shape is stable', () => {
    const sample = createFullGameDetailData();
    expect(Object.keys(sample)).toMatchSnapshot();
  });

  it('DB query shape is stable', async () => {
    const dbResult = await getGameByIdForHost('test-game');
    expect(Object.keys(dbResult)).toMatchSnapshot();
  });
});
```

### CI Integration

```yaml
# .github/workflows/contract-tests.yml
- name: Contract Tests
  run: pnpm test:contracts
  
- name: Update Snapshots (if needed)
  if: failure()
  run: pnpm test:contracts -u
```

---

## 📋 DB Tables vs GameDetailData Mapping

### Nuvarande DB-tabeller

| DB Tabell | Finns? | Mappas till GameDetailData? | Används i Builder? |
|-----------|--------|----------------------------|-------------------|
| `games` | ✅ | ✅ id, title, description, metadata | ✅ core.* |
| `game_translations` | ✅ | ✅ title, shortDescription, description | ✅ core.* |
| `game_media` | ✅ | ✅ coverUrl, gallery | ✅ cover |
| `game_steps` | ✅ | ✅ steps[] | ✅ steps[] |
| `game_materials` | ✅ | ✅ materials[], safety, preparation | ✅ materials |
| `game_phases` | ✅ | ✅ phases[] | ✅ phases[] |
| `game_roles` | ✅ | ✅ roles[] | ✅ roles[] |
| `game_artifacts` | ✅ | ✅ artifacts[] | ✅ artifacts[] |
| `game_artifact_variants` | ✅ | ✅ artifacts[].variants | ✅ artifacts[].variants |
| `game_triggers` | ✅ | ✅ triggers[] | ✅ triggers[] |
| `game_board_config` | ✅ | ❌ **EJ MAPPAT** | ✅ boardConfig |
| `game_tools` | ✅ | ❌ **EJ MAPPAT** | ✅ gameTools[] |

### Saknade mappningar (att lägga till)

| Fält | DB Källa | GameDetailData property | Komponent |
|------|----------|------------------------|-----------|
| `accessibility` | games.accessibility_notes | `accessibility?: string[]` | GameDetailAccessibility |
| `spaceRequirements` | games.space_requirements | `requirements?: string[]` | GameDetailRequirements |
| `leaderTips` | games.leader_tips | `leaderTips?: string` | GameDetailAbout (extended) |
| `boardConfig` | game_board_config | `boardConfig?: BoardConfig` | GameDetailBoard |
| `gameTools` | game_tools | `tools?: GameTool[]` | GameDetailTools |

---

## 🎯 Rekommendation: Prioriterad Implementation

### P0 - Klar (15 komponenter)

| Komponent | Status |
|-----------|--------|
| GameDetailHeader | ✅ |
| GameDetailBadges | ✅ |
| GameDetailAbout | ✅ |
| GameDetailSteps | ✅ |
| GameDetailMaterials | ✅ |
| GameDetailSafety | ✅ |
| GameDetailPreparation | ✅ |
| GameDetailPhases | ✅ |
| GameDetailGallery | ✅ |
| GameDetailRoles | ✅ |
| GameDetailArtifacts | ✅ |
| GameDetailTriggers | ✅ |
| GameDetailQuickFacts | ✅ |
| GameDetailActions | ✅ |
| GameDetailSidebar | ✅ |

### P1 - Nästa sprint (DB finns, Builder finns)

| Sektion | Komponent att skapa | Data källa | Uppskattning |
|---------|--------------------|-----------:|------------:|
| Tillgänglighet | GameDetailAccessibility | games.accessibility_notes | 1h |
| Krav för spel | GameDetailRequirements | games.space_requirements | 1h |
| Publik tavla | GameDetailBoard | game_board_config | 2h |
| Facilitatorverktyg | GameDetailTools | game_tools | 1h |

**Total: ~5 timmar**

### P2 - Framtida (kräver DB/Builder arbete)

| Sektion | Blocker | Åtgärd |
|---------|---------|--------|
| Taggar/highlights | Saknar tags tabell | Skapa game_tags tabell + Builder UI |
| Spelupplevelse | Saknar highlights i DB | Design + DB migration |
| Varianter | Saknar variant-system | Design fullständigt system |
| Reflektion | Saknar DB stöd | Design reflection_prompts tabell |
| Checkpoints | Saknar checkpoint-system | Design checkpoint_definitions tabell |
| Omröstningar | Saknar decisions i DB | Design game_decisions tabell |
| Nerladdningar | Saknar downloads-system | Design game_downloads tabell |
| Host actions | Delvis i game_tools | Utöka tool-systemet |

### P3 - Runtime-specifikt (utanför GameDetails scope)

| Sektion | Hanteras av |
|---------|------------|
| Deltagarvy (mock) | Play-domänen (ParticipantPlayView) |

---

## 🔧 CSV/JSON Sync-strategi

### Nuvarande stöd i CsvGameRow (types/csv-import.ts)

```typescript
// Redan stöds:
- game_key, name, short_description, play_mode
- description, status, locale
- energy_level, location_type, time_estimate_min, duration_max
- min_players, max_players, age_min, age_max, difficulty
- accessibility_notes, space_requirements, leader_tips
- steps[], phases[], roles[], artifacts[], triggers[]
- materials, safety_notes, preparation
- board_config (show_*, theme, layout)
```

### Sync-regler

1. **Builder → DB → CSV Export**: Alla builder-fält måste ha CSV-motsvarighet
2. **CSV Import → DB → Builder**: Alla CSV-fält måste vara editerbara i Builder
3. **Schema ändringar**:
   - Lägg till i DB migration
   - Lägg till i GameBuilderState
   - Lägg till i CsvGameRow
   - Lägg till i GameDetailData
   - Lägg till i mappers

---

## 📝 Nästa steg (Prioriterad)

### Fas 5: GameAuthoringData & P1 Komponenter

| # | Task | Uppskattning | Beskrivning |
|---|------|-------------|-------------|
| 1 | Skapa `GameAuthoringData` typ | 2h | Canonical type i lib/game-authoring/ |
| 2 | Uppdatera DB mappings för P1 | 1h | accessibility_notes, space_requirements |
| 3 | GameDetailAccessibility | 1h | Ny komponent |
| 4 | GameDetailRequirements | 1h | Ny komponent |
| 5 | GameDetailBoard (lazy) | 2h | Ny komponent med lazy-load |
| 6 | GameDetailTools (lazy) | 1h | Ny komponent med lazy-load |

**Total: ~8 timmar**

### Fas 6: Sandbox Disabled Sections

| # | Task | Uppskattning |
|---|------|-------------|
| 1 | Skapa DisabledSection komponent | 30min |
| 2 | Uppdatera sandbox toggle panel med P0/P1/P2/P3 states | 1h |
| 3 | Lägg till tooltips med DB gap info | 30min |

**Total: ~2 timmar**

### Fas 7: Contract Tests & Versioning

| # | Task | Uppskattning |
|---|------|-------------|
| 1 | Lägg till game_content_schema_version i DB | 30min |
| 2 | Skapa tests/contracts/ mapp | 30min |
| 3 | Roundtrip tests (Builder↔DB↔Display) | 2h |
| 4 | Snapshot tests för schema stability | 1h |

**Total: ~4 timmar**

---

## 📊 Sammanfattning

| Kategori | Antal | DB Nivå | Status |
|----------|-------|---------|--------|
| Implementerade komponenter | 15 | A | ✅ Klara |
| DB finns, mapper saknas | 4 | B | 🟡 P1 |
| DB saknas | 8 | C | 🔴 P2 (Roadmap) |
| Runtime (utanför scope) | 1 | N/A | ⚪ P3 |
| **TOTALT** | **28** | | |

### Arkitektur Beslut (från ChatGPT feedback)

| Beslut | Implementation |
|--------|---------------|
| Två-tier Golden Reference | ✅ SoT (DB) + Canonical Authoring Model (Builder) |
| Sandbox disabled P2 | 🟡 TODO: DisabledSection komponent |
| Verifierade DB gaps | ✅ A/B/C nivåer dokumenterade |
| En pipeline | ✅ GameAuthoringData → DB → Display Contracts |
| Content schema versioning | 🟡 TODO: game_content_schema_version |
| Contract/snapshot tests | 🟡 TODO: tests/contracts/ |

### Rekommenderad Implementation Order

1. **Fas 5** - GameAuthoringData + P1 komponenter (~8h)
2. **Fas 6** - Sandbox disabled sections (~2h)  
3. **Fas 7** - Contract tests & versioning (~4h)

**Total uppskattad tid: ~14 timmar**
