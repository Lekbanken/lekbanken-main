# 🎯 GameDetails Sektionsanalys & Data Provenance

> **Datum:** 2026-03-10 (uppdaterad från 2026-03-09)
> **Status:** ✅ Fas 0–4 KLAR — P1-komponenter integrerade — Sandbox Golden Reference aktiv
> **Syfte:** Komplett inventering av alla GameDetail-sektioner, deras datakällor, komponentstatus, och vad som saknas.

---

## 📋 Innehåll

1. [Arkitektur & Golden Reference](#arkitektur--golden-reference)
2. [Data Pipeline](#data-pipeline)
3. [Sektion Inventory (fullständig)](#sektion-inventory-fullständig)
4. [Komponentkatalog (24 filer)](#komponentkatalog-24-filer)
5. [Sandbox Status](#sandbox-status)
6. [DB Gap Verification (A/B/C)](#db-gap-verification-abc)
7. [Type System Deep Dive](#type-system-deep-dive)
8. [Saknade Design-element & Nya förslag](#saknade-design-element--nya-förslag)
9. [i18n Coverage](#i18n-coverage)
10. [Content Schema Versioning](#content-schema-versioning)
11. [Preview/Full/Play Paritet](#previewfullplay-paritet)
12. [Null/Empty/Default Semantik](#nullemptydefault-semantik)
13. [Sektionsordning & Config-drivet rendering](#sektionsordning--config-drivet-rendering)
14. [Åtkomstkontroll & Låst-tillstånd](#åtkomstkontroll--låst-tillstånd)
15. [i18n Djupanalys — Hårdkodade strängar](#i18n-djupanalys--hårdkodade-strängar)
16. [Tillgänglighet (a11y)](#tillgänglighet-a11y)
17. [Prestanda & Payload](#prestanda--payload)
18. [Testluckor](#testluckor)
19. [Builder → DB → Display Roundtrip](#builder--db--display-roundtrip)
20. [Döda fält & Orphan Features](#döda-fält--orphan-features)

---

## 🏛️ Arkitektur & Golden Reference

### Två separata "Golden Reference"-begrepp

| Begrepp | Källa | Ansvar | Ägarskap |
|---------|-------|--------|----------|
| **Source of Truth (SoT)** | Supabase DB | Runtime + persistence data | Migrations, RLS, Realtime |
| **Canonical Authoring Model** | Builder-kontraktet | Spelets innehållsstruktur (domain model) | `types/games.ts` (⚠️ `GameAuthoringData` typ EJ skapad ännu) |

### Pipeline-diagram (verifierat 2026-03-09)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CANONICAL AUTHORING MODEL                             │
│                    (types/games.ts — Builder types)                       │
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ Game Builder │    │   CSV/JSON   │    │   Future     │               │
│  │ /admin/games │    │   Import     │    │   Sources    │               │
│  │  /builder    │    │              │    │              │               │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │
│         └───────────────────┼───────────────────┘                        │
│                             ▼                                            │
│                  ┌──────────────────────┐                               │
│                  │   Supabase DB        │  ◀── Source of Truth           │
│                  │   15 game_* tabeller │      för all data i drift     │
│                  └──────────┬───────────┘                               │
│                             │                                            │
│              ┌──────────────┼──────────────┐                            │
│              ▼              ▼              ▼                             │
│  ┌────────────────┐ ┌─────────────────┐ ┌────────────────┐              │
│  │ mapDb...Summary│ │mapDb...Preview()│ │mapDb...Full()  │              │
│  │ → GameSummary  │ │→GameDetailData  │ │→GameDetailData │              │
│  │ (cards/listor) │ │(library view)   │ │(admin/host)    │              │
│  └────────────────┘ └─────────────────┘ └────────────────┘              │
│                             │                                            │
│              ┌──────────────┼──────────────┐                            │
│              ▼              ▼              ▼                             │
│  ┌────────────────┐ ┌─────────────────┐ ┌────────────────┐              │
│  │ GameCard       │ │ GameDetails     │ │ DirectorMode   │              │
│  │ (7 varianter)  │ │ (24 komponenter)│ │ Drawer/Preview │              │
│  └────────────────┘ └─────────────────┘ └────────────────┘              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │ PLAY RUNTIME (separata typer, EJ unified med lib/game-display)│      │
│  │ features/play/types.ts → RunStep, Run, GameRun                │      │
│  │ features/play/api/session-api.ts → StepInfo, PhaseInfo        │      │
│  │ types/play-runtime.ts → SessionRuntimeState, SessionRole      │      │
│  └────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Pipeline-regler

1. **CSV/JSON import** → mappar till Builder types (`types/games.ts`)
2. **Game Builder** → sparar till DB via `upsert_game()` (atomic)
3. **DB mappers** → `lib/game-display/mappers.ts` → Display contracts
4. **UI components** → konsumerar `GameDetailData` (ALDRIG raw DB)
5. **Play mappers** → DB → `Session*` (runtime contracts, EJ unified ännu)

**Om Builder-kontraktet ändras:**
- [ ] Uppdatera builder types i `types/games.ts`
- [ ] Skapa DB migration
- [ ] Uppdatera mapper i `lib/game-display/mappers.ts`
- [ ] Uppdatera `GameDetailData` i `lib/game-display/types.ts`
- [ ] Uppdatera mock-games i sandbox
- [ ] ⚠️ `GameAuthoringData` unified typ saknas fortfarande

---

## 🔄 Data Pipeline

### Verifierad dataflöde (2026-03-09)

```
                    ┌─────────────────────────────────┐
                    │ app/app/games/[gameId]/page.tsx  │ (244 rader, Server Component)
                    │  1. getGameByIdPreview(gameId)   │
                    │  2. mapDbGameToDetailPreview()    │
                    │  3. getSectionConfig('preview')   │
                    │  4. getUserReactionForGame()      │
                    │  5. getRelatedGames()             │
                    └──────────┬──────────────────────┘
                               │
           ┌───────────────────┼───────────────────────────┐
           ▼                   ▼                           ▼
    ┌─────────────┐   ┌───────────────┐          ┌──────────────┐
    │ Server      │   │ Client        │          │ Sidebar      │
    │ Components  │   │ (lazy-load)   │          │ Components   │
    │ ─────────── │   │ ──────────────│          │ ──────────── │
    │ Header      │   │ Roles →       │          │ Actions +    │
    │ Badges      │   │  /api/[id]/   │          │  PlanModal   │
    │ About       │   │  roles        │          │ QuickFacts   │
    │ Steps       │   │ Artifacts →   │          │ (Reactions)  │
    │ Materials   │   │  /api/[id]/   │          └──────────────┘
    │ Safety      │   │  artifacts    │
    │ Preparation │   │ Triggers →    │
    │ Accessibility│  │  /api/[id]/   │
    │ Requirements│   │  triggers     │
    │ Phases      │   └───────────────┘
    │ Board       │
    │ Gallery     │
    │ Tools       │
    └─────────────┘
```

### Mapper-funktioner (15 st i `lib/game-display/mappers.ts`, ~850 rader)

| Mapper | Input | Output | Användning |
|--------|-------|--------|------------|
| `mapDbGameToSummary()` | DbGame | GameSummary | GameCard (alla 7 varianter) |
| `mapDbGameToDetail()` | DbGame | GameDetailData | ~~DEPRECATED~~ |
| `mapDbGameToDetailPreview()` | GamePreviewData | GameDetailData | Library page (production) |
| `mapDbGameToDetailFull()` | GameFullData | GameDetailData | Admin/host/director preview |
| `mapSearchResultToSummary()` | SearchResult | GameSummary | Sökresultat |
| `mapPlannerBlockToSummary()` | PlannerBlock | GameSummary | Planner-vy |
| `createMinimalSummary()` | (id, title) | GameSummary | Placeholder |
| `validateGameSummary()` | obj | boolean | Validering |
| `mapSteps()` | db_steps[] | GameStep[] | Sub-mapper |
| `mapPhases()` | db_phases[] | GamePhase[] | Sub-mapper |
| `mapMaterials()` | db_materials[] | GameMaterialGroup | Sub-mapper (+safety/prep) |
| `mapRoles()` | db_roles[] | GameRole[] | Sub-mapper |
| `mapArtifacts()` | db_artifacts[] | GameArtifact[] | Sub-mapper (+variants) |
| `mapTriggers()` | db_triggers[] | GameTrigger[] | Sub-mapper |
| `mapBoardConfigToWidgets()` | db_board[] | GameBoardWidget[] | Sub-mapper |

### Formatter-funktioner (9 st i `lib/game-display/formatters.ts`, ~300 rader)

| Formatter | Exempel output |
|-----------|---------------|
| `formatDuration(15, 20)` | "15–20 min" |
| `formatDurationShort(15, 20)` | "15–20" |
| `formatPlayers(4, 12)` | "4–12 deltagare" |
| `formatPlayersShort(4, 12)` | "4–12" |
| `formatAgeRange(5, 12)` | "5–12 år" |
| `formatEnergyLevel('high')` | "Hög energi" |
| `formatPlayMode('participants')` | "Deltagarlek" |
| `formatEnvironment('both')` | "Inomhus/Utomhus" |
| `formatDifficulty('medium')` | "Medel" |

---

## 📦 Sektion Inventory (fullständig)

> Uppdaterad 2026-03-09 med verifierad kodinventering.

### Statusförklaring

| Symbol | Betydelse |
|--------|-----------|
| ✅ | Klar — komponent finns, data mappas, renderas i produktion |
| 🟡 | Komponent finns men data saknas eller ej mappad till DB |
| ❌ | Saknas helt (ingen komponent, ingen data) |
| ⏸️ | Pausad — designbeslut krävs |
| 🔒 | Runtime-specifik (utanför GameDetails scope) |

### Komplett Sektionstabell

| # | Sektion | Grupp | Komponent (fil) | Rader | Data i DB? | Renderas i prod? | Sandbox? | Status |
|---|---------|-------|-----------------|-------|------------|------------------|----------|--------|
| 1 | **Titel & cover** | INTRO | `GameDetailHeader.tsx` | 80 | ✅ games.name, game_media | ✅ Alltid | ✅ | ✅ KLAR |
| 2 | **Badges** | INTRO | `GameDetailBadges.tsx` | 50 | ✅ games.energy/play_mode/difficulty | ✅ config-styrd | ✅ | ✅ KLAR |
| 3 | **Om leken** | INNEHÅLL | `GameDetailAbout.tsx` | 60 | ✅ translations.description | ✅ config-styrd | ✅ | ✅ KLAR |
| 4 | **Steg för steg** | FLÖDE | `GameDetailSteps.tsx` | 175 | ✅ game_steps | ✅ config-styrd | ✅ | ✅ KLAR |
| 5 | **Material** | INNEHÅLL | `GameDetailMaterials.tsx` | 60 | ✅ game_materials | ✅ config-styrd | ✅ | ✅ KLAR |
| 6 | **Säkerhet** | INNEHÅLL | `GameDetailSafety.tsx` | 40 | ✅ game_materials.safety_notes | ✅ config-styrd | ✅ | ✅ KLAR |
| 7 | **Förberedelser** | INNEHÅLL | `GameDetailPreparation.tsx` | 40 | ✅ game_materials (typ) | ✅ config-styrd | ✅ | ✅ KLAR |
| 8 | **Tillgänglighet** | INNEHÅLL | `GameDetailAccessibility.tsx` | 47 | ✅ games.accessibility_notes | ✅ config-styrd (P1) | ✅ | ✅ KLAR |
| 9 | **Krav för spel** | SIDEBAR | `GameDetailRequirements.tsx` | 50 | ✅ games.space_requirements | ✅ config-styrd (P1) | ✅ | ✅ KLAR |
| 10 | **Fasplan** | FLÖDE | `GameDetailPhases.tsx` | 118 | ✅ game_phases | ✅ facilitated/participants | ✅ | ✅ KLAR |
| 11 | **Publik tavla** | FLÖDE | `GameDetailBoard.tsx` | 66 | ✅ game_board_config (21 kolumner) | ✅ facilitated/participants (P1) | ✅ | ✅ KLAR |
| 12 | **Bildgalleri** | INNEHÅLL | `GameDetailGallery.tsx` | 70 | ✅ game_media | ✅ config-styrd | ✅ | ✅ KLAR |
| 13 | **Roller** | DELTAGARE | `GameDetailRoles.tsx` | 165 | ✅ game_roles (lazy-load) | ✅ participants only | ✅ | ✅ KLAR |
| 14 | **Artefakter** | DELTAGARE | `GameDetailArtifacts.tsx` | 199 | ✅ game_artifacts + variants (lazy) | ✅ participants only | ✅ | ✅ KLAR |
| 15 | **Triggers** | DELTAGARE | `GameDetailTriggers.tsx` | 139 | ✅ game_triggers (lazy-load) | ✅ participants only | ✅ | ✅ KLAR |
| 16 | **Facilitatorverktyg** | DELTAGARE | `GameDetailTools.tsx` | 66 | ✅ game_tools (8 kolumner) | ✅ facilitated/participants (P1) | ✅ | ✅ KLAR |
| 17 | **Snabbfakta** | SIDEBAR | `GameDetailQuickFacts.tsx` | 60 | ✅ games.* | ✅ config-styrd | ✅ | ✅ KLAR |
| 18 | **Sidebar** | SIDEBAR | `GameDetailSidebar.tsx` | 60 | ✅ games.* | ✅ config-styrd | ✅ | ✅ KLAR |
| 19 | **CTA-knappar** | SIDEBAR | `GameDetailActions.tsx` | 40 | N/A | ✅ admin only | ✅ | ✅ KLAR |
| 20 | **Start/Spela** | SIDEBAR | `GameStartActions.tsx` | 371 | N/A (actions) | ✅ Alltid | ✅ | ✅ KLAR |
| 21 | **Lägg till i plan** | SIDEBAR | `GameActionsWithPlanModal.tsx` | 33 | N/A (wrapper) | ✅ Alltid | ✅ | ✅ KLAR |
| 22 | **Disabled placeholder** | META | `DisabledSection.tsx` | 95 | N/A | ❌ Bara sandbox | ✅ | ✅ KLAR |
| | | | | | | | | |
| 23 | **Taggar & highlights** | INTRO | ❌ SAKNAS | — | ❌ game_tags saknas i DB | ❌ | 🟡 P2 disabled | ⏸️ P2 |
| 24 | **Spelupplevelse** | INNEHÅLL | ❌ SAKNAS | — | ❌ highlights ej i DB | ❌ | 🟡 P2 disabled | ⏸️ P2 |
| 25 | **Varianter** | INNEHÅLL | ❌ SAKNAS | — | ❌ game_variants saknas | ❌ | 🟡 P2 disabled | ⏸️ P2 |
| 26 | **Reflektion** | INNEHÅLL | ❌ SAKNAS | — | ❌ reflection_prompts saknas | ❌ | 🟡 P2 disabled | ⏸️ P2 |
| 27 | **Checkpoints** | FLÖDE | ❌ SAKNAS | — | ❌ game_checkpoints saknas | ❌ | 🟡 P2 disabled | ⏸️ P2 |
| 28 | **Omröstningar** | DELTAGARE | ❌ SAKNAS | — | ❌ game_decisions saknas | ❌ | 🟡 P2 disabled | ⏸️ P2 |
| 29 | **Nerladdningar** | SIDEBAR | ❌ SAKNAS | — | ❌ game_downloads saknas | ❌ | 🟡 P2 disabled | ⏸️ P2 |
| 30 | **Host actions** | DELTAGARE | ❌ SAKNAS | — | ⚠️ Delvis via game_tools | ❌ | 🟡 P2 disabled | ⏸️ P2 |
| 31 | **Deltagarvy (mock)** | RUNTIME | ❌ N/A | — | N/A (runtime) | ❌ | ❌ | 🔒 P3 Runtime |
| | | | | | | | | |
| **NYA FÖRSLAG** | | | | | | | | |
| 32 | **Lärandemål/Outcomes** | INNEHÅLL | ❌ SAKNAS | — | 🟡 `outcomes` i typ men ej DB | ❌ | 🟡 mock har data | ❌ NY |
| 33 | **Metadata-panel** | SIDEBAR | ❌ SAKNAS (prod) | — | ✅ games.* (created, updated) | ❌ | ✅ Finns i sandbox | ❌ NY |
| 34 | **SEO/OpenGraph** | META | ❌ SAKNAS | — | ✅ All data finns | ❌ | ❌ | ❌ NY |
| 35 | **Skriv ut / PDF** | META | ❌ SAKNAS | — | ✅ All data finns | ❌ | ❌ | ❌ NY |
| 36 | **Brödsmulor** | NAV | ❌ Bara back-link | — | N/A | ⚠️ Enkel back-link | ❌ | ❌ NY |
| 37 | **Redigera-knapp** | SIDEBAR | ❌ SAKNAS | — | N/A (navigation) | ❌ | ❌ | ❌ NY |
| 38 | **Skeleton loaders** | UX | ❌ SAKNAS | — | N/A | ❌ (generisk spinner) | ❌ | ❌ NY |
| 39 | **Error boundary** | UX | ❌ SAKNAS | — | N/A | ❌ | ❌ | ❌ NY |
| 40 | **Relaterade lekar** | INNEHÅLL | ✅ Inline i page | ✅ via getRelatedGames() | ✅ Som GameCard | ❌ ej i sandbox | ⚠️ Ej komponent |

### Sammanfattning

| Kategori | Antal | Status |
|----------|-------|--------|
| ✅ Klara P0-komponenter | 15 | Implementerade, i produktion |
| ✅ Klara P1-komponenter | 4 | Implementerade, config-styrda |
| ✅ CTA/Actions-komponenter | 3 | Implementerade |
| ✅ Meta-komponenter (config, types, context, disabled) | 4 | Arkitekturella |
| ⏸️ P2-sektioner (väntar på DB) | 8 | DisabledSection i sandbox |
| 🔒 P3 Runtime | 1 | Play-domänen |
| ❌ Nya förslag (gap-analys) | 9 | Oidentifierade behov |
| **TOTALT** | **44** | |

---

## 🗄️ Komponentkatalog (24 filer)

> Alla filer i `components/game/GameDetails/`

### Kärn-komponenter (P0 — 15 st)

| Komponent | Rader | Props | Datakälla | Rendering |
|-----------|-------|-------|-----------|-----------|
| `GameDetailHeader.tsx` | 80 | title, cover, backLink, label | games.name, game_media | Cover-bild + titel + subtitle + back-link |
| `GameDetailBadges.tsx` | 50 | playMode, energy, difficulty badges | games.* direkt | Färgkodade badges med ikoner |
| `GameDetailAbout.tsx` | 60 | description, shortDescription, highlights | translations.description | Beskrivningstext + highlights-lista |
| `GameDetailSteps.tsx` | 175 | steps[], collapsible, maxVisible | game_steps | Numrerade kort med duration + optional badge + expand/collapse |
| `GameDetailMaterials.tsx` | 60 | materials[], safety, preparation | game_materials | Lista med ikoner + quantity |
| `GameDetailSafety.tsx` | 40 | safety (string[]) | game_materials.safety_notes | ⚠️ Varningslista |
| `GameDetailPreparation.tsx` | 40 | preparation (string[]) | game_materials (typ) | Checklista |
| `GameDetailPhases.tsx` | 118 | phases[] | game_phases | Fas-typ ikoner (intro/round/finale/break) + mål + duration |
| `GameDetailGallery.tsx` | 70 | galleryItems[], media | game_media | Bildgrid (exkl. cover) |
| `GameDetailRoles.tsx` | 165 | game (lazy-load) | `/api/games/[id]/roles` | Collapsible, färgkodade rollkort med ikon/count/notes |
| `GameDetailArtifacts.tsx` | 199 | game (lazy-load) | `/api/games/[id]/artifacts` | Typ-badges + varianter + `SpatialMapArtifactRenderer` |
| `GameDetailTriggers.tsx` | 139 | game (lazy-load) | `/api/games/[id]/triggers` | Condition/effect-boxar + executeOnce/delay metadata |
| `GameDetailQuickFacts.tsx` | 60 | players, duration, age, energy | games.* | Kompakt faktarutor |
| `GameDetailSidebar.tsx` | 60 | status, created date | games.* | Sidebar-wrapper |
| `GameDetailActions.tsx` | 40 | admin-actions | N/A | Admin-specifika knappar |

### P1-komponenter (4 st — alla integrerade i prod)

| Komponent | Rader | Props | Datakälla | Rendering |
|-----------|-------|-------|-----------|-----------|
| `GameDetailAccessibility.tsx` | 47 | game.accessibility (string[]) | games.accessibility_notes | ✅ CheckCircle-ikon + punktlista |
| `GameDetailRequirements.tsx` | 50 | game.requirements (string[]) | games.space_requirements | ✅ MapPin-ikon + punktlista |
| `GameDetailBoard.tsx` | 66 | game.boardWidgets (array) | game_board_config | ✅ Grid (2-col) med titel + detalj |
| `GameDetailTools.tsx` | 66 | game.facilitatorTools (string[]) | game_tools | ✅ Flex-wrap pills med ikoner |

### Arkitektur-filer (4 st)

| Fil | Rader | Exporterar | Syfte |
|-----|-------|-----------|-------|
| `config.ts` | ~200 | `GameDetailMode`, `SectionVisibility`, `getSectionConfig()`, `hasLazyLoadedSections()`, `getVisibleSections()` | Config-driven section visibility per mode × playMode |
| `types.ts` | ~310 | 20+ prop-interfaces (GameDetailHeaderProps, etc.) | Typade props för alla komponenter |
| `GameDetailContext.tsx` | ~130 | `GameDetailProvider`, `useGameDetail()`, `useGameDetailMode()`, `useGameDetailConfig()`, `useIsLocked()` | React Context (minimal, ej logik) |
| `DisabledSection.tsx` | 95 | `DisabledSection` | P2-placeholder med prioritetsbadge + reason |
| `index.ts` | ~50 | Barrel export av allt | Re-export convenience |

### CTA/Actions (3 st — utanför GameDetails/)

| Komponent | Fil | Rader | Syfte |
|-----------|-----|-------|-------|
| `GameStartActions.tsx` | `components/game/` | 371 | Director preview + session start (gated per playMode) + share + like/dislike |
| `GameActionsWithPlanModal.tsx` | `components/game/` | 33 | Wrapper med AddToPlanModal |
| `start-session-cta.tsx` | `app/app/games/[gameId]/` | — | CTA-komponent för session |

### Section Visibility Matrix

| Sektion | Preview | Admin | Host | Basic | Facilitated | Participants |
|---------|---------|-------|------|-------|-------------|------------- |
| header | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| badges | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| about | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| steps | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| materials | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| safety | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| preparation | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| accessibility | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| requirements | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| phases | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| board | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| gallery | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| roles | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| artifacts | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| triggers | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| tools | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| quickFacts | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| sidebar | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| adminActions | ❌ | ✅ | ❌ | — | — | — |

---

## 🎨 Sandbox Status

### Aktuell state (2026-03-09)

**Fil:** `app/sandbox/app/game-detail/page.tsx` (464 rader)
**Mock-data:** `app/sandbox/app/game-detail/mock-games.ts` (535 rader)

### Sandbox-funktioner

| Funktion | Status | Detalj |
|----------|--------|--------|
| 3 testspel (basic/facilitated/participants) | ✅ | Komplett mock-data i `GameDetailData` format |
| Mode-toggle (preview/admin/host) | ✅ | Växlar `getSectionConfig()` |
| P2 DisabledSection-placeholders | ✅ | 8 st med P2-badge + DB-gap-reason |
| Per-section override toggles | ✅ | Kan slå on/off enskilda sektioner |
| Data Provenance Panel | ✅ | 15 COVERAGE_ITEMS med DB-tabell-mappning |
| Använder produktion-komponenter | ✅ | Samma 24 `GameDetails/*` komponenter |
| PlayModeConfig (styling per mode) | ✅ | Färgkodade teman (grey/blue/yellow) |

### Mock-data per testspel

| Spel | PlayMode | Steps | Phases | Roles | Artifacts | Triggers | Materials | Board | Tools |
|------|----------|-------|--------|-------|-----------|----------|-----------|-------|-------|
| Skattjakt Mini | basic | 5 | ❌ | ❌ | ❌ | ❌ | 4 | ❌ | ❌ |
| Samarbetslabbet | facilitated | ✅ | 4 | ❌ | ❌ | ❌ | ✅ | 4 | ✅ |
| Mysteriet: Försvunnen Kod | participants | ✅ | 3 | 5 | 4 | 3 | ✅ | 4 | 6 |

### Sandbox → Production gap

| Funktion i sandbox | Finns i produktion? | Notering |
|--------------------|---------------------|----------|
| MetadataSection (created_at, version) | ❌ | Renderas i sandbox sidebar men ej i prod |
| P2 DisabledSection | ❌ (bara sandbox) | Korrekt — sandbox-only |
| Mode toggle | ❌ | Prod använder alltid 'preview' |
| Section overrides | ❌ | Dev-only funktion |

---

## 🗄️ DB Gap Verification (A/B/C)

### Verifieringsnivåer

| Nivå | Definition | Åtgärd |
|------|------------|--------|
| **A** | DB-tabell finns + Kolumn finns + Mapper finns + Komponent finns | ✅ Ready |
| **B** | DB finns + Mapper finns + Komponent finns, men **data ej ifylld i typiska spel** | 🟡 Behöver builder/import-stöd |
| **C** | DB-tabell/kolumn **SAKNAS** | 🔴 Kräver migration + design |

### Verifierad status (2026-03-09)

| Sektion | DB Tabell/Kolumn | Mapper | Komponent | Nivå | Kommentar |
|---------|-----------------|--------|-----------|------|-----------|
| Titel & cover | games.name + game_media | ✅ | ✅ GameDetailHeader | **A** | ✅ |
| Steps | game_steps | ✅ mapSteps() | ✅ GameDetailSteps | **A** | ✅ |
| Phases | game_phases | ✅ mapPhases() | ✅ GameDetailPhases | **A** | ✅ |
| Materials | game_materials | ✅ mapMaterials() | ✅ GameDetailMaterials | **A** | ✅ |
| Safety | game_materials.safety_notes | ✅ via mapMaterials() | ✅ GameDetailSafety | **A** | Extraheras |
| Preparation | game_materials (typ) | ✅ via mapMaterials() | ✅ GameDetailPreparation | **A** | Extraheras |
| Roles | game_roles | ✅ mapRoles() | ✅ GameDetailRoles | **A** | Lazy-load |
| Artifacts | game_artifacts + variants | ✅ mapArtifacts() | ✅ GameDetailArtifacts | **A** | 26 artefakttyper! |
| Triggers | game_triggers | ✅ mapTriggers() | ✅ GameDetailTriggers | **A** | Lazy-load |
| Tillgänglighet | games.accessibility_notes | ✅ | ✅ GameDetailAccessibility | **A** | P1 klar |
| Krav för spel | games.space_requirements | ✅ | ✅ GameDetailRequirements | **A** | P1 klar |
| Publik tavla | game_board_config (21 col) | ✅ mapBoardConfigToWidgets() | ✅ GameDetailBoard | **A** | P1 klar |
| Facilitatorverktyg | game_tools (8 col) | ✅ | ✅ GameDetailTools | **A** | P1 klar |
| Gallery | game_media | ✅ | ✅ GameDetailGallery | **A** | ✅ |
| Leader tips | games.leader_tips | ❌ Ej mappad | ❌ Ej renderad | **B** | DB finns, ej visad |
| Taggar | ❌ game_tags saknas | — | — | **C** | Roadmap |
| Spelupplevelse/Highlights | ❌ ej i DB | — | — | **C** | Typ finns, DB saknas |
| Varianter | ❌ game_variants saknas | — | — | **C** | Roadmap |
| Reflektion | ❌ reflection_prompts saknas | — | — | **C** | Roadmap |
| Checkpoints | ❌ game_checkpoints saknas | — | — | **C** | Roadmap |
| Omröstningar/beslut | ❌ game_decisions saknas | — | — | **C** | Roadmap |
| Nerladdningar | ❌ game_downloads saknas | — | — | **C** | Roadmap |
| Host actions | ⚠️ Delvis game_tools | ⚠️ | ❌ | **B/C** | tool_key kan nyttjas |
| Outcomes/Lärandemål | ❌ ej i DB | — | — | **C** | Ny — identifierad 2026-03 |

### DB Migrations (15 relevanta för games)

| Migration | Datum | Syfte |
|-----------|-------|-------|
| `20251207100000_fix_games_rls.sql` | 2025-12-07 | RLS-policies |
| `20251208090000_games_translations_media.sql` | 2025-12-08 | Översättningar + media |
| `20251209000100_add_game_metrics.sql` | 2025-12-09 | Spelmetrik |
| `20251216010000_game_builder_p0.sql` | 2025-12-16 | steps, materials, phases |
| `20251216020000_game_phases.sql` | 2025-12-16 | Fas-definitioner |
| `20251216030000_game_roles.sql` | 2025-12-16 | Deltagare-roller |
| `20251216040000_game_board_config.sql` | 2025-12-16 | Publik tavla |
| `20251216140000_fix_admin_games_rls.sql` | 2025-12-16 | Admin RLS fix |
| `20251226110000_game_steps_display_mode.sql` | 2025-12-26 | Display modes (instant/typewriter/dramatic) |
| `20251226120000_game_triggers.sql` | 2025-12-26 | Triggers |
| `20251228120000_game_snapshots.sql` | 2025-12-28 | Session-isolerade snapshots |
| `20260102120000_game_tools_v1.sql` | 2026-01-02 | Facilitatorverktyg |
| `20260130000000_game_reactions.sql` | 2026-01-30 | Like/dislike-system |
| `20260201000000_atomic_game_upsert.sql` | 2026-02-01 | Atomisk upsert |
| `20260208000000_game_media_unique_cover.sql` | 2026-02-08 | En cover per spel |

---

## 📐 Type System Deep Dive

### `lib/game-display/types.ts` (~400 rader)

**Enums / Type Aliases:**
```
EnergyLevel = 'low' | 'medium' | 'high'
PlayMode = 'basic' | 'facilitated' | 'participants'
Environment = 'indoor' | 'outdoor' | 'both'
Difficulty = 'easy' | 'medium' | 'hard'
GameStatus = 'draft' | 'published' | 'archived'
```

**Huvud-typer:**

| Typ | Extends | Syfte | Fält |
|-----|---------|-------|------|
| `GameSummary` | — | Cards/listor | id, title, slug, shortDescription, coverUrl, duration, players, age, energyLevel, environment, difficulty, playMode, categories, tags, purpose, product, rating, playCount, isFavorite, isLocked, isOwned, status |
| `GameDetailData` | GameSummary | Fullständig lek-vy | + description, subtitle, highlights, materials, preparation, requirements, downloads, outcomes, safety, accessibility, phases, checkpoints, roles, artifacts, triggers, decisions, facilitatorTools, hostActions, boardWidgets, meta |

**Sub-typer (alla exporterade):**

| Typ | Nyckel-fält |
|-----|------------|
| `GameStep` | title, body, duration, leaderScript, participantPrompt, boardText, displayMode, optional, phaseId |
| `GamePhase` | title, phaseType (intro/round/finale/break), duration, goal, facilitator, outputs, board, timerVisible, timerStyle, autoAdvance |
| `GameRole` | name, icon, color, public_description, private_instructions, assignment_strategy, scaling_rules, conflicts_with |
| `GameArtifact` | title, description, artifact_type (26 typer!), tags, metadata, variants[] |
| `GameArtifactVariant` | title, body, visibility, visibleToRoleId, mediaRef |
| `GameTrigger` | condition, effect |
| `GameDecision` | title, prompt, options, resolution |
| `GameMaterial` | label, detail, quantity, icon |
| `GameMaterialGroup` | items[], safetyNotes[], preparationNotes[] |
| `GameBoardWidget` | title, detail |
| `GameMetadata` | gameKey, version, updatedAt, createdAt, owner, locale |

**Type Guards:**
- `isValidGameSummary(obj)` — validates GameSummary shape
- `hasParticipantsData(game)` — checks for roles[]
- `hasFacilitatedData(game)` — checks for phases[]

### `types/games.ts` (~400 rader) — Builder types (SEPARATA)

**⚠️ TYPE DUPLICATION:**
- `GameStep` finns i BÅDE `types/games.ts` (builder) OCH `lib/game-display/types.ts` (display)
- `GamePhase`, `GameRole`, `GameArtifact` — liknande men SUBTILT ANNORLUNDA
- **Ingen `GameAuthoringData` consolidation-typ skapad ännu**

**Builder-specifika typer:**
- `ArtifactFormData`, `ArtifactVariantFormData` — form payloads
- `StepFormData` — step form state
- `GameBoardConfig` — board editor state
- 26 artefakttyper (card, document, cipher, riddle, spatial_map, etc.)

### Play-domänen (fortsatt separat)

| Fil | Typer | Extended? |
|-----|-------|-----------|
| `features/play/types.ts` (~300 rader) | RunStep, Run, GameRun, RunStatus, DashboardRunRow | ❌ Extends EJ `lib/game-display` |
| `features/play/api/session-api.ts` (~100 rader) | StepInfo, PhaseInfo, AdminOverrides | ❌ Lokala typer |
| `types/play-runtime.ts` (~250 rader) | TimerState, BoardState, SessionRuntimeState, SessionRole | ❌ Lokala (⚠️ SessionRole duplicerar GameRole) |

---

## 🆕 Saknade Design-element & Nya förslag

> Identifierade under kodanalys 2026-03-09. Sektioner som INTE finns som komponent men som antingen har data, typ-definition, eller är uppenbara behov.

### P1.5 — Snabba vinster (data finns, liten insats)

| # | Element | Data finns? | Typ i GameDetailData? | Insats | Beskrivning |
|---|---------|-------------|----------------------|--------|-------------|
| 1 | **Lärandemål / Outcomes** | 🟡 `outcomes` i typ, mock har data | ✅ `outcomes?: string[]` | ~1h | Lista med vad deltagarna lär sig. Viktig för pedagoger. Liknar preparation/safety i stil. |
| 2 | **Metadata-panel** (prod) | ✅ games.created_at, updated_at | ✅ `meta?: GameMetadata` | ~1h | Finns i sandbox men ej i produktion. gameKey, version, skapardatum. |
| 3 | **Leader tips** | ✅ games.leader_tips (i DB!) | ❌ Ej i GameDetailData | ~1h | Tips till lekledaren. DB-kolumn finns men mappas ej. Kan visas i GameDetailAbout (extended) eller separat sektion. |
| 4 | **Highlights-rendering** | 🟡 I typ men ej visad separat | ✅ `highlights?: string[]` | ~30min | GameDetailAbout tar emot highlights men renderar dem inte om data inte skickas. Behöver kopplas i mapper. |

### P2 — Kräver DB-migration + design

| # | Element | DB-behov | Insats | Beskrivning |
|---|---------|----------|--------|-------------|
| 5 | **Taggar & highlights** | `game_tags` tabell | ~4h | Tagg-system med klickbara badges. Kräver game_tags tabell + builder-UI + browse-filtrering. |
| 6 | **Varianter** | `game_variants` tabell | ~6h | Alternativa spelupplägg (enklare version, svårare version, annan åldersgrupp). |
| 7 | **Reflektionsfrågor** | `reflection_prompts` tabell | ~3h | Frågor för debriefing efter leken. Viktigt för pedagogisk kontext. |
| 8 | **Checkpoints** | `game_checkpoints` tabell | ~4h | Kontrollpunkter inom en fas. Kopplade till faser. |
| 9 | **Omröstningar/Beslut** | `game_decisions` tabell | ~6h | Deltagardriven röstning med options + resolution. Typ finns (`GameDecision`). |
| 10 | **Nerladdningar** | `game_downloads` tabell | ~4h | PDF, printable cards, rollkort, material att skriva ut. |
| 11 | **Host actions** | Utöka game_tools | ~3h | Specifika knappar för host (starta röstning, lås upp artefakt, skicka ledtråd). |

### P2.5 — UX/Infrastruktur

| # | Element | Insats | Beskrivning |
|---|---------|--------|-------------|
| 12 | **SEO/Metadata (`generateMetadata`)** | ~2h | Dynamisk `<title>`, OpenGraph-tags, JSON-LD structured data. Inget finns idag. |
| 13 | **Brödsmulor (breadcrumbs)** | ~1h | Ersätt enkel back-link med breadcrumb-trail: Hem > Lekar > [Kategori] > [Lek] |
| 14 | **Redigera-knapp (admin)** | ~1h | I admin-mode: "Redigera" → `/admin/games/builder?gameId=X`. Saknas helt idag. |
| 15 | **Skeleton loaders** | ~2h | Ersätt generiska spinners med skelett-animationer per sektion. |
| 16 | **Error boundary** | ~1h | Global error boundary runt GameDetails-sidan. |
| 17 | **Skriv ut / PDF** | ~4h | Print-stylesheet + eventuellt PDF-export för lekledare som vill ha papperskopior i fält. |
| 18 | **Relaterade lekar (komponent)** | ~1h | Idag inline i page.tsx. Bör bli `GameDetailRelated.tsx` i GameDetails/-mappen. |
| 19 | **Reaktions-visning** | ~1h | Visa like/dislike-antal på sidan (antal likes). Reactions finns men visas bara som knapp, ej statistik. |

### Föreslagna Sandbox-tillägg

| Element | I sandbox idag? | Förslag |
|---------|-----------------|---------|
| Outcomes-sektion | ❌ Mock har data, ej renderad | Lägg till `GameDetailOutcomes.tsx` |
| Metadata-panel i sidebar | ✅ Finns | Flytta till produktion |
| Relaterade lekar | ❌ | Lägg till i sandbox med mock-data |
| Print-preview läge | ❌ | Nytt sandbox-tab: "Print preview" |
| Empty states showcase | ❌ | Testspel med minimal data (testa null-checks) |

---

## 🌐 i18n Coverage

### Namnrymd: `app.gameDetail` (60+ nycklar)

| Kategori | Nycklar | Status |
|----------|---------|--------|
| Grundläggande | notFoundTitle, backToBrowse, label, descriptionFallback | ✅ |
| Sektionstitlar | sections.about, instructions, materials, safety, preparation, phases, images, details, roles, artifacts, triggers, quickInfo, accessibility, requirements, board, tools | ✅ |
| Fas-detaljer | phases.goal, phases.duration | ✅ |
| Roll-detaljer | roles.count | ✅ |
| Artefakt-detaljer | artifacts.variants | ✅ |
| Trigger-detaljer | triggers.condition, triggers.effect | ✅ |
| Faktarutor | details.participants, time, age, energy | ✅ |
| Energi-nivåer | energy.low, medium, high | ✅ |
| Sidebar | sidebar.status, published, draft, addedAt | ✅ |
| Actions | actions.share, favorite, like, unlike, dislike, addToPlan | ✅ |
| Director preview | directorPreview.button, title, backToGame, noSteps | ✅ |

### Saknade i18n-nycklar (för nya förslag)

| Nyckel | Behövs för |
|--------|-----------|
| `sections.outcomes` | Lärandemål-sektion |
| `sections.metadata` | Metadata-panel |
| `sections.related` | Relaterade lekar |
| `actions.edit` | Redigera-knapp |
| `actions.print` | Skriv ut |
| `breadcrumb.*` | Brödsmulor |

---

## 📋 Content Schema Versioning

### Status: ❌ EJ IMPLEMENTERAD

`game_content_schema_version` kolumnen i `games`-tabellen har **INTE skapats**.

### Rekommendation (framtida)

```sql
ALTER TABLE games 
ADD COLUMN content_schema_version INTEGER DEFAULT 1;
```

| Version | Ändringar |
|---------|-----------|
| 1 | Current release (alla P0 + P1 features) |
| 2 (framtida) | + game_tags, outcomes/highlights |
| 3 (framtida) | + game_variants, reflections |

---

## � Preview/Full/Play Paritet

> Verifierad 2026-03-10. Fält-för-fält jämförelse av de tre datapipelinerna.

### De tre pipelinerna

| Pipeline | Funktion | Källa | Används av |
|----------|----------|-------|-----------|
| **Preview** | `getGameByIdPreview()` → `mapDbGameToDetailPreview()` | `lib/services/games.server.ts` | Production page (SSR) |
| **Full** | `getGameByIdFull()` → `mapDbGameToDetailFull()` | `lib/services/games.server.ts` | Admin/host (SSR) |
| **Play** | `GET /api/play/sessions/[id]/game` | `app/api/play/sessions/[id]/game/route.ts` | Play runtime (client) |
| **Lazy** | `GET /api/games/[id]/{roles,artifacts,triggers}` | Separata route.ts-filer | GameDetailRoles/Artifacts/Triggers (client) |

### Kritiska dispariteter

| Problem | Detalj | Risk |
|---------|--------|------|
| **board_config & tools i Preview men EJ i Full** | `getGameByIdPreview()` inkluderar `board_config:game_board_config(*)` och `tools:game_tools(*)` men `getGameByIdFull()` gör det **INTE** | ~~Full-vyn saknar board-tema och verktyg~~ ✅ **LÖST** (Sprint A — A1 query parity) |
| **Locale-stöd BARA i Play** | Play API har fullständigt locale-fallback-system (`game_steps(locale=X)` → `game_steps(locale=null)`). Preview/Full har inget locale-stöd. | Preview/Full returnerar alltid basinnehåll utan lokalisering |
| **Sortering: kod vs DB** | Preview/Full sorterar i JavaScript (`steps.sort(a.step_order - b.step_order)`). Play sorterar i DB-query (`.order('step_order')`) | Funktionellt ekvivalent men olika implementation |
| **Säkerhetsfiltrering BARA i Play** | Play strippar `leaderScript`, `boardText`, `phaseId` från participant-svar. Preview/Full gör ingen filtrering. | Preview/Full ska aldrig nå opålitlig klient (SSR only) — OK design |
| **Materials dubbla källor** | `games.materials` (string[]) + `game_materials` tabell (strukturerad). Preview/Full: relation. Play: separat query. | Kan divergera om båda källorna uppdateras oberoende |

### Fält som ALDRIG populeras av någon mapper

| Fält i `GameDetailData` | Satt av Preview? | Satt av Full? | Satt av Play? | Status |
|--------------------------|:-:|:-:|:-:|--------|
| `highlights` | ❌ | ❌ | ❌ | **DÖTT** — bara i mockar |
| `downloads` | ❌ | ❌ | ❌ | **DÖTT** — ingen DB-tabell |
| `checkpoints` | ❌ | ❌ | ❌ | **DÖTT** — ingen DB-tabell |
| `decisions` | ❌ | ❌ | ❌ | **DÖTT** — ingen DB-tabell |
| `hostActions` | ❌ | ❌ | ❌ | **DÖTT** — bara i mockar |
| `outcomes` | ❌ | ❌ | ❌ | **DÖTT** — ingen mapper |
| `variants` | ❌ | ❌ | ❌ | **DÖTT** — ingen DB-tabell |
| `reflections` | ❌ | ❌ | ❌ | **DÖTT** — ingen mapper |
| `meta.version` | ❌ | ❌ | ❌ | **DÖTT** |
| `meta.owner` | ❌ | ❌ | ❌ | **DÖTT** |
| `meta.locale` | ❌ | ❌ | ❌ | **DÖTT** |

### Preview vs Full: Fält som skiljer

| Fält | Preview | Full | Kommentar |
|------|:-------:|:----:|-----------|
| roles | ❌ | ✅ | Lazy-loadas separat i preview |
| artifacts (+variants) | ❌ | ✅ | Lazy-loadas separat i preview |
| triggers | ❌ | ✅ | Lazy-loadas separat i preview |
| board_config | ✅ | ✅ | ✅ **Fixat** (Sprint A — A1) |
| tools | ✅ | ✅ | ✅ **Fixat** (Sprint A — A1) |

### Default-hantering per pipeline

| Fält | Preview/Full | Play | Konsistens |
|------|-------------|------|:----------:|
| `title` (steg) | `''` (tom sträng) | `'Steg ${index+1}'` (fallback) | ⚠️ Inkonsekvent |
| `playMode` | Direkt från enum | `null → 'basic'` (defensivt default) | ⚠️ Play har fallback |
| `board.theme` | Från DB eller `undefined` | `'neutral'` (default) | ⚠️ Bara Play har default |
| `tools.enabled` | Alla returneras | Bara `enabled=true` filtreras | ⚠️ Preview visar disabled tools |

---

## ⚡ Null/Empty/Default Semantik

> Verifierad 2026-03-10. Varje komponents beteende vid null/undefined/[]/'' data.

### Komponent-matris

| Komponent | null | undefined | `[]` | `''` | Returnerar null? |
|-----------|:----:|:---------:|:----:|:----:|:-----:|
| GameDetailAbout | ✅ Döljs | ✅ Döljs | N/A | ✅ Döljs | Ja |
| GameDetailSteps | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailMaterials | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailSafety | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailPreparation | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailPhases | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailGallery | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailAccessibility | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailRequirements | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailBoard | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailTools | ✅ Döljs | ✅ Döljs | ✅ Döljs | N/A | Ja |
| GameDetailRoles | Loading → fel | Loading → inget | Inget visas | N/A | Lazy-load |
| GameDetailArtifacts | Loading → fel | Loading → inget | Inget visas | N/A | Lazy-load |
| GameDetailTriggers | Loading → fel | Loading → inget | Inget visas | N/A | Lazy-load |
| GameDetailQuickFacts | **Tysta defaults** | **Tysta defaults** | N/A | N/A | Nej |

### ⚠️ QuickFacts tysta defaults (risk)

`GameDetailQuickFacts` visar fallback-värden när data saknas — användaren ser aldrig "okänd":

| Fält | Default vid null | Faktisk effekt |
|------|-----------------|----------------|
| minPlayers | 2 | Visar "2–20 spelare" även om inget angivits |
| maxPlayers | 20 | Visar "2–20 spelare" för alla spel utan data |
| durationMin | 10 | Visar "ca 10 min" som standard |
| ageMin | 0 | Visar "0–99 år" om inget angivits |
| ageMax | 99 | Visar "0–99 år" om inget angivits |
| energyLevel | 'medium' | Visar "Medel" som standard |

### Mapper-defaults (konsekvent mönster)

| Mapper-funktion | Input null/undefined | Returnerar |
|-----------------|---------------------|-----------|
| `mapSteps()` | `[]` | `GameStep[]` |
| `mapPhases()` | `[]` | `GamePhase[]` |
| `mapMaterials()` | `{ items: [] }` | `GameMaterialGroup` |
| `mapRoles()` | `[]` | `GameRole[]` |
| `mapArtifacts()` | `[]` | `GameArtifact[]` |
| `mapTriggers()` | `[]` | `GameTrigger[]` |
| `mapEnergyLevel()` | `null` | `EnergyLevel | null` |
| `mapPlayMode()` | `null` | `PlayMode | null` |
| `findCoverUrl()` | `null` | `string | null` |
| `findGalleryUrls()` | `[]` | `string[]` |

### Context-hooks: KASTAR om utanför Provider

`useGameDetail()`, `useGameDetailMode()`, `useGameDetailConfig()`, `useIsLocked()` — alla kastar `Error('useGameDetail must be used within a GameDetailProvider')` om de används utanför Provider.

**Risk:** Låg (alla användningar är inom Provider-boundary), men standalone-rendering av enskilda komponenter kräver Provider-wrapper.

---

## 🔢 Sektionsordning & Config-drivet rendering

> Verifierad 2026-03-10.

### Ordning: HÅRDKODAD i JSX (ej config-styrd)

Sektionsordningen bestäms av JSX-render i `app/app/games/[gameId]/page.tsx` (rad ~85–320):

```
 1. GameDetailHeader          [ALLTID]
 2. GameDetailBadges           [config.badges]
 3. GRID START
    VÄNSTER KOLUMN:
     4. GameDetailAbout         [config.about]
     5. GameDetailSteps         [config.steps]
     6. GameDetailMaterials     [config.materials]
     7. GameDetailSafety        [config.safety]
     8. GameDetailPreparation   [config.preparation]
     9. GameDetailAccessibility [config.accessibility]   ← P1
    10. GameDetailRequirements  [config.requirements]    ← P1
    11. GameDetailPhases        [config.phases]
    12. GameDetailBoard         [config.board]           ← P1
    13. GameDetailGallery       [config.gallery]
    14. GameDetailRoles         [config.roles]           ← Lazy
    15. GameDetailArtifacts     [config.artifacts]       ← Lazy
    16. GameDetailTriggers      [config.triggers]        ← Lazy
    17. GameDetailTools         [config.tools]           ← P1
    18. GameDetailQuickFacts    [config.quickFacts]
    HÖGER KOLUMN:
    19. GameDetailSidebar       [config.sidebar]
 4. Related Games section       [om relatedGames.length > 0]
```

### Config-systemet (visibility, EJ ordning)

`config.ts` styr **synlighet** (true/false) per sektion — INTE ordning.

#### Mode × PlayMode Visibility Matrix

| Sektion | preview | admin | host | basic Δ | facilitated Δ | participants Δ |
|---------|:-------:|:-----:|:----:|:-------:|:-------------:|:-----------:|
| header | ✅ | ✅ | ✅ | — | — | — |
| badges | ✅ | ✅ | ❌ | — | — | — |
| about | ✅ | ✅ | ❌ | — | — | — |
| steps | ✅ | ✅ | ✅ | — | — | — |
| materials | ✅ | ✅ | ✅ | — | — | — |
| safety | ✅ | ✅ | ✅ | — | — | — |
| preparation | ✅ | ✅ | ❌ | — | — | — |
| accessibility | ✅ | ✅ | ✅ | — | — | — |
| requirements | ✅ | ✅ | ✅ | — | — | — |
| phases | ✅ | ✅ | ✅ | ❌ dold | ✅ | ✅ |
| board | ✅ | ✅ | ✅ | ❌ dold | ✅ | ✅ |
| gallery | ✅ | ✅ | ❌ | — | — | — |
| roles | ✅ | ✅ | ✅ | ❌ dold | ❌ dold | ✅ |
| artifacts | ✅ | ✅ | ✅ | ❌ dold | ❌ dold | ✅ |
| triggers | ✅ | ✅ | ✅ | ❌ dold | ❌ dold | ✅ |
| tools | ✅ | ✅ | ✅ | ❌ dold | ✅ | ✅ |
| quickFacts | ✅ | ✅ | ❌ | — | — | — |
| sidebar | ✅ | ✅ | ❌ | — | — | — |
| adminActions | ❌ | ✅ | ❌ | — | — | — |

### Implikation: Ordning kräver JSX-refaktor

Att ändra ordning kräver manuell omflyttning av JSX-element. Eventuell framtida refaktor till `.map()`-baserad rendering från en ordningsdefinition.

---

## 🔒 Åtkomstkontroll & Låst-tillstånd

> Verifierad 2026-03-10.

### Nuvarande skyddsnivåer

| Lager | Implementering | Status |
|-------|---------------|--------|
| **Route-nivå (middleware)** | Ingen middleware i `app/app/games/[gameId]/` | ❌ Saknas |
| **Sida-nivå (auth check)** | `canViewGame()` i page.tsx kontrollerar auth + status | ✅ **LÖST** (Sprint A — A2/A5) |
| **Status-filtrering** | `canViewGame()` filtrerar: published → alla, draft → system_admin | ✅ **LÖST** (Sprint A — A3) |
| **DB-nivå (RLS)** | `createServerRlsClient()` används — Supabase RLS enforcar tenant-isolation | ✅ Finns |
| **Ägarskaps-check** | `canViewGame()` kombinerar app-logik med RLS | ✅ **LÖST** (Sprint A — A5) |

### Lazy-load API-routes: ✅ Auth + access-check implementerat (Sprint A)

| Endpoint | Auth check? | Ägarskaps-check? | Skydd |
|----------|:-----------:|:-----------------:|-------|
| `GET /api/games/[id]/roles` | ✅ | ✅ canViewGame() | Auth + RLS |
| `GET /api/games/[id]/artifacts` | ✅ | ✅ canViewGame() | Auth + RLS |
| `GET /api/games/[id]/triggers` | ✅ | ✅ canViewGame() | Auth + RLS |

~~**Risk:** Om RLS-policyn är "lös" (t.ex. alla autentiserade användare i tenant kan läsa alla spel) kan roller/artefakter/triggers läcka via direkt API-anrop.~~ ✅ **LÖST** — `canViewGame()` enforcar publicerad status + admin-only draft-åtkomst. Cache-Control: `private, max-age=60`.

### `isLocked`-tillstånd: HALV-IMPLEMENTERAD

| Aspekt | Status |
|--------|--------|
| `isLocked` i `GameDetailContextValue` | ✅ Definierad |
| Default i Provider | `false` (alltid olåst) |
| Sätts till `true` av page.tsx | ❌ Aldrig |
| Komponenter kontrollerar `useIsLocked()` | ❌ Ingen UI-logik |

**Slutsats:** isLocked finns i typsystemet men har ingen effekt. Betalande vs icke-betalande användare kan inte särskiljas i UI.

---

## 🌍 i18n Djupanalys — Hårdkodade strängar

> Verifierad 2026-03-10. Alla komponenter lästa rad för rad.

### Arkitektur: Labels-props med i18n via page.tsx ✅ LÖST (Sprint B)

Komponenterna tar emot `labels`-prop som populeras med `getTranslations('app.gameDetail')` i page.tsx. Svenska fallback-värden finns kvar som overridable defaults:

```tsx
// Pattern efter Sprint B — labels skickas från page.tsx:
<GameDetailAbout
  game={game}
  labels={{
    title: t('sections.about'),
    highlights: t('about.highlights'),
  }}
/>
```

~~### Hårdkodad-inventering per komponent~~

> **Sprint B (B1a–B1d) har löst detta.** Alla ~100+ hårdkodade svenska strängar har ersatts med i18n labels-props. Svenska defaults finns kvar som fallback i formatters/mappers men är overridable via labels-parameter. ~80 nya i18n-nycklar tillagda i sv/en/no.

### Hårdkodad-inventering per komponent

| Komponent | Hårdkodade strängar | Korrekt i18n-nyckel (finns i sv.json) |
|-----------|--------------------|-|
| GameDetailAbout | `'Om leken'`, `'Höjdpunkter'` | `app.gameDetail.sections.about` |
| GameDetailHeader | `'LEK'`, `'Tillbaka'` | `app.gameDetail.label`, `.backToBrowse` |
| GameDetailSteps | `'Instruktioner'`, `'steg'`, `'Valfritt'`, `'ca {min} min'` | `sections.instructions` |
| GameDetailRoles | `'Roller'`, `'Laddar roller...'` | `sections.roles` |
| GameDetailArtifacts | `'Artefakter'` | `sections.artifacts` |
| GameDetailTriggers | `'Händelser'` | `sections.triggers` |
| GameDetailMaterials | `'Material'` | `sections.materials` |
| GameDetailSafety | `'Säkerhet'` | `sections.safety` |
| GameDetailPreparation | `'Förberedelser'` | `sections.preparation` |
| GameDetailPhases | `'Faser'` | `sections.phases` |
| GameDetailQuickFacts | `'Snabbfakta'`, `'Deltagare'`, `'Tid'`, `'Ålder'`, `'Energinivå'`, `'Låg'`, `'Medium'`, `'Hög'` | Delvis `sections.details`, `energy.*` |
| GameDetailSidebar | `'Snabbinfo'`, `'Publicerad'`, `'Utkast'`, `'Tillagd'` | `sections.quickInfo`, `sidebar.*` |

### 🔴 Formatters — Helt hårdkodad svenska

`lib/game-display/formatters.ts` har **INGA i18n-anrop** — alla strängar är hårdkodade svenska:

| Formatter | Hårdkodade strängar | Påverkar |
|-----------|--------------------|-|
| `formatDuration()` | `'min'`, `'{min}-{max} min'` | Alla durationsvisningar |
| `formatPlayers()` | `'deltagare'`, `'Upp till {max} deltagare'` | Alla spelarantal |
| `formatAge()` | `'år'`, `'Upp till {max} år'` | Alla åldersvisningar |
| `ENERGY_CONFIG` | `'Låg energi'`, `'Medel energi'`, `'Hög energi'` + korta | Badges, QuickFacts |
| `PLAYMODE_CONFIG` | `'Enkel lek'`, `'Ledd aktivitet'`, `'Deltagarlek'` + beskrivningar | Badges, filter |
| `ENVIRONMENT_CONFIG` | `'Inomhus'`, `'Utomhus'`, `'Inne eller ute'` | Badges |
| `DIFFICULTY_CONFIG` | `'Lätt'`, `'Medel'`, `'Svår'` | Badges |

**Konsekvens:** I engelska UI ser användare svenska labels: "ca 10 min", "2–20 deltagare", "Hög energi".

### i18n-nycklar finns (i `messages/sv.json`) men ANVÄNDS INTE

`app.gameDetail.sections.*` har alla korrekta nycklar (about, instructions, materials, safety, preparation, phases, images, details, roles, artifacts, triggers, quickInfo, accessibility, requirements, board, tools). Dessa skickas INTE till komponenterna via `labels`-prop i `page.tsx`.

~~### Total: ~100+ hårdkodade strängar som borde vara i18n~~

> ✅ **LÖST** (Sprint B — B1a-B1d). 0 hårdkodade strängar i komponent-displaykod. Formatters har i18n label-overrides.

---

## ♿ Tillgänglighet (a11y)

> Verifierad 2026-03-10.

### Komponent-matris

| Komponent | Semantisk HTML | ARIA | Tangentbord | Rubrikhierarki | Alt-text | Status |
|-----------|:-:|:-:|:-:|:-:|:-:|:------:|
| Header | ✅ section, h1 | ❌ nav-länk saknar aria-label | ✅ | ✅ h1 | ✅ alt={title} | 🟡 |
| About | ✅ section, h2, ul | ❌ | ✅ | ✅ h2 | N/A | ✅ |
| Steps | ✅ section, ol, button | ❌ Saknar aria-expanded | ✅ | ✅ h2 | N/A | 🟡 |
| Materials | ✅ section, ul | ❌ | ✅ | ✅ h2 | N/A | ✅ |
| Safety | ✅ section, ul | ⚠️ Ikon utan aria-label | ✅ | ✅ h2 | N/A | 🟡 |
| Preparation | ✅ section, ul | ❌ | ✅ | ✅ h2 | N/A | ✅ |
| Phases | ✅ section, div | ❌ fas-items saknar aria-label | ✅ | ✅ h2 | N/A | 🟡 |
| Gallery | ✅ section, div | ❌ galleri saknar aria-label | ✅ | ✅ h2 | ✅ fallback | 🟡 |
| Roles | ✅ section, button | ✅ aria-expanded + aria-controls + fokus | ✅ | ✅ h2 | N/A | ✅ |
| Artifacts | ✅ section, button | ✅ aria-expanded + aria-controls + fokus | ✅ | ✅ h2 | N/A | ✅ |
| Triggers | ✅ section, button | ✅ aria-expanded + aria-controls + fokus | ✅ | ✅ h2 | N/A | ✅ |
| QuickFacts | ✅ section | ❌ stat-items saknar aria-label | ✅ | ✅ h2 | N/A | 🟡 |
| Sidebar | ✅ aside | ❌ **aside saknar aria-label** | ✅ | N/A | N/A | 🟡 |
| Badges | ✅ span | ❌ **Kompakt läge: ikon-only utan aria-label** | ✅ | N/A | N/A | ❌ |
| Board | ✅ section | ❌ grid-items saknar aria-label | ✅ | ✅ h2 | N/A | 🟡 |
| Tools | ✅ section | ❌ | ✅ | ✅ h2 | N/A | 🟡 |

### 🔴 Kritiska a11y-problem

| Problem | Påverkan | Antal komponenter | Prioritet |
|---------|----------|:-:|:-:|
| ~~**Saknar `aria-expanded` + `aria-controls` på toggle-knappar**~~ | ~~Skärmläsare annonserar inte expanderat/kollapsat tillstånd~~ | ~~3 (Roles, Artifacts, Triggers)~~ | ✅ **LÖST** (Sprint A — A4) |
| ~~**Ingen fokushantering vid lazy-load**~~ | ~~Användaren expanderar, innehåll laddas, fokus stannar på knappen~~ | ~~3 (Roles, Artifacts, Triggers)~~ | ✅ **LÖST** (Sprint A — A4) |
| **Ikon-only badges utan aria-label** | Färgblinda kan inte urskilja energinivå i kompakt läge | 1 (Badges) | P1 (backlog) |
| **aside utan aria-label** | Skärmläsare kan inte identifiera sidofältet | 1 (Sidebar) | P1 (backlog) |
| ~~**Ingen live region vid laddning**~~ | ~~Skärmläsare annonserar inte att innehåll laddas~~ | ~~3 (Roles, Artifacts, Triggers)~~ | ✅ **LÖST** (Sprint A — A4, role="region" + aria-label) |

### Styrkor

- ✅ Rubrikhierarki korrekt: h1 → h2 utan hopp
- ✅ Semantisk HTML konsekvent: section, aside, ol, ul, button
- ✅ Alt-text på bilder (cover + galleri) med fallback till speltitel
- ✅ Design-systemfärger med acceptabel kontrast (design tokens)
- ✅ Alla knappar är keyboard-nåbara

---

## ⚡ Prestanda & Payload

> Verifierad 2026-03-10.

### DB-anrop per sidladdning

| Anrop | Typ | Tidpunkt |
|-------|-----|---------|
| `getGameByIdPreview(gameId)` | Server (SSR) | Render |
| `getUserReactionForGame(game.id)` | Server (SSR) | Render |
| `getRelatedGames(dbGame, 4)` | Server (SSR) | Render |
| **TOTALT server-sida:** | **3 DB round-trips** | |
| `/api/games/[id]/roles` | Client (useEffect) | Component mount (bara participant-spel) |
| `/api/games/[id]/artifacts` | Client (useEffect) | Component mount |
| `/api/games/[id]/triggers` | Client (useEffect) | Component mount |
| **TOTALT med lazy:** | **Upp till 6 round-trips** | |

### Cachning: ✅ Implementerad (Sprint B — B2)

| Lager | Status | Kommentar |
|-------|:------:|-----------|
| React `cache()` | ✅ | `getGameByIdPreview` request-level dedup |
| Cache-Control headers | ✅ | Lazy-API: `private, max-age=60` |
| `generateStaticParams()` | ❌ | Ingen statisk generering (medvetet — RLS-beroende) |
| Next.js revalidation | ❌ | Ingen `revalidatePath/Tag` (medvetet val) |
| Browser cache | ✅ | Via `Cache-Control: private, max-age=60` |

### Lazy-load-beteende ✅ Fixat (Sprint B — B3)

| Komponent | Triggar vid | AbortController | Deduplikering |
|-----------|-----------|:---------------:|:-------------:|
| GameDetailRoles | `onClick` (expand) | ❌ | ✅ `hasFetched` ref |
| GameDetailArtifacts | `onClick` (expand) | ❌ | ✅ `hasFetched` ref |
| GameDetailTriggers | `onClick` (expand) | ❌ | ✅ `hasFetched` ref |

~~**Notering:** Lazy-sektioner fetchar vid **mount**, inte vid expand. Om komponenten re-renderas kan duplicerade requests skickas.~~ ✅ **LÖST** — fetch triggas vid expand-click, `hasFetched` ref förhindrar duplicerade requests.

### Bundle-splitting

- ❌ **Inga dynamic imports** — alla 15+ komponenter importeras statiskt
- ✅ Bildoptimering korrekt: `next/image` med responsive `sizes` och `priority` på cover

### Payload-uppskattning (lazy-API)

| Endpoint | Typisk storlek | Kommentar |
|----------|---------------|-----------|
| `/roles` | ~200–500 bytes/roll | Liten payload |
| `/artifacts` | ~2–5 KB/artefakt | Variants + JSON metadata ökar |
| `/triggers` | ~1–3 KB/trigger | condition/actions är JSON-blobbar |

---

## 🧪 Testluckor

> Verifierad 2026-03-10.

### Befintliga tester ✅ Uppdaterad (Sprint C)

| Fil | Typ | Antal | Täcker |
|-----|-----|:-----:|--------|
| `tests/game-display/roundtrip.test.ts` | Unit | 5 | mapDbGameToSummary, mapDetail{Preview,Full}, null-relationer, preview⊆full |
| `tests/game-display/mappers.test.ts` | Unit | 52 | 11 individuella mappers: steps, phases, materials, roles, artifacts, triggers, boardConfig, createMinimal, validate, searchResult, plannerBlock |
| `tests/game-display/formatters.test.ts` | Unit | 69 | Alla 14 formatters med valid, null/undefined, edge cases, i18n labels |
| `tests/game-display/config.test.ts` | Unit | 38 | Visibility matrix: 3×3 mode/playMode combos, helpers, immutability |
| `tests/game-display/null-safety.test.ts` | Unit | 58 | Null-safety: alla mappers + formatters med null/undefined/[]/{}. 3 main mappers med minimal/null/empty input |
| `tests/e2e/game-detail.spec.ts` | E2E | 7 | Browse→detail, badges, sidebar, steps, back-link, lazy expand, director preview |

**Totalt: 222 vitest-tester + 7 E2E Playwright-specs**

### ~~Saknade tester~~ → Resterande testluckor

| Kategori | Status | Antal | Prioritet |
|----------|--------|:-----:|:---------:|
| ~~**Mapper unit tests**~~ | ✅ KLAR (Sprint C — C1) | 52 | ✅ |
| ~~**Formatter unit tests**~~ | ✅ KLAR (Sprint C — C2) | 69 | ✅ |
| ~~**Config/visibility matrix**~~ | ✅ KLAR (Sprint C — C3) | 38 | ✅ |
| ~~**Null-rendering**~~ | ✅ KLAR (Sprint C — C4) | 58 | ✅ |
| ~~**E2E**~~ | ✅ KLAR (Sprint C — C7-C9) | 7 | ✅ |
| **Komponent-rendering** | ⬜ Backlog (kräver jsdom) | ~20 | 🟡 Medel |
| **API-route tests** | ⬜ Backlog | 3 | 🟡 Medel |
| **Integration** | ⬜ Backlog | 2 | 🟡 Medel |

### ⚠️ Vitest-environment: Inkompatibelt med komponent-tester

`vitest.config.ts` har `environment: 'node'` — saknar DOM, kan inte testa React-komponenter. Kräver byte till `jsdom` eller `happy-dom` för komponent-tester.

### Total testtäckning: ~85% av data layer

| Kategori | Befintligt | Saknas | Täckning |
|----------|:---------:|:------:|:--------:|
| Mapper unit tests | 5 filer | 0 | ~100% |
| Komponent-rendering | 0 | ~20 | 0% (backlog — jsdom) |
| API-route tests | 0 | 3 | 0% (backlog) |
| Integration | 0 | 2 | 0% (backlog) |
| E2E | 1 fil | 0 | ✅ 7 specs |

---

## 🔄 Builder → DB → Display Roundtrip

> Verifierad 2026-03-10.

### Roundtrip-coverage per typ

| Typ | Builder (`types/games.ts`) | DB-tabell | Display (`lib/game-display/types.ts`) | Builder UI | Mapper | Komponent | Status |
|-----|:---:|:---:|:---:|:---:|:---:|:---:|:------:|
| Steps | ✅ 15 fält | ✅ game_steps | ✅ GameStep | ✅ StepEditor | ✅ mapSteps | ✅ GameDetailSteps | ✓ Komplett |
| Phases | ✅ 12 fält | ✅ game_phases | ✅ GamePhase | ✅ PhaseEditor | ✅ mapPhases | ✅ GameDetailPhases | ✓ Komplett |
| Roles | ✅ 15 fält | ✅ game_roles | ✅ GameRole | ✅ RoleEditor | ✅ mapRoles | ✅ GameDetailRoles | ✓ Komplett |
| Materials | ✅ 6 fält | ✅ game_materials | ✅ GameMaterial | ✅ MaterialsForm | ✅ mapMaterials | ✅ GameDetailMaterials | ✓ Komplett |
| Artifacts | ✅ 9 fält | ✅ game_artifacts + variants | ✅ GameArtifact | ✅ ArtifactEditor | ✅ mapArtifacts | ✅ GameDetailArtifacts | ✓ Komplett |
| Triggers | ✅ 10 fält | ✅ game_triggers | ✅ GameTrigger | ✅ TriggerEditor | ✅ mapTriggers | ✅ GameDetailTriggers | ✓ Komplett |
| Board Config | ✅ 15 fält | ✅ game_board_config | ⚠️ boardWidgets[] | ✅ BoardEditor | ⚠️ mapBoardConfigToWidgets | ✅ GameDetailBoard | ⚠️ Partiell |
| Decisions | ✅ 12 fält | ❌ SAKNAS | ✅ GameDecision | ❌ | ❌ | ❌ | ✗ P2-block |
| Checkpoints | ❌ | ❌ SAKNAS | ✅ checkpoints[] | ❌ | ❌ | ❌ | ✗ P2-block |
| Variants | ❌ | ❌ SAKNAS | ✅ variants[] | ❌ | ❌ | ❌ | ✗ P2-block |
| Downloads | ❌ | ❌ SAKNAS | ✅ downloads[] | ❌ | ❌ | ❌ | ✗ P2-block |
| Outcomes | ❌ | ❌ SAKNAS | ✅ outcomes[] | ❌ | ❌ | ❌ | ✗ P2-block |
| Reflections | ❌ | ❌ SAKNAS | ✅ reflections[] | ❌ | ❌ | ❌ | ✗ P2-block |

### Fält som ~~går FÖRLORADE~~ nu MAPPAS i roundtrippen ✅ (Sprint C — C6)

| Builder-fält | DB-kolumn | Display-motsvarighet | Status |
|-------------|-----------|---------------------|:------:|
| `leader_tips` | `games.leader_tips` | ✅ `GameDetailData.leaderTips` | ✅ Mappas |
| `scaling_rules` | `game_roles.scaling_rules` | ✅ `GameRole.scalingRules` | ✅ Mappas |
| `conflicts_with` | `game_roles.conflicts_with` | ✅ `GameRole.conflictsWith` | ✅ Mappas |
| `conditional` | `game_steps.conditional` | ✅ `GameStep.conditional` | ✅ Mappas |

### Mock-data vs verklighet

| Fält i mocks | Kan skapas via builder? | Mapper finns? | Komponent finns? |
|-------------|:---:|:---:|:---:|
| highlights[] | ❌ | ❌ | ⚠️ (conditional i About) |
| outcomes[] | ❌ | ❌ | ❌ |
| downloads[] | ❌ | ❌ | ❌ |
| variants[] | ❌ | ❌ | ❌ |
| reflections[] | ❌ | ❌ | ❌ |
| decisions[] | ❌ | ❌ | ❌ |
| hostActions[] | ❌ | ❌ | ❌ |

**~42% av mock-fälten kan INTE produceras av buildern.**

---

## 🗑️ Döda fält & Orphan Features

> Verifierad 2026-03-10.

### Döda fält i `GameDetailData` ✅ Markerade `@planned P2` (Sprint C — C5)

> Alla 11 döda fält har fått `/** @planned P2 */` JSDoc-annotering i `lib/game-display/types.ts`.

| Fält | Typ | Anledning | Status |
|------|-----|----------|--------|
| `highlights` | `string[]` | Ingen mapper sätter detta — bara i mock-data | `@planned P2` |
| `downloads` | `string[]` | Ingen DB-tabell `game_downloads` | `@planned P2` |
| `checkpoints` | `string[]` | Ingen DB-tabell `game_checkpoints` | `@planned P2` |
| `decisions` | `GameDecision[]` | Ingen DB-tabell `game_decisions` | `@planned P2` |
| `hostActions` | `string[]` | Ingen mapper — bara i mock-data | `@planned P2` |
| `outcomes` | `string[]` | Ingen mapper extraherar outcomes | `@planned P2` |
| `variants` | `string[]` | Ingen DB-tabell `game_variants` | `@planned P2` |
| `reflections` | `string[]` | Ingen mapper — bara i mock-data | `@planned P2` |
| `meta.version` | `string` | Aldrig satt | `@planned P2` |
| `meta.owner` | `string` | Aldrig satt | `@planned P2` |
| `meta.locale` | `string` | Aldrig satt — next-intl hanterar locale | `@planned P2` |

**Totalt: 11 döda fält**

### Döda exports

| Export | Plats | Importeras? |
|--------|-------|:-----------:|
| `GameMetadata` (typ) | `lib/game-display/types.ts` | ❌ Aldrig |
| `GameDecision` (typ) | `lib/game-display/types.ts` | ⚠️ Bara sandbox mocks |

### Deprecated kod (kvar men markerad)

| Funktion | Plats | Ersättning | Anropas i prod? |
|----------|-------|-----------|:---------------:|
| `mapDbGameToDetail()` | `lib/game-display/mappers.ts` | `mapDbGameToDetail{Preview,Full}()` | ❌ |
| `getGameById()` | `lib/services/games.server.ts` | `getGameById{Preview,Full}()` | ❌ |
| `validateGameRefs()` | `app/admin/games/builder/utils/` | `lib/builder/resolver.ts` | ❌ |

### Villkor som alltid är false

| Komponent | Villkor | Alltid false? | Effekt |
|-----------|---------|:------------:|--------|
| GameDetailAbout | `game.highlights?.length > 0` | ✅ Ja | Highlights-rendering aldrig triggas |
| GameDetailAbout | `!description && highlights` | ✅ Ja | Fallback-render aldrig triggas |

### Test-only funktioner

| Funktion | Plats | Använd i produktion? |
|----------|-------|:--------------------:|
| `hasParticipantsData()` | `lib/game-display/types.ts` | ❌ Bara i test |
| `hasFacilitatedData()` | `lib/game-display/types.ts` | ❌ Bara i test |
| `isValidGameSummary()` | `lib/game-display/types.ts` | ❌ Bara i test |

---

## �📝 Ändringslogg

| Datum | Ändring |
|-------|---------|
| 2026-01-30 | Initial analys skapad |
| 2026-01-30 | ChatGPT-feedback implementerad (pipeline, disabled sections, A/B/C verifiering) |
| 2026-03-09 | **STOR UPPDATERING:** Fullständig kodinventering med exakta radantal, props, rendering-logik. P1-komponenter verifierade som integrerade i produktion. 9 nya element identifierade (outcomes, metadata, SEO, breadcrumbs, edit-knapp, skeletons, error boundary, print, related games). DB-migreringar dokumenterade (15 st). i18n-coverage kartlagd (60+ nycklar). Type system deep dive med duplicering-analys. Sandbox-status verifierad (464+535 rader). |
| 2026-03-10 | **10-PUNKTS DJUPAUDIT:** Lade till 10 nya sektioner (§11–§20) baserat på GPT-feedback. Preview/Full/Play paritetsjämförelse (board_config/tools-bugg identifierad). Null/empty/default-semantik dokumenterad per komponent (QuickFacts tysta defaults identifierat). Sektionsordning verifierad som hårdkodad JSX. Åtkomstkontroll: ingen app-nivå auth, lazy-API utan auth-check, isLocked halv-implementerad. i18n djupanalys: ~100+ hårdkodade svenska strängar i komponenter + formatters. a11y: 5 kritiska problem (aria-expanded saknas, fokushantering, ikon-only badges). Prestanda: 3+3 DB-anrop, ingen cachning, inga dynamic imports. Testluckor: ~3% täckning, 0 komponent-tester. Builder→Display roundtrip: 4 fält förloras (leader_tips, scaling_rules, conflicts_with, conditional), 42% av mock-fält kan ej produceras. 11 döda fält i GameDetailData. |
| 2026-03-11 | **SPRINT A+B+C STATUSUPPDATERING:** Risker mitigerade/stängda: ~~board_config/tools query parity~~ (A1), ~~auth saknas på sida/lazy-routes~~ (A2/A5), ~~statusfiltrering saknas~~ (A3), ~~aria-expanded/fokushantering saknas~~ (A4), ~~i18n 100+ hårdkodade strängar~~ (B1a-d), ~~ingen cachning~~ (B2), ~~lazy-load vid mount~~ (B3), ~~testtäckning 3%~~ (C1-C9 → 222 tester + 7 E2E), ~~döda fält omarkerade~~ (C5), ~~builder-fält förloras~~ (C6). Kvarvarande öppna: isLocked halv-implementerad, ikon-only badges utan aria-label, aside utan aria-label. Production Ready Gate: 10/10. |