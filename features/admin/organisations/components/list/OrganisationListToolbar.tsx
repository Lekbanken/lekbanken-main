"use client";

import type { ChangeEvent } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Select } from "@/components/ui";
import type { OrganisationListFilters, OrganisationListStatus } from "../../types";

type OrganisationListToolbarProps = {
  filters: OrganisationListFilters;
  searchValue: string;
  statusOptions: Array<{ value: OrganisationListStatus | "all"; label: string }>;
  languageOptions: Array<{ value: string; label: string }>;
  onSearchChange: (value: string) => void;
  onFiltersChange: (next: Partial<OrganisationListFilters>) => void;
  onClearFilters: () => void;
};

const billingOptions = [
  { value: "all", label: "Alla billing-lägen" },
  { value: "connected", label: "Billing kopplad" },
  { value: "not_connected", label: "Ingen billing" },
];

const domainOptions = [
  { value: "all", label: "Alla domäner" },
  { value: "yes", label: "Har egen domän" },
  { value: "no", label: "Ingen domän" },
];

const sortOptions = [
  { value: "recent", label: "Nyast först" },
  { value: "name", label: "Namn A–Ö" },
  { value: "members", label: "Flest medlemmar" },
  { value: "updated", label: "Senast uppdaterad" },
];

export function OrganisationListToolbar({
  filters,
  searchValue,
  statusOptions,
  languageOptions,
  onSearchChange,
  onFiltersChange,
  onClearFilters,
}: OrganisationListToolbarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ status: event.target.value as OrganisationListStatus | "all" });
  };

  const handleBillingChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ billing: event.target.value as OrganisationListFilters["billing"] });
  };

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ language: event.target.value });
  };

  const handleDomainChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ domain: event.target.value as OrganisationListFilters["domain"] });
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ sort: event.target.value as OrganisationListFilters["sort"] });
  };

  const activeFilterCount = [
    filters.status !== "all",
    filters.billing !== "all",
    filters.language !== "all",
    filters.domain !== "all",
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 lg:max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder="Sök organisationer..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Sök organisationer"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Status"
              value={filters.status}
              onChange={handleStatusChange}
              options={statusOptions}
              placeholder="Status"
              className="w-auto min-w-[140px]"
            />
            <Select
              aria-label="Billing"
              value={filters.billing}
              onChange={handleBillingChange}
              options={billingOptions}
              placeholder="Billing"
              className="w-auto min-w-[160px]"
            />
            <Select
              aria-label="Språk"
              value={filters.language}
              onChange={handleLanguageChange}
              options={languageOptions}
              placeholder="Språk"
              className="w-auto min-w-[140px]"
            />
            <Select
              aria-label="Domän"
              value={filters.domain}
              onChange={handleDomainChange}
              options={domainOptions}
              placeholder="Domän"
              className="w-auto min-w-[140px]"
            />
            <Select
              aria-label="Sortering"
              value={filters.sort}
              onChange={handleSortChange}
              options={sortOptions}
              placeholder="Sortering"
              className="w-auto min-w-[160px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(activeFilterCount > 0 || searchValue.trim() !== "") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground"
            >
              <XMarkIcon className="mr-1.5 h-4 w-4" />
              Rensa {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
