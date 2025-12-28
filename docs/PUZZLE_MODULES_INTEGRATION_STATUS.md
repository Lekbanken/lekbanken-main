# Puzzle Modules – End-to-End Integration Status

> Skapad: 2024-12-28  
> Status: Analys klar – Handlingsplan listar prioriterade nästa steg

---

## 1. Sammanfattning

Vi har **15 puzzle-moduler** implementerade som frontend-komponenter i `components/play/`:

| Fas | Moduler | Status |
|-----|---------|--------|
| **Fas 1** | Counter, RiddleInput, AudioPlayer | ✅ Komponenter klara |
| **Fas 2** | MultiAnswerForm, QRScanner, HintPanel | ✅ Komponenter klara |
| **Fas 3** | HotspotImage, TilePuzzle, CipherDecoder | ✅ Komponenter klara |
| **Fas 4** | PropConfirmation, LocationCheck | ✅ Komponenter klara |
| **Fas 5** | LogicGrid, SoundLevelMeter, ReplayMarker | ✅ Komponenter klara |

**Plus befintliga moduler** (redan integrerade):
- `Keypad` / `AlphaKeypad` – Fungerar i session, har backend-stöd
- `TypewriterText` / `CountdownOverlay` – Används i ParticipantPlayView

---

## 2. Nuläge: Vad är integrerat?

### 2.1 Database Schema (Supabase)

| Tabell | Beskrivning | Puzzle-stöd |
|--------|-------------|-------------|
| `game_artifacts` | Author-time artefakter | ✅ Generiskt metadata-fält (JSONB) |
| `game_artifact_variants` | Varianter per artefakt | ✅ Generiskt metadata |
| `session_artifacts` | Runtime-snapshot | ✅ Kopierar metadata |
| `session_artifact_variants` | Runtime-varianter | ✅ revealed_at, highlighted_at |
| `session_decisions` | Röstnings-primitiv | ✅ Kan användas av MultiAnswer |
| `session_votes` | Röster | ✅ Stödjer puzzle-voting |
| `session_outcomes` | Resultat | ✅ Kan visa puzzle-resultat |

**Schema-analys:**  
Det generiska `metadata: JSONB`-fältet på artifacts ger oss möjlighet att lagra puzzle-specifik konfiguration utan nya migrationer. Däremot saknas:

| Saknas | Användning |
|--------|-----------|
| `session_puzzle_state` | Runtime-state för Counter, Riddle, Cipher, etc. |
| `session_hints` | Hint-request & unlock tracking |
| `session_location_checks` | GPS-verifiering per deltagare |
| `session_replay_markers` | Tidsstämplar för replay |

### 2.2 API Routes

**Befintliga routes i `app/api/play/`:**

```
/api/play/
├── board/           – Board state
├── heartbeat/       – Session heartbeat
├── join/            – Join session
├── me/              – Participant info
├── rejoin/          – Rejoin session
├── session/         – Session state
└── sessions/        – Session CRUD + artifacts + decisions
```

**Puzzle-specifika endpoints saknas:**

| Endpoint | Syfte |
|----------|-------|
| `POST /api/play/sessions/[id]/puzzle/[puzzleId]/submit` | Riddle/Cipher submit |
| `POST /api/play/sessions/[id]/puzzle/[puzzleId]/counter` | Increment counter |
| `GET /api/play/sessions/[id]/hints` | Tillgängliga hints |
| `POST /api/play/sessions/[id]/hints/[hintId]/request` | Request hint |
| `POST /api/play/sessions/[id]/location-check/verify` | GPS-verifiering |
| `POST /api/play/sessions/[id]/prop-confirm/[propId]` | Leader confirms prop |

### 2.3 Admin Builder (Game Builder)

**Befintlig artifact_type-lista i `ArtifactEditor.tsx`:**

```ts
const artifactTypeOptions = [
  { value: 'card', label: 'Kort' },
  { value: 'keypad', label: 'Pinkod (Keypad)' },
  { value: 'document', label: 'Dokument' },
  { value: 'image', label: 'Bild' },
];
```

**Saknas:**

| artifact_type | Modul |
|---------------|-------|
| `counter` | Counter |
| `riddle` | RiddleInput |
| `audio` | AudioPlayer |
| `multi_answer` | MultiAnswerForm |
| `qr_scanner` | QRScanner |
| `hint_container` | HintPanel |
| `hotspot` | HotspotImage |
| `tile_puzzle` | TilePuzzle |
| `cipher` | CipherDecoder |
| `prop_confirmation` | PropConfirmation |
| `location_check` | LocationCheck |
| `logic_grid` | LogicGrid |
| `sound_level` | SoundLevelMeter |
| `replay_marker` | ReplayMarker |

### 2.4 ArtifactWizard Templates

**Befintliga templates i `ArtifactWizard.tsx`:**
- Escape Room Keypad
- Digital Keypad
- Hemlig ledtråd
- Mysteriekort
- Rollhemlighet
- Quizsvar
- Fakta-kort
- Bild-ledtråd
- Tom artefakt

**Saknas:** Templates för alla 14 nya puzzle-moduler

### 2.5 Participant Session View

**Befintlig rendering i `ParticipantPlayView.tsx`:**
- Keypad rendering med code submit
- Card/Document/Image rendering

**Saknas:** Rendering-logik för de 14 nya puzzle-typerna

### 2.6 Host Session View (Facilitator Dashboard)

