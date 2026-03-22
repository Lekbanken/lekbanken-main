# Play Mode UI Audit
## Granskning av adaptivt UI baserat på spelläge (play_mode)

## Metadata

- Owner: -
- Status: active audit
- Date: 2026-01-19
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Aktiv audit för play mode-UI, routing och state boundaries. Verifiera slutsatser mot nuvarande mode-komponenter innan större UI-ändringar.

**Datum:** 2026-01-19  
**Uppdaterad:** 2026-03-21  
**Status:** ✅ IMPLEMENTERAD (v2.7)

---

## Implementation Status (v2.7)

| Komponent | Status | Evidens |
|-----------|--------|---------|
| HostPlayMode viewType routing | ✅ Done | `caps.viewType` routar mellan `BasicPlayView` och `FacilitatedPlayView`; participants-intent degraderas via capability-systemet när roller saknas |
| ParticipantPlayMode gating | ✅ Done | basic → "Follow Board" card |
| useSessionCapabilities hook | ✅ Done | Graceful degradation + `show*` capability flags implemented |
| Contract tests | ✅ Verified | `play-mode-routing-contract.test.ts` + komponentkontrakt finns under `tests/unit/play/` |
| Translation keys | ✅ Done | en/sv/no `participantPlayMode.basic.*` |

**Key files changed:**
- [HostPlayMode.tsx](features/play/components/HostPlayMode.tsx) — capability-driven routing in active play mode
- [ParticipantPlayMode.tsx](features/play/components/ParticipantPlayMode.tsx) — participant-facing play-mode gating + recovery poll
- [useSessionCapabilities.ts](hooks/useSessionCapabilities.ts) — `determineViewType` + `show*` capability system

---

## 1. Sammanfattning

Enligt `PLAY_SYSTEM_DOCUMENTATION.md` och `inventory.json` var tanken att lekledarens gränssnitt (Host UI) skulle anpassas automatiskt baserat på spelets `play_mode`-inställning:

- **`basic`** → Enkelt interface (`SimplePlayView`)
- **`facilitated`** → Avancerat interface med faser, timer, board-toggle (`FacilitatedPlayView`)
- **`participants`** → Fullt interface med roller, triggers, artifacts (`ParticipantPlayMode`)

**~~Problem:~~ LÖST (v2.7):** Adaptiv routing nu implementerad. HostPlayMode routar till rätt vy baserat på `viewType` från `useSessionCapabilities`. ParticipantPlayMode gatar på `playMode`.

---

## 2. Dokumenterad design vs faktisk implementation

### 2.1 Vad inventory.json säger ska finnas

| Komponent | Beskrivning | Status |
|-----------|-------------|--------|
| `HostPlayMode` | Adapter som routar till rätt vy baserat på `viewType` | ✅ **IMPLEMENTERAD** |
| `BasicPlayView` | Enkelt interface för basic-lekar | ✅ Finns, används via routing |
| `FacilitatedPlayView` | Mellanläge med faser och board-toggle | ✅ Finns, används via routing |
| `ParticipantPlayMode` | Fullt interface för spel med roller + playMode gating | ✅ **IMPLEMENTERAD** |
| `useSessionCapabilities` | Hook för att bestämma viewType och feature flags | ✅ **IMPLEMENTERAD** |
| `lib/play-modes` | Service för play-mode-konfiguration | ❌ **EJ BEHÖVD** (inline i hook) |
| `features/play/components/shared/` | Delade komponenter för alla lägen | ❌ **TOM MAPP** (ej prioriterad) |
| `features/play/components/facilitated/` | Facilitated-specifika komponenter | ❌ **TOM MAPP** (ej prioriterad) |

### 2.2 Inventory-citat

Från `inventory.json`:
```
"v1.2: Added Adaptive Play Mode components (PlaySessionView, SimplePlayView, 
FacilitatedPlayView, shared/*, facilitated/*), useAdaptivePlayMode hook, 
and lib/play-modes service."
```

Och:
```
"Routes: isSimple->SimplePlayView, isFacilitated->FacilitatedPlayView, 
isParticipant->ParticipantPlayMode"
```

**Observation:** Inventory beskriver en design som aldrig implementerades fullt ut, eller som togs bort/aldrig mergades.

---

## 3. Nuvarande implementation

### 3.1 Host Session UI-flöde (faktiskt)

```
/app/play/sessions/[id]
    │
    └── HostSessionWithPlayClient (features/play/components/HostSessionWithPlay.tsx)
            │
            ├── [Lobby-läge]
            │   └── SessionHeader + SessionControls + ParticipantList
            │       └── LobbyTabs: participants | roles | settings | chat
            │
            └── [isPlayMode=true + hasGame + isLive]
                └── HostPlayMode (features/play/components/HostPlayMode.tsx)
          └── useSessionCapabilities(snapshotData)
            ├── viewType='basic'       → BasicPlayView
            └── viewType='facilitated'/'participants'
              → FacilitatedPlayView + capability-styrda paneler
```

### 3.2 Vad som faktiskt händer

1. **HostPlayMode routar nu på `viewType`** från `useSessionCapabilities(snapshotData)`.
2. **Graceful degradation gäller fortfarande:** participants utan roller och facilitated utan faser faller tillbaka till basic-vy.
3. **Capability-systemet styr detaljerna inom vyerna** via flaggor som `showPhaseNavigation`, `showToolbelt`, `showTriggersPanel`, `showBoardToggle` och dynamiska tabs.

