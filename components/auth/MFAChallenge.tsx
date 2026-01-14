/**
 * MFA Challenge Component
 * Main component for MFA verification flow
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MFACodeInput } from './MFACodeInput';
import { MFARecoveryInput } from './MFARecoveryInput';
import { TrustDeviceCheckbox } from './TrustDeviceCheckbox';
import { useMFAChallenge } from '@/hooks/useMFAChallenge';
import { 
  ShieldCheckIcon, 
  KeyIcon, 
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

type MFAMode = 'totp' | 'recovery';

interface MFAChallengeProps {
  /** Factor ID from Supabase Auth */
  factorId: string;
  /** Redirect URL after successful verification */
  redirectUrl?: string;
  /** Whether to show trust device option */
  showTrustDevice?: boolean;
  /** Number of days device will be trusted */
  trustDays?: number;
  /** Callback on successful verification */
  onSuccess?: () => void;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Custom class name */
  className?: string;
}

export function MFAChallenge({
  factorId,
  redirectUrl = '/app',
  showTrustDevice = true,
  trustDays = 30,
  onSuccess,
  onCancel,
  className,
}: MFAChallengeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth.mfa.challenge');
  
  const [mode, setMode] = useState<MFAMode>('totp');
  const [trustDevice, setTrustDevice] = useState(false);
  const [deviceName, setDeviceName] = useState<string>();
  const [isVerified, setIsVerified] = useState(false);
  const [recoveryCodesRemaining, setRecoveryCodesRemaining] = useState<number | null>(null);
  
  const {
    isLoading,
    error,
    challenge,
    remainingAttempts,
    createChallenge,
    verifyCode,
    verifyRecoveryCode,
    reset,
    deviceFingerprint,
  } = useMFAChallenge({
    factorId,
    onSuccess: (data) => {
      setIsVerified(true);
      
      // Store trust token and device fingerprint in cookies if provided
      // Middleware reads from cookies to verify trusted device
      if (data.trustToken) {
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const expires = new Date();
        expires.setDate(expires.getDate() + trustDays);
        const cookieOptions = `Path=/; Expires=${expires.toUTCString()}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        
        // Set trust token cookie
        document.cookie = `mfa_trust_token=${data.trustToken}; ${cookieOptions}`;
        
        // Also store the device fingerprint so middleware can match it
        if (deviceFingerprint) {
          document.cookie = `mfa_device_fp=${deviceFingerprint}; ${cookieOptions}`;
        }
      }
      
      // Call success callback
      onSuccess?.();
      
      // Redirect after short delay
      setTimeout(() => {
        const redirect = searchParams.get('redirect') || redirectUrl;
        router.push(redirect);
        router.refresh();
      }, 1500);
    },
  });

  // Create challenge on mount
  useEffect(() => {
    if (factorId && !challenge) {
      createChallenge(factorId);
    }
  }, [factorId, challenge, createChallenge]);

  // Handle TOTP code verification
  const handleTOTPComplete = useCallback(async (code: string) => {
    await verifyCode(code, {
      trustDevice,
      deviceName,
    });
  }, [verifyCode, trustDevice, deviceName]);

  // Handle recovery code verification
  const handleRecoverySubmit = useCallback(async (code: string) => {
    const result = await verifyRecoveryCode(code);
    if (result.success) {
      setRecoveryCodesRemaining(result.remaining);
      setIsVerified(true);
      
      onSuccess?.();
      
      setTimeout(() => {
        const redirect = searchParams.get('redirect') || redirectUrl;
        router.push(redirect);
        router.refresh();
      }, 1500);
    }
  }, [verifyRecoveryCode, onSuccess, searchParams, redirectUrl, router]);

  // Handle trust device change
  const handleTrustChange = useCallback((checked: boolean, name?: string) => {
    setTrustDevice(checked);
    setDeviceName(name);
  }, []);

  // Handle mode switch
  const handleModeSwitch = useCallback(() => {
    reset();
    setMode(mode === 'totp' ? 'recovery' : 'totp');
  }, [mode, reset]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/auth/signout');
    }
  }, [onCancel, router]);

  // Success state
  if (isVerified) {
    return (
      <div className={cn('text-center space-y-4', className)}>
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircleIcon className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {t('verificationSuccess')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('redirecting')}
        </p>
        {recoveryCodesRemaining !== null && recoveryCodesRemaining <= 3 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <ExclamationTriangleIcon className="h-4 w-4 inline mr-2" />
            {t('lowRecoveryCodes', { count: recoveryCodesRemaining })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {mode === 'totp' ? (
            <ShieldCheckIcon className="h-6 w-6 text-primary" />
          ) : (
            <KeyIcon className="h-6 w-6 text-primary" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {mode === 'totp' ? t('title') : t('recoveryTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === 'totp' 
            ? t('description')
            : t('recoveryDescription')
          }
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{error}</p>
            {remainingAttempts !== null && remainingAttempts > 0 && (
              <p className="mt-1 text-xs">
                {t('attemptsRemaining', { count: remainingAttempts })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* TOTP Mode */}
      {mode === 'totp' && (
        <div className="space-y-6">
          <MFACodeInput
            onComplete={handleTOTPComplete}
            disabled={isLoading || remainingAttempts === 0}
            error={Boolean(error)}
            autoFocus
          />
          
          {showTrustDevice && (
            <TrustDeviceCheckbox
              checked={trustDevice}
              onChange={handleTrustChange}
              trustDays={trustDays}
              editableName
              disabled={isLoading}
            />
          )}

          <div className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleModeSwitch}
              disabled={isLoading}
              className="w-full text-sm"
            >
              <KeyIcon className="h-4 w-4 mr-2" />
              {t('useRecoveryCode')}
            </Button>
          </div>
        </div>
      )}

      {/* Recovery Mode */}
      {mode === 'recovery' && (
        <div className="space-y-4">
          <MFARecoveryInput
            onSubmit={handleRecoverySubmit}
            isLoading={isLoading}
            error={error}
            disabled={remainingAttempts === 0}
          />

          <Button
            type="button"
            variant="ghost"
            onClick={handleModeSwitch}
            disabled={isLoading}
            className="w-full text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tillbaka till autentiseringskod
          </Button>
        </div>
      )}

      {/* Cancel */}
      <div className="pt-4 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          disabled={isLoading}
          className="w-full text-muted-foreground text-sm"
        >
          Avbryt och logga ut
        </Button>
      </div>
    </div>
  );
}
