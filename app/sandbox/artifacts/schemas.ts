import { z } from 'zod';

// -----------------------------------------------------------------------------
// Common helpers
// -----------------------------------------------------------------------------

const nonEmptyString = z.string().min(1);

const isoDateString = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date string' });

export const artifactRoleSchema = z.enum(['admin', 'host', 'participant']);
export type ArtifactRole = z.infer<typeof artifactRoleSchema>;

export const storageBucketSchema = z.enum([
  'game-media',
  'custom_utmarkelser',
  'tenant-media',
  'media-images',
  'media-audio',
]);

export const storageRefSchema = z.object({
  bucket: storageBucketSchema,
  path: nonEmptyString,
});
export type StorageRef = z.infer<typeof storageRefSchema>;

// -----------------------------------------------------------------------------
// Keypad (components/play/Keypad)
// -----------------------------------------------------------------------------

export const keypadArtifactConfigSchema = z.object({
  correctCode: z
    .string()
    .min(1)
    .regex(/^\d+$/, { message: 'correctCode must be digits' }),
  codeLength: z.number().int().min(1).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  showAttempts: z.boolean().optional(),
  cooldownMs: z.number().int().min(0).optional(),
  hapticEnabled: z.boolean().optional(),
  title: z.string().optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  autoSubmit: z.boolean().optional(),
});
export type KeypadArtifactConfig = z.infer<typeof keypadArtifactConfigSchema>;

// -----------------------------------------------------------------------------
// Riddle (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const riddleNormalizeModeSchema = z.enum(['strict', 'fuzzy', 'numeric']);

export const riddleConfigSchema = z.object({
  promptArtifactId: z.string().optional(),
  promptText: z.string().optional(),
  acceptedAnswers: z.array(nonEmptyString).min(1),
  normalizeMode: riddleNormalizeModeSchema.optional(),
  maxAttempts: z.number().int().min(1).optional(),
  showHintAfterAttempts: z.number().int().min(1).optional(),
  hintText: z.string().optional(),
  placeholderText: z.string().optional(),
});
export type RiddleConfigInput = z.infer<typeof riddleConfigSchema>;

// -----------------------------------------------------------------------------
// Cipher (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const cipherConfigSchema = z.object({
  cipherType: z.enum(['caesar', 'substitution', 'atbash', 'custom']),
  encodedMessage: nonEmptyString,
  keyArtifactId: z.string().optional(),
  caesarShift: z.number().int().min(1).max(25).optional(),
  substitutionMap: z.record(z.string(), z.string()).optional(),
  expectedPlaintext: nonEmptyString,
  normalizeMode: riddleNormalizeModeSchema.optional(),
  showDecoderUI: z.boolean().optional(),
});
export type CipherConfigInput = z.infer<typeof cipherConfigSchema>;

// -----------------------------------------------------------------------------
// Hotspot (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const hotspotSchema = z.object({
  id: nonEmptyString,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  radius: z.number().min(0).max(100),
  label: z.string().optional(),
  required: z.boolean().optional(),
  revealArtifactId: z.string().optional(),
});

export const hotspotConfigSchema = z.object({
  imageArtifactId: nonEmptyString,
  imageUrl: z
    .union([
      z.string().url(),
      z.string().regex(/^\//, { message: 'imageUrl must be an absolute URL or a /path' }),
    ])
    .optional(),
  imageRef: storageRefSchema.optional(),
  hotspots: z.array(hotspotSchema).min(0),
  requireAll: z.boolean().optional(),
  showProgress: z.boolean().optional(),
  allowZoom: z.boolean().optional(),
  hapticFeedback: z.boolean().optional(),
});
export type HotspotConfigInput = z.infer<typeof hotspotConfigSchema>;

// -----------------------------------------------------------------------------
// Tile puzzle (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const tileGridSizeSchema = z.enum(['2x2', '3x3', '4x4', '3x2', '4x3']);

export const tilePuzzleConfigSchema = z.object({
  imageArtifactId: nonEmptyString,
  imageUrl: z.string().url().optional(),
  gridSize: tileGridSizeSchema,
  snapToGrid: z.boolean().optional(),
  shuffleOnStart: z.boolean().optional(),
  showPreview: z.boolean().optional(),
});
export type TilePuzzleConfigInput = z.infer<typeof tilePuzzleConfigSchema>;

// -----------------------------------------------------------------------------
// Logic grid (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const logicGridCategorySchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  items: z.array(nonEmptyString).min(2),
});

export const logicGridClueSchema = z.object({
  id: nonEmptyString,
  text: nonEmptyString,
  revealed: z.boolean().optional(),
});

export const logicGridCellSchema = z.object({
  rowCategoryId: nonEmptyString,
  rowItemIndex: z.number().int().min(0),
  colCategoryId: nonEmptyString,
  colItemIndex: z.number().int().min(0),
  value: z.enum(['yes', 'no', 'unknown']),
});