### 3.3 Var play_mode faktiskt används

| Plats | Användning |
|-------|------------|
| `game-validator.ts` | Validerar att facilitated-spel har faser, participants-spel har roller |
| `useSessionCapabilities.ts` | Bestämmer `viewType`, degradering och vilka UI-ytor som ska visas |
| `HostPlayMode.tsx` | Routar till rätt host-vy baserat på capabilities |
| `ParticipantPlayMode.tsx` | Gatar participants i basic till "Follow Board" och skickar övriga modes till full cockpit |
| `GameAdminPage.tsx` | Visar badge med play_mode i speladmin-listan |
| `GameCardDrawer.tsx` | Visar play_mode-badge i detaljvy |
| `BrowsePage.tsx` | Filtrerar/visar play_mode i browse |
| `game-snapshot.ts` | Snapshot helpers som capability-hooken bygger vidare på |

**Observation:** `play_mode` påverkar nu runtime-UI, men genom capability-baserad routing och feature-hiding snarare än separata fullständigt frikopplade lägesimplementationer.

---

## 4. Planerad vs saknad funktionalitet

### 4.1 Enligt PLAY_SYSTEM_DOCUMENTATION.md

| Funktionalitet | Dokumenterad | Implementerad |
|----------------|--------------|---------------|
| `uiMode` (lobby/live/paused/ended) | ✅ Spec finns | ✅ Finns i `resolveUiState()` |
| `play_mode`-baserad UI-routing | ✅ Implicit (play_mode enum) | ✅ Implementerad via `useSessionCapabilities` |
| SimplePlayView för basic | ✅ Beskriven | ✅ Routad |
| FacilitatedPlayView för facilitated | ✅ Beskriven i inventory | ✅ Finns och används |
| Tabs anpassade per play_mode | ✅ Implicit | ✅ Delvis via capability-system och dynamiska tablistor |

### 4.2 Logisk konsekvens

En **basic** lek (t.ex. "Namnbollen" utan faser, triggers eller roller) får nu ett enklare interface med:
- Aktuellt steg
- Material-lista
- Simpel timer
- Start/Paus/Slut

De mer avancerade ytorna exponeras nu bara när capabilities motiverar dem. Kvarvarande förbättringsbehov ligger främst i hur långt capability-systemet bör driva separata vyer, inte i att routing saknas.

---

## 5. Kvarvarande begränsningar efter implementationen

### 5.1 SimplePlayView.tsx

```typescript
// Från features/play/components/SimplePlayView.tsx
// Används nu för basic-läget via capability-routing

export function SimplePlayView({ run, onStepComplete, ... })
  // Visar: PlayHeader, PlayTimer, InstructionsCard, MaterialsChecklist, NavigationControls
```

**Avsedd användning:** Endast för `play_mode = 'basic'`  
**Faktisk användning:** Matchar nu detta syfte

### 5.2 ParticipantPlayMode.tsx

```typescript
// Denna finns och gatar nu participants-läget korrekt
```

### 5.3 FacilitatorDashboard.tsx

```typescript
// Avancerad dashboard med capability-styrda paneler.
// Kvarvarande fråga är finare feature-hiding och vidare uppdelning,
// inte avsaknad av mode-routing.
// - Signal panel (borde bara visas om spelet använder signaler)
```

**Problem:** Alla dessa visas alltid, även för enkla lekar utan dessa features.

---

## 6. Rekommendationer

### 6.1 Alternativ A: Implementera adaptiv routing (fullständig)

Skapa den saknade infrastrukturen:

1. **Skapa `useAdaptivePlayMode.ts`** hook som returnerar:
   ```typescript
   { mode: 'simple' | 'facilitated' | 'participant', features: {...} }
   ```

2. **Skapa `PlaySessionView.tsx`** adapter:
   ```typescript
   if (mode === 'simple') return <SimplePlayView />;
   if (mode === 'facilitated') return <FacilitatedPlayView />;
   return <ParticipantPlayMode />;
   ```

3. **Skapa `FacilitatedPlayView.tsx`** — mellanläge

4. **Uppdatera HostPlayMode** att använda adaptern

### 6.2 Alternativ B: Dynamisk feature-hiding (minimal)

Behåll nuvarande arkitektur men dölj irrelevanta delar:

1. **Läs `play_mode` från snapshot** i `HostPlayMode`/`SessionCockpit`

2. **Villkorsstyrd rendering:**
   ```typescript
   {hasPhases && <PhaseNavigation />}
   {hasTriggers && <TriggerPanel />}
   {hasRoles && <RoleAssigner />}
   ```

3. **Dölj tomma tabs** — visa inte Triggers-tab om 0 triggers

### 6.3 Alternativ C: Rensa inventory, acceptera nuvarande design

1. **Ta bort felaktiga poster i `inventory.json`** som beskriver komponenter som inte finns
2. **Dokumentera** att alla lekar använder samma UI
3. **Skjut upp** adaptiv UI till framtida release

---

## 7. Påverkan på användarupplevelse

### 7.1 För enkla lekar (basic)

| Aspekt | Nuvarande | Önskat |
|--------|-----------|--------|
| Kognitiv last | Hög (6 tabs, triggers, roles etc.) | Låg (2-3 sektioner) |
| Onboarding | Förvirrande för nya lekledare | Enkel |
| Felrisk | Kan klicka fel i komplex UI | Minimal UI = färre fel |

