/**
 * MFA Challenge Hook
 * Handles MFA verification flow including TOTP, recovery codes, and device trust
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { MFAChallengeState } from '@/types/mfa';

export interface UseMFAChallengeOptions {
  factorId?: string;
  onSuccess?: (data: { trustToken?: string }) => void;
  onError?: (error: string) => void;
}

export interface UseMFAChallengeReturn {
  // State
  isLoading: boolean;
  error: string | null;
  challenge: MFAChallengeState | null;
  remainingAttempts: number | null;
  
  // Actions
  createChallenge: (factorId: string) => Promise<boolean>;
  verifyCode: (code: string, options?: { trustDevice?: boolean; deviceName?: string }) => Promise<boolean>;
  verifyRecoveryCode: (code: string) => Promise<{ success: boolean; remaining: number }>;
  reset: () => void;
  
  // Device fingerprint
  deviceFingerprint: string | null;
}

const MAX_ATTEMPTS = 5;

/**
 * Generate a simple device fingerprint
 * In production, consider using a library like FingerprintJS
 */
function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0,
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function useMFAChallenge(options: UseMFAChallengeOptions = {}): UseMFAChallengeReturn {
  const { factorId: initialFactorId, onSuccess, onError } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<MFAChallengeState | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(MAX_ATTEMPTS);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  
  // Store current factor ID
  const currentFactorId = useRef<string | undefined>(initialFactorId);
  
  // Generate device fingerprint on mount
  useEffect(() => {
    const fp = generateDeviceFingerprint();
    setDeviceFingerprint(fp);
  }, []);
  
  /**
   * Create a new MFA challenge
   */
  const createChallenge = useCallback(async (factorId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    currentFactorId.current = factorId;
    
    try {
      const response = await fetch('/api/accounts/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factor_id: factorId }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        if (response.status === 429) {
          setError('För många försök. Vänta en stund innan du försöker igen.');
          setRemainingAttempts(0);
          onError?.('rate_limited');
          return false;
        }
        
        throw new Error(data.error || 'Kunde inte skapa verifieringsutmaning');
      }
      
      const data = await response.json();
      setChallenge({
        factor_id: factorId,
        challenge_id: data.challenge_id,
        expires_at: data.expires_at,
      });
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ett fel uppstod';
      setError(message);
      onError?.(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);
  
  /**
   * Verify TOTP code
   */
  const verifyCode = useCallback(async (
    code: string,
    verifyOptions?: { trustDevice?: boolean; deviceName?: string }
  ): Promise<boolean> => {
    if (!challenge) {
      setError('Ingen aktiv verifieringsutmaning. Försök igen.');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/accounts/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factor_id: challenge.factor_id,
          challenge_id: challenge.challenge_id,
          code,
          trust_device: verifyOptions?.trustDevice,
          device_fingerprint: verifyOptions?.trustDevice ? deviceFingerprint : undefined,
          device_name: verifyOptions?.deviceName,
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        if (response.status === 429) {
          setError('För många misslyckade försök. Vänta en stund.');
          setRemainingAttempts(0);
          onError?.('rate_limited');
          return false;
        }
        
        // Decrement remaining attempts
        setRemainingAttempts(prev => prev !== null ? Math.max(0, prev - 1) : null);
        throw new Error(data.error || 'Ogiltig kod');
      }
      
      const data = await response.json();
      
      // Success!
      setChallenge(null);
      setRemainingAttempts(MAX_ATTEMPTS);
      onSuccess?.({ trustToken: data.trust_token });
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verifiering misslyckades';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [challenge, deviceFingerprint, onSuccess, onError]);
  
  /**
   * Verify recovery code
   */
  const verifyRecoveryCode = useCallback(async (
    code: string
  ): Promise<{ success: boolean; remaining: number }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/accounts/auth/mfa/recovery-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || 'Ogiltig återställningskod');
      }
      
      const data = await response.json();
      
      // Success!
      setChallenge(null);
      onSuccess?.({});
      
      return { success: true, remaining: data.codes_remaining };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verifiering misslyckades';
      setError(message);
      return { success: false, remaining: -1 };
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);
  
  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setChallenge(null);
    setRemainingAttempts(MAX_ATTEMPTS);
  }, []);
  
  return {
    isLoading,
    error,
    challenge,
    remainingAttempts,
    createChallenge,
    verifyCode,
    verifyRecoveryCode,
    reset,
    deviceFingerprint,
  };
}
