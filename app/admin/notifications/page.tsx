'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BellIcon, GlobeAltIcon, BuildingOfficeIcon, UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AdminPageLayout, AdminPageHeader, AdminEmptyState, AdminErrorState } from '@/components/admin/shared';
import {
  checkNotificationAdminAccess,
  listTenantsForNotifications,
  listUsersInTenant,
  sendAdminNotification,
  type SendNotificationParams,
} from '@/app/actions/notifications-admin';

interface Tenant {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string | null;
}

type NotificationScope = 'global' | 'tenant' | 'users';

export default function NotificationsAdminPage() {
  const t = useTranslations('admin.notifications');

  // Access state
  const [hasAccess, setHasAccess] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Data state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Form state
  const [scope, setScope] = useState<NotificationScope>('tenant');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'info' | 'success' | 'warning' | 'error' | 'system'>('info');
  const [notificationCategory, setNotificationCategory] = useState('system');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check access and load tenants on mount
  useEffect(() => {
    const init = async () => {
      setAccessLoading(true);
      setAccessError(null);

      const accessResult = await checkNotificationAdminAccess();
      if (!accessResult.hasAccess) {
        setAccessError(accessResult.error || t('errors.noAccess'));
        setAccessLoading(false);
        return;
      }

      setHasAccess(true);
      setIsSystemAdmin(accessResult.isSystemAdmin);

      // Load tenants
      const tenantsResult = await listTenantsForNotifications();
      if (tenantsResult.success && tenantsResult.data) {
        setTenants(tenantsResult.data);
        // Auto-select first tenant for non-system admins
        if (!accessResult.isSystemAdmin && tenantsResult.data.length > 0) {
          setSelectedTenantId(tenantsResult.data[0].id);
        }
      }

      setAccessLoading(false);
    };

    void init();
  }, [t]);

  // Load users when tenant changes - combined with user reset logic
  // to avoid multiple effects triggering cascading renders
  const loadUsers = useCallback(async (tenantId: string) => {
    if (!tenantId) {
      setUsers([]);
      return;
    }

    setUsersLoading(true);
    const result = await listUsersInTenant(tenantId);
    if (result.success && result.data) {
      setUsers(result.data);
    } else {
      setUsers([]);
    }
    setUsersLoading(false);
  }, []);

  // Handle scope change - reset users selection
  const handleScopeChange = useCallback((newScope: NotificationScope) => {
    setScope(newScope);
    setSelectedUserIds([]);
  }, []);

  // Handle tenant change - reset users selection and load users
  const handleTenantChange = useCallback((tenantId: string) => {
    setSelectedTenantId(tenantId);
    setSelectedUserIds([]);
    if (tenantId && (scope === 'tenant' || scope === 'users')) {
      void loadUsers(tenantId);
    }
  }, [scope, loadUsers]);

  // Validation
  const canSend = useMemo(() => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) return false;

    switch (scope) {
      case 'global':
        return isSystemAdmin && tenants.length > 0;
      case 'tenant':
        return !!selectedTenantId;
      case 'users':
        return !!selectedTenantId && selectedUserIds.length > 0;
      default:
        return false;
    }
  }, [scope, isSystemAdmin, tenants.length, selectedTenantId, selectedUserIds.length, notificationTitle, notificationMessage]);

  // Get recipient description for sidebar
  const getRecipientDescription = () => {
    switch (scope) {
      case 'global':
        return t('recipients.globalDesc', { count: tenants.length });
      case 'tenant': {
        const tenant = tenants.find((t) => t.id === selectedTenantId);
        return tenant ? t('recipients.tenantDesc', { name: tenant.name, count: users.length }) : t('recipients.selectTenant');
      }
      case 'users':
        return t('recipients.usersDesc', { count: selectedUserIds.length });
      default:
        return '';
    }
  };

  // Handle send
  const handleSend = async () => {
    if (!canSend) return;

    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    const params: SendNotificationParams = {
      scope,
      tenantId: scope !== 'global' ? selectedTenantId : undefined,
      userIds: scope === 'users' ? selectedUserIds : undefined,
      title: notificationTitle.trim(),
      message: notificationMessage.trim(),
      type: notificationType,
      category: notificationCategory,
      actionUrl: actionUrl || undefined,
      actionLabel: actionLabel || undefined,
    };

    console.log('[Notifications] Sending with params:', params);
    const result = await sendAdminNotification(params);
    console.log('[Notifications] Result:', result);

    if (result.success) {
      setSuccessMessage(t('success.sent', { count: result.sentCount ?? 1 }));
      // Reset form
      setNotificationTitle('');
      setNotificationMessage('');
      setActionUrl('');
      setActionLabel('');
      setSelectedUserIds([]);
      // Clear success after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setError(result.error || t('errors.sendFailed'));
    }

    setIsSending(false);
  };

  // Loading state
  if (accessLoading) {
    return (
      <AdminPageLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminPageLayout>
    );
  }

  // No access
  if (!hasAccess) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<BellIcon className="h-6 w-6" />}
          title={t('noAccessTitle')}
          description={accessError || t('noAccessDescription')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<BellIcon className="h-8 w-8 text-primary" />}
        actions={
          <Badge variant="outline" className="capitalize">
            {notificationType}
          </Badge>
        }
      />

      {error && (
        <AdminErrorState
          title={t('errorTitle')}
          description={error}
          onRetry={() => setError(null)}
        />
      )}

      {successMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <CheckCircleIcon className="h-5 w-5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('form.sendNotification')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scope selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">{t('form.scope')}</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {isSystemAdmin && (
                  <button
                    type="button"
                    onClick={() => handleScopeChange('global')}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                      scope === 'global'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <GlobeAltIcon className="h-6 w-6 text-primary" />
                    <div>
                      <div className="font-medium">{t('scope.global')}</div>
                      <div className="text-xs text-muted-foreground">{t('scope.globalDesc')}</div>
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleScopeChange('tenant')}
                  className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                    scope === 'tenant'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <BuildingOfficeIcon className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-medium">{t('scope.tenant')}</div>
                    <div className="text-xs text-muted-foreground">{t('scope.tenantDesc')}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleScopeChange('users')}
                  className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                    scope === 'users'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <UsersIcon className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-medium">{t('scope.users')}</div>
                    <div className="text-xs text-muted-foreground">{t('scope.usersDesc')}</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Tenant selector (for tenant and users scope) */}
            {(scope === 'tenant' || scope === 'users') && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('form.selectOrg')}</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={selectedTenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                >
                  <option value="">{t('options.selectOrg')}</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User selector (for users scope) */}
            {scope === 'users' && selectedTenantId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">{t('form.selectRecipients')}</label>
                  {users.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedUserIds.length === users.length) {
                          setSelectedUserIds([]);
                        } else {
                          setSelectedUserIds(users.map((u) => u.id));
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedUserIds.length === users.length ? t('actions.deselectAll') : t('actions.selectAll')}
                    </button>
                  )}
                </div>
                {usersLoading ? (
                  <p className="text-sm text-muted-foreground">{t('loading.users')}</p>
                ) : users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('empty.noUsers')}</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {users.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds((prev) => [...prev, u.id]);
                              } else {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="truncate">{u.email || u.id.slice(0, 8)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <hr className="border-border" />

            {/* Notification content */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('form.title')}</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder={t('placeholders.title')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('form.type')}</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value as typeof notificationType)}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('form.message')}</label>
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={4}
                placeholder={t('placeholders.message')}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('form.category')}</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={notificationCategory}
                  onChange={(e) => setNotificationCategory(e.target.value)}
                >
                  <option value="system">{t('categories.system')}</option>
                  <option value="support">{t('categories.support')}</option>
                  <option value="billing">{t('categories.billing')}</option>
                  <option value="learning">{t('categories.learning')}</option>
                  <option value="gamification">{t('categories.gamification')}</option>
                  <option value="announcement">{t('categories.announcement')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('form.actionUrl')} <span className="text-muted-foreground">({t('optional')})</span>
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {actionUrl && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('form.actionLabel')} <span className="text-muted-foreground">({t('optional')})</span>
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  placeholder={t('placeholders.actionLabel')}
                />
              </div>
            )}

            <Button onClick={handleSend} disabled={isSending || !canSend} className="w-full sm:w-auto">
              {isSending ? t('actions.sending') : t('actions.send')}
            </Button>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('recipients.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {scope === 'global' && <GlobeAltIcon className="h-5 w-5 text-primary" />}
                {scope === 'tenant' && <BuildingOfficeIcon className="h-5 w-5 text-primary" />}
                {scope === 'users' && <UsersIcon className="h-5 w-5 text-primary" />}
                <span className="font-medium">
                  {scope === 'global' && t('scope.global')}
                  {scope === 'tenant' && t('scope.tenant')}
                  {scope === 'users' && t('scope.users')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{getRecipientDescription()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('preview.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {notificationTitle || notificationMessage ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 ${
                      notificationType === 'success' ? 'bg-green-100 text-green-600' :
                      notificationType === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      notificationType === 'error' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <BellIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{notificationTitle || t('placeholders.title')}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notificationMessage || t('placeholders.message')}</p>
                      {actionUrl && (
                        <p className="text-xs text-primary mt-1">{actionLabel || actionUrl}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('preview.empty')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageLayout>
  );
}
