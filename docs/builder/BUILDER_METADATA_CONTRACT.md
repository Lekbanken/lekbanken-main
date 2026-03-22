# Metadata Contract Map

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-02-08
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Frozen evidence-based metadata contract map. The canonical active interpretation lives in `BUILDER_METADATA_CONTRACT_CANONICAL.md`, but this file remains useful as raw evidence and comparison material.

**Syfte**: Dokumentera exakt vilka metadata-keys Play faktiskt läser per `artifact_type`.  
**Policy**: Endast evidens från kod. Inga gissningar.

---

## Notation

| Symbol | Betydelse |
|--------|-----------|
| ✅ | Required – Play kraschar eller fallback om key saknas |
| ⚙️ | Optional med default – Play fungerar men använder standardvärde |
| 🔒 | Server-only – Läses bara på servern, aldrig exponerat till klient |

---

## 1. keypad

**Source**: [keypad/route.ts](../../app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts#L47-L57)

```typescript
// parseKeypadConfig() rad 47-57
correctCode: typeof m.correctCode === 'string' ? m.correctCode : undefined,
codeLength: typeof m.codeLength === 'number' ? m.codeLength : undefined,
maxAttempts: typeof m.maxAttempts === 'number' ? m.maxAttempts : null,
lockOnFail: typeof m.lockOnFail === 'boolean' ? m.lockOnFail : false,
successMessage: typeof m.successMessage === 'string' ? m.successMessage : undefined,
failMessage: typeof m.failMessage === 'string' ? m.failMessage : undefined,
lockedMessage: typeof m.lockedMessage === 'string' ? m.lockedMessage : undefined,
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `correctCode` | `string` | ✅ | `undefined` | 🔒 Server-only, aldrig exponerat |
| `codeLength` | `number` | ⚙️ | `undefined` | Används för UI-rendering |
| `maxAttempts` | `number` | ⚙️ | `null` (unlimited) | |
| `lockOnFail` | `boolean` | ⚙️ | `false` | |
| `successMessage` | `string` | ⚙️ | `undefined` | Fallback till hårdkodat meddelande |
| `failMessage` | `string` | ⚙️ | `undefined` | |
| `lockedMessage` | `string` | ⚙️ | `undefined` | |

---

## 2. riddle

**Source**: [puzzle/route.ts](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L147-L149)

```typescript
// handleRiddleSubmit() rad 147-149
const correctAnswers = (metadata.correctAnswers || []) as string[];
const normalizeMode = (metadata.normalizeMode || 'fuzzy') as RiddleNormalizeMode;
const maxAttempts = typeof metadata.maxAttempts === 'number' ? metadata.maxAttempts : null;
```

**Client-side (PuzzleArtifactRenderer)**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L221-L234)

```typescript
// rad 223-232
const promptText = (meta.prompt as string) || (meta.promptText as string) || '';
const riddleConfig: RiddleConfig = {
  acceptedAnswers: (meta.correctAnswers as string[]) || (meta.acceptedAnswers as string[]) || [meta.correctAnswer as string].filter(Boolean),
  normalizeMode: (meta.normalizeMode as RiddleConfig['normalizeMode']) || 'fuzzy',
  maxAttempts: typeof meta.maxAttempts === 'number' ? meta.maxAttempts : undefined,
  hintText: meta.hintText as string | undefined,
  showHintAfterAttempts: typeof meta.showHintAfterAttempts === 'number' ? meta.showHintAfterAttempts : undefined,
  promptText,
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `correctAnswers` | `string[]` | ✅ | `[]` | 🔒 Server validerar, klient visar ej |
| `normalizeMode` | `'exact'\|'fuzzy'\|'loose'` | ⚙️ | `'fuzzy'` | |
| `maxAttempts` | `number` | ⚙️ | `null` (unlimited) | |
| `prompt` / `promptText` | `string` | ⚙️ | `''` | Visas för deltagare |
| `hintText` | `string` | ⚙️ | `undefined` | |
| `showHintAfterAttempts` | `number` | ⚙️ | `undefined` | |

---

## 3. counter

**Source**: [puzzle/route.ts](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L234-L237)

```typescript
// handleCounterAction() rad 234-237
const target = typeof metadata.target === 'number' ? metadata.target : null;
const step = typeof metadata.step === 'number' ? metadata.step : 1;
const initialValue = typeof metadata.initialValue === 'number' ? metadata.initialValue : 0;
```

**Client-side (PuzzleArtifactRenderer)**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L272-L275)

```typescript
// rad 272-275
const target = typeof meta.target === 'number' ? meta.target : 1;
const label = (meta.label as string) || 'Räknare';
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `target` | `number` | ⚙️ | `null` (server) / `1` (client) | ⚠️ Mismatch server/client default |
| `step` | `number` | ⚙️ | `1` | |
| `initialValue` | `number` | ⚙️ | `0` | |
| `label` | `string` | ⚙️ | `'Räknare'` | Client-only |

---

## 4. multi_answer

**Source**: [puzzle/route.ts](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L305-L307)

```typescript
// handleMultiAnswerCheck() rad 305-307
const items = (metadata.items || []) as string[];
const requiredCount = typeof metadata.requiredCount === 'number' ? metadata.requiredCount : items.length;
```

**Client-side (PuzzleArtifactRenderer)**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L355-L369)

```typescript
// rad 356-366
const checks = (meta.checks as MultiAnswerConfig['checks']) || 
  (meta.items as string[])?.map((label, i) => ({
    id: String(i),
    type: 'checkbox' as const,
    label,
    required: true,
  })) || [];

const multiConfig: MultiAnswerConfig = {
  checks,
  requireAll: meta.requireAll !== false,
  showProgress: meta.showProgress !== false,
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `items` | `string[]` | ✅ (server) | `[]` | Gamla formatet |
| `checks` | `Array<{id, type, label, required}>` | ⚙️ | Generated from `items` | Nya formatet |
| `requiredCount` | `number` | ⚙️ | `items.length` | |
| `requireAll` | `boolean` | ⚙️ | `true` | Client-only |
| `showProgress` | `boolean` | ⚙️ | `true` | Client-only |

---

## 5. qr_gate

**Source**: [puzzle/route.ts](../../app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts#L360-L362)

```typescript
// handleQRVerify() rad 360-362
const expectedValue = (metadata.expectedValue || '') as string;
```

**Client-side (PuzzleArtifactRenderer)**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L403-L413)

```typescript
// rad 404-413
const expectedValue = (meta.expectedValue as string) || (meta.correctAnswer as string) || '';
const qrConfig: ScanGateConfig = {
  mode: (meta.mode as ScanGateConfig['mode']) || 'qr',
  allowedValues: (meta.allowedValues as string[]) || [expectedValue].filter(Boolean),
  fallbackCode: meta.fallbackCode as string | undefined,
  allowManualFallback: meta.allowManualFallback !== false,
  promptText: (meta.instruction as string) || (meta.promptText as string) || 'Skanna QR-kod',
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `expectedValue` | `string` | ✅ | `''` | 🔒 Server validerar |
| `mode` | `'qr'\|'barcode'\|'manual'` | ⚙️ | `'qr'` | Client-only |
| `allowedValues` | `string[]` | ⚙️ | `[expectedValue]` | Client-only |
| `fallbackCode` | `string` | ⚙️ | `undefined` | Client-only |
| `allowManualFallback` | `boolean` | ⚙️ | `true` | Client-only |
| `instruction` / `promptText` | `string` | ⚙️ | `'Skanna QR-kod'` | |

---

## 6. hint_container

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L499-L511)

```typescript
// rad 499-511
const hintsData = (meta.hints as Array<{ id?: string; text: string; penaltySeconds?: number }>) || 
  (meta.hints as string[])?.map((text, i) => ({ id: String(i), text })) || [];

const hintConfig: HintConfig = {
  hints: hintsData.map((h, i) => ({
    id: h.id || String(i),
    content: h.text || (h as unknown as string),
    penaltySeconds: h.penaltySeconds || (meta.penaltyPerHint as number) || 0,
  })),
  maxHints: typeof meta.maxHints === 'number' ? meta.maxHints : hintsData.length,
  cooldownSeconds: typeof meta.cooldownSeconds === 'number' ? meta.cooldownSeconds : 0,
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `hints` | `Array<{id?, text, penaltySeconds?}>` or `string[]` | ✅ | `[]` | Stödjer båda format |
| `penaltyPerHint` | `number` | ⚙️ | `0` | Fallback om hint.penaltySeconds saknas |
| `maxHints` | `number` | ⚙️ | `hints.length` | |
| `cooldownSeconds` | `number` | ⚙️ | `0` | |

---

## 7. hotspot

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L553-L569) + [progress/route.ts](../../app/api/play/sessions/[id]/puzzles/progress/route.ts#L147-L151)

```typescript
// PuzzleArtifactRenderer rad 553-569
const imageUrl = (meta.imageUrl as string) || '';
const zones = (meta.zones as Array<{ id: string; x: number; y: number; radius: number; label?: string; required?: boolean }>) || 
  (meta.hotspots as Array<{ id: string; x: number; y: number; radius: number; label?: string; required?: boolean }>) || [];

const hotspotConfig: HotspotConfig = {
  imageArtifactId: (meta.imageArtifactId as string) || '',
  imageUrl,
  hotspots: zones.map((z, i) => ({
    id: z.id || String(i),
    x: z.x,
    y: z.y,
    radius: z.radius || 10,
    label: z.label,
    required: z.required !== false,
  })),
  showProgress: meta.showFeedback !== false || meta.showProgress !== false,
  hapticFeedback: meta.hapticFeedback !== false,
  requireAll: meta.requireAll !== false,
};
```

```typescript
// progress/route.ts rad 147-151
const totalHotspots = Array.isArray(meta?.hotspots) ? meta.hotspots.length : 0;
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `imageUrl` | `string` | ✅ | `''` | Renderar tom om saknas |
| `zones` / `hotspots` | `Array<{id, x, y, radius, label?, required?}>` | ✅ | `[]` | Stödjer båda namn |
| `imageArtifactId` | `string` | ⚙️ | `''` | För referens till bildartifakt |
| `showProgress` / `showFeedback` | `boolean` | ⚙️ | `true` | |
| `hapticFeedback` | `boolean` | ⚙️ | `true` | |
| `requireAll` | `boolean` | ⚙️ | `true` | |

---

## 8. tile_puzzle

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L616-L633)

```typescript
// rad 616-633
const imageUrl = (meta.imageUrl as string) || '';
const gridSizeRaw = (meta.gridSize as string) || `${meta.rows || 3}x${meta.cols || 3}`;
const validSizes: TilePuzzleConfig['gridSize'][] = ['2x2', '3x3', '4x4', '3x2', '4x3'];
const gridSize = validSizes.includes(gridSizeRaw as TilePuzzleConfig['gridSize']) 
  ? (gridSizeRaw as TilePuzzleConfig['gridSize']) 
  : '3x3';

const tileConfig: TilePuzzleConfig = {
  imageArtifactId: (meta.imageArtifactId as string) || '',
  imageUrl,
  gridSize,
  showPreview: meta.showPreview === true || meta.allowPreview === true,
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `imageUrl` | `string` | ✅ | `''` | Renderar tom om saknas |
| `gridSize` | `'2x2'\|'3x3'\|'4x4'\|'3x2'\|'4x3'` | ⚙️ | `'3x3'` | |
| `rows` | `number` | ⚙️ | `3` | Fallback om gridSize saknas |
| `cols` | `number` | ⚙️ | `3` | Fallback om gridSize saknas |
| `imageArtifactId` | `string` | ⚙️ | `''` | |
| `showPreview` / `allowPreview` | `boolean` | ⚙️ | `false` | |

---

## 9. cipher

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L681-L692)

```typescript
// rad 681-692
const cipherConfig: CipherConfig = {
  cipherType: (meta.cipherMethod as CipherConfig['cipherType']) || 
              (meta.cipherType as CipherConfig['cipherType']) || 'caesar',
  encodedMessage: (meta.encodedMessage as string) || (meta.cipherText as string) || '',
  expectedPlaintext: (meta.plaintext as string) || (meta.expectedPlaintext as string) || '',
  caesarShift: typeof meta.caesarShift === 'number' ? meta.caesarShift : 
               typeof meta.cipherKey === 'number' ? meta.cipherKey : 3,
  substitutionMap: meta.substitutionMap as Record<string, string> | undefined,
  showDecoderUI: meta.showDecoderHelper !== false && meta.showDecoderUI !== false,
  normalizeMode: (meta.normalizeMode as CipherConfig['normalizeMode']) || 'fuzzy',
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `encodedMessage` / `cipherText` | `string` | ✅ | `''` | |
| `expectedPlaintext` / `plaintext` | `string` | ✅ | `''` | Lösningen |
| `cipherType` / `cipherMethod` | `'caesar'\|'atbash'\|'substitution'` | ⚙️ | `'caesar'` | |
| `caesarShift` / `cipherKey` | `number` | ⚙️ | `3` | |
| `substitutionMap` | `Record<string, string>` | ⚙️ | `undefined` | För substitution cipher |
| `showDecoderUI` / `showDecoderHelper` | `boolean` | ⚙️ | `true` | |
| `normalizeMode` | `'exact'\|'fuzzy'\|'loose'` | ⚙️ | `'fuzzy'` | |

---

## 10. logic_grid

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L720-L733)

```typescript
// rad 720-733
const categories = (meta.categories as LogicGridConfig['categories']) || 
  ((meta.rows as string[]) && (meta.columns as string[]) ? [
    { id: 'rows', name: 'Rader', items: (meta.rows as string[]) },
    { id: 'cols', name: 'Kolumner', items: (meta.columns as string[]) },
  ] : []);

const logicConfig: LogicGridConfig = {
  title: (meta.title as string) || artifact.title || 'Logikpussel',
  categories,
  clues: (meta.clues as LogicGridConfig['clues']) || [],
  solution: (meta.solution as LogicGridConfig['solution']) || [],
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `categories` | `Array<{id, name, items[]}>` | ✅ | `[]` | Nya formatet |
| `rows` | `string[]` | ⚙️ | – | Gamla formatet, konverteras |
| `columns` | `string[]` | ⚙️ | – | Gamla formatet, konverteras |
| `clues` | `Array<{id, text, ...}>` | ⚙️ | `[]` | |
| `solution` | `Array<{...}>` | ⚙️ | `[]` | |
| `title` | `string` | ⚙️ | `artifact.title` | |

---

## 11. prop_confirmation

**Source**: [props/route.ts](../../app/api/play/sessions/[id]/puzzles/props/route.ts#L130-L137) + [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L773-L781)

```typescript
// props/route.ts rad 130-137
propDescription: (meta?.propDescription as string) || 
                 (meta?.propName as string) || 
                 'Föremål',
propImageUrl: meta?.propImageUrl as string | undefined,
```

```typescript
// PuzzleArtifactRenderer rad 773-781
const propConfig: PropConfirmationConfig = {
  propId: (meta.propId as string) || artifact.id,
  propDescription: (meta.propName as string) || (meta.instruction as string) || 'Föremål',
  propImageUrl: meta.propImageUrl as string | undefined,
  instructions: (meta.instructions as string) || (meta.instruction as string) || 'Visa upp föremålet för spelledaren.',
  requirePhoto: meta.requirePhoto === true,
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `propDescription` / `propName` | `string` | ⚙️ | `'Föremål'` | |
| `propImageUrl` | `string` | ⚙️ | `undefined` | |
| `propId` | `string` | ⚙️ | `artifact.id` | |
| `instructions` / `instruction` | `string` | ⚙️ | `'Visa upp föremålet...'` | |
| `requirePhoto` | `boolean` | ⚙️ | `false` | |

---

## 12. location_check

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L817-L834)

```typescript
// rad 817-834
const latitude = typeof meta.latitude === 'number' ? meta.latitude : 0;
const longitude = typeof meta.longitude === 'number' ? meta.longitude : 0;
const radius = typeof meta.radius === 'number' ? meta.radius : 50;
const locationName = (meta.locationName as string) || '';

const locationConfig: LocationCheckConfig = {
  locationId: (meta.locationId as string) || artifact.id,
  locationName,
  checkType: (meta.checkType as LocationCheckConfig['checkType']) || (meta.method as LocationCheckConfig['checkType']) || 'gps',
  targetCoordinates: { latitude, longitude },
  radiusMeters: radius,
  qrCodeValue: (meta.qrCode as string) || (meta.qrCodeValue as string),
  showDistance: meta.showDistance !== false,
  showCompass: meta.showCompass !== false,
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `latitude` | `number` | ✅ | `0` | ⚠️ Default 0 är ogiltigt |
| `longitude` | `number` | ✅ | `0` | ⚠️ Default 0 är ogiltigt |
| `radius` | `number` | ⚙️ | `50` (meter) | |
| `locationName` | `string` | ⚙️ | `''` | |
| `locationId` | `string` | ⚙️ | `artifact.id` | |
| `checkType` / `method` | `'gps'\|'qr'\|'manual'` | ⚙️ | `'gps'` | |
| `qrCode` / `qrCodeValue` | `string` | ⚙️ | `undefined` | För QR-mode |
| `showDistance` | `boolean` | ⚙️ | `true` | |
| `showCompass` | `boolean` | ⚙️ | `true` | |

---

## 13. sound_level

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L915-L931)

```typescript
// rad 915-931
const soundInstructions = (meta.instruction as string) || (meta.instructions as string) || 'Gör ljud!';
const soundConfig: SoundLevelConfig = {
  triggerMode: (meta.triggerMode as SoundLevelConfig['triggerMode']) || 'threshold',
  thresholdLevel: typeof meta.threshold === 'number' ? meta.threshold : 
                  typeof meta.thresholdLevel === 'number' ? meta.thresholdLevel : 70,
  sustainDuration: typeof meta.holdDuration === 'number' ? meta.holdDuration : 
                   typeof meta.sustainDuration === 'number' ? meta.sustainDuration : 2,
  activityLabel: (meta.activityLabel as string) || artifact.title || 'Ljudnivå',
  instructions: soundInstructions,
  showMeter: meta.showMeter !== false,
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `instruction` / `instructions` | `string` | ⚙️ | `'Gör ljud!'` | |
| `triggerMode` | `'threshold'\|'peak'\|'sustained'` | ⚙️ | `'threshold'` | |
| `threshold` / `thresholdLevel` | `number` | ⚙️ | `70` | dB |
| `holdDuration` / `sustainDuration` | `number` | ⚙️ | `2` | sekunder |
| `activityLabel` | `string` | ⚙️ | `artifact.title` | |
| `showMeter` | `boolean` | ⚙️ | `true` | |

---

## 14. audio

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L324-L332)

```typescript
// rad 324-332
const audioUrl = (meta.audioUrl as string) || (meta.src as string) || '';
const audioConfig: Partial<AudioConfig> = {
  autoPlay: meta.autoplay === true || meta.autoPlay === true,
  loop: meta.loop === true,
  requireAck: meta.requireAck === true,
  showTranscript: meta.showTranscript === true,
  transcriptText: (meta.transcript as string) || (meta.transcriptText as string),
};
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `audioUrl` / `src` | `string` | ✅ | `''` | Renderar "ej konfigurerad" om saknas |
| `autoplay` / `autoPlay` | `boolean` | ⚙️ | `false` | |
| `loop` | `boolean` | ⚙️ | `false` | |
| `requireAck` | `boolean` | ⚙️ | `false` | |
| `showTranscript` | `boolean` | ⚙️ | `false` | |
| `transcript` / `transcriptText` | `string` | ⚙️ | `undefined` | |

---

## 15. conversation_cards_collection

**Source**: [ConversationCardsCollectionArtifact.tsx](../../features/play/components/ConversationCardsCollectionArtifact.tsx#L27-L31)

```typescript
// rad 27-31
function readCollectionId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>).conversation_card_collection_id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `conversation_card_collection_id` | `string` | ✅ | `null` | Referens till extern samling |

---

## 16. signal_generator

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L972-L976)

```typescript
// rad 972-976
const config = (artifact.metadata as { signalConfig?: { label?: string; outputs?: string[] } })?.signalConfig;
const label = config?.label ?? 'Signal';
const outputs = config?.outputs ?? ['visual'];
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `signalConfig.label` | `string` | ⚙️ | `'Signal'` | |
| `signalConfig.outputs` | `string[]` | ⚙️ | `['visual']` | `'audio'\|'vibration'\|'visual'\|'notification'` |

---

## 17. time_bank_step

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L1002-L1015)

```typescript
// rad 1002-1015
const config = (artifact.metadata as { 
  timerConfig?: { 
    initialSeconds?: number; 
    displayStyle?: string;
    warningThreshold?: number;
    criticalThreshold?: number;
  } 
})?.timerConfig;

const initialSeconds = config?.initialSeconds ?? 300;
const displayStyle = config?.displayStyle ?? 'countdown';
const warningThreshold = config?.warningThreshold ?? 60;
const criticalThreshold = config?.criticalThreshold ?? 30;
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `timerConfig.initialSeconds` | `number` | ⚙️ | `300` (5 min) | |
| `timerConfig.displayStyle` | `string` | ⚙️ | `'countdown'` | |
| `timerConfig.warningThreshold` | `number` | ⚙️ | `60` (sekunder) | |
| `timerConfig.criticalThreshold` | `number` | ⚙️ | `30` (sekunder) | |

---

## 18. empty_artifact

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L1063-L1077)

```typescript
// rad 1063-1077
const config = (artifact.metadata as { 
  emptyConfig?: { 
    purpose?: string;
    placeholderText?: string;
    backgroundColor?: string;
    minHeight?: number;
    showBorder?: boolean;
    icon?: string;
  } 
})?.emptyConfig;

const purpose = config?.purpose ?? 'placeholder';
const placeholderText = config?.placeholderText ?? '';
const minHeight = config?.minHeight ?? 100;
const showBorder = config?.showBorder ?? true;
const icon = config?.icon ?? '📦';
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `emptyConfig.purpose` | `'placeholder'\|'host_note'\|'break_marker'` | ⚙️ | `'placeholder'` | |
| `emptyConfig.placeholderText` | `string` | ⚙️ | `''` | |
| `emptyConfig.backgroundColor` | `string` | ⚙️ | `undefined` | CSS color |
| `emptyConfig.minHeight` | `number` | ⚙️ | `100` | pixels |
| `emptyConfig.showBorder` | `boolean` | ⚙️ | `true` | |
| `emptyConfig.icon` | `string` | ⚙️ | `'📦'` | Emoji |

---

## 19. replay_marker

**Source**: [PuzzleArtifactRenderer.tsx](../../features/play/components/PuzzleArtifactRenderer.tsx#L964-L966)

```typescript
// rad 964-966
if (artifactType === 'replay_marker') {
  return null; // Replay markers are typically for post-session analysis
}
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| – | – | – | – | Ingen metadata läses i Play. Renderar `null`. |

---

## Artifact Types EJ Hanterade i Play

Följande typer finns i `ArtifactType` union ([types/games.ts](../../types/games.ts#L21-L48)) men läses ej av PuzzleArtifactRenderer:

| artifact_type | Notes |
|---------------|-------|
| `card` | Statisk visning, ingen interaktiv metadata |
| `document` | Statisk visning |
| `image` | Statisk visning |

Dessa hanteras förmodligen av annan rendering-logik (ej pussel).

---

## ⚠️ Identifierade Risker

### 1. Default-mismatch: `counter.target`
- **Server**: `null` (unlimited)
- **Client**: `1`
- **Risk**: Import utan explicit target beter sig olika i validering vs UI.

### 2. Ogiltig fallback: `location_check.latitude/longitude`
- **Default**: `0`
- **Risk**: Lat/Lon 0,0 är Atlanten – tyst fel om koordinater saknas.

### 3. Dubbla key-namn stöds men odokumenterade
Flera artifact types accepterar alias (`prompt` / `promptText`, `zones` / `hotspots`, etc.). Builder bör producera kanoniskt namn, men legacy-data kan ha antingen.

---

## Import Validation Recommendations

1. **Pre-flight check**: Validera `correctCode` (keypad), `correctAnswers` (riddle), `expectedValue` (qr_gate) finns före import.
2. **Schema per type**: Se `BUILDER_METADATA_CONTRACT_SCHEMAS.md` (ej skapad ännu).
3. **Default audit**: Granska att defaults i Builder matchar Play-defaults.

---

*Genererad 2025-01-27. Endast kod-baserad evidens.*
