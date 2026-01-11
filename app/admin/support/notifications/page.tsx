'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui'
import {
  BellIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { AdminPageLayout, AdminPageHeader, AdminEmptyState, AdminErrorState, AdminBreadcrumbs } from '@/components/admin/shared'
import {
  checkSupportHubAccess,
  listTenantsForSupportHub,
  listRecentNotifications,
  type NotificationHistoryItem,
} from '@/app/actions/support-hub'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
  info: <InformationCircleIcon className="h-5 w-5 text-blue-500" />,
  warning: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
  error: <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />,
}

const CATEGORY_LABELS: Record<string, string> = {
  support: 'Support',
  system: 'System',
  learning: 'Utbildning',
  gamification: 'Gamification',
}

export default function NotificationHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  useEffect(() => {
    if (hasAccess) {
      loadNotifications()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, selectedTenantId, categoryFilter])

  async function checkAccess() {
    const result = await checkSupportHubAccess()
    if (!result.hasAccess) {
      setError(result.error || 'Ingen åtkomst')
      setLoading(false)
      return
    }
    setHasAccess(true)
    setIsSystemAdmin(result.isSystemAdmin)
    
    if (result.isSystemAdmin) {
      const tenantsResult = await listTenantsForSupportHub()
      if (tenantsResult.success && tenantsResult.data) {
        setTenants(tenantsResult.data)
      }
    } else if (result.tenantIds.length > 0) {
      setSelectedTenantId(result.tenantIds[0])
    }
  }

  async function loadNotifications() {
    setLoading(true)
    setError(null)
    
    const result = await listRecentNotifications({
      tenantId: selectedTenantId,
      category: categoryFilter || undefined,
      limit: 100,
    })
    
    if (result.success && result.data) {
      setNotifications(result.data)
    } else {
      setError(result.error || 'Kunde inte hämta notifikationer')
    }
    
    setLoading(false)
  }

  const filteredNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.is_read)
    : notifications

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('sv-SE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!hasAccess && !loading) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<BellIcon className="h-6 w-6" />}
          title="Ingen åtkomst"
          description={error || 'Du har inte behörighet att se notifikationshistorik.'}
        />
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Support', href: '/admin/support' },
          { label: 'Notifikationshistorik' },
        ]}
      />

      <AdminPageHeader
        title="Notifikationshistorik"
        description="Senaste 7 dagarnas skickade notifikationer för felsökning."
        icon={<BellIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/support">
              <Button variant="outline" size="sm">
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Tillbaka
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={loadNotifications} disabled={loading}>
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      {error && (
        <AdminErrorState
          title="Kunde inte ladda notifikationer"
          description={error}
          onRetry={loadNotifications}
        />
      )}

      <Card className="mt-6">
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <CardTitle className="text-lg">
              Skickade notifikationer ({filteredNotifications.length})
            </CardTitle>
            
            <div className="flex gap-2 flex-wrap items-center">
              {isSystemAdmin && tenants.length > 0 && (
                <select
                  value={selectedTenantId ?? ''}
                  onChange={(e) => setSelectedTenantId(e.target.value || undefined)}
                  className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background text-foreground"
                >
                  <option value="">Alla organisationer</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-sm bg-background text-foreground"
              >
                <option value="">Alla kategorier</option>
                <option value="support">Support</option>
                <option value="system">System</option>
                <option value="learning">Utbildning</option>
                <option value="gamification">Gamification</option>
              </select>
              
              <Button
                variant={showUnreadOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                <EnvelopeIcon className="h-4 w-4 mr-1" />
                Olästa
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto mb-2" />
              Laddar...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Inga notifikationer hittades</p>
              <p className="text-sm mt-1">Endast de senaste 7 dagarnas notifikationer visas.</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {TYPE_ICONS[notification.type] || TYPE_ICONS.info}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground truncate">
                          {notification.title}
                        </span>
                        {!notification.is_read && (
                          <Badge variant="primary" className="text-xs">Oläst</Badge>
                        )}
                        {notification.category && (
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[notification.category] || notification.category}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span>
                          Till: {notification.user_email || notification.user_id?.slice(0, 8) || 'Okänd'}
                        </span>
                        {isSystemAdmin && notification.tenant_name && (
                          <span>Org: {notification.tenant_name}</span>
                        )}
                        <span>{notification.created_at ? formatDate(notification.created_at) : ''}</span>
                        {notification.event_key && (
                          <span className="font-mono text-xs opacity-60" title={notification.event_key}>
                            {notification.event_key.length > 30 
                              ? notification.event_key.slice(0, 30) + '...'
                              : notification.event_key
                            }
                          </span>
                        )}
                      </div>
                      
                      {notification.action_url && (
                        <div className="mt-2">
                          <span className="text-xs text-primary">
                            → {notification.action_url}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0">
                      {notification.is_read ? (
                        <EnvelopeOpenIcon className="h-4 w-4 text-muted-foreground/50" />
                      ) : (
                        <EnvelopeIcon className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
