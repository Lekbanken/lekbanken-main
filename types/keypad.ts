/**
 * Keypad Types for Legendary Play
 * 
 * Used for escape room style PIN code puzzles
 */

export type KeypadLayout = 'numeric' | 'alpha' | 'custom';

export type KeypadState = 'locked' | 'unlocked' | 'disabled';

export interface KeypadConfig {
  /** The correct code to unlock */
  correctCode: string;
  /** Length of the code (for visual hint) */
  codeLength: number;
  /** Button layout type */
  buttonLayout: KeypadLayout;
  /** Custom button labels (for 'custom' layout) */
  customButtons?: string[];
  /** Maximum number of attempts (undefined = unlimited) */
  maxAttempts?: number;
  /** Cooldown in seconds after failed attempts */
  cooldownSeconds?: number;
  /** Enable haptic feedback */
  hapticEnabled?: boolean;
  /** Trigger ID to fire on success */
  onSuccessTrigger?: string;
  /** Trigger ID to fire on failure (max attempts reached) */
  onFailureTrigger?: string;
}

export interface KeypadAttempt {
  code: string;
  timestamp: Date;
  correct: boolean;
}

export interface KeypadInstance {
  id: string;
  config: KeypadConfig;
  state: KeypadState;
  attemptsUsed: number;
  attempts: KeypadAttempt[];
  unlockedAt?: Date;
  lockedOutUntil?: Date;
}

/** Numeric keypad button layout (phone style) */
export const NUMERIC_BUTTONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'] as const;

/** Alphabetic keypad button layout */
export const ALPHA_BUTTONS = [
  'A', 'B', 'C', 'D', 'E',
  'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O',
  'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y',
  'Z', '⌫', '✓'
] as const;

export type NumericButton = typeof NUMERIC_BUTTONS[number];
export type AlphaButton = typeof ALPHA_BUTTONS[number];
