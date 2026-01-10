'use client';

import { useState } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import type { AtlasDomain, AtlasRole, AtlasReviewStatus } from '../types';
import { atlasDomainOptions, atlasRoleOptions } from '../types';

interface AtlasFiltersProps {
  filters: {
    domains: AtlasDomain[];
    roles: AtlasRole[];
    route: string | null;
    table: string | null;
    statuses: AtlasReviewStatus[];
  };
  routes: string[];
  tables: { id: string; name: string }[];
  onToggleDomain: (domain: AtlasDomain) => void;
  onToggleRole: (role: AtlasRole) => void;
  onToggleStatus: (status: AtlasReviewStatus) => void;
  onRouteChange: (route: string | null) => void;
  onTableChange: (table: string | null) => void;
  onClearFilters: () => void;
}

const statusOptions: { id: AtlasReviewStatus; label: string }[] = [
  { id: 'missing', label: 'Needs review' },
  { id: 'partial', label: 'Partial' },
  { id: 'complete', label: 'Complete' },
];

export function AtlasFilters({
  filters,
  routes,
  tables,
  onToggleDomain,
  onToggleRole,
  onToggleStatus,
  onRouteChange,
  onTableChange,
  onClearFilters,
}: AtlasFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground lg:hidden"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4" />
          Filters
        </span>
        <span className="text-xs text-muted-foreground">{isOpen ? 'Hide' : 'Show'}</span>
      </button>

      <div className={cn('space-y-6 rounded-lg border border-border bg-card p-4', isOpen ? 'block' : 'hidden', 'lg:block')}>
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Domain</h3>
          <div className="space-y-2">
            {atlasDomainOptions.map((domain) => (
              <Checkbox
                key={domain.id}
                label={domain.label}
                checked={filters.domains.includes(domain.id)}
                onChange={() => onToggleDomain(domain.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Role</h3>
          <div className="space-y-2">
            {atlasRoleOptions.map((role) => (
              <Checkbox
                key={role.id}
                label={role.label}
                checked={filters.roles.includes(role.id)}
                onChange={() => onToggleRole(role.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</h3>
          <div className="space-y-2">
            {statusOptions.map((status) => (
              <Checkbox
                key={status.id}
                label={status.label}
                checked={filters.statuses.includes(status.id)}
                onChange={() => onToggleStatus(status.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Route</h3>
          <Select
            options={routes.map((route) => ({ value: route, label: route }))}
            value={filters.route ?? ''}
            onChange={(event) => onRouteChange(event.target.value || null)}
            placeholder="All routes"
          />
          {filters.route && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onRouteChange(null)}>
              Clear route filter
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Table or View</h3>
          <Select
            options={tables.map((table) => ({ value: table.id, label: table.name }))}
            value={filters.table ?? ''}
            onChange={(event) => onTableChange(event.target.value || null)}
            placeholder="All tables"
          />
          {filters.table && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onTableChange(null)}>
              Clear table filter
            </Button>
          )}
        </div>

        <Button type="button" variant="outline" onClick={onClearFilters}>
          Clear all filters
        </Button>
      </div>
    </div>
  );
}
