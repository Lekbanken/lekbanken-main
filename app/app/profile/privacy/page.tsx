'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { ProfileService, type GDPRRequest, type UserConsent } from '@/lib/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { useBrowserSupabase } from '@/hooks/useBrowserSupabase';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import {
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface PrivacyData {
  gdprRequests: GDPRRequest[];
  consents: UserConsent[];
  partialFailure?: boolean;
}

export default function PrivacySettingsPage() {
  const t = useTranslations('app.profile');
  const { user, isLoading: authLoading } = useAuth();
  const { supabase, error: supabaseError, isInitializing } = useBrowserSupabase();

  // Stabil queryKey
  const queryKey = `privacy-${user?.id ?? 'anon'}`;
  
  // Använd useProfileQuery med Promise.allSettled för partial data
  const {
    data: privacyData,
    isLoading,
    status,
    error: queryError,
    retry,
  } = useProfileQuery<PrivacyData>(
    queryKey,
    async () => {
      if (!supabase || !user?.id) {
        throw new Error('Missing supabase or user');
      }
      
      const profileService = new ProfileService(supabase);
      
      // Promise.allSettled för att hantera partiella fel
      const results = await Promise.allSettled([
        profileService.getGDPRRequests(user.id),
        profileService.getUserConsents(user.id),
      ]);
      
      const gdprRequests = results[0].status === 'fulfilled' ? results[0].value : [];
      const consents = results[1].status === 'fulfilled' ? results[1].value : [];
      
      // Kasta om båda failade
      if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        throw results[0].reason;
      }
      
      return {
        gdprRequests,
        consents,
        partialFailure: results.some(r => r.status === 'rejected'),
      };
    },
    { userId: user?.id, supabaseRef: supabase ? 1 : 0 },
    {
      timeout: 12000,
      skip: authLoading || !supabase || !user?.id,
    }
  );

  // Local state för mutations (inte fetching)
  const [gdprRequests, setGdprRequests] = useState<GDPRRequest[]>([]);
  const [consents, setConsents] = useState<UserConsent[]>([]);
  
  // Synka data från query till local state för mutations
  if (privacyData && status === 'success') {
    if (gdprRequests !== privacyData.gdprRequests) {
      setGdprRequests(privacyData.gdprRequests);
    }
    if (consents !== privacyData.consents) {
      setConsents(privacyData.consents);
    }
  }

  // Export request state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isRequestingExport, setIsRequestingExport] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Manuell useEffect borttagen - använder useProfileQuery istället

  const handleDataExportRequest = useCallback(async () => {
    if (!user?.id || !supabase) return;

    setIsRequestingExport(true);
    try {
      const profileService = new ProfileService(supabase);
      await profileService.submitGDPRRequest({
        user_id: user.id,
        request_type: 'portability',
      });

      setExportSuccess(true);
      setShowExportDialog(false);

      // Refresh requests
      const requests = await profileService.getGDPRRequests(user.id);
      setGdprRequests(requests);
    } catch (error) {
      console.error('Failed to request data export:', error);
    } finally {
      setIsRequestingExport(false);
    }
  }, [user?.id, supabase]);

  const handleDeleteAccountRequest = useCallback(async () => {
    if (!user?.id || !supabase) return;
    if (deleteConfirmation !== 'RADERA MITT KONTO') {
      setDeleteError(t('sections.privacy.validationError', { confirmText: t('sections.privacy.deleteAccountSection.confirmText') }));
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const profileService = new ProfileService(supabase);
      await profileService.submitGDPRRequest({
        user_id: user.id,
        request_type: 'erasure',
        reason: deleteReason || undefined,
      });

      // Refresh requests
      const requests = await profileService.getGDPRRequests(user.id);
      setGdprRequests(requests);

      setShowDeleteDialog(false);
      setDeleteReason('');
      setDeleteConfirmation('');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t('common.errorGeneric'));
    } finally {
      setIsDeleting(false);
    }
  }, [user?.id, supabase, deleteConfirmation, deleteReason, t]);

  const handleConsentChange = useCallback(async (consentType: string, granted: boolean) => {
    if (!user?.id || !supabase) return;

    try {
      const profileService = new ProfileService(supabase);
      await profileService.updateConsent(user.id, consentType, granted, 'user_profile_settings');

      // Refresh consents
      const updatedConsents = await profileService.getUserConsents(user.id);
      setConsents(updatedConsents);
    } catch (error) {
      console.error('Failed to update consent:', error);
    }
  }, [user?.id, supabase]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive'; labelKey: string }> = {
      pending: { variant: 'warning', labelKey: 'pending' },
      processing: { variant: 'default', labelKey: 'processing' },
      completed: { variant: 'success', labelKey: 'completed' },
      cancelled: { variant: 'destructive', labelKey: 'cancelled' },
    };

    const config = statusConfig[status] || { variant: 'default', labelKey: status };
    const label = statusConfig[status] ? t(`sections.privacy.requestStatus.${config.labelKey}`) : status;
    return <Badge variant={config.variant}>{label}</Badge>;
  };

  const pendingDeletionRequest = gdprRequests.find(
    (r) => r.request_type === 'erasure' && r.status === 'pending'
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheckIcon className="h-6 w-6 text-primary" />
          {t('sections.privacy.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('sections.privacy.description')}
        </p>
      </div>

      {!authLoading && supabaseError && (
        <Alert variant="error" title="Kunde inte ladda integritetsinställningar">
          <div className="space-y-3">
            <p>Det gick inte att initiera anslutningen till databasen.</p>
            {process.env.NODE_ENV !== 'production' && (
              <pre className="whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs text-foreground">
                {supabaseError.message}
              </pre>
            )}
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              Ladda om
            </Button>
          </div>
        </Alert>
      )}

      {/* Query error/timeout */}
      {(status === 'error' || status === 'timeout') && (
        <Alert variant="error" title={status === 'timeout' ? 'Anslutningen tog för lång tid' : 'Kunde inte ladda data'}>
          <div className="space-y-3">
            <p>{queryError || 'Ett oväntat fel uppstod.'}</p>
            <Button onClick={retry} variant="outline" size="sm">
              Försök igen
            </Button>
          </div>
        </Alert>
      )}

      {/* Partial failure warning */}
      {privacyData?.partialFailure && (
        <Alert variant="warning" title="Delvis fel">
          <p>Vissa data kunde inte laddas. Informationen nedan kan vara ofullständig.</p>
        </Alert>
      )}

      {!authLoading && !supabaseError && isInitializing && (
        <Alert variant="info" title="Laddar…">
          <p>Initierar anslutning.</p>
        </Alert>
      )}

      {/* GDPR Info Banner */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">
              {t('sections.privacy.gdprRights.title')}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {t('sections.privacy.gdprRights.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentArrowDownIcon className="h-5 w-5" />
            {t('sections.privacy.dataExport')}
          </CardTitle>
          <CardDescription>
            {t('sections.privacy.dataExportSection.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exportSuccess && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircleIcon className="h-5 w-5" />
                <p className="font-medium">{t('sections.privacy.dataExportSection.success')}</p>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-300 mt-1">
                {t('sections.privacy.dataExportSection.successDescription')}
              </p>
            </div>
          )}

          {!showExportDialog ? (
            <Button onClick={() => setShowExportDialog(true)}>
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {t('sections.privacy.dataExportSection.button')}
            </Button>
          ) : (
            <div className="p-4 rounded-lg border border-border space-y-4">
              <p className="text-sm text-foreground">
                {t('sections.privacy.dataExportSection.contents.title')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>{t('sections.privacy.dataExportSection.contents.profile')}</li>
                <li>{t('sections.privacy.dataExportSection.contents.settings')}</li>
                <li>{t('sections.privacy.dataExportSection.contents.activity')}</li>
                <li>{t('sections.privacy.dataExportSection.contents.gameData')}</li>
                <li>{t('sections.privacy.dataExportSection.contents.organizations')}</li>
              </ul>

              <div className="flex gap-2">
                <Button
                  onClick={handleDataExportRequest}
                  disabled={isRequestingExport}
                >
                  {isRequestingExport ? t('sections.privacy.dataExportSection.requesting') : t('sections.privacy.dataExportSection.confirm')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowExportDialog(false)}
                >
                  {t('sections.privacy.dataExportSection.cancel')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.privacy.consents.title')}</CardTitle>
          <CardDescription>
            {t('sections.privacy.consents.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">{t('sections.privacy.consents.loading')}</p>
          ) : (
            <div className="space-y-4">
              {/* Marketing consent */}
              <div className="flex items-start justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">{t('sections.privacy.consents.marketing')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('sections.privacy.consents.marketingDesc')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const current = consents.find((c) => c.consent_type === 'marketing');
                    handleConsentChange('marketing', !current?.granted);
                  }}
                >
                  {consents.find((c) => c.consent_type === 'marketing')?.granted
                    ? t('sections.privacy.consents.revoke')
                    : t('sections.privacy.consents.grant')}
                </Button>
              </div>

              {/* Analytics consent */}
              <div className="flex items-start justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">{t('sections.privacy.consents.analytics')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('sections.privacy.consents.analyticsDesc')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const current = consents.find((c) => c.consent_type === 'analytics');
                    handleConsentChange('analytics', !current?.granted);
                  }}
                >
                  {consents.find((c) => c.consent_type === 'analytics')?.granted
                    ? t('sections.privacy.consents.revoke')
                    : t('sections.privacy.consents.grant')}
                </Button>
              </div>

              {/* Functional consent (third-party integrations) */}
              <div className="flex items-start justify-between p-4 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">{t('sections.privacy.consents.functional')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('sections.privacy.consents.functionalDesc')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const current = consents.find((c) => c.consent_type === 'functional');
                    handleConsentChange('functional', !current?.granted);
                  }}
                >
                  {consents.find((c) => c.consent_type === 'functional')?.granted
                    ? t('sections.privacy.consents.revoke')
                    : t('sections.privacy.consents.grant')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GDPR Request History */}
      {gdprRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              {t('sections.privacy.requestHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gdprRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {request.request_type === 'portability' ? t('sections.privacy.requestTypes.portability') : request.request_type === 'erasure' ? t('sections.privacy.requestTypes.erasure') : request.request_type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString('sv-SE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Account Section */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TrashIcon className="h-5 w-5" />
            {t('sections.privacy.deleteAccount')}
          </CardTitle>
          <CardDescription>
            {t('sections.privacy.deleteWarning')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingDeletionRequest && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {t('sections.privacy.deleteAccountSection.pendingRequest')}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t('sections.privacy.deleteAccountSection.pendingDescription', { date: new Date(pendingDeletionRequest.created_at).toLocaleDateString('sv-SE') })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!showDeleteDialog && !pendingDeletionRequest && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {t('sections.privacy.deleteAccountSection.button')}
            </Button>
          )}

          {showDeleteDialog && (
            <div className="p-4 rounded-lg border border-destructive/50 space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10">
                <p className="font-medium text-destructive">
                  {t('sections.privacy.deleteAccountSection.warning')}
                </p>
                <ul className="text-sm text-destructive/80 mt-2 space-y-1 ml-4 list-disc">
                  <li>{t('sections.privacy.deleteAccountSection.consequences.data')}</li>
                  <li>{t('sections.privacy.deleteAccountSection.consequences.progress')}</li>
                  <li>{t('sections.privacy.deleteAccountSection.consequences.organizations')}</li>
                  <li>{t('sections.privacy.deleteAccountSection.consequences.subscriptions')}</li>
                </ul>
              </div>

              <div>
                <label htmlFor="deleteReason" className="block text-sm font-medium text-foreground mb-1.5">
                  {t('sections.privacy.deleteAccountSection.reasonLabel')}
                </label>
                <Textarea
                  id="deleteReason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder={t('sections.privacy.deleteAccountSection.reasonPlaceholder')}
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="deleteConfirmation" className="block text-sm font-medium text-foreground mb-1.5">
                  {t('sections.privacy.deleteAccountSection.confirmLabel', { confirmText: '' })}<span className="font-bold">{t('sections.privacy.deleteAccountSection.confirmText')}</span>
                </label>
                <input
                  id="deleteConfirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border bg-background text-foreground',
                    deleteConfirmation === t('sections.privacy.deleteAccountSection.confirmText')
                      ? 'border-destructive'
                      : 'border-border'
                  )}
                  placeholder={t('sections.privacy.deleteAccountSection.confirmText')}
                />
              </div>

              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccountRequest}
                  disabled={isDeleting || deleteConfirmation !== t('sections.privacy.deleteAccountSection.confirmText')}
                >
                  {isDeleting ? t('sections.privacy.deleteAccountSection.confirming') : t('sections.privacy.deleteAccountSection.confirmButton')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteReason('');
                    setDeleteConfirmation('');
                    setDeleteError(null);
                  }}
                >
                  {t('sections.privacy.deleteAccountSection.cancel')}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {t('sections.privacy.deleteAccountSection.gracePeriod')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
