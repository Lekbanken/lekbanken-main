# GameDetails Context Architecture — Målarkitektur

> **Datum:** 2026-03-10  
> **Förutsättning:** GAMEDETAILS_CONTEXT_AUDIT.md + GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md  
> **Syfte:** Definiera den stabila målarkitekturen för kontext- och rollmedveten speldata-presentation  
> **Status:** Referensdokument — uppdateras vid arkitekturella förändringar

---

## 1. Arkitekturprinciper

### P1: Kontext definierar information, inte teknik

> En komponent ska aldrig bestämma vad användaren får se. Det gör **kontexten** (mode + capabilities).

Komponenter tar emot data och renderar den. Vilken data som passeras bestäms av kontextlagret (config, capabilities, mappers). En `GameDetailLeaderTips`-komponent renderar tips den får — den har inget ansvar att avgöra *om* den ska renderas.

### P2: Display-domänen och Runtime-domänen delar aldrig komponenter

> GameDetails-komponenterna ÄR library/browse/preview/admin. Play-komponenterna ÄR runtime.

Att försöka återanvända en `GameDetailSteps`-komponent i play-mode kommer alltid att misslyckas — runtime kräver timer, progress, navigation, sanitering. Dessa är fundamentalt olika UX-behov.

**Delad data-kontrakt? Möjligt. Delade komponenter? Nej.**

### P3: Strikt field-level trust boundary

> Varje API-endpoint och varje Server Component SKA stripa fält som mottagaren inte behöver.

"Renderas inte i UI" är inte samma sak som "exponeras inte". Om data serialiseras till klienten är det tillgängligt. Trust boundary = server-sidan.

### P4: Config over code

> Visibility ska styras av deklarativ konfiguration, inte av `if (mode === 'host')` utspridda i komponenter.

`SECTION_VISIBILITY`-matrisen och `ContextCapabilities` centraliserar alla beslut. Komponenter konsumerar config — de kodar den inte.

### P5: Sandbox = kontextverifierare, inte bara komponent-galleri

> Sandbox ska verifiera att rätt information visas i rätt kontext — inte bara att komponenter renderas utan fel.

---

## 2. Lagerarkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                       │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
│  │  GameDetails Components  │  │  Play Runtime Components      │ │
│  │  (display-only)          │  │  (runtime-interactive)        │ │
│  │                          │  │                                │ │
│  │  • GameDetailHeader      │  │  • ParticipantPlayView         │ │
│  │  • GameDetailSteps       │  │  • DirectorModeDrawer          │ │
│  │  • GameDetailRoles       │  │  • HostPlayMode                │ │
│  │  • GameDetailLeaderTips  │  │  • StepViewer                  │ │
│  │  • ...22 komponenter     │  │  • NavigationControls          │ │
│  │                          │  │  • TriggerPanel                │ │
│  └──────────┬───────────────┘  └──────────┬───────────────────┘ │
│             │                              │                     │
│  ╔══════════╧══════════╗      ╔════════════╧═══════════╗        │
│  ║  Context Layer      ║      ║  Session Layer          ║        │
│  ║  (pure config)      ║      ║  (realtime state)       ║        │
│  ╚══════════╤══════════╝      ╚════════════╤═══════════╝        │
└─────────────┼──────────────────────────────┼────────────────────┘
              │                              │
┌─────────────┼──────────────────────────────┼────────────────────┐
│             │      DATA LAYER              │                     │
│  ┌──────────┴───────────┐      ┌───────────┴──────────────┐     │
│  │  Display Mappers      │      │  Play API                 │     │
│  │  mapDbGameToDetail*() │      │  /api/play/sessions/[id]/ │     │
│  │  mapDbGameToSummary() │      │  with field stripping     │     │
│  └──────────┬───────────┘      └───────────┬──────────────┘     │
│             │                              │                     │
│  ┌──────────┴──────────────────────────────┴──────────────┐     │
│  │                    Database (Supabase)                   │     │
│  │  games, game_steps, game_phases, game_roles,             │     │
│  │  game_artifacts, game_triggers, game_tools, game_media   │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### Ansvarsfördelning

