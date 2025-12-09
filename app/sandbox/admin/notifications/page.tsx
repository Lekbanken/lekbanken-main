'use client'

import {
  BellIcon,
  MegaphoneIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'draft', label: 'Utkast' },
  { value: 'scheduled', label: 'Schemalagd' },
  { value: 'sent', label: 'Skickad' },
  { value: 'cancelled', label: 'Avbruten' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'Alla typer' },
  { value: 'push', label: 'Push-notis' },
  { value: 'email', label: 'E-post' },
  { value: 'in-app', label: 'In-app' },
  { value: 'announcement', label: 'Meddelande' },
]

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Alla användare' },
  { value: 'premium', label: 'Premium-användare' },
  { value: 'free', label: 'Gratis-användare' },
  { value: 'schools', label: 'Skolor' },
  { value: 'inactive', label: 'Inaktiva användare' },
]

const NOTIFICATIONS = [
  {
    id: 'NOT-001',
    title: 'Nytt spel släppt! 🎮',
    message: 'Prova vårt nya pusselspel Tankenöt - perfekt för hela familjen!',
    type: 'push',
    status: 'sent',
    audience: 'Alla användare',
    sentAt: '2024-01-15 10:00',
    stats: { sent: 12847, opened: 4521, clicked: 1234 },
  },
  {
    id: 'NOT-002',
    title: 'Januaritävling startar!',
    message: 'Delta i vår månadstävling och vinn premium-medlemskap.',
    type: 'email',
    status: 'scheduled',
    audience: 'Premium-användare',
    scheduledFor: '2024-01-20 09:00',
    stats: null,
  },
  {
    id: 'NOT-003',
    title: 'Underhållsarbete',
    message: 'Planerat underhåll mellan 02:00-04:00 den 18 januari.',
    type: 'announcement',
    status: 'sent',
    audience: 'Alla användare',
    sentAt: '2024-01-14 16:00',
    stats: { sent: 12847, opened: 8934, clicked: 0 },
  },
  {
    id: 'NOT-004',
    title: 'Välkomstmeddelande (utkast)',
    message: 'Välkommen till Lekbanken! Här är dina första steg...',
    type: 'in-app',
    status: 'draft',
    audience: 'Nya användare',
    scheduledFor: null,
    stats: null,
  },
]

const TEMPLATES = [
  { id: 1, name: 'Välkomstmail', type: 'email', usedCount: 1247 },
  { id: 2, name: 'Nytt spel', type: 'push', usedCount: 89 },
  { id: 3, name: 'Månadstävling', type: 'email', usedCount: 12 },
  { id: 4, name: 'Underhållsnotis', type: 'announcement', usedCount: 34 },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'sent':
      return <Badge variant="success"><CheckCircleIcon className="h-3 w-3 mr-1" />Skickad</Badge>
    case 'scheduled':
      return <Badge variant="warning"><ClockIcon className="h-3 w-3 mr-1" />Schemalagd</Badge>
    case 'draft':
      return <Badge><PencilIcon className="h-3 w-3 mr-1" />Utkast</Badge>
    case 'cancelled':
      return <Badge variant="error"><XCircleIcon className="h-3 w-3 mr-1" />Avbruten</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'push':
      return <DevicePhoneMobileIcon className="h-5 w-5" />
    case 'email':
      return <EnvelopeIcon className="h-5 w-5" />
    case 'in-app':
      return <BellIcon className="h-5 w-5" />
    case 'announcement':
      return <MegaphoneIcon className="h-5 w-5" />
    default:
      return <BellIcon className="h-5 w-5" />
  }
}

export default function NotificationsSandboxPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showComposer, setShowComposer] = useState(false)
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'push',
    audience: 'all',
  })

  return (
    <SandboxShell
      moduleId="admin-notifications"
      title="Notifications"
      description="Notification management and broadcasting"
    >
      <div className="space-y-8">
          {/* Action buttons */}
          <div className="flex justify-end">
            <Button onClick={() => setShowComposer(!showComposer)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Skapa notifikation
            </Button>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                  <EnvelopeIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">12,847</p>
                  <p className="text-sm text-gray-600">Skickade idag</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 text-green-600">
                  <EyeIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">68.2%</p>
                  <p className="text-sm text-gray-600">Öppningsgrad</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                  <ChartBarIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">24.5%</p>
                  <p className="text-sm text-gray-600">Klickgrad</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
                  <ClockIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-gray-600">Schemalagda</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Composer */}
        {showComposer && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-lg">Ny notifikation</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Titel</label>
                  <Input
                    placeholder="Notifikationstitel..."
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Typ</label>
                    <Select
                      options={TYPE_OPTIONS.slice(1)}
                      value={newNotification.type}
                      onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Målgrupp</label>
                    <Select
                      options={AUDIENCE_OPTIONS}
                      value={newNotification.audience}
                      onChange={(e) => setNewNotification({ ...newNotification, audience: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Meddelande</label>
                <Textarea
                  placeholder="Skriv ditt meddelande här..."
                  rows={4}
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowComposer(false)}>
                  Avbryt
                </Button>
                <Button variant="outline">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  Schemalägg
                </Button>
                <Button>
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Skicka nu
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Notifications List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-lg">Notifikationer</h3>
                  <div className="flex gap-3">
                    <Select
                      options={STATUS_OPTIONS}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    />
                    <Select
                      options={TYPE_OPTIONS}
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {NOTIFICATIONS.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            notification.type === 'push' ? 'bg-blue-100 text-blue-600' :
                            notification.type === 'email' ? 'bg-purple-100 text-purple-600' :
                            notification.type === 'announcement' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getTypeIcon(notification.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{notification.title}</h4>
                              {getStatusBadge(notification.status)}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <UserGroupIcon className="h-3 w-3" />
                                {notification.audience}
                              </span>
                              {notification.sentAt && (
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  Skickad: {notification.sentAt}
                                </span>
                              )}
                              {notification.scheduledFor && (
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="h-3 w-3" />
                                  Schemalagd: {notification.scheduledFor}
                                </span>
                              )}
                            </div>
                            {notification.stats && (
                              <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs">
                                <span className="text-gray-600">
                                  Skickade: <span className="font-medium">{notification.stats.sent.toLocaleString()}</span>
                                </span>
                                <span className="text-green-600">
                                  Öppnade: <span className="font-medium">{notification.stats.opened.toLocaleString()}</span>
                                  ({((notification.stats.opened / notification.stats.sent) * 100).toFixed(1)}%)
                                </span>
                                <span className="text-blue-600">
                                  Klick: <span className="font-medium">{notification.stats.clicked.toLocaleString()}</span>
                                  ({((notification.stats.clicked / notification.stats.sent) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Templates */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Mallar</h3>
                  <Button variant="ghost" size="sm">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {getTypeIcon(template.type)}
                        <span className="text-sm font-medium">{template.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{template.usedCount} användningar</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Scheduled */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-lg">Kommande</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {NOTIFICATIONS.filter(n => n.status === 'scheduled').map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 rounded-lg bg-yellow-50 border border-yellow-100"
                    >
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium">{notification.title}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{notification.scheduledFor}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-lg">Snabbåtgärder</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <MegaphoneIcon className="h-4 w-4 mr-2" />
                  Nytt meddelande
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <DevicePhoneMobileIcon className="h-4 w-4 mr-2" />
                  Test push-notis
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Visa statistik
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Skapa push/e-post/in-app notifikationer</li>
            <li>Målgrupp: alla, segment, enskilda</li>
            <li>Schemalagda och historik</li>
            <li>Mallar för snabb återanvändning</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
