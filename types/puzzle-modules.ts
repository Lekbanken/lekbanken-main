/**
 * Puzzle Module Types for Legendary Play
 * 
 * Covers Counter, Riddle, Audio, and future puzzle primitives.
 * All modules emit events that integrate with the trigger system.
 */

// ============================================================================
// Simple Counter Module (#22)
// ============================================================================

export interface CounterConfig {
  /** Unique key for this counter (e.g., "found_clues", "solved_puzzles") */
  key: string;
  /** Target value to reach */
  target: number;
  /** Starting value (default: 0) */
  initialValue?: number;
  /** Per-role counters (each role has separate count) */
  perRole?: boolean;
  /** Display label in UI */
  label?: string;
  /** Allow decrementing */
  allowDecrement?: boolean;
}

export interface CounterState {
  key: string;
  currentValue: number;
  target: number;
  isComplete: boolean;
  /** Per-role values if perRole is true */
  roleValues?: Record<string, number>;
}

// ============================================================================
// Riddle Prompt + Answer Module (#7)
// ============================================================================

export type RiddleNormalizeMode = 'strict' | 'fuzzy' | 'numeric';

export interface RiddleConfig {
  /** The prompt/question artifact ID */
  promptArtifactId?: string;
  /** Inline prompt text (alternative to artifact) */
  promptText?: string;
  /** Accepted answers (case-insensitive by default) */
  acceptedAnswers: string[];
  /** Normalization mode for matching */
  normalizeMode?: RiddleNormalizeMode;
  /** Maximum attempts (undefined = unlimited) */
  maxAttempts?: number;
  /** Show hint after N wrong attempts */
  showHintAfterAttempts?: number;
  /** Hint text to show */
  hintText?: string;
  /** Placeholder text for input */
  placeholderText?: string;
}

export interface RiddleAttempt {
  answer: string;
  timestamp: string;
  correct: boolean;
  normalized?: string;
}

export interface RiddleState {
  isCorrect: boolean;
  attemptsUsed: number;
  attempts: RiddleAttempt[];
  showHint: boolean;
  correctAnswer?: string; // Only revealed after correct
}

// ============================================================================
// Audio Player + Acknowledgment Gate (#10)
// ============================================================================

export interface AudioConfig {
  /** Audio artifact ID */
  audioArtifactId: string;
  /** Require acknowledgment to proceed */
  requireAck?: boolean;
  /** Custom acknowledgment button text */
  ackButtonText?: string;
  /** Show transcript toggle */
  showTranscript?: boolean;
  /** Transcript text (for accessibility) */
  transcriptText?: string;
  /** Auto-play when revealed (subject to browser restrictions) */
  autoPlay?: boolean;
  /** Loop playback */
  loop?: boolean;
  /** Require headphones warning */
  requireHeadphones?: boolean;
}

