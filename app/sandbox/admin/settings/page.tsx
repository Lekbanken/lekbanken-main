'use client'

import { SandboxShell } from '../../components/shell/SandboxShellV2'
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  EnvelopeIcon,
  KeyIcon,
  ServerIcon,
  DocumentTextIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useState } from 'react'

const LANGUAGE_OPTIONS = [
  { value: 'sv', label: 'Svenska' },
  { value: 'en', label: 'English' },
  { value: 'no', label: 'Norsk' },
  { value: 'da', label: 'Dansk' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Europe/Stockholm', label: 'Stockholm (CET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET)' },
]

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'Allmänt', icon: CogIcon },
  { id: 'appearance', label: 'Utseende', icon: PaintBrushIcon },
  { id: 'notifications', label: 'Notifikationer', icon: BellIcon },
  { id: 'security', label: 'Säkerhet', icon: ShieldCheckIcon },
  { id: 'email', label: 'E-post', icon: EnvelopeIcon },
  { id: 'api', label: 'API & Integrationer', icon: KeyIcon },
  { id: 'system', label: 'System', icon: ServerIcon },
  { id: 'legal', label: 'Juridiskt', icon: DocumentTextIcon },
]

export default function SettingsSandboxPage() {
  const [activeSection, setActiveSection] = useState('general')
  const [settings, setSettings] = useState({
    siteName: 'Lekbanken',
    siteDescription: 'Den ultimata plattformen för lärande och lek',
    language: 'sv',
    timezone: 'Europe/Stockholm',
    maintenanceMode: false,
    registrationOpen: true,
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    twoFactorRequired: false,
    sessionTimeout: '30',
    maxLoginAttempts: '5',
  })

  const updateSetting = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <SandboxShell
      moduleId="admin-settings"
      title="Settings"
      description="Systeminställningar, konfiguration"
    >
      <div className="space-y-8">
          {/* Save Button */}
          <div className="flex justify-end">
            <Button>
              <CheckIcon className="h-4 w-4 mr-2" />
            Spara ändringar
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <Card className="lg:col-span-1 h-fit">
            <CardContent className="p-4">
              <nav className="space-y-1">
                {SETTINGS_SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <section.icon className="h-5 w-5" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Settings Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* General Settings */}
            {activeSection === 'general' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CogIcon className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Allmänna inställningar</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Webbplatsens namn</label>
                      <Input
                        value={settings.siteName}
                        onChange={(e) => updateSetting('siteName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Standardspråk</label>
                      <Select
                        options={LANGUAGE_OPTIONS}
                        value={settings.language}
                        onChange={(e) => updateSetting('language', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Beskrivning</label>
                    <Textarea
                      value={settings.siteDescription}
                      onChange={(e) => updateSetting('siteDescription', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tidszon</label>
                    <Select
                      options={TIMEZONE_OPTIONS}
                      value={settings.timezone}
                      onChange={(e) => updateSetting('timezone', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Underhållsläge</p>
                      <p className="text-sm text-gray-600">Stäng av webbplatsen för underhåll</p>
                    </div>
                    <button
                      onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.maintenanceMode ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Öppen registrering</p>
                      <p className="text-sm text-gray-600">Tillåt nya användare att registrera sig</p>
                    </div>
                    <button
                      onClick={() => updateSetting('registrationOpen', !settings.registrationOpen)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.registrationOpen ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.registrationOpen ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appearance Settings */}
            {activeSection === 'appearance' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PaintBrushIcon className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Utseende</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">Primärfärg</label>
                    <div className="flex gap-3 mt-2">
                      {['#8661ff', '#00c7b0', '#ffd166', '#ef4444', '#3b82f6'].map((color) => (
                        <button
                          key={color}
                          className="h-10 w-10 rounded-lg border-2 border-transparent hover:border-gray-400 transition-colors"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Logotyp</label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <p className="text-gray-600">Dra och släpp eller klicka för att ladda upp</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG eller SVG (max 2MB)</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Favicon</label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <p className="text-gray-600">Dra och släpp eller klicka för att ladda upp</p>
                      <p className="text-xs text-gray-500 mt-1">ICO eller PNG (32x32px)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notification Settings */}
            {activeSection === 'notifications' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BellIcon className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Notifikationsinställningar</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'E-postnotifikationer', desc: 'Skicka viktiga uppdateringar via e-post' },
                    { key: 'pushNotifications', label: 'Push-notifikationer', desc: 'Aktivera push-notiser i webbläsaren' },
                    { key: 'marketingEmails', label: 'Marknadsföringsmail', desc: 'Skicka nyhetsbrev och kampanjer' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-gray-600">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => updateSetting(item.key, !settings[item.key as keyof typeof settings])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings[item.key as keyof typeof settings] ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings[item.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            {activeSection === 'security' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Säkerhetsinställningar</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Tvåfaktorsautentisering krävs</p>
                      <p className="text-sm text-gray-600">Kräv 2FA för alla administratörer</p>
                    </div>
                    <button
                      onClick={() => updateSetting('twoFactorRequired', !settings.twoFactorRequired)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.twoFactorRequired ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.twoFactorRequired ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sessionstimeout (minuter)</label>
                      <Input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max inloggningsförsök</label>
                      <Input
                        type="number"
                        value={settings.maxLoginAttempts}
                        onChange={(e) => updateSetting('maxLoginAttempts', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-medium text-yellow-800">Säkerhetsstatus</p>
                    <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                      <li>✓ SSL-certifikat aktivt</li>
                      <li>✓ Lösenordspolicy aktiv</li>
                      <li>⚠ 2FA ej påtvingat</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email Settings */}
            {activeSection === 'email' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">E-postinställningar</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP-server</label>
                      <Input placeholder="smtp.example.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Port</label>
                      <Input placeholder="587" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Användarnamn</label>
                      <Input placeholder="user@example.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lösenord</label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Avsändaradress</label>
                    <Input placeholder="noreply@lekbanken.se" />
                  </div>
                  <Button variant="outline">Testa e-postinställningar</Button>
                </CardContent>
              </Card>
            )}

            {/* API Settings */}
            {activeSection === 'api' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <KeyIcon className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">API & Integrationer</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">API-nyckel</p>
                        <code className="text-sm text-gray-600">sk_live_****************************</code>
                      </div>
                      <Button variant="outline" size="sm">Visa</Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-3">Integrationer</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Google Analytics', status: 'active' },
                        { name: 'Stripe', status: 'active' },
                        { name: 'Slack', status: 'inactive' },
                        { name: 'Zapier', status: 'inactive' },
                      ].map((integration) => (
                        <div key={integration.name} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{integration.name}</span>
                          <Badge variant={integration.status === 'active' ? 'success' : 'secondary'}>
                            {integration.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Settings */}
            {activeSection === 'system' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ServerIcon className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Systeminställningar</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Version', value: '2.4.1' },
                      { label: 'Node.js', value: '20.10.0' },
                      { label: 'Databas', value: 'PostgreSQL 15' },
                      { label: 'Cache', value: 'Redis 7.2' },
                    ].map((item) => (
                      <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">{item.label}</p>
                        <p className="font-medium">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-medium">Åtgärder</h3>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline">Rensa cache</Button>
                      <Button variant="outline">Exportera data</Button>
                      <Button variant="outline">Systemlogg</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Legal Settings */}
            {activeSection === 'legal' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Juridiska dokument</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: 'Användarvillkor', updated: '2024-01-10' },
                    { name: 'Integritetspolicy', updated: '2024-01-10' },
                    { name: 'Cookiepolicy', updated: '2023-12-15' },
                    { name: 'GDPR-dokumentation', updated: '2023-11-20' },
                  ].map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-gray-600">Uppdaterad: {doc.updated}</p>
                      </div>
                      <Button variant="outline" size="sm">Redigera</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Fliknavigation för sektioner</li>
            <li>Toggles för on/off inställningar</li>
            <li>Säkerhet: 2FA, session timeout</li>
            <li>Juridiska dokument</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