export const logicGridConfigSchema = z.object({
  title: nonEmptyString,
  categories: z.array(logicGridCategorySchema).min(3),
  clues: z.array(logicGridClueSchema).min(1),
  solution: z.array(logicGridCellSchema).min(1),
  progressiveClues: z.boolean().optional(),
});
export type LogicGridConfigInput = z.infer<typeof logicGridConfigSchema>;

// -----------------------------------------------------------------------------
// Counter (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const counterConfigSchema = z.object({
  key: nonEmptyString,
  target: z.number().int().min(1),
  initialValue: z.number().int().min(0).optional(),
  perRole: z.boolean().optional(),
  label: z.string().optional(),
  allowDecrement: z.boolean().optional(),
});
export type CounterConfigInput = z.infer<typeof counterConfigSchema>;

// -----------------------------------------------------------------------------
// QR gate / scan gate (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const scanGateConfigSchema = z.object({
  mode: z.enum(['qr', 'nfc', 'either']),
  allowedValues: z.array(nonEmptyString).min(1),
  allowManualFallback: z.boolean().optional(),
  fallbackCode: z.string().optional(),
  promptText: z.string().optional(),
  successMessage: z.string().optional(),
});
export type ScanGateConfigInput = z.infer<typeof scanGateConfigSchema>;

// -----------------------------------------------------------------------------
// Location check (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const geoCoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const locationCheckConfigSchema = z.object({
  locationId: nonEmptyString,
  locationName: nonEmptyString,
  checkType: z.enum(['gps', 'beacon', 'qr', 'manual']),
  targetCoordinates: geoCoordinateSchema.optional(),
  radiusMeters: z.number().min(1).optional(),
  beaconId: z.string().optional(),
  qrCodeValue: z.string().optional(),
  hint: z.string().optional(),
  showDistance: z.boolean().optional(),
  showCompass: z.boolean().optional(),
});
export type LocationCheckConfigInput = z.infer<typeof locationCheckConfigSchema>;

// -----------------------------------------------------------------------------
// Hint (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const hintItemSchema = z.object({
  id: nonEmptyString,
  content: nonEmptyString,
  isArtifact: z.boolean().optional(),
  cost: z.enum(['none', 'time', 'points']).optional(),
  timePenalty: z.number().int().min(0).optional(),
  pointsPenalty: z.number().int().min(0).optional(),
  availableAfterSeconds: z.number().int().min(0).optional(),
});

export const hintConfigSchema = z.object({
  hints: z.array(hintItemSchema).min(1),
  cooldownSeconds: z.number().int().min(0).optional(),
  maxHints: z.number().int().min(1).optional(),
  showHintCount: z.boolean().optional(),
});
export type HintConfigInput = z.infer<typeof hintConfigSchema>;

// -----------------------------------------------------------------------------
// Prop confirmation (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const propConfirmationConfigSchema = z.object({
  propId: nonEmptyString,
  propDescription: nonEmptyString,
  propImageUrl: z.string().url().optional(),
  instructions: nonEmptyString,
  requirePhoto: z.boolean().optional(),
  allowPartial: z.boolean().optional(),
  timeoutSeconds: z.number().int().min(1).optional(),
});
export type PropConfirmationConfigInput = z.infer<typeof propConfirmationConfigSchema>;

// -----------------------------------------------------------------------------
// Audio (components/play/AudioPlayer)
// -----------------------------------------------------------------------------

export const audioArtifactConfigSchema = z
  .object({
    src: z
      .union([
        z.string().url(),
        z.string().regex(/^\//, { message: 'src must be an absolute URL or a /path' }),
      ])
      .optional(),
    audioRef: storageRefSchema.optional(),
    config: z
      .object({
        requireAck: z.boolean().optional(),
        ackButtonText: z.string().optional(),
        showTranscript: z.boolean().optional(),
        transcriptText: z.string().optional(),
        autoPlay: z.boolean().optional(),
        loop: z.boolean().optional(),
        requireHeadphones: z.boolean().optional(),
      })
      .optional(),
    title: z.string().optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
  })
  .refine((value) => Boolean(value.src || value.audioRef), {
    message: 'Either src or audioRef is required',
  });
export type AudioArtifactConfigInput = z.infer<typeof audioArtifactConfigSchema>;

// -----------------------------------------------------------------------------
// Sound level (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const soundLevelConfigSchema = z.object({
  triggerMode: z.enum(['threshold', 'sustained', 'peak']),
  thresholdLevel: z.number().int().min(0).max(100),
  sustainDuration: z.number().min(0).optional(),
  activityLabel: nonEmptyString,
  instructions: z.string().optional(),
  showMeter: z.boolean().optional(),
  showProgress: z.boolean().optional(),
});
export type SoundLevelConfigInput = z.infer<typeof soundLevelConfigSchema>;

