'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { 
  sandboxCategories, 
  findModuleByPath, 
  type SandboxCategory,
  type SandboxModule,
  statusConfig 
} from '../../config/sandbox-modules';

interface ModuleNavGroupProps {
  category: SandboxCategory;
  isExpanded: boolean;
  onToggle: () => void;
  currentPath: string;
}

function StatusDot({ status }: { status: SandboxModule['status'] }) {
  const config = statusConfig[status];
  const colorClass = {
    yellow: 'bg-yellow-400',
    green: 'bg-green-500',
    primary: 'bg-primary',
  }[config.color];
  
  return (
    <span 
      className={cn('h-1.5 w-1.5 rounded-full shrink-0', colorClass)}
      title={config.label}
    />
  );
}

function ModuleNavGroup({ category, isExpanded, onToggle, currentPath }: ModuleNavGroupProps) {
  const Icon = category.icon;
  const hasActiveModule = category.modules.some(
    (m) => currentPath === m.href || currentPath.startsWith(m.href + '/')
  );

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          hasActiveModule
            ? 'bg-primary/5 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{category.label}</span>
        {isExpanded ? (
          <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
        )}
      </button>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
          {category.modules.map((mod) => {
            const isActive = currentPath === mod.href || currentPath.startsWith(mod.href + '/');
            return (
              <Link
                key={mod.id}
                href={mod.href}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{mod.label}</span>
                <StatusDot status={mod.status} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ModuleNavProps {
  onNavigate?: () => void;
}

export function ModuleNav({ onNavigate }: ModuleNavProps) {
  const pathname = usePathname();
  const currentModule = findModuleByPath(pathname);

  // Initialize expansion state - expand first category by default
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Expand first category by default
    if (sandboxCategories.length > 0) {
      initial.add(sandboxCategories[0].id);
    }
    // Also expand the category containing the current module
    if (currentModule) {
      initial.add(currentModule.category.id);
    }
    return initial;
  });

  // Auto-expand current module's category when path changes
  useEffect(() => {
    if (currentModule && !expandedGroups.has(currentModule.category.id)) {
      setExpandedGroups((prev) => new Set(prev).add(currentModule.category.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentModule?.category?.id]);

  const toggleGroup = (categoryId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <nav className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <Link href="/sandbox" className="flex items-center gap-2" onClick={onNavigate}>
          <span className="text-lg">🧪</span>
          <span className="font-semibold text-foreground">UI Sandbox</span>
        </Link>
      </div>

      {/* Module groups */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Overview link */}
        <Link
          href="/sandbox"
          onClick={onNavigate}
          className={cn(
            'mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/sandbox'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <span className="text-base">📋</span>
          Overview
        </Link>

        <div className="mb-2 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Kategorier
          </span>
        </div>

        {sandboxCategories.map((category) => (
          <ModuleNavGroup
            key={category.id}
            category={category}
            isExpanded={expandedGroups.has(category.id)}
            onToggle={() => toggleGroup(category.id)}
            currentPath={pathname}
          />
        ))}
      </div>
    </nav>
  );
}
