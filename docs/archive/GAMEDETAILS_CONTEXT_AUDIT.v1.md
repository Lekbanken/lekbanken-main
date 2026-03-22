# GameDetails Context Audit - Djupanalys

## Metadata
- Status: archived
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: play
- Scope: Superseded GameDetails context audit v1

Superseded v1 audit snapshot retained for provenance. Use the active GameDetails context audit instead of this archived version for current findings.

---

## Executive Summary

Lekbankens speldata flödar genom ett **enhetligt typkontrakt** (`GameDetailData` → `GameSummary`) som konsumeras av 7+ distinkta kontexter. Arkitekturen har en stark grund med config-driven section visibility och en tydlig data-pipeline (DB → mapper → context → component). Men auditen avslöjar **fem strukturella problem**:

1. **Kontextmodellen har bara 3 lägen** (`preview | admin | host`) — men verkligheten har minst 7 distinkta kontexter med olika informationsbehov
2. **Participant-läge saknas helt** i GameDetails config — participants ser idag antingen ingenting (Play-domänen har egna komponenter) eller allt (om någon länk pekar till library-vyn)
3. **LeaderTips/leaderScript-separation** är korrekt i Play-API:t men **inte i GameDetails-komponenterna** — `GameDetailLeaderTips` renderas i preview-mode där alla (inklusive potentiella deltagare) kan se dem
4. **Sandbox driftar** från production — den testar komponentmatchning men inte kontextlogik; den saknar "participant mode"-toggle helt
5. **Play-domänen och GameDetails-domänen delar INGA komponenter** — de har parallella men inkompatibla typkontrakt (`GameStep.body` vs `Step.description`, `GameRole` vs runtime `RoleCardData`)

---

## 1. Kontextinventering

### 1.1 Identifierade kontexter

| # | Kontext | Route/yta | Primär roll | Verifierad |
|---|---------|-----------|-------------|------------|
| C1 | **Library Browse** | `/app/browse` | Lekledare (upptäckare) | 🟢 |
| C2 | **Library Game Detail** | `/app/games/[gameId]` | Lekledare (läsare/beslutsfattare) | 🟢 |
| C3 | **Director Preview** | `/app/games/[gameId]/director-preview` | Lekledare (förberedare) | 🟢 |
| C4 | **Host Session Cockpit** | `/participants/host/[sessionId]` | Lekledare (under körning) | 🟢 |
| C5 | **Host Play Mode** | Feature: `HostPlayMode` / `FacilitatorDashboard` | Lekledare (faciliterar live) | 🟢 |
| C6 | **Participant Play** | `/participants/view` + `ParticipantPlayView` | Deltagare (spelar) | 🟢 |
| C7 | **Public Board** | `/board/[code]` | Publik (åskådare/projektionsyta) | 🟢 |
| C8 | **Planner Play** | `/app/play/plan/[planId]` + `PlayPage` | Lekledare (kör plan) | 🟢 |
| C9 | **Admin Game View** | `/admin/games/builder` | System admin | 🟢 |
| C10 | **Sandbox** | `/sandbox/app/game-detail` | Utvecklare/Designer | 🟢 |

### 1.2 Kontextanalys per yta

#### C1: Library Browse
- **Användarens mål:** Hitta rätt lek snabbt
- **Behöver veta:** Titel, kort beskrivning, ålder, antal, energi, miljö, speltyp
- **Synligt/passivt:** Cover, badges, favorit-ikon, kategorier
- **Interaktivt:** Klicka för att öppna, favorit-toggle, filtrera
- **Döljas:** Allt detaljinnehåll (steg, material, etc.)
- **Bedömning:** ✅ Korrekt. `GameSummary` → `GameCard` matchar bra.

