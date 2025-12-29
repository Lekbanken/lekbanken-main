/**
 * useSignalCapabilities Hook
 * 
 * Detects available signal capabilities on the current device.
 * Used for testing signals in lobby and executing them during play.
 * 
 * Task 4.1 - Session Cockpit Architecture
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type SignalCapabilityStatus = 
  | 'unknown'      // Not yet tested
  | 'available'    // Confirmed working
  | 'unavailable'  // API not supported
  | 'denied'       // Permission denied
  | 'error';       // Error during test

export interface SignalCapability {
  type: 'torch' | 'audio' | 'vibration' | 'screen_flash' | 'notification';
  status: SignalCapabilityStatus;
  /** Human-readable label */
  label: string;
  /** Why it's unavailable (if applicable) */
  reason?: string;
  /** Last tested timestamp */
  testedAt?: Date;
}

export interface SignalCapabilities {
  torch: SignalCapability;
  audio: SignalCapability;
  vibration: SignalCapability;
  screenFlash: SignalCapability;
  notification: SignalCapability;
}

export interface UseSignalCapabilitiesOptions {
  /** Auto-detect on mount (default: true) */
  autoDetect?: boolean;
  /** iOS audio gate - require user gesture before audio works */
  requireAudioGate?: boolean;
}

export interface UseSignalCapabilitiesReturn {
  /** All capabilities */
  capabilities: SignalCapabilities;
  /** Are all capabilities tested? */
  allTested: boolean;
  /** Number of available capabilities */
  availableCount: number;
  /** Is currently testing? */
  isTesting: boolean;
  
  // Test functions
  /** Test all capabilities */
  testAll: () => Promise<void>;
  /** Test a specific capability */
  testCapability: (type: SignalCapability['type']) => Promise<SignalCapabilityStatus>;
  
  // Execution functions
  /** Flash the screen */
  flashScreen: (color?: string, durationMs?: number) => Promise<boolean>;
  /** Play a sound */
  playSound: (url?: string) => Promise<boolean>;
  /** Vibrate the device */
  vibrate: (pattern?: number[]) => Promise<boolean>;
  /** Flash the torch (if available) */
  flashTorch: (durationMs?: number) => Promise<boolean>;
  /** Send a notification */
  sendNotification: (title: string, body?: string) => Promise<boolean>;
  
  /** Activate iOS audio gate (user must tap) */
  activateAudioGate: () => Promise<boolean>;
  /** Is audio gate activated? */
  audioGateActive: boolean;
}

// =============================================================================
// Default Capabilities
// =============================================================================

const createDefaultCapability = (
  type: SignalCapability['type'],
  label: string
): SignalCapability => ({
  type,
  label,
  status: 'unknown',
});

const DEFAULT_CAPABILITIES: SignalCapabilities = {
  torch: createDefaultCapability('torch', 'Ficklampa'),
  audio: createDefaultCapability('audio', 'Ljud'),
  vibration: createDefaultCapability('vibration', 'Vibration'),
  screenFlash: createDefaultCapability('screen_flash', 'Skärmblänk'),
  notification: createDefaultCapability('notification', 'Notifikation'),
};

// =============================================================================
// Utility: Check if we're in a browser
// =============================================================================

