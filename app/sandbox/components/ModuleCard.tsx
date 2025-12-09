'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { SandboxModule, ModuleStatus } from '../config/sandbox-modules';

interface StatusBadgeProps {
  status: ModuleStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config: Record<ModuleStatus, { label: string; classes: string }> = {
    design: {
      label: 'Design',
      classes: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400',
    },
    done: {
      label: 'Klar',
      classes: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
    },
    implemented: {
      label: 'Impl.',
      classes: 'bg-primary/10 text-primary border-primary/20',
    },
  };

  const { label, classes } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        classes
      )}
    >
      {label}
    </span>
  );
}

interface ModuleCardProps {
  module: SandboxModule;
  showStatus?: boolean;
}

export function ModuleCard({ module, showStatus = true }: ModuleCardProps) {
  return (
    <Link
      href={module.href}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
    >
      {showStatus && (
        <div className="absolute right-3 top-3">
          <StatusBadge status={module.status} />
        </div>
      )}
      <h3 className="pr-16 font-semibold text-foreground group-hover:text-primary">
        {module.label}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
        {module.description}
      </p>
    </Link>
  );
}

interface ModuleGridProps {
  modules: SandboxModule[];
  columns?: 3 | 4;
  showStatus?: boolean;
}

export function ModuleGrid({ modules, columns = 4, showStatus = true }: ModuleGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 4
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}
    >
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} showStatus={showStatus} />
      ))}
    </div>
  );
}
