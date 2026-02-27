# Artifact UI — Implementation Brief

> Claude's contract. One file, one truth.
> Read this FIRST. Reference `ARTIFACT_COMPONENTS.md` for detailed props/specs.
> Reference `ARTIFACT_MATRIX.md` for coverage verification.
> Reference `ARTIFACT_UI_CONTRACT.md` for data model and state machine.

**Version:** 1.0
**Datum:** 2026-02-23

---

## 1. Mål

### Director Mode (orkestrera)
Hosten ser artefakter som ett **kontrollrum**: snabb scanning, batch-operationer, state-kontroll, kopplingar till triggers/steg, per-artefakt historik. Informationstätheten är hög — Director vill se *allt* utan att klicka sig djupt.

### Participant View (uppleva)
Deltagaren ser artefakter som en **upplevelse-feed**: en sak i taget, minimal kognitiv last, tydlig progression (vad är nytt, vad har jag gjort), haptic/sound feedback. Aldrig överväldigad.

---

## 2. Non-Negotiables

Dessa regler är absoluta. Bryt mot en enda = revert.

| # | Regel |
|---|---|
| **N1** | Alla artifact actions i `ARTIFACT_MATRIX.md` måste ha en UI-path. Varje ✅ och 🔲 som byggs ska spåras tillbaka till matrisen. |
| **N2** | UI får ALDRIG kräva state som servern inte levererar. Participant ser ALDRIG `locked` — servern styr vad som skickas. 3-state-modellen gäller: **Highlighted → Available → Used**. Participant-label "Ny" är en *presentations-label* för highlighted-state, inte ett eget tillstånd. Director-label "Highlighted" är den explicita action/state-termen. |
| **N3** | `visibleFromStart` + lazy auto-reveal måste fungera. Artefakter med `metadata.visibleFromStart === true` auto-reveals via API:t — UI ska visa dem som `revealed` utan manuell director-aktion. |
| **N4** | Director och Participant får **konsekvent truth** om revealed/hidden. Samma `session_artifact_variant_state`-tabell, samma broadcast-events, samma seq-guard. |
| **N5** | `PlaySurface` äger alla desktop-borders. Inga nya `lg:border`-deklarationer i artifact-komponenter. (PLAY_UI_CONTRACT §1) |
| **N6** | `DrawerOverlay` äger drawer-chrome (titel + stäng-knapp). Artifact-drawer children renderar BARA content. (PLAY_UI_CONTRACT §2) |
| **N7** | Pill-label === drawer-title. Samma i18n-nyckel. Inga "drawer-only"-titlar. (PLAY_UI_CONTRACT §2) |
| **N8** | Alla `on*`-callbacks i realtime-hooks lagras via `useLatestRef`. Subscription-effects beror BARA på `sessionId`, `enabled`, supabase-klient. (PLAY_UI_CONTRACT §5) |
| **N9** | Server-broadcasts via `broadcastPlayEvent` — aldrig direkt `channel.send()`. (PLAY_UI_CONTRACT §7) |
| **N10** | `isVariantUsed()` är SSoT för "har deltagaren använt denna variant". Inga parallella checks. |
| **N11** | All text via i18n (`useTranslations`). Inga hårdkodade strängar. |
| **N12** | Blocking overlays: Decision modal > Story > Countdown. Artefakt-drawer är ALDRIG blocking. (PARTICIPANT_PLAY_UI_LAWS §3-4) |

---

## 3. Finns Redan — ANVÄND, DUPLICERA INTE

Dessa komponenter existerar och fungerar. Skriv inte om dem.

### 3.1 Shared Chrome (features/play/components/shared/)

