'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { getNotifications, markNotificationAsRead, deleteNotification, getNotificationStats, Notification } from '@/lib/services/notificationsService';

interface Stats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

export default function NotificationsPage() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [notificationList, notificationStats] = await Promise.all([
          getNotifications(user.id, 100),
          getNotificationStats(user.id),
        ]);

        setNotifications(notificationList || []);
        setStats(notificationStats);
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
      setIsLoading(false);
    };

    loadData();
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(
      notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
    setNotifications(notifications.filter((n) => n.id !== notificationId));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'achievement':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      case 'achievement':
        return '★';
      default:
        return 'ℹ';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-3xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Notifications</h1>
            <p className="text-slate-600">Du måste vara inloggad för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Notifications</h1>
          <p className="text-slate-600">Dina aviseringar och uppdateringar</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-slate-600 font-medium mb-1">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-slate-600 font-medium mb-1">Unread</p>
              <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-slate-600 font-medium mb-1">Read</p>
              <p className="text-2xl font-bold text-slate-600">{stats.total - stats.unread}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow">
          {(['all', 'unread', 'read'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                filter === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'all' && 'All'}
              {tab === 'unread' && 'Unread'}
              {tab === 'read' && 'Read'}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Laddar...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-slate-600 mb-2">Inga meddelanden</p>
              <p className="text-sm text-slate-500">Du har inga {filter} meddelanden</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow transition-all ${
                  !notification.is_read ? 'border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id);
                    }
                    setExpandedId(expandedId === notification.id ? null : notification.id);
                  }}
                >
                  <div className="flex gap-3 items-start">
                    {/* Type Badge */}
                    <div className={`mt-1 px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className={`font-bold text-slate-900 ${!notification.is_read ? 'font-extrabold' : ''}`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 line-clamp-2">{notification.message}</p>

                      <div className="flex gap-3 mt-2 text-xs text-slate-500">
                        {notification.category && (
                          <span className="px-2 py-1 bg-slate-100 rounded capitalize">
                            {notification.category}
                          </span>
                        )}
                        <span>
                          {notification.created_at
                            ? `${new Date(notification.created_at).toLocaleDateString('sv-SE')} ${new Date(notification.created_at).toLocaleTimeString('sv-SE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : ''}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedId === notification.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-slate-700 whitespace-pre-wrap">{notification.message}</p>
                      {notification.action_url && notification.action_label && (
                        <a
                          href={notification.action_url}
                          className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors text-sm"
                        >
                          {notification.action_label}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
