'use client'

import { useState } from 'react'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui'
import {
  PuzzlePieceIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TagIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'

// Mock content data
const mockActivities = [
  {
    id: '1',
    name: 'Kurragömma',
    category: 'Utomhuslek',
    ageMin: 4,
    ageMax: 12,
    duration: 20,
    status: 'published',
    views: 1250,
    plays: 456,
    createdAt: '2024-08-15',
  },
  {
    id: '2',
    name: 'Stoppa bansen',
    category: 'Rörelselek',
    ageMin: 5,
    ageMax: 10,
    duration: 15,
    status: 'published',
    views: 890,
    plays: 234,
    createdAt: '2024-09-20',
  },
  {
    id: '3',
    name: 'Vinter-staffett',
    category: 'Laglek',
    ageMin: 6,
    ageMax: 14,
    duration: 30,
    status: 'draft',
    views: 0,
    plays: 0,
    createdAt: '2025-01-25',
  },
  {
    id: '4',
    name: 'Samarbetspussel',
    category: 'Problemlösning',
    ageMin: 7,
    ageMax: 12,
    duration: 25,
    status: 'pending',
    views: 0,
    plays: 0,
    createdAt: '2025-01-27',
  },
]

const CATEGORIES = ['Utomhuslek', 'Rörelselek', 'Laglek', 'Problemlösning', 'Kreativt', 'Lugna lekar']

function getStatusVariant(status: string) {
  switch (status) {
    case 'published':
      return 'success'
    case 'draft':
      return 'default'
    case 'pending':
      return 'warning'
    case 'archived':
      return 'outline'
    default:
      return 'default'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'published':
      return 'Publicerad'
    case 'draft':
      return 'Utkast'
    case 'pending':
      return 'Granskas'
    case 'archived':
      return 'Arkiverad'
    default:
      return status
  }
}

export default function AdminContentSandbox() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredActivities = mockActivities.filter((activity) => {
    if (searchQuery && !activity.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (categoryFilter && activity.category !== categoryFilter) return false
    if (statusFilter && activity.status !== statusFilter) return false
    return true
  })

  return (
    <SandboxShell
      moduleId="admin-content"
      title="Content"
      description="Content and activity management"
    >
      <div className="space-y-8">
          {/* Stats */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Content Stats</h2>
            <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{mockActivities.length}</div>
                <div className="text-sm text-gray-600">Totalt aktiviteter</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {mockActivities.filter((a) => a.status === 'published').length}
                </div>
                <div className="text-sm text-gray-600">Publicerade</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-500">
                  {mockActivities.filter((a) => a.status === 'draft').length}
                </div>
                <div className="text-sm text-gray-600">Utkast</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {mockActivities.filter((a) => a.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Granskas</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Content Table */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Content Table</h2>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <CardTitle className="flex items-center gap-2">
                  <PuzzlePieceIcon className="h-5 w-5 text-gray-400" />
                  Aktiviteter ({filteredActivities.length})
                </CardTitle>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Ny aktivitet
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Sök aktiviteter..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Alla kategorier' },
                      ...CATEGORIES.map((cat) => ({ value: cat, label: cat })),
                    ]}
                  />
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Alla status' },
                      { value: 'published', label: 'Publicerad' },
                      { value: 'draft', label: 'Utkast' },
                      { value: 'pending', label: 'Granskas' },
                    ]}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Aktivitet</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Kategori</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Ålder</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Tid</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Visningar</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <PuzzlePieceIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="font-medium text-gray-900">{activity.name}</div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline">{activity.category}</Badge>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-500">
                          {activity.ageMin}-{activity.ageMax} år
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-500">
                          {activity.duration} min
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={getStatusVariant(activity.status) as 'success' | 'default' | 'warning' | 'outline'}>
                            {getStatusLabel(activity.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-500">
                          {activity.views.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost">
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500">
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Activity Editor Card */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Activity Editor Card</h2>
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Redigera aktivitet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                <Input placeholder="Aktivitetens namn" defaultValue="Kurragömma" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                  rows={3}
                  placeholder="Beskriv aktiviteten..."
                  defaultValue="En klassisk lek där en person söker efter de andra som gömmer sig."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Kategori"
                    options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                  />
                </div>
                <div>
                  <Select
                    label="Status"
                    options={[
                      { value: 'draft', label: 'Utkast' },
                      { value: 'pending', label: 'Skicka för granskning' },
                      { value: 'published', label: 'Publicerad' },
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minålder</label>
                  <Input type="number" defaultValue="4" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maxålder</label>
                  <Input type="number" defaultValue="12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tid (min)</label>
                  <Input type="number" defaultValue="20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bild</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                  <PhotoIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Dra och släpp eller klicka för att ladda upp</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1">Spara ändringar</Button>
                <Button variant="outline">Förhandsgranska</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Category Management */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Category Management</h2>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TagIcon className="h-5 w-5 text-gray-400" />
                Kategorier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm">{cat}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost">
                        <PencilIcon className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500">
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                <PlusIcon className="h-4 w-4 mr-1" />
                Lägg till kategori
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Status Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Content Status Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Publicerad</Badge>
            <Badge variant="default">Utkast</Badge>
            <Badge variant="warning">Granskas</Badge>
            <Badge variant="outline">Arkiverad</Badge>
          </div>
        </section>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>CRUD för aktiviteter med modal</li>
            <li>Kategorihantering</li>
            <li>Statusfiltrering och sök</li>
            <li>Grid och list-vy</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