### 7.2 För avancerade lekar (facilitated/participants)

| Aspekt | Nuvarande | Önskat |
|--------|-----------|--------|
| Funktionalitet | All funktionalitet tillgänglig | Samma |
| Överskådlighet | Kan vara överväldigande | Bättre organiserat per play_mode |

---

## 8. Filer att granska/ändra

| Fil | Ändring |
|-----|---------|
| `features/play/components/HostPlayMode.tsx` | Lägg till play_mode-check |
| `features/play/components/HostSessionWithPlay.tsx` | Hämta play_mode från session/snapshot |
| `features/play/components/SessionCockpit.tsx` | Villkorsstyr tabs baserat på play_mode |
| `features/play/components/SimplePlayView.tsx` | Behåll som basic-interface |
| `features/play/components/FacilitatedPlayView.tsx` | **SKAPA** om Alternativ A |
| `hooks/useAdaptivePlayMode.ts` | **SKAPA** om Alternativ A |
| `inventory.json` | **UPPDATERA** oavsett beslut |

---

## 9. Nästa steg

1. **Beslut:** Välj Alternativ A, B eller C
2. **Prioritering:** P1 (påverkar UX men ej blockerande) eller P2 (nice-to-have)
3. **Implementation:** Beroende på beslut

---

## 🔒 BESLUT

| Fält | Värde |
|------|-------|
| **Valt alternativ** | **A med hårda constraints** |
| **Rationale** | Full adaptiv routing ger bäst UX långsiktigt, men med B:s säkerhetsåtgärder: inga duplicerade datamodeller, återanvändning av containers, och capability-driven feature gating inom varje view. |
| **Scope** | P1 (~15-20h med constraints) |
| **Rollback** | Feature flag `ADAPTIVE_PLAY_UI=false` → fallback till nuvarande HostPlayMode |

### Hårda Constraints för A

| Constraint | Innebörd | Konsekvens |
|------------|----------|------------|
| **Ingen duplicerad datamodell** | Alla views använder exakt samma `PlaySessionData` och `Run` typ | Ingen ny Run-modell, ingen mappning |
| **Återanvänd containers** | BasicPlayView/FacilitatedPlayView är **layouts**, inte nya logik-komponenter | Samma `StepViewer`, `ArtifactsPanel`, `Toolbelt`, `SessionTimer` etc. |
| **Feature gating i views** | Även inom en view styrs paneler av capabilities, inte bara play_mode | `showArtifactsPanel` kollar `hasArtifacts`, inte bara viewType |
| **En hook, två outputs** | `useSessionCapabilities` returnerar både `viewType` OCH `show*` flaggor | Ingen separation mellan routing och gating |

### Vad detta ger oss

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   useSessionCapabilities(snapshot)                              │
│   ├── viewType: 'basic' | 'facilitated' | 'participants'       │
│   ├── capabilities: { hasSteps, hasArtifacts, ... }            │
│   └── ui: { showArtifactsPanel, showToolbelt, ... }            │
│                                                                 │
│   Views = LAYOUTS som komponerar SAMMA containers              │
│   ├── BasicPlayView      → StepViewer + Timer + [conditionals] │
│   ├── FacilitatedPlayView→ StepViewer + Phases + [conditionals]│
│   └── ParticipantPlayMode→ (befintlig, oförändrad)             │
│                                                                 │
│   Conditionals inom varje view:                                 │
│   ├── {caps.showArtifactsPanel && <ArtifactsPanel />}          │
│   ├── {caps.showToolbelt && <Toolbelt />}                      │
│   └── {caps.showTriggersPanel && <TriggersPanel />}            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Appendix: Relevanta kodreferenser

### play_mode enum (types/games.ts)
```typescript
export type PlayMode = 'basic' | 'facilitated' | 'participants';
```

### isSnapshotFacilitated (types/game-snapshot.ts)
```typescript
export function isSnapshotFacilitated(snapshot: GameSnapshotData): boolean {
  return (
    snapshot.game.play_mode === 'facilitated' ||
    snapshot.game.play_mode === 'participants'
  );
}
```

### Validation (features/admin/games/utils/game-validator.ts)
```typescript
if (game.play_mode === 'facilitated' && (!game.phases || game.phases.length === 0)) {
  // Warning: Facilitated games should have phases
}

if (game.play_mode === 'participants' && (!game.roles || game.roles.length === 0)) {
  // Warning: Participant games should have roles
}
```

---

## 11. DETALJERAD IMPLEMENTERINGSPLAN

> **Beslut:** Alternativ A med hårda constraints – full adaptiv routing MED capability-driven feature gating.

---

## 11.1 Arkitekturprinciper (HÅRDA CONSTRAINTS)

### Constraint 1: En datamodell

```typescript
// ❌ FÖRBJUDET: Ny datamodell
type BasicRun = { ... }  // NEJ!
type FacilitatedRun = { ... }  // NEJ!

// ✅ KORREKT: Återanvänd befintlig
import type { PlaySessionData } from '../api';  // Befintlig
import type { Run } from '../types';            // Befintlig

// Alla views tar samma props:
interface PlayViewProps {
  playData: PlaySessionData;
  caps: SessionCapabilities;
  sessionId: string;
  triggers: SessionTrigger[];
  onStepChange: (index: number) => void;
  onComplete: () => void;
}
```

### Constraint 2: Återanvänd containers

