# Canonical Metadata Contract

> **Syfte**: Definiera *en* kanonisk key-struktur per artifact_type för import.  
> **Policy**: Endast evidens från kod. Policy-beslut markeras explicit.  
> **Källa**: [BUILDER_METADATA_CONTRACT.md](BUILDER_METADATA_CONTRACT.md)  
> **Datum**: 2025-01-27

---

## Canonical Output Guarantee

1. **Import skriver alltid canonical keys** — aldrig alias
2. **Alias accepteras endast vid input** — normaliseras till canonical
3. **Export/roundtrip utgår från canonical** — konsekvent dataformat
4. **Policy-beslut dokumenteras separat** — ej blandat med Play-evidens

---

## Klassificering

| Nivå | Symbol | Betydelse | Import-beteende |
|------|--------|-----------|-----------------|
| **HARD_REQUIRED** | 🔴 | Saknas → trasig spelupplevelse | Import **AVBRYTER** med error |
| **HARD_REQUIRED (policy)** | 🔴📋 | Saknas → mismatch/inkonsistens (policy-beslut) | Import **AVBRYTER** med error |
| **HARD_REQUIRED (conditional)** | 🔴❓ | Saknas → trasig om villkor uppfyllt | Import **AVBRYTER** om villkor sant |
| **QUALITY_GATE** | 🟠 | Saknas → meningslös artifact (ej krasch) | Import **AVBRYTER** (content quality) |
| **SOFT_REQUIRED** | 🟡 | Saknas → tom/märklig render | Import **VARNAR** men fortsätter |
| **OPTIONAL** | ⚪ | Saknas → säker default | Import accepterar tyst |

---

## 1. keypad

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `correctCode` | `string` | 🔴 HARD_REQUIRED | – | – |
| `codeLength` | `number` | ⚪ OPTIONAL | – | `undefined` |
| `maxAttempts` | `number \| null` | ⚪ OPTIONAL | – | `null` |
| `lockOnFail` | `boolean` | ⚪ OPTIONAL | – | `false` |
| `successMessage` | `string` | ⚪ OPTIONAL | – | `undefined` |
| `failMessage` | `string` | ⚪ OPTIONAL | – | `undefined` |
| `lockedMessage` | `string` | ⚪ OPTIONAL | – | `undefined` |