| Lager | Ansvar | Får INTE |
|-------|--------|---------|
| **Presentation** | Rendera UI baserat på data + config | Bestämma visibility, hämta data, stripa fält |
| **Context** | Bestämma visibility + capabilities per mode | Hämta data, rendera UI |
| **Data (mappers)** | Transformera DB → typkontrakt, stripa fält | Rendera UI, bestämma visibility |
| **Data (API)** | Autentisera, sanitera, returnera rollbaserad data | Rendera UI |
| **Database** | Lagra data, RLS-policies | Affärslogik utöver RLS |

---

## 3. Kontextmodell

### 3.1 GameDetailMode (utökad)

```typescript
/**
 * Display contexts for GameDetails components.
 * 
 * Each mode defines:
 * 1. Which sections are visible (SectionVisibility)
 * 2. Which capabilities are available (ContextCapabilities)
 * 3. Which data fields should be populated (field-level contract)
 */
type GameDetailMode = 
  | 'preview'      // Library/browse — public, read-only, discovery
  | 'facilitator'  // Lekledare förbereder sig — preview + leader content
  | 'host'         // Lekledare kör spel — stripped, operational
  | 'admin';       // System admin — full access, editing
```

**Notering:** `participant`-mode definieras INTE i GameDetails. Deltagare konsumerar Play-domänens komponenter.

### 3.2 Kontextvalstrategi

| Kontext | Vald mode | Var väljs den? |
|---------|-----------|----------------|
| Library browse (cards) | N/A (GameSummary) | `GameCard` konsumerar `GameSummary` direkt |
| Library game detail | `preview` | `app/app/games/[gameId]/page.tsx` |
| Lekledare förbereder | `facilitator` | Ny route eller toggle på game detail page |
| Director preview | N/A (egna komponenter) | `DirectorModeDrawer` i preview-mode |
| Host play mode | N/A (egna komponenter) | `HostPlayMode` / `FacilitatorDashboard` |
| Participant play | N/A (egna komponenter) | `ParticipantPlayView` |
| Public board | N/A (eget API-kontrakt) | `BoardClient` |
| Planner play | N/A (legacy) | `PlayPage` |
| Admin | `admin` | Any admin route |
| Sandbox | Alla modes (toggle) | Sandbox UI |

---

## 4. Section Visibility Matrix

### 4.1 Fullständig matris

| Sektion | `preview` | `facilitator` | `host` | `admin` |
|---------|-----------|---------------|--------|---------|
| header | ✅ | ✅ | ✅ | ✅ |
| badges | ✅ | ✅ | ❌ | ✅ |
| about | ✅ | ✅ | ❌ | ✅ |
| steps | ✅ | ✅ | ✅ | ✅ |
| materials | ✅ | ✅ | ✅ | ✅ |
| safety | ✅ | ✅ | ✅ | ✅ |
| preparation | ✅ | ✅ | ❌ | ✅ |
| phases | ✅* | ✅* | ✅ | ✅ |
| gallery | ✅ | ✅ | ❌ | ✅ |
| roles | ✅* | ✅* | ✅ | ✅ |
| artifacts | ✅* | ✅* | ✅ | ✅ |
| triggers | ✅* | ✅* | ✅ | ✅ |
| quickFacts | ✅ | ✅ | ❌ | ✅ |
| sidebar | ✅ | ✅ | ❌ | ✅ |
| adminActions | ❌ | ❌ | ❌ | ✅ |
| accessibility | ✅ | ✅ | ✅ | ✅ |
| requirements | ✅ | ✅ | ❌ | ✅ |
| board | ✅* | ✅* | ✅ | ✅ |
| tools | ✅* | ✅* | ✅ | ✅ |
| **leaderTips** | **❌** | **✅** | **✅** | **✅** |
| metadata | ✅ | ✅ | ❌ | ✅ |
| outcomes | ✅ | ✅ | ❌ | ✅ |

`*` = Filtreras ytterligare per `playMode` (basic → av, facilitated → delvis, participants → allt)

**Nyckelskillnader `preview` → `facilitator`:**
- `leaderTips`: ❌ → ✅
- Steg renderar `leaderScript`-indikator: ❌ → 🟡 (visuell hint att leader-content finns)

