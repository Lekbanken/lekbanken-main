'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { usePreferences } from '@/lib/context/PreferencesContext';
import { ProfileService, type UserPreferences } from '@/lib/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { getLanguageCodeFromLocale, type Locale } from '@/lib/i18n/config';
import { useLocaleSwitcher } from '@/lib/i18n/useLocaleSwitcher';
import {
  AdjustmentsHorizontalIcon,
  LanguageIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

const themes = [
  { id: 'light', label: 'Ljust', icon: SunIcon },
  { id: 'dark', label: 'Mörkt', icon: MoonIcon },
  { id: 'system', label: 'System', icon: ComputerDesktopIcon },
];

const defaultPreferences: Partial<UserPreferences> = {
  language: 'sv',
  theme: 'system',
};

export default function PreferencesPage() {
  const t = useTranslations('app.profile');
  const locale = useLocale() as Locale;
  const { user, isLoading: authLoading } = useAuth();
  const { currentTenant, isLoadingTenants } = useTenant();
  const { theme, setTheme, setLanguage } = usePreferences();
  const { switchLocale } = useLocaleSwitcher();

  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
    ...defaultPreferences,
    language: locale,
    theme,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const profileService = useMemo(() => new ProfileService(), []);

  // Use the new single-flight hook for fetching
  // NOTE: Only primitives in deps! profileService is accessed via closure.
  const {
    data: fetchedPreferences,
    status,
    error: loadError,
    isLoading,
    isTimeout,
    retry,
  } = useProfileQuery<UserPreferences | null>(
    `preferences-${currentTenant?.id ?? 'no-tenant'}-${user?.id ?? 'no-user'}`,
    async () => {
      if (!user?.id || !currentTenant?.id) {
        throw new Error('Not ready');
      }
      return profileService.getPreferences(currentTenant.id, user.id);
    },
    { userId: user?.id, tenantId: currentTenant?.id },
    {
      skip: authLoading || !user?.id || !currentTenant?.id,
      timeout: 10000,
    }
  );

  // Update local preferences when data is fetched
  useEffect(() => {
    if (!fetchedPreferences) return
    setPreferences({
      ...defaultPreferences,
      ...fetchedPreferences,
      language: fetchedPreferences.language ?? locale,
      theme: fetchedPreferences.theme ?? theme,
    })
  }, [fetchedPreferences, locale, theme]);

  useEffect(() => {
    setPreferences((prev) => {
      if (hasChanges) return prev

      return {
        ...prev,
        language: locale,
        theme,
      }
    })
  }, [hasChanges, locale, theme])

  const stillLoading = isLoading || authLoading || isLoadingTenants;

  const handlePreferenceChange = useCallback((key: keyof UserPreferences, value: unknown) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id || !currentTenant?.id) return;

    setIsSaving(true);
    try {
      const nextTheme = preferences.theme;
      if (nextTheme && nextTheme !== theme) {
        await setTheme(nextTheme);
      }

      const nextLocale = preferences.language as Locale | undefined;
      if (nextLocale && nextLocale !== locale) {
        await setLanguage(getLanguageCodeFromLocale(nextLocale) as 'NO' | 'SE' | 'EN');
        await switchLocale(nextLocale);
      }

      setSaveSuccess(true);
      setHasChanges(false);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setSaveError(error instanceof Error ? error.message : t('sections.preferences.unexpectedError'));
    } finally {
      setIsSaving(false);
    }
  }, [currentTenant?.id, locale, preferences.language, preferences.theme, setLanguage, setTheme, switchLocale, t, theme, user?.id]);

  if (stillLoading) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
        {isTimeout && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-muted-foreground">
              {t('sections.preferences.loadingTakingLong')}
            </p>
            <div className="flex gap-2">
              <Button onClick={retry} variant="outline" size="sm">
                {t('sections.preferences.retry')}
              </Button>
              <Button onClick={() => window.location.reload()} variant="ghost" size="sm">
                {t('sections.preferences.reload')}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === 'error' || status === 'timeout') {
    return (
      <div className="space-y-4">
        <Alert variant="error" title={t('sections.preferences.loadError')}>
          <p>{loadError || t('sections.preferences.unexpectedError')}</p>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={retry} variant="outline">
            {t('sections.preferences.retry')}
          </Button>
          <Button onClick={() => window.location.reload()} variant="ghost">
            {t('sections.preferences.reload')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="h-6 w-6 text-primary" />
            {t('sections.preferences.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('sections.preferences.description')}
          </p>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('sections.preferences.saving') : t('sections.preferences.save')}
          </Button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircleIcon className="h-5 w-5" />
            <p className="font-medium">{t('sections.preferences.saved')}</p>
          </div>
        </div>
      )}

      {saveError && (
        <Alert variant="error" title={t('sections.preferences.loadError')}>
          <p>{saveError}</p>
        </Alert>
      )}

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LanguageIcon className="h-5 w-5" />
            {t('sections.preferences.language')}
          </CardTitle>
          <CardDescription>
            {t('sections.preferences.languageSection.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handlePreferenceChange('language', lang.code)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border text-left transition-colors',
                  preferences.language === lang.code
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="text-2xl" role="img" aria-label={lang.name}>
                  {lang.flag}
                </span>
                <span className={cn(
                  'font-medium',
                  preferences.language === lang.code
                    ? 'text-primary'
                    : 'text-foreground'
                )}>
                  {lang.name}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.preferences.theme')}</CardTitle>
          <CardDescription>
            {t('sections.preferences.themeSection.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {themes.map((theme) => {
              const Icon = theme.icon;
              return (
                <button
                  key={theme.id}
                  onClick={() => handlePreferenceChange('theme', theme.id)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border text-left transition-colors',
                    preferences.theme === theme.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5',
                    preferences.theme === theme.id
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'font-medium',
                    preferences.theme === theme.id
                      ? 'text-primary'
                      : 'text-foreground'
                  )}>
                    {theme.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button (sticky on mobile) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end lg:hidden">
          <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-lg">
            {isSaving ? t('sections.preferences.saving') : t('sections.preferences.save')}
          </Button>
        </div>
      )}
    </div>
  );
}
