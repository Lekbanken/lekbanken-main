'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Select } from '@/components/ui'
import {
  TicketIcon,
  ChatBubbleLeftRightIcon,
  BugAntIcon,
  LightBulbIcon,
  BookOpenIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  UserIcon,
  BellIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import { AdminPageLayout, AdminPageHeader, AdminErrorState } from '@/components/admin/shared'
import {
  getSupportHubStats,
  listMyAssignedTickets,
  listRecentTickets,
  listUrgentTickets,
  listRecentFeedback,
  listRecentBugReports,
  checkSupportHubAccess,
  listTenantsForSupportHub,
  type SupportHubStats,
  type AssignedTicket,
  type RecentTicket,
  type RecentFeedback,
  type RecentBugReport,
} from '@/app/actions/support-hub'

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'open':
      return 'primary'
    case 'in_progress':
      return 'warning'
    case 'waiting_for_user':
      return 'secondary'
    case 'resolved':
      return 'success'
    case 'closed':
      return 'default'
    default:
      return 'default'
  }
}

function getStatusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case 'open':
      return t('status.open')
    case 'in_progress':
      return t('status.inProgress')
    case 'waiting_for_user':
      return t('status.waitingForUser')
    case 'resolved':
      return t('status.resolved')
    case 'closed':
      return t('status.closed')
    default:
      return status
  }
}

function getPriorityBadgeVariant(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'destructive'
    case 'high':
      return 'warning'
    case 'medium':
      return 'secondary'
    case 'low':
      return 'default'
    default:
      return 'default'
  }
}

function formatTimeAgo(dateString: string, t: (key: string, values?: Record<string, string | number | Date>) => string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return t('timeAgo.minutes', { count: diffMins })
  if (diffHours < 24) return t('timeAgo.hours', { count: diffHours })
  if (diffDays === 1) return t('timeAgo.yesterday')
  return t('timeAgo.days', { count: diffDays })
}