```typescript
// ❌ FÖRBJUDET: Duplicera StepViewer-logik
function BasicStepViewer({ ... }) { ... }  // NEJ!

// ✅ KORREKT: Importera befintlig
import { StepViewer } from './StepViewer';
import { ArtifactsPanel } from './ArtifactsPanel';
import { Toolbelt } from '@/features/tools/components/Toolbelt';
import { SessionTimer } from './SessionTimer';
// etc.
```

### Constraint 3: Feature gating i ALLA views

```typescript
// ❌ FÖRBJUDET: Hårdkoda att BasicPlayView inte har artifacts
function BasicPlayView() {
  return (
    <div>
      <StepViewer />
      {/* Ingen ArtifactsPanel – FEL! Basic KAN ha artifacts */}
    </div>
  );
}

// ✅ KORREKT: Capability-driven även i BasicPlayView
function BasicPlayView({ caps }) {
  return (
    <div>
      <StepViewer />
      {caps.showArtifactsPanel && <ArtifactsPanel />}
      {caps.showToolbelt && <Toolbelt />}
    </div>
  );
}
```

---

## 11.2 Unified Hook: useSessionCapabilities

> Kombinerar routing (viewType) + gating (show*) i EN hook.

```typescript
// hooks/useSessionCapabilities.ts

import { useMemo } from 'react';
import type { GameSnapshotData } from '@/types/game-snapshot';

const PUZZLE_TYPES = ['keypad', 'riddle', 'cipher', 'logic_grid', 'matching'] as const;

export type ViewType = 'basic' | 'facilitated' | 'participants';

export interface SessionCapabilities {
  // === ROUTING ===
  viewType: ViewType;
  intent: ViewType; // Original play_mode (för analytics/debug)
  
  // === DATA CAPABILITIES ===
  hasSteps: boolean;
  hasPhases: boolean;
  hasRoles: boolean;
  hasArtifacts: boolean;
  hasTriggers: boolean;
  hasTools: boolean;
  hasBoard: boolean;
  hasPuzzles: boolean;
  hasProps: boolean;
  
  // === UI GATING (capability-driven) ===
  showPhaseNavigation: boolean;
  showRoleAssigner: boolean;
  showTriggersPanel: boolean;
  showDirectorMode: boolean;
  showToolbelt: boolean;
  showArtifactsPanel: boolean;
  showDecisionsPanel: boolean;
  showOutcomePanel: boolean;
  showBoardToggle: boolean;
  showChat: boolean;
  showPuzzlesPanel: boolean;
  showPropsManager: boolean;
  
  // === TAB CONFIGURATION ===
  visibleTabs: ('play' | 'content' | 'manage')[];
  contentSubTabs: ('artifacts' | 'puzzles' | 'decisions' | 'outcome')[];
  manageSubTabs: ('roles' | 'triggers' | 'settings')[];
}

export function useSessionCapabilities(
  snapshot: GameSnapshotData | null
): SessionCapabilities {
  return useMemo(() => {
    if (!snapshot) return getDefaultCapabilities();

    // === EXTRACT DATA ===
    const intent = snapshot.game.play_mode ?? 'basic';
    const hasSteps = (snapshot.steps?.length ?? 0) > 0;
    const hasPhases = (snapshot.phases?.length ?? 0) > 0;
    const hasRoles = (snapshot.roles?.length ?? 0) > 0;
    const hasArtifacts = (snapshot.artifacts?.length ?? 0) > 0;
    const hasTriggers = (snapshot.triggers?.length ?? 0) > 0;
    const hasTools = Boolean(snapshot.game.enabled_tools?.length);
    const hasBoard = snapshot.board_config !== null;
    const hasPuzzles = snapshot.artifacts?.some(
      a => PUZZLE_TYPES.includes(a.artifact_type as typeof PUZZLE_TYPES[number])
    ) ?? false;
    const hasProps = snapshot.artifacts?.some(
      a => a.artifact_type === 'prop'
    ) ?? false;

    // === DETERMINE VIEW TYPE ===
    // Fallback: if play_mode requires data that doesn't exist, downgrade
    let viewType: ViewType;
    if (intent === 'participants' && hasRoles) {
      viewType = 'participants';
    } else if (intent === 'facilitated' && hasPhases) {
      viewType = 'facilitated';
    } else if (intent === 'facilitated' && !hasPhases) {
      viewType = 'basic'; // Graceful degradation
    } else if (intent === 'participants' && !hasRoles) {
      viewType = 'basic'; // Graceful degradation
    } else {
      viewType = 'basic';
    }

    const isAdvanced = viewType !== 'basic';

    // === BUILD UI GATING ===
    const showPhaseNavigation = hasPhases && isAdvanced;
    const showRoleAssigner = hasRoles && viewType === 'participants';
    const showTriggersPanel = hasTriggers;
    const showDirectorMode = hasTriggers && isAdvanced;
    const showToolbelt = hasTools;
    const showArtifactsPanel = hasArtifacts;
    const showDecisionsPanel = isAdvanced;
    const showOutcomePanel = isAdvanced;
    const showBoardToggle = hasBoard && isAdvanced;
    const showChat = isAdvanced;
    const showPuzzlesPanel = hasPuzzles;
    const showPropsManager = hasProps;

    // === BUILD TABS ===
    const visibleTabs = buildVisibleTabs(viewType, { hasArtifacts, hasTriggers, hasRoles, hasPuzzles });
    const contentSubTabs = buildContentSubTabs({ hasArtifacts, hasPuzzles, isAdvanced });
    const manageSubTabs = buildManageSubTabs(viewType, { hasRoles, hasTriggers });

    return {
      viewType, intent,
      hasSteps, hasPhases, hasRoles, hasArtifacts, hasTriggers, hasTools, hasBoard, hasPuzzles, hasProps,
      showPhaseNavigation, showRoleAssigner, showTriggersPanel, showDirectorMode,
      showToolbelt, showArtifactsPanel, showDecisionsPanel, showOutcomePanel,
      showBoardToggle, showChat, showPuzzlesPanel, showPropsManager,
      visibleTabs, contentSubTabs, manageSubTabs,
    };
  }, [snapshot]);
}

// Helper functions (buildVisibleTabs, buildContentSubTabs, buildManageSubTabs)
// Se fullständig implementation i sektion 16.2.1
```