#### C2: Library Game Detail (Preview)
- **Användarens mål:** Bedöma om leken passar; förbereda sig
- **Behöver veta:** Allt content-relevant: steg, material, faser, säkerhet, tillgänglighet, outcomes
- **Synligt/passivt:** Gallery, quick facts, metadata, highlights
- **Interaktivt:** "Starta session", "Lägg till i plan", "Gilla", "Dela", "Director preview"
- **Bör döljas:** Ingenting — detta är den rikaste informationspresentationen
- **⚠️ Problem:** `leaderTips` visas publicly — dessa bör potentiellt vara gated bakom inloggning eller roll. En deltagare som surfar in från en delad länk kan se facilitator-tips.
- **⚠️ Problem:** `leaderScript` per steg finns i `GameStep`-kontraktet och mappas, men renderas INTE i GameDetailSteps — dock exponeras det i data-objektet som skickas till klienten.

#### C3: Director Preview
- **Användarens mål:** Se exakt vad Director Mode-vyn kommer visa under live-session
- **Behöver veta:** Steg med leaderScript, faser med timing, triggers, artifacts
- **Synligt/passivt:** Board-konfiguration, timer-settings
- **Interaktivt:** Steg-navigation (pil vänster/höger), fullscreen toggle
- **Bör döljas:** Badges, about, gallery, quickfacts, sidebar — allt som inte är runtime-relevant
- **Bedömning:** 🟢 Korrekt implementerat. Använder `getGameByIdFull()` och `DirectorModeDrawer` i preview-mode. Renderar INTE GameDetails-komponenter alls — helt separat komponentfamilj.
- **Notering:** Blockerar `participants`-mode spel med 404 (korrekt — inga facilitator-kontroller för rena deltagarspel).

#### C4: Host Session Cockpit
- **Användarens mål:** Hantera deltagare, styra session, se status
- **Behöver veta:** Deltagarantal, sessionsstatus, spelnamn
- **Synligt/passivt:** Session-kod, QR-länk
- **Interaktivt:** Start/stopp session, kick deltagare, öppna play mode
- **Bör döljas:** Allt spelinnehåll (det visas i play mode)
- **Bedömning:** 🟢 Korrekt. Använder inte GameDetails-komponenter alls — eget komponentset (`ParticipantList`, `SessionControlPanel`, `LiveProgressDashboard`).

#### C5: Host Play Mode (Live facilitering)
- **Användarens mål:** Köra spelet steg-för-steg, hantera roller/artifacts/triggers live
- **Behöver veta:** Aktuellt steg, timer, faser, leaderScript, tillgängliga triggers
- **Synligt/passivt:** Deltagarstatus, artifact-states, beslutresultat
- **Interaktivt:** Steg-navigation, fire triggers, reveal artifacts, assign roles, start/stop timer
- **Bör döljas:** Library-metadata (about, outcomes, gallery, highlights, badges, quickfacts)
- **Bedömning:** 🟢 Korrekt. `HostPlayMode` har helt egen komponentstruktur. Konsumerar `PlaySessionData` (eget API-kontrakt), inte `GameDetailData`.
- **🟡 Observation:** `HostPlayMode` konverterar `PlaySessionData` → `Run` via `playDataToRun()` — skapar ett lokalt format. Det finns en impedance mismatch mellan Play-domänens `Step` (description) och display-domänens `GameStep` (body).

#### C6: Participant Play
- **Användarens mål:** Spela — se sitt steg, sin roll, reagera på triggers
- **Behöver veta:** Aktuellt steg (titel + beskrivning), sin roll (om tilldelad), artifacts riktade till sig
- **Synligt/passivt:** Timer, fas-namn, board-meddelande
- **Interaktivt:** Signal-knappar, artifact-interaktion, besluts-röstning
- **Bör ABSOLUT döljas:** leaderScript, leaderTips, board-text (host-only), assignment_strategy, scaling_rules, secrets (förrän revealed)
- **Bedömning:** 🟢 API-nivå korrekt — `game/route.ts` strippar `leaderScript`, `boardText` och `leaderTips` explicit. Participant-cockpit-schema (`participantCockpit.schema.ts`) validerar att förbjudna fält aldrig förekommer.
- **✅ Bäst implementerad kontextlogik i hela systemet.**

