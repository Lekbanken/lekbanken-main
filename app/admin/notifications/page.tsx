'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { sendBulkNotifications } from '@/lib/services/notificationsService';
import { supabase } from '@/lib/supabase/client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BellIcon } from '@heroicons/react/24/outline';
import { AdminPageLayout, AdminPageHeader, AdminEmptyState, AdminErrorState } from '@/components/admin/shared';

interface User {
  id: string;
  email: string | null;
}

export default function NotificationsAdminPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [tenantUsers, setTenantUsers] = useState<User[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'info' | 'success' | 'warning' | 'error' | 'system'>('info');
  const [notificationCategory, setNotificationCategory] = useState('system');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');

  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
          .from('user_tenant_memberships')
          .select('user_id, users(id, email)')
          .eq('tenant_id', currentTenant.id)
          .limit(200);

        if (queryError) {
          setError('Kunde inte ladda användare för organisationen.');
          return;
        }

        const mapped = (data || [])
          .map((row) => ({
            id: (row as { user_id: string }).user_id,
            email: (row as { users?: { email?: string | null } | null }).users?.email ?? null,
          }))
          .filter((u) => !!u.id);
        setTenantUsers(mapped);
      } catch (err) {
        console.error(err);
        setError('Kunde inte ladda användare.');
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, [user, currentTenant]);

  const canSend = useMemo(() => {
    if (!currentTenant) return false;
    if (!notificationTitle.trim() || !notificationMessage.trim()) return false;
    if (targetType === 'specific' && selectedUserIds.length === 0) return false;
    if (targetType === 'all' && tenantUsers.length === 0) return false;
    return true;
  }, [currentTenant, notificationTitle, notificationMessage, targetType, selectedUserIds, tenantUsers.length]);

  const handleSend = async () => {
    if (!canSend) return;
    if (!currentTenant) return;

    const userIds = targetType === 'specific'
      ? selectedUserIds
      : tenantUsers.map((u) => u.id).filter(Boolean);

    if (userIds.length === 0) {
      setError('Det finns inga anvÇÏndare att skicka till.');
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      await sendBulkNotifications({
        userIds,
        tenantId: currentTenant.id,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        category: notificationCategory,
        actionUrl: actionUrl || undefined,
        actionLabel: actionLabel || undefined,
      });
      setNotificationTitle('');
      setNotificationMessage('');
      setActionUrl('');
      setActionLabel('');
      setSelectedUserIds([]);
    } catch (err) {
      console.error(err);
      setError('Kunde inte skicka notifikationer.');
    } finally {
      setIsSending(false);
    }
  };

  if (!currentTenant) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<BellIcon className="h-6 w-6" />}
          title="Ingen organisation vald"
          description="Välj en organisation för att skicka notifikationer."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Notifikationer"
        description="Skicka meddelanden till organisationens användare."
        icon={<BellIcon className="h-8 w-8 text-primary" />}
        actions={
          <Badge variant="outline" className="capitalize">
            {notificationType}
          </Badge>
        }
      />

      {error && (
        <AdminErrorState
          title="Ett fel inträffade"
          description={error}
          onRetry={() => setError(null)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Skicka notifikation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Titel</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Uppdatering i appen"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Typ</label>
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
              <label className="text-sm font-medium text-foreground">Meddelande</label>
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={4}
                placeholder="Ditt meddelande..."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Kategori</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={notificationCategory}
                  onChange={(e) => setNotificationCategory(e.target.value)}
                  placeholder="system"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Målgrupp</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as typeof targetType)}
                >
                  <option value="all">Alla i organisationen</option>
                  <option value="specific">Specifika användare</option>
                </select>
              </div>
            </div>

            {targetType === 'specific' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Välj mottagare</label>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Laddar användare...</p>
                ) : tenantUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Inga användare att välja.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {tenantUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
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
                        />
                        <span>{u.email || u.id}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Action URL (valfritt)</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Action label (valfritt)</label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  placeholder="Öppna"
                />
              </div>
            </div>

            <Button onClick={handleSend} disabled={isSending || !canSend}>
              {isSending ? 'Skickar...' : 'Skicka notifikation'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mottagare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {tenantUsers.length} användare i organisationen.
            </p>
            <p className="text-xs text-muted-foreground">
              Nar du valjer specifika anvandare kan du valja fran listan. Annars skickas till alla.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  );
}