---

## 11.3 Features – stöd vs synlighet

| Feature | Stöd | Synlighet (UI Gating) |
|---------|------|----------------------|
| **Steps** | ✅ Alla | ✅ Alltid |
| **Artifacts** | ✅ Alla | `hasArtifacts` |
| **Tools** | ✅ Alla | `hasTools` + scope-filter |
| **Triggers** | ✅ Alla | `hasTriggers` |
| **Director Mode** | ✅ advanced | `hasTriggers && isAdvanced` |
| **Phases** | ✅ advanced | `hasPhases && isAdvanced` |
| **Roles** | ✅ participants | `hasRoles && viewType === 'participants'` |
| **Decisions** | ✅ advanced | `isAdvanced` |
| **Puzzles** | ✅ Alla | `hasPuzzles` |
| **Props** | ✅ Alla | `hasProps` |
| **Board** | ✅ advanced | `hasBoard && isAdvanced` |
| **Chat** | ✅ advanced | `isAdvanced` |

**Nyckelprincip:** `play_mode` är **intent**, capabilities (data) styr **vad som faktiskt renderas**.

---

## 11.4 Artifact-typer som stöds

Alla dessa artifact_type-värden måste fungera oavsett play_mode:

```typescript
// Puzzle-typer för hasPuzzles-check
const PUZZLE_TYPES = ['keypad', 'riddle', 'cipher', 'logic_grid', 'matching'] as const;

type ArtifactType =
  | 'document'          // PDF, text
  | 'media'             // Bilder, video
  | 'audio'             // Ljudfiler
  | 'keypad'            // Kodlås med valideringslogik
  | 'riddle'            // Gåtor med hints
  | 'cipher'            // Krypteringsutmaningar
  | 'hotspot'           // Klickbara bildkartor
  | 'logic_grid'        // Logikpussel
  | 'matching'          // Matchningsövningar
  | 'conversation_cards'// Samtalskort-samlingar
  | 'prop'              // Fysiska rekvisita
  | 'coach_diagram'     // Coach-diagram (bygger under session)
  | 'overlay'           // Visuella overlays
  | 'countdown'         // Nedräkningstimers
  | 'scoreboard'        // Poängtavlor
  | 'clue'              // Ledtrådar
  | 'hint_progressive'  // Progressiva hints
  | 'role_specific'     // Rollspecifika artifacts
  | 'phase_gated'       // Fasbaserade artifacts
  | 'trigger_revealed'  // Trigger-aktiverade artifacts
  | 'collection'        // Samlingar av ovanstående
```

**Implementation:** `ArtifactsPanel` redan hanterar alla typer – behöver bara inkluderas i alla views.

### 11.5 Tools-integration

Från `features/tools/registry.ts`:

```typescript
const TOOLS = {
  dice_roller_v1: { scope: 'both' },        // Host + Participants
  coach_diagram_builder_v1: { scope: 'host' }, // Endast host
  conversation_cards_v1: { scope: 'both' },    // Host + Participants
};
```

**Implementation:** `Toolbelt` komponent inkluderas i alla views där `caps.showToolbelt === true`.

> Befintlig `isScopeAllowedForRole()` i `features/tools/types.ts` hanterar scope-filtrering.

---

## 12. IMPLEMENTERINGSSTEG

### 12.1 Fas 1: Hook (Dag 1, ~3h)

Skapa `hooks/useSessionCapabilities.ts` enligt sektion 11.2.

```bash
# Fil att skapa:
hooks/useSessionCapabilities.ts
```

### 12.2 Fas 2: BasicPlayView Layout (Dag 1-2, ~3h)

