/**
 * Security Settings Client Component
 * Handles interactive MFA management
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheckIcon, 
  ShieldExclamationIcon,
  DevicePhoneMobileIcon,
  KeyIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type { MFAStatus, MFATrustedDevice } from '@/types/mfa';
import { MFAEnrollmentModal } from './MFAEnrollmentModal';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { profileCacheKeys } from '@/lib/profile/cacheKeys';

type MfaStatusApiResponse = MFAStatus & {
  // Raw Supabase factors returned from /api/accounts/auth/mfa/status
  totp?: Array<{ id: string; status?: string } | null> | null
  phone?: Array<{ id: string; status?: string } | null> | null
}

interface SecuritySettingsClientProps {
  hasMFA: boolean;
  factorId?: string;
  userId?: string;
  userEmail?: string;
}

export function SecuritySettingsClient({ 
  hasMFA: initialHasMFA, 
  factorId: initialFactorId,
  userId,
  userEmail,
}: SecuritySettingsClientProps) {
  const t = useTranslations('auth.mfa.settings');
  const [hasMFA, setHasMFA] = useState(initialHasMFA);
  const [factorId, setFactorId] = useState(initialFactorId);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [trustedDevices, setTrustedDevices] = useState<MFATrustedDevice[]>([]);
  const [isDisabling, setIsDisabling] = useState(false);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusFetchKey = useMemo(() => userId ? profileCacheKeys.mfaStatus(userId) : 'mfa-status-anon', [userId])
  const devicesFetchKey = useMemo(() => userId ? profileCacheKeys.mfaTrustedDevices(userId) : 'mfa-devices-anon', [userId])

  const {
    data: mfaData,
    error: mfaFetchError,
    isLoading: isLoadingMfa,
    retry: retryMfa,
  } = useProfileQuery<{ status: MFAStatus; factorId?: string }>(
    statusFetchKey,
    async (signal) => {
      const statusRes = await fetch('/api/accounts/auth/mfa/status', { credentials: 'include', signal })

      if (!statusRes.ok) {
        const body = await statusRes.text().catch(() => '')
        throw new Error(body || `Failed to load MFA status (${statusRes.status})`)
      }

      // Normalize the response to the UI shape (the endpoint returns more fields).
      const statusJson = (await statusRes.json()) as Partial<MfaStatusApiResponse>
      const status: MFAStatus = {
        is_enabled: Boolean(statusJson.is_enabled),
        is_required: Boolean(statusJson.is_required),
        required_reason: statusJson.required_reason ?? null,
        enrolled_at: statusJson.enrolled_at ?? null,
        last_verified_at: statusJson.last_verified_at ?? null,
        recovery_codes_remaining: Number(statusJson.recovery_codes_remaining ?? 0),
        trusted_devices_count: Number(statusJson.trusted_devices_count ?? 0),
        grace_period_end: statusJson.grace_period_end ?? null,
        days_until_required: statusJson.days_until_required ?? null,
        factors: {
          totp: Array.isArray(statusJson.totp),
          sms: Array.isArray(statusJson.phone),
          webauthn: false,
        },
      }

      const verifiedTotp = Array.isArray(statusJson.totp)
        ? statusJson.totp.find((f) => f && f.status === 'verified') ?? statusJson.totp.find(Boolean)
        : null
      const verifiedPhone = Array.isArray(statusJson.phone)
        ? statusJson.phone.find((f) => f && f.status === 'verified') ?? statusJson.phone.find(Boolean)
        : null

      const factorIdFromApi =
        (verifiedTotp && typeof verifiedTotp === 'object' ? verifiedTotp.id : undefined) ??
        (verifiedPhone && typeof verifiedPhone === 'object' ? verifiedPhone.id : undefined)

      return { status, factorId: factorIdFromApi }
    },
    { userId },
    { timeout: 12000, skip: !userId }
  )

  const {
    data: devicesData,
    error: devicesError,
    isLoading: isLoadingDevices,
    retry: retryDevices,
  } = useProfileQuery<{ devices: MFATrustedDevice[] }>(
    devicesFetchKey,
    async (signal) => {
      const devicesRes = await fetch('/api/accounts/auth/mfa/devices', { credentials: 'include', signal })

      if (!devicesRes.ok) {
        const body = await devicesRes.text().catch(() => '')
        throw new Error(body || `Failed to load trusted devices (${devicesRes.status})`)
      }

      const devicesJson = (await devicesRes.json()) as { devices?: MFATrustedDevice[] }
      return { devices: devicesJson.devices || [] }
    },
    { userId },
    { timeout: 12000, skip: !userId }
  )

  useEffect(() => {
    if (!mfaData) return
    setMfaStatus(mfaData.status)
    setHasMFA(Boolean(mfaData.status?.is_enabled))
    if (mfaData.factorId) setFactorId(mfaData.factorId)
  }, [mfaData])

  useEffect(() => {
    if (!devicesData) return
    setTrustedDevices(devicesData.devices)
  }, [devicesData])

  useEffect(() => {
    if (!mfaFetchError) return
    setError(mfaFetchError)
  }, [mfaFetchError])

  // Disable MFA
  const handleDisableMFA = useCallback(async () => {
    if (!factorId) return;
    
    const confirmed = window.confirm(
      'Är du säker på att du vill inaktivera tvåfaktorsautentisering? ' +
      'Detta gör ditt konto mindre säkert.'
    );
    
    if (!confirmed) return;
    
    setIsDisabling(true);
    setError(null);
    
    try {
      const res = await fetch('/api/accounts/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factor_id: factorId }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kunde inte inaktivera MFA');
      }
      
      setHasMFA(false);
      setFactorId(undefined);
      setMfaStatus(null);
      setSuccess('Tvåfaktorsautentisering har inaktiverats');
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsDisabling(false);
    }
  }, [factorId]);

  // Revoke trusted device
  const handleRevokeDevice = useCallback(async (deviceId: string) => {
    const confirmed = window.confirm(
      'Är du säker på att du vill ta bort denna enhet? ' +
      'Du behöver verifiera med MFA nästa gång du loggar in från den.'
    );
    
    if (!confirmed) return;
    
    try {
      const res = await fetch(`/api/accounts/auth/mfa/devices/${deviceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Kunde inte ta bort enheten');
      }
      
      setTrustedDevices(prev => prev.filter(d => d.id !== deviceId));
      setSuccess('Enheten har tagits bort');
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    }
  }, []);

  // Handle enrollment success
  const handleEnrollmentSuccess = useCallback(() => {
    setShowEnrollment(false);
    retryMfa();
    retryDevices();
    setSuccess('Tvåfaktorsautentisering har aktiverats!');
    setTimeout(() => setSuccess(null), 5000);
  }, [retryMfa, retryDevices]);

  // Generate new recovery codes
  const handleGenerateRecoveryCodes = useCallback(async () => {
    const confirmed = window.confirm(
      'Vill du generera nya återställningskoder? ' +
      'Dina nuvarande koder kommer att sluta fungera.'
    );
    
    if (!confirmed) return;
    
    try {
      const res = await fetch('/api/accounts/auth/mfa/recovery-codes', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Kunde inte generera nya koder');
      }
      
      const data = await res.json();
      
      // Show codes in a modal or download them
      const codesText = data.codes.join('\n');
      const blob = new Blob([codesText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lekbanken-recovery-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
      
      setSuccess('Nya återställningskoder har genererats och laddats ner');
      retryMfa();
      retryDevices();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    }
  }, [retryMfa, retryDevices]);

  return (
    <div className="space-y-8">
      {/* Success message */}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
          {success}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* MFA Status Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${hasMFA ? 'bg-green-100' : 'bg-amber-100'}`}>
            {hasMFA ? (
              <ShieldCheckIcon className="h-6 w-6 text-green-600" />
            ) : (
              <ShieldExclamationIcon className="h-6 w-6 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              {t('title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasMFA 
                ? t('enabledDescription')
                : t('disabledDescription')
              }
            </p>
            
            {hasMFA && mfaStatus && (
              <div className="mt-3 text-sm text-muted-foreground">
                <p>Aktiverat: {new Date(mfaStatus.enrolled_at!).toLocaleDateString('sv-SE')}</p>
                {mfaStatus.last_verified_at && (
                  <p>Senast verifierat: {new Date(mfaStatus.last_verified_at).toLocaleDateString('sv-SE')}</p>
                )}
              </div>
            )}
          </div>
          <div>
            {hasMFA ? (
              <Button
                variant="destructive"
                onClick={handleDisableMFA}
                loading={isDisabling}
                loadingText="Inaktiverar..."
              >
                Inaktivera
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => setShowEnrollment(true)}
              >
                Aktivera
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Recovery Codes - only show if MFA is enabled */}
      {hasMFA && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <KeyIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {t('recoveryCodes')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('recoveryCodesDescription')}
              </p>
              
              {mfaStatus && (
                <div className="mt-3 text-sm">
                  <span className={mfaStatus.recovery_codes_remaining <= 3 ? 'text-amber-600' : 'text-muted-foreground'}>
                    {t('codesRemaining', { count: mfaStatus.recovery_codes_remaining })}
                  </span>
                </div>
              )}
            </div>
            <div>
              <Button
                variant="outline"
                onClick={handleGenerateRecoveryCodes}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Generera nya
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Trusted Devices - only show if MFA is enabled */}
      {hasMFA && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <DevicePhoneMobileIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t('trustedDevices')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('trustedDevicesDescription')}
              </p>
            </div>
          </div>
          
          {isLoadingDevices ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('loading')}
            </div>
          ) : devicesError ? (
            <div className="py-6 space-y-3">
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                {devicesError}
              </div>
              <Button variant="outline" onClick={retryDevices}>
                Försök igen
              </Button>
            </div>
          ) : trustedDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noTrustedDevices')}
            </div>
          ) : (
            <div className="space-y-3">
              {trustedDevices.map(device => (
                <div 
                  key={device.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <DevicePhoneMobileIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {device.device_name || t('unknownDevice')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {device.browser} {t('on')} {device.os} • 
                        {t('lastUsed')}: {device.last_used_at 
                          ? new Date(device.last_used_at).toLocaleDateString('sv-SE')
                          : t('never')
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeDevice(device.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MFA Enrollment Modal */}
      {showEnrollment && (
        <MFAEnrollmentModal
          open={showEnrollment}
          onClose={() => setShowEnrollment(false)}
          onSuccess={handleEnrollmentSuccess}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
