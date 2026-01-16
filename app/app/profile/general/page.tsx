'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  UserIcon,
  CameraIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { avatarPresets } from '@/features/profile/avatarPresets';
import { cn } from '@/lib/utils';

const getVisibilityOptions = (t: (key: string) => string) => [
  { value: 'public', label: t('sections.general.visibility.public') },
  { value: 'private', label: t('sections.general.visibility.private') },
  { value: 'organization', label: t('sections.general.visibility.organization') },
];

export default function GeneralSettingsPage() {
  const t = useTranslations('app.profile');
  const { user, userProfile, updateProfile, isLoading } = useAuth();
  const visibilityOptions = useMemo(() => getVisibilityOptions(t), [t]);

  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

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
              <button
                type="button"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                onClick={() => {/* TODO: Open file picker */}}
              >
                <CameraIcon className="h-4 w-4" />
              </button>
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

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-1.5">
              {t('sections.general.personalInfo.bio')}
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('sections.general.personalInfo.bioPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('sections.general.personalInfo.bioCharCount', { count: bio.length })}
            </p>
          </div>

          {/* Location & Pronouns */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-foreground mb-1.5">
                {t('sections.general.personalInfo.location')}
              </label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('sections.general.personalInfo.locationPlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="pronouns" className="block text-sm font-medium text-foreground mb-1.5">
                {t('sections.general.personalInfo.pronouns')}
              </label>
              <Input
                id="pronouns"
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                placeholder={t('sections.general.personalInfo.pronounsPlaceholder')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.general.visibility.title')}</CardTitle>
          <CardDescription>
            {t('sections.general.visibility.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('sections.general.visibility.label')}
            </label>
            <Select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              options={visibilityOptions}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('sections.general.visibility.hint')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('sections.general.visibility.showEmail')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('sections.general.visibility.showEmailDesc')}
                </p>
              </div>
              <Switch checked={showEmail} onCheckedChange={setShowEmail} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t('sections.general.visibility.showPhone')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('sections.general.visibility.showPhoneDesc')}
                </p>
              </div>
              <Switch checked={showPhone} onCheckedChange={setShowPhone} />
            </div>
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
