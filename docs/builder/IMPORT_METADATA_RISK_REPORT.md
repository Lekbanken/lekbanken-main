# Import Metadata Risk Report

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-02-08
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Historical risk snapshot that informed later atomicity and contract work. Use newer builder plans and verification docs for active work.

**Syfte**: Sammanfatta risker och kritiska valideringspunkter för game-import.  
**Källa**: [BUILDER_METADATA_CONTRACT.md](BUILDER_METADATA_CONTRACT.md), [BUILDER_METADATA_CONTRACT_CANONICAL.md](BUILDER_METADATA_CONTRACT_CANONICAL.md)  
**Policy**: Endast evidens. Inga gissningar.

---

## Executive Summary

| Kategori | Antal |
|----------|-------|
| **HARD_REQUIRED keys** | 12 keys över 10 artifact types |
| **SOFT_REQUIRED keys** | 4 keys över 4 artifact types |
| **Conditional HARD_REQUIRED** | 3 keys (location_check checkType + lat/lon för GPS-mode) |
| **Quality Gates** | 4 keys (hint_container, cipher) |
| **Risk-defaults / Mismatch** | 1 kritisk (counter.target) |
| **Alias-normalisering** | 22+ alias-par |
| **Typer utan metadata** | 4 (card, document, image, replay_marker) |

---

## 1. HARD_REQUIRED Keys per Artifact Type

Import **MÅSTE** avbryta med error om dessa saknas eller är tomma.

