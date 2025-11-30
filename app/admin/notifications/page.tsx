'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { sendBulkNotifications } from '@/lib/services/notificationsService';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { BellIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
}

interface UserTenantData {
  user_id: string;
  users: { id: string; email: string } | null;
}

export default function NotificationsAdminPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [tenantUsers, setTenantUsers] = useState<User[]>([]);
  const [isSending, setIsSending] = useState(false);

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
      try {
        const { data, error } = await supabaseAdmin
          .from('user_tenant_memberships')
          .select('user_id, users(id, email)')
          .eq('tenant_id', currentTenant.id);

        if (error) {
          console.error('Error loading users:', error);
          return;
        }

        const users = (data || []).map((item: UserTenantData) => ({
          id: item.user_id,
          email: item.users?.email || 'Unknown',
        }));

        setTenantUsers(users);
      } catch (err) {
        console.error('Error loading users:', err);
      }
    };

    loadUsers();
  }, [user, currentTenant]);

  const handleSendNotification = async () => {
    if (!currentTenant || !notificationTitle.trim() || !notificationMessage.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      if (targetType === 'all') {
        await sendBulkNotifications({
          tenantId: currentTenant.id,
          userIds: tenantUsers.map((u) => u.id),
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          category: notificationCategory,
        });
        alert(`Notification sent to ${tenantUsers.length} users!`);
      } else if (selectedUserIds.length > 0) {
        await sendBulkNotifications({
          tenantId: currentTenant.id,
          userIds: selectedUserIds,
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          category: notificationCategory,
        });
        alert(`Notification sent to ${selectedUserIds.length} users!`);
      } else {
        alert('Please select at least one user');
        setIsSending(false);
        return;
      }

      // Reset form
      setNotificationTitle('');
      setNotificationMessage('');
      setActionUrl('');
      setActionLabel('');
      setSelectedUserIds([]);
    } catch (err) {
      console.error('Error sending notification:', err);
      alert('Error sending notification');
    }
    setIsSending(false);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  if (!user || !currentTenant) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">Notifications Admin</h1>
            <p className="text-muted-foreground">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BellIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Notifications Admin</h1>
          </div>
          <p className="text-muted-foreground">Skicka systemmeddelanden till användare</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Send Form */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Notification Type</label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value as 'info' | 'success' | 'warning' | 'error' | 'system')}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  value={notificationCategory}
                  onChange={(e) => setNotificationCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                >
                  <option value="system">System</option>
                  <option value="billing">Billing</option>
                  <option value="gameplay">Gameplay</option>
                  <option value="achievement">Achievement</option>
                  <option value="support">Support</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Notification title"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Message *</label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Notification message"
                  rows={6}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Action URL (Optional)</label>
                  <input
                    type="url"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Action Label (Optional)</label>
                  <input
                    type="text"
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    placeholder="Click here"
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  />
                </div>
              </div>

              {/* Target Selection */}
              <div className="border-t border-border pt-6">
                <h3 className="font-bold text-foreground mb-3">Recipients</h3>
                <div className="space-y-3 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={targetType === 'all'}
                      onChange={() => {
                        setTargetType('all');
                        setSelectedUserIds([]);
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-foreground">Send to all users ({tenantUsers.length})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={targetType === 'specific'}
                      onChange={() => setTargetType('specific')}
                      className="w-4 h-4"
                    />
                    <span className="text-foreground">Send to specific users</span>
                  </label>
                </div>

                {targetType === 'specific' && (
                  <div className="bg-muted rounded-lg p-3 max-h-40 overflow-y-auto border border-border">
                    {tenantUsers.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No users found</p>
                    ) : (
                      <div className="space-y-2">
                        {tenantUsers.map((u) => (
                          <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(u.id)}
                              onChange={() => toggleUserSelection(u.id)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-muted-foreground">{u.email}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSendNotification}
                disabled={isSending || !notificationTitle.trim() || !notificationMessage.trim()}
                className="w-full py-3"
              >
                {isSending ? 'Sending...' : 'Send Notification'}
              </Button>
            </CardContent>
          </Card>

          {/* Preview & Stats */}
          <div className="space-y-6">
            {/* Preview */}
            {notificationTitle || notificationMessage ? (
              <Card>
                <CardHeader className="bg-primary p-4">
                  <CardTitle className="text-white">Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Badge
                    variant={notificationType === 'error' ? 'destructive' : 'secondary'}
                    className={`mb-3 ${
                      notificationType === 'success' ? 'bg-green-100 text-green-700' :
                      notificationType === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      notificationType === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {notificationType.toUpperCase()}
                  </Badge>
                  <h4 className="font-bold text-foreground mb-2">{notificationTitle || 'Title...'}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{notificationMessage || 'Message...'}</p>
                  {actionLabel && (
                    <Button size="sm">{actionLabel}</Button>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Stats */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-foreground mb-3">Recipients</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Total Users: <span className="font-bold text-foreground">{tenantUsers.length}</span>
                  </p>
                  {targetType === 'specific' && (
                    <p className="text-muted-foreground">
                      Selected: <span className="font-bold text-primary">{selectedUserIds.length}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
