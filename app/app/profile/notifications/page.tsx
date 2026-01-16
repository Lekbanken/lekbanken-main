'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { createBrowserClient } from '@/lib/supabase/client';
import { ProfileService, type NotificationSettings } from '@/lib/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const defaultSettings: Partial<NotificationSettings> = {
  email_enabled: true,
  push_enabled: false,
  inapp_enabled: true,
  email_activity: true,
  email_mentions: true,
  email_comments: true,
  email_updates: true,
  email_marketing: false,
  email_digest: 'daily',
  dnd_enabled: false,
  dnd_start_time: '22:00',
  dnd_end_time: '08:00',
};

export default function NotificationSettingsPage() {
  const t = useTranslations('app.profile');
  const { user } = useAuth();
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);

  // Initialize supabase client only in browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createBrowserClient());
    }
  }, []);

  const [settings, setSettings] = useState<Partial<NotificationSettings>>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id || !supabase) return;

      setIsLoading(true);
      try {
        const profileService = new ProfileService(supabase);
        const loadedSettings = await profileService.getNotificationSettings(user.id);
        if (loadedSettings) {
          setSettings(loadedSettings);
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user?.id, supabase]);

  const handleSettingChange = useCallback((key: keyof NotificationSettings, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id || !supabase) return;

    setIsSaving(true);
    try {
      const profileService = new ProfileService(supabase);
      await profileService.updateNotificationSettings(user.id, settings);
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, supabase, settings]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-lg" />
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
            <BellIcon className="h-6 w-6 text-primary" />
            {t('sections.notifications.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('sections.notifications.description')}
          </p>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('actions.saving') : t('actions.save')}
          </Button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircleIcon className="h-5 w-5" />
            <p className="font-medium">{t('actions.saved')}</p>
          </div>
        </div>
      )}

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.notifications.channels')}</CardTitle>
          <CardDescription>
            {t('sections.notifications.email.title')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <EnvelopeIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t('sections.notifications.email.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('sections.notifications.email.enabled')}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.email_enabled ?? true}
              onCheckedChange={(checked) => handleSettingChange('email_enabled', checked)}
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DevicePhoneMobileIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t('sections.notifications.push.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('sections.notifications.push.enabled')}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.push_enabled ?? false}
              onCheckedChange={(checked) => handleSettingChange('push_enabled', checked)}
            />
          </div>

          {/* In-App */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ComputerDesktopIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t('sections.notifications.inApp.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('sections.notifications.inApp.enabled')}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.inapp_enabled ?? true}
              onCheckedChange={(checked) => handleSettingChange('inapp_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Categories */}
      {settings.email_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.notifications.categories')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'email_activity' as const, label: t('sections.notifications.email.activity') },
              { key: 'email_mentions' as const, label: t('sections.notifications.email.mentions') },
              { key: 'email_comments' as const, label: t('sections.notifications.email.comments') },
              { key: 'email_updates' as const, label: t('sections.notifications.email.updates') },
              { key: 'email_marketing' as const, label: t('sections.notifications.email.marketing') },
            ].map((category) => (
              <div
                key={category.key}
                className="flex items-center justify-between p-4 rounded-lg border border-border"
              >
                <p className="font-medium text-foreground">{category.label}</p>
                <Switch
                  checked={(settings[category.key] as boolean) ?? false}
                  onCheckedChange={(checked) => handleSettingChange(category.key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Email Digest */}
      {settings.email_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.notifications.email.digest')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { value: 'real-time', label: t('sections.notifications.email.digestOptions.realtime') },
                { value: 'daily', label: t('sections.notifications.email.digestOptions.daily') },
                { value: 'weekly', label: t('sections.notifications.email.digestOptions.weekly') },
                { value: 'never', label: t('sections.notifications.email.digestOptions.never') },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSettingChange('email_digest', option.value as 'real-time' | 'daily' | 'weekly' | 'never')}
                  className={cn(
                    'p-4 rounded-lg border text-center transition-colors',
                    settings.email_digest === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className={cn(
                    'font-medium',
                    settings.email_digest === option.value
                      ? 'text-primary'
                      : 'text-foreground'
                  )}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Do Not Disturb */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.notifications.dnd.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="font-medium text-foreground">{t('sections.notifications.dnd.enabled')}</p>
            </div>
            <Switch
              checked={settings.dnd_enabled ?? false}
              onCheckedChange={(checked) => handleSettingChange('dnd_enabled', checked)}
            />
          </div>

          {settings.dnd_enabled && (
            <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-lg border border-border bg-muted/30">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('sections.notifications.dnd.startTime')}
                </label>
                <input
                  type="time"
                  value={settings.dnd_start_time || '22:00'}
                  onChange={(e) => handleSettingChange('dnd_start_time', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('sections.notifications.dnd.endTime')}
                </label>
                <input
                  type="time"
                  value={settings.dnd_end_time || '08:00'}
                  onChange={(e) => handleSettingChange('dnd_end_time', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button (sticky on mobile) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end lg:hidden">
          <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-lg">
            {isSaving ? t('actions.saving') : t('actions.save')}
          </Button>
        </div>
      )}
    </div>
  );
}
