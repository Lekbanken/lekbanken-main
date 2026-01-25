# Artefakter & Triggers V2: Implementeringsplan

> **Status**: ✅ Klar  
> **Skapad**: 2026-01-25  
> **Senast uppdaterad**: 2026-01-25 (Artifacts + Triggers V2 klara)

## Översikt

### Mål
- Låt Play läsa artefakt/variant/trigger-config direkt från `game_*` tabeller
- Låt Play spara enbart runtime-state per session i nya state-tabeller
- Behåll samma API-kontrakt så långt det går (men byt ID-semantik till "game ids" där det behövs)
- Ta bort snapshot-POST som koncept för både artifacts och triggers

### Arkitektur: Före vs Efter

```
FÖRE (V1 - Snapshot):
┌─────────────────┐     POST snapshot     ┌──────────────────────┐
│  game_artifacts │ ──────────────────────▶ │  session_artifacts   │
│  game_variants  │      (kopierar)        │  session_variants    │
└─────────────────┘                        └──────────────────────┘
                                                    │
                                           Läser config + state
                                                    ▼
                                           ┌──────────────────┐
                                           │     API/UI       │
                                           └──────────────────┘

EFTER (V2 - Config + State):
┌─────────────────┐                        ┌──────────────────────┐
│  game_artifacts │◀───── Läser config ────│       API/UI         │
│  game_variants  │                        └──────────────────────┘
└─────────────────┘                                 │
                                           Läser/skriver state
                                                    ▼
                                           ┌──────────────────────┐
                                           │ session_artifact_    │
                                           │ state / variant_state│
                                           └──────────────────────┘
```

---

## Scope

### Ingår
- [x] Artefakter + varianter (inkl reveal/highlight, assignments)
- [x] Keypad (RPC + API)
- [x] Puzzle routes (riddle, counter, multi_answer, cipher, qr_gate)
- [x] Puzzle/prop-routes som läser/uppdaterar metadata
- [x] Board-route som läser revealed/highlighted
- [x] Deprecate snapshot routes / UI-knappar

### Ingår EJ (denna vändan)
- Roles/triggers snapshot-arkitektur (session_roles behålls för rollmappning)
- Decisions/votes (separat domän)

---

## Fas 1 — Datamodell & Migration (Supabase/SQL)

### Status: ✅ Klar

### 1.1 Nya tabeller (state-only)

#### `session_artifact_state`
| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `id` | UUID PK | Auto-genererad |
| `session_id` | UUID FK → participant_sessions | |
| `game_artifact_id` | UUID FK → game_artifacts | |
| `state` | JSONB | Runtime state (keypadState, puzzleState, etc) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints**: `UNIQUE(session_id, game_artifact_id)`

#### `session_artifact_variant_state`
| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `id` | UUID PK | Auto-genererad |
| `session_id` | UUID FK → participant_sessions | |
| `game_artifact_variant_id` | UUID FK → game_artifact_variants | |
| `revealed_at` | TIMESTAMPTZ NULL | När varianten visades |
| `highlighted_at` | TIMESTAMPTZ NULL | När varianten highlightades |
| `created_at` | TIMESTAMPTZ | |

**Constraints**: `UNIQUE(session_id, game_artifact_variant_id)`

**Index**: `CREATE INDEX ... WHERE highlighted_at IS NOT NULL`

#### `session_artifact_variant_assignments_v2`
| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `id` | UUID PK | Auto-genererad |
| `session_id` | UUID FK → participant_sessions | |
| `participant_id` | UUID FK → participants | |
| `game_artifact_variant_id` | UUID FK → game_artifact_variants | |
| `assigned_by` | UUID FK → auth.users | |
| `assigned_at` | TIMESTAMPTZ | |

**Constraints**: `UNIQUE(session_id, participant_id, game_artifact_variant_id)`

### 1.2 RLS & Policies
- [x] Host: manage state för sessioner de äger
- [x] Participant: read only för "mina tilldelningar" + public revealed varianter