const isBrowser = typeof window !== 'undefined';

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSignalCapabilities(
  options: UseSignalCapabilitiesOptions = {}
): UseSignalCapabilitiesReturn {
  const { autoDetect = true, requireAudioGate = true } = options;
  
  const [capabilities, setCapabilities] = useState<SignalCapabilities>(DEFAULT_CAPABILITIES);
  const [isTesting, setIsTesting] = useState(false);
  const [audioGateActive, setAudioGateActive] = useState(false);
  
  // Audio context for iOS gate
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  // ===========================================================================
  // Capability Detection
  // ===========================================================================
  
  const detectVibration = useCallback(async (): Promise<SignalCapabilityStatus> => {
    if (!isBrowser) return 'unavailable';
    
    if ('vibrate' in navigator) {
      try {
        // Test with a very short vibration
        const result = navigator.vibrate(1);
        return result ? 'available' : 'unavailable';
      } catch {
        return 'error';
      }
    }
    return 'unavailable';
  }, []);
  
  const detectTorch = useCallback(async (): Promise<SignalCapabilityStatus> => {
    if (!isBrowser) return 'unavailable';
    
    // Check for ImageCapture API (torch control)
    if (!('ImageCapture' in window)) {
      return 'unavailable';
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
      
      // Clean up
      track.stop();
      
      if (capabilities?.torch) {
        return 'available';
      }
      return 'unavailable';
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        return 'denied';
      }
      return 'error';
    }
  }, []);
  
  const detectAudio = useCallback(async (): Promise<SignalCapabilityStatus> => {
    if (!isBrowser) return 'unavailable';
    
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      return 'available';
    }
    return 'unavailable';
  }, []);
  
  const detectScreenFlash = useCallback(async (): Promise<SignalCapabilityStatus> => {
    // Screen flash is always available in browsers via CSS
    if (!isBrowser) return 'unavailable';
    return 'available';
  }, []);
  
  const detectNotification = useCallback(async (): Promise<SignalCapabilityStatus> => {
    if (!isBrowser) return 'unavailable';
    
    if (!('Notification' in window)) {
      return 'unavailable';
    }
    
    const permission = Notification.permission;
    if (permission === 'granted') {
      return 'available';
    } else if (permission === 'denied') {
      return 'denied';
    }
    
    // Need to request permission
    try {
      const result = await Notification.requestPermission();
      return result === 'granted' ? 'available' : 'denied';
    } catch {
      return 'error';
    }
  }, []);
  
  // ===========================================================================
  // Test Functions
  // ===========================================================================
  
  const testCapability = useCallback(async (
    type: SignalCapability['type']
  ): Promise<SignalCapabilityStatus> => {
    let status: SignalCapabilityStatus = 'unknown';
    
    switch (type) {
      case 'vibration':
        status = await detectVibration();
        break;
      case 'torch':
        status = await detectTorch();
        break;
      case 'audio':
        status = await detectAudio();
        break;
      case 'screen_flash':
        status = await detectScreenFlash();
        break;
      case 'notification':
        status = await detectNotification();
        break;
    }
    
    setCapabilities((prev) => ({
      ...prev,
      [type === 'screen_flash' ? 'screenFlash' : type]: {
        ...prev[type === 'screen_flash' ? 'screenFlash' : type],
        status,
        testedAt: new Date(),
      },
    }));
    
    return status;
  }, [detectVibration, detectTorch, detectAudio, detectScreenFlash, detectNotification]);
  
  const testAll = useCallback(async () => {
    setIsTesting(true);
    
    try {
      await Promise.all([
        testCapability('vibration'),
        testCapability('torch'),
        testCapability('audio'),
        testCapability('screen_flash'),
        testCapability('notification'),
      ]);
    } finally {
      setIsTesting(false);
    }
  }, [testCapability]);
  
  // ===========================================================================
  // Execution Functions
  // ===========================================================================
  
  const flashScreen = useCallback(async (
    color = '#ffffff',
    durationMs = 200
  ): Promise<boolean> => {
    if (!isBrowser) return false;
    
    try {
      // Create flash overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: ${color};
        z-index: 999999;
        pointer-events: none;
        opacity: 1;
        transition: opacity ${durationMs / 2}ms ease-out;
      `;
      document.body.appendChild(overlay);
      
      // Fade out and remove
      await new Promise((resolve) => setTimeout(resolve, durationMs / 2));
      overlay.style.opacity = '0';
      await new Promise((resolve) => setTimeout(resolve, durationMs / 2));
      overlay.remove();
      
      return true;
    } catch {
      return false;
    }
  }, []);
  
  const playSound = useCallback(async (url?: string): Promise<boolean> => {
    if (!isBrowser) return false;
    
    try {
      // Use AudioContext for better iOS support
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      
      if (!audioContext && requireAudioGate && !audioGateActive) {
        // Need user gesture first on iOS
        return false;
      }
      
      const ctx = audioContext || new AudioContextClass();
      if (!audioContext) {
        setAudioContext(ctx);
      }
      
      if (url) {
        // Fetch and play audio file
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
      } else {
        // Play a simple beep
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 880; // A5
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      }
      
      return true;
    } catch {
      return false;
    }
  }, [audioContext, audioGateActive, requireAudioGate]);
  
  const vibrate = useCallback(async (pattern?: number[]): Promise<boolean> => {
    if (!isBrowser || !('vibrate' in navigator)) return false;
    
    try {
      return navigator.vibrate(pattern || [200]);
    } catch {
      return false;
    }
  }, []);
  
  const flashTorch = useCallback(async (durationMs = 500): Promise<boolean> => {
    if (!isBrowser || !('ImageCapture' in window)) return false;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      
      const track = stream.getVideoTracks()[0];
      
      // Turn on torch
      await track.applyConstraints({
        // @ts-expect-error - torch is not in standard types
        advanced: [{ torch: true }],
      });
      
      // Wait and turn off
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      
      await track.applyConstraints({
        // @ts-expect-error - torch is not in standard types
        advanced: [{ torch: false }],
      });
      
      track.stop();
      return true;
    } catch {
      return false;
    }
  }, []);
  
  const sendNotification = useCallback(async (
    title: string,
    body?: string
  ): Promise<boolean> => {
    if (!isBrowser || !('Notification' in window)) return false;
    
    try {
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;
      }
      
      new Notification(title, { body });
      return true;
    } catch {
      return false;
    }
  }, []);
  
  const activateAudioGate = useCallback(async (): Promise<boolean> => {
    if (!isBrowser) return false;
    
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      // Play a silent buffer to unlock audio
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      
      // Resume if suspended (iOS requirement)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      setAudioContext(ctx);
      setAudioGateActive(true);
      return true;
    } catch {
      return false;
    }
  }, []);
  
  // ===========================================================================
  // Computed Values
  // ===========================================================================
  
  const allTested = useMemo(() => {
    return Object.values(capabilities).every((c) => c.status !== 'unknown');
  }, [capabilities]);
  
  const availableCount = useMemo(() => {
    return Object.values(capabilities).filter((c) => c.status === 'available').length;
  }, [capabilities]);
  
  // ===========================================================================
  // Auto-detect on mount
  // ===========================================================================
  
  useEffect(() => {
    if (autoDetect && isBrowser) {
      // Run detection after a short delay to avoid blocking render
      const timer = setTimeout(() => {
        testAll();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [autoDetect, testAll]);
  
  // ===========================================================================
  // Return
  // ===========================================================================
  
  return {
    capabilities,
    allTested,
    availableCount,
    isTesting,
    testAll,
    testCapability,
    flashScreen,
    playSound,
    vibrate,
    flashTorch,
    sendNotification,
    activateAudioGate,
    audioGateActive,
  };
}