```typescript
// features/play/components/BasicPlayView.tsx
// LAYOUT – använder befintliga containers, INGEN ny logik

'use client';

import { useTranslations } from 'next-intl';
import { StepViewer } from './StepViewer';
import { SessionTimer } from './SessionTimer';
import { ArtifactsPanel } from './ArtifactsPanel';
import { PuzzleProgressPanel } from './PuzzleProgressPanel';
import { PropConfirmationManager } from './PropConfirmationManager';
import { Toolbelt } from '@/features/tools/components/Toolbelt';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { PlaySessionData } from '../api';
import type { SessionCapabilities } from '@/hooks/useSessionCapabilities';

interface BasicPlayViewProps {
  playData: PlaySessionData;
  caps: SessionCapabilities;
  sessionId: string;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: () => void;
  onBack?: () => void;
}

export function BasicPlayView({
  playData,
  caps,
  sessionId,
  currentStepIndex,
  onStepChange,
  onComplete,
  onBack,
}: BasicPlayViewProps) {
  const t = useTranslations('play.basicView');
  
  const steps = playData.steps;
  const step = steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex >= steps.length - 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{playData.gameTitle}</h2>
          <SessionTimer sessionId={sessionId} compact />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t('stepProgress', { current: currentStepIndex + 1, total: steps.length })}
        </p>
      </Card>

      {/* Step – befintlig container */}
      {step && (
        <StepViewer
          step={{
            id: step.id,
            title: step.title,
            description: step.description,
            durationMinutes: step.durationMinutes ?? 5,
            materials: step.materials,
            safety: step.safety,
            tag: step.tag,
            note: step.note,
          }}
          index={currentStepIndex}
          total={steps.length}
        />
      )}

      {/* Capability-gated panels */}
      {caps.showArtifactsPanel && <ArtifactsPanel sessionId={sessionId} />}
      {caps.showPuzzlesPanel && <PuzzleProgressPanel sessionId={sessionId} />}
      {caps.showPropsManager && <PropConfirmationManager sessionId={sessionId} />}
      {caps.showToolbelt && <Toolbelt sessionId={sessionId} role="host" />}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            {t('exitPlay')}
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
            disabled={isFirst}
          >
            {t('previous')}
          </Button>
          {isLast ? (
            <Button variant="primary" onClick={onComplete}>
              {t('complete')}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => onStepChange(Math.min(steps.length - 1, currentStepIndex + 1))}
            >
              {t('next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 12.3 Fas 3: FacilitatedPlayView Layout (Dag 2, ~4h)

```typescript
// features/play/components/FacilitatedPlayView.tsx
// LAYOUT med tabs – använder befintliga containers

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StepViewer } from './StepViewer';
import { PhaseNavigation } from './PhaseNavigation';
import { ArtifactsPanel } from './ArtifactsPanel';
import { DecisionsPanel } from './DecisionsPanel';
import { OutcomePanel } from './OutcomePanel';
import { PuzzleProgressPanel } from './PuzzleProgressPanel';
import { TriggersPanel } from './TriggersPanel';
import { PropConfirmationManager } from './PropConfirmationManager';
import { Toolbelt } from '@/features/tools/components/Toolbelt';
import { BoardToggle } from './BoardToggle';
import { SessionTimer } from './SessionTimer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PlaySessionData } from '../api';
import type { SessionCapabilities } from '@/hooks/useSessionCapabilities';
import type { SessionTrigger } from '@/types/games';

