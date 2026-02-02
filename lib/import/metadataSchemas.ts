/**
 * Import Metadata Schemas
 *
 * Zod schemas för normalisering och validering av artifact metadata vid import.
 * Baserat på evidens från BUILDER_METADATA_CONTRACT.md och BUILDER_METADATA_CONTRACT_CANONICAL.md.
 *
 * Klassificering:
 * - HARD_REQUIRED (evidens): Play kraschar/misslyckas → import avbryter med error
 * - HARD_REQUIRED (policy): Server/client mismatch → import avbryter med error
 * - HARD_REQUIRED (conditional): Required om villkor uppfyllt → import avbryter om villkor sant
 * - QUALITY_GATE: Meningslös artifact utan krasch → import avbryter (content quality)
 * - SOFT_REQUIRED: Tom/märklig render → import varnar men fortsätter
 * - OPTIONAL: Säker default → import accepterar tyst
 *
 * @module lib/import/metadataSchemas
 * @see docs/builder/BUILDER_METADATA_CONTRACT.md
 * @see docs/builder/BUILDER_METADATA_CONTRACT_CANONICAL.md
 */

import { z } from 'zod';

// =============================================================================
// Validation Result Types
// =============================================================================

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface NormalizeResult<T> {
  canonical: Partial<T>;
  warnings: string[];
  appliedAliases: string[]; // e.g. "cipherText → encodedMessage"
}

// =============================================================================
// Alias Registry (rule-based, robust över tid)
// =============================================================================

type AliasRule = { from: string; to: string };

const ALIAS_REGISTRY: Record<string, AliasRule[]> = {
  riddle: [
    { from: 'prompt', to: 'promptText' },
    { from: 'correctAnswer', to: 'correctAnswers' },
    { from: 'acceptedAnswers', to: 'correctAnswers' },
  ],
  qr_gate: [
    { from: 'correctAnswer', to: 'expectedValue' },
    { from: 'instruction', to: 'promptText' },
  ],
  hotspot: [
    { from: 'zones', to: 'hotspots' },
    { from: 'showFeedback', to: 'showProgress' },
  ],
  tile_puzzle: [
    { from: 'allowPreview', to: 'showPreview' },
  ],
  cipher: [
    { from: 'cipherText', to: 'encodedMessage' },
    { from: 'plaintext', to: 'expectedPlaintext' },
    { from: 'cipherMethod', to: 'cipherType' },
    { from: 'cipherKey', to: 'caesarShift' },
    { from: 'showDecoderHelper', to: 'showDecoderUI' },
  ],
  prop_confirmation: [
    { from: 'propDescription', to: 'propName' },
    { from: 'instruction', to: 'instructions' },
  ],
  location_check: [
    { from: 'method', to: 'checkType' },
    { from: 'qrCode', to: 'qrCodeValue' },
  ],
  sound_level: [
    { from: 'instruction', to: 'instructions' },
    { from: 'threshold', to: 'thresholdLevel' },
    { from: 'holdDuration', to: 'sustainDuration' },
  ],
  audio: [
    { from: 'src', to: 'audioUrl' },
    { from: 'autoplay', to: 'autoPlay' },
    { from: 'transcript', to: 'transcriptText' },
  ],
  hint_container: [
    // string[] → object[] hanteras separat i normalize
  ],
};

/**
 * Detektera vilka alias som användes baserat på raw input och canonical output
 */
function detectAppliedAliases(
  artifactType: string,
  raw: unknown,
  canonical: Record<string, unknown>
): string[] {
  const rules = ALIAS_REGISTRY[artifactType] ?? [];
  const appliedAliases: string[] = [];
  
  if (typeof raw !== 'object' || raw === null) return appliedAliases;
  
  const rawObj = raw as Record<string, unknown>;
  
  for (const rule of rules) {
    // Alias användes om: raw[from] finns OCH canonical[to] finns OCH raw[to] saknas
    if (
      rawObj[rule.from] !== undefined &&
      canonical[rule.to] !== undefined &&
      rawObj[rule.to] === undefined
    ) {
      appliedAliases.push(`${rule.from} → ${rule.to}`);
    }
  }
  
  return appliedAliases;
}

// =============================================================================
// Normalize Mode Enum (shared across types)
// =============================================================================

const NormalizeModeSchema = z.enum(['exact', 'fuzzy', 'loose']).default('fuzzy');

// =============================================================================
// 1. KEYPAD
// =============================================================================

const KeypadRawSchema = z.object({
  correctCode: z.string().optional(),
  codeLength: z.number().optional(),
  maxAttempts: z.number().nullable().optional(),
  lockOnFail: z.boolean().optional(),
  successMessage: z.string().optional(),
  failMessage: z.string().optional(),
  lockedMessage: z.string().optional(),
}).passthrough();

const _KeypadCanonicalSchema = z.object({
  correctCode: z.string().min(1, 'keypad.correctCode är required och måste vara non-empty'),
  codeLength: z.number().optional(),
  maxAttempts: z.number().nullable().default(null),
  lockOnFail: z.boolean().default(false),
  successMessage: z.string().optional(),
  failMessage: z.string().optional(),
  lockedMessage: z.string().optional(),
});

export type KeypadCanonical = z.infer<typeof _KeypadCanonicalSchema>;

export function normalizeKeypad(raw: unknown): { canonical: Partial<KeypadCanonical>; warnings: string[] } {
  const parsed = KeypadRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['keypad: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  return {
    canonical: {
      correctCode: data.correctCode,
      codeLength: data.codeLength,
      maxAttempts: data.maxAttempts ?? null,
      lockOnFail: data.lockOnFail ?? false,
      successMessage: data.successMessage,
      failMessage: data.failMessage,
      lockedMessage: data.lockedMessage,
    },
    warnings: [],
  };
}

