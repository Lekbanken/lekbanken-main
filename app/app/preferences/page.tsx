'use client'

import { useState } from 'react'
import Link from 'next/link'
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

const LANGUAGES = [
  { value: 'sv', label: 'Svenska' },
  { value: 'en', label: 'English' },
  { value: 'no', label: 'Norsk' },
  { value: 'da', label: 'Dansk' },
]

const THEMES = [
  { value: 'light', label: 'Ljust' },
  { value: 'dark', label: 'Mörkt' },
  { value: 'system', label: 'Systemval' },
]

const EMAIL_FREQUENCIES = [
  { value: 'daily', label: 'Dagligen' },
  { value: 'weekly', label: 'Veckovis' },
  { value: 'monthly', label: 'Månatligen' },
  { value: 'never', label: 'Aldrig' },
]

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Publik' },
  { value: 'friends', label: 'Endast vänner' },
  { value: 'private', label: 'Privat' },
]

const MATURITY_LEVELS = [
  { value: 'all', label: 'Allt innehåll' },
  { value: 'family', label: 'Familjevänligt' },
  { value: 'kids', label: 'Endast barn' },
]

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
          <h1 className="text-2xl font-bold text-foreground">Inställningar</h1>
          <p className="text-muted-foreground mt-1">Anpassa din upplevelse</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            'Sparar...'
          ) : saved ? (
            <>
              <CheckIcon className="h-4 w-4 mr-1" />
              Sparat!
            </>
          ) : (
            'Spara ändringar'
          )}
        </Button>
      </div>

      {saved && (
        <Badge variant="success" className="w-full justify-center py-2">
          Dina inställningar har sparats!
        </Badge>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircleIcon className="h-5 w-5 text-primary" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Visningsnamn
              </label>
              <Input
                value={preferences.displayName}
                onChange={(e) => updatePreference('displayName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Profilsynlighet
              </label>
              <Select
                value={preferences.profileVisibility}
                onChange={(e) => updatePreference('profileVisibility', e.target.value)}
                options={VISIBILITY_OPTIONS}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Välj vem som kan se din profil och aktivitet
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PaintBrushIcon className="h-5 w-5 text-accent" />
              Utseende
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Språk
              </label>
              <Select
                value={preferences.language}
                onChange={(e) => updatePreference('language', e.target.value)}
                options={LANGUAGES}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tema
              </label>
              <Select
                value={preferences.theme}
                onChange={(e) => updatePreference('theme', e.target.value)}
                options={THEMES}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-yellow-500" />
              Notiser
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">E-postnotiser</div>
                <div className="text-sm text-muted-foreground">Få uppdateringar via e-post</div>
              </div>
              <Toggle
                checked={preferences.notificationsEnabled}
                onChange={(val) => updatePreference('notificationsEnabled', val)}
                label="E-postnotiser"
              />
            </div>
            {preferences.notificationsEnabled && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  E-postfrekvens
                </label>
                <Select
                  value={preferences.emailFrequency}
                  onChange={(e) => updatePreference('emailFrequency', e.target.value)}
                  options={EMAIL_FREQUENCIES}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Push-notiser</div>
                <div className="text-sm text-muted-foreground">Få notiser på din enhet</div>
              </div>
              <Toggle
                checked={preferences.pushNotifications}
                onChange={(val) => updatePreference('pushNotifications', val)}
                label="Push-notiser"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Ljud</div>
                <div className="text-sm text-muted-foreground">Spela upp ljud vid notiser</div>
              </div>
              <Toggle
                checked={preferences.soundEnabled}
                onChange={(val) => updatePreference('soundEnabled', val)}
                label="Ljud"
              />
            </div>
          </CardContent>
        </Card>

        {/* Content & Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-green-500" />
              Innehåll & Integritet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Innehållsnivå
              </label>
              <Select
                value={preferences.contentMaturity}
                onChange={(e) => updatePreference('contentMaturity', e.target.value)}
                options={MATURITY_LEVELS}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Filtrera innehåll baserat på åldersgrupp
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Rekommendationer</div>
                <div className="text-sm text-muted-foreground">Få personliga förslag</div>
              </div>
              <Toggle
                checked={preferences.enableRecommendations}
                onChange={(val) => updatePreference('enableRecommendations', val)}
                label="Rekommendationer"
              />
            </div>
            <div className="pt-2">
              <Link
                href="/app/preferences/cookies"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                Hantera cookie-inställningar
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
            Snabbinställningar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start">
              <GlobeAltIcon className="h-4 w-4 mr-2" />
              Byt språk
            </Button>
            <Button variant="outline" className="justify-start">
              <PaintBrushIcon className="h-4 w-4 mr-2" />
              Byt tema
            </Button>
            <Button variant="outline" className="justify-start">
              <BellIcon className="h-4 w-4 mr-2" />
              Tysta notiser
            </Button>
            <Button variant="outline" className="justify-start">
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Avancerat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
