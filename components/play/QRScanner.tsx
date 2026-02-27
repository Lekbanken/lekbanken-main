'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircleIcon,
  XCircleIcon,
  CameraIcon,
  QrCodeIcon,
  KeyIcon,
} from '@heroicons/react/24/solid';
import type { ScanGateConfig, ScanGateState } from '@/types/puzzle-modules';

// =============================================================================
// QR Decode abstraction — native BarcodeDetector → ZXing fallback
// =============================================================================

/** Minimal decode result */
interface DecodeResult {
  rawValue: string;
}

/**
 * Creates a decode function that works across browsers.
 *  1. Try native BarcodeDetector (Chrome / Edge / Android WebView)
 *  2. Fall back to @zxing/library (Safari / Firefox / older)
 *
 * Returns `null` while the decoder is being initialised.
 */
async function createDecoder(): Promise<
  (source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap) => Promise<DecodeResult[]>
> {
  // --- Native path ---
  if (
    typeof globalThis !== 'undefined' &&
    'BarcodeDetector' in globalThis
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BD = (globalThis as any).BarcodeDetector;
    // Feature-detect supported formats before creating detector
    let supported: string[] = [];
    try {
      if (typeof BD.getSupportedFormats === 'function') {
        supported = await BD.getSupportedFormats();
      }
    } catch {
      // getSupportedFormats() threw — treat as "unknown, try anyway"
    }
    if (supported.length === 0 || supported.includes('qr_code')) {
      const detector = new BD({ formats: ['qr_code'] });
      return async (source) => {
        const barcodes = await detector.detect(source);
        return barcodes.map((b: { rawValue: string }) => ({
          rawValue: b.rawValue,
        }));
      };
    }
    // qr_code not in supported formats — fall through to ZXing
  }

  // --- ZXing fallback (lazy import so we don't ship the library when native exists) ---
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let readerPromise: Promise<import('@zxing/library').BrowserQRCodeReader> | null =
    null;

  return async (source) => {
    if (!readerPromise) {
      readerPromise = import('@zxing/library').then(
        (mod) => new mod.BrowserQRCodeReader()
      );
    }
    const reader = await readerPromise;

    // ZXing decode() accepts HTMLVideoElement and HTMLImageElement
    if (
      source instanceof HTMLVideoElement ||
      source instanceof HTMLImageElement
    ) {
      try {
        const result = reader.decode(source);
        return result ? [{ rawValue: result.getText() }] : [];
      } catch {
        // NotFoundException → no QR found in this frame
        return [];
      }
    }

    return [];
  };
}

// =============================================================================
// QR Scanner Component
// =============================================================================

