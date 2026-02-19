'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select } from '@/components/ui'
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

export default function NotificationHistoryPage() {
  const t = useTranslations('admin.support.notifications')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const CATEGORY_LABELS: Record<string, string> = useMemo(() => ({
    support: t('categories.support'),
    system: t('categories.system'),
    learning: t('categories.learning'),
    gamification: t('categories.gamification'),
  }), [t])

  useEffect(() => {
    void (async () => {
      const result = await checkSupportHubAccess()
      if (!result.hasAccess) {
        setError(result.error || t('noAccess'))
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
      }
    })()
  }, [t])

  useEffect(() => {
    if (hasAccess) {
      loadNotifications()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, selectedTenantId, categoryFilter])

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
      setError(result.error || t('errors.couldNotFetch'))
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
          title={t('noAccess')}
          description={error || t('noAccessDescription')}
        />
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.admin'), href: '/admin' },
          { label: t('breadcrumbs.support'), href: '/admin/support' },
          { label: t('breadcrumbs.notificationHistory') },
        ]}
      />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<BellIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/support">
              <Button variant="outline" size="sm">
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                {t('back')}
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
          title={t('errors.couldNotFetch')}
          description={error}
          onRetry={loadNotifications}
        />
      )}

      <Card className="mt-6">
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <CardTitle className="text-lg">
              {t('list.title')} ({filteredNotifications.length})
            </CardTitle>
            
            <div className="flex gap-2 flex-wrap items-center">
              {isSystemAdmin && tenants.length > 0 && (
                <Select
                  value={selectedTenantId ?? ''}
                  onChange={(e) => setSelectedTenantId(e.target.value || undefined)}
                  options={[
                    { value: '', label: t('filters.allOrganizations') },
                    ...tenants.map(tenant => ({ value: tenant.id, label: tenant.name })),
                  ]}
                />
              )}
              
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: '', label: t('filters.allCategories') },
                  { value: 'support', label: t('categories.support') },
                  { value: 'system', label: t('categories.system') },
                  { value: 'learning', label: t('categories.learning') },
                  { value: 'gamification', label: t('categories.gamification') },
                ]}
              />
              
              <Button
                variant={showUnreadOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                <EnvelopeIcon className="h-4 w-4 mr-1" />
                {t('filters.unread')}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto mb-2" />
              {t('loading')}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('empty.title')}</p>
              <p className="text-sm mt-1">{t('empty.description')}</p>
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
                          <Badge variant="primary" className="text-xs">{t('status.unread')}</Badge>
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
                          {t('details.to')} {notification.user_email || notification.user_id?.slice(0, 8) || t('details.unknown')}
                        </span>
                        {isSystemAdmin && notification.tenant_name && (
                          <span>{t('details.org')} {notification.tenant_name}</span>
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
