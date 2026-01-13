/**
 * MFA Enrollment Modal
 * Guides users through MFA setup with QR code and verification
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { MFACodeInput } from '@/components/auth/MFACodeInput';
import { 
  XMarkIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface MFAEnrollmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail?: string;
}

type EnrollmentStep = 'start' | 'scan' | 'verify' | 'recovery' | 'complete';

interface EnrollmentData {
  factor_id: string;
  qr_code: string;
  secret: string;
  recovery_codes?: string[];
}

export function MFAEnrollmentModal({
  open,
  onClose,
  onSuccess,
  userEmail: _userEmail,
}: MFAEnrollmentModalProps) {
  const t = useTranslations('auth.mfa.enroll');
  const [step, setStep] = useState<EnrollmentStep>('start');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Start enrollment - get QR code
  const startEnrollment = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/accounts/auth/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendly_name: 'Authenticator App' }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kunde inte starta registrering');
      }
      
      const data = await res.json();
      setEnrollmentData({
        factor_id: data.factor_id,
        qr_code: data.qr_code,
        secret: data.secret,
      });
      setStep('scan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify TOTP code
  const verifyCode = useCallback(async (code: string) => {
    if (!enrollmentData) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First create a challenge
      const challengeRes = await fetch('/api/accounts/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factor_id: enrollmentData.factor_id }),
        credentials: 'include',
      });
      
      if (!challengeRes.ok) {
        throw new Error('Kunde inte skapa verifieringsutmaning');
      }
      
      const challengeData = await challengeRes.json();
      
      // Then verify
      const verifyRes = await fetch('/api/accounts/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factor_id: enrollmentData.factor_id,
          challenge_id: challengeData.challenge_id,
          code,
        }),
        credentials: 'include',
      });
      
      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Ogiltig kod');
      }
      
      // Generate recovery codes
      const recoveryRes = await fetch('/api/accounts/auth/mfa/recovery-codes', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (recoveryRes.ok) {
        const recoveryData = await recoveryRes.json();
        setRecoveryCodes(recoveryData.recovery_codes || []);
      }
      
      setStep('recovery');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifiering misslyckades');
    } finally {
      setIsLoading(false);
    }
  }, [enrollmentData]);

  // Copy secret to clipboard
  const copySecret = useCallback(async () => {
    if (!enrollmentData?.secret) return;
    
    try {
      await navigator.clipboard.writeText(enrollmentData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = enrollmentData.secret;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  }, [enrollmentData?.secret]);

  // Copy recovery codes to clipboard
  const copyRecoveryCodes = useCallback(async () => {
    const codesText = recoveryCodes.join('\n');
    
    try {
      await navigator.clipboard.writeText(codesText);
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = codesText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  }, [recoveryCodes]);

  // Download recovery codes
  const downloadRecoveryCodes = useCallback(() => {
    const codesText = recoveryCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lekbanken-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [recoveryCodes]);

  // Complete enrollment
  const completeEnrollment = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('start');
      setEnrollmentData(null);
      setRecoveryCodes([]);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={step === 'start' ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {t('title')}
          </h2>
          {step === 'start' && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {/* Step: Start */}
          {step === 'start' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheckIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  {t('protectAccount')}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('description')}
                </p>
              </div>
              <div className="text-left bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium text-foreground">{t('youNeed')}</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>{t('needAuthenticator')}</li>
                  <li>{t('needPhone')}</li>
                </ul>
              </div>
              <Button
                onClick={startEnrollment}
                loading={isLoading}
                loadingText={t('preparing')}
                className="w-full"
              >
                {t('start')}
              </Button>
            </div>
          )}
          
          {/* Step: Scan QR */}
          {step === 'scan' && enrollmentData && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-foreground">
                  {t('scanQrTitle')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('scanQrDescription')}
                </p>
              </div>
              
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={enrollmentData.qr_code} 
                  alt="MFA QR Code"
                  className="w-48 h-48"
                />
              </div>
              
              {/* Manual entry */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  {t('showSecret')}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="px-3 py-2 bg-muted rounded font-mono text-sm select-all">
                    {enrollmentData.secret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="p-2 text-muted-foreground hover:text-foreground"
                    title="Kopiera"
                  >
                    {copiedSecret ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <DocumentDuplicateIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              
              <Button
                onClick={() => setStep('verify')}
                className="w-full"
              >
                {t('scanned')}
              </Button>
            </div>
          )}
          
          {/* Step: Verify */}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-foreground">
                  {t('verifyTitle')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('verifyDescription')}
                </p>
              </div>
              
              <MFACodeInput
                onComplete={verifyCode}
                disabled={isLoading}
                error={Boolean(error)}
                autoFocus
              />
              
              {isLoading && (
                <p className="text-center text-sm text-muted-foreground">
                  {t('verifying')}
                </p>
              )}
              
              <Button
                variant="ghost"
                onClick={() => setStep('scan')}
                disabled={isLoading}
                className="w-full"
              >
                {t('back')}
              </Button>
            </div>
          )}
          
          {/* Step: Recovery Codes */}
          {step === 'recovery' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-foreground">
                  {t('recoveryCodes.title')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('recoveryCodes.description')}
                </p>
              </div>
              
              {/* Recovery codes grid */}
              <div className="bg-muted rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {recoveryCodes.map((code, index) => (
                    <div key={index} className="px-2 py-1 bg-background rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={copyRecoveryCodes}
                  className="flex-1"
                >
                  {copiedCodes ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      {t('recoveryCodes.copied')}
                    </>
                  ) : (
                    <>
                      <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                      {t('recoveryCodes.copy')}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadRecoveryCodes}
                  className="flex-1"
                >
                  {t('recoveryCodes.download')}
                </Button>
              </div>
              
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 inline mr-2" />
                {t('recoveryCodes.warning')}
              </div>
              
              <Button
                onClick={completeEnrollment}
                className="w-full"
              >
                {t('recoveryCodes.continue')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