---

## 5. Context Capabilities Matrix

### 5.1 Definition

```typescript
interface ContextCapabilities {
  // Information access
  canSeeLeaderTips: boolean;
  canSeeLeaderScript: boolean;
  canSeePrivateRoleFields: boolean;
  canSeeTriggerDetails: boolean;
  canSeeMetadata: boolean;
  
  // Actions
  canStartSession: boolean;
  canEditGame: boolean;
  canAddToPlan: boolean;
  canReact: boolean;       // like/dislike
  canShare: boolean;
  
  // Runtime (only meaningful in play context, but expressed for completeness)
  canFireTriggers: boolean;
  canAssignRoles: boolean;
  canRevealArtifacts: boolean;
  canControlTimer: boolean;
}
```

### 5.2 Capability-matris

| Capability | `preview` | `facilitator` | `host` | `admin` | Play (host) | Play (participant) |
|-----------|-----------|---------------|--------|---------|-------------|-------------------|
| canSeeLeaderTips | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| canSeeLeaderScript | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| canSeePrivateRoleFields | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| canSeeTriggerDetails | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| canSeeMetadata | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canStartSession | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canEditGame | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| canAddToPlan | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canReact | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canShare | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| canFireTriggers | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| canAssignRoles | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| canRevealArtifacts | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| canControlTimer | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 6. Komponentstrategi

### 6.1 Tre komponentfamiljer

```
┌──────────────────────────────────────────────────────┐
│ 1. DISPLAY COMPONENTS (GameDetails)                   │
│    Syfte: Presentera spelinnehåll för läsning/beslut  │
│    Kontext: preview, facilitator, admin               │
│    Interaktivitet: Minimal (expand/collapse, lazy)    │
│    Data: GameDetailData via context                   │
│                                                       │
│    Delade primitiver:                                 │
│    • Section layout (card + title + content)          │
│    • Badge rendering                                  │
│    • Material list                                    │
│    • Step list (read-only)                            │
│    • Role cards (read-only, public info)              │
│                                                       │
│    Kontextmedvetna:                                   │
│    • LeaderTips (facilitator/host only)               │
│    • AdminActions (admin only)                        │
│    • QuickFacts (ej host)                             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 2. HOST/DIRECTOR RUNTIME COMPONENTS (Play)            │
│    Syfte: Köra spel som facilitator                   │
│    Kontext: live session, Director Mode               │
│    Interaktivitet: Hög (timer, triggers, roles, nav)  │
│    Data: Play session API (saniterad för host)        │
│                                                       │
│    Unika komponenter:                                 │
│    • DirectorModeDrawer/Panel                         │
│    • StepViewer (med timer)                           │
│    • NavigationControls                               │
│    • TriggerPanel (fire-knappar)                      │
│    • ArtifactsPanel (reveal/highlight)                │
│    • RoleAssigner                                     │
│    • LeaderScriptPanel                                │
│    • SignalPanel                                      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 3. PARTICIPANT RUNTIME COMPONENTS (Play)              │
│    Syfte: Deltagare spelar                            │
│    Kontext: live session, participant view             │
│    Interaktivitet: Begränsad (signal, decision)       │
│    Data: Play session API (saniterad för participant)  │
│                                                       │
│    Unika komponenter:                                 │
│    • ParticipantPlayView                              │
│    • ParticipantStepStage                             │
│    • ParticipantRoleSection                            │
│    • ParticipantOverlayStack                          │
│    • ParticipantArtifactDrawer                        │
│    • ParticipantSignalMicroUI                         │
└──────────────────────────────────────────────────────┘
```

### 6.2 Vad som SKA vara delat (shared primitives)

| Primitiv | Konsumenter | Exempel |
|----------|-------------|---------|
| **Section layout** | Display + Sandbox | Card wrapper med titel, collapsible content |
| **Badge rendering** | Display + Browse cards | Energy, playMode, difficulty badges |
| **Formatters** | Display + Play | Duration, players range, age range |
| **Type guards** | All | `isValidGameSummary()`, `hasFacilitatedData()` |

### 6.3 Vad som SKA vara kontext-specifikt (INTE delat)

