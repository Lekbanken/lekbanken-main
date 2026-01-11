'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input, Select } from '@/components/ui'
import {
  Cog6ToothIcon,
  BellIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  SparklesIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

// Types
interface Preferences {
  language: string
  theme: string
  emailFrequency: string
  notificationsEnabled: boolean
  pushNotifications: boolean
  soundEnabled: boolean
  contentMaturity: string
  profileVisibility: string
  enableRecommendations: boolean
  displayName: string
}

// Values only - labels come from translations
const LANGUAGES = ['sv', 'en', 'no', 'da'] as const
const THEMES = ['light', 'dark', 'system'] as const
const EMAIL_FREQUENCIES = ['daily', 'weekly', 'monthly', 'never'] as const
const VISIBILITY_OPTIONS = ['public', 'friends', 'private'] as const
const MATURITY_LEVELS = ['all', 'family', 'kids'] as const

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
      aria-label={label}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function PreferencesPage() {
  const t = useTranslations('app.preferences')
  const [preferences, setPreferences] = useState<Preferences>({
    language: 'sv',
    theme: 'light',
    emailFrequency: 'weekly',
    notificationsEnabled: true,
    pushNotifications: true,
    soundEnabled: false,
    contentMaturity: 'all',
    profileVisibility: 'public',
    enableRecommendations: true,
    displayName: 'Anna Andersson',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            t('saving')
          ) : saved ? (
            <>
              <CheckIcon className="h-4 w-4 mr-1" />
              {t('saved')}
            </>
          ) : (
            t('save')
          )}
        </Button>
      </div>

      {saved && (
        <Badge variant="success" className="w-full justify-center py-2">
          {t('savedBanner')}
        </Badge>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircleIcon className="h-5 w-5 text-primary" />
              {t('profile.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('profile.displayName')}
              </label>
              <Input
                value={preferences.displayName}
                onChange={(e) => updatePreference('displayName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('profile.visibility')}
              </label>
              <Select
                value={preferences.profileVisibility}
                onChange={(e) => updatePreference('profileVisibility', e.target.value)}
                options={VISIBILITY_OPTIONS.map(v => ({ value: v, label: t(`visibility.${v}` as 'visibility.public') }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('profile.visibilityHint')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PaintBrushIcon className="h-5 w-5 text-accent" />
              {t('appearance.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('appearance.language')}
              </label>
              <Select
                value={preferences.language}
                onChange={(e) => updatePreference('language', e.target.value)}
                options={LANGUAGES.map(l => ({ value: l, label: t(`languages.${l}` as 'languages.sv') }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('appearance.theme')}
              </label>
              <Select
                value={preferences.theme}
                onChange={(e) => updatePreference('theme', e.target.value)}
                options={THEMES.map(th => ({ value: th, label: t(`themes.${th}` as 'themes.light') }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-yellow-500" />
              {t('notifications.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">{t('notifications.email')}</div>
                <div className="text-sm text-muted-foreground">{t('notifications.emailDesc')}</div>
              </div>
              <Toggle
                checked={preferences.notificationsEnabled}
                onChange={(val) => updatePreference('notificationsEnabled', val)}
                label={t('notifications.email')}
              />
            </div>
            {preferences.notificationsEnabled && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('notifications.emailFrequency')}
                </label>
                <Select
                  value={preferences.emailFrequency}
                  onChange={(e) => updatePreference('emailFrequency', e.target.value)}
                  options={EMAIL_FREQUENCIES.map(f => ({ value: f, label: t(`emailFrequencies.${f}` as 'emailFrequencies.daily') }))}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">{t('notifications.push')}</div>
                <div className="text-sm text-muted-foreground">{t('notifications.pushDesc')}</div>
              </div>
              <Toggle
                checked={preferences.pushNotifications}
                onChange={(val) => updatePreference('pushNotifications', val)}
                label={t('notifications.push')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">{t('notifications.sound')}</div>
                <div className="text-sm text-muted-foreground">{t('notifications.soundDesc')}</div>
              </div>
              <Toggle
                checked={preferences.soundEnabled}
                onChange={(val) => updatePreference('soundEnabled', val)}
                label={t('notifications.sound')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Content & Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-green-500" />
              {t('content.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('content.maturity')}
              </label>
              <Select
                value={preferences.contentMaturity}
                onChange={(e) => updatePreference('contentMaturity', e.target.value)}
                options={MATURITY_LEVELS.map(m => ({ value: m, label: t(`maturity.${m}` as 'maturity.all') }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('content.maturityHint')}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">{t('content.recommendations')}</div>
                <div className="text-sm text-muted-foreground">{t('content.recommendationsDesc')}</div>
              </div>
              <Toggle
                checked={preferences.enableRecommendations}
                onChange={(val) => updatePreference('enableRecommendations', val)}
                label={t('content.recommendations')}
              />
            </div>
            <div className="pt-2">
              <Link
                href="/app/preferences/cookies"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                {t('content.cookies')}
              </Link>
            </div>
            <div className="pt-2">
              <Link
                href="/app/preferences/legal"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                View legal acceptance receipt
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-500" />
            {t('quick.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start">
              <GlobeAltIcon className="h-4 w-4 mr-2" />
              {t('quick.changeLanguage')}
            </Button>
            <Button variant="outline" className="justify-start">
              <PaintBrushIcon className="h-4 w-4 mr-2" />
              {t('quick.changeTheme')}
            </Button>
            <Button variant="outline" className="justify-start">
              <BellIcon className="h-4 w-4 mr-2" />
              {t('quick.muteNotifications')}
            </Button>
            <Button variant="outline" className="justify-start">
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              {t('quick.advanced')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
