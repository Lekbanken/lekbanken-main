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