| Komponent | Varför inte delad | Rätt approach |
|-----------|-------------------|---------------|
| Steps i display vs play | Display = read-only list, Play = navigerbar med timer | Separata komponenter |
| Roles i display vs play | Display = katalog, Play = assigned role with secrets | Separata komponenter |
| Artifacts i display vs play | Display = referenslista, Play = reveal/interact states | Separata komponenter |
| Triggers i display vs play | Display = regel-beskrivning, Play = fire-knappar | Separata komponenter |
| LeaderTips i display vs play | Display = lista, Play = per-step script panel | Separata komponenter |

### 6.4 Vad som ALDRIG ska delas

| Komponent/data | Varför |
|----------------|--------|
| Timer/navigation controls | Runtime-exclusive, ingen display-kontext behöver dem |
| Signal system | Runtime-exclusive |
| Realtime subscription hooks | Runtime-exclusive |
| Participant token management | Runtime-exclusive |


---

## 7. Datakontrakts-strategi

### 7.1 Kontraktsflöden

```
                              ┌─────────────┐
                              │  Database    │
                              └──────┬──────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
            ┌────────────┐  ┌────────────┐  ┌────────────┐
            │ Display    │  │  Play Host │  │ Play Part. │
            │ Mappers    │  │  API       │  │ API        │
            └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
                  │               │               │
                  ▼               ▼               ▼
        ┌─────────────────┐ ┌────────────┐ ┌──────────────┐
        │ GameDetailData  │ │ HostView   │ │ Participant  │
        │ (full/preview)  │ │ (full+ops) │ │ View (safe)  │
        └────────┬────────┘ └────────────┘ └──────────────┘
                 │
     ┌───────────┼──────────┐
     │           │          │
     ▼           ▼          ▼
  preview   facilitator   admin
  (stripped)  (full)     (full+edit)
```

### 7.2 Datakontrakts-trio

| Kontrakt | Typ | Konsument | Fält som inkluderas | Fält som exkluderas |
|----------|-----|-----------|---------------------|---------------------|
| **GameDetailPublic** | `GameDetailData` (filtrerad) | preview mode | Allt utom leader content | `leaderTips`, `GameStep.leaderScript`, `GameStep.boardText`, `GameRole.privateNote`, `GameRole.secrets`, `GameRole.assignmentStrategy`, `GameRole.scalingRules` |
| **GameDetailFull** | `GameDetailData` (komplett) | facilitator, admin, host modes | Allt | Inget |
| **PlayParticipantSafe** | `StepInfo[]` (saniterad) | Participant | Steps utan host-fält, publika roller | `leaderScript`, `boardText`, `leaderTips`, `privateNote`, `secrets`, `assignmentStrategy`, `scalingRules` |

### 7.3 Field-stripning: Var sker det?

```
preview mode:
  DB → mapDbGameToDetailPreview() → page.tsx strips leader fields → GameDetailProvider → Components

facilitator mode:
  DB → mapDbGameToDetailFull() → GameDetailProvider → Components (full data)

admin mode:
  DB → mapDbGameToDetailFull() → GameDetailProvider → Components (full data)

host play:
  DB → /api/play/sessions/[id]/game → Full response (leaderScript included) → Play components

participant play:
  DB → /api/play/sessions/[id]/game → Sanitized response (leaderScript stripped) → Play components
```

---

## 8. Undvika drift

### 8.1 Kontraktsdrift

**Risk:** Display-kontraktet (`GameDetailData`) och Play-kontraktet (`StepInfo`) driftar isär när nya fält läggs till i DB.

**Mitigation:**
- Contract tests som snapshots av typdefinitioner
- Gemensam changelog i `lib/game-display/CHANGELOG.md`
- Explict dokumentera nya fält i båda kontrakt

### 8.2 UX-drift

**Risk:** Preview-mode och facilitator-mode visar olika mängd information men har samma visuella språk, vilket lär användaren att all info alltid finns.

**Mitigation:**
- `facilitator`-mode har en visuell indikator ("facilitator-läge") i header
- Sektioner som enbart syns i facilitator-mode har en subtil markering
- Sandbox cross-context diff-vy highlightar skillnader

