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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('cameraError');
      setCameraError(errorMsg);
      onScanFail?.(errorMsg);
      
      // Auto-show fallback if camera fails
      if (config.allowManualFallback !== false) {
        setShowFallback(true);
      }
    }
  }, [config.allowManualFallback, onScanFail, t]);

  const stopCamera = useCallback(() => {
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

  // Note: Real QR scanning requires a library like @zxing/library
  // This is a placeholder that shows the UI structure
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
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
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
