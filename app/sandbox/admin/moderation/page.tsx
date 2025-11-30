'use client'

import {
  ShieldExclamationIcon,
  FlagIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  PhotoIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'pending', label: 'Väntande granskning' },
  { value: 'reviewed', label: 'Granskade' },
  { value: 'resolved', label: 'Lösta' },
  { value: 'escalated', label: 'Eskalerade' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'Alla typer' },
  { value: 'content', label: 'Olämpligt innehåll' },
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Trakasserier' },
  { value: 'cheating', label: 'Fusk' },
  { value: 'other', label: 'Övrigt' },
]

const REPORTS = [
  {
    id: 'RPT-001',
    type: 'harassment',
    reportedUser: 'användare_xyz',
    reportedBy: 'Anna Andersson',
    reason: 'Olämpliga kommentarer i chattfunktionen',
    status: 'pending',
    priority: 'high',
    createdAt: '2024-01-15 14:32',
    content: 'Användaren har skickat flera stötande meddelanden...',
  },
  {
    id: 'RPT-002',
    type: 'cheating',
    reportedUser: 'speedrunner99',
    reportedBy: 'Erik Eriksson',
    reason: 'Misstänkt fusk i Quiz Battle',
    status: 'pending',
    priority: 'medium',
    createdAt: '2024-01-15 12:15',
    content: 'Användaren får konsekvent 100% på under 5 sekunder...',
  },
  {
    id: 'RPT-003',
    type: 'spam',
    reportedUser: 'promo_account',
    reportedBy: 'System (automatisk)',
    reason: 'Massutskick av reklammeddelanden',
    status: 'escalated',
    priority: 'high',
    createdAt: '2024-01-15 10:45',
    content: 'Kontot har skickat 50+ identiska meddelanden på 1 timme...',
  },
  {
    id: 'RPT-004',
    type: 'content',
    reportedUser: 'creative_user',
    reportedBy: 'Maria Johansson',
    reason: 'Olämplig profilbild',
    status: 'reviewed',
    priority: 'low',
    createdAt: '2024-01-14 16:20',
    content: 'Profilbilden innehåller olämpligt innehåll för barn...',
  },
  {
    id: 'RPT-005',
    type: 'other',
    reportedUser: 'test_user_123',
    reportedBy: 'Admin',
    reason: 'Testrapport för kvalitetssäkring',
    status: 'resolved',
    priority: 'low',
    createdAt: '2024-01-14 09:00',
    content: 'Detta är en testrapport...',
  },
]

const MODERATION_STATS = [
  { label: 'Väntande rapporter', value: '23', icon: ClockIcon, color: 'text-yellow-600 bg-yellow-100' },
  { label: 'Lösta idag', value: '47', icon: CheckIcon, color: 'text-green-600 bg-green-100' },
  { label: 'Eskalerade', value: '5', icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-100' },
  { label: 'Genomsnittlig tid', value: '2.4h', icon: ArrowPathIcon, color: 'text-blue-600 bg-blue-100' },
]

const FLAGGED_CONTENT = [
  { id: 1, type: 'comment', content: 'Detta spel är så dåligt...', user: 'anonym_user', flags: 3 },
  { id: 2, type: 'profile', content: 'Olämpligt användarnamn', user: 'xxx_user', flags: 5 },
  { id: 3, type: 'image', content: 'Ifrågasatt profilbild', user: 'new_player', flags: 2 },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="warning">Väntande</Badge>
    case 'reviewed':
      return <Badge>Granskad</Badge>
    case 'resolved':
      return <Badge variant="success">Löst</Badge>
    case 'escalated':
      return <Badge variant="error">Eskalerad</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return <Badge variant="error">Hög</Badge>
    case 'medium':
      return <Badge variant="warning">Medium</Badge>
    case 'low':
      return <Badge>Låg</Badge>
    default:
      return <Badge>{priority}</Badge>
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'harassment':
      return <ChatBubbleLeftIcon className="h-5 w-5" />
    case 'cheating':
      return <ShieldExclamationIcon className="h-5 w-5" />
    case 'spam':
      return <FlagIcon className="h-5 w-5" />
    case 'content':
      return <PhotoIcon className="h-5 w-5" />
    default:
      return <ExclamationTriangleIcon className="h-5 w-5" />
  }
}

