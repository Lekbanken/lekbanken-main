'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth';
import { ProfileService, type UserPreferences } from '@/lib/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { useBrowserSupabase } from '@/hooks/useBrowserSupabase';
import { useProfileQuery } from '@/hooks/useProfileQuery';
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
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { supabase, error: supabaseError, isInitializing } = useBrowserSupabase();

  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
    ...defaultPreferences,
    language: locale,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Create stable profileService instance
  const profileService = useMemo(
    () => (supabase ? new ProfileService(supabase) : null),
    [supabase]
  );

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
    `preferences-${user?.id}`,
    async () => {
      if (!profileService || !user?.id) {
        throw new Error('Not ready');
      }
      return profileService.getPreferences(user.id);
    },
    { userId: user?.id },
    {
      skip: authLoading || isInitializing || !supabase || !user?.id,
      timeout: 10000,
    }
  );

  // Update local preferences when data is fetched
  useEffect(() => {
    if (!fetchedPreferences) return
    setPreferences({
      ...defaultPreferences,
      ...fetchedPreferences,
    })
  }, [fetchedPreferences]);

  const stillLoading = isLoading || authLoading || isInitializing;

  const handlePreferenceChange = useCallback((key: keyof UserPreferences, value: unknown) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id || !supabase) return;

    setIsSaving(true);
    try {
      const profileService = new ProfileService(supabase);
      await profileService.updatePreferences(user.id, preferences);

      // If language changed, update the route
      if (preferences.language !== locale) {
        // This would trigger a locale change - handled by next-intl
        router.refresh();
      }

      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, supabase, preferences, locale, router]);

  if (!authLoading && supabaseError) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Alert variant="error" title={t('sections.preferences.loadError')}>
          <p>{t('sections.preferences.initError')}</p>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs text-foreground">
              {supabaseError.message}
            </pre>
          )}
        </Alert>
        <Button onClick={() => window.location.reload()} variant="outline">
          {t('sections.preferences.reload')}
        </Button>
      </div>
    );
  }

  if (stillLoading) {
    return (
      <div className="p-6 lg:p-8">
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
      <div className="p-6 lg:p-8 space-y-4">
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
    <div className="p-6 lg:p-8 space-y-8">
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
