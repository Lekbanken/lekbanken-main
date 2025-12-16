'use client';

import { cn } from '@/lib/utils';
import { CheckCircleIcon, ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type SaveIndicatorProps = {
  status: SaveStatus;
  lastSaved?: Date | null;
  error?: string | null;
  onRetry?: () => void;
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) return 'just nu';
  if (diffSeconds < 60) return `${diffSeconds} sek sedan`;
  if (diffMinutes < 60) return `${diffMinutes} min sedan`;
  if (diffHours < 24) return `${diffHours} tim sedan`;
  return date.toLocaleDateString('sv-SE');
}

export function SaveIndicator({ status, lastSaved, error, onRetry }: SaveIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saving' && (
        <>
          <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Sparar...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
          <span className="text-muted-foreground">
            Sparat {lastSaved && formatRelativeTime(lastSaved)}
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <ExclamationCircleIcon className="h-4 w-4 text-destructive" />
          <span className="text-destructive">
            Kunde inte spara
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-primary hover:underline"
            >
              Försök igen
            </button>
          )}
        </>
      )}

      {status === 'idle' && lastSaved && (
        <span className="text-muted-foreground">
          Sparat {formatRelativeTime(lastSaved)}
        </span>
      )}
    </div>
  );
}
