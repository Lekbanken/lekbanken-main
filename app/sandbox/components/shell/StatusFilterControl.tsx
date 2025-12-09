'use client';

import { cn } from '@/lib/utils';
import { useStatusFilterStore } from '../../store/sandbox-store';
import { statusConfig, type ModuleStatus } from '../../config/sandbox-modules';

const statusOrder: ModuleStatus[] = ['design', 'done', 'implemented'];

const colorMap: Record<string, { active: string; inactive: string; dot: string }> = {
  yellow: {
    active: 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300',
    inactive: 'bg-transparent border-border text-muted-foreground hover:border-yellow-400/50',
    dot: 'bg-yellow-400',
  },
  green: {
    active: 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300',
    inactive: 'bg-transparent border-border text-muted-foreground hover:border-green-500/50',
    dot: 'bg-green-500',
  },
  primary: {
    active: 'bg-primary/10 border-primary text-primary',
    inactive: 'bg-transparent border-border text-muted-foreground hover:border-primary/50',
    dot: 'bg-primary',
  },
};

export function StatusFilterControl() {
  const { statusFilter, toggleStatus, showAllStatuses } = useStatusFilterStore();

  const isActive = (status: ModuleStatus) => {
    if (statusFilter === null) return true;
    return statusFilter.includes(status);
  };

  const allSelected = statusFilter === null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Filtrera moduler
        </h4>
        <button
          type="button"
          onClick={showAllStatuses}
          className={cn(
            'text-xs transition-colors',
            allSelected 
              ? 'text-muted-foreground cursor-default' 
              : 'text-primary hover:text-primary/80'
          )}
          disabled={allSelected}
        >
          Visa alla
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusOrder.map((status) => {
          const config = statusConfig[status];
          const active = isActive(status);
          const colors = colorMap[config.color];

          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                active ? colors.active : colors.inactive
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', colors.dot)} />
              {config.label}
            </button>
          );
        })}
      </div>

      {statusFilter !== null && (
        <p className="text-xs text-muted-foreground">
          Visar {statusFilter.length} av {statusOrder.length} statusar
        </p>
      )}
    </div>
  );
}
