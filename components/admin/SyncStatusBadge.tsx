/**
 * Stripe Sync Status Badge Component
 * 
 * Displays the current sync status between Lekbanken and Stripe
 * with appropriate colors and icons.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, LockClosedIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type StripeSyncStatus, STRIPE_SYNC_STATUS, getSyncStatusInfo } from '@/lib/stripe/product-sync-types';
import { cn } from '@/lib/utils';

interface SyncStatusBadgeProps {
  status: StripeSyncStatus;
  lastSyncedAt?: string | null;
  syncError?: string | null;
  className?: string;
  showLastSync?: boolean;
}

const STATUS_ICONS: Record<StripeSyncStatus, React.ComponentType<{ className?: string }>> = {
  [STRIPE_SYNC_STATUS.SYNCED]: CheckCircleIcon,
  [STRIPE_SYNC_STATUS.UNSYNCED]: ClockIcon,
  [STRIPE_SYNC_STATUS.DRIFT]: ExclamationTriangleIcon,
  [STRIPE_SYNC_STATUS.ERROR]: XCircleIcon,
  [STRIPE_SYNC_STATUS.LOCKED]: LockClosedIcon,
};

const STATUS_COLORS: Record<StripeSyncStatus, string> = {
  [STRIPE_SYNC_STATUS.SYNCED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [STRIPE_SYNC_STATUS.UNSYNCED]: 'bg-gray-100 text-gray-800 border-gray-200',
  [STRIPE_SYNC_STATUS.DRIFT]: 'bg-amber-100 text-amber-800 border-amber-200',
  [STRIPE_SYNC_STATUS.ERROR]: 'bg-red-100 text-red-800 border-red-200',
  [STRIPE_SYNC_STATUS.LOCKED]: 'bg-purple-100 text-purple-800 border-purple-200',
};

export function SyncStatusBadge({
  status,
  lastSyncedAt,
  syncError,
  className,
  showLastSync = false,
}: SyncStatusBadgeProps) {
  const statusInfo = getSyncStatusInfo(status);
  const Icon = STATUS_ICONS[status];
  const colorClass = STATUS_COLORS[status];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Badge className={cn('gap-1.5 border', colorClass)}>
        <Icon className="h-3.5 w-3.5" />
        {statusInfo.label}
      </Badge>
      
      {showLastSync && lastSyncedAt && status === STRIPE_SYNC_STATUS.SYNCED && (
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(lastSyncedAt)}
        </span>
      )}
      
      {syncError && status === STRIPE_SYNC_STATUS.ERROR && (
        <span className="text-xs text-destructive truncate max-w-[200px]" title={syncError}>
          {syncError}
        </span>
      )}
    </div>
  );
}

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just nu';
  if (diffMins < 60) return `${diffMins} min sedan`;
  if (diffHours < 24) return `${diffHours} tim sedan`;
  if (diffDays < 7) return `${diffDays} dagar sedan`;
  
  return then.toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// SYNC BUTTON COMPONENT
// =============================================================================

interface SyncButtonProps {
  productId: string;
  currentStatus: StripeSyncStatus;
  onSyncComplete?: () => void;
  className?: string;
}

export function SyncButton({
  productId,
  currentStatus,
  onSyncComplete,
  className,
}: SyncButtonProps) {
  const t = useTranslations('admin.sync');
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async (force = false) => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/stripe/sync-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          action: force ? 'force_sync' : 'sync',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('syncFailed'));
      }

      onSyncComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setIsSyncing(false);
    }
  };

  const showForceSync = currentStatus === STRIPE_SYNC_STATUS.DRIFT || 
                        currentStatus === STRIPE_SYNC_STATUS.ERROR;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleSync(false)}
        disabled={isSyncing}
      >
        <ArrowPathIcon className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
        {isSyncing ? t('syncing') : t('syncStripe')}
      </Button>

      {showForceSync && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleSync(true)}
          disabled={isSyncing}
          title={t('forceSyncTooltip')}
        >
          {t('forceSync')}
        </Button>
      )}

      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}

// =============================================================================
// DRIFT WARNING COMPONENT
// =============================================================================

interface DriftWarningProps {
  productId: string;
  className?: string;
}

export function DriftWarning({ productId, className }: DriftWarningProps) {
  const t = useTranslations('admin.sync');
  const [drift, setDrift] = useState<{
    hasDrift: boolean;
    overallSeverity: string | null;
    fields: Array<{
      field: string;
      lekbankenValue: unknown;
      stripeValue: unknown;
      severity: string;
      message: string;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkDrift = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/stripe/sync-product?productId=${productId}`);
      const data = await response.json();
      if (data.success && data.data) {
        setDrift(data.data);
      }
    } catch (err) {
      console.error('Failed to check drift:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!drift) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={checkDrift}
        disabled={isLoading}
        className={className}
      >
        <ExclamationTriangleIcon className="mr-2 h-4 w-4" />
        {isLoading ? t('checking') : t('checkDrift')}
      </Button>
    );
  }

  if (!drift.hasDrift) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-emerald-600', className)}>
        <CheckCircleIcon className="h-4 w-4" />
        {t('noDriftDetected')}
      </div>
    );
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={cn('rounded-lg border p-4 space-y-3', severityColors[drift.overallSeverity || 'info'], className)}>
      <div className="flex items-center gap-2 font-medium">
        <ExclamationTriangleIcon className="h-5 w-5" />
        {t('driftDetected')}
      </div>
      
      <div className="space-y-2">
        {drift.fields.map((field, i) => (
          <div key={i} className="text-sm">
            <span className="font-medium">{field.field}:</span>{' '}
            <span>{field.message}</span>
          </div>
        ))}
      </div>
      
      <div className="text-xs opacity-75">
        {t('forceSyncHint')}
      </div>
    </div>
  );
}
