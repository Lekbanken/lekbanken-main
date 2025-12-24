'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseKeypadOptions {
  /** The correct code */
  correctCode: string;
  /** Code length (for display) */
  codeLength: number;
  /** Maximum attempts (undefined = unlimited) */
  maxAttempts?: number;
  /** Cooldown after wrong attempt in ms */
  cooldownMs?: number;
  /** Callback on successful unlock */
  onSuccess?: () => void;
  /** Callback on wrong code */
  onWrongCode?: (attemptsRemaining?: number) => void;
  /** Callback when max attempts reached */
  onLockout?: () => void;
  /** Enable haptic feedback */
  hapticEnabled?: boolean;
}

export interface UseKeypadReturn {
  /** Current input value */
  currentInput: string;
  /** Number of attempts used */
  attemptsUsed: number;
  /** Remaining attempts (undefined if unlimited) */
  attemptsRemaining: number | undefined;
  /** Whether keypad is locked (max attempts or cooldown) */
  isLocked: boolean;
  /** Whether code was successfully entered */
  isUnlocked: boolean;
  /** Whether wrong code animation should play */
  isShaking: boolean;
  /** Whether in cooldown period */
  isInCooldown: boolean;
  /** Cooldown seconds remaining */
  cooldownRemaining: number;
  /** Add a digit/character to input */
  addDigit: (digit: string) => void;
  /** Remove last digit */
  removeDigit: () => void;
  /** Submit current code */
  submit: () => boolean;
  /** Clear current input */
  clear: () => void;
  /** Reset entire keypad state */
  reset: () => void;
}

/**
 * Hook for keypad input logic with validation and attempt tracking
 */
export function useKeypad({
  correctCode,
  codeLength,
  maxAttempts,
  cooldownMs = 2000,
  onSuccess,
  onWrongCode,
  onLockout,
  hapticEnabled = true,
}: UseKeypadOptions): UseKeypadReturn {
  const [currentInput, setCurrentInput] = useState('');
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const shakeRef = useRef<NodeJS.Timeout | null>(null);

  const attemptsRemaining = maxAttempts !== undefined 
    ? Math.max(0, maxAttempts - attemptsUsed) 
    : undefined;
  
  const isInCooldown = cooldownRemaining > 0;
  const isLocked = isUnlocked || (maxAttempts !== undefined && attemptsUsed >= maxAttempts) || isInCooldown;

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 20, 30],
    };
    
    try {
      navigator.vibrate(patterns[type]);
    } catch {
      // Vibration not supported
    }
  }, [hapticEnabled]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const addDigit = useCallback((digit: string) => {
    if (isLocked) return;
    if (currentInput.length >= codeLength) return;
    
    triggerHaptic('light');
    setCurrentInput((prev) => prev + digit);
  }, [isLocked, currentInput.length, codeLength, triggerHaptic]);

  const removeDigit = useCallback(() => {
    if (isLocked) return;
    
    triggerHaptic('light');
    setCurrentInput((prev) => prev.slice(0, -1));
  }, [isLocked, triggerHaptic]);

  const clear = useCallback(() => {
    setCurrentInput('');
  }, []);

  const submit = useCallback((): boolean => {
    if (isLocked) return false;
    if (currentInput.length === 0) return false;

    const isCorrect = currentInput === correctCode;

    if (isCorrect) {
      setIsUnlocked(true);
      triggerHaptic('heavy');
      onSuccess?.();
      return true;
    }

    // Wrong code
    setAttemptsUsed((prev) => prev + 1);
    setIsShaking(true);
    triggerHaptic('medium');
    
    // Clear shake after animation
    if (shakeRef.current) clearTimeout(shakeRef.current);
    shakeRef.current = setTimeout(() => {
      setIsShaking(false);
      setCurrentInput('');
    }, 500);

    // Start cooldown
    if (cooldownMs > 0) {
      setCooldownRemaining(Math.ceil(cooldownMs / 1000));
    }

    const newAttemptsRemaining = maxAttempts !== undefined 
      ? maxAttempts - (attemptsUsed + 1) 
      : undefined;

    if (newAttemptsRemaining === 0) {
      onLockout?.();
    } else {
      onWrongCode?.(newAttemptsRemaining);
    }

    return false;
  }, [
    isLocked,
    currentInput,
    correctCode,
    attemptsUsed,
    maxAttempts,
    cooldownMs,
    triggerHaptic,
    onSuccess,
    onWrongCode,
    onLockout,
  ]);

  const reset = useCallback(() => {
    setCurrentInput('');
    setAttemptsUsed(0);
    setIsUnlocked(false);
    setIsShaking(false);
    setCooldownRemaining(0);
    
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    if (shakeRef.current) clearTimeout(shakeRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const cooldownTimer = cooldownRef.current;
    const shakeTimer = shakeRef.current;
    return () => {
      if (cooldownTimer) clearTimeout(cooldownTimer);
      if (shakeTimer) clearTimeout(shakeTimer);
    };
  }, []);

  return {
    currentInput,
    attemptsUsed,
    attemptsRemaining,
    isLocked,
    isUnlocked,
    isShaking,
    isInCooldown,
    cooldownRemaining,
    addDigit,
    removeDigit,
    submit,
    clear,
    reset,
  };
}