### 1.3 Backfill (för pågående sessions)
- [x] Migrera runtime-state från `session_artifacts.metadata` → `session_artifact_state.state`
- [x] Kopiera `revealed_at/highlighted_at` via `source_variant_id`
- [x] Mappa assignments via `source_variant_id` → `game_artifact_variant_id`
- [x] **VIKTIGT**: Exkludera `correctCode` från state (ska stanna i game_artifacts)

### 1.4 Keypad RPC uppdatering
- [x] Uppdatera `attempt_keypad_unlock` signatur: `p_artifact_id` → `p_session_id` + `p_game_artifact_id`
- [x] Läs config från `game_artifacts.metadata`
- [x] Läs/skriv state i `session_artifact_state.state->keypadState`
- [x] Ändra `FOR UPDATE` lock till state-tabellen
- [x] Bakåtkompatibel wrapper för gamla anrop

### Acceptance Fas 1
- [x] Nya tabeller skapade med korrekta constraints
- [x] Upsert fungerar idempotent
- [x] Backfill läcker inte `correctCode` till state
- [x] RPC fungerar med nya signaturen

---

## Fas 2 — API Refactor (Play endpoints)

### Status: ✅ Klar

### 2.1 Artifacts huvudroute
**Fil**: `app/api/play/sessions/[id]/artifacts/route.ts`

#### GET (host)
- [x] Hämta artefakter från `game_artifacts` (locale-aware) för session.game_id
- [x] Hämta varianter från `game_artifact_variants`
- [x] LEFT JOIN state från `session_artifact_state` och `session_artifact_variant_state`
- [x] Returnera samma shape men med `game_artifacts.id` som artifact id
- [x] Rollmappning: `visible_to_role_id` → `visible_to_session_role_id` via session_roles

#### GET (participant)
- [x] Samma join, men filtrera:
  - Public + revealed
  - Role_private om participant har motsvarande session_role
  - Explicit assignments via `session_artifact_variant_assignments_v2`
- [x] Sanitera metadata: returnera config utan `correctCode`, inkludera state

#### POST (snapshot)
- [x] Returnerar deprecation notice

### 2.2 Artifacts state PATCH
**Fil**: `app/api/play/sessions/[id]/artifacts/state/route.ts`

- [x] Byt `variantId` semantik: session_artifact_variants.id → game_artifact_variants.id
- [x] Validera att variant tillhör session.game_id
- [x] `reveal_variant`/`highlight_variant`: upsert till `session_artifact_variant_state`
- [x] `assign_variant`/`unassign_variant`: skriv till `session_artifact_variant_assignments_v2`
- [x] Highlight-regel: nolla alla `highlighted_at` i session före ny highlight

### 2.3 Keypad route
**Fil**: `app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts`

- [x] `artifactId` = `game_artifacts.id`
- [x] POST: Validera game artifact typ + tillhör session.game_id
- [x] Anropa RPC med nya signaturen `(sessionId, gameArtifactId, enteredCode, participantId, participantName)`
- [x] Vid unlock: auto-reveal public varianter via `session_artifact_variant_state`
- [x] GET: Returnera config (utan correctCode) + state

### 2.4 Puzzle routes
**Fil**: `app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts`

- [x] `artifactId` = `game_artifacts.id`
- [x] Läs config (correctAnswers, maxAttempts, normalizeMode) från `game_artifacts.metadata`
- [x] Läs/skriv runtime state (attempts, solved, locked) till `session_artifact_state.state.puzzleState`
- [x] Uppdatera alla puzzle-typer: riddle, counter, multi_answer, cipher, qr_gate

### 2.5 Puzzle props route
**Fil**: `app/api/play/sessions/[id]/puzzles/props/route.ts`

- [x] Byt från `session_artifacts.metadata.puzzleState` → `session_artifact_state.state.puzzleState`
- [x] Jobba med `game_artifacts.id` konsekvent

### 2.6 Puzzle progress route
**Fil**: `app/api/play/sessions/[id]/puzzles/progress/route.ts`