### Evidens
- `correctCode` är 🔴 eftersom servern validerar mot detta värde. Tom sträng → alltid fel.
- **Källa**: [keypad/route.ts#L47-L57](../../app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts#L47-L57)

---

## 2. riddle

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `correctAnswers` | `string[]` | 🔴 HARD_REQUIRED | `acceptedAnswers`, `correctAnswer` (single→array) | – |
| `promptText` | `string` | ⚪ OPTIONAL | `prompt` | `''` |
| `normalizeMode` | `'exact'\|'fuzzy'\|'loose'` | ⚪ OPTIONAL | – | `'fuzzy'` |
| `maxAttempts` | `number \| null` | ⚪ OPTIONAL | – | `null` |
| `hintText` | `string` | ⚪ OPTIONAL | – | `undefined` |
| `showHintAfterAttempts` | `number` | ⚪ OPTIONAL | – | `undefined` |

### Normalisering
```typescript
// Alias normalisering
if (raw.prompt && !raw.promptText) canonical.promptText = raw.prompt;
if (raw.correctAnswer && !raw.correctAnswers) canonical.correctAnswers = [raw.correctAnswer];
if (raw.acceptedAnswers && !raw.correctAnswers) canonical.correctAnswers = raw.acceptedAnswers;
```

### Evidens
- `correctAnswers` är 🔴 eftersom `handleRiddleSubmit()` använder `(metadata.correctAnswers || [])` – tom array → aldrig rätt svar.
- **Källa**: [puzzle/route.ts#L147-L149](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L147-L149)
- **Client**: [PuzzleArtifactRenderer.tsx#L223-L232](../../features/play/components/PuzzleArtifactRenderer.tsx#L223-L232)

---

## 3. counter

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `target` | `number` | �📋 HARD_REQUIRED (policy) | – | ⚠️ Mismatch: server `null`, client `1` |
| `step` | `number` | ⚪ OPTIONAL | – | `1` |
| `initialValue` | `number` | ⚪ OPTIONAL | – | `0` |
| `label` | `string` | ⚪ OPTIONAL | – | `'Räknare'` |

### Normalisering
```typescript
// KRITISKT: Explicit target för att undvika server/client mismatch
if (raw.target === undefined) {
  warnings.push('counter.target saknas – sätts explicit till 1 för konsistens');
  canonical.target = 1;
}
```

### Evidens och Policy
- `target` evidens: **default-mismatch** – server ger `null` (unlimited), client ger `1`.
- **POLICY-BESLUT**: Eftersom mismatch ger inkonsekvent beteende, klassas detta som 🔴📋 HARD_REQUIRED.
- Import **måste** sätta explicit värde (default: `1`).
- **Server**: [puzzle/route.ts#L234-L237](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L234-L237)
- **Client**: [PuzzleArtifactRenderer.tsx#L272-L275](../../features/play/components/PuzzleArtifactRenderer.tsx#L272-L275)

---

## 4. multi_answer

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `items` | `string[]` | 🔴 HARD_REQUIRED | – | – |
| `checks` | `Array<{id, type, label, required}>` | ⚪ OPTIONAL | – | Generated from `items` |
| `requiredCount` | `number` | ⚪ OPTIONAL | – | `items.length` |
| `requireAll` | `boolean` | ⚪ OPTIONAL | – | `true` |
| `showProgress` | `boolean` | ⚪ OPTIONAL | – | `true` |

### Normalisering
```typescript
// Om checks finns men inte items, extrahera items från checks
if (raw.checks && !raw.items) {
  canonical.items = raw.checks.map(c => c.label);
}
```

### Evidens
- `items` är 🔴 eftersom server använder `(metadata.items || [])` och tom array = inget att checka.
- **Källa**: [puzzle/route.ts#L305-L307](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L305-L307)

---

## 5. qr_gate

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `expectedValue` | `string` | 🔴 HARD_REQUIRED | `correctAnswer` | – |
| `mode` | `'qr'\|'barcode'\|'manual'` | ⚪ OPTIONAL | – | `'qr'` |
| `allowedValues` | `string[]` | ⚪ OPTIONAL | – | `[expectedValue]` |
| `promptText` | `string` | ⚪ OPTIONAL | `instruction` | `'Skanna QR-kod'` |
| `fallbackCode` | `string` | ⚪ OPTIONAL | – | `undefined` |
| `allowManualFallback` | `boolean` | ⚪ OPTIONAL | – | `true` |

### Normalisering
```typescript
if (raw.correctAnswer && !raw.expectedValue) canonical.expectedValue = raw.correctAnswer;
if (raw.instruction && !raw.promptText) canonical.promptText = raw.instruction;
```

### Evidens
- `expectedValue` är 🔴 eftersom server jämför `scannedValue === expectedValue`. Tom sträng → aldrig match.
- **Källa**: [puzzle/route.ts#L360-L362](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L360-L362)

---

## 6. hint_container

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `hints` | `Array<{id?, text, penaltySeconds?}>` | � QUALITY_GATE | – | – |
| `penaltyPerHint` | `number` | ⚪ OPTIONAL | – | `0` |
| `maxHints` | `number` | ⚪ OPTIONAL | – | `hints.length` |
| `cooldownSeconds` | `number` | ⚪ OPTIONAL | – | `0` |

### Normalisering
```typescript
// Stödjer string[] för legacy
if (Array.isArray(raw.hints) && typeof raw.hints[0] === 'string') {
  canonical.hints = raw.hints.map((text, i) => ({ id: String(i), text }));
}
```

### Evidens
- `hints` är � QUALITY_GATE: tom array = inga hints att visa → meningslös artifact (men ingen krasch).
- **Källa**: [PuzzleArtifactRenderer.tsx#L499-L511](../../features/play/components/PuzzleArtifactRenderer.tsx#L499-L511)

---

## 7. hotspot

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `imageUrl` | `string` | 🟡 SOFT_REQUIRED | – | `''` |
| `hotspots` | `Array<{id, x, y, radius, label?, required?}>` | 🔴 HARD_REQUIRED | `zones` | – |
| `imageArtifactId` | `string` | ⚪ OPTIONAL | – | `''` |
| `showProgress` | `boolean` | ⚪ OPTIONAL | `showFeedback` | `true` |
| `hapticFeedback` | `boolean` | ⚪ OPTIONAL | – | `true` |
| `requireAll` | `boolean` | ⚪ OPTIONAL | – | `true` |

### Normalisering
```typescript
if (raw.zones && !raw.hotspots) canonical.hotspots = raw.zones;
if (raw.showFeedback !== undefined && raw.showProgress === undefined) {
  canonical.showProgress = raw.showFeedback;
}
```

### Evidens
- `imageUrl` är 🟡 eftersom klienten renderar tom vy om saknas.
- `hotspots` är 🔴 eftersom tom array = inget att hitta.
- **Källa**: [PuzzleArtifactRenderer.tsx#L553-L569](../../features/play/components/PuzzleArtifactRenderer.tsx#L553-L569)

---

## 8. tile_puzzle

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `imageUrl` | `string` | 🟡 SOFT_REQUIRED | – | `''` |
| `gridSize` | `'2x2'\|'3x3'\|'4x4'\|'3x2'\|'4x3'` | ⚪ OPTIONAL | – | `'3x3'` |
| `rows` | `number` | ⚪ OPTIONAL | – | `3` |
| `cols` | `number` | ⚪ OPTIONAL | – | `3` |
| `imageArtifactId` | `string` | ⚪ OPTIONAL | – | `''` |
| `showPreview` | `boolean` | ⚪ OPTIONAL | `allowPreview` | `false` |

### Normalisering
```typescript
if (raw.allowPreview !== undefined && raw.showPreview === undefined) {
  canonical.showPreview = raw.allowPreview;
}
// Prefer gridSize over rows/cols
if (!raw.gridSize && raw.rows && raw.cols) {
  canonical.gridSize = `${raw.rows}x${raw.cols}`;
}
```

### Evidens
- `imageUrl` är 🟡 eftersom tom render utan bild.
- **Källa**: [PuzzleArtifactRenderer.tsx#L616-L633](../../features/play/components/PuzzleArtifactRenderer.tsx#L616-L633)

---

## 9. cipher

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `encodedMessage` | `string` | � QUALITY_GATE | `cipherText` | – |
| `expectedPlaintext` | `string` | 🟠 QUALITY_GATE | `plaintext` | – |
| `cipherType` | `'caesar'\|'atbash'\|'substitution'` | ⚪ OPTIONAL | `cipherMethod` | `'caesar'` |
| `caesarShift` | `number` | ⚪ OPTIONAL | `cipherKey` | `3` |
| `substitutionMap` | `Record<string, string>` | ⚪ OPTIONAL | – | `undefined` |
| `showDecoderUI` | `boolean` | ⚪ OPTIONAL | `showDecoderHelper` | `true` |
| `normalizeMode` | `'exact'\|'fuzzy'\|'loose'` | ⚪ OPTIONAL | – | `'fuzzy'` |

### Normalisering
```typescript
if (raw.cipherText && !raw.encodedMessage) canonical.encodedMessage = raw.cipherText;
if (raw.plaintext && !raw.expectedPlaintext) canonical.expectedPlaintext = raw.plaintext;
if (raw.cipherMethod && !raw.cipherType) canonical.cipherType = raw.cipherMethod;
if (raw.cipherKey !== undefined && raw.caesarShift === undefined) canonical.caesarShift = raw.cipherKey;
if (raw.showDecoderHelper !== undefined && raw.showDecoderUI === undefined) {
  canonical.showDecoderUI = raw.showDecoderHelper;
}
```

### Evidens
- `encodedMessage` och `expectedPlaintext` är � QUALITY_GATE: tomma strängar = inget att dekoda → meningslös artifact (men ingen krasch).
- **Källa**: [PuzzleArtifactRenderer.tsx#L681-L692](../../features/play/components/PuzzleArtifactRenderer.tsx#L681-L692)

---

## 10. logic_grid

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `categories` | `Array<{id, name, items[]}>` | 🔴 HARD_REQUIRED | – | – |
| `rows` | `string[]` | ⚪ OPTIONAL | – | – (legacy) |
| `columns` | `string[]` | ⚪ OPTIONAL | – | – (legacy) |
| `clues` | `Array<{id, text, ...}>` | ⚪ OPTIONAL | – | `[]` |
| `solution` | `Array<{...}>` | ⚪ OPTIONAL | – | `[]` |
| `title` | `string` | ⚪ OPTIONAL | – | `artifact.title` |

### Normalisering
```typescript
// Legacy rows/columns → categories
if ((raw.rows || raw.columns) && !raw.categories) {
  canonical.categories = [];
  if (raw.rows) canonical.categories.push({ id: 'rows', name: 'Rader', items: raw.rows });
  if (raw.columns) canonical.categories.push({ id: 'cols', name: 'Kolumner', items: raw.columns });
}
```

### Evidens
- `categories` är 🔴 eftersom tom array = inget grid att visa.
- **Källa**: [PuzzleArtifactRenderer.tsx#L720-L733](../../features/play/components/PuzzleArtifactRenderer.tsx#L720-L733)

---

## 11. prop_confirmation

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `propName` | `string` | ⚪ OPTIONAL | `propDescription`, `instruction` | `'Föremål'` |
| `propImageUrl` | `string` | ⚪ OPTIONAL | – | `undefined` |
| `propId` | `string` | ⚪ OPTIONAL | – | `artifact.id` |
| `instructions` | `string` | ⚪ OPTIONAL | `instruction` | `'Visa upp föremålet...'` |
| `requirePhoto` | `boolean` | ⚪ OPTIONAL | – | `false` |

### Normalisering
```typescript
if (raw.propDescription && !raw.propName) canonical.propName = raw.propDescription;
if (raw.instruction && !raw.instructions) canonical.instructions = raw.instruction;
```

### Evidens
- Alla keys är ⚪ eftersom default-värden fungerar.
- **Källa**: [PuzzleArtifactRenderer.tsx#L773-L781](../../features/play/components/PuzzleArtifactRenderer.tsx#L773-L781)

---

## 12. location_check

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `latitude` | `number` | 🔴❓ HARD_REQUIRED (iff checkType=gps) | – | ⚠️ Default `0` är ogiltigt |
| `longitude` | `number` | 🔴❓ HARD_REQUIRED (iff checkType=gps) | – | ⚠️ Default `0` är ogiltigt |
| `radius` | `number` | ⚪ OPTIONAL | – | `50` |
| `locationName` | `string` | ⚪ OPTIONAL | – | `''` |
| `locationId` | `string` | ⚪ OPTIONAL | – | `artifact.id` |
| `checkType` | `'gps'\|'qr'\|'manual'` | ⚪ OPTIONAL | `method` | `'gps'` |
| `qrCodeValue` | `string` | ⚪ OPTIONAL | `qrCode` | `undefined` |
| `showDistance` | `boolean` | ⚪ OPTIONAL | – | `true` |
| `showCompass` | `boolean` | ⚪ OPTIONAL | – | `true` |

### Normalisering
```typescript
if (raw.method && !raw.checkType) canonical.checkType = raw.method;
if (raw.qrCode && !raw.qrCodeValue) canonical.qrCodeValue = raw.qrCode;
```

### Validering
```typescript
// KRITISKT: lat/lon 0 är ogiltigt för GPS-check
if (canonical.checkType === 'gps' || canonical.checkType === undefined) {
  if (canonical.latitude === 0 && canonical.longitude === 0) {
    errors.push('location_check: latitude/longitude (0,0) är ogiltigt för GPS-kontroll');
  }
  if (canonical.latitude < -90 || canonical.latitude > 90) {
    errors.push('location_check: latitude måste vara -90 till 90');
  }
  if (canonical.longitude < -180 || canonical.longitude > 180) {
    errors.push('location_check: longitude måste vara -180 till 180');
  }
}
```

### Evidens
- `latitude`/`longitude` är 🔴❓ **conditional**: endast HARD_REQUIRED om `checkType === 'gps'` (eller undefined/default).
- För `checkType === 'qr'` eller `'manual'` är koordinater ej nödvändiga.
- Default `0` = Atlanten (semantiskt fel för GPS-mode).
- **Källa**: [PuzzleArtifactRenderer.tsx#L817-L834](../../features/play/components/PuzzleArtifactRenderer.tsx#L817-L834)

---

## 13. sound_level

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `instructions` | `string` | ⚪ OPTIONAL | `instruction` | `'Gör ljud!'` |
| `triggerMode` | `'threshold'\|'peak'\|'sustained'` | ⚪ OPTIONAL | – | `'threshold'` |
| `thresholdLevel` | `number` | ⚪ OPTIONAL | `threshold` | `70` |
| `sustainDuration` | `number` | ⚪ OPTIONAL | `holdDuration` | `2` |
| `activityLabel` | `string` | ⚪ OPTIONAL | – | `artifact.title` |
| `showMeter` | `boolean` | ⚪ OPTIONAL | – | `true` |

### Normalisering
```typescript
if (raw.instruction && !raw.instructions) canonical.instructions = raw.instruction;
if (raw.threshold !== undefined && raw.thresholdLevel === undefined) {
  canonical.thresholdLevel = raw.threshold;
}
if (raw.holdDuration !== undefined && raw.sustainDuration === undefined) {
  canonical.sustainDuration = raw.holdDuration;
}
```

### Evidens
- Alla keys är ⚪ eftersom defaults fungerar.
- **Källa**: [PuzzleArtifactRenderer.tsx#L915-L931](../../features/play/components/PuzzleArtifactRenderer.tsx#L915-L931)

---

## 14. audio

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `audioUrl` | `string` | 🟡 SOFT_REQUIRED | `src` | `''` |
| `autoPlay` | `boolean` | ⚪ OPTIONAL | `autoplay` | `false` |
| `loop` | `boolean` | ⚪ OPTIONAL | – | `false` |
| `requireAck` | `boolean` | ⚪ OPTIONAL | – | `false` |
| `showTranscript` | `boolean` | ⚪ OPTIONAL | – | `false` |
| `transcriptText` | `string` | ⚪ OPTIONAL | `transcript` | `undefined` |

### Normalisering
```typescript
if (raw.src && !raw.audioUrl) canonical.audioUrl = raw.src;
if (raw.autoplay !== undefined && raw.autoPlay === undefined) canonical.autoPlay = raw.autoplay;
if (raw.transcript && !raw.transcriptText) canonical.transcriptText = raw.transcript;
```

### Evidens
- `audioUrl` är 🟡 eftersom tom render visas om saknas.
- **Källa**: [PuzzleArtifactRenderer.tsx#L324-L332](../../features/play/components/PuzzleArtifactRenderer.tsx#L324-L332)

---

## 15. conversation_cards_collection

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `conversation_card_collection_id` | `string` | 🔴 HARD_REQUIRED | – | – |

### Evidens
- `conversation_card_collection_id` är 🔴 eftersom `null` → inga kort laddas.
- **Källa**: [ConversationCardsCollectionArtifact.tsx#L27-L31](../../features/play/components/ConversationCardsCollectionArtifact.tsx#L27-L31)

---

## 16. signal_generator

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `signalConfig.label` | `string` | ⚪ OPTIONAL | – | `'Signal'` |
| `signalConfig.outputs` | `string[]` | ⚪ OPTIONAL | – | `['visual']` |

### Evidens
- Alla keys är ⚪.
- **Källa**: [PuzzleArtifactRenderer.tsx#L972-L976](../../features/play/components/PuzzleArtifactRenderer.tsx#L972-L976)

---

## 17. time_bank_step

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `timerConfig.initialSeconds` | `number` | ⚪ OPTIONAL | – | `300` |
| `timerConfig.displayStyle` | `string` | ⚪ OPTIONAL | – | `'countdown'` |
| `timerConfig.warningThreshold` | `number` | ⚪ OPTIONAL | – | `60` |
| `timerConfig.criticalThreshold` | `number` | ⚪ OPTIONAL | – | `30` |

### Evidens
- Alla keys är ⚪.
- **Källa**: [PuzzleArtifactRenderer.tsx#L1002-L1015](../../features/play/components/PuzzleArtifactRenderer.tsx#L1002-L1015)

---

## 18. empty_artifact

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| `emptyConfig.purpose` | `'placeholder'\|'host_note'\|'break_marker'` | ⚪ OPTIONAL | – | `'placeholder'` |
| `emptyConfig.placeholderText` | `string` | ⚪ OPTIONAL | – | `''` |
| `emptyConfig.backgroundColor` | `string` | ⚪ OPTIONAL | – | `undefined` |
| `emptyConfig.minHeight` | `number` | ⚪ OPTIONAL | – | `100` |
| `emptyConfig.showBorder` | `boolean` | ⚪ OPTIONAL | – | `true` |
| `emptyConfig.icon` | `string` | ⚪ OPTIONAL | – | `'📦'` |

### Evidens
- Alla keys är ⚪.
- **Källa**: [PuzzleArtifactRenderer.tsx#L1063-L1077](../../features/play/components/PuzzleArtifactRenderer.tsx#L1063-L1077)

---

## 19. replay_marker

### Canonical Schema

| Canonical Key | Type | Level | Accepted Aliases | Default |
|--------------|------|-------|------------------|---------|
| – | – | – | – | – |

### Evidens
- Ingen metadata läses. Renderar `null`.
- **Källa**: [PuzzleArtifactRenderer.tsx#L964-L966](../../features/play/components/PuzzleArtifactRenderer.tsx#L964-L966)

---

## Statiska Artifact Types (ej puzzle)

| artifact_type | Metadata | Notes |
|---------------|----------|-------|
| `card` | No evidence | Statisk visning |
| `document` | No evidence | Statisk visning |
| `image` | No evidence | Statisk visning |

---

## Sammanfattning: HARD_REQUIRED Keys

### 🔴 HARD_REQUIRED (evidens: Play kraschar/misslyckas)

| artifact_type | HARD_REQUIRED Keys |
|---------------|-------------------|
| `keypad` | `correctCode` |
| `riddle` | `correctAnswers` |
| `multi_answer` | `items` |
| `qr_gate` | `expectedValue` |
| `hotspot` | `hotspots` |
| `logic_grid` | `categories` |
| `conversation_cards_collection` | `conversation_card_collection_id` |

**Totalt: 7 keys** (evidensbaserat)

### 🔴📋 HARD_REQUIRED (policy-beslut)

| artifact_type | Key | Skäl |
|---------------|-----|------|
| `counter` | `target` | Server/client default-mismatch (null vs 1) |

**Totalt: 1 key** (policy)

### 🔴❓ HARD_REQUIRED (conditional)

| artifact_type | Keys | Villkor |
|---------------|------|---------|
| `location_check` | `latitude`, `longitude` | Endast om `checkType === 'gps'` (eller undefined) |

**Totalt: 2 keys** (conditional)

### 🟠 QUALITY_GATE (meningslös artifact utan krasch)

| artifact_type | Keys |
|---------------|------|
| `hint_container` | `hints` |
| `cipher` | `encodedMessage`, `expectedPlaintext` |

**Totalt: 3 keys** (quality gate)

---

## Totalstatistik

| Kategori | Antal Keys |
|----------|------------|
| 🔴 HARD_REQUIRED (evidens) | 7 |
| 🔴📋 HARD_REQUIRED (policy) | 1 |
| 🔴❓ HARD_REQUIRED (conditional) | 2 |
| 🟠 QUALITY_GATE | 3 |
| **Kritiska totalt** | **13** |

---

*Genererad 2025-01-27. Endast evidensbaserad. Policy-beslut markerade explicit.*