export function validateKeypad(canonical: Partial<KeypadCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canonical.correctCode || canonical.correctCode.trim() === '') {
    errors.push('keypad.correctCode är HARD_REQUIRED och måste vara non-empty');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 2. RIDDLE
// =============================================================================

const RiddleRawSchema = z.object({
  correctAnswers: z.array(z.string()).optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  promptText: z.string().optional(),
  prompt: z.string().optional(),
  normalizeMode: NormalizeModeSchema.optional(),
  maxAttempts: z.number().nullable().optional(),
  hintText: z.string().optional(),
  showHintAfterAttempts: z.number().optional(),
}).passthrough();

const _RiddleCanonicalSchema = z.object({
  correctAnswers: z.array(z.string()).min(1, 'riddle.correctAnswers måste ha minst 1 element'),
  promptText: z.string().default(''),
  normalizeMode: NormalizeModeSchema,
  maxAttempts: z.number().nullable().default(null),
  hintText: z.string().optional(),
  showHintAfterAttempts: z.number().optional(),
});

export type RiddleCanonical = z.infer<typeof _RiddleCanonicalSchema>;

export function normalizeRiddle(raw: unknown): { canonical: Partial<RiddleCanonical>; warnings: string[] } {
  const parsed = RiddleRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['riddle: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Alias normalisering
  let correctAnswers = data.correctAnswers;
  if (!correctAnswers && data.acceptedAnswers) {
    correctAnswers = data.acceptedAnswers;
    warnings.push('riddle: normaliserade acceptedAnswers → correctAnswers');
  }
  if (!correctAnswers && data.correctAnswer) {
    correctAnswers = [data.correctAnswer];
    warnings.push('riddle: normaliserade correctAnswer → correctAnswers');
  }

  let promptText = data.promptText;
  if (!promptText && data.prompt) {
    promptText = data.prompt;
    warnings.push('riddle: normaliserade prompt → promptText');
  }

  return {
    canonical: {
      correctAnswers: correctAnswers ?? [],
      promptText: promptText ?? '',
      normalizeMode: data.normalizeMode ?? 'fuzzy',
      maxAttempts: data.maxAttempts ?? null,
      hintText: data.hintText,
      showHintAfterAttempts: data.showHintAfterAttempts,
    },
    warnings,
  };
}

export function validateRiddle(canonical: Partial<RiddleCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canonical.correctAnswers || canonical.correctAnswers.length === 0) {
    errors.push('riddle.correctAnswers är HARD_REQUIRED och måste ha minst 1 element');
  } else if (canonical.correctAnswers.some(a => !a.trim())) {
    warnings.push('riddle.correctAnswers innehåller tomma strängar');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 3. COUNTER
// =============================================================================

const CounterRawSchema = z.object({
  target: z.number().optional(),
  step: z.number().optional(),
  initialValue: z.number().optional(),
  label: z.string().optional(),
}).passthrough();

const _CounterCanonicalSchema = z.object({
  target: z.number(),
  step: z.number().default(1),
  initialValue: z.number().default(0),
  label: z.string().default('Räknare'),
});

export type CounterCanonical = z.infer<typeof _CounterCanonicalSchema>;

export function normalizeCounter(raw: unknown): { canonical: Partial<CounterCanonical>; warnings: string[] } {
  const parsed = CounterRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['counter: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // POLICY-BESLUT: target är HARD_REQUIRED pga server/client mismatch
  // Normalisering behåller undefined så validering kan returnera error
  // Om du vill ha "soft" beteende, sätt target = data.target ?? 1 här istället

  return {
    canonical: {
      target: data.target, // behåll undefined om saknas → validering avbryter
      step: data.step ?? 1,
      initialValue: data.initialValue ?? 0,
      label: data.label ?? 'Räknare',
    },
    warnings,
  };
}

export function validateCounter(canonical: Partial<CounterCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // POLICY-BESLUT: counter.target är HARD_REQUIRED pga server/client mismatch
  if (canonical.target === undefined) {
    errors.push('counter.target är HARD_REQUIRED (policy: server default null vs client default 1)');
  }
  if (canonical.target !== undefined && canonical.target <= 0) {
    warnings.push('counter.target <= 0 kan ge oväntad completion-logik');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 4. MULTI_ANSWER
// =============================================================================

const MultiAnswerCheckSchema = z.object({
  id: z.string(),
  type: z.enum(['checkbox', 'radio']).default('checkbox'),
  label: z.string(),
  required: z.boolean().default(true),
});

const MultiAnswerRawSchema = z.object({
  items: z.array(z.string()).optional(),
  checks: z.array(MultiAnswerCheckSchema).optional(),
  requiredCount: z.number().optional(),
  requireAll: z.boolean().optional(),
  showProgress: z.boolean().optional(),
}).passthrough();

const _MultiAnswerCanonicalSchema = z.object({
  items: z.array(z.string()).min(1, 'multi_answer.items måste ha minst 1 element'),
  checks: z.array(MultiAnswerCheckSchema).optional(),
  requiredCount: z.number().optional(),
  requireAll: z.boolean().default(true),
  showProgress: z.boolean().default(true),
});

export type MultiAnswerCanonical = z.infer<typeof _MultiAnswerCanonicalSchema>;

export function normalizeMultiAnswer(raw: unknown): { canonical: Partial<MultiAnswerCanonical>; warnings: string[] } {
  const parsed = MultiAnswerRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['multi_answer: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Om checks finns men inte items, extrahera items från checks
  let items = data.items;
  if (!items && data.checks) {
    items = data.checks.map(c => c.label);
    warnings.push('multi_answer: normaliserade checks.label → items');
  }

  return {
    canonical: {
      items: items ?? [],
      checks: data.checks,
      requiredCount: data.requiredCount,
      requireAll: data.requireAll ?? true,
      showProgress: data.showProgress ?? true,
    },
    warnings,
  };
}

export function validateMultiAnswer(canonical: Partial<MultiAnswerCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canonical.items || canonical.items.length === 0) {
    errors.push('multi_answer.items är HARD_REQUIRED och måste ha minst 1 element');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 5. QR_GATE
// =============================================================================

const QrGateRawSchema = z.object({
  expectedValue: z.string().optional(),
  correctAnswer: z.string().optional(),
  mode: z.enum(['qr', 'barcode', 'manual']).optional(),
  allowedValues: z.array(z.string()).optional(),
  promptText: z.string().optional(),
  instruction: z.string().optional(),
  fallbackCode: z.string().optional(),
  allowManualFallback: z.boolean().optional(),
}).passthrough();

const _QrGateCanonicalSchema = z.object({
  expectedValue: z.string().min(1, 'qr_gate.expectedValue är required och måste vara non-empty'),
  mode: z.enum(['qr', 'barcode', 'manual']).default('qr'),
  allowedValues: z.array(z.string()).optional(),
  promptText: z.string().default('Skanna QR-kod'),
  fallbackCode: z.string().optional(),
  allowManualFallback: z.boolean().default(true),
});

export type QrGateCanonical = z.infer<typeof _QrGateCanonicalSchema>;

export function normalizeQrGate(raw: unknown): { canonical: Partial<QrGateCanonical>; warnings: string[] } {
  const parsed = QrGateRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['qr_gate: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Alias normalisering
  let expectedValue = data.expectedValue;
  if (!expectedValue && data.correctAnswer) {
    expectedValue = data.correctAnswer;
    warnings.push('qr_gate: normaliserade correctAnswer → expectedValue');
  }

  let promptText = data.promptText;
  if (!promptText && data.instruction) {
    promptText = data.instruction;
    warnings.push('qr_gate: normaliserade instruction → promptText');
  }

  return {
    canonical: {
      expectedValue: expectedValue ?? '',
      mode: data.mode ?? 'qr',
      allowedValues: data.allowedValues,
      promptText: promptText ?? 'Skanna QR-kod',
      fallbackCode: data.fallbackCode,
      allowManualFallback: data.allowManualFallback ?? true,
    },
    warnings,
  };
}

export function validateQrGate(canonical: Partial<QrGateCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canonical.expectedValue || canonical.expectedValue.trim() === '') {
    errors.push('qr_gate.expectedValue är HARD_REQUIRED och måste vara non-empty');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 6. HINT_CONTAINER
// =============================================================================

const HintItemSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  penaltySeconds: z.number().optional(),
});

const HintContainerRawSchema = z.object({
  hints: z.union([z.array(HintItemSchema), z.array(z.string())]).optional(),
  penaltyPerHint: z.number().optional(),
  maxHints: z.number().optional(),
  cooldownSeconds: z.number().optional(),
}).passthrough();

const _HintContainerCanonicalSchema = z.object({
  hints: z.array(HintItemSchema).min(1, 'hint_container.hints måste ha minst 1 element'),
  penaltyPerHint: z.number().default(0),
  maxHints: z.number().optional(),
  cooldownSeconds: z.number().default(0),
});

export type HintContainerCanonical = z.infer<typeof _HintContainerCanonicalSchema>;

export function normalizeHintContainer(raw: unknown): { canonical: Partial<HintContainerCanonical>; warnings: string[] } {
  const parsed = HintContainerRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['hint_container: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Stödjer string[] för legacy
  let hints: Array<{ id?: string; text: string; penaltySeconds?: number }> = [];
  if (data.hints) {
    if (typeof data.hints[0] === 'string') {
      hints = (data.hints as string[]).map((text, i) => ({ id: String(i), text }));
      warnings.push('hint_container: normaliserade string[] → object[]');
    } else {
      hints = data.hints as Array<{ id?: string; text: string; penaltySeconds?: number }>;
    }
  }

  return {
    canonical: {
      hints,
      penaltyPerHint: data.penaltyPerHint ?? 0,
      maxHints: data.maxHints,
      cooldownSeconds: data.cooldownSeconds ?? 0,
    },
    warnings,
  };
}

export function validateHintContainer(canonical: Partial<HintContainerCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // QUALITY_GATE: tom hints = meningslös artifact (men ingen krasch)
  if (!canonical.hints || canonical.hints.length === 0) {
    errors.push('hint_container.hints är QUALITY_GATE: tom array = meningslös artifact');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 7. HOTSPOT
// =============================================================================

const HotspotZoneSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  radius: z.number().default(10),
  label: z.string().optional(),
  required: z.boolean().default(true),
});

const HotspotRawSchema = z.object({
  imageUrl: z.string().optional(),
  hotspots: z.array(HotspotZoneSchema).optional(),
  zones: z.array(HotspotZoneSchema).optional(),
  imageArtifactId: z.string().optional(),
  showProgress: z.boolean().optional(),
  showFeedback: z.boolean().optional(),
  hapticFeedback: z.boolean().optional(),
  requireAll: z.boolean().optional(),
}).passthrough();

const _HotspotCanonicalSchema = z.object({
  imageUrl: z.string(),
  hotspots: z.array(HotspotZoneSchema).min(1, 'hotspot.hotspots måste ha minst 1 element'),
  imageArtifactId: z.string().default(''),
  showProgress: z.boolean().default(true),
  hapticFeedback: z.boolean().default(true),
  requireAll: z.boolean().default(true),
});

export type HotspotCanonical = z.infer<typeof _HotspotCanonicalSchema>;

export function normalizeHotspot(raw: unknown): { canonical: Partial<HotspotCanonical>; warnings: string[] } {
  const parsed = HotspotRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['hotspot: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Alias normalisering
  let hotspots = data.hotspots;
  if (!hotspots && data.zones) {
    hotspots = data.zones;
    warnings.push('hotspot: normaliserade zones → hotspots');
  }

  let showProgress = data.showProgress;
  if (showProgress === undefined && data.showFeedback !== undefined) {
    showProgress = data.showFeedback;
    warnings.push('hotspot: normaliserade showFeedback → showProgress');
  }

  return {
    canonical: {
      imageUrl: data.imageUrl ?? '',
      hotspots: hotspots ?? [],
      imageArtifactId: data.imageArtifactId ?? '',
      showProgress: showProgress ?? true,
      hapticFeedback: data.hapticFeedback ?? true,
      requireAll: data.requireAll ?? true,
    },
    warnings,
  };
}

export function validateHotspot(canonical: Partial<HotspotCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canonical.imageUrl || canonical.imageUrl.trim() === '') {
    warnings.push('hotspot.imageUrl saknas – renderar tom vy');
  }

  if (!canonical.hotspots || canonical.hotspots.length === 0) {
    errors.push('hotspot.hotspots är HARD_REQUIRED och måste ha minst 1 element');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 8. TILE_PUZZLE
// =============================================================================

const TilePuzzleRawSchema = z.object({
  imageUrl: z.string().optional(),
  gridSize: z.enum(['2x2', '3x3', '4x4', '3x2', '4x3']).optional(),
  rows: z.number().optional(),
  cols: z.number().optional(),
  imageArtifactId: z.string().optional(),
  showPreview: z.boolean().optional(),
  allowPreview: z.boolean().optional(),
}).passthrough();

const _TilePuzzleCanonicalSchema = z.object({
  imageUrl: z.string(),
  gridSize: z.enum(['2x2', '3x3', '4x4', '3x2', '4x3']).default('3x3'),
  imageArtifactId: z.string().default(''),
  showPreview: z.boolean().default(false),
});

export type TilePuzzleCanonical = z.infer<typeof _TilePuzzleCanonicalSchema>;

export function normalizeTilePuzzle(raw: unknown): { canonical: Partial<TilePuzzleCanonical>; warnings: string[] } {
  const parsed = TilePuzzleRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['tile_puzzle: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Alias normalisering
  let showPreview = data.showPreview;
  if (showPreview === undefined && data.allowPreview !== undefined) {
    showPreview = data.allowPreview;
    warnings.push('tile_puzzle: normaliserade allowPreview → showPreview');
  }

  // Prefer gridSize over rows/cols
  let gridSize = data.gridSize;
  if (!gridSize && data.rows && data.cols) {
    const computed = `${data.rows}x${data.cols}`;
    const validSizes = ['2x2', '3x3', '4x4', '3x2', '4x3'] as const;
    if (validSizes.includes(computed as typeof validSizes[number])) {
      gridSize = computed as typeof validSizes[number];
      warnings.push('tile_puzzle: normaliserade rows/cols → gridSize');
    }
  }

  return {
    canonical: {
      imageUrl: data.imageUrl ?? '',
      gridSize: gridSize ?? '3x3',
      imageArtifactId: data.imageArtifactId ?? '',
      showPreview: showPreview ?? false,
    },
    warnings,
  };
}

export function validateTilePuzzle(canonical: Partial<TilePuzzleCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canonical.imageUrl || canonical.imageUrl.trim() === '') {
    warnings.push('tile_puzzle.imageUrl saknas – renderar tom vy');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 9. CIPHER
// =============================================================================

const CipherRawSchema = z.object({
  encodedMessage: z.string().optional(),
  cipherText: z.string().optional(),
  expectedPlaintext: z.string().optional(),
  plaintext: z.string().optional(),
  cipherType: z.enum(['caesar', 'atbash', 'substitution']).optional(),
  cipherMethod: z.enum(['caesar', 'atbash', 'substitution']).optional(),
  caesarShift: z.number().optional(),
  cipherKey: z.number().optional(),
  substitutionMap: z.record(z.string()).optional(),
  showDecoderUI: z.boolean().optional(),
  showDecoderHelper: z.boolean().optional(),
  normalizeMode: NormalizeModeSchema.optional(),
}).passthrough();

const _CipherCanonicalSchema = z.object({
  encodedMessage: z.string().min(1, 'cipher.encodedMessage är required och måste vara non-empty'),
  expectedPlaintext: z.string().min(1, 'cipher.expectedPlaintext är required och måste vara non-empty'),
  cipherType: z.enum(['caesar', 'atbash', 'substitution']).default('caesar'),
  caesarShift: z.number().default(3),
  substitutionMap: z.record(z.string()).optional(),
  showDecoderUI: z.boolean().default(true),
  normalizeMode: NormalizeModeSchema,
});

export type CipherCanonical = z.infer<typeof _CipherCanonicalSchema>;

export function normalizeCipher(raw: unknown): { canonical: Partial<CipherCanonical>; warnings: string[] } {
  const parsed = CipherRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['cipher: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Alias normalisering
  let encodedMessage = data.encodedMessage;
  if (!encodedMessage && data.cipherText) {
    encodedMessage = data.cipherText;
    warnings.push('cipher: normaliserade cipherText → encodedMessage');
  }

  let expectedPlaintext = data.expectedPlaintext;
  if (!expectedPlaintext && data.plaintext) {
    expectedPlaintext = data.plaintext;
    warnings.push('cipher: normaliserade plaintext → expectedPlaintext');
  }

  let cipherType = data.cipherType;
  if (!cipherType && data.cipherMethod) {
    cipherType = data.cipherMethod;
    warnings.push('cipher: normaliserade cipherMethod → cipherType');
  }

  let caesarShift = data.caesarShift;
  if (caesarShift === undefined && data.cipherKey !== undefined) {
    caesarShift = data.cipherKey;
    warnings.push('cipher: normaliserade cipherKey → caesarShift');
  }

  let showDecoderUI = data.showDecoderUI;
  if (showDecoderUI === undefined && data.showDecoderHelper !== undefined) {
    showDecoderUI = data.showDecoderHelper;
    warnings.push('cipher: normaliserade showDecoderHelper → showDecoderUI');
  }

  return {
    canonical: {
      encodedMessage: encodedMessage ?? '',
      expectedPlaintext: expectedPlaintext ?? '',
      cipherType: cipherType ?? 'caesar',
      caesarShift: caesarShift ?? 3,
      substitutionMap: data.substitutionMap,
      showDecoderUI: showDecoderUI ?? true,
      normalizeMode: data.normalizeMode ?? 'fuzzy',
    },
    warnings,
  };
}

export function validateCipher(canonical: Partial<CipherCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // QUALITY_GATE: tomma strängar = meningslös artifact (men ingen krasch)
  if (!canonical.encodedMessage || canonical.encodedMessage.trim() === '') {
    errors.push('cipher.encodedMessage är QUALITY_GATE: tom sträng = meningslös artifact');
  }

  if (!canonical.expectedPlaintext || canonical.expectedPlaintext.trim() === '') {
    errors.push('cipher.expectedPlaintext är QUALITY_GATE: tom sträng = meningslös artifact');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 10. LOGIC_GRID
// =============================================================================

const LogicGridCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(z.string()),
});

const LogicGridRawSchema = z.object({
  categories: z.array(LogicGridCategorySchema).optional(),
  rows: z.array(z.string()).optional(),
  columns: z.array(z.string()).optional(),
  clues: z.array(z.unknown()).optional(),
  solution: z.array(z.unknown()).optional(),
  title: z.string().optional(),
}).passthrough();

const _LogicGridCanonicalSchema = z.object({
  categories: z.array(LogicGridCategorySchema).min(1, 'logic_grid.categories måste ha minst 1 element'),
  clues: z.array(z.unknown()).default([]),
  solution: z.array(z.unknown()).default([]),
  title: z.string().optional(),
});

export type LogicGridCanonical = z.infer<typeof _LogicGridCanonicalSchema>;

export function normalizeLogicGrid(raw: unknown): { canonical: Partial<LogicGridCanonical>; warnings: string[] } {
  const parsed = LogicGridRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['logic_grid: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Legacy rows/columns → categories
  let categories = data.categories;
  if (!categories && (data.rows || data.columns)) {
    categories = [];
    if (data.rows) categories.push({ id: 'rows', name: 'Rader', items: data.rows });
    if (data.columns) categories.push({ id: 'cols', name: 'Kolumner', items: data.columns });
    warnings.push('logic_grid: normaliserade rows/columns → categories');
  }

  return {
    canonical: {
      categories: categories ?? [],
      clues: data.clues ?? [],
      solution: data.solution ?? [],
      title: data.title,
    },
    warnings,
  };
}

export function validateLogicGrid(canonical: Partial<LogicGridCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canonical.categories || canonical.categories.length === 0) {
    errors.push('logic_grid.categories är HARD_REQUIRED och måste ha minst 1 element');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 11. PROP_CONFIRMATION
// =============================================================================

const PropConfirmationRawSchema = z.object({
  propName: z.string().optional(),
  propDescription: z.string().optional(),
  instruction: z.string().optional(),
  propImageUrl: z.string().optional(),
  propId: z.string().optional(),
  instructions: z.string().optional(),
  requirePhoto: z.boolean().optional(),
}).passthrough();

const _PropConfirmationCanonicalSchema = z.object({
  propName: z.string().default('Föremål'),
  propImageUrl: z.string().optional(),
  propId: z.string().optional(),
  instructions: z.string().default('Visa upp föremålet för spelledaren.'),
  requirePhoto: z.boolean().default(false),
});

export type PropConfirmationCanonical = z.infer<typeof _PropConfirmationCanonicalSchema>;

export function normalizePropConfirmation(raw: unknown): { canonical: Partial<PropConfirmationCanonical>; warnings: string[] } {
  const parsed = PropConfirmationRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['prop_confirmation: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Alias normalisering
  let propName = data.propName;
  if (!propName && data.propDescription) {
    propName = data.propDescription;
    warnings.push('prop_confirmation: normaliserade propDescription → propName');
  }
  if (!propName && data.instruction) {
    propName = data.instruction;
    warnings.push('prop_confirmation: normaliserade instruction → propName');
  }

  let instructions = data.instructions;
  if (!instructions && data.instruction) {
    instructions = data.instruction;
    warnings.push('prop_confirmation: normaliserade instruction → instructions');
  }

  return {
    canonical: {
      propName: propName ?? 'Föremål',
      propImageUrl: data.propImageUrl,
      propId: data.propId,
      instructions: instructions ?? 'Visa upp föremålet för spelledaren.',
      requirePhoto: data.requirePhoto ?? false,
    },
    warnings,
  };
}

export function validatePropConfirmation(_canonical: Partial<PropConfirmationCanonical>): ValidationResult {
  // Alla keys är OPTIONAL med bra defaults
  return { ok: true, errors: [], warnings: [] };
}

// =============================================================================
// 12. LOCATION_CHECK
// =============================================================================

const LocationCheckRawSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().optional(),
  locationName: z.string().optional(),
  locationId: z.string().optional(),
  checkType: z.enum(['gps', 'qr', 'manual']).optional(),
  method: z.enum(['gps', 'qr', 'manual']).optional(),
  qrCodeValue: z.string().optional(),
  qrCode: z.string().optional(),
  showDistance: z.boolean().optional(),
  showCompass: z.boolean().optional(),
}).passthrough();

const _LocationCheckCanonicalSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().default(50),
  locationName: z.string().default(''),
  locationId: z.string().optional(),
  checkType: z.enum(['gps', 'qr', 'manual']).default('gps'),
  qrCodeValue: z.string().optional(),
  showDistance: z.boolean().default(true),
  showCompass: z.boolean().default(true),
});

export type LocationCheckCanonical = z.infer<typeof _LocationCheckCanonicalSchema>;

export function normalizeLocationCheck(raw: unknown): { canonical: Partial<LocationCheckCanonical>; warnings: string[] } {
  const parsed = LocationCheckRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['location_check: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Alias normalisering
  let checkType = data.checkType;
  if (!checkType && data.method) {
    checkType = data.method;
    warnings.push('location_check: normaliserade method → checkType');
  }

  let qrCodeValue = data.qrCodeValue;
  if (!qrCodeValue && data.qrCode) {
    qrCodeValue = data.qrCode;
    warnings.push('location_check: normaliserade qrCode → qrCodeValue');
  }

  return {
    canonical: {
      latitude: data.latitude, // behåll undefined för conditional validation
      longitude: data.longitude, // behåll undefined för conditional validation
      radius: data.radius ?? 50,
      locationName: data.locationName ?? '',
      locationId: data.locationId,
      checkType, // POLICY: behåll undefined - validering kräver explicit värde
      qrCodeValue,
      showDistance: data.showDistance ?? true,
      showCompass: data.showCompass ?? true,
    },
    warnings,
  };
}

export function validateLocationCheck(canonical: Partial<LocationCheckCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // POLICY: checkType är HARD_REQUIRED vid import
  if (canonical.checkType === undefined) {
    errors.push('location_check.checkType är HARD_REQUIRED (policy: måste ange gps/qr/manual)');
    return { ok: false, errors, warnings }; // Early return - kan inte validera lat/lon utan checkType
  }

  const checkType = canonical.checkType;

  // CONDITIONAL HARD_REQUIRED: lat/lon endast required för GPS-mode
  if (checkType === 'gps') {
    if (canonical.latitude === undefined) {
      errors.push('location_check.latitude är HARD_REQUIRED (conditional: checkType=gps)');
    }
    if (canonical.longitude === undefined) {
      errors.push('location_check.longitude är HARD_REQUIRED (conditional: checkType=gps)');
    }
    if (canonical.latitude === 0 && canonical.longitude === 0) {
      errors.push('location_check: latitude/longitude (0,0) är ogiltigt för GPS-kontroll (Atlanten)');
    }
    if (canonical.latitude !== undefined && (canonical.latitude < -90 || canonical.latitude > 90)) {
      errors.push('location_check: latitude måste vara -90 till 90');
    }
    if (canonical.longitude !== undefined && (canonical.longitude < -180 || canonical.longitude > 180)) {
      errors.push('location_check: longitude måste vara -180 till 180');
    }
  }

  if (checkType === 'qr' && !canonical.qrCodeValue) {
    warnings.push('location_check: checkType=qr men qrCodeValue saknas');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 13. SOUND_LEVEL
// =============================================================================

const SoundLevelRawSchema = z.object({
  instructions: z.string().optional(),
  instruction: z.string().optional(),
  triggerMode: z.enum(['threshold', 'peak', 'sustained']).optional(),
  thresholdLevel: z.number().optional(),
  threshold: z.number().optional(),
  sustainDuration: z.number().optional(),
  holdDuration: z.number().optional(),
  activityLabel: z.string().optional(),
  showMeter: z.boolean().optional(),
}).passthrough();

const _SoundLevelCanonicalSchema = z.object({
  instructions: z.string().default('Gör ljud!'),
  triggerMode: z.enum(['threshold', 'peak', 'sustained']).default('threshold'),
  thresholdLevel: z.number().default(70),
  sustainDuration: z.number().default(2),
  activityLabel: z.string().optional(),
  showMeter: z.boolean().default(true),
});

export type SoundLevelCanonical = z.infer<typeof _SoundLevelCanonicalSchema>;

export function normalizeSoundLevel(raw: unknown): { canonical: Partial<SoundLevelCanonical>; warnings: string[] } {
  const parsed = SoundLevelRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['sound_level: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Alias normalisering
  let instructions = data.instructions;
  if (!instructions && data.instruction) {
    instructions = data.instruction;
    warnings.push('sound_level: normaliserade instruction → instructions');
  }

  let thresholdLevel = data.thresholdLevel;
  if (thresholdLevel === undefined && data.threshold !== undefined) {
    thresholdLevel = data.threshold;
    warnings.push('sound_level: normaliserade threshold → thresholdLevel');
  }

  let sustainDuration = data.sustainDuration;
  if (sustainDuration === undefined && data.holdDuration !== undefined) {
    sustainDuration = data.holdDuration;
    warnings.push('sound_level: normaliserade holdDuration → sustainDuration');
  }

  return {
    canonical: {
      instructions: instructions ?? 'Gör ljud!',
      triggerMode: data.triggerMode ?? 'threshold',
      thresholdLevel: thresholdLevel ?? 70,
      sustainDuration: sustainDuration ?? 2,
      activityLabel: data.activityLabel,
      showMeter: data.showMeter ?? true,
    },
    warnings,
  };
}

export function validateSoundLevel(_canonical: Partial<SoundLevelCanonical>): ValidationResult {
  // Alla keys är OPTIONAL med bra defaults
  return { ok: true, errors: [], warnings: [] };
}

// =============================================================================
// 14. AUDIO
// =============================================================================

const AudioRawSchema = z.object({
  audioUrl: z.string().optional(),
  src: z.string().optional(),
  autoPlay: z.boolean().optional(),
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  requireAck: z.boolean().optional(),
  showTranscript: z.boolean().optional(),
  transcriptText: z.string().optional(),
  transcript: z.string().optional(),
}).passthrough();

const _AudioCanonicalSchema = z.object({
  audioUrl: z.string(),
  autoPlay: z.boolean().default(false),
  loop: z.boolean().default(false),
  requireAck: z.boolean().default(false),
  showTranscript: z.boolean().default(false),
  transcriptText: z.string().optional(),
});

export type AudioCanonical = z.infer<typeof _AudioCanonicalSchema>;

export function normalizeAudio(raw: unknown): { canonical: Partial<AudioCanonical>; warnings: string[] } {
  const parsed = AudioRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['audio: kunde inte parsa raw metadata'] };
  }
  const data = parsed.data;
  const warnings: string[] = [];

  // Alias normalisering
  let audioUrl = data.audioUrl;
  if (!audioUrl && data.src) {
    audioUrl = data.src;
    warnings.push('audio: normaliserade src → audioUrl');
  }

  let autoPlay = data.autoPlay;
  if (autoPlay === undefined && data.autoplay !== undefined) {
    autoPlay = data.autoplay;
    warnings.push('audio: normaliserade autoplay → autoPlay');
  }

  let transcriptText = data.transcriptText;
  if (!transcriptText && data.transcript) {
    transcriptText = data.transcript;
    warnings.push('audio: normaliserade transcript → transcriptText');
  }

  return {
    canonical: {
      audioUrl: audioUrl ?? '',
      autoPlay: autoPlay ?? false,
      loop: data.loop ?? false,
      requireAck: data.requireAck ?? false,
      showTranscript: data.showTranscript ?? false,
      transcriptText,
    },
    warnings,
  };
}

export function validateAudio(canonical: Partial<AudioCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canonical.audioUrl || canonical.audioUrl.trim() === '') {
    warnings.push('audio.audioUrl saknas – renderar "ej konfigurerad"');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 15. CONVERSATION_CARDS_COLLECTION
// =============================================================================

const ConversationCardsRawSchema = z.object({
  conversation_card_collection_id: z.string().optional(),
}).passthrough();

const _ConversationCardsCanonicalSchema = z.object({
  conversation_card_collection_id: z.string().min(1, 'conversation_cards_collection.conversation_card_collection_id är required'),
});

export type ConversationCardsCanonical = z.infer<typeof _ConversationCardsCanonicalSchema>;

export function normalizeConversationCards(raw: unknown): { canonical: Partial<ConversationCardsCanonical>; warnings: string[] } {
  const parsed = ConversationCardsRawSchema.safeParse(raw);
  if (!parsed.success) {
    return { canonical: {}, warnings: ['conversation_cards_collection: kunde inte parsa raw metadata'] };
  }
  return {
    canonical: {
      conversation_card_collection_id: parsed.data.conversation_card_collection_id ?? '',
    },
    warnings: [],
  };
}

export function validateConversationCards(canonical: Partial<ConversationCardsCanonical>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canonical.conversation_card_collection_id || canonical.conversation_card_collection_id.trim() === '') {
    errors.push('conversation_cards_collection.conversation_card_collection_id är HARD_REQUIRED och måste vara non-empty');
  }

  return { ok: errors.length === 0, errors, warnings };
}

// =============================================================================
// 16-18: SIGNAL_GENERATOR, TIME_BANK_STEP, EMPTY_ARTIFACT
// Dessa har nested config och inga HARD_REQUIRED keys
// =============================================================================

export function normalizeSignalGenerator(raw: unknown): { canonical: Record<string, unknown>; warnings: string[] } {
  return { canonical: raw as Record<string, unknown>, warnings: [] };
}

export function validateSignalGenerator(_canonical: unknown): ValidationResult {
  return { ok: true, errors: [], warnings: [] };
}

export function normalizeTimeBankStep(raw: unknown): { canonical: Record<string, unknown>; warnings: string[] } {
  return { canonical: raw as Record<string, unknown>, warnings: [] };
}

export function validateTimeBankStep(_canonical: unknown): ValidationResult {
  return { ok: true, errors: [], warnings: [] };
}

export function normalizeEmptyArtifact(raw: unknown): { canonical: Record<string, unknown>; warnings: string[] } {
  return { canonical: raw as Record<string, unknown>, warnings: [] };
}

export function validateEmptyArtifact(_canonical: unknown): ValidationResult {
  return { ok: true, errors: [], warnings: [] };
}

// =============================================================================
// 19. REPLAY_MARKER - Ingen metadata
// =============================================================================

export function normalizeReplayMarker(_raw: unknown): { canonical: Record<string, unknown>; warnings: string[] } {
  return { canonical: {}, warnings: [] };
}

export function validateReplayMarker(_canonical: unknown): ValidationResult {
  return { ok: true, errors: [], warnings: [] };
}

// =============================================================================
// Master Dispatcher
// =============================================================================

export type ArtifactType =
  | 'keypad'
  | 'riddle'
  | 'counter'
  | 'multi_answer'
  | 'qr_gate'
  | 'hint_container'
  | 'hotspot'
  | 'tile_puzzle'
  | 'cipher'
  | 'logic_grid'
  | 'prop_confirmation'
  | 'location_check'
  | 'sound_level'
  | 'audio'
  | 'conversation_cards_collection'
  | 'signal_generator'
  | 'time_bank_step'
  | 'empty_artifact'
  | 'replay_marker'
  | 'card'
  | 'document'
  | 'image';

export interface NormalizeValidateResult {
  canonical: Record<string, unknown>;
  validation: ValidationResult;
  normalizeWarnings: string[];
  appliedAliases: string[];
}

// Helper: skapar NormalizeValidateResult med rule-based alias detection
function buildResult(
  artifactType: string,
  rawMetadata: unknown,
  canonical: Record<string, unknown>,
  validation: ValidationResult,
  warnings: string[]
): NormalizeValidateResult {
  return {
    canonical,
    validation,
    normalizeWarnings: warnings,
    appliedAliases: detectAppliedAliases(artifactType, rawMetadata, canonical),
  };
}

export function normalizeAndValidate(
  artifactType: string,
  rawMetadata: unknown
): NormalizeValidateResult {
  switch (artifactType) {
    case 'keypad': {
      const { canonical, warnings } = normalizeKeypad(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateKeypad(canonical), warnings);
    }
    case 'riddle': {
      const { canonical, warnings } = normalizeRiddle(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateRiddle(canonical), warnings);
    }
    case 'counter': {
      const { canonical, warnings } = normalizeCounter(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateCounter(canonical), warnings);
    }
    case 'multi_answer': {
      const { canonical, warnings } = normalizeMultiAnswer(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateMultiAnswer(canonical), warnings);
    }
    case 'qr_gate': {
      const { canonical, warnings } = normalizeQrGate(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateQrGate(canonical), warnings);
    }
    case 'hint_container': {
      const { canonical, warnings } = normalizeHintContainer(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateHintContainer(canonical), warnings);
    }
    case 'hotspot': {
      const { canonical, warnings } = normalizeHotspot(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateHotspot(canonical), warnings);
    }
    case 'tile_puzzle': {
      const { canonical, warnings } = normalizeTilePuzzle(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateTilePuzzle(canonical), warnings);
    }
    case 'cipher': {
      const { canonical, warnings } = normalizeCipher(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateCipher(canonical), warnings);
    }
    case 'logic_grid': {
      const { canonical, warnings } = normalizeLogicGrid(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateLogicGrid(canonical), warnings);
    }
    case 'prop_confirmation': {
      const { canonical, warnings } = normalizePropConfirmation(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validatePropConfirmation(canonical), warnings);
    }
    case 'location_check': {
      const { canonical, warnings } = normalizeLocationCheck(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateLocationCheck(canonical), warnings);
    }
    case 'sound_level': {
      const { canonical, warnings } = normalizeSoundLevel(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateSoundLevel(canonical), warnings);
    }
    case 'audio': {
      const { canonical, warnings } = normalizeAudio(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateAudio(canonical), warnings);
    }
    case 'conversation_cards_collection': {
      const { canonical, warnings } = normalizeConversationCards(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical as Record<string, unknown>, validateConversationCards(canonical), warnings);
    }
    case 'signal_generator': {
      const { canonical, warnings } = normalizeSignalGenerator(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical, validateSignalGenerator(canonical), warnings);
    }
    case 'time_bank_step': {
      const { canonical, warnings } = normalizeTimeBankStep(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical, validateTimeBankStep(canonical), warnings);
    }
    case 'empty_artifact': {
      const { canonical, warnings } = normalizeEmptyArtifact(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical, validateEmptyArtifact(canonical), warnings);
    }
    case 'replay_marker': {
      const { canonical, warnings } = normalizeReplayMarker(rawMetadata);
      return buildResult(artifactType, rawMetadata, canonical, validateReplayMarker(canonical), warnings);
    }
    case 'card':
    case 'document':
    case 'image':
      // Statiska typer - ingen metadata-validering
      return {
        canonical: rawMetadata as Record<string, unknown>,
        validation: { ok: true, errors: [], warnings: [] },
        normalizeWarnings: [],
        appliedAliases: [],
      };
    default:
      // POLICY: Okänd artifact_type är error - fångar tidigt
      return {
        canonical: rawMetadata as Record<string, unknown>,
        validation: { 
          ok: false, 
          errors: [`Okänd artifact_type: "${artifactType}" - kan inte valideras`], 
          warnings: [] 
        },
        normalizeWarnings: [],
        appliedAliases: [],
      };
  }
}