- [x] Samma refaktor som props route

### 2.7 Board route
**Fil**: `app/api/play/board/[code]/route.ts`

- [x] Byt från `session_artifacts/session_artifact_variants` → `game_artifacts/game_artifact_variants` + `session_artifact_variant_state`
- [x] "Revealed public" = game variants där visibility=public AND variant_state.revealed_at != null
- [x] "Highlighted" = variant_state.highlighted_at != null

### 2.8 Snapshot route (deprecate)
**Fil**: `app/api/play/sessions/[id]/artifacts/snapshot/route.ts`

- [x] Returnerar `410 Gone` med deprecation message

### Acceptance Fas 2
- [x] Inga writes sker mot `session_artifacts`/`session_artifact_variants` i runtime
- [x] Alla endpoints härleder config från `game_*` och state från `session_*_state`
- [x] API-kontrakt är bakåtkompatibelt (samma response shape)

---

## Fas 3 — Frontend uppdatering

### Status: ✅ Klar

### 3.1 Ta bort snapshot-beteende

#### ArtifactsPanel.tsx
**Fil**: `features/play/components/ArtifactsPanel.tsx`
- [x] Ta bort/gör om "Snapshot from game"-knappen (nu endast Refresh)
- [x] `snapshot()` funktion → borttagen

#### useSessionState.ts
**Fil**: `features/play/hooks/useSessionState.ts`
- [x] Ta bort auto-POST snapshot i `loadArtifacts()` (rad 331-342)
- [x] GET returnerar data direkt

### 3.2 ID-byten
- [x] All klientlogik som skickar `variantId` använder nu `game_artifact_variant_id`
- [x] Participant UI som refererar till artifact ids använder `game_artifact_id`

### 3.3 ParticipantPlayView
**Fil**: `features/play/components/ParticipantPlayView.tsx`
- [x] Verifierad - använder `getParticipantArtifacts` som anropar V2 API
- [x] `session_artifact_id` i typer behålls för bakåtkompatibilitet (värdet är nu game_artifact_id)

### Acceptance Fas 3
- [x] Ingen klient gör `POST /artifacts` snapshot
- [x] Artefaktlistor renderas korrekt (inga dubbletter)

---

## Fas 4 — Cleanup, kompatibilitet, rollout

### Status: ⬜ Ej påbörjad

### 4.1 Feature flag
- [ ] Implementera `PLAY_ARTIFACTS_V2` environment variable
- [ ] Dual-stack stöd under övergång

```typescript
// lib/config.ts
export const PLAY_ARTIFACTS_V2 = process.env.PLAY_ARTIFACTS_V2 === 'true';
```

### 4.2 Deprecation
- [ ] Behåll gamla tabeller för historik
- [ ] Skapa debug-views om nödvändigt

### 4.3 Datastädning (efter stabil V2)
- [ ] Migration som stoppar skapande av nya session_artifacts
- [ ] Rensa gamla för avslutade sessions (valfritt)

---

## Fas 5 — Verifiering

### Status: ⬜ Ej påbörjad

### Manuell testchecklista

| Test | Status |
|------|--------|
| Starta ny session → artifacts syns direkt utan snapshot | ⬜ |
| Participant ser public revealed varianter | ⬜ |
| Participant ser role-private varianter endast med rätt roll | ⬜ |
| Participant ser tilldelade varianter under "mina artefakter" | ⬜ |
| Keypad: correctCode exponeras aldrig till klient | ⬜ |
| Keypad: state persisterar (attemptCount/unlocked/lockedOut) | ⬜ |
| Keypad: unlock auto-revealar public variants | ⬜ |
| Props/puzzle: request/confirm flow fungerar | ⬜ |
| Board: visar revealed public + highlight korrekt | ⬜ |
| Regression: triggers påverkas inte | ⬜ |

---

## Påverkade filer

