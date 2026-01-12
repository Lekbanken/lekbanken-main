"use client";

import type { ChangeEvent } from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
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

export function OrganisationListToolbar({
  filters,
  searchValue,
  statusOptions,
  languageOptions,
  onSearchChange,
  onFiltersChange,
  onClearFilters,
}: OrganisationListToolbarProps) {
  const t = useTranslations('admin.organizations.toolbar');

  const billingOptions = useMemo(() => [
    { value: "all", label: t('billing.all') },
    { value: "connected", label: t('billing.connected') },
    { value: "not_connected", label: t('billing.notConnected') },
  ], [t]);

  const domainOptions = useMemo(() => [
    { value: "all", label: t('domain.all') },
    { value: "yes", label: t('domain.yes') },
    { value: "no", label: t('domain.no') },
  ], [t]);

  const sortOptions = useMemo(() => [
    { value: "recent", label: t('sort.recent') },
    { value: "name", label: t('sort.name') },
    { value: "members", label: t('sort.members') },
    { value: "updated", label: t('sort.updated') },
  ], [t]);

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
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label={t('searchAriaLabel')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label={t('statusLabel')}
              value={filters.status}
              onChange={handleStatusChange}
              options={statusOptions}
              placeholder={t('statusLabel')}
              className="w-auto min-w-[140px]"
            />
            <Select
              aria-label={t('billingLabel')}
              value={filters.billing}
              onChange={handleBillingChange}
              options={billingOptions}
              placeholder={t('billingLabel')}
              className="w-auto min-w-[160px]"
            />
            <Select
              aria-label={t('languageLabel')}
              value={filters.language}
              onChange={handleLanguageChange}
              options={languageOptions}
              placeholder={t('languageLabel')}
              className="w-auto min-w-[140px]"
            />
            <Select
              aria-label={t('domainLabel')}
              value={filters.domain}
              onChange={handleDomainChange}
              options={domainOptions}
              placeholder={t('domainLabel')}
              className="w-auto min-w-[140px]"
            />
            <Select
              aria-label={t('sortLabel')}
              value={filters.sort}
              onChange={handleSortChange}
              options={sortOptions}
              placeholder={t('sortLabel')}
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
              {activeFilterCount > 0 ? t('clearWithCount', { count: activeFilterCount }) : t('clear')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