#### C7: Public Board
- **Användarens mål:** Visa information för gruppen (projicerad yta)
- **Behöver veta:** Session-kod (QR), aktuellt fas-namn, board-meddelande, timer, revealed artifacts/decisions
- **Synligt/passivt:** Spelnamn, deltagarantal
- **Interaktivt:** Ingenting — read-only
- **Bör döljas:** Allt spelinnehåll, alla steg, alla roller, alla host-kontroller
- **Bedömning:** 🟢 Korrekt. `BoardClient` har eget API-kontrakt (`BoardApiResponse`), konsumerar INTE `GameDetailData`.

#### C8: Planner Play (Kör plan)
- **Användarens mål:** Köra en plan steg-för-steg
- **Behöver veta:** Aktuellt steg (titel, beskrivning, timer), materials, säkerhet
- **Synligt/passivt:** Steg-progress (3/7), total tid
- **Interaktivt:** Nästa/föregående steg, timer start/stopp/reset
- **Bedömning:** 🟡 `PlayPage` hämtar spelet via `/api/games/${gameId}` (legacy-endpoint), konverterar via `mapApiToGameRun()` till `GameRun` — ett tredje format skilt från både `GameDetailData` och `Run`.
- **⚠️ Problem:** `PlayPage` är den äldsta play-ytan och använder INTE `GameDetailData`-kontraktet alls. Den gör sin egen dataframing-logik.

#### C9: Admin Game View
- **Bedömning:** 🟢 Admin-ytan har config mode `'admin'` med alla sektioner synliga + adminActions. Korrekt avgränsad.

#### C10: Sandbox
- **Användarens mål:** Verifiera visuell regression, se alla sektioner med mock-data
- **Behöver veta:** Alla sektioner i alla modes
- **Interaktivt:** Mode-toggle (preview/admin/host), section overrides
- **⚠️ Problem:** Saknar `participant`-mode. Saknar director-preview-mode. Testar bara 3 av 7+ kontexter.
- **⚠️ Problem:** P2-mockdata (`DisabledSection`) kan ge falsk trygghet — den visar platshållare för sektioner som aldrig kommer att finnas i produktion.

---

## 2. Komponentaudit — Kontextkänslighet

### 2.1 Klassificeringsmodell

| Klass | Betydelse |
|-------|-----------|
| **Kontextneutral** | Kan säkert renderas i alla kontexter utan förändring |
| **Kontextkänslig (korrekt)** | Har rätt kontextlogik (config-driven eller roll-gated) |
| **Kontextkänslig (felaktig)** | Visas i kontexter där den inte borde, eller saknar kontextlogik |
| **Kontextexklusiv** | Hör hemma i exakt en kontext |

### 2.2 Komponent-för-komponent audit