### API Routes
| Fil | Påverkan | Status |
|-----|----------|--------|
| `app/api/play/sessions/[id]/artifacts/route.ts` | GET/POST refaktor | ✅ |
| `app/api/play/sessions/[id]/artifacts/state/route.ts` | PATCH refaktor | ✅ |
| `app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts` | Ny ID-semantik + RPC | ✅ |
| `app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts` | Config/state separation | ✅ |
| `app/api/play/sessions/[id]/puzzles/props/route.ts` | State-tabell refaktor | ✅ |
| `app/api/play/sessions/[id]/puzzles/progress/route.ts` | State-tabell refaktor | ✅ |
| `app/api/play/board/[code]/route.ts` | Läs från game_* + state | ✅ |
| `app/api/play/sessions/[id]/artifacts/snapshot/route.ts` | Deprecate | ✅ |

### Frontend
| Fil | Påverkan | Status |
|-----|----------|--------|
| `features/play/components/ArtifactsPanel.tsx` | Ta bort snapshot | ✅ |
| `features/play/hooks/useSessionState.ts` | Ta bort auto-POST artifacts + triggers | ✅ |
| `features/play/components/ParticipantPlayView.tsx` | ID-semantik | ✅ |
| `features/play/components/HostPlayMode.tsx` | Ta bort trigger snapshot | ✅ |

### Migrations
| Fil | Beskrivning | Status |
|-----|-------------|--------|
| `20260125000001_artifacts_v2_state_tables.sql` | Nya artifact state-tabeller | ✅ |
| `20260125000002_artifacts_v2_backfill.sql` | Migrera artifact data | ✅ |
| `20260125000003_keypad_rpc_v2.sql` | Uppdaterad keypad RPC | ✅ |
| `20260125000004_triggers_v2_state_tables.sql` | Nya trigger state-tabeller + RPC | ✅ |
| `20260125000005_triggers_v2_backfill.sql` | Migrera trigger data | ✅ |

---

## Triggers V2 Implementation

### Status: ✅ Klar

### Arkitektur

```
FÖRE (V1):
game_triggers ──POST snapshot──▶ session_triggers (kopierar allt)

EFTER (V2):
game_triggers ◀── Läser config ── API
                                    │
                    Läser/skriver state
                                    ▼
                        session_trigger_state
```

### Nya tabeller

#### `session_trigger_state`
| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `id` | UUID PK | Auto-genererad |
| `session_id` | UUID FK → participant_sessions | |
| `game_trigger_id` | UUID FK → game_triggers | |
| `status` | TEXT | armed, fired, disabled, error |
| `fired_count` | INTEGER | Antal gånger triggad |
| `fired_at` | TIMESTAMPTZ NULL | Senast triggad |
| `enabled` | BOOLEAN | Per-session toggle |

### Nya RPC-funktioner
- `fire_trigger_v2(p_session_id, p_game_trigger_id)` - Atomic fire
- `disable_trigger_v2(p_session_id, p_game_trigger_id)` - Disable trigger
- `rearm_trigger_v2(p_session_id, p_game_trigger_id)` - Re-arm trigger
- `disable_all_triggers_v2(p_session_id)` - Disable all armed

### API Changes

**GET /api/play/sessions/[id]/triggers**
- V2: Läser config från `game_triggers`, state från `session_trigger_state`
- Returnerar merged triggers med samma shape som tidigare

**POST /api/play/sessions/[id]/triggers**
- V2: Returnerar `410 Gone` - deprecated

**PATCH /api/play/sessions/[id]/triggers**
- V2: `triggerId` = `game_trigger_id`
- Upsert till `session_trigger_state`

---

## Changelog

| Datum | Ändring |
|-------|---------|
| 2026-01-25 | Initial plan skapad |
| 2026-01-25 | Fas 1 klar: SQL migrations för V2 tabeller, backfill, RPC |
| 2026-01-25 | Fas 2 klar: Alla API routes refaktorerade |
| 2026-01-25 | Fas 3 klar: Frontend snapshot borttagen |
| 2026-01-25 | Triggers V2 klar: Samma refaktorering som artifacts |

