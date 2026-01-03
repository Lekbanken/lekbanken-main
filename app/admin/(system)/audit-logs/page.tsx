'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import {
  ClipboardDocumentListIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { createBrowserClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

interface AuditLog {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  user_id: string | null
  tenant_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  user_email?: string
}

type ActionType = 'all' | 'create' | 'update' | 'delete' | 'login' | 'logout'
type ResourceType = 'all' | 'game' | 'product' | 'user' | 'tenant' | 'media' | 'achievement'

export default function AuditLogsPage() {
  const { user } = useAuth()
  const { currentTenant } = useTenant()

  const userId = user?.id
  const tenantId = currentTenant?.id

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<ActionType>('all')
  const [resourceFilter, setResourceFilter] = useState<ResourceType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (!tenantId) return

    const loadLogs = async () => {
      setIsLoading(true)
      const supabase = createBrowserClient()

      const startDateISO = new Date(dateRange.startDate).toISOString()
      const endDateISO = new Date(
        new Date(dateRange.endDate).getTime() + 24 * 60 * 60 * 1000
      ).toISOString()

      let query = supabase
        .from('tenant_audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO)
        .order('created_at', { ascending: false })
        .limit(500)

      if (actionFilter !== 'all') {
        query = query.ilike('action', `%${actionFilter}%`)
      }

      if (resourceFilter !== 'all') {
        query = query.eq('resource_type', resourceFilter)
      }

      if (searchQuery) {
        query = query.or(
          `action.ilike.%${searchQuery}%,resource_type.ilike.%${searchQuery}%,resource_id.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query

      if (error) {
        logger.error('Failed to load audit logs', error, {
          page: 'audit-logs',
          tenantId: tenantId,
          userId: userId
        })
      } else if (data) {
        // Fetch user emails for logs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userIds = [...new Set(data.map((log: any) => log.user_id).filter(Boolean))]
        const { data: users } = await supabase
          .from('user_profiles')
          .select('user_id, email')
          .in('user_id', userIds as string[])

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userMap = new Map(users?.map((u: any) => [u.user_id, u.email]) || [])

        setLogs(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.map((log: any) => ({
            ...log,
            user_email: log.user_id ? userMap.get(log.user_id) : undefined,
          }))
        )
      }

      setIsLoading(false)
    }

    void loadLogs()
  }, [tenantId, userId, actionFilter, resourceFilter, dateRange, searchQuery])

  const exportToCSV = () => {
    const headers = [
      'Timestamp',
      'Action',
      'Resource Type',
      'Resource ID',
      'User Email',
      'Metadata',
    ]
    const rows = logs.map((log) => [
      new Date(log.created_at).toLocaleString('sv-SE'),
      log.action,
      log.resource_type,
      log.resource_id || '',
      log.user_email || 'System',
      JSON.stringify(log.metadata || {}),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (!user || !currentTenant) {
    return (
      <AdminPageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Du måste vara inloggad för att se denna sida.</p>
        </div>
      </AdminPageLayout>
    )
  }

  const actionCounts = {
    create: logs.filter((l) => l.action.toLowerCase().includes('create')).length,
    update: logs.filter((l) => l.action.toLowerCase().includes('update')).length,
    delete: logs.filter((l) => l.action.toLowerCase().includes('delete')).length,
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Audit Logs"
        description="Granska alla systemaktiviteter och ändringar"
        icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit Logs' }]}
        actions={
          <button
            onClick={exportToCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Exportera CSV
          </button>
        }
      />

      <AdminStatGrid cols={4} className="mb-8">
        <AdminStatCard
          label="Totalt händelser"
          value={logs.length}
          icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
          iconColor="primary"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Skapade"
          value={actionCounts.create}
          icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Uppdaterade"
          value={actionCounts.update}
          icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
          iconColor="blue"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Raderade"
          value={actionCounts.delete}
          icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
          iconColor="red"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <FunnelIcon className="h-5 w-5" />
            <span className="font-medium">Filter</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Från</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Till</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              />
            </div>

            {/* Action Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Åtgärd</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as ActionType)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              >
                <option value="all">Alla</option>
                <option value="create">Skapa</option>
                <option value="update">Uppdatera</option>
                <option value="delete">Radera</option>
                <option value="login">Inloggning</option>
                <option value="logout">Utloggning</option>
              </select>
            </div>

            {/* Resource Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Resurstyp
              </label>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value as ResourceType)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              >
                <option value="all">Alla</option>
                <option value="game">Spel</option>
                <option value="product">Produkt</option>
                <option value="user">Användare</option>
                <option value="tenant">Organisation</option>
                <option value="media">Media</option>
                <option value="achievement">Prestation</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök i aktiviteter..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Filter tillämpas automatiskt
          </p>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitetslogg ({logs.length} händelser)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Tidpunkt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Åtgärd
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Resurs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Användare
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Detaljer
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      Laddar...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      Inga aktiviteter hittades
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted">
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('sv-SE')}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            log.action.toLowerCase().includes('delete')
                              ? 'destructive'
                              : log.action.toLowerCase().includes('create')
                                ? 'default'
                                : 'secondary'
                          }
                          className={
                            log.action.toLowerCase().includes('create')
                              ? 'bg-green-100 text-green-700'
                              : log.action.toLowerCase().includes('update')
                                ? 'bg-blue-100 text-blue-700'
                                : ''
                          }
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <span className="font-medium text-foreground">
                            {log.resource_type}
                          </span>
                          {log.resource_id && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              #{log.resource_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {log.user_email || 'System'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-primary hover:underline">
                              Visa metadata
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