| Komponent | Klass | Motivering | Prioritet |
|-----------|-------|------------|-----------|
| `GameDetailHeader` | Kontextneutral | Titel + cover — alltid relevant | ✅ OK |
| `GameDetailBadges` | Kontextkänslig (korrekt) | Döljs i host-mode via config. Relevant i preview. | ✅ OK |
| `GameDetailAbout` | Kontextkänslig (korrekt) | Döljs i host-mode. Korrekt. | ✅ OK |
| `GameDetailSteps` | **Kontextkänslig (delvis felaktig)** | Renderar `GameStep`-data inklusive `optional`, `conditional`, `durationMinutes` men INTE `leaderScript`. Fältets närvaro i data-objektet är dock en potentiell läcka. | ⚠️ Viktigt |
| `GameDetailMaterials` | Kontextneutral | Material-lista, alltid relevant | ✅ OK |
| `GameDetailSafety` | Kontextneutral | Säkerhet, alltid relevant | ✅ OK |
| `GameDetailPreparation` | Kontextkänslig (korrekt) | Döljs i host (redan förberedd) | ✅ OK |
| `GameDetailPhases` | Kontextkänslig (korrekt) | Döljs per playMode-filter (basic → none) | ✅ OK |
| `GameDetailGallery` | Kontextkänslig (korrekt) | Döljs i host (ej relevant under spel) | ✅ OK |
| `GameDetailRoles` | Kontextkänslig (korrekt) | Lazy-loaded, döljs per playMode | ✅ OK |
| `GameDetailArtifacts` | Kontextkänslig (korrekt) | Lazy-loaded, döljs per playMode | ✅ OK |
| `GameDetailTriggers` | Kontextkänslig (korrekt) | Lazy-loaded, döljs per playMode | ✅ OK |
| `GameDetailBoard` | Kontextkänslig (korrekt) | Döljs per playMode | ✅ OK |
| `GameDetailTools` | Kontextkänslig (korrekt) | Döljs per playMode | ✅ OK |
| `GameDetailQuickFacts` | Kontextkänslig (korrekt) | Döljs i host | ✅ OK |
| `GameDetailSidebar` | Kontextkänslig (korrekt) | Döljs i host | ✅ OK |
| `GameDetailActions` | Kontextkänslig (korrekt) | adminActions only i admin mode | ✅ OK |
| `GameDetailAccessibility` | Kontextkänslig (korrekt) | Synlig i host (adaptationer) | ✅ OK |
| `GameDetailRequirements` | Kontextkänslig (korrekt) | Döljs i host | ✅ OK |
| **`GameDetailLeaderTips`** | **Kontextkänslig (FELAKTIG)** | **Renderas i ALL modes inklusive preview. Alla inloggade användare (inklusive potentiella deltagare) kan se ledar-tips.** | 🔴 Kritiskt |
| `GameDetailMetadata` | Kontextkänslig (korrekt) | Metadata, döljs i host | ✅ OK |
| `GameDetailOutcomes` | Kontextkänslig (korrekt) | Lärandemål, döljs i host | ✅ OK |
| `GameDetailRelated` | Kontextneutral | Relaterade spel, alltid relevant i browse | ✅ OK |
| `DisabledSection` | Kontextexklusiv | Sandbox only | ✅ OK |

### 2.3 Play-domänens egna "GameDetails-komponenter"

Play-domänen har byggt **parallella, kontextspecifika komponenter** som löser samma behov som GameDetails men med runtime-logik:

| Play-komponent | Motsvarar GameDetails | Skillnad |
|----------------|----------------------|----------|
| `StepViewer` | `GameDetailSteps` | Runtime: timer, progress, navigation |
| `ParticipantStepStage` | `GameDetailSteps` | Participant: sanitized, animations |
| `DirectorStagePanel` | `GameDetailSteps` | Director: leaderScript synligt |
| `LeaderScriptPanel` | `GameDetailLeaderTips` | Runtime-only, per-step script |
| `RoleCard` / `ParticipantRoleSection` | `GameDetailRoles` | Runtime: assignment, secrets |
| `ArtifactsPanel` / `ParticipantArtifactDrawer` | `GameDetailArtifacts` | Runtime: reveal/highlight states |
| `TriggerPanel` / `TriggerLane` | `GameDetailTriggers` | Runtime: fire/cooldown states |
| `SignalPanel` | *(inget)* | Runtime-exclusive |
| `TimerControl` | *(inget)* | Runtime-exclusive |
| `NavigationControls` | *(inget)* | Runtime-exclusive |

**Slutsats:** Play-domänen har korrekt byggt EGNA komponenter istället för att återanvända GameDetails. Detta är **rätt arkitekturbeslut** — display-komponenter och runtime-komponenter har fundamentalt olika krav.

---

## 3. Informationsarkitektur — Problemanalys

### 3.1 LeaderTips: Informationsläcka i preview

| Fält | Preview (C2) | Director (C3) | Host Play (C5) | Participant (C6) | Board (C7) |
|------|-------------|---------------|-----------------|------------------|------------|
| `leaderTips` (game-level) | ⚠️ **SYNLIGT** | N/A (egna komp) | Via `LeaderScriptPanel` | 🟢 Strippad i API | ❌ Ej exponerad |
| `leaderScript` (per step) | 🟢 Ej renderad i UI | 🟢 Renderad | 🟢 Renderad | 🟢 Strippad i API | ❌ Ej exponerad |