| artifact_type | Key | Validering | Evidens |
|---------------|-----|------------|---------|
| `keypad` | `correctCode` | non-empty string | [keypad/route.ts#L47](../../app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts#L47) |
| `riddle` | `correctAnswers` | array med minst 1 element | [puzzle/route.ts#L147](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L147) |
| `multi_answer` | `items` | array med minst 1 element | [puzzle/route.ts#L305](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L305) |
| `qr_gate` | `expectedValue` | non-empty string | [puzzle/route.ts#L360](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L360) |
| `hint_container` | `hints` | array med minst 1 element | [PuzzleArtifactRenderer.tsx#L499](../../features/play/components/PuzzleArtifactRenderer.tsx#L499) |
| `hotspot` | `hotspots` | array med minst 1 element | [PuzzleArtifactRenderer.tsx#L553](../../features/play/components/PuzzleArtifactRenderer.tsx#L553) |
| `cipher` | `encodedMessage` | non-empty string | [PuzzleArtifactRenderer.tsx#L681](../../features/play/components/PuzzleArtifactRenderer.tsx#L681) |
| `cipher` | `expectedPlaintext` | non-empty string | [PuzzleArtifactRenderer.tsx#L681](../../features/play/components/PuzzleArtifactRenderer.tsx#L681) |
| `logic_grid` | `categories` | array med minst 1 element | [PuzzleArtifactRenderer.tsx#L720](../../features/play/components/PuzzleArtifactRenderer.tsx#L720) |
| `conversation_cards_collection` | `conversation_card_collection_id` | non-empty string | [ConversationCardsCollectionArtifact.tsx#L27](../../features/play/components/ConversationCardsCollectionArtifact.tsx#L27) |

### Quality Gates (HARD_REQUIRED för meningsfull artifact)

Dessa keys är tekniskt inte "Play kraschar" men saknas → artifact saknar funktion.

| artifact_type | Key | Validering | Motivering |
|---------------|-----|------------|------------|
| `hint_container` | `hints` | array med minst 1 element | Tom lista = ingen hint att visa |
| `cipher` | `encodedMessage` | non-empty string | Inget att dekoda |
| `cipher` | `expectedPlaintext` | non-empty string | Ingen lösning att validera mot |

### Conditional HARD_REQUIRED

| artifact_type | Key | Villkor | Validering | Evidens |
|---------------|-----|---------|------------|---------|
| `location_check` | `checkType` | Alltid | `gps\|qr\|manual` (POLICY) | – |
| `location_check` | `latitude` | `checkType === 'gps'` | -90 to 90, ej (0,0) | [PuzzleArtifactRenderer.tsx#L817](../../features/play/components/PuzzleArtifactRenderer.tsx#L817) |
| `location_check` | `longitude` | `checkType === 'gps'` | -180 to 180, ej (0,0) | [PuzzleArtifactRenderer.tsx#L817](../../features/play/components/PuzzleArtifactRenderer.tsx#L817) |

---

## 2. SOFT_REQUIRED Keys (Warning, ej Error)

Import bör **VARNA** men fortsätter om dessa saknas.

| artifact_type | Key | Konsekvens om saknas | Evidens |
|---------------|-----|---------------------|---------|
| `hotspot` | `imageUrl` | Renderar tom vy | [PuzzleArtifactRenderer.tsx#L553](../../features/play/components/PuzzleArtifactRenderer.tsx#L553) |
| `tile_puzzle` | `imageUrl` | Renderar "saknar konfiguration" | [PuzzleArtifactRenderer.tsx#L616](../../features/play/components/PuzzleArtifactRenderer.tsx#L616) |
| `audio` | `audioUrl` | Renderar "ej konfigurerad" | [PuzzleArtifactRenderer.tsx#L324](../../features/play/components/PuzzleArtifactRenderer.tsx#L324) |

---

## 3. Risk-Defaults och Policy-beslut

### 🔴 POLICY: `counter.target` — Server/Client Mismatch

| Miljö | Default | Konsekvens |
|-------|---------|------------|
| **Server** | `null` (unlimited) | Completion-logik: `currentValue >= target` → aldrig true om `target === null` |
| **Client** | `1` | UI visar progress mot target `1` |

**Evidens** (ej policy):
- Server: [puzzle/route.ts#L234-L237](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L234-L237)
- Client: [PuzzleArtifactRenderer.tsx#L272-L275](../../features/play/components/PuzzleArtifactRenderer.tsx#L272-L275)

**Risk**: Import utan explicit `target` → server ser pusslet som "aldrig klart" medan UI visar progress mot 1.

---

#### 📋 POLICY-BESLUT (ej evidens)

**Valt alternativ**: Import **MÅSTE** kräva explicit `target` (HARD_REQUIRED).

| Alternativ | Beskrivning |
|------------|-------------|
| A) HARD_REQUIRED | Import avbryter om `target` saknas (deterministisk) ✅ **VALT** |
| B) Default till 1 | Normalisering sätter `target=1` med warning (pragmatiskt) |
| C) Default till null | Matchar server-default men UI blir inkonsekvent |


---

## 4. Alias-Normalisering

Import accepterar alias men skriver kanonisk form.

| artifact_type | Alias | Canonical |
|---------------|-------|-----------|
| `riddle` | `prompt` | `promptText` |
| `riddle` | `correctAnswer` | `correctAnswers[]` |
| `riddle` | `acceptedAnswers` | `correctAnswers` |
| `qr_gate` | `correctAnswer` | `expectedValue` |
| `qr_gate` | `instruction` | `promptText` |
| `hotspot` | `zones` | `hotspots` |
| `hotspot` | `showFeedback` | `showProgress` |
| `tile_puzzle` | `allowPreview` | `showPreview` |
| `cipher` | `cipherText` | `encodedMessage` |
| `cipher` | `plaintext` | `expectedPlaintext` |
| `cipher` | `cipherMethod` | `cipherType` |
| `cipher` | `cipherKey` | `caesarShift` |
| `cipher` | `showDecoderHelper` | `showDecoderUI` |
| `prop_confirmation` | `propDescription` | `propName` |
| `prop_confirmation` | `instruction` | `instructions` |
| `location_check` | `method` | `checkType` |
| `location_check` | `qrCode` | `qrCodeValue` |
| `sound_level` | `instruction` | `instructions` |
| `sound_level` | `threshold` | `thresholdLevel` |
| `sound_level` | `holdDuration` | `sustainDuration` |
| `audio` | `src` | `audioUrl` |
| `audio` | `autoplay` | `autoPlay` |
| `audio` | `transcript` | `transcriptText` |

---

## 5. Artifact Types Utan Metadata-Validering

Dessa typer läser ingen metadata i Play och kräver ingen validering:

| artifact_type | Beteende | Evidens |
|---------------|----------|---------|
| `card` | Statisk visning | No evidence of metadata read |
| `document` | Statisk visning | No evidence of metadata read |
| `image` | Statisk visning | No evidence of metadata read |
| `replay_marker` | Renderar `null` | [PuzzleArtifactRenderer.tsx#L964-L966](../../features/play/components/PuzzleArtifactRenderer.tsx#L964-L966) |

---

## 6. Import Pipeline Recommendations

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PARSE     │───▶│  NORMALIZE  │───▶│  VALIDATE   │───▶│   WRITE     │
│  (CSV/JSON) │    │ (alias→can) │    │ (errors/wn) │    │  (to DB)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                   │
                          ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │  WARNINGS   │    │   ERRORS    │
                   │ (continue)  │    │  (ABORT)    │
                   └─────────────┘    └─────────────┘
```

### Import Validation Checklist

```typescript
// Pseudo-kod för import-validering
for (const artifact of importData.artifacts) {
  const { canonical, validation, normalizeWarnings } = 
    normalizeAndValidate(artifact.artifact_type, artifact.metadata);
  
  // Logga normaliserings-warnings
  for (const warn of normalizeWarnings) {
    log.warn(`[${artifact.id}] ${warn}`);
  }
  
  // Logga validerings-warnings
  for (const warn of validation.warnings) {
    log.warn(`[${artifact.id}] ${warn}`);
  }
  
  // ABORT om validerings-errors
  if (!validation.ok) {
    for (const err of validation.errors) {
      log.error(`[${artifact.id}] ${err}`);
    }
    throw new ImportValidationError(validation.errors);
  }
  
  // Skriv kanonisk metadata
  artifact.metadata = canonical;
}
```

---

## 7. Pre-Import Checklist

Innan import körs, verifiera:

### Nivå 1: Blockerande (avbryter import)

- [ ] Alla `keypad` har non-empty `correctCode`
- [ ] Alla `riddle` har `correctAnswers` med minst 1 element
- [ ] Alla `multi_answer` har `items` med minst 1 element
- [ ] Alla `qr_gate` har non-empty `expectedValue`
- [ ] Alla `hint_container` har `hints` med minst 1 element
- [ ] Alla `hotspot` har `hotspots` med minst 1 element
- [ ] Alla `cipher` har non-empty `encodedMessage` och `expectedPlaintext`
- [ ] Alla `logic_grid` har `categories` med minst 1 element
- [ ] Alla `location_check` med `checkType=gps` har giltiga `latitude`/`longitude`
- [ ] Alla `conversation_cards_collection` har non-empty `conversation_card_collection_id`

### Nivå 2: Varning (fortsätter men loggar)

- [ ] Alla `hotspot` har non-empty `imageUrl`
- [ ] Alla `tile_puzzle` har non-empty `imageUrl`
- [ ] Alla `audio` har non-empty `audioUrl`
- [ ] Alla `counter` har explicit `target` (undvik server/client mismatch)

### Nivå 3: Info (dokumentera för audit)

- [ ] Alias-normaliseringar loggade
- [ ] Okända artifact_types noterade

---

## 8. Metrics per Typ

| artifact_type | HARD | COND | QUAL | SOFT | OPTIONAL | Alias |
|---------------|------|------|------|------|----------|-------|
| `keypad` | 1 | 0 | 0 | 0 | 6 | 0 |
| `riddle` | 1 | 0 | 0 | 0 | 5 | 3 |
| `counter` | 1⚠️ | 0 | 0 | 0 | 3 | 0 |
| `multi_answer` | 1 | 0 | 0 | 0 | 4 | 0 |
| `qr_gate` | 1 | 0 | 0 | 0 | 5 | 2 |
| `hint_container` | 0 | 0 | 1 | 0 | 3 | 0 |
| `hotspot` | 1 | 0 | 0 | 1 | 4 | 2 |
| `tile_puzzle` | 0 | 0 | 0 | 1 | 4 | 1 |
| `cipher` | 0 | 0 | 2 | 0 | 5 | 5 |
| `logic_grid` | 1 | 0 | 0 | 0 | 4 | 0 |
| `prop_confirmation` | 0 | 0 | 0 | 0 | 5 | 2 |
| `location_check` | 0 | 2 | 0 | 0 | 7 | 2 |
| `sound_level` | 0 | 0 | 0 | 0 | 6 | 3 |
| `audio` | 0 | 0 | 0 | 1 | 5 | 3 |
| `conversation_cards_collection` | 1 | 0 | 0 | 0 | 0 | 0 |
| `signal_generator` | 0 | 0 | 0 | 0 | 2 | 0 |
| `time_bank_step` | 0 | 0 | 0 | 0 | 4 | 0 |
| `empty_artifact` | 0 | 0 | 0 | 0 | 6 | 0 |
| `replay_marker` | 0 | 0 | 0 | 0 | 0 | 0 |

**Legend**: HARD = HARD_REQUIRED, COND = Conditional, QUAL = Quality Gate, SOFT = SOFT_REQUIRED

**⚠️ counter.target är HARD_REQUIRED per policy-beslut (server/client mismatch)**

---

## 9. Zod Schemas Location

Maskinläsbara scheman finns i:

```
lib/import/metadataSchemas.ts
```

Exporterade funktioner:
- `normalizeAndValidate(artifactType, rawMetadata)` — Master dispatcher
- Per-type: `normalizeXxx(raw)`, `validateXxx(canonical)`

Returvärde från `normalizeAndValidate()`:
```typescript
interface NormalizeValidateResult {
  canonical: Record<string, unknown>;   // Normaliserad metadata
  validation: ValidationResult;          // { ok, errors[], warnings[] }
  normalizeWarnings: string[];           // Varningar från normalisering
  appliedAliases: string[];              // "cipherText → encodedMessage"
}
```

---

## 10. ✅ DONE: Integrera i Import-routen

**Status**: Implementerat 2025-02-01

`/api/games/csv-import/route.ts` använder nu `validateAndNormalizeMetadata()` som single gate:

```typescript
// validateAndNormalizeMetadata körs FÖRE validateGames()
const metadataResult = validateAndNormalizeMetadata(parsedJson);
if (!metadataResult.isValid) {
  return NextResponse.json({
    status: 'error',
    errorCode: 'VALIDATION_ERRORS',
    errors: [...metadataResult.errors, ...metadataResult.warnings],
    ...
  }, { status: 400 });
}
```

**Beteende**:
- ⛔ Errors → Import avbryts, ingen DB-skrivning
- ⚠️ Warnings → Loggas, import fortsätter
- 📝 appliedAliases → Loggas för audit-trail

---

## 11. Contract Tests

Tester som låser in beteendet finns i:
```
tests/unit/import/metadataSchemas.test.ts
```

| Test | Scenario | Förväntat |
|------|----------|-----------|
| 1 | `counter` utan `target` | ⛔ error (policy) |
| 2 | `location_check` med `checkType='qr'` utan lat/lon | ✅ ok |
| 3 | `location_check` med `checkType='gps'` och (0,0) | ⛔ error |
| 4 | `hint_container` med `hints=[]` | ⛔ error (QUALITY_GATE) |
| 5 | `cipher` med alias | ✅ normaliseras + validerar |
| 6 | Okänd artifact_type | ⛔ error (policy) |

---

## 12. ✅ DONE: Trigger ID-Mappning + Ref Rewrite (Pre-flight)

**Status**: Implementerat 2025-02-01 (refaktorerat till pre-flight 2026-02-01)

**Problem löst**: Triggers refererar till `artifactId`, `stepId`, `phaseId` etc. Vid import måste dessa valideras och skrivas om INNAN någon DB-write sker, för att undvika partial imports.

### ⚠️ Tidigare risk: Partial Imports

Tidigare implementation körde trigger-validering EFTER att steps/phases/artifacts redan skrivits till DB. Om trigger-validering misslyckades hade vi redan skapat entiteter → "partial import" som krävde manuell städning.

### ✅ Nuvarande lösning: Pre-flight Strategi

**Strategi 1: Pre-generate IDs + Pre-flight rewrite**

```
PHASE 1: Pre-generate UUIDs (i app-lagret)
├── steps     → Map<stepOrder, UUID>
├── phases    → Map<phaseOrder, UUID>
└── artifacts → Map<artifactOrder, UUID>

PHASE 2: Pre-flight trigger validation
├── Build TriggerIdMap from pre-generated UUIDs
├── Call rewriteAllTriggerRefs()
└── If errors → throw BEFORE any DB writes

PHASE 3: DB Writes (only if pre-flight passed)
├── Insert steps (with pre-generated IDs)
├── Insert phases (with pre-generated IDs)
├── Insert artifacts (with pre-generated IDs)
└── Insert triggers (already rewritten)
```

**Garanti**: "No DB writes occur for a game if trigger rewrite fails."

### Implementation

`lib/import/triggerRefRewrite.ts` innehåller:

```typescript
rewriteTriggerRefs(trigger, idMap, index): TriggerRewriteResult
rewriteAllTriggerRefs(triggers, idMap, gameKey): { triggers, errors, warnings }
```

### ID-map struktur

```typescript
interface TriggerIdMap {
  stepIdByOrder: Map<number, string>;
  phaseIdByOrder: Map<number, string>;
  artifactIdByOrder: Map<number, string>;
  artifactIdBySourceId?: Map<string, string>;
  importBatchUuids?: Set<string>;
}
```

### Validering

| Scenario | Resultat |
|----------|----------|
| Missing ref (order not in map) | ⛔ error med path (t.ex. `triggers[0].actions[0].artifactOrder`) |
| Missing ref (sourceId not in map) | ⛔ error |
| Unknown condition type | ⛔ error (POLICY) |
| Unknown action type | ⛔ error (POLICY) |
| UUID not in import batch | ⚠️ warning (accepteras men varnar) |
| Mapped ref | ✅ Rewritten till canonical field |

### Beteende

- UUIDs pre-genereras i app-lagret med `crypto.randomUUID()`
- TriggerIdMap byggs från pre-genererade UUIDs (inte från DB)
- Order-aliases (`stepOrder`, `phaseOrder`, `artifactOrder`) → konverteras till canonical (`stepId`, `phaseId`, `artifactId`)
- Artifact-specifika fält bevaras (`keypadId`, `riddleId`, etc.)
- Errors kastar Exception → import för det spelet avbryts **FÖRE** alla DB writes

### Contract Tests (18 st)

```
tests/unit/import/triggerRefRewrite.test.ts
```

| Test | Scenario | Förväntat |
|------|----------|-----------|
| 1 | artifactOrder not in map | ⛔ error |
| 2 | artifactId (string) not in map | ⛔ error |
| 3 | artifactOrder in map | ✅ rewritten to artifactId |
| 4 | sourceId in map | ✅ rewritten |
| 5 | stepOrder in step_started | ✅ rewritten to stepId |
| 6 | phaseOrder in phase_completed | ✅ rewritten to phaseId |
| 7 | missing step mapping | ⛔ error |
| 8 | mixed refs (condition + actions) | ✅ all rewritten |
| 9 | mixed refs with errors | ⛔ collects both errors |
| 10 | unknown condition type | ⛔ error (POLICY) |
| 11 | unknown action type | ⛔ error (POLICY) |
| 12 | missing condition type | ⛔ error |
| 13 | UUID passthrough (no mapping needed) | ✅ accepted |
| 14 | UUID not in import batch | ⚠️ warning |
| 15 | UUID in import batch | ✅ no warning |
| 16 | batch processing | ✅ collects all errors |
| 17 | keypad_correct with artifactOrder | ✅ rewritten to keypadId |
| 18 | riddle_correct with sourceId | ✅ rewritten to riddleId |

---

## 13. ✅ DONE: PreflightValidationError + Collision Checks

**Status**: Implementerat 2026-02-01

### Typed Error Class

```typescript
class PreflightValidationError extends Error {
  public readonly errors: ImportError[];
  constructor(errors: ImportError[], message?: string);
}
```

**Garanti**: Pre-flight fel returneras som strukturerade `ImportError[]` med korrekt `column`, `message`, `severity`.

### Order Collision Detection

| Entity | Check | Error Format |
|--------|-------|--------------|
| `steps` | `stepIdByOrder.has(order)` | `steps[N].step_order: Duplicate step_order=X` |
| `phases` | `phaseIdByOrder.has(order)` | `phases[N].phase_order: Duplicate phase_order=X` |
| `artifacts` | `artifactIdByOrder.has(order)` | `artifacts[N].artifact_order: Duplicate artifact_order=X` |

### Log Markers

```
preflight.trigger_rewrite.ok game=... triggers=N
preflight.fail game=... errors=N reason=order_collision|trigger_refs
db.write.begin game=... steps=N phases=N artifacts=N
db.write.done game=...
```

### Contract Tests (utökade)

```
tests/unit/import/preflightOrder.test.ts
```

| Test | Scenario |
|------|----------|
| 1-7 | Phase order, rewrite before insert, log markers |
| 8-10 | Collision checks för step/phase/artifact order |
| 11-14 | PreflightValidationError definition + catch handling |

---

## 14. Kända Begränsningar

### ⚠️ DB Atomicity vid Update (isUpdate)

**Risk**: Vid `isUpdate=true` körs `delete → insert` i sekvens. Om något failar mitt i (network, constraint, timeout) kan spelet hamna i "halv-uppdaterat" tillstånd.

**Nuvarande beteende**:
- Pre-flight passerar ✅
- Deletes körs ✅
- Insert failar mitt i ❌
- → Partial data kvar i DB

**Mitigation**: Ej implementerat ännu. Se sektion 15.

### ⚠️ Idempotency vid Re-import

**Risk**: Om samma CSV importeras två gånger skapas nya UUIDs varje gång → duplicates eller ersättning beroende på upsert-läge.

**Nuvarande beteende**:
- `upsert=true` + `game_key` → uppdaterar spel-raden
- Steps/phases/artifacts får NYA IDs varje gång
- Gamla sessions kan bli invalid

**Mitigation**: Ej implementerat ännu. Se sektion 15.

---

## 15. Framtida Förbättringar (Roadmap)

### Prioritet 1: Atomic Update/Import ⏳ PLANERAT

**Plan**: [IMPORT_ATOMICITY_PLAN.md](IMPORT_ATOMICITY_PLAN.md)

| Alternativ | Beskrivning | Komplexitet | Status |
|------------|-------------|-------------|--------|
| **A) RPC-transaktion** | Postgres function som kör delete+insert i transaktion | Medium | ⏳ Valt |
| **B) Staging + promote** | Skriv till staging, validera, switch active_version | High | ❌ Ej valt |

**Beslut**: RPC-transaktion (Alternativ A) — matchar befintliga mönster (`upsert_game_reaction`, `attempt_keypad_unlock_v2`).

### Prioritet 2: RLS + Auth Enforcement Audit

- [ ] Verifiera att import-route kräver `tenant_admin` eller `system_admin`
- [ ] Verifiera att `owner_tenant_id` sätts korrekt
- [ ] Verifiera att service role inte kringgår tenant-checks

### Prioritet 3: Idempotency Policy

| Alternativ | Beskrivning |
|------------|-------------|
| **Deterministiska UUIDs** | Hash av `(game_key, entity_type, order)` → samma ID vid re-import |
| **Entity keys** | `artifact_key`, `step_key` som stabila identifiers |
| **Version tracking** | `game_content_version` som ökar vid varje import |

### Prioritet 4: Observability

- [ ] `importRunId = randomUUID()` per request för log-korrelation
- [ ] Summary metrics per game: `{steps: N, phases: N, artifacts: N, triggers: N}`
- [ ] Dashboard för import-statistik

---

## 16. Test Coverage Summary

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `metadataSchemas.test.ts` | 24 | Metadata validation + normalization |
| `triggerRefRewrite.test.ts` | 18 | Trigger ref rewriting + validation |
| `preflightOrder.test.ts` | 18 | Pre-flight order, collision, typed errors |
| **Total** | **60** | |

---

*Genererad 2025-01-27. Uppdaterad 2026-02-01 med pre-flight trigger validation, PreflightValidationError, collision checks, och roadmap.*