| Komponent | Fil | Syfte | Regler |
|---|---|---|---|
| `PlaySurface` | shared/PlaySurface.tsx | Desktop-container, enda border-owner | ALLA vyer wrappas i denna |
| `PlayHeader` | shared/PlayHeader.tsx | Top bar (tillbaka, status, titel) | Aldrig `lg:border` |
| `PlayTopArea` | shared/PlayTopArea.tsx | Header → NowSummaryRow → ChipLane ordering | `NowSummaryRow` renderas HÄR |
| `NowSummaryRow` | shared/NowSummaryRow.tsx | Glanceable session status | Steg, tid, deltagare, signaler |
| `DrawerOverlay` | shared/DrawerOverlay.tsx | Bottom sheet (mobil) / modal (desktop) | Äger chrome + titel |
| `ChipLane` + `ChipLaneView` | shared/ChipLane.tsx | Notification chips (FIFO, dedup, TTL) | Director + Participant |
| `StatusPill` | shared/StatusPill.tsx | Connection + session state badge | — |
| `ProgressDots` | shared/ProgressDots.tsx | Step progress dots | — |
| `ConnectionBadge` | shared/ConnectionBadge.tsx | Network quality | — |
| `LeaderScriptSections` | shared/LeaderScript… | Structured leader-script renderer | Director only (amber panel) |
| `motion-tokens` | shared/motion-tokens.ts | CSS class tokens för animationer | Drawer, chip, stage, connection |
| `play-types` | shared/play-types.ts | `ConnectionState`, `SessionStatus` | — |

### 3.2 Director-Side (features/play/components/)

| Komponent | ~Rader | Status | Använd som |
|---|---|---|---|
| `DirectorModePanel` | 1503 | ✅ | Shell med tabs (play/time/artifacts/triggers/signals/events) |
| `DirectorStagePanel` | 297 | ✅ | Step-nav + glass pane + leader notes |
| `DirectorChipLane` | ~100 | ✅ | Signal/trigger/join chips |
| `ArtifactsPanel` | ~400 | ✅ | Artifact-lista, reveal/hide/highlight per variant |
| `BatchArtifactPanel` | ~350 | ✅ | Multi-select, 6 batch-ops, progress tracking |
| `DecisionsPanel` | 310 | ✅ | CRUD decisions, open/close/reveal |
| `OutcomePanel` | ~200 | ✅ | Skapa/reveal outcomes |
| `PuzzleProgressPanel` | 295 | ✅ | Puzzle-framsteg per deltagare/team |
| `PropConfirmationManager` | 344 | ✅ | Godkänn/avvisa prop-requests |
| `TriggerPanel` | — | ✅ | Trigger-hantering |
| `SignalPanel` | — | ✅ | Signal-hantering |
| `EventFeedPanel` | — | ✅ | Session event log |
| `TimeBankPanel` | — | ✅ | Time bank kontroll |
| `SessionTimeline` | — | ✅ | Tidslinje |

### 3.3 Participant-Side (features/play/components/)

| Komponent | ~Rader | Status | Använd som |
|---|---|---|---|
| `ParticipantPlayView` | 834 | ✅ | **Orkestrerare** — äger all state, delegerar rendering |
| `ParticipantStepStage` | 513 | ✅ | Stage med step content, timer, board message |
| `ParticipantOverlayStack` | 325 | ✅ | Overlay-prioritet + action bar + drawer toggles |
| `ParticipantArtifactDrawer` | 594 | ✅ | Artifact-feed (3-state: highlighted/available/used) |
| `ParticipantDecisionOverlay` | 379 | ✅ | Blocking modal + non-blocking drawer |
| `ParticipantRoleSection` | — | ✅ | Roll-info |
| `TriggerLane` | — | ✅ | Participant chip notifications |
| `ParticipantSignalMicroUI` | — | ✅ | Kompakt signal-indikator |
| `ParticipantTimeBankDisplay` | — | ✅ | Time bank countdown |

### 3.4 Puzzle Renderers (alla implementerade)

`PuzzleArtifactRenderer` (1123 rader) dispatchar till 16 sub-komponenter i `@/components/play`:
`RiddleInput`, `CounterDisplay`, `AudioPlayer`, `MultiAnswerForm`, `QRScanner`, `HintPanel`, `HotspotImage`, `TilePuzzle`, `CipherDecoder`, `LogicGrid`, `PropRequest`, `LocationCheck`, `SoundLevelMeter`, `SignalGeneratorUI`, `TimeBankStepUI`, `EmptyArtifactUI`.

**Rör inte dessa.** De är testade och lokaliserade.

---

## 4. Nya Komponenter att Bygga

Minimalt set. Varje komponent har ett tydligt syfte som inte täcks av existerande kod.

