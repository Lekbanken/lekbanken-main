'use client';

/**
 * NotificationBell Component
 *
 * Bell icon with unread badge for the App topbar.
 * Opens a dropdown with notification list.
 *
 * @example
 * ```tsx
 * <NotificationBell />
 * ```
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import { useAppNotifications, type AppNotification } from '@/hooks/useAppNotifications';

// =============================================================================
// TYPES
// =============================================================================

interface NotificationBellProps {
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just nu';
  if (diffMins < 60) return `${diffMins} min sedan`;
  if (diffHours < 24) return `${diffHours} tim sedan`;
  if (diffDays < 7) return `${diffDays} dagar sedan`;
  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

const typeStyles: Record<AppNotification['type'], string> = {
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function NotificationBell({ className }: NotificationBellProps) {
  const t = useTranslations('app.notifications');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useAppNotifications();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleNotificationClick = (notification: AppNotification) => {
    // Mark as read
    if (!notification.readAt) {
      markAsRead(notification.id);
    }

    // Navigate if action URL
    if (notification.actionUrl) {
      setIsOpen(false);
      router.push(notification.actionUrl);
    }
  };

  const hasNotifications = notifications.length > 0;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative rounded-full p-2 transition-colors',
          'text-muted-foreground hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          isOpen && 'bg-muted text-foreground',
          className
        )}
        aria-label={t('title')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-5 w-5" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center',
              'rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-80 sm:w-96',
            'rounded-xl border border-border bg-background shadow-lg',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold text-foreground">{t('title')}</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs text-primary hover:underline"
              >
                {t('markAllAsRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !hasNotifications ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BellIcon className="mb-2 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t('empty.message')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleNotificationClick(notification)
                        }
                      }}
                      className={cn(
                        'group flex w-full gap-3 px-4 py-3 text-left transition-colors',
                        'hover:bg-muted/50',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                        !notification.readAt && 'bg-primary/5'
                      )}
                    >
                      {/* Type dot */}
                      <div
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          typeStyles[notification.type]
                        )}
                      />

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm',
                              notification.readAt
                                ? 'text-muted-foreground'
                                : 'font-medium text-foreground'
                            )}
                          >
                            {notification.title}
                          </p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatRelativeTime(notification.deliveredAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        {notification.actionLabel && (
                          <span className="mt-1 inline-block text-xs font-medium text-primary">
                            {notification.actionLabel} →
                          </span>
                        )}
                      </div>

                      {/* Dismiss button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(notification.id);
                        }}
                        className={cn(
                          'shrink-0 rounded p-1 text-muted-foreground',
                          'opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground',
                          'focus:opacity-100'
                        )}
                        aria-label={t('actions.delete')}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {hasNotifications && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/app/notifications');
                }}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-center text-sm font-medium',
                  'text-primary hover:bg-primary/10 transition-colors'
                )}
              >
                {t('actions.viewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
