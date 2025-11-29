'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { sendBulkNotifications } from '@/lib/services/notificationsService';
import { supabaseAdmin } from '@/lib/supabase/server';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Notifications Admin</h1>
            <p className="text-slate-600">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Notifications Admin</h1>
          <p className="text-slate-600">Skicka systemmeddelanden till användare</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Send Form */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Notification Type</label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value as 'info' | 'success' | 'warning' | 'error' | 'system')}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Category</label>
              <select
                value={notificationCategory}
                onChange={(e) => setNotificationCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="system">System</option>
                <option value="billing">Billing</option>
                <option value="gameplay">Gameplay</option>
                <option value="achievement">Achievement</option>
                <option value="support">Support</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Title *</label>
              <input
                type="text"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="Notification title"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Message *</label>
              <textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Notification message"
                rows={6}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Action URL (Optional)</label>
                <input
                  type="url"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Action Label (Optional)</label>
                <input
                  type="text"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  placeholder="Click here"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Target Selection */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-bold text-slate-900 mb-3">Recipients</h3>
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
                  <span className="text-slate-900">Send to all users ({tenantUsers.length})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={targetType === 'specific'}
                    onChange={() => setTargetType('specific')}
                    className="w-4 h-4"
                  />
                  <span className="text-slate-900">Send to specific users</span>
                </label>
              </div>

              {targetType === 'specific' && (
                <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto border border-slate-200">
                  {tenantUsers.length === 0 ? (
                    <p className="text-slate-600 text-sm">No users found</p>
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
                          <span className="text-sm text-slate-700">{u.email}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSendNotification}
              disabled={isSending || !notificationTitle.trim() || !notificationMessage.trim()}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-bold transition-colors"
            >
              {isSending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>

          {/* Preview & Stats */}
          <div className="space-y-6">
            {/* Preview */}
            {notificationTitle || notificationMessage ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                  <h3 className="text-lg font-bold text-white">Preview</h3>
                </div>
                <div className="p-4">
                  <div className={`p-3 rounded mb-3 text-xs font-bold ${
                    notificationType === 'success' ? 'bg-green-100 text-green-700' :
                    notificationType === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    notificationType === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {notificationType.toUpperCase()}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">{notificationTitle || 'Title...'}</h4>
                  <p className="text-sm text-slate-600 mb-3">{notificationMessage || 'Message...'}</p>
                  {actionLabel && (
                    <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded font-medium">
                      {actionLabel}
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Stats */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-slate-900 mb-3">Recipients</h3>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600">
                  Total Users: <span className="font-bold text-slate-900">{tenantUsers.length}</span>
                </p>
                {targetType === 'specific' && (
                  <p className="text-slate-600">
                    Selected: <span className="font-bold text-blue-600">{selectedUserIds.length}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