**Risknivå:** 🔴 Kritisk

`GameDetailLeaderTips` renderas i preview-mode. `getSectionConfig('preview')` returnerar `leaderTips: true`. Varje inloggad användare som öppnar `/app/games/[gameId]` ser facilitator-tips — även om de är deltagare som enbart bör se spelinnehåll.

**Nuance:** I nuläget kräver alla routes under `/app/` autentisering, och systemet har inte explicita "deltagare"-användare som surfar library-sidan. Men:
- Lekledare kan dela länkar till `/app/games/[gameId]` med deltagare
- Om plattformen växer med organisationsbaserade licenser kan deltagare få tillgång till browse
- LeaderTips information kan förstöra spelupplevelsen om den ses i förväg

### 3.2 GameStep.leaderScript: Data finns men renderas inte i fel kontext

`mapDbGameToDetailPreview()` mappar `leader_script` → `GameStep.leaderScript`. Fältet finns i `GameDetailData`-objektet som skickas till klienten via Server Component → serialiseras till HTML.

`GameDetailSteps` renderar INTE `leaderScript` visuellt. Men:
- Fältet existerar i JSON-payloaden (inspekterbart via React DevTools / View Source)
- En tekniskt kunnig deltagare kan hitta leader-script-texten

**Risknivå:** 🟡 Viktigt (info-läcka via client-side data, ej via UI)

### 3.3 Roles: publicNote vs privateNote i preview

`GameDetailRoles` visar roller lazy-loaded via `/api/games/[id]/roles`. API:t returnerar ALLA fält inklusive `privateNote`, `secrets`, `assignmentStrategy`, `scalingRules`.

- **I Play-API** (`/api/play/sessions/[id]/roles`) strippas dessa korrekt
- **I Library-API** (`/api/games/[id]/roles`) strippas de **INTE** 🟢 — verifiering behövs

**Risknivå:** 🟡 Behöver manuell bekräftelse

### 3.4 Typkontrakt-fragmentering

Systemet har **fyra parallella representations-format** för spelinnehåll:

```
1. GameDetailData (lib/game-display/types.ts)
   └── GameStep { body, leaderScript, participantPrompt, boardText }
   └── GameRole { privateNote, secrets, assignmentStrategy }
   
2. Step / GameRun (features/play/types.ts)
   └── Step { description (≠ body), materials, safety }
   └── GameRun { summary, steps, environment }

3. PlaySessionData (features/play/api.ts)
   └── Custom format via getHostPlaySession()

4. BoardApiResponse (app/board/[code]/BoardClient.tsx)
   └── Flat response with revealed_public_variants
```

**Problem:** Ingen av dessa delar samma typkontrakt. En ändring i DB-schema kräver uppdatering på 4 ställen.

---

## 4. UX-/Designlogik — Kontextmismatch

### 4.1 Visuell hierarki-analys

| Kontext | Primär UX-signal | Aktuell implementation | Korrekt? |
|---------|------------------|----------------------|----------|
| C2: Library Detail | "Läs och bedöm" | ✅ Rik content, sidebar med CTA | ✅ |
| C3: Director Preview | "Öva och förbered" | ✅ Fullscreen, steg-nav | ✅ |
| C5: Host Play | "Genomför nu" | ✅ Timer, stora knappar, minimal content | ✅ |
| C6: Participant Play | "Spela" | ✅ Steg + animationer, minimal cognitive load | ✅ |
| C7: Board | "Titta hit" | ✅ Stor text, QR-kod, projektions-optimerad | ✅ |
| C10: Sandbox | "Testa komponenter" | ⚠️ Mode-toggle finns men saknar participant + director | ⚠️ |

### 4.2 Progressive disclosure-problem

