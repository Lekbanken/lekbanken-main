/**
 * Participant Token Generator
 * 
 * Generates simple random tokens for anonymous participants to rejoin sessions.
 * Tokens are validated against the database, no JWT complexity needed.
 * Supports 24h expiry (default) and no-expiry tokens (quota-limited).
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type Participant = Database['public']['Tables']['participants']['Row'];

/**
 * Generate a unique participant token
 * 
 * Uses crypto.randomUUID() for cryptographically secure tokens.
 * Format: UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * 
 * @returns string - Unique token
 */
export function generateParticipantToken(): string {
  return crypto.randomUUID();
}

/**
 * Calculate token expiry timestamp
 * 
 * @param expiryHours - Hours until expiry (null = no expiry)
 * @returns Date | null - Expiry timestamp or null for no expiry
 */
export function calculateTokenExpiry(expiryHours: number | null): Date | null {
  if (expiryHours === null) {
    return null; // No expiry
  }
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);
  return expiresAt;
}

/**
 * Verify participant token against database
 * 
 * @param token - Token to verify
 * @returns Promise<Participant | null> - Participant if valid, null otherwise
 */
export async function verifyParticipantToken(
  token: string
): Promise<Participant | null> {
  const supabase = await createServiceRoleClient();
  
  // Look up participant by token
  const { data: participant, error } = await supabase
    .from('participants')
    .select('*')
    .eq('participant_token', token)
    .single();
  
  if (error || !participant) {
    return null; // Token not found
  }
  
  // Check if participant is blocked or kicked
  if (participant.status === 'blocked' || participant.status === 'kicked') {
    return null; // Not allowed to rejoin
  }
  
  // Check token expiry
  if (participant.token_expires_at) {
    const expiresAt = new Date(participant.token_expires_at);
    if (expiresAt < new Date()) {
      return null; // Token expired
    }
  }
  
  return participant;
}

/**
 * Check if token is expired
 * 
 * @param token - Token to check
 * @returns Promise<boolean> - True if expired or invalid
 */
export async function isTokenExpired(token: string): Promise<boolean> {
  const participant = await verifyParticipantToken(token);
  return participant === null;
}

/**
 * Update participant's last_seen timestamp
 * 
 * Call this on each request to track activity
 * 
 * @param token - Participant token
 */
export async function updateParticipantActivity(token: string): Promise<void> {
  const supabase = await createServiceRoleClient();
  
  await supabase
    .from('participants')
    .update({ 
      last_seen_at: new Date().toISOString(),
      status: 'active'
    })
    .eq('participant_token', token);
}

/**
 * Extend token expiry (refresh)
 * 
 * @param token - Existing token
 * @param expiryHours - New expiry hours
 * @returns Promise<boolean> - True if extended successfully
 */
export async function extendTokenExpiry(
  token: string,
  expiryHours: number
): Promise<boolean> {
  const supabase = await createServiceRoleClient();
  
  const newExpiry = calculateTokenExpiry(expiryHours);
  
  const { error } = await supabase
    .from('participants')
    .update({ token_expires_at: newExpiry?.toISOString() })
    .eq('participant_token', token);
  
  return !error;
}

/**
 * Revoke token (prevent rejoining)
 * 
 * @param token - Token to revoke
 * @returns Promise<boolean> - True if revoked successfully
 */
export async function revokeParticipantToken(token: string): Promise<boolean> {
  const supabase = await createServiceRoleClient();
  
  const { error } = await supabase
    .from('participants')
    .update({ 
      status: 'kicked',
      disconnected_at: new Date().toISOString()
    })
    .eq('participant_token', token);
  
  return !error;
}
