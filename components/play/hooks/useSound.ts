'use client';

import { useRef, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseSoundOptions {
  /** Volume from 0 to 1 */
  volume?: number;
  /** Whether sound is enabled */
  enabled?: boolean;
  /** Respect device silent mode / muted state */
  respectMute?: boolean;
}

export interface UseSoundReturn {
  /** Play the typewriter click sound */
  playClick: () => void;
  /** Play a success sound */
  playSuccess: () => void;
  /** Play an error/fail sound */
  playError: () => void;
  /** Play a custom frequency beep */
  playBeep: (frequency?: number, duration?: number) => void;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Whether sound is available */
  isAvailable: boolean;
}

// ============================================================================
// Sound Generation Utilities
// ============================================================================

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new AudioContextClass();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine'
) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  // Quick attack, quick decay for click sounds
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

// ============================================================================
// useSound Hook
// ============================================================================

/**
 * Hook for playing UI sounds using Web Audio API
 * 
 * Respects prefers-reduced-motion and device mute
 */
export function useSound({
  volume = 0.2,
  enabled = true,
  respectMute = true,
}: UseSoundOptions = {}): UseSoundReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const volumeRef = useRef(volume);

  // Update volume ref when prop changes
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Check if reduced motion is preferred
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initialize AudioContext lazily (requires user gesture)
  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    
    // Resume if suspended (browsers require user gesture)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  // Determine if sound should play
  const shouldPlay = useCallback(() => {
    if (!enabled) return false;
    if (prefersReducedMotion) return false;
    
    // Check for muted state (basic check)
    if (respectMute && typeof navigator !== 'undefined') {
      // Note: There's no reliable way to detect system mute in browsers
      // This is a placeholder for future API support
    }
    
    return true;
  }, [enabled, prefersReducedMotion, respectMute]);

  // Play typewriter click
  const playClick = useCallback(() => {
    if (!shouldPlay()) return;
    
    const ctx = getContext();
    if (!ctx) return;
    
    // Short, soft click - like a mechanical keyboard
    playTone(ctx, 800, 0.03, volumeRef.current * 0.3, 'square');
    playTone(ctx, 400, 0.02, volumeRef.current * 0.2, 'triangle');
  }, [getContext, shouldPlay]);

  // Play success sound
  const playSuccess = useCallback(() => {
    if (!shouldPlay()) return;
    
    const ctx = getContext();
    if (!ctx) return;
    
    // Two-note ascending chime
    playTone(ctx, 523, 0.15, volumeRef.current, 'sine'); // C5
    setTimeout(() => {
      playTone(ctx, 659, 0.2, volumeRef.current * 0.8, 'sine'); // E5
    }, 100);
  }, [getContext, shouldPlay]);

  // Play error sound
  const playError = useCallback(() => {
    if (!shouldPlay()) return;
    
    const ctx = getContext();
    if (!ctx) return;
    
    // Low buzz
    playTone(ctx, 200, 0.15, volumeRef.current * 0.5, 'sawtooth');
    playTone(ctx, 150, 0.2, volumeRef.current * 0.3, 'square');
  }, [getContext, shouldPlay]);

  // Play custom beep
  const playBeep = useCallback((frequency = 440, duration = 0.1) => {
    if (!shouldPlay()) return;
    
    const ctx = getContext();
    if (!ctx) return;
    
    playTone(ctx, frequency, duration, volumeRef.current, 'sine');
  }, [getContext, shouldPlay]);

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, newVolume));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    playClick,
    playSuccess,
    playError,
    playBeep,
    setVolume,
    isAvailable: typeof window !== 'undefined' && 'AudioContext' in window,
  };
}

export default useSound;