export interface QRScannerProps {
  /** Configuration */
  config: ScanGateConfig;
  /** Current state (for controlled mode) */
  state?: ScanGateState;
  /** Called when verification succeeds */
  onSuccess?: (value: string, usedFallback: boolean) => void;
  /** Called when scan fails */
  onScanFail?: (error: string) => void;
  /** Called on state change */
  onChange?: (state: ScanGateState) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

/**
 * QRScanner - QR code scanning with manual fallback
 * 
 * Uses native camera API with graceful fallback to manual code entry
 */
export function QRScanner({
  config,
  state: externalState,
  onSuccess,
  onScanFail,
  onChange,
  disabled = false,
  size = 'md',
  className,
}: QRScannerProps) {
  const t = useTranslations('play.qrScanner');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const decoderRef = useRef<(
    source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap
  ) => Promise<DecodeResult[]>>(null);
  /** Dedupe: last decoded value + timestamp to avoid spamming same wrong code */
  const lastDecodedRef = useRef<{ value: string; at: number } | null>(null);
  /** Gate: true while a validate cycle is in-flight */
  const isVerifyingRef = useRef(false);

  // Internal state
  const [internalState, setInternalState] = useState<ScanGateState>({
    isVerified: false,
    usedFallback: false,
    scanAttempts: 0,
  });
  const [showCamera, setShowCamera] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackCode, setFallbackCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Use external state if provided
  const state = externalState ?? internalState;

  const updateState = useCallback((updates: Partial<ScanGateState>) => {
    const newState = { ...state, ...updates };
    if (!externalState) {
      setInternalState(newState);
    }
    onChange?.(newState);
  }, [state, externalState, onChange]);

  // Cleanup camera + scan loop on unmount
  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const validateValue = useCallback((value: string): boolean => {
    // Check against allowed values
    if (config.allowedValues.includes(value)) {
      return true;
    }
    // Check fallback code
    if (config.fallbackCode && value === config.fallbackCode) {
      return true;
    }
    return false;
  }, [config.allowedValues, config.fallbackCode]);

  const handleSuccess = useCallback((value: string, usedFallback: boolean) => {
    // Stop scan loop immediately
    scanningRef.current = false;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    updateState({
      isVerified: true,
      scannedValue: value,
      usedFallback,
      verifiedAt: new Date().toISOString(),
    });
    
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    
    onSuccess?.(value, usedFallback);
  }, [updateState, onSuccess]);

  // ===========================================================================
  // QR decode scan loop — runs frame-by-frame while camera is active
  // ===========================================================================
  const SCAN_INTERVAL_MS = 250;   // decode every 250 ms to save CPU
  const DEDUPE_WINDOW_MS = 2000;  // ignore same wrong code within 2 s

  const startScanLoop = useCallback(async () => {
    if (!decoderRef.current) {
      decoderRef.current = await createDecoder();
    }
    const decode = decoderRef.current;
    scanningRef.current = true;

    let lastScanTime = 0;

    const loop = (timestamp: number) => {
      if (!scanningRef.current) return;

      if (timestamp - lastScanTime >= SCAN_INTERVAL_MS) {
        lastScanTime = timestamp;

        // Skip if a previous validate is still in-flight
        if (isVerifyingRef.current) {
          rafIdRef.current = requestAnimationFrame(loop);
          return;
        }

        const video = videoRef.current;
        if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          decode(video)
            .then((results) => {
              if (!scanningRef.current) return;
              if (results.length === 0) return; // no QR found — silent retry

              const scannedValue = results[0].rawValue;

              // --- Dedupe: same wrong code within window → skip ---
              const now = Date.now();
              const last = lastDecodedRef.current;
              if (
                last &&
                last.value === scannedValue &&
                now - last.at < DEDUPE_WINDOW_MS
              ) {
                return; // same code recently tried, don't spam
              }

              isVerifyingRef.current = true;
              const isValid = validateValue(scannedValue);

              if (isValid) {
                scanningRef.current = false;
                handleSuccess(scannedValue, false);
              } else {
                // Record this code so we don't re-report it every 250 ms
                lastDecodedRef.current = { value: scannedValue, at: now };
                setError(t('qrNotValid'));
                updateState({ scanAttempts: state.scanAttempts + 1 });
                onScanFail?.(t('qrNotValid'));
              }
              isVerifyingRef.current = false;
            })
            .catch(() => {
              // decode failure (blurry frame, etc.) — silently retry
              isVerifyingRef.current = false;
            });
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, [validateValue, handleSuccess, updateState, state.scanAttempts, onScanFail, t]);

  const startCamera = useCallback(async () => {
    setError(null);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setShowCamera(true);

      // Start frame-by-frame QR decode loop
      await startScanLoop();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('cameraError');
      setCameraError(errorMsg);
      onScanFail?.(errorMsg);
      
      // Auto-show fallback if camera fails
      if (config.allowManualFallback !== false) {
        setShowFallback(true);
      }
    }
  }, [config.allowManualFallback, onScanFail, t, startScanLoop]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const handleFallbackSubmit = useCallback(() => {
    if (!fallbackCode.trim()) return;

    const isValid = validateValue(fallbackCode.trim().toUpperCase());
    
    if (isValid) {
      handleSuccess(fallbackCode.trim().toUpperCase(), true);
    } else {
      setError(t('invalidCode'));
      updateState({ scanAttempts: state.scanAttempts + 1 });
    }
  }, [fallbackCode, validateValue, handleSuccess, updateState, state.scanAttempts, t]);

  // Dev-only simulated scan (still useful for testing without camera)
  const handleSimulatedScan = useCallback((simulatedValue: string) => {
    const isValid = validateValue(simulatedValue);
    
    if (isValid) {
      handleSuccess(simulatedValue, false);
    } else {
      setError(t('qrNotValid'));
      updateState({ scanAttempts: state.scanAttempts + 1 });
      onScanFail?.(t('qrNotValid'));
    }
  }, [validateValue, handleSuccess, updateState, state.scanAttempts, onScanFail, t]);

  const sizeStyles = {
    sm: { icon: 'h-8 w-8', button: 'h-10', video: 'h-48' },
    md: { icon: 'h-12 w-12', button: 'h-12', video: 'h-64' },
    lg: { icon: 'h-16 w-16', button: 'h-14', video: 'h-80' },
  };

  const styles = sizeStyles[size];

  // Verified state
  if (state.isVerified) {
    return (
      <div className={cn('flex flex-col items-center gap-4 p-6', className)}>
        <CheckCircleIcon className="h-12 w-12 text-green-500" />
        <p className="text-lg font-medium text-green-500">
          {config.successMessage ?? t('verified')}
        </p>
        {state.usedFallback && (
          <p className="text-sm text-muted-foreground">
            {t('viaManualCode')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Prompt */}
      <p className="text-center text-muted-foreground">
        {config.promptText ?? t('defaultPrompt')}
      </p>

      {/* Camera view */}
      {showCamera && (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video
            ref={videoRef}
            className={cn('w-full object-cover', styles.video)}
            playsInline
            muted
          />
          
          {/* Scan overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
            <p className="mt-2 text-xs text-white/70 animate-pulse">
              {t('scanning')}
            </p>
          </div>
          
          {/* Close button */}
          <Button
            variant="outline"
            size="sm"
            onClick={stopCamera}
            className="absolute top-2 right-2"
          >
            {t('close')}
          </Button>
        </div>
      )}

      {/* Camera error */}
      {cameraError && !showCamera && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <XCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Action buttons */}
      {!showCamera && !showFallback && (
        <div className="flex flex-col gap-3">
          {config.mode !== 'nfc' && (
            <Button
              onClick={startCamera}
              disabled={disabled}
              className={cn('w-full gap-2', styles.button)}
            >
              <CameraIcon className="h-5 w-5" />
              {t('scanQrCode')}
            </Button>
          )}
          
          {config.mode === 'nfc' && (
            <Button
              onClick={() => {
                // NFC API would go here
                setError(t('nfcNotSupported'));
              }}
              disabled={disabled}
              className={cn('w-full gap-2', styles.button)}
            >
              <QrCodeIcon className="h-5 w-5" />
              {t('readNfc')}
            </Button>
          )}
          
          {config.allowManualFallback !== false && (
            <Button
              variant="outline"
              onClick={() => setShowFallback(true)}
              disabled={disabled}
              className={cn('w-full gap-2', styles.button)}
            >
              <KeyIcon className="h-5 w-5" />
              {t('enterManually')}
            </Button>
          )}
        </div>
      )}

      {/* Manual fallback input */}
      {showFallback && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              value={fallbackCode}
              onChange={(e) => {
                setFallbackCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder={t('enterCodePlaceholder')}
              disabled={disabled}
              className="flex-1 font-mono tracking-widest"
              autoComplete="off"
              autoCapitalize="characters"
            />
            <Button
              onClick={handleFallbackSubmit}
              disabled={disabled || !fallbackCode.trim()}
            >
              {t('verify')}
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowFallback(false);
              setFallbackCode('');
              setError(null);
            }}
            className="w-full"
          >
            {t('backToScanning')}
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Attempts counter */}
      {state.scanAttempts > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t('failedAttempts', { count: state.scanAttempts })}
        </p>
      )}

      {/* Dev helper - for testing without camera */}
      {process.env.NODE_ENV === 'development' && showCamera && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSimulatedScan(config.allowedValues[0] ?? 'TEST')}
          className="mt-2"
        >
          {t('devSimulateScan')}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Hook for QR Scanner State Management
// =============================================================================

export interface UseQRScannerOptions {
  config: ScanGateConfig;
  onSuccess?: (value: string, usedFallback: boolean) => void;
}

export interface UseQRScannerReturn {
  state: ScanGateState;
  reset: () => void;
}