`GameDetailLeaderTips` bryter mot progressive disclosure-principen:
- I library-kontexten signal det "förbered" — men lekledaren kanske enbart browsar
- Tips borde gömmas bakom interaktion (expanderbart?) eller vara gated per roll
- I host-kontexten är det operativt relevant och borde vara prominent

### 4.3 Action readiness per kontext

| Kontext | Förväntat nästa steg | Erbjuds? | CTA:er |
|---------|---------------------|----------|--------|
| C2: Library | "Starta session" eller "Lägg till i plan" | ✅ | `GameActionsWithPlanModal`, like/share |
| C3: Director Preview | "Stäng och starta riktig session" | 🟡 | Bara "stäng" (Esc/back-link) |
| C5: Host Play | "Nästa steg" | ✅ | Navigation, timer |
| C6: Participant | "Vänta" eller "Agera" | ✅ | Signal-knappar, artifact-interaktion |

**Director Preview saknar en tydlig "Starta riktig session"-bridge.**

---

## 5. Roll- och säkerhetslogik

### 5.1 Rollmatris

| Data | Lekledare (browse) | Lekledare (host/play) | Deltagare (play) | Publik board | Admin |
|------|-------------------|----------------------|-------------------|--------------|-------|
| Titel, beskrivning | ✅ | ✅ | ✅ (sanitized) | ✅ (titel) | ✅ |
| Steps | ✅ (alla) | ✅ (alla + leaderScript) | ✅ (sanitized) | ❌ | ✅ |
| leaderScript | 🟡 I data, ej UI | ✅ | 🟢 Strippad | ❌ | ✅ |
| leaderTips | ⚠️ **SYNLIGT** | ✅ | 🟢 Strippad i API | ❌ | ✅ |
| boardText | 🟡 I data, ej UI | ✅ | 🟢 Strippad | ❌ | ✅ |
| Roller (public) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Roller (private) | 🟡 Behöver verify | ✅ | 🟢 Strippad | ❌ | ✅ |
| Artifacts (alla) | ✅ | ✅ | ✅ (revealed only) | 🟡 (public revealed) | ✅ |
| Triggers | ✅ | ✅ | ❌ | ❌ | ✅ |
| Assignment strategy | 🟡 Behöver verify | ✅ | 🟢 Strippad | ❌ | ✅ |
| Scaling rules | 🟡 Behöver verify | ✅ | 🟢 Strippad | ❌ | ✅ |
| Reactions/likes | ✅ | ❌ (ej i play) | ❌ | ❌ | ✅ |
| Metadata (updatedAt) | ✅ | ❌ | ❌ | ❌ | ✅ |

### 5.2 Identifierade säkerhetsrisker

| Risk | Beskrivning | Allvar | Status |
|------|-------------|--------|--------|
| **S1** | `leaderTips` visas i Library preview | **Hög** — kan förstöra spelupplevelse | 🔴 Ej åtgärdat |
| **S2** | `leaderScript` finns i serialiserat data-objekt i preview | **Medium** — kräver DevTools för att hitta | 🟡 |
| **S3** | `/api/games/[id]/roles` kan returnera `privateNote`, `secrets` i library-kontext | **Hög** om bekräftad | 🟡 Kräver verifiering |
| **S4** | `boardText` per step finns i serialiserat data-objekt | **Låg** — boardText är semi-public | 🟢 Acceptabel |
| **S5** | Play API har korrekt dual-auth + field stripping | N/A | ✅ Säkert |

---

## 6. Sandbox: Driftanalys

### 6.1 Nuläge

Sandbox (`/sandbox/app/game-detail`) är en "golden reference" — den visar alla GameDetails-komponenter med mode-toggle (preview/admin/host) och section-överrides.

### 6.2 Problem