export interface AudioState {
  isPlaying: boolean;
  hasPlayed: boolean;
  hasAcknowledged: boolean;
  playbackPosition?: number;
  duration?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize text for riddle matching
 */
export function normalizeRiddleAnswer(
  answer: string,
  mode: RiddleNormalizeMode = 'fuzzy'
): string {
  let normalized = answer.trim();
  
  switch (mode) {
    case 'strict':
      // Only trim and lowercase
      return normalized.toLowerCase();
    
    case 'fuzzy':
      // Remove diacritics, extra spaces, common punctuation
      normalized = normalized
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[.,!?'"]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();
      return normalized;
    
    case 'numeric':
      // Extract only digits
      return normalized.replace(/\D/g, '');
    
    default:
      return normalized.toLowerCase();
  }
}

/**
 * Check if a riddle answer matches any accepted answer
 */
export function checkRiddleAnswer(
  submittedAnswer: string,
  acceptedAnswers: string[],
  mode: RiddleNormalizeMode = 'fuzzy'
): { isCorrect: boolean; matchedAnswer?: string } {
  const normalizedSubmitted = normalizeRiddleAnswer(submittedAnswer, mode);
  
  for (const accepted of acceptedAnswers) {
    const normalizedAccepted = normalizeRiddleAnswer(accepted, mode);
    if (normalizedSubmitted === normalizedAccepted) {
      return { isCorrect: true, matchedAnswer: accepted };
    }
  }
  
  return { isCorrect: false };
}

// ============================================================================
// Multi-Answer Verification Module (#5)
// ============================================================================

export type CheckType = 'text' | 'code' | 'select' | 'toggle';

export interface CheckItem {
  /** Unique ID for this check */
  id: string;
  /** Type of input */
  type: CheckType;
  /** Display label */
  label: string;
  /** Expected value (for text/code) */
  expected?: string;
  /** Options for select type */
  options?: Array<{ value: string; label: string }>;
  /** Normalize mode for text matching */
  normalizeMode?: RiddleNormalizeMode;
  /** Hint text shown below input */
  hint?: string;
}

export interface MultiAnswerConfig {
  /** List of checks to complete */
  checks: CheckItem[];
  /** Require all checks to pass */
  requireAll?: boolean;
  /** Allow partial progress saves */
  allowPartialSave?: boolean;
  /** Show progress indicator */
  showProgress?: boolean;
}

export interface CheckResult {
  checkId: string;
  passed: boolean;
  submittedValue?: string;
  timestamp: string;
}

export interface MultiAnswerState {
  results: CheckResult[];
  isComplete: boolean;
  passedCount: number;
  totalCount: number;
}

// ============================================================================
// QR/NFC Scan Gate Module (#6)
// ============================================================================

export type ScanMode = 'qr' | 'nfc' | 'either';

export interface ScanGateConfig {
  /** Scan mode */
  mode: ScanMode;
  /** List of valid values to accept */
  allowedValues: string[];
  /** Allow manual code entry as fallback */
  allowManualFallback?: boolean;
  /** Fallback code (if different from QR values) */
  fallbackCode?: string;
  /** Custom prompt text */
  promptText?: string;
  /** Success message */
  successMessage?: string;
}

export interface ScanGateState {
  isVerified: boolean;
  scannedValue?: string;
  usedFallback: boolean;
  scanAttempts: number;
  verifiedAt?: string;
}

// ============================================================================
// Hint System Module (#15)
// ============================================================================

export type HintCost = 'none' | 'time' | 'points';

export interface HintItem {
  /** Unique hint ID */
  id: string;
  /** Hint content (can be artifact ID or inline text) */
  content: string;
  /** Is this an artifact reference? */
  isArtifact?: boolean;
  /** Cost to reveal this hint */
  cost?: HintCost;
  /** Time penalty in seconds (if cost is 'time') */
  timePenalty?: number;
  /** Points penalty (if cost is 'points') */
  pointsPenalty?: number;
  /** Delay before hint becomes available (seconds since step start) */
  availableAfterSeconds?: number;
}

export interface HintConfig {
  /** List of available hints (ordered) */
  hints: HintItem[];
  /** Cooldown between hints in seconds */
  cooldownSeconds?: number;
  /** Max hints allowed */
  maxHints?: number;
  /** Show hint count to participants */
  showHintCount?: boolean;
}

export interface HintState {
  revealedHintIds: string[];
  lastHintTime?: string;
  cooldownRemaining: number;
  hintsAvailable: number;
  totalPenaltyTime: number;
  totalPenaltyPoints: number;
}

// ============================================================================
// Image Hotspot Hunt Module (#2)
// ============================================================================

export interface Hotspot {
  /** Unique ID */
  id: string;
  /** X position (0-100 percentage) */
  x: number;
  /** Y position (0-100 percentage) */
  y: number;
  /** Radius for hit detection (percentage) */
  radius: number;
  /** Label shown on find */
  label?: string;
  /** Is this hotspot required for completion? */
  required?: boolean;
  /** Reveal artifact when found */
  revealArtifactId?: string;
}

export interface HotspotConfig {
  /** Image artifact ID */
  imageArtifactId: string;
  /** Image URL (alternative to artifact) */
  imageUrl?: string;
  /** List of hotspots */
  hotspots: Hotspot[];
  /** Require all hotspots to complete */
  requireAll?: boolean;
  /** Show found count */
  showProgress?: boolean;
  /** Allow pinch-zoom */
  allowZoom?: boolean;
  /** Feedback on find (vibration/sound) */
  hapticFeedback?: boolean;
}

export interface HotspotState {
  foundHotspotIds: string[];
  isComplete: boolean;
  foundCount: number;
  requiredCount: number;
}

// ============================================================================
// Jigsaw / Tile Puzzle Module (#3)
// ============================================================================

export type TileGridSize = '2x2' | '3x3' | '4x4' | '3x2' | '4x3';

export interface TilePosition {
  row: number;
  col: number;
}

export interface Tile {
  /** Unique tile ID */
  id: string;
  /** Correct position */
  correctPosition: TilePosition;
  /** Current position */
  currentPosition: TilePosition;
  /** Image crop (calculated from grid) */
  imageCrop?: { x: number; y: number; width: number; height: number };
}

export interface TilePuzzleConfig {
  /** Image artifact ID */
  imageArtifactId: string;
  /** Image URL (alternative to artifact) */
  imageUrl?: string;
  /** Grid size */
  gridSize: TileGridSize;
  /** Enable snap-to-position */
  snapToGrid?: boolean;
  /** Shuffle on start */
  shuffleOnStart?: boolean;
  /** Show preview image */
  showPreview?: boolean;
}

export interface TilePuzzleState {
  tiles: Tile[];
  isComplete: boolean;
  moveCount: number;
  startedAt?: string;
  completedAt?: string;
}

// ============================================================================
// Language Decoder / Cipher Module (#9)
// ============================================================================

export type CipherType = 'caesar' | 'substitution' | 'atbash' | 'custom';

export interface CipherConfig {
  /** Cipher type */
  cipherType: CipherType;
  /** Encoded message */
  encodedMessage: string;
  /** Key artifact ID (shows the cipher key) */
  keyArtifactId?: string;
  /** Caesar shift (for caesar cipher) */
  caesarShift?: number;
  /** Substitution map (for substitution cipher) */
  substitutionMap?: Record<string, string>;
  /** Expected plaintext answer */
  expectedPlaintext: string;
  /** Normalize mode for answer matching */
  normalizeMode?: RiddleNormalizeMode;
  /** Show decoder helper UI */
  showDecoderUI?: boolean;
}

export interface CipherState {
  currentGuess: string;
  isDecoded: boolean;
  attemptsUsed: number;
  decodedAt?: string;
}

// ============================================================================
// Cipher Helper Functions
// ============================================================================

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Apply Caesar cipher shift
 */
export function caesarEncode(text: string, shift: number): string {
  return text.toUpperCase().split('').map(char => {
    const index = ALPHABET.indexOf(char);
    if (index === -1) return char;
    const newIndex = (index + shift + 26) % 26;
    return ALPHABET[newIndex];
  }).join('');
}

export function caesarDecode(text: string, shift: number): string {
  return caesarEncode(text, -shift);
}

/**
 * Apply Atbash cipher (reverse alphabet)
 */
export function atbashEncode(text: string): string {
  return text.toUpperCase().split('').map(char => {
    const index = ALPHABET.indexOf(char);
    if (index === -1) return char;
    return ALPHABET[25 - index];
  }).join('');
}

/**
 * Apply substitution cipher
 */
export function substitutionEncode(
  text: string,
  map: Record<string, string>
): string {
  return text.toUpperCase().split('').map(char => {
    return map[char] ?? char;
  }).join('');
}

export function substitutionDecode(
  text: string,
  map: Record<string, string>
): string {
  // Reverse the map
  const reverseMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    reverseMap[value] = key;
  }
  return substitutionEncode(text, reverseMap);
}

/**
 * Parse grid size string to dimensions
 */
export function parseGridSize(size: TileGridSize): { rows: number; cols: number } {
  const [cols, rows] = size.split('x').map(Number);
  return { rows, cols };
}

/**
 * Check if tile puzzle is solved
 */
export function isTilePuzzleSolved(tiles: Tile[]): boolean {
  return tiles.every(
    tile =>
      tile.currentPosition.row === tile.correctPosition.row &&
      tile.currentPosition.col === tile.correctPosition.col
  );
}

