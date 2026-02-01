'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth';
import { ProfileService, type UserPreferences } from '@/lib/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
  EyeIcon,
  SpeakerWaveIcon,
  ClockIcon,
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

const timezones = [
  { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)' },
  { value: 'Europe/Oslo', label: 'Oslo (CET/CEST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Helsinki', label: 'Helsingfors (EET/EEST)' },
  { value: 'UTC', label: 'UTC' },
];

const fontSizes = [
  { id: 'small', label: 'Liten', size: '14px' },
  { id: 'medium', label: 'Normal', size: '16px' },
  { id: 'large', label: 'Stor', size: '18px' },
  { id: 'extra-large', label: 'Extra stor', size: '20px' },
];

const defaultPreferences: Partial<UserPreferences> = {
  language: 'sv',
  theme: 'system',
  timezone: 'Europe/Stockholm',
  date_format: 'YYYY-MM-DD',
  time_format: '24h',
  text_size: 'medium',
  reduce_motion: false,
  high_contrast: false,
  animations_enabled: true,
  compact_mode: false,
  screen_reader_mode: false,
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

      {/* Timezone & Date/Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            {t('sections.preferences.dateTime.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.preferences.dateTime.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timezone */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-foreground mb-2">
              {t('sections.preferences.timezone')}
            </label>
            <select
              id="timezone"
              value={preferences.timezone}
              onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tidsformat
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { id: '24h', label: '24-timmar', example: '14:30' },
                { id: '12h', label: '12-timmar', example: '2:30 PM' },
              ].map((format) => (
                <button
                  key={format.id}
                  onClick={() => handlePreferenceChange('time_format', format.id)}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border text-left transition-colors',
                    preferences.time_format === format.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className={cn(
                    'font-medium',
                    preferences.time_format === format.id
                      ? 'text-primary'
                      : 'text-foreground'
                  )}>
                    {format.label}
                  </span>
                  <span className="text-sm text-muted-foreground">{format.example}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Datumformat
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: 'YYYY-MM-DD', example: '2024-01-15' },
                { id: 'DD/MM/YYYY', example: '15/01/2024' },
                { id: 'MM/DD/YYYY', example: '01/15/2024' },
              ].map((format) => (
                <button
                  key={format.id}
                  onClick={() => handlePreferenceChange('date_format', format.id)}
                  className={cn(
                    'p-4 rounded-lg border text-center transition-colors',
                    preferences.date_format === format.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className={cn(
                    'font-medium',
                    preferences.date_format === format.id
                      ? 'text-primary'
                      : 'text-foreground'
                  )}>
                    {format.example}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeIcon className="h-5 w-5" />
            {t('sections.preferences.accessibility')}
          </CardTitle>
          <CardDescription>
            {t('sections.preferences.accessibilitySection.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('sections.preferences.fontSize')}
            </label>
            <div className="grid gap-2 sm:grid-cols-4">
              {fontSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => handlePreferenceChange('text_size', size.id)}
                  className={cn(
                    'p-3 rounded-lg border text-center transition-colors',
                    preferences.text_size === size.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span
                    className={cn(
                      'font-medium',
                      preferences.text_size === size.id
                        ? 'text-primary'
                        : 'text-foreground'
                    )}
                    style={{ fontSize: size.size }}
                  >
                    {size.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">{t('sections.preferences.reducedMotion')}</p>
              <p className="text-sm text-muted-foreground">
                {t('sections.preferences.accessibilitySection.reduceMotionDesc')}
              </p>
            </div>
            <Switch
              checked={preferences.reduce_motion ?? false}
              onCheckedChange={(checked) => handlePreferenceChange('reduce_motion', checked)}
            />
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">{t('sections.preferences.highContrast')}</p>
              <p className="text-sm text-muted-foreground">
                {t('sections.preferences.accessibilitySection.highContrastDesc')}
              </p>
            </div>
            <Switch
              checked={preferences.high_contrast ?? false}
              onCheckedChange={(checked) => handlePreferenceChange('high_contrast', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Animations & Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SpeakerWaveIcon className="h-5 w-5" />
            {t('sections.preferences.animationsSection.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Animations */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">{t('sections.preferences.animationsSection.animations')}</p>
              <p className="text-sm text-muted-foreground">
                {t('sections.preferences.animationsSection.animationsDesc')}
              </p>
            </div>
            <Switch
              checked={preferences.animations_enabled ?? true}
              onCheckedChange={(checked) => handlePreferenceChange('animations_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* UI Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.preferences.uiSection.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Compact Mode */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">{t('sections.preferences.uiSection.compactMode')}</p>
              <p className="text-sm text-muted-foreground">
                {t('sections.preferences.uiSection.compactModeDesc')}
              </p>
            </div>
            <Switch
              checked={preferences.compact_mode ?? false}
              onCheckedChange={(checked) => handlePreferenceChange('compact_mode', checked)}
            />
          </div>

          {/* Screen Reader Mode */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">{t('sections.preferences.uiSection.screenReaderMode')}</p>
              <p className="text-sm text-muted-foreground">
                {t('sections.preferences.uiSection.screenReaderModeDesc')}
              </p>
            </div>
            <Switch
              checked={preferences.screen_reader_mode ?? false}
              onCheckedChange={(checked) => handlePreferenceChange('screen_reader_mode', checked)}
            />
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