| Problem | Beskrivning | Impact |
|---------|-------------|--------|
| **SB1** | Saknar `participant`-mode | Kan inte verifiera att participant-gated content döljs korrekt |
| **SB2** | Saknar `director`-mode | Director-preview har helt egna komponenter — sandbox testar dem inte |
| **SB3** | P2 `DisabledSection`-platshållare | Ger falsk bild av framtida coverage |
| **SB4** | Mock-data innehåller `leaderTips` och `leaderScript` men sandbox visar inte om de borde döljas | Inga varnings-indikatorer för kontextkänsligt innehåll |
| **SB5** | Sandbox testar INTE Play-domänens komponenter | Helt separat sandbox under `/sandbox/play/` — men ingen cross-reference |

### 6.3 Vad sandbox gör rätt

- ✅ Använder exakt samma komponenter som production
- ✅ Config-driven visibility fungerar korrekt
- ✅ Coverage checklist mappar till DB-tabeller
- ✅ 4 testspel (basic, facilitated, participants, minimal) ger god bredd
- ✅ Data Provenance Panel visar datakällan per sektion

---

## 7. Typkontrakts-analys

### 7.1 Kontraktsrelationskarta

```
                    ┌──────────────────────┐
                    │   DB (Supabase)       │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │ DbGame      │  │ game_steps   │  │ game_roles   │
    │ (mappers.ts)│  │ game_phases  │  │ game_artifacts│
    └──────┬──────┘  │ game_tools   │  │ game_triggers│
           │         └──────┬───────┘  └──────┬───────┘
           │                │                 │
           ▼                │                 │
    ┌──────────────┐        │                 │
    │ GameDetailData│◄──────┘                 │
    │ (display)     │◄────────────────────────┘
    └──────┬───────┘
           │
   ┌───────┼───────────────┐
   │       │               │
   ▼       ▼               ▼
 page.tsx  sandbox      ???
 (preview) (reference)  (play - INTE kopplad)
 
 
    ┌──────────────┐
    │ game_steps   │──── /api/play/sessions/[id]/game ──▶ StepInfo ──▶ Step/StepData
    │ (direkt DB)  │                                     (play-domän)
    └──────────────┘
```

**Problemet:** Play-domänen mappar DIREKT från DB → eget format. Den passerar INTE genom `GameDetailData` / `mappers.ts`. Det innebär att ändringar i mappers.ts inte propagerar till play-domänen automatiskt.

### 7.2 Fältnamn-mismatch

| Koncept | `GameDetailData` | Play `Step` | Play `StepInfo` (API) |
|---------|------------------|-------------|----------------------|
| Stegtext | `body` | `description` | `description` + `content` |
| Tidlängd | `durationMinutes` | `durationMinutes` | `durationMinutes` + `duration` (seconds!) |
| Ledarmanus | `leaderScript` | *(saknas)* | `leaderScript` |
| Deltagar-prompt | `participantPrompt` | *(saknas)* | `participantPrompt` |

---

## 8. Prioriterad problemlista

### 🔴 Kritiskt (måste åtgärdas)

| ID | Problem | Beskrivning | Berörd kontext |
|----|---------|-------------|----------------|
| **P1** | LeaderTips i preview | `GameDetailLeaderTips` renderas i preview-mode och visar facilitator-tips för alla inloggade användare | C2 |
| **P2** | Roles API läcker potentiellt privat data | `/api/games/[id]/roles` kan returnera `privateNote`, `secrets`, `assignmentStrategy` i browse-kontext | C2 |

### 🟡 Viktigt (bör åtgärdas)

| ID | Problem | Beskrivning | Berörd kontext |
|----|---------|-------------|----------------|
| **P3** | leaderScript i serialiserat data | `GameStep.leaderScript` finns i Server Component-output men renderas inte | C2 |
| **P4** | Kontextmodellen har 3 lägen men 7+ kontexter | `GameDetailMode = 'preview' \| 'admin' \| 'host'` fångar inte participant/director/board/planner | Arkitektur |
| **P5** | Sandbox saknar participant/director modes | Testar inte kontextkänslig content-döljning för alla roller | C10 |
| **P6** | Typkontrakt-fragmentering | 4 parallella speldata-format utan gemensam rot | Systemomfattande |

### 🟢 Förbättring (bra att göra)