| # | Komponent | Placering | Syfte |
|---|---|---|---|
| **C1** | `ArtifactTypeIcon` | `features/play/components/shared/` | Konsekvent ikon per artifakttyp (22 typer → 22 ikoner). Extrahera från `BatchArtifactPanel`. |
| **C2** | `ArtifactBadge` | `features/play/components/shared/` | State + visibility + type badge. Extrahera från inline-rendering i `ArtifactsPanel`. |
| **C3** | `ArtifactCard` | `features/play/components/shared/` | Atomisk kort-rendering. Extrahera från `ParticipantArtifactDrawer` + `ArtifactsPanel`. Stödjer dense/comfortable/spacious density. |
| **C4** | `DirectorArtifactActions` | `features/play/components/` | State-medvetna action-knappar (reveal/hide/reset/highlight/pin). Visar BARA giltiga actions per state. Extrahera logik som idag är inline. |
| **C5** | `ArtifactInspector` | `features/play/components/` | Director sidebar: full detalj + variants + actions + links + config + timeline + notes. Öppnas vid klick på artifact i library. |
| **C6** | `ArtifactTimeline` | `features/play/components/` | Per-artefakt event-historik. Filtrera `SessionEvent[]` på `artifactId`. |
| **C7** | `ArtifactLinkPills` | `features/play/components/shared/` | Visa kopplingar: step, phase, triggers. Klickbara pills. |
| **C8** | `PinnedArtifactBar` | `features/play/components/` | Director pinned artifacts strip ovanpå/bredvid stage. Kompakta chips: ikon + titel + state-dot. |
| **C9** | `ParticipantOutcomeReveal` | `features/play/components/` | Participant outcome-display post-session. Award-style reveal. |

---

## 5. Layout-Skeleton

### 5.1 Director Mode

```
┌─────────────────────────────────────────────────────────┐
│ PlaySurface                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ PlayHeader · NowSummaryRow · DirectorChipLane       │ │
│ ├──────────┬────────────────────────┬─────────────────┤ │
│ │ Tab Rail │    Center Stage        │    Inspector    │ │
│ │          │                        │    (C5)         │ │
│ │ [Play]   │ DirectorStagePanel     │                 │ │
│ │ [Time]   │ ┌──────────────────┐   │ Öppnas vid      │ │
│ │ [Artif.] │ │ PinnedArtifact-  │   │ klick i         │ │
│ │ [Trig.]  │ │ Bar (C8)         │   │ artifact tab    │ │
│ │ [Sig.]   │ ├──────────────────┤   │                 │ │
│ │ [Events] │ │ Glass Pane       │   │ Visar:          │ │
│ │          │ │ (participant     │   │ · State badge   │ │
│ │ ──────── │ │  preview)        │   │ · Quick actions │ │
│ │ Tab      │ │                  │   │ · Variants      │ │
│ │ Content  │ │ Leader notes     │   │ · Link pills    │ │
│ │ (varies  │ └──────────────────┘   │ · Timeline      │ │
│ │  by tab) │                        │ · Config        │ │
│ │          │                        │ · Notes         │ │
│ ├──────────┴────────────────────────┴─────────────────┤ │
│ │ Director Controls (timer, step nav, end session)    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Artifacts-tab content** (vänster panel när "Artif." är aktiv):
```
┌────────────────────────────┐
│ [Filter ▼] [Search...   ]  │
│ [☐ Select all] [Batch ▼]  │
├────────────────────────────┤
│ ArtifactCard (C3, dense)   │  ← klick → öppnar Inspector (C5)
│ ArtifactCard (C3, dense)   │
│ ArtifactCard (C3, dense)   │
│ ...                        │
└────────────────────────────┘
```

**Inspector (C5)** är alltid synlig i höger rail _när_ en artefakt är vald. Stängs med ✕ → högra kolumnen kollapsar.

### 5.2 Participant View

```
┌──────────────────────────────┐
│ PlayHeader (titel, "Spelar som") │
│ NowSummaryRow                │
│ TriggerLane (chips)          │
├──────────────────────────────┤
│                              │
│   ParticipantStepStage       │  ← enda scroll-ytan
│   (step title, description,  │
│    timer, board msg, media,  │
│    materials, callout)       │
│                              │
├──────────────────────────────┤
│ Action Bar                   │
│ [🎒 Artefakter (3)] [🗳️ Beslut] │
│ [🎭 Roll] [🛠️ Verktyg]       │
└──────────────────────────────┘

    ↓ Tap "Artefakter" ↓

