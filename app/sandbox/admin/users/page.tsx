'use client'

import { useState } from 'react'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'
import {
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'

// Mock users data
const mockUsers = [
  {
    id: '1',
    name: 'Anna Svensson',
    email: 'anna.svensson@example.com',
    role: 'admin',
    status: 'active',
    lastActive: '2025-01-27T10:30:00Z',
    createdAt: '2024-06-15',
  },
  {
    id: '2',
    name: 'Erik Johansson',
    email: 'erik.johansson@example.com',
    role: 'moderator',
    status: 'active',
    lastActive: '2025-01-27T09:15:00Z',
    createdAt: '2024-08-20',
  },
  {
    id: '3',
    name: 'Maria Lindberg',
    email: 'maria.lindberg@example.com',
    role: 'member',
    status: 'pending',
    lastActive: '2025-01-26T14:00:00Z',
    createdAt: '2025-01-25',
  },
  {
    id: '4',
    name: 'Johan Andersson',
    email: 'johan.andersson@example.com',
    role: 'member',
    status: 'inactive',
    lastActive: '2024-12-15T08:00:00Z',
    createdAt: '2024-03-10',
  },
  {
    id: '5',
    name: 'Sara Nilsson',
    email: 'sara.nilsson@example.com',
    role: 'member',
    status: 'blocked',
    lastActive: '2025-01-20T16:45:00Z',
    createdAt: '2024-09-05',
  },
]

const ROLES = ['admin', 'moderator', 'member']
const STATUSES = ['active', 'pending', 'inactive', 'blocked']

function getRoleVariant(role: string) {
  switch (role) {
    case 'admin':
      return 'primary'
    case 'moderator':
      return 'accent'
    default:
      return 'outline'
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'inactive':
      return 'default'
    case 'blocked':
      return 'destructive'
    default:
      return 'default'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'active':
      return 'Aktiv'
    case 'pending':
      return 'Väntande'
    case 'inactive':
      return 'Inaktiv'
    case 'blocked':
      return 'Blockerad'
    default:
      return status
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('sv-SE')
}

function formatLastActive(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins} min sedan`
  if (diffHours < 24) return `${diffHours} tim sedan`
  if (diffDays === 1) return 'Igår'
  return `${diffDays} dagar sedan`
}

export default function AdminUsersSandbox() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredUsers = mockUsers.filter((user) => {
    if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !user.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (roleFilter && user.role !== roleFilter) return false
    if (statusFilter && user.status !== statusFilter) return false
    return true
  })

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    }
  }

  return (
    <SandboxShell
      moduleId="admin-users"
      title="Users"
      description="User management and administration"
    >
      <div className="space-y-8">
          {/* Stats */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">User Stats</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{mockUsers.length}</div>
                <div className="text-sm text-gray-600">Totalt</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {mockUsers.filter((u) => u.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Aktiva</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {mockUsers.filter((u) => u.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Väntande</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-500">
                  {mockUsers.filter((u) => u.status === 'blocked').length}
                </div>
                <div className="text-sm text-gray-600">Blockerade</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Users Table */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Users Table</h2>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-gray-400" />
                  Användare ({filteredUsers.length})
                </CardTitle>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Lägg till användare
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Sök användare..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">Alla roller</option>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Alla status</option>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm">
                    <FunnelIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg mb-4">
                  <span className="text-sm font-medium">
                    {selectedUsers.length} användare markerade
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      Skicka mail
                    </Button>
                    <Button size="sm" variant="outline">
                      <ShieldCheckIcon className="h-4 w-4 mr-1" />
                      Ändra roll
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600">
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Ta bort
                    </Button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Användare</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Roll</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Senast aktiv</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Medlem sedan</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={getRoleVariant(user.role) as 'primary' | 'accent' | 'outline'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={getStatusVariant(user.status) as 'success' | 'warning' | 'default' | 'destructive'}>
                            {getStatusLabel(user.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-500">
                          {formatLastActive(user.lastActive)}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost">
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <EllipsisVerticalIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Visar 1-{filteredUsers.length} av {mockUsers.length} användare
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled>
                    Föregående
                  </Button>
                  <Button size="sm" variant="outline">
                    Nästa
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* User Detail Card */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">User Detail Card</h2>
          <Card className="max-w-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  A
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Anna Svensson</h3>
                  <p className="text-sm text-gray-500">anna.svensson@example.com</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="primary">Admin</Badge>
                    <Badge variant="success">Aktiv</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
                <div>
                  <div className="text-sm text-gray-500">Medlem sedan</div>
                  <div className="font-medium">15 juni 2024</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Senast aktiv</div>
                  <div className="font-medium">2 min sedan</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Aktiviteter</div>
                  <div className="font-medium">247</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Poäng</div>
                  <div className="font-medium">12,450</div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button className="flex-1">
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Redigera
                </Button>
                <Button variant="outline">
                  <EnvelopeIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Role Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Role & Status Badges</h2>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 w-16">Roller:</span>
              <Badge variant="primary">Admin</Badge>
              <Badge variant="accent">Moderator</Badge>
              <Badge variant="outline">Member</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 w-16">Status:</span>
              <Badge variant="success">Aktiv</Badge>
              <Badge variant="warning">Väntande</Badge>
              <Badge variant="default">Inaktiv</Badge>
              <Badge variant="destructive">Blockerad</Badge>
            </div>
          </div>
        </section>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Sök och filtrering på namn, e-post</li>
            <li>Bulk-selection med checkboxes</li>
            <li>Roll och status-badges</li>
            <li>User detail modal/sidebar</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