// -----------------------------------------------------------------------------
// Replay marker (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const replayMarkerConfigSchema = z.object({
  allowParticipantMarkers: z.boolean().optional(),
  availableTypes: z.array(z.enum(['highlight', 'bookmark', 'note', 'error'])).min(1),
  autoMarkEvents: z.array(z.string()).optional(),
});
export type ReplayMarkerConfigInput = z.infer<typeof replayMarkerConfigSchema>;

// -----------------------------------------------------------------------------
// Multi answer (types/puzzle-modules)
// -----------------------------------------------------------------------------

export const checkItemSchema = z.object({
  id: nonEmptyString,
  type: z.enum(['text', 'code', 'select', 'toggle']),
  label: nonEmptyString,
  expected: z.string().optional(),
  options: z.array(z.object({ value: nonEmptyString, label: nonEmptyString })).optional(),
  normalizeMode: riddleNormalizeModeSchema.optional(),
  hint: z.string().optional(),
});

export const multiAnswerConfigSchema = z.object({
  checks: z.array(checkItemSchema).min(1),
  requireAll: z.boolean().optional(),
  allowPartialSave: z.boolean().optional(),
  showProgress: z.boolean().optional(),
});
export type MultiAnswerConfigInput = z.infer<typeof multiAnswerConfigSchema>;

// -----------------------------------------------------------------------------
// Content-like artifacts (card/document/image) for sandbox-only use
// -----------------------------------------------------------------------------

export const textContentArtifactConfigSchema = z.object({
  title: nonEmptyString,
  body: z.string(),
  visibility: z.enum(['public', 'leader_only', 'role_private']).optional(),
  visibleToRoleId: z.string().nullable().optional(),
});
export type TextContentArtifactConfigInput = z.infer<typeof textContentArtifactConfigSchema>;

export const imageRevealArtifactConfigSchema = z.object({
  title: nonEmptyString,
  imageUrl: z.string().url(),
  description: z.string().optional(),
});
export type ImageRevealArtifactConfigInput = z.infer<typeof imageRevealArtifactConfigSchema>;

// -----------------------------------------------------------------------------
// Very small "state" schemas to enable future store validation
// -----------------------------------------------------------------------------

export const riddleStateSchema = z.object({
  isCorrect: z.boolean(),
  attemptsUsed: z.number().int().min(0),
  attempts: z.array(
    z.object({
      answer: z.string(),
      timestamp: isoDateString,
      correct: z.boolean(),
      normalized: z.string().optional(),
    })
  ),
  showHint: z.boolean(),
  correctAnswer: z.string().optional(),
});

export const scanGateStateSchema = z.object({
  isVerified: z.boolean(),
  scannedValue: z.string().optional(),
  usedFallback: z.boolean(),
  scanAttempts: z.number().int().min(0),
  verifiedAt: isoDateString.optional(),
});

export const hintStateSchema = z.object({
  revealedHintIds: z.array(z.string()),
  lastHintTime: isoDateString.optional(),
  cooldownRemaining: z.number().int().min(0),
  hintsAvailable: z.number().int().min(0),
  totalPenaltyTime: z.number().int().min(0),
  totalPenaltyPoints: z.number().int().min(0),
});

export const counterStateSchema = z.object({
  key: nonEmptyString,
  currentValue: z.number().int().min(0),
  target: z.number().int().min(1),
  isComplete: z.boolean(),
  roleValues: z.record(z.string(), z.number()).optional(),
});

export const cipherStateSchema = z.object({
  currentGuess: z.string(),
  isDecoded: z.boolean(),
  attemptsUsed: z.number().int().min(0),
  decodedAt: isoDateString.optional(),
});

export const locationCheckStateSchema = z.object({
  isVerified: z.boolean(),
  currentCoordinates: geoCoordinateSchema.optional(),
  distanceMeters: z.number().optional(),
  lastCheckAt: isoDateString.optional(),
  verifiedAt: isoDateString.optional(),
});

export const propConfirmationStateSchema = z.object({
  status: z.enum(['pending', 'waiting', 'confirmed', 'rejected', 'timeout']),
  requestedAt: isoDateString.optional(),
  confirmedAt: isoDateString.optional(),
  confirmedBy: z.string().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const soundLevelStateSchema = z.object({
  currentLevel: z.number().int().min(0).max(100),
  peakLevel: z.number().int().min(0).max(100),
  isTriggered: z.boolean(),
  sustainedSeconds: z.number().min(0),
  triggeredAt: isoDateString.optional(),
});

export const replayMarkerStateSchema = z.object({
  markers: z.array(
    z.object({
      id: nonEmptyString,
      type: z.enum(['highlight', 'bookmark', 'note', 'error']),
      timestampSeconds: z.number().min(0),
      label: nonEmptyString,
      note: z.string().optional(),
      createdBy: z.string().optional(),
      createdAt: isoDateString,
    })
  ),
});
