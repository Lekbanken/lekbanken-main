/**
 * Session Code Generator Service
 * 
 * Generates unique 6-character session codes for participant sessions.
 * Excludes visually confusing characters (0/O, 1/I/L) for better UX.
 * 
 * Features:
 * - Collision detection with retry logic
 * - Cryptographically random generation
 * - Easy to read and dictate codes
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Characters used in session codes.
 * Excludes: 0, O (zero/oh), 1, I, L (one/eye/ell) to avoid confusion
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 32 characters
const CODE_LENGTH = 6;

/**
 * Generate a random session code
 * 
 * @returns 6-character code (e.g., "H3K9QF")
 * 
 * Total combinations: 32^6 = ~1.07 billion unique codes
 * Collision probability is negligible for typical usage
 */
export function generateSessionCode(): string {
  const chars: string[] = [];
  
  // Use crypto.getRandomValues for cryptographically secure randomness
  const randomValues = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = randomValues[i] % CODE_ALPHABET.length;
    chars.push(CODE_ALPHABET[randomIndex]);
  }
  
  return chars.join('');
}

/**
 * Generate a unique session code that doesn't exist in the database
 * 
 * @param maxRetries - Maximum number of attempts to find unique code
 * @returns Promise<string> - Unique session code
 * @throws Error if unable to generate unique code after maxRetries
 */
export async function generateUniqueSessionCode(maxRetries = 5): Promise<string> {
  const supabase = await createServiceRoleClient();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateSessionCode();
    
    // Check if code already exists
    const { data, error } = await supabase
      .from('participant_sessions')
      .select('session_code')
      .eq('session_code', code)
      .single();
    
    // If no match found, code is unique
    if (error?.code === 'PGRST116' || !data) {
      return code;
    }
    
    // Collision detected, try again
    console.warn(`[Session Code] Collision detected for code ${code}, retrying... (attempt ${attempt + 1}/${maxRetries})`);
  }
  
  throw new Error(`Failed to generate unique session code after ${maxRetries} attempts`);
}

/**
 * Validate session code format
 * 
 * @param code - Code to validate
 * @returns boolean - True if code is valid format
 */
export function isValidSessionCodeFormat(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  
  // Check all characters are in alphabet
  for (const char of code) {
    if (!CODE_ALPHABET.includes(char)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Normalize session code input (uppercase, trim)
 * 
 * @param input - User input
 * @returns Normalized code
 */
export function normalizeSessionCode(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Format session code for display (e.g., "H3K-9QF" with separator)
 * 
 * @param code - Session code
 * @param separator - Optional separator (default: no separator)
 * @returns Formatted code
 */
export function formatSessionCode(code: string, separator?: string): string {
  if (!separator || code.length !== CODE_LENGTH) {
    return code;
  }
  
  // Split into two groups of 3
  return `${code.substring(0, 3)}${separator}${code.substring(3)}`;
}

/**
 * Calculate entropy/strength of session code
 * 
 * @returns Object with entropy info
 */
export function getSessionCodeEntropy() {
  const totalCombinations = Math.pow(CODE_ALPHABET.length, CODE_LENGTH);
  const bitsOfEntropy = Math.log2(totalCombinations);
  
  return {
    alphabetSize: CODE_ALPHABET.length,
    codeLength: CODE_LENGTH,
    totalCombinations,
    bitsOfEntropy: Math.floor(bitsOfEntropy),
    description: `${CODE_ALPHABET.length}^${CODE_LENGTH} = ${totalCombinations.toLocaleString()} possible codes (~${Math.floor(bitsOfEntropy)} bits of entropy)`,
  };
}
