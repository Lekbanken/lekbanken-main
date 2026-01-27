'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BellIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface AdminNotificationsCenterProps {
  /** Notifications to display */
  notifications?: AdminNotification[];
  /** Handler when a notification is clicked */
  onNotificationClick?: (notification: AdminNotification) => void;
  /** Handler when a notification is marked as read */
  onMarkAsRead?: (notificationId: string) => void;
  /** Handler when all notifications are marked as read */
  onMarkAllAsRead?: () => void;
  /** Handler when a notification is dismissed */
  onDismiss?: (notificationId: string) => void;
  /** Additional className for the button */
  className?: string;
}

const _typeStyles = {
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
  error: 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20',
  success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20',
};

const dotStyles = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  success: 'bg-emerald-500',
};

/**
 * Admin notifications center with bell icon and dropdown.
 * Displays unread notification count and allows managing notifications.
 */
export function AdminNotificationsCenter({
  notifications = [],
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  className = '',
}: AdminNotificationsCenterProps) {
  const t = useTranslations('admin.notifications');
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleNotificationClick = useCallback((notification: AdminNotification) => {
    if (onMarkAsRead && !notification.read) {
      onMarkAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  }, [onNotificationClick, onMarkAsRead]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just nu';
    if (minutes < 60) return `${minutes} min sedan`;
    if (hours < 24) return `${hours} tim sedan`;
    if (days < 7) return `${days} dagar sedan`;
    return date.toLocaleDateString('sv-SE');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={`Notifikationer${unreadCount > 0 ? ` (${unreadCount} olästa)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-5 w-5" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span 
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div 
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:w-96"
            role="menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('title')}
              </h3>
              {unreadCount > 0 && onMarkAllAsRead && (
                <button
                  onClick={() => {
                    onMarkAllAsRead();
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  {t('markAllAsRead')}
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <BellIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('noNotifications')}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <div
                        role="menuitem"
                        tabIndex={0}
                        onClick={() => handleNotificationClick(notification)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNotificationClick(notification);
                          }
                        }}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${
                          !notification.read ? 'bg-muted/50' : ''
                        }`}
                      >
                        {/* Unread indicator */}
                        <div className="mt-1.5 shrink-0">
                          {!notification.read ? (
                            <span className={`block h-2 w-2 rounded-full ${dotStyles[notification.type]}`} />
                          ) : (
                            <span className="block h-2 w-2" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${!notification.read ? 'font-medium text-foreground' : 'text-foreground/80'}`}>
                            {notification.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground/70">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>

                        {/* Dismiss button */}
                        {onDismiss && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDismiss(notification.id);
                            }}
                            className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-muted-foreground/10 hover:text-muted-foreground"
                            aria-label="Ta bort notifikation"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-border px-4 py-2">
                <Link
                  href="/app/notifications"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center text-xs text-primary hover:underline"
                >
                  Visa alla notifikationer
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Hook to manage notifications state
export function useAdminNotifications(initialNotifications: AdminNotification[] = []) {
  const [notifications, setNotifications] = useState<AdminNotification[]>(initialNotifications);

  const addNotification = useCallback((notification: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications((prev) => [
      {
        ...notification,
        id: `notif-${Date.now()}`,
        timestamp: new Date(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}
