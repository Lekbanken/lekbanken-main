'use client';

import { ChangeEvent } from "react";
import { MagnifyingGlassIcon, XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button, Select } from "@/components/ui";
import { OrganisationFilters, OrganisationStatus, statusLabels } from "../types";

type OrganisationTableToolbarProps = {
  filters: OrganisationFilters;
  onFiltersChange: (next: Partial<OrganisationFilters>) => void;
  onCreateClick: () => void;
  hasActiveFilters: boolean;
};

const statusOptions: { value: OrganisationStatus | "all"; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "active", label: statusLabels.active },
  { value: "inactive", label: statusLabels.inactive },
];

const sortOptions = [
  { value: "recent", label: "Newest first" },
  { value: "name", label: "Name A–Z" },
  { value: "members", label: "Most members" },
];

export function OrganisationTableToolbar({
  filters,
  onFiltersChange,
  onCreateClick,
  hasActiveFilters,
}: OrganisationTableToolbarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: event.target.value });
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ status: event.target.value as OrganisationStatus | "all" });
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ sort: event.target.value as OrganisationFilters["sort"] });
  };

  const resetFilters = () => {
    onFiltersChange({ search: "", status: "all", sort: "recent" });
  };

  const activeFilterCount = [
    filters.status !== "all",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 bg-muted/30 p-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Search and Filters */}
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 lg:max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search organisations..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Search organisations"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Status filter"
            value={filters.status}
            onChange={handleStatusChange}
            options={statusOptions}
            placeholder="Status"
            className="w-auto min-w-[120px]"
          />
          <Select
            aria-label="Sort organisations"
            value={filters.sort}
            onChange={handleSortChange}
            options={sortOptions}
            placeholder="Sort"
            className="w-auto min-w-[140px]"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
            <XMarkIcon className="mr-1.5 h-4 w-4" />
            Clear{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        )}
        <Button size="sm" onClick={onCreateClick} className="gap-2">
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Create organisation</span>
        </Button>
      </div>
    </div>
  );
}