export default function SupportHubPage() {
  const t = useTranslations('admin.support.hub')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])
  
  // Data
  const [stats, setStats] = useState<SupportHubStats | null>(null)
  const [myTickets, setMyTickets] = useState<AssignedTicket[]>([])
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [urgentTickets, setUrgentTickets] = useState<RecentTicket[]>([])
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedback[]>([])
  const [recentBugs, setRecentBugs] = useState<RecentBugReport[]>([])

  // Check access
  async function checkAccess() {
    const result = await checkSupportHubAccess()
    if (!result.hasAccess) {
      setError(result.error || t('noAccess'))
      setLoading(false)
      return
    }
    setHasAccess(true)
    setIsSystemAdmin(result.isSystemAdmin)
    
    // Load tenants for filter
    if (result.isSystemAdmin) {
      const tenantsResult = await listTenantsForSupportHub()
      if (tenantsResult.success && tenantsResult.data) {
        setTenants(tenantsResult.data)
      }
    } else if (result.tenantIds.length > 0) {
      // Set default tenant for tenant admin
      setSelectedTenantId(result.tenantIds[0])
    }
  }

  // Load data
  async function loadData() {
    setLoading(true)
    
    const params = { tenantId: selectedTenantId }
    
    const [
      statsResult,
      myTicketsResult,
      recentResult,
      urgentResult,
      feedbackResult,
      bugsResult,
    ] = await Promise.all([
      getSupportHubStats(params),
      listMyAssignedTickets({ ...params, limit: 5 }),
      listRecentTickets({ ...params, limit: 10 }),
      listUrgentTickets({ ...params, limit: 5 }),
      listRecentFeedback({ ...params, limit: 5 }),
      listRecentBugReports({ ...params, limit: 5 }),
    ])
    
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data)
    }
    if (myTicketsResult.success && myTicketsResult.data) {
      setMyTickets(myTicketsResult.data)
    }
    if (recentResult.success && recentResult.data) {
      setRecentTickets(recentResult.data)
    }
    if (urgentResult.success && urgentResult.data) {
      setUrgentTickets(urgentResult.data)
    }
    if (feedbackResult.success && feedbackResult.data) {
      setRecentFeedback(feedbackResult.data)
    }
    if (bugsResult.success && bugsResult.data) {
      setRecentBugs(bugsResult.data)
    }
    
    setLoading(false)
  }

  // Initial access check
  useEffect(() => {
    checkAccess()
  }, [])

  // Load data when access is confirmed or tenant changes
  useEffect(() => {
    if (hasAccess) {
      loadData()
    }
  }, [hasAccess, selectedTenantId])

  if (error) {
    return (
      <AdminPageLayout>
        <AdminErrorState
          title={t('noAccess')}
          description={error}
          onRetry={() => window.location.reload()}
        />
      </AdminPageLayout>
    )
  }

  const tenantOptions = [
    { value: '', label: t('allOrganizations') },
    ...tenants.map(t => ({ value: t.id, label: t.name })),
  ]

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<ChatBubbleLeftRightIcon className="h-8 w-8 text-primary" />}
        actions={
          isSystemAdmin && tenants.length > 0 ? (
            <Select
              value={selectedTenantId || ''}
              onChange={(e) => setSelectedTenantId(e.target.value || undefined)}
              options={tenantOptions}
              className="w-64"
            />
          ) : null
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/tickets">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TicketIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{t('cards.tickets')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('cards.activeCount', { count: (stats?.total_open ?? 0) + (stats?.in_progress ?? 0) })}
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/admin/support/kb">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <BookOpenIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{t('cards.knowledgeBase')}</div>
                    <div className="text-sm text-muted-foreground">{t('cards.faqAndArticles')}</div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/admin/support/bugs">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <BugAntIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{t('cards.bugReports')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('cards.openCount', { count: stats?.open_bugs ?? 0 })}
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/admin/support/feedback">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <LightBulbIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{t('cards.feedback')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('cards.newCount', { count: stats?.unread_feedback ?? 0 })}
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/admin/support/notifications">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <BellIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{t('cards.notifications')}</div>
                    <div className="text-sm text-muted-foreground">{t('cards.historyAndTroubleshooting')}</div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
            
            {isSystemAdmin && (
              <Link href="/admin/support/automation">
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <CogIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{t('cards.automation')}</div>
                      <div className="text-sm text-muted-foreground">{t('cards.rulesAndSla')}</div>
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-muted-foreground ml-auto" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{t('stats.open')}</div>
                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{stats.total_open}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{t('stats.inProgress')}</div>
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{stats.in_progress}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{t('stats.waitingForUser')}</div>
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{stats.waiting_for_user}</div>
                </CardContent>
              </Card>
              <Card className={stats.urgent_count > 0 ? 'border-red-500/50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{t('stats.urgent')}</div>
                    <ExclamationTriangleIcon className={`h-4 w-4 ${stats.urgent_count > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${stats.urgent_count > 0 ? 'text-red-600' : 'text-foreground'}`}>
                    {stats.urgent_count}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{t('stats.resolved30d')}</div>
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-1">{stats.resolved_last_30d}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Urgent Tickets */}
            {urgentTickets.length > 0 && (
              <Card className="border-red-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    {t('sections.urgentTickets')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {urgentTickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/admin/tickets?id=${ticket.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-red-200 hover:border-red-300 bg-red-50/50 transition-colors block"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{ticket.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {ticket.user_email || t('unknown')} • {formatTimeAgo(ticket.created_at, t)}
                          </div>
                        </div>
                        <Badge variant="destructive">{t('priority.urgent')}</Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Assigned Tickets */}
            {myTickets.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    {t('sections.myAssignedTickets')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myTickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/admin/tickets?id=${ticket.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors block"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{ticket.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimeAgo(ticket.created_at, t)}
                            {isSystemAdmin && ticket.tenant_name && ` • ${ticket.tenant_name}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityBadgeVariant(ticket.priority) as 'destructive' | 'warning' | 'secondary' | 'default'}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant={getStatusBadgeVariant(ticket.status) as 'primary' | 'warning' | 'secondary' | 'success' | 'default'}>
                            {getStatusLabel(ticket.status, t)}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Tickets */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TicketIcon className="h-5 w-5" />
                  {t('sections.recentTickets')}
                </CardTitle>
                <Link href="/admin/tickets">
                  <Button variant="ghost" size="sm">
                    {t('viewAll')}
                    <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('empty.noActiveTickets')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTickets.slice(0, 5).map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/admin/tickets?id=${ticket.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors block"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{ticket.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {ticket.user_email || t('unknown')} • {formatTimeAgo(ticket.created_at, t)}
                            {isSystemAdmin && ticket.tenant_name && ` • ${ticket.tenant_name}`}
                          </div>
                        </div>
                        <Badge variant={getStatusBadgeVariant(ticket.status) as 'primary' | 'warning' | 'secondary' | 'success' | 'default'}>
                          {getStatusLabel(ticket.status, t)}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Feedback */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <LightBulbIcon className="h-5 w-5" />
                  {t('sections.newFeedback')}
                </CardTitle>
                <Link href="/admin/support/feedback">
                  <Button variant="ghost" size="sm">
                    {t('viewAll')}
                    <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentFeedback.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('empty.noNewFeedback')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentFeedback.map((item) => (
                      <Link
                        key={item.id}
                        href={`/admin/support/feedback?id=${item.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors block"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{item.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.user_email || t('anonymous')} • {formatTimeAgo(item.created_at, t)}
                          </div>
                        </div>
                        <Badge variant="secondary">{item.type}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Bug Reports */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BugAntIcon className="h-5 w-5" />
                  {t('sections.openBugReports')}
                </CardTitle>
                <Link href="/admin/support/bugs">
                  <Button variant="ghost" size="sm">
                    {t('viewAll')}
                    <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentBugs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('empty.noOpenBugReports')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentBugs.map((bug) => (
                      <Link
                        key={bug.id}
                        href={`/admin/support/bugs?id=${bug.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors block"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{bug.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {bug.user_email || t('unknown')} • {formatTimeAgo(bug.created_at, t)}
                          </div>
                        </div>
                        <Badge variant="outline">{bug.status}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminPageLayout>
  )
}
