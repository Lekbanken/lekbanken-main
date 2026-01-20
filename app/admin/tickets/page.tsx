'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Badge, Input, Button } from '@/components/ui';
import { 
  TicketIcon, 
  ArrowPathIcon, 
  UserCircleIcon,
  ChatBubbleLeftIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import {
  listTickets,
  listTicketMessages,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  addTicketMessage,
  getTicketStats,
  listTenantsForTicketsAdmin,
  checkHasAdminAccess,
  getAssignableUsers,
  type TicketRow,
  type TicketMessageRowWithUser,
  type TenantOption,
  type TicketStatsResult,
} from '@/app/actions/tickets-admin';
import {
  AdminPageLayout,
  AdminPageHeader,
  AdminEmptyState,
  AdminErrorState,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
} from '@/components/admin/shared';

type StatusFilter = 'all' | 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'urgent';

const priorityColors: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

export default function AdminTicketsPage() {
  const t = useTranslations('admin.tickets');

  const STATUS_OPTIONS = useMemo(() => [
    { value: 'all', label: t('status.all') },
    { value: 'open', label: t('status.open') },
    { value: 'in_progress', label: t('status.inProgress') },
    { value: 'waiting_for_user', label: t('status.waitingForUser') },
    { value: 'resolved', label: t('status.resolved') },
    { value: 'closed', label: t('status.closed') },
  ], [t]);

  const PRIORITY_OPTIONS = useMemo(() => [
    { value: 'all', label: t('priority.all') },
    { value: 'urgent', label: t('priority.urgent') },
    { value: 'high', label: t('priority.high') },
    { value: 'medium', label: t('priority.medium') },
    { value: 'low', label: t('priority.low') },
  ], [t]);

  const STATUS_UPDATE_OPTIONS = useMemo(() => STATUS_OPTIONS.filter(s => s.value !== 'all'), [STATUS_OPTIONS]);
  const PRIORITY_UPDATE_OPTIONS = useMemo(() => PRIORITY_OPTIONS.filter(p => p.value !== 'all'), [PRIORITY_OPTIONS]);
  // Access state
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [_userTenantIds, setUserTenantIds] = useState<string[]>([]);

  // Data state
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<TicketStatsResult['data'] | null>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; email: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [unassigned, setUnassigned] = useState(false);
  const [needsFirstResponse, setNeedsFirstResponse] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Detail panel
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessageRowWithUser[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Message form
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Check access on mount
  useEffect(() => {
    const checkAccess = async () => {
      const accessResult = await checkHasAdminAccess();
      setHasAccess(accessResult.hasAccess);
      setIsSystemAdmin(accessResult.isSystemAdmin);
      setUserTenantIds(accessResult.tenantIds);

      if (accessResult.hasAccess) {
        // Load tenants for filter
        const tenantList = await listTenantsForTicketsAdmin();
        setTenants(tenantList);
      }
    };
    checkAccess();
  }, []);

  // Load tickets when filters change
  const loadTickets = useCallback(async () => {
    if (hasAccess === false) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const [ticketsResult, statsResult] = await Promise.all([
        listTickets({
          page: currentPage,
          pageSize,
          search: searchDebounced || undefined,
          status: statusFilter === 'all' ? 'all' : statusFilter,
          priority: priorityFilter === 'all' ? 'all' : priorityFilter,
          tenantId: tenantFilter || undefined,
          assignedToMe,
          unassigned,
          needsFirstResponse,
        }),
        getTicketStats(tenantFilter || undefined),
      ]);

      if (ticketsResult.success && ticketsResult.data) {
        setTickets(ticketsResult.data.tickets);
        setTotalCount(ticketsResult.data.totalCount);
      } else {
        setError(ticketsResult.error || t('errors.loadFailed'));
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (err) {
      console.error(err);
      setError(t('errors.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  }, [hasAccess, currentPage, searchDebounced, statusFilter, priorityFilter, tenantFilter, assignedToMe, unassigned, needsFirstResponse, t]);

  useEffect(() => {
    if (hasAccess === true) {
      loadTickets();
    }
  }, [hasAccess, loadTickets]);

  // Load messages when ticket selected
  useEffect(() => {
    if (!selectedTicket) {
      setTicketMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      const result = await listTicketMessages(selectedTicket.id);
      if (result.success && result.data) {
        setTicketMessages(result.data);
      }
      setIsLoadingMessages(false);
    };
    loadMessages();

    // Also load assignable users for this tenant
    if (selectedTicket.tenant_id) {
      getAssignableUsers(selectedTicket.tenant_id).then(result => {
        if (result.success && result.data) {
          setAssignableUsers(result.data);
        }
      });
    }
  }, [selectedTicket]);

  // Handlers
  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const result = await updateTicketStatus({ 
      ticketId, 
      status: newStatus as TicketRow['status'] 
    });
    if (result.success && result.data) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...result.data } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, ...result.data } : null);
      }
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    const result = await updateTicketPriority({ 
      ticketId, 
      priority: newPriority as TicketRow['priority'] 
    });
    if (result.success && result.data) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...result.data } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, ...result.data } : null);
      }
    }
  };

  const handleAssignChange = async (ticketId: string, userId: string) => {
    const result = await assignTicket({ 
      ticketId, 
      assignedToUserId: userId || null 
    });
    if (result.success && result.data) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...result.data } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, ...result.data } : null);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim()) return;

    setIsSendingMessage(true);
    const result = await addTicketMessage({
      ticketId: selectedTicket.id,
      message: newMessage.trim(),
      isInternal,
    });
    
    if (result.success && result.data) {
      setTicketMessages(prev => [...prev, result.data!]);
      setNewMessage('');
      setIsInternal(false);
    }
    setIsSendingMessage(false);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Access denied state
  if (hasAccess === false) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<LockClosedIcon className="h-6 w-6" />}
          title={t('noAccess.title')}
          description={t('noAccess.description')}
        />
      </AdminPageLayout>
    );
  }

  // Loading initial access check
  if (hasAccess === null) {
    return (
      <AdminPageLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
            <span>{t('loading.checkingPermissions')}</span>
          </div>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.admin'), href: '/admin' },
          { label: t('breadcrumbs.operations') },
          { label: t('breadcrumbs.tickets') },
        ]}
      />

      <AdminPageHeader
        title={t('page.title')}
        description={t('page.description')}
        icon={<TicketIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            {isSystemAdmin && (
              <Badge variant="outline" className="text-xs">
                System Admin
              </Badge>
            )}
            {isLoading && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                {t('list.loading')}
              </span>
            )}
          </div>
        }
      />

      {error && (
        <AdminErrorState
          title={t('errors.loadFailed')}
          description={error}
          onRetry={loadTickets}
        />
      )}

      {/* Stats */}
      {stats && (
        <AdminStatGrid>
          <AdminStatCard label={t('stats.total')} value={stats.totalTickets} />
          <AdminStatCard label={t('stats.open')} value={stats.openTickets} />
          <AdminStatCard label={t('stats.inProgress')} value={stats.inProgressTickets} />
          <AdminStatCard 
            label={t('stats.avgResolutionTime')} 
            value={stats.avgResolutionTimeMinutes 
              ? `${Math.round(stats.avgResolutionTimeMinutes / 60)}h` 
              : '–'
            } 
          />
        </AdminStatGrid>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Tickets List */}
        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border space-y-3">
            {/* Search and tenant filter row */}
            <div className="flex gap-2 flex-wrap items-center">
              <Input
                placeholder={t('filters.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
              />
              
              {/* Tenant filter - only for system admin with multiple tenants */}
              {isSystemAdmin && tenants.length > 0 && (
                <select
                  value={tenantFilter}
                  onChange={(e) => {
                    setTenantFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t('filters.allOrganizations')}</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Status and priority filter row */}
            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as PriorityFilter);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <Button 
                variant="outline" 
                size="sm"
                onClick={loadTickets}
                disabled={isLoading}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Quick filters row */}
            <div className="flex gap-2 flex-wrap items-center">
              <Button
                variant={assignedToMe ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAssignedToMe(!assignedToMe);
                  setUnassigned(false); // Mutually exclusive
                  setCurrentPage(1);
                }}
              >
                <UserCircleIcon className="h-4 w-4 mr-1" />
                {t('filters.myTickets')}
              </Button>
              
              <Button
                variant={unassigned ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setUnassigned(!unassigned);
                  setAssignedToMe(false); // Mutually exclusive
                  setCurrentPage(1);
                }}
              >
                {t('filters.unassigned')}
              </Button>
              
              <Button
                variant={needsFirstResponse ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setNeedsFirstResponse(!needsFirstResponse);
                  setCurrentPage(1);
                }}
              >
                <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                {t('filters.needsResponse')}
              </Button>
              
              {(assignedToMe || unassigned || needsFirstResponse) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAssignedToMe(false);
                    setUnassigned(false);
                    setNeedsFirstResponse(false);
                    setCurrentPage(1);
                  }}
                >
                  {t('filters.clearFilters')}
                </Button>
              )}
            </div>
          </div>

          <div className="divide-y divide-border overflow-y-auto flex-1 max-h-[32rem]">
            {isLoading && tickets.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">{t('list.loading')}</div>
            ) : tickets.length === 0 ? (
              <AdminEmptyState
                icon={<TicketIcon className="h-6 w-6" />}
                title={t('empty.title')}
                description={t('empty.description')}
                className="py-8"
              />
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 hover:bg-muted transition-colors border-l-4 ${
                    selectedTicket?.id === ticket.id 
                      ? 'bg-primary/10 border-l-primary' 
                      : priorityColors[ticket.priority] || 'border-l-border'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{ticket.title}</p>
                      {isSystemAdmin && ticket.tenant_name && (
                        <p className="text-xs text-muted-foreground">{ticket.tenant_name}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">{ticket.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {new Date(ticket.created_at).toLocaleDateString('sv-SE')}
                    {ticket.user_email && ` · ${ticket.user_email}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{ticket.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge 
                      variant={ticket.status === 'resolved' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {STATUS_OPTIONS.find(s => s.value === ticket.status)?.label || ticket.status}
                    </Badge>
                    {ticket.assigned_user_email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserCircleIcon className="h-3 w-3" />
                        {ticket.assigned_user_email}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex justify-between items-center">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                {t('list.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('list.page')} {currentPage} {t('list.of')} {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                {t('list.next')}
              </Button>
            </div>
          )}
        </Card>

        {/* Ticket Detail */}
        {selectedTicket ? (
          <Card className="overflow-hidden flex flex-col max-h-[36rem]">
            <div className="bg-gradient-to-r from-accent to-accent/80 p-4">
              <h2 className="text-lg font-bold text-accent-foreground truncate">
                {selectedTicket.title}
              </h2>
              {selectedTicket.ticket_key && (
                <p className="text-xs text-accent-foreground/70">{selectedTicket.ticket_key}</p>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Ticket info */}
              <div className="space-y-3 pb-4 border-b border-border">
                {selectedTicket.description && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{t('detail.description')}</p>
                    <p className="text-sm text-foreground">{selectedTicket.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.created')}</p>
                    <p>{new Date(selectedTicket.created_at).toLocaleString('sv-SE')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.category')}</p>
                    <p>{selectedTicket.category || t('detail.categoryDefault')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.user')}</p>
                    <p>{selectedTicket.user_email || t('detail.userUnknown')}</p>
                  </div>
                  {isSystemAdmin && selectedTicket.tenant_name && (
                    <div>
                      <p className="text-xs text-muted-foreground">{t('detail.organization')}</p>
                      <p>{selectedTicket.tenant_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Priority controls */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">
                    {t('detail.status')}
                  </label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
                  >
                    {STATUS_UPDATE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">
                    {t('detail.priority')}
                  </label>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => handlePriorityChange(selectedTicket.id, e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
                  >
                    {PRIORITY_UPDATE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">
                    {t('detail.assignedTo')}
                  </label>
                  <select
                    value={selectedTicket.assigned_to_user_id || ''}
                    onChange={(e) => handleAssignChange(selectedTicket.id, e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="">{t('detail.unassigned')}</option>
                    {assignableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.email || u.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                  <ChatBubbleLeftIcon className="h-3 w-3" />
                  {t('detail.messages')} ({ticketMessages.length})
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {isLoadingMessages ? (
                    <p className="text-sm text-muted-foreground">{t('detail.loadingMessages')}</p>
                  ) : ticketMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('detail.noMessages')}</p>
                  ) : (
                    ticketMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg text-sm ${
                          msg.is_internal 
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' 
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          {msg.is_internal && (
                            <Badge variant="outline" className="text-[10px] py-0">{t('detail.internal')}</Badge>
                          )}
                          <span>{msg.user_email || t('detail.user')}</span>
                          <span>·</span>
                          <span>{new Date(msg.created_at).toLocaleString('sv-SE')}</span>
                        </div>
                        <p className="text-foreground break-words">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Message form */}
            <div className="p-4 border-t border-border space-y-2">
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-border"
                    />
                    {t('detail.internalCheckbox')}
                  </label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isInternal ? t('detail.internalPlaceholder') : t('detail.messagePlaceholder')}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={isSendingMessage || !newMessage.trim()} 
                    size="sm"
                  >
                    {t('detail.send')}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        ) : (
          <Card className="p-6 flex items-center justify-center min-h-64">
            <p className="text-muted-foreground">{t('detail.selectTicket')}</p>
          </Card>
        )}
      </div>
    </AdminPageLayout>
  );
}