interface FacilitatedPlayViewProps {
  playData: PlaySessionData;
  caps: SessionCapabilities;
  sessionId: string;
  triggers: SessionTrigger[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onPhaseChange: (phaseIndex: number) => void;
  onTriggerAction: (triggerId: string, action: 'fire' | 'disable' | 'arm') => void;
  onComplete: () => void;
  onBack?: () => void;
}

export function FacilitatedPlayView({
  playData,
  caps,
  sessionId,
  triggers,
  currentStepIndex,
  onStepChange,
  onPhaseChange,
  onTriggerAction,
  onComplete,
  onBack,
}: FacilitatedPlayViewProps) {
  const t = useTranslations('play.facilitatedView');
  
  // Use first visible tab as default
  const [activeTab, setActiveTab] = useState<string>(caps.visibleTabs[0] ?? 'play');
  const [contentTab, setContentTab] = useState<string>(caps.contentSubTabs[0] ?? 'artifacts');
  const [manageTab, setManageTab] = useState<string>(caps.manageSubTabs[0] ?? 'settings');

  const steps = playData.steps;
  const step = steps[currentStepIndex];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{playData.gameTitle}</h2>
            {caps.showPhaseNavigation && (
              <PhaseNavigation sessionId={sessionId} onPhaseChange={onPhaseChange} compact />
            )}
          </div>
          <div className="flex items-center gap-4">
            {caps.showBoardToggle && <BoardToggle sessionId={sessionId} />}
            <SessionTimer sessionId={sessionId} showPhase={caps.hasPhases} />
          </div>
        </div>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {caps.visibleTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Play Tab */}
        <TabsContent value="play" className="space-y-4">
          {step && (
            <StepViewer
              step={{
                id: step.id,
                title: step.title,
                description: step.description,
                durationMinutes: step.durationMinutes ?? 5,
                materials: step.materials,
                safety: step.safety,
                tag: step.tag,
                note: step.note,
              }}
              index={currentStepIndex}
              total={steps.length}
            />
          )}
          
          {caps.showToolbelt && <Toolbelt sessionId={sessionId} role="host" />}
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
            >
              {t('previous')}
            </Button>
            <Button
              variant="primary"
              onClick={() => onStepChange(Math.min(steps.length - 1, currentStepIndex + 1))}
            >
              {t('next')}
            </Button>
          </div>
        </TabsContent>

        {/* Content Tab */}
        {caps.visibleTabs.includes('content') && (
          <TabsContent value="content">
            <Tabs value={contentTab} onValueChange={setContentTab}>
              <TabsList>
                {caps.contentSubTabs.map((sub) => (
                  <TabsTrigger key={sub} value={sub}>
                    {t(`content.${sub}`)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {caps.showArtifactsPanel && (
                <TabsContent value="artifacts">
                  <ArtifactsPanel sessionId={sessionId} />
                </TabsContent>
              )}
              {caps.showPuzzlesPanel && (
                <TabsContent value="puzzles">
                  <PuzzleProgressPanel sessionId={sessionId} />
                </TabsContent>
              )}
              {caps.showDecisionsPanel && (
                <TabsContent value="decisions">
                  <DecisionsPanel sessionId={sessionId} />
                </TabsContent>
              )}
              {caps.showOutcomePanel && (
                <TabsContent value="outcome">
                  <OutcomePanel sessionId={sessionId} />
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>
        )}

        {/* Manage Tab */}
        {caps.visibleTabs.includes('manage') && (
          <TabsContent value="manage">
            <Tabs value={manageTab} onValueChange={setManageTab}>
              <TabsList>
                {caps.manageSubTabs.map((sub) => (
                  <TabsTrigger key={sub} value={sub}>
                    {t(`manage.${sub}`)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {caps.showRoleAssigner && (
                <TabsContent value="roles">
                  {/* RoleAssignerContainer from existing */}
                </TabsContent>
              )}
              {caps.showTriggersPanel && (
                <TabsContent value="triggers">
                  <TriggersPanel triggers={triggers} onTriggerAction={onTriggerAction} />
                </TabsContent>
              )}
              <TabsContent value="settings">
                <Card className="p-4">
                  <p className="text-muted-foreground">{t('manage.settingsPlaceholder')}</p>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        )}
      </Tabs>

      {/* Footer */}
      <div className="flex justify-between">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            {t('exitPlay')}
          </Button>
        )}
        <Button variant="primary" onClick={onComplete} className="ml-auto">
          {t('endSession')}
        </Button>
      </div>
      
      {/* Props manager (floating) */}
      {caps.showPropsManager && <PropConfirmationManager sessionId={sessionId} />}
    </div>
  );
}
```

### 12.4 Fas 4: Uppdatera HostPlayMode med routing (Dag 3, ~3h)

```typescript
// features/play/components/HostPlayMode.tsx
// Lägg till efter imports:
import { useSessionCapabilities } from '@/hooks/useSessionCapabilities';
import { BasicPlayView } from './BasicPlayView';
import { FacilitatedPlayView } from './FacilitatedPlayView';
import { ParticipantPlayMode } from './ParticipantPlayMode';

// I komponenten:
export function HostPlayMode({ sessionId, ... }: HostPlayModeProps) {
  // Befintlig data-laddning
  const [playData, setPlayData] = useState<PlaySessionData | null>(null);
  const [triggers, setTriggers] = useState<SessionTrigger[]>([]);
  // ...

  // NY: Capabilities hook
  const caps = useSessionCapabilities(playData?.snapshotData ?? null);

  // NY: Current step index state (om inte redan finns)
  const [currentStepIndex, setCurrentStepIndex] = useState(
    playData?.runtimeState.current_step_index ?? 0
  );

  // Befintliga handlers...

  // NY: Routing baserat på viewType
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!playData) return null;

  switch (caps.viewType) {
    case 'basic':
      return (
        <BasicPlayView
          playData={playData}
          caps={caps}
          sessionId={sessionId}
          currentStepIndex={currentStepIndex}
          onStepChange={handleStepChange}
          onComplete={handleEndSession}
          onBack={onExitPlayMode}
        />
      );

    case 'facilitated':
      return (
        <FacilitatedPlayView
          playData={playData}
          caps={caps}
          sessionId={sessionId}
          triggers={triggers}
          currentStepIndex={currentStepIndex}
          onStepChange={handleStepChange}
          onPhaseChange={handlePhaseChange}
          onTriggerAction={handleTriggerAction}
          onComplete={handleEndSession}
          onBack={onExitPlayMode}
        />
      );

    case 'participants':
      // Återanvänd befintlig ParticipantPlayMode oförändrad
      return (
        <ParticipantPlayMode
          sessionId={sessionId}
          participantCount={participantCount}
          onEndSession={handleEndSession}
        />
      );
  }
}
```

### 12.5 Fas 5: Lägg till snapshot i API (Dag 3, ~2h)

```typescript
// features/play/api.ts
// Uppdatera PlaySessionData type:
export type PlaySessionData = {
  sessionId: string;
  gameId: string | null;
  gameTitle: string;
  steps: PlayStep[];
  runtimeState: SessionRuntimeState;
  snapshotData: GameSnapshotData | null;  // NY
};

// Uppdatera getHostPlaySession att inkludera snapshot_data
```

### 12.6 Fas 6: Translations (Dag 3, ~1h)

```json
// messages/sv.json - lägg till:
{
  "play": {
    "basicView": {
      "stepProgress": "Steg {current} av {total}",
      "previous": "Föregående",
      "next": "Nästa",
      "complete": "Slutför",
      "exitPlay": "Avsluta spelläge"
    },
    "facilitatedView": {
      "tabs": {
        "play": "Spela",
        "content": "Innehåll",
        "manage": "Hantera"
      },
      "content": {
        "artifacts": "Artefakter",
        "puzzles": "Pussel",
        "decisions": "Beslut",
        "outcome": "Utfall"
      },
      "manage": {
        "roles": "Roller",
        "triggers": "Triggers",
        "settings": "Inställningar",
        "settingsPlaceholder": "Sessionsinställningar"
      },
      "previous": "Föregående",
      "next": "Nästa",
      "exitPlay": "Avsluta",
      "endSession": "Avsluta session"
    }
  }
}
```

---

## 13. TIDSUPPSKATTNING (Reviderad A + Constraints)

| Uppgift | Uppskattad tid | Dag |
|---------|----------------|-----|
| Fas 1: useSessionCapabilities hook | 3h | 1 |
| Fas 2: BasicPlayView (layout) | 3h | 1-2 |
| Fas 3: FacilitatedPlayView (layout) | 4h | 2 |
| Fas 4: HostPlayMode routing | 3h | 3 |
| Fas 5: API snapshot_data | 2h | 3 |
| Fas 6: Translations | 1h | 3 |
| Testing & bugfix | 4h | 4 |
| **Total** | **~20h** | **4 dagar** |

> **Tidsbesparing jämfört med ursprunglig A:** ~11h sparad tack vare återanvändning av befintliga containers och enklare arkitektur.

---

## 14. TESTPLAN

### 14.1 Testfall

| Test | Input | Förväntat resultat |
|------|-------|-------------------|
| Basic minimal | `play_mode: 'basic', phases: [], roles: [], triggers: []` | BasicPlayView, minimal UI |
| Basic + artifacts | `play_mode: 'basic', artifacts: [keypad]` | BasicPlayView + ArtifactsPanel |
| Basic + tools | `play_mode: 'basic', enabled_tools: ['dice_roller_v1']` | BasicPlayView + Toolbelt |
| Facilitated full | `play_mode: 'facilitated', phases: [3], triggers: [2]` | FacilitatedPlayView, tabs |
| Facilitated utan triggers | `play_mode: 'facilitated', triggers: []` | FacilitatedPlayView, no TriggersPanel |
| Participants full | `play_mode: 'participants', roles: [3]` | ParticipantPlayMode (befintlig) |
| Participants utan roles | `play_mode: 'participants', roles: []` | Fallback till BasicPlayView |

### 14.2 Rollback-plan

Om problem uppstår:
1. Sätt feature flag `ADAPTIVE_PLAY_UI=false` i miljövariabler
2. Alla sessioner använder nuvarande `HostPlayMode` utan routing
3. Ingen databasändring krävs

---

## 15. MIGRATIONS- OCH UTRULLNINGSPLAN

| Fas | Åtgärd | Risknivå |
|-----|--------|----------|
| 1 | Deploya hook + BasicPlayView med feature flag OFF | Låg |
| 2 | Aktivera feature flag för 10% av sessioner | Låg |
| 3 | Deploya FacilitatedPlayView, 50% utrullning | Medium |
| 4 | Full utrullning, ta bort feature flag | Låg |

---

## 16. ARKITEKTURBESLUT (Slutgiltigt)

### 16.1 Valt alternativ

**Alternativ A med hårda constraints** – Full routing med separata view-komponenter, men:
- ✅ Ingen duplicerad datamodell
- ✅ Återanvänd alla befintliga containers
- ✅ Feature gating i alla views

### 16.2 Avvisade alternativ

| Alternativ | Anledning till avvisning |
|------------|--------------------------|
| B: Capability-driven only | Integrerat i A via constraints |
| C: Acceptera nuvarande | Löser inte problemet med överbelastad UI för basic-lekar |

### 16.3 Arkitekturdiagram (Slutgiltigt)

```
┌────────────────────────────────────────────────────────────────────┐
│                        HostPlayMode                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  const caps = useSessionCapabilities(snapshotData)          │  │
│  │                                                              │  │
│  │  switch (caps.viewType) {                                   │  │
│  │    case 'basic':      return <BasicPlayView caps={caps} />  │  │
│  │    case 'facilitated': return <FacilitatedPlayView caps /> │  │
│  │    case 'participants': return <ParticipantPlayMode />      │  │
│  │  }                                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│   BasicPlayView     │     │ FacilitatedPlayView │
│  (Layout component) │     │  (Layout component) │
├─────────────────────┤     ├─────────────────────┤
│ <StepViewer />      │     │ <Tabs>              │
│ {caps.showArtifacts │     │   <TabPlay>         │
│   && <ArtifactsPanel│     │     <StepViewer />  │
│   />}               │     │     {caps.showTool..│
│ {caps.showToolbelt  │     │   </TabPlay>        │
│   && <Toolbelt />}  │     │   <TabContent>      │
│ <StepNavigation />  │     │     <ArtifactsPanel>│
└─────────────────────┘     │   </TabContent>     │
                            │   <TabManage>       │
                            │     <TriggersPanel> │
                            │   </TabManage>      │
                            │ </Tabs>             │
                            └─────────────────────┘
              ▲                        ▲
              │                        │
              └────────────────────────┘
                    Delade containers:
                    - StepViewer
                    - ArtifactsPanel  
                    - Toolbelt
                    - SessionTimer
                    - PuzzleProgressPanel
                    - PropConfirmationManager
```

---

## 17. SAMMANFATTNING

| Aspekt | Beslut |
|--------|--------|
| **Alternativ** | A med hårda constraints |
| **Tidsuppskattning** | ~20h (4 dagar) |
| **Risknivå** | Låg-Medium |
| **Rollback** | Feature flag |
| **Datamodelländring** | Ingen |

### Nästa steg

1. Skapa `hooks/useSessionCapabilities.ts`
2. Skapa `BasicPlayView.tsx` (layout)
3. Skapa `FacilitatedPlayView.tsx` (layout)
4. Uppdatera `HostPlayMode.tsx` med routing
5. Lägg till `snapshotData` i `PlaySessionData`
6. Lägg till translations

---

*Dokument skapat 2026-01-19. Uppdaterat 2026-01-19 med slutgiltigt beslut: Alternativ A med hårda constraints.*