**Befintliga features:**
- Step/Phase navigation
- Timer control
- Signal panel
- Artifacts panel (keypad state tracking)

**Saknas:**
- Hint management panel
- Prop confirmation controls
- Location verify dashboard
- Counter/Puzzle state overview

---

## 3. Integrationsplan (Prioriterad)

### Fas A: Schema & API (Backend) – 1-2 dagar

#### A1. Utöka artifact_type enum (ej migration – frontend + validation)
```ts
// types/games.ts
export type ArtifactType = 
  | 'card' | 'keypad' | 'document' | 'image'
  | 'counter' | 'riddle' | 'audio' 
  | 'multi_answer' | 'qr_gate' | 'hint_container'
  | 'hotspot' | 'tile_puzzle' | 'cipher'
  | 'prop_confirmation' | 'location_check'
  | 'logic_grid' | 'sound_level' | 'replay_marker';
```

#### A2. Session puzzle state table (migration)
```sql
CREATE TABLE public.session_puzzle_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.participant_sessions(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.session_artifacts(id) ON DELETE CASCADE,
  puzzle_type TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, artifact_id)
);
```

#### A3. Puzzle API routes
- `POST /api/play/sessions/[id]/puzzle/submit` – Generic puzzle submit
- `POST /api/play/sessions/[id]/hints/request` – Hint request
- `POST /api/play/sessions/[id]/verify-location` – GPS verify

---

### Fas B: Admin Builder UI – 1-2 dagar

#### B1. Utöka artifactTypeOptions
Lägg till alla 14 nya typer i `ArtifactEditor.tsx`

#### B2. Puzzle-specifika konfigurationspaneler
Varje puzzle-typ behöver en konfigurationspanel i ArtifactEditor:
- Counter: target, perRole, label
- Riddle: correctAnswers[], normalizeMode, maxAttempts
- Audio: url, requireAck, autoplay
- Hotspot: imageUrl, zones[], revealMode
- TilePuzzle: imageUrl, gridSize
- Cipher: method, shift/keyword, plaintext
- Etc.

#### B3. Nya ArtifactWizard templates
Lägg till 14 nya mallar med relevanta kategorier:
- Escape Room: Counter, Riddle, Cipher, Hotspot, TilePuzzle, LogicGrid
- Party: Audio, SoundLevel, PropConfirmation
- Educational: MultiAnswer, QRScanner
- General: HintContainer, LocationCheck, ReplayMarker

---

### Fas C: Participant Session View – 1-2 dagar

#### C1. Puzzle renderer dispatcher
```tsx
function renderPuzzleArtifact(artifact: SessionArtifact, state: PuzzleState) {
  switch (artifact.artifact_type) {
    case 'counter':
      return <InteractiveCounter config={...} state={state} onIncrement={...} />;
    case 'riddle':
      return <RiddleInput config={...} onSubmit={...} />;
    // ... etc
  }
}
```

#### C2. Hook för puzzle state sync
```tsx
const { puzzleStates, submitPuzzle, requestHint } = usePuzzleSync(sessionId);
```

#### C3. Realtime state updates
Prenumerera på `session_puzzle_states` via Supabase Realtime

---

### Fas D: Host Dashboard – 1 dag

#### D1. Puzzle State Overview Panel
Visa alla puzzle-artefakter med current state per deltagare/team

#### D2. Hint Management
- Lista pending hint requests
- Approve/Send hints
- Track hint usage

#### D3. Prop Confirmation & Location Verify
- PropConfirmControl i host dashboard
- LocationConfirmControl för manuell override

---

### Fas E: Trigger Integration – 0.5 dagar

Koppla trigger-systemet till puzzle events:
- `counter_reached` → Fire action
- `riddle_correct` → Fire action
- `tile_puzzle_complete` → Fire action
- Etc.

---

## 4. Snabbstart: Minimal viable integration

Om vi vill snabbt testa **en** modul End-to-End:

### Riddle Module (Enklast)

1. **ArtifactEditor:** Lägg till `artifact_type: 'riddle'` + config panel
2. **API:** `POST /api/play/sessions/[id]/puzzle/submit` med server-side answer check
3. **ParticipantPlayView:** Rendera `<RiddleInput>` för `artifact_type === 'riddle'`
4. **State:** Lagra attempts + solved i artifact metadata (no new table)

**Estimat:** 2-3 timmar

---

## 5. Nästa steg

1. **Beslut:** Vilken fas ska vi börja med? (A → B → C → D)
2. **Val av pilot-modul:** Riddle (enklast) eller Counter (vanligast)?
3. **Migration:** Behöver vi `session_puzzle_states` tabell eller räcker metadata?

---

## Appendix: Fil-mappning

| Lager | Fil(er) | Ansvar |
|-------|---------|--------|
| **Types** | `types/games.ts`, `types/puzzle-modules.ts`, `types/trigger.ts` | Alla typdefintioner |
| **Components** | `components/play/*.tsx` | 15 puzzle-komponenter |
| **Admin Builder** | `app/admin/games/builder/components/ArtifactEditor.tsx` | artifact_type config |
| **Admin Wizard** | `app/admin/games/builder/components/ArtifactWizard.tsx` | Mallar |
| **Session View** | `features/play/components/ParticipantPlayView.tsx` | Deltagare rendering |
| **Host View** | `features/play/components/FacilitatorDashboard.tsx` | Lekledare panel |
| **API** | `app/api/play/sessions/[id]/...` | Session endpoints |
| **Schema** | `supabase/migrations/` | DB migrations |

