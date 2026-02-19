'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { uploadCustomAvatar } from './avatarActions.server';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  UserIcon,
  TrashIcon,
  CheckIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
import { avatarPresets } from '@/features/profile/avatarPresets';
import { AvatarBuilderWidget } from '@/app/sandbox/avatar-builder/components/AvatarBuilderWidget';
import type { AvatarConfig } from '@/app/sandbox/avatar-builder/types';
import type { UserProfile } from '@/types/auth';
import { cn } from '@/lib/utils';

export default function GeneralSettingsPage() {
  const t = useTranslations('app.profile');
  const { user, userProfile, updateProfile, isLoading } = useAuth();

  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  const [showBuilder, setShowBuilder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from userProfile when available
  useState(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || '');
      setAvatarUrl(userProfile.avatar_url || null);
    }
  });

  const email = user?.email || '';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || email[0]?.toUpperCase() || '?';

  const handleSave = useCallback(async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Update profile via auth context
      await updateProfile({ full_name: fullName, avatar_url: avatarUrl });

      // Also update extended profile via API
      await fetch('/api/accounts/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          avatar_url: avatarUrl,
          display_name: displayName || undefined,
          phone: phone || undefined,
        }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorGeneric'));
    } finally {
      setIsSaving(false);
    }
  }, [user, fullName, avatarUrl, displayName, phone, updateProfile, t]);

  const handleAvatarSelect = (src: string | null) => {
    setAvatarUrl(src);
  };

  const handleBuilderSave = useCallback(
    async ({ config, blob }: { config: AvatarConfig; blob: Blob }) => {
      if (!user) return;

      try {
        // Upload via server action (browser supabase storage hangs in v2.86+)
        const fd = new FormData();
        fd.append('file', blob, 'avatar.png');
        const result = await uploadCustomAvatar(fd);

        if ('error' in result) throw new Error(result.error);

        const publicUrl = result.url;

        // Single updateProfile call: saves to DB + refreshes auth context
        await updateProfile({
          avatar_url: publicUrl,
          avatar_config: config as unknown as UserProfile['avatar_config'],
        });

        // Update local state + close dialog
        setAvatarUrl(publicUrl);
        setShowBuilder(false);
      } catch (err) {
        console.error('Avatar builder save failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to save avatar');
      }
    },
    [user, updateProfile],
  );

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">{t('sections.general.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UserIcon className="h-6 w-6 text-primary" />
          {t('nav.general')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('sections.personalInfo.description')}
        </p>
      </div>

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.general.avatar.title')}</CardTitle>
          <CardDescription>
            {t('sections.general.avatar.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar src={avatarUrl || undefined} name={fullName || initials} size="xl" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {avatarUrl ? t('sections.general.avatar.selected') : t('sections.general.avatar.notSelected')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('sections.general.avatar.uploadHint')}
              </p>
            </div>
          </div>

          {/* Avatar Presets */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              {t('sections.general.avatar.selectPredefined')}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {avatarPresets.map((preset) => {
                const active = avatarUrl === preset.src;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleAvatarSelect(preset.src)}
                    className={cn(
                      'relative aspect-square rounded-xl border-2 overflow-hidden transition-all hover:scale-105',
                      active
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Avatar src={preset.src} name={preset.label} size="lg" className="w-full h-full" />
                    {active && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <CheckIcon className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create Custom Avatar */}
          <div>
            <Button variant="outline" onClick={() => setShowBuilder(true)}>
              <PaintBrushIcon className="h-4 w-4 mr-2" />
              {t('sections.general.avatar.createCustom')}
            </Button>
          </div>

          {/* Avatar Builder Dialog */}
          <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-0">
                <DialogTitle>{t('sections.general.avatar.builderTitle')}</DialogTitle>
                <DialogDescription>
                  {t('sections.general.avatar.builderDescription')}
                </DialogDescription>
              </DialogHeader>
              <AvatarBuilderWidget
                initialConfig={userProfile?.avatar_config as AvatarConfig | null | undefined}
                onSave={handleBuilderSave}
                onCancel={() => setShowBuilder(false)}
                hideDownload
                saveLabel={t('sections.general.avatar.builderSave')}
                cancelLabel={t('sections.general.avatar.builderCancel')}
                className="border-0 shadow-none rounded-none"
              />
            </DialogContent>
          </Dialog>

          {/* Remove Avatar */}
          {avatarUrl && (
            <Button variant="outline" onClick={() => handleAvatarSelect(null)}>
              <TrashIcon className="h-4 w-4 mr-2" />
              {t('sections.general.avatar.remove')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.general.personalInfo.title')}</CardTitle>
          <CardDescription>
            {t('sections.general.personalInfo.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-1.5">
                {t('sections.general.personalInfo.fullName')}
              </label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('sections.general.personalInfo.fullNamePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-1.5">
                {t('sections.general.personalInfo.displayName')}
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('sections.general.personalInfo.displayNamePlaceholder')}
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('sections.general.personalInfo.email')}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground text-sm">
                {email}
              </div>
              <Button variant="outline" href="/app/profile/account">
                {t('sections.general.personalInfo.emailChange')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('sections.general.personalInfo.emailHint')}
            </p>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
              {t('sections.general.personalInfo.phone')}
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('sections.general.personalInfo.phonePlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              {t('actions.saving')}
            </>
          ) : saveSuccess ? (
            <>
              <CheckIcon className="h-4 w-4 mr-2" />
              {t('actions.saved')}
            </>
          ) : (
            t('actions.save')
          )}
        </Button>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