| ID | Problem | Beskrivning | Berörd kontext |
|----|---------|-------------|----------------|
| **P7** | Director Preview saknar "Starta session"-bridge | Ingen tydlig CTA efter förhandsvisning | C3 |
| **P8** | PlayPage (legacy) har eget mapping-format | `mapApiToGameRun()` är en tredje transformationspipeline | C8 |
| **P9** | Sandbox P2-placeholders | DisabledSection ger falsk framtidsbild | C10 |

### ⬜ Framtida

| ID | Problem | Beskrivning |
|----|---------|-------------|
| **P10** | Context capability matrix behöver formaliseras | Vilka capabilities finns per kontext? |
| **P11** | Cross-domain sandbox verification | No way to test GameDetails → Play transition |
| **P12** | Offline/disconnected mode för host | Host Play Mode kräver connectivity |

---

## 9. Falsk återanvändning — Varningslista

### 9.1 Var återanvändning fungerar (behåll)

- `GameSummary` → `GameCard` → Browse: ✅ Korrekt abstraktion
- `GameDetailData` → 22 sections → Library page: ✅ Korrekt — samma data, config-driven visibility
- Config-driven `getSectionConfig()`: ✅ Elegant mönster

### 9.2 Var återanvändning skulle vara FEL (gör inte)

| Scenario | Varför det är fel |
|----------|------------------|
| Använda `GameDetailSteps` i Play-mode | Steps i play kräver timer, navigation, progress — fundamentalt annan UX |
| Använda `GameDetailRoles` i Participant-mode | Participant ser sin TILLDELADE roll, inte rollkatalogen |
| Använda `GameDetailArtifacts` i Host Play | Host behöver reveal/highlight-kontroller, inte en display-lista |
| Använda `GameDetailTriggers` i Director | Director behöver fire-knappar, cooldown-states, inte en informationsvy |
| Använda `GameDetailPhases` i runtime | Runtime-faser kräver timer-integration, auto-advance, aktiv fas-markering |

### 9.3 Gränslandet — kräver designbeslut

| Scenario | Fråga |
|----------|-------|
| `GameDetailLeaderTips` i library vs host | Ska library visa tips alls? Eller bara host? Eller en förenklad version? |
| `GameDetailOutcomes` i host play | Ska host ha tillgång till lärandemål under körning? (Idag: `outcomes: false` i host-mode — korrekt?) |
| `GameDetailMaterials` i participant-view | Ska deltagare se materiallista? (Idag: nej — men vid self-serve-scenarios?) |

---

## 10. Sammanfattning: Systembedömning

### Styrkor
1. **Play-domänen har byggt korrekta, kontextspecifika komponenter** — ingen felaktig återanvändning av GameDetails i runtime
2. **Participant API-säkerhet är exemplarisk** — explicit field stripping + Zod-validering + security tripwire
3. **Config-driven section visibility** är ett bra mönster som fungerar väl för de 3 modes som finns
4. **Typ-systemet i display-domänen** (`GameSummary` → `GameDetailData`) är välstrukturerat

### Svagheter
1. **Kontextmodellen är för smal** — 3 modes räcker inte för 7+ kontexter
2. **leaderTips visas i preview** — informationsläcka som kan förstöra spelupplevelse
3. **Typkontrakt-fragmentering** — 4 parallella format utan gemensam rot gör systemet svårt att underhålla
4. **Sandbox testar bara display-kontexter** — inte runtime-kontexter
5. **Library API:er saknar potentiellt rollbaserad filtrering** för sensitiv rolldata

### Övergripande bedömning

Systemet är **arkitekturellt sunt på komponentnivå** — Play och GameDetails är korrekt separerade. Men **informationsarkitekturen** (vad som visas var, för vem) har luckor, framför allt i library/preview-kontexten där facilitator-content exponeras utan kontextlogik.

Den mest akuta risken är inte teknisk utan **UX-mässig**: att en deltagare ser ledarens tips innan spelet ens börjat, och därmed förstör den pedagogiska designen.
