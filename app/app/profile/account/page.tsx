'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AtSymbolIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export default function AccountSettingsPage() {
  const t = useTranslations('app.profile');
  const { user } = useAuth();

  // Email change state
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccessEmail, setEmailSuccessEmail] = useState<string | null>(null);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const email = user?.email || '';
  const emailVerified = !!user?.email_confirmed_at;

  // Password validation
  const passwordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    match: newPassword === confirmPassword && newPassword.length > 0,
  };

  const allPasswordChecksPass = Object.values(passwordChecks).every(Boolean);

  const resetPasswordForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setPasswordError(null);
  }, []);

  const handleEmailChange = useCallback(async () => {
    if (!newEmail || !emailPassword) return;

    setIsChangingEmail(true);
    setEmailError(null);
    setEmailSuccessEmail(null);

    try {
      const submittedEmail = newEmail;

      const res = await fetch('/api/accounts/auth/email/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_email: submittedEmail,
          password: emailPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('common.errorGeneric'));
      }

      setEmailSuccessEmail(submittedEmail);
      setShowEmailChange(false);
      setNewEmail('');
      setEmailPassword('');
      setTimeout(() => setEmailSuccessEmail(null), 5000);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t('common.errorGeneric'));
    } finally {
      setIsChangingEmail(false);
    }
  }, [newEmail, emailPassword, t]);

  const handlePasswordChange = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      setPasswordError(t('sections.account.passwordMismatch'));
      return;
    }

    if (!allPasswordChecksPass) {
      setPasswordError(t('sections.account.passwordRequirements.notMet'));
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      // Verify current password + update in a single server call
      const res = await fetch('/api/accounts/auth/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('common.errorGeneric'));
      }

      setPasswordSuccess(true);
      setShowPasswordChange(false);
      resetPasswordForm();

      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('common.errorGeneric'));
    } finally {
      setIsChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, allPasswordChecksPass, resetPasswordForm, t]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <AtSymbolIcon className="h-6 w-6 text-primary" />
          {t('sections.account.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('sections.account.description')}
        </p>
      </div>

      {/* Email Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AtSymbolIcon className="h-5 w-5" />
            {t('sections.account.email')}
          </CardTitle>
          <CardDescription>
            {t('sections.account.emailHint')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium text-foreground">{email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {emailVerified ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircleIcon className="h-3 w-3" />
                      {t('sections.account.verified')}
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1">
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      {t('sections.account.notVerified')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailChange(!showEmailChange);
                setEmailError(null);
                setEmailSuccessEmail(null);
              }}
            >
              {t('sections.account.changeEmail')}
            </Button>
          </div>

          {emailSuccessEmail && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircleIcon className="h-5 w-5" />
                <p className="font-medium">{t('sections.account.emailChangeSuccess', { email: emailSuccessEmail })}</p>
              </div>
            </div>
          )}

          {/* Email Change Form */}
          {showEmailChange && (
            <div className="p-4 rounded-lg border border-border space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-foreground mb-1.5">
                  {t('sections.account.newEmail')}
                </label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t('sections.account.newEmailPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="emailPassword" className="block text-sm font-medium text-foreground mb-1.5">
                  {t('sections.account.confirmWithPassword')}
                </label>
                <Input
                  id="emailPassword"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder={t('sections.account.currentPasswordPlaceholder')}
                />
              </div>

              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleEmailChange}
                  disabled={isChangingEmail || !newEmail || !emailPassword}
                >
                  {isChangingEmail ? t('sections.account.changing') : t('sections.account.changeEmail')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowEmailChange(false);
                    setNewEmail('');
                    setEmailPassword('');
                    setEmailError(null);
                    setEmailSuccessEmail(null);
                  }}
                >
                  {t('sections.account.cancel')}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {t('sections.account.emailChangeHint')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5" />
            {t('sections.account.password')}
          </CardTitle>
          <CardDescription>
            {t('sections.account.passwordRequirements.title')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="font-medium text-foreground">{t('sections.account.password')}</p>
              <p className="text-sm text-muted-foreground">
                ••••••••••••
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const nextOpen = !showPasswordChange;
                setShowPasswordChange(nextOpen);
                resetPasswordForm();
                if (nextOpen) {
                  setPasswordSuccess(false);
                }
              }}
            >
              {t('sections.account.changePassword')}
            </Button>
          </div>

          {passwordSuccess && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircleIcon className="h-5 w-5" />
                <p className="font-medium">{t('sections.account.passwordChanged')}</p>
              </div>
            </div>
          )}

          {/* Password Change Form */}
          {showPasswordChange && (
            <div className="p-4 rounded-lg border border-border space-y-4">
              {/* Current Password */}
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground mb-1.5">
                  {t('sections.account.currentPassword')}
                </label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('sections.account.currentPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-1.5">
                  {t('sections.account.newPassword')}
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('sections.account.newPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Requirements */}
                <div className="mt-2 space-y-1">
                  {[
                    { key: 'length', labelKey: 'minLength' },
                    { key: 'uppercase', labelKey: 'uppercase' },
                    { key: 'lowercase', labelKey: 'lowercase' },
                    { key: 'number', labelKey: 'number' },
                  ].map(({ key, labelKey }) => (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center gap-2 text-xs',
                        passwordChecks[key as keyof typeof passwordChecks]
                          ? 'text-emerald-600'
                          : 'text-muted-foreground'
                      )}
                    >
                      <CheckCircleIcon className={cn(
                        'h-3.5 w-3.5',
                        passwordChecks[key as keyof typeof passwordChecks]
                          ? 'text-emerald-500'
                          : 'text-muted-foreground/50'
                      )} />
                      {t(`sections.account.passwordRequirements.${labelKey}`)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                  {t('sections.account.confirmPassword')}
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('sections.account.confirmPasswordPlaceholder')}
                />
                {confirmPassword && !passwordChecks.match && (
                  <p className="text-xs text-destructive mt-1">{t('sections.account.passwordMismatch')}</p>
                )}
              </div>

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword || !allPasswordChecksPass || !currentPassword}
                >
                  {isChangingPassword ? t('sections.account.changing') : t('sections.account.changePassword')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordChange(false);
                    resetPasswordForm();
                    setPasswordSuccess(false);
                  }}
                >
                  {t('sections.account.cancel')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.account.accountInfo.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('sections.account.accountInfo.createdAt')}</p>
              <p className="font-medium text-foreground">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('sv-SE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('sections.account.accountInfo.lastLogin')}</p>
              <p className="font-medium text-foreground">
                {user?.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString('sv-SE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GDPR / Privacy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-primary" />
            <CardTitle>{t('sections.privacy.gdprRights.title')}</CardTitle>
          </div>
          <CardDescription>{t('sections.privacy.gdprRights.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">{t('sections.privacy.gdprRights.title')}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>{t('sections.privacy.gdprRights.access')}</li>
              <li>{t('sections.privacy.gdprRights.rectification')}</li>
              <li>{t('sections.privacy.gdprRights.erasure')}</li>
              <li>{t('sections.privacy.gdprRights.portability')}</li>
              <li>{t('sections.privacy.gdprRights.restriction')}</li>
              <li>{t('sections.privacy.gdprRights.objection')}</li>
            </ul>
          </div>

          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <EnvelopeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="font-medium">{t('sections.privacy.contact.title')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('sections.privacy.contact.description')}
              </p>
              <a
                href="mailto:privacy@lekbanken.se"
                className="text-sm text-primary hover:underline"
              >
                privacy@lekbanken.se
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
