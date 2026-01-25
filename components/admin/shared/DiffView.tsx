'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

// =============================================================================
// TYPES
// =============================================================================

export interface DiffItem {
  field: string;
  label: string;
  localValue: string | null;
  remoteValue: string | null;
}

interface DiffViewProps {
  /** Array of field differences */
  diffs: DiffItem[];
  /** Label for local side (default: "Lokalt") */
  localLabel?: string;
  /** Label for remote side (default: "Stripe") */
  remoteLabel?: string;
  /** Callback when user chooses to use local values */
  onUseLocal?: () => void;
  /** Callback when user chooses to use remote values */
  onUseRemote?: () => void;
  /** Whether actions are loading */
  isLoading?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// DIFF VIEW COMPONENT
// =============================================================================

/**
 * DiffView - Shows side-by-side comparison of local vs remote values
 * 
 * Used for Stripe sync drift resolution.
 * 
 * @example
 * <DiffView 
 *   diffs={[
 *     { field: 'unit_label', label: 'Enhetsetikett', localValue: 'license', remoteValue: 'seat' }
 *   ]}
 *   onUseLocal={() => pushToStripe()}
 *   onUseRemote={() => pullFromStripe()}
 * />
 */
export function DiffView({
  diffs,
  localLabel,
  remoteLabel,
  onUseLocal,
  onUseRemote,
  isLoading = false,
  className,
}: DiffViewProps) {
  const t = useTranslations('admin.diff');
  const displayLocalLabel = localLabel || t('defaultLocalLabel');
  const displayRemoteLabel = remoteLabel || t('defaultRemoteLabel');
  
  if (diffs.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground text-sm', className)}>
        {t('noDifferences')}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950', className)}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
        <span className="text-amber-600 dark:text-amber-400">⚠️</span>
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {t('changesNotSynced', { count: diffs.length })}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-200 dark:border-amber-800">
              <th className="px-4 py-2 text-left font-medium text-amber-800 dark:text-amber-200">
                {t('fieldHeader')}
              </th>
              <th className="px-4 py-2 text-left font-medium text-amber-800 dark:text-amber-200">
                {displayLocalLabel}
              </th>
              <th className="px-4 py-2 text-center text-amber-600 dark:text-amber-400">
                →
              </th>
              <th className="px-4 py-2 text-left font-medium text-amber-800 dark:text-amber-200">
                {displayRemoteLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((diff) => (
              <tr 
                key={diff.field} 
                className="border-b border-amber-100 dark:border-amber-900 last:border-b-0"
              >
                <td className="px-4 py-2 font-medium text-amber-900 dark:text-amber-100">
                  {diff.label}
                </td>
                <td className="px-4 py-2">
                  <DiffValue value={diff.localValue} variant="local" />
                </td>
                <td className="px-4 py-2 text-center text-muted-foreground">
                  ≠
                </td>
                <td className="px-4 py-2">
                  <DiffValue value={diff.remoteValue} variant="remote" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      {(onUseLocal || onUseRemote) && (
        <div className="px-4 py-3 border-t border-amber-200 dark:border-amber-800 flex flex-wrap gap-2">
          {onUseLocal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUseLocal}
              disabled={isLoading}
              className="gap-1"
            >
              {t('useLocal', { local: displayLocalLabel })}
              <ArrowRightIcon className="h-3 w-3" />
              {displayRemoteLabel}
            </Button>
          )}
          {onUseRemote && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUseRemote}
              disabled={isLoading}
              className="gap-1"
            >
              <ArrowLeftIcon className="h-3 w-3" />
              {t('fetchFrom', { remote: displayRemoteLabel })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DIFF VALUE DISPLAY
// =============================================================================

interface DiffValueProps {
  value: string | null;
  variant: 'local' | 'remote';
}

function DiffValue({ value, variant }: DiffValueProps) {
  const t = useTranslations('admin.diff');
  if (value === null || value === '') {
    return (
      <span className="text-muted-foreground italic text-xs">
        {t('emptyValue')}
      </span>
    );
  }

  const bgClass = variant === 'local' 
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';

  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-mono', bgClass)}>
      {value.length > 30 ? value.slice(0, 30) + '...' : value}
    </span>
  );
}

// =============================================================================
// SINGLE DIFF ROW (for inline use)
// =============================================================================

interface DiffRowProps {
  label: string;
  localValue: string | null;
  remoteValue: string | null;
  className?: string;
}

export function DiffRow({ label, localValue, remoteValue, className }: DiffRowProps) {
  const isDifferent = localValue !== remoteValue;

  if (!isDifferent) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="font-medium min-w-[100px]">{label}:</span>
      <DiffValue value={localValue} variant="local" />
      <span className="text-muted-foreground">→</span>
      <DiffValue value={remoteValue} variant="remote" />
    </div>
  );
}
