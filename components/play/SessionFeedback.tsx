'use client';

import { cn } from '@/lib/utils';
import { WifiIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, useMemo } from 'react';

type ReconnectingBannerProps = {
  isReconnecting: boolean;
  attemptCount?: number;
  maxAttempts?: number;
  onRetry?: () => void;
  className?: string;
};

export function ReconnectingBanner({
  isReconnecting,
  attemptCount = 0,
  maxAttempts = 5,
  onRetry,
  className = '',
}: ReconnectingBannerProps) {
  const [dotCount, setDotCount] = useState(0);

  // Animate dots
  useEffect(() => {
    if (!isReconnecting) {
      return;
    }

    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 0 : prev + 1));
    }, 500);

    return () => clearInterval(interval);
  }, [isReconnecting]);

  const dots = useMemo(() => '.'.repeat(isReconnecting ? dotCount : 0), [isReconnecting, dotCount]);

  if (!isReconnecting) {
    return null;
  }

  const isNearMaxAttempts = attemptCount >= maxAttempts - 1;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'bg-amber-50 text-amber-900 border border-amber-200',
        'dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        className
      )}
    >
      {/* Icon with animation */}
      <div className="relative">
        <WifiIcon className="h-5 w-5 animate-pulse" />
        <ArrowPathIcon className="absolute -bottom-1 -right-1 h-3 w-3 animate-spin" />
      </div>

      {/* Message */}
      <div className="text-sm">
        <span className="font-medium">
          Återansluter{dots}
        </span>
        {attemptCount > 0 && (
          <span className="text-amber-700 dark:text-amber-300 ml-2">
            (försök {attemptCount}/{maxAttempts})
          </span>
        )}
      </div>

      {/* Retry button if near max */}
      {isNearMaxAttempts && onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'px-3 py-1 rounded text-sm font-medium',
            'bg-amber-200 hover:bg-amber-300 text-amber-900',
            'dark:bg-amber-800 dark:hover:bg-amber-700 dark:text-amber-100',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500'
          )}
        >
          Försök igen
        </button>
      )}
    </div>
  );
}

type SessionStatusMessageProps = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
  className?: string;
};

const statusStyles = {
  success: {
    container: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
    icon: 'text-green-600 dark:text-green-400',
    action: 'bg-green-200 hover:bg-green-300 text-green-900 dark:bg-green-800 dark:hover:bg-green-700 dark:text-green-100',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
    icon: 'text-red-600 dark:text-red-400',
    action: 'bg-red-200 hover:bg-red-300 text-red-900 dark:bg-red-800 dark:hover:bg-red-700 dark:text-red-100',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100',
    icon: 'text-amber-600 dark:text-amber-400',
    action: 'bg-amber-200 hover:bg-amber-300 text-amber-900 dark:bg-amber-800 dark:hover:bg-amber-700 dark:text-amber-100',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400',
    action: 'bg-blue-200 hover:bg-blue-300 text-blue-900 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-blue-100',
  },
};

export function SessionStatusMessage({
  type,
  title,
  message,
  action,
  onDismiss,
  autoDismiss = false,
  autoDismissDelay = 5000,
  className = '',
}: SessionStatusMessageProps) {
  const [isVisible, setIsVisible] = useState(true);
  const styles = statusStyles[type];

  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        styles.container,
        'animate-in fade-in duration-200',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        {message && (
          <p className="mt-1 text-sm opacity-80">{message}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              styles.action
            )}
          >
            {action.label}
          </button>
        )}

        {onDismiss && (
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Stäng meddelande"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
