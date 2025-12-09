'use client';

import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import type { SandboxCategory } from '../config/sandbox-modules';
import { ModuleGrid } from './ModuleCard';
import { useStatusFilter } from '../store/sandbox-store';

interface CategorySectionProps {
  category: SandboxCategory;
  maxModules?: number;
  showViewAll?: boolean;
}

export function CategorySection({
  category,
  maxModules,
  showViewAll = true,
}: CategorySectionProps) {
  const statusFilter = useStatusFilter();

  // Filter modules by status
  const filteredModules = statusFilter === null
    ? category.modules
    : category.modules.filter((m) => statusFilter.includes(m.status));

  // Apply max limit after filtering
  const displayModules = maxModules
    ? filteredModules.slice(0, maxModules)
    : filteredModules;

  const hasMore = maxModules && filteredModules.length > maxModules;

  // Don't render section if no modules match filter
  if (filteredModules.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{category.label}</h2>
        {showViewAll && (
          <Link
            href={category.href}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Visa alla
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
      <ModuleGrid modules={displayModules} columns={4} />
      {hasMore && (
        <p className="text-center text-xs text-muted-foreground">
          +{filteredModules.length - maxModules} fler moduler
        </p>
      )}
    </section>
  );
}

interface CategoryOverviewProps {
  category: SandboxCategory;
}

export function CategoryOverview({ category }: CategoryOverviewProps) {
  const statusFilter = useStatusFilter();

  // Filter modules by status
  const filteredModules = statusFilter === null
    ? category.modules
    : category.modules.filter((m) => statusFilter.includes(m.status));

  // Show message if no modules match
  if (filteredModules.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{category.label}</h1>
          {category.description && (
            <p className="mt-1 text-muted-foreground">{category.description}</p>
          )}
        </div>
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">
            Inga moduler matchar det aktiva filtret.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{category.label}</h1>
        {category.description && (
          <p className="mt-1 text-muted-foreground">{category.description}</p>
        )}
      </div>
      <ModuleGrid modules={filteredModules} columns={4} />
    </div>
  );
}