export default function ModerationSandboxPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedReport, setSelectedReport] = useState<typeof REPORTS[0] | null>(null)

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a 
              href="/sandbox/admin" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Tillbaka
            </a>
            <h1 className="text-lg font-semibold text-foreground">Moderation</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      <div className="p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Action buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex gap-3">
              <Button variant="outline">
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Uppdatera
              </Button>
              <Button>
                <ShieldExclamationIcon className="h-4 w-4 mr-2" />
                Modereringsregler
              </Button>
            </div>
          </div>

          {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODERATION_STATS.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Priority Alert */}
        {REPORTS.filter(r => r.priority === 'high' && r.status === 'pending').length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-red-100">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800">Högprioriterade rapporter</h3>
                  <p className="text-sm text-red-700">
                    Det finns {REPORTS.filter(r => r.priority === 'high' && r.status === 'pending').length} högprioriterade rapporter som kräver omedelbar uppmärksamhet.
                  </p>
                </div>
                <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                  Visa nu
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Reports List */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-lg">Rapporter</h3>
                  <div className="flex flex-wrap gap-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Sök..."
                        className="pl-9 w-48"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
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
                <div className="space-y-3">
                  {REPORTS.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedReport?.id === report.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            report.type === 'harassment' ? 'bg-red-100 text-red-600' :
                            report.type === 'cheating' ? 'bg-yellow-100 text-yellow-600' :
                            report.type === 'spam' ? 'bg-orange-100 text-orange-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getTypeIcon(report.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{report.id}</span>
                              {getPriorityBadge(report.priority)}
                            </div>
                            <p className="text-sm text-gray-900 mt-1">{report.reason}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <UserIcon className="h-3 w-3" />
                                {report.reportedUser}
                              </span>
                              <span>{report.createdAt}</span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Detail / Quick Actions */}
          <div className="space-y-4">
            {selectedReport ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Rapportdetaljer</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedReport(null)}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Rapport ID</p>
                    <p className="font-medium">{selectedReport.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rapporterad användare</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="font-medium">{selectedReport.reportedUser}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Anledning</p>
                    <p className="mt-1">{selectedReport.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Beskrivning</p>
                    <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedReport.content}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rapporterad av</p>
                    <p className="font-medium">{selectedReport.reportedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Skapad</p>
                    <p className="font-medium">{selectedReport.createdAt}</p>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <h4 className="font-medium text-sm">Åtgärder</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Visa profil
                      </Button>
                      <Button variant="outline" size="sm">
                        <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                        Kontakta
                      </Button>
                    </div>
                    <Button className="w-full" variant="outline">
                      <CheckIcon className="h-4 w-4 mr-2" />
                      Markera som löst
                    </Button>
                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                      <ShieldExclamationIcon className="h-4 w-4 mr-2" />
                      Stäng av användare
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-lg">Flaggat innehåll</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {FLAGGED_CONTENT.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                            {item.type === 'comment' ? <ChatBubbleLeftIcon className="h-4 w-4" /> :
                             item.type === 'image' ? <PhotoIcon className="h-4 w-4" /> :
                             <UserIcon className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.content}</p>
                            <p className="text-xs text-gray-500">{item.user}</p>
                          </div>
                        </div>
                        <Badge variant="warning">{item.flags} flaggor</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Actions */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-lg">Senaste åtgärder</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: 'Varning utfärdad', user: 'user_abc', time: '5 min sedan', moderator: 'Admin' },
                    { action: 'Rapport löst', user: 'test_user', time: '15 min sedan', moderator: 'Mod_1' },
                    { action: 'Innehåll borttaget', user: 'spam_bot', time: '1 timme sedan', moderator: 'System' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.action}</p>
                        <p className="text-xs text-gray-500">{item.user} • {item.moderator}</p>
                      </div>
                      <span className="text-xs text-gray-500">{item.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Rapport-lista med prioritet och status</li>
            <li>Detaljvy för enskild rapport</li>
            <li>Modereringshistorik</li>
            <li>Åtgärdsknappar (varna, blockera)</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
      </div>
    </div>
  )
}