### 8.3 Sandbox-drift

**Risk:** Sandbox mock-data speglar inte riktigt DB-data (saknade fält, extra fält).

**Mitigation:**
- Contract test: mock-games satisfies `GameDetailData` (redan implicit via TypeScript)
- Periodisk audit av sandbox mock vs DB content
- Data Provenance Panel (redan implementerad) —  uppdatera med listan av NYA fält

---

## 9. Rekommenderad filstruktur

```
lib/game-display/
├── types.ts              # GameSummary, GameDetailData, sub-types
├── mappers.ts            # mapDbGameToDetailPreview, mapDbGameToDetailFull, mapDbGameToSummary
├── access.ts             # canViewGame, requireGameAuth
├── formatters.ts         # Duration, range, energy formatters
├── field-filters.ts      # ← NY: stripLeaderFields(), stripPrivateRoleFields()
├── index.ts              # Barrel exports

components/game/GameDetails/
├── config.ts             # SectionVisibility, GameDetailMode, getSectionConfig
├── capabilities.ts       # ← NY: ContextCapabilities, getContextCapabilities
├── GameDetailContext.tsx  # Provider + hooks (expanded med capabilities)
├── types.ts              # Component prop types
├── GameDetail*.tsx        # 22 section components (oförändrade)
├── index.ts              # Barrel exports

features/play/
├── types.ts              # Step, Run, RunStep (SEPARAT — ej delad med display)
├── contracts/            # Participant schema validation
├── components/           # 80+ play-specifika komponenter
├── api.ts                # Play API client
```

---

## 10. Designregler framåt

### Regel 1: "Fråga om kontext"
Innan du lägger till en ny komponent eller sektion, fråga:
- I vilka modes ska detta vara synligt?
- Samlar detta information (display) eller styr det beteende (runtime)?
- Finns det fält som INTE ska exponeras i alla kontexter?

### Regel 2: "Config före if"
Lägg ALDRIG in `if (mode === 'host')` i en komponent. Lägg istället till ny section-visibility eller capability i config.ts.

### Regel 3: "Strippa vid källa"
Host-only-fält ska strippas i mapper/API — INTE i komponent. Komponenter ska aldrig ta emot data de inte borde rendera.

### Regel 4: "Sandbox validerar kontext"
Varje ny sektion ska visas i sandbox med:
- Alla modes togglade
- Kontextkänsliga fält markerade
- Verifiering att section döljs korrekt i restrictive modes

### Regel 5: "Display ≠ Runtime"
Om en komponent behöver timer, navigation, realtime-state, eller session-awareness — den hör hemma i Play-domänen, inte i GameDetails.

### Regel 6: "Participant ser aldrig leader content"
`leaderTips`, `leaderScript`, `boardText`, `privateNote`, `secrets`, `assignmentStrategy`, `scalingRules` — dessa fält EXISTERAR INTE i participant-facing data. Inte "döljs i UI" — de matas aldrig genom till klienten.

---

## 11. Migreringsvarning

### Vad som INTE ska ändras

- `GameSummary` → `GameCard` pipeline — fungerar korrekt
- Play-domänens egna komponenter — korrekt separerade
- `ParticipantCockpitSchema` — exemplarisk validation, behåll den
- Lazy-loading av roles/artifacts/triggers — korrekt mönster
- Config-driven section visibility — korrekt mönster (utöka, ändra inte)

### Vad som SKA ändras (Block 1–2)

- `SECTION_VISIBILITY.preview.leaderTips` → `false`
- Ny `facilitator` mode i `SECTION_VISIBILITY`
- `ContextCapabilities` interface + implementation
- Field stripping i preview mapper/page

### Vad som KAN ändras (Block 3–5)

- Sandbox mode-toggle utökas
- Cross-context diff-vy
- Director Preview → Session bridge CTA
- LeaderTips design i host-mode

### Vad som INTE bör ändras (arkitekturbeslut)

- Play-domänen ska INTE konsumera GameDetailData
- GameDetails ska INTE konsumera Play-typer
- Participant-mode ska INTE definieras i GameDetails config
- Board-komponenter ska INTE dela data-kontrakt med GameDetails