┌──────────────────────────────┐  ← DrawerOverlay (bottom sheet)
│ ✕  Artefakter                │  ← chrome owned by DrawerOverlay
├──────────────────────────────┤
│ ★ 2 nya · 5 tillgängliga    │  ← ArtifactInventoryStrip
│ [Visa senaste ↓]            │
├──────────────────────────────┤
│ ArtifactCard (C3, comfy)     │  ← highlighted: glow + "NYA"
│   └─ PuzzleRenderer inline   │
│                              │
│ ArtifactCard (C3, comfy)     │  ← available: normal
│   └─ ▶ Tryck för att visa    │  ← collapsed by default
│                              │
│ ArtifactCard (C3, comfy)     │  ← used: dimmed, ✓
│   └─ (collapsed)             │
└──────────────────────────────┘
```

---

## 6. Visuellt Språk — Artifact Tokens

Istället för 22 unika UI-varianter: ett konsekvent visuellt språk.

### 6.1 Surface Tokens

| Token | Var | CSS |
|---|---|---|
| `surface.card` | ArtifactCard | `rounded-lg border bg-card shadow-sm` |
| `surface.sheet` | DrawerOverlay | Befintlig — ändra inte |
| `surface.overlay` | Blocking overlays | Befintlig — ändra inte |
| `surface.inspector` | ArtifactInspector | `border-l bg-card` |

### 6.2 Status Tokens (visuella signaler)

| Status | Director-Signal | Participant-Signal | Tailwind |
|---|---|---|---|
| `hidden` | Faded kort, 👁‍🗨 | *(renderas inte)* | `opacity-50` |
| `revealed` | Full kort, 👁 grön dot | Normal kort | Default |
| `highlighted` | Grön glow ring | Pulse + "NYA"-badge | `ring-2 ring-primary animate-pulse` |
| `locked` | 🔒 amber border | *(renderas inte)* | `border-amber-400` |
| `solved` | ✓ grön bg | ✓ dimmed, collapsed | `bg-green-50 dark:bg-green-950/20` |
| `failed` | ✗ röd bg | ✗ attempt count | `bg-red-50 dark:bg-red-950/20` |
| `used` | — | Dimmed, ✓, collapsed | `opacity-60` |

### 6.3 Density Tokens

| Context | Density | `compact` prop | Card height |
|---|---|---|---|
| Director library | Dense | `compact={true}` | ~56px |
| Director inspector | Comfortable | `compact={false}` | auto |
| Participant drawer | Comfortable | `compact={false}` | ~72px collapsed |
| Participant expanded | Spacious | expanded state | auto |

### 6.4 Type Icon Map (C1 ska exportera detta)

```typescript
const ARTIFACT_TYPE_ICONS: Record<ArtifactType, string> = {
  card: '🃏', document: '📄', image: '🖼️',
  conversation_cards_collection: '🗣️',
  keypad: '🔐', riddle: '🧩', multi_answer: '☑️',
  audio: '🔊', hotspot: '🎯', tile_puzzle: '🧱',
  cipher: '🔣', logic_grid: '🔢',
  counter: '🔢', qr_gate: '📱', hint_container: '💡',
  prop_confirmation: '📦', location_check: '📍',
  sound_level: '🎙️', replay_marker: '🔖',
  signal_generator: '📡', time_bank_step: '⏳',
  empty_artifact: '◻️',
};
```

---

## 7. Coverage Lock

### 7.1 Per-komponent krav

Varje `ArtifactCard`-rendering MÅSTE visa:
1. **Type icon** (via `ArtifactTypeIcon` / C1)
2. **State badge** (via `ArtifactBadge` / C2)
3. **Available actions** (via `DirectorArtifactActions` / C4 för director, inline för participant)
4. **Link pills** (via `ArtifactLinkPills` / C7 — i inspector + library, ej participant)

### 7.2 Matrix-verifiering

Vid PR/commit: för varje påverkad `artifact_type`, dokumentera:
- ☐ Vilken UI-render path (card/sheet/overlay)?
- ☐ Vilka actions exponeras för director vs participant?
- ☐ Vilka states visas som badge?
- ☐ Vilka trigger-conditions/actions kopplas?

### 7.3 `visibleFromStart` coverage

Artefakter med `metadata.visibleFromStart === true`:
- API:t lazy-insertar `session_artifact_variant_state` med `revealed_at = now()` (redan implementerat)
- Director ser dem som `revealed` i artifact-listan (normal grön badge)
- Participant ser dem direkt i drawer vid session start (som `available`)
- Reset-action i director sätter tillbaka till hidden → auto-reveal triggas igen vid nästa fetch
- Batch-operations respekterar detta (reveal/hide fungerar normalt)

---

## 8. DO / DON'T

### DO ✅

- Extrahera existerande kod till nya komponenter (flytta, inte kopiera)
- Använd befintliga shared chrome-komponenter
- Respektera density: director = dense, participant = komfortabel
- Lägg nya shared-komponenter i `features/play/components/shared/`
- Lägg director-only-komponenter i `features/play/components/`
- Exportera alla nya komponenter via `features/play/components/index.ts`
- Använd befintliga i18n-nycklar — lägg till nya i `sv.json`, `en.json`, `no.json`
- Testa med `visibleFromStart` artifacts
- Verifiera mot `ARTIFACT_MATRIX.md` att varje typ har korrekt UI-path

### DON'T 🚫

- Skapa nya border-owners (bara `PlaySurface` äger `lg:border`)
- Duplicera DrawerOverlay-chrome i drawer-children
- Använda `locked` state i participant-vy
- Rendera artefakter baserat på state som servern inte levererar
- Använda direkt `channel.send()` — bara `broadcastPlayEvent`
- Skapa parallella "isUsed"-checks — bara `isVariantUsed()`
- Lägga `NowSummaryRow` utanför `PlayTopArea`
- Använda hårdkodade strängar — allt via `t()`-funktionen
- Flytta puzzle renderers — de är testade och lokaliserade i `@/components/play`
- Skapa nya scroll-containers i participant view (bara Stage scrollar)

---

## 9. Acceptance Criteria

### PR #1 — Foundations

- [ ] `ArtifactTypeIcon` renderar korrekt ikon för alla 22 typer
- [ ] `ArtifactTypeIcon` används i `BatchArtifactPanel` (ersätter inline map)
- [ ] `ArtifactBadge` visar state-ikon, state-label, visibility-pill, type-ikon
- [ ] `ArtifactBadge` används i `ArtifactsPanel` (ersätter inline rendering)
- [ ] `ArtifactCard` stödjer `density: dense | comfortable | spacious`
- [ ] `ArtifactCard` visar: type icon + state badge + title + expand/collapse
- [ ] `ArtifactCard` hanterar alla status tokens (hidden/revealed/highlighted/solved/failed/used)
- [ ] `ArtifactCard` integrerad i `ParticipantArtifactDrawer` (ersätter inline kort-rendering)
- [ ] `ArtifactCard` integrerad i `ArtifactsPanel` (ersätter inline kort-rendering)
- [ ] `DirectorArtifactActions` visar BARA giltiga actions per current state
- [ ] `DirectorArtifactActions` integrerad i `ArtifactsPanel`
- [ ] Alla nya komponenter exporteras via `features/play/components/index.ts`
- [ ] Alla strängar via i18n (inga hårdkodade)
- [ ] Inga nya `lg:border` deklarationer
- [ ] `visibleFromStart` artifacts visas korrekt i båda vyerna

### PR #2 — Director Inspector + Stage

- [ ] `ArtifactInspector` renderar i höger rail vid artifact-klick
- [ ] Inspector visar: header + quick actions + state + variants + links + config
- [ ] Inspector stängs med ✕ och höger kolumn kollapsar
- [ ] `ArtifactLinkPills` visar kopplingar till step/phase/triggers
- [ ] `PinnedArtifactBar` visar pinnlade artefakter ovanpå stage
- [ ] Pin-action i `DirectorArtifactActions` fungerar
- [ ] Inspector använder `ArtifactCard`, `ArtifactBadge`, `ArtifactLinkPills`
- [ ] Keyboard navigation fungerar (Tab genom artifacts, Enter för inspector)

### PR #3 — Timeline + History

- [ ] `ArtifactTimeline` filtrerar `SessionEvent[]` per `artifactId`
- [ ] Timeline visar: vem, vad, när med korrekt ikon per event-typ
- [ ] Timeline integrerad i `ArtifactInspector`
- [ ] Director notes-fält i inspector (fritt text, sparas lokalt/i metadata)

### PR #4 — Polish + Participant Outcomes

- [ ] `ParticipantOutcomeReveal` visar outcomes post-session
- [ ] Animation tokens applicerade konsekvent (reveal-in, highlight-pulse, dismiss-out)
- [ ] Empty states för alla paneler/drawers
- [ ] Accessibility: `aria-expanded`, `aria-label`, `aria-live` på alla artifact-cards
- [ ] Performance: lazy-load puzzle renderers (redan lazy i ParticipantArtifactDrawer)
- [ ] Image artifact fullscreen/zoom i participant drawer

---

## 10. Filstruktur (efter implementation)

```
features/play/components/
├── shared/
│   ├── ArtifactTypeIcon.tsx          ← C1 (ny)
│   ├── ArtifactBadge.tsx             ← C2 (ny)
│   ├── ArtifactCard.tsx              ← C3 (ny, extraherad)
│   ├── ArtifactLinkPills.tsx         ← C7 (ny)
│   ├── ChipLane.tsx                  ← befintlig
│   ├── ConnectionBadge.tsx           ← befintlig
│   ├── DrawerOverlay.tsx             ← befintlig
│   ├── LeaderScriptSections.tsx      ← befintlig
│   ├── motion-tokens.ts             ← befintlig
│   ├── NowSummaryRow.tsx            ← befintlig
│   ├── play-types.ts               ← befintlig
│   ├── PlayHeader.tsx               ← befintlig
│   ├── PlaySurface.tsx              ← befintlig
│   ├── PlayTopArea.tsx              ← befintlig
│   ├── ProgressDots.tsx             ← befintlig
│   ├── StatusPill.tsx               ← befintlig
│   ├── StepHeaderRow.tsx            ← befintlig
│   └── index.ts                     ← befintlig, uppdatera exports
│
├── ArtifactInspector.tsx             ← C5 (ny)
├── ArtifactTimeline.tsx              ← C6 (ny)
├── ArtifactsPanel.tsx                ← refactor → använd C1-C4
├── BatchArtifactPanel.tsx            ← refactor → använd C1
├── DirectorArtifactActions.tsx       ← C4 (ny, extraherad)
├── DirectorModePanel.tsx             ← refactor → inspector-slot
├── DirectorStagePanel.tsx            ← refactor → pinned-slot
├── ParticipantArtifactDrawer.tsx     ← refactor → använd C3
├── ParticipantOutcomeReveal.tsx      ← C9 (ny)
├── PinnedArtifactBar.tsx             ← C8 (ny)
├── PuzzleArtifactRenderer.tsx        ← ORÖRD
├── ...övriga befintliga...
└── index.ts                          ← uppdatera exports
```

---

## 11. Referensdokument

| Dokument | Syfte | Läs när |
|---|---|---|
| `ARTIFACT_UI_CONTRACT.md` | Datamodell, states, actions, visibility, broadcast | Du behöver veta vad en artefakt ÄR |
| `ARTIFACT_MATRIX.md` | Coverage-tabell (22 typer × 7 dimensioner) | Du vill verifiera att inget saknas |
| `ARTIFACT_COMPONENTS.md` | Detaljerade props, layout-wireframes, alla befintliga | Du behöver prop-specifikationer |
| `PLAY_UI_CONTRACT.md` | Layout-ägande, drawer-chrome, realtime-regler | Före varje ny komponent |
| `PARTICIPANT_PLAY_UI_LAWS.md` | Participant immutable layout-kontrakt | Före varje ändring i participant-vy |

---

*Denna brief är Claude's kontrakt. Följ den. Konsultera referensdokumenten vid tveksamhet. Uppdatera `ARTIFACT_MATRIX.md` status-symboler när features implementeras.*
